/**
 * Thin REST client for the Noteriv web backend.
 *
 * Phase 1 only covers auth + vault/folder/note CRUD. The end goal (per
 * docs/plans/2026-10-12-noteriv-web-version.md §3) is for this module to grow
 * into a drop-in implementation of desktop's `ElectronAPI` interface
 * (desktop/src/types/electron.d.ts) so components ported from desktop/src/
 * can call `window.electronAPI.readFile(...)`-shaped methods unchanged. For
 * now call sites use this module directly; the ElectronAPI-shaped facade
 * gets added once enough surface area exists (Phase 2+).
 */

export interface ApiUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
}

export interface ApiVault {
  id: string;
  workspaceId: string;
  name: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ApiFolder {
  id: string;
  vaultId: string;
  parentId: string | null;
  name: string;
  path: string;
  position: number;
  createdAt: string;
}

export interface ApiNote {
  id: string;
  vaultId: string;
  folderId: string | null;
  name: string;
  path: string;
  content: string;
  frontmatter: Record<string, unknown>;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiNoteSummary {
  id: string;
  name: string;
  path: string;
  folderId: string | null;
  frontmatter: Record<string, unknown>;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
}

export interface VaultIndex {
  folders: ApiFolder[];
  notes: ApiNoteSummary[];
}

export interface ApiSearchResult {
  id: string;
  name: string;
  path: string;
  snippet: string;
  rank: number;
}

export interface ApiBacklink {
  id: string;
  name: string;
  path: string;
}

export type ViewMode = "live" | "source" | "view";

export interface ApiOpenTab {
  noteId: string;
  path: string;
  name: string;
}

export interface ApiWorkspaceState {
  openTabs: ApiOpenTab[];
  activeTabId: string | null;
  pinnedTabIds: string[];
  fileViewModes: Record<string, ViewMode>;
}

export type SyncProviderType = "github" | "gitlab" | "gitea" | "forgejo" | "webdav";
export type SyncDirection = "push" | "pull" | "both";
export type SyncJobStatus = "queued" | "running" | "success" | "conflict" | "error";

export interface ApiSyncConnection {
  id: string;
  vaultId: string;
  providerType: SyncProviderType;
  remoteUrl: string | null;
  branch: string;
  authUsername: string | null;
  webdavUrl: string | null;
  webdavPath: string | null;
  direction: SyncDirection;
  autoSync: boolean;
  lastSyncedAt: string | null;
  lastSyncStatus: Record<string, unknown> | null;
  createdAt: string;
}

export interface ApiSyncJob {
  id: string;
  syncConnectionId: string;
  status: SyncJobStatus;
  pushedCount: number;
  pulledCount: number;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface ApiAttachment {
  id: string;
  vaultId: string;
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string;
  createdAt: string;
  // PDF annotations (Phase D4) — only ever populated for mimeType
  // "application/pdf". See web/src/lib/pdf-annotation.ts for the shape.
  metadata?: unknown;
}

export interface ApiAttachmentList {
  attachments: ApiAttachment[];
  usedBytes: number;
  quotaBytes: number;
}

export interface ApiTrashedItem {
  id: string;
  name: string;
  path: string;
  deletedAt: string;
}

export interface ApiTrash {
  notes: ApiTrashedItem[];
  folders: ApiTrashedItem[];
}

export interface ApiUserPreferences {
  hotkeys: Record<string, string>;
  editorSettings: {
    editorFont?: string;
    fontSize?: number;
    lineHeight?: number;
    autoSaveInterval?: number;
    vimModeEnabled?: boolean;
  };
}

export interface ApiPlugin {
  id: string;
  vaultId: string;
  pluginId: string;
  manifest: {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    main: string;
    permissions: string[];
  };
  mainJs: string;
  enabled: boolean;
  settings: Record<string, unknown>;
  installedAt: string;
}

class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API error ${status}`);
  }
}

// The access token (15min TTL, see server/src/lib/jwt.ts) expires mid-session
// on any long-lived tab. A single in-flight refresh is shared across
// concurrent 401s so a burst of requests doesn't each race their own
// /auth/refresh call (which would revoke-then-reissue the refresh token
// multiple times and strand the losers with an already-rotated token).
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include" })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

async function request<T>(path: string, init?: RequestInit, _retrying = false): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: {
      // Only set when there's an actual JSON body — Fastify's JSON body
      // parser rejects a request carrying Content-Type: application/json
      // with an empty body (e.g. every DELETE call) with a 400, confirmed
      // live via a real browser delete: the exact same route accepted a
      // bodyless fetch() with no Content-Type header but 400'd when webApi
      // sent one. A FormData body (file upload) must NOT get this header
      // either — the browser sets its own `multipart/form-data; boundary=`
      // automatically, and overriding it here would drop the boundary and
      // break every upload.
      ...(init?.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401 && !_retrying && path !== "/auth/login" && path !== "/auth/refresh") {
    const refreshed = await refreshSession();
    if (refreshed) return request<T>(path, init, true);
  }

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // no body
    }
    throw new ApiError(res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const webApi = {
  auth: {
    register: (data: { email: string; password: string; displayName: string }) =>
      request<ApiUser>("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    login: (data: { email: string; password: string }) =>
      request<ApiUser>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    logout: () => request<{ ok: true }>("/auth/logout", { method: "POST" }),
    me: () => request<ApiUser>("/auth/me"),
  },

  vaults: {
    list: () => request<ApiVault[]>("/vaults"),
    create: (data: { name: string; workspaceId?: string }) =>
      request<ApiVault>("/vaults", { method: "POST", body: JSON.stringify(data) }),
    get: (id: string) => request<ApiVault>(`/vaults/${id}`),
    update: (id: string, data: Partial<Pick<ApiVault, "name" | "settings">>) =>
      request<ApiVault>(`/vaults/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (id: string) => request<{ ok: true }>(`/vaults/${id}`, { method: "DELETE" }),
    index: (id: string) => request<VaultIndex>(`/vaults/${id}/index`),
    search: (id: string, query: string) =>
      request<ApiSearchResult[]>(`/vaults/${id}/search?q=${encodeURIComponent(query)}`),
  },

  folders: {
    create: (vaultId: string, data: { name: string; parentId?: string | null }) =>
      request<ApiFolder>(`/vaults/${vaultId}/folders`, { method: "POST", body: JSON.stringify(data) }),
    update: (vaultId: string, folderId: string, data: { name?: string; parentId?: string | null }) =>
      request<ApiFolder>(`/vaults/${vaultId}/folders/${folderId}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (vaultId: string, folderId: string) =>
      request<{ ok: true }>(`/vaults/${vaultId}/folders/${folderId}`, { method: "DELETE" }),
  },

  notes: {
    get: (vaultId: string, noteId: string) => request<ApiNote>(`/vaults/${vaultId}/notes/${noteId}`),
    create: (vaultId: string, data: { name: string; folderId?: string | null; content?: string }) =>
      request<ApiNote>(`/vaults/${vaultId}/notes`, { method: "POST", body: JSON.stringify(data) }),
    update: (
      vaultId: string,
      noteId: string,
      data: Partial<Pick<ApiNote, "content" | "frontmatter" | "name" | "folderId">>
    ) => request<ApiNote>(`/vaults/${vaultId}/notes/${noteId}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (vaultId: string, noteId: string) =>
      request<{ ok: true }>(`/vaults/${vaultId}/notes/${noteId}`, { method: "DELETE" }),
    backlinks: (vaultId: string, noteId: string) =>
      request<ApiBacklink[]>(`/vaults/${vaultId}/notes/${noteId}/backlinks`),
  },

  plugins: {
    list: (vaultId: string) => request<ApiPlugin[]>(`/vaults/${vaultId}/plugins`),
    install: (vaultId: string, data: { manifest: ApiPlugin["manifest"]; mainJs: string }) =>
      request<ApiPlugin>(`/vaults/${vaultId}/plugins/install`, { method: "POST", body: JSON.stringify(data) }),
    update: (vaultId: string, pluginDbId: string, data: { enabled?: boolean; settings?: Record<string, unknown> }) =>
      request<ApiPlugin>(`/vaults/${vaultId}/plugins/${pluginDbId}`, { method: "PATCH", body: JSON.stringify(data) }),
    remove: (vaultId: string, pluginDbId: string) =>
      request<{ ok: true }>(`/vaults/${vaultId}/plugins/${pluginDbId}`, { method: "DELETE" }),
  },

  users: {
    exportData: () => request<Record<string, unknown>>("/users/me/export"),
    deleteAccount: () => request<{ ok: true }>("/users/me", { method: "DELETE" }),
  },

  workspace: {
    getState: (vaultId: string) => request<ApiWorkspaceState>(`/vaults/${vaultId}/workspace-state`),
    updateState: (vaultId: string, data: Partial<ApiWorkspaceState>) =>
      request<ApiWorkspaceState>(`/vaults/${vaultId}/workspace-state`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },

  sync: {
    list: (vaultId: string) => request<ApiSyncConnection[]>(`/vaults/${vaultId}/sync-connections`),
    createGit: (
      vaultId: string,
      data: {
        providerType: Exclude<SyncProviderType, "webdav">;
        remoteUrl: string;
        branch?: string;
        direction?: SyncDirection;
        autoSync?: boolean;
        username?: string;
        token: string;
      }
    ) => request<ApiSyncConnection>(`/vaults/${vaultId}/sync-connections`, { method: "POST", body: JSON.stringify(data) }),
    createWebdav: (
      vaultId: string,
      data: {
        providerType: "webdav";
        webdavUrl: string;
        webdavPath?: string;
        direction?: SyncDirection;
        autoSync?: boolean;
        username: string;
        password: string;
      }
    ) => request<ApiSyncConnection>(`/vaults/${vaultId}/sync-connections`, { method: "POST", body: JSON.stringify(data) }),
    remove: (vaultId: string, connectionId: string) =>
      request<{ ok: true }>(`/vaults/${vaultId}/sync-connections/${connectionId}`, { method: "DELETE" }),
    test: (vaultId: string, connectionId: string) =>
      request<{ ok: boolean; error?: string }>(`/vaults/${vaultId}/sync-connections/${connectionId}/test`, { method: "POST" }),
    trigger: (vaultId: string, connectionId: string) =>
      request<{ ok: true; queued: true }>(`/vaults/${vaultId}/sync-connections/${connectionId}/trigger`, { method: "POST" }),
    status: (vaultId: string, connectionId: string) =>
      request<{ connection: ApiSyncConnection; latestJob: ApiSyncJob | null }>(
        `/vaults/${vaultId}/sync-connections/${connectionId}/status`
      ),
    log: (vaultId: string, connectionId: string) =>
      request<ApiSyncJob[]>(`/vaults/${vaultId}/sync-connections/${connectionId}/log`),
  },

  preferences: {
    get: () => request<ApiUserPreferences>("/users/me/preferences"),
    update: (data: Partial<ApiUserPreferences>) =>
      request<ApiUserPreferences>("/users/me/preferences", { method: "PUT", body: JSON.stringify(data) }),
  },

  attachments: {
    list: (vaultId: string) => request<ApiAttachmentList>(`/vaults/${vaultId}/attachments`),
    upload: (vaultId: string, file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<ApiAttachment>(`/vaults/${vaultId}/attachments`, { method: "POST", body: form });
    },
    remove: (vaultId: string, attachmentId: string) =>
      request<{ ok: true }>(`/vaults/${vaultId}/attachments/${attachmentId}`, { method: "DELETE" }),
    updateMetadata: (vaultId: string, attachmentId: string, metadata: unknown) =>
      request<ApiAttachment>(`/vaults/${vaultId}/attachments/${attachmentId}`, {
        method: "PATCH",
        body: JSON.stringify({ metadata }),
      }),
    // Not a fetch() call — this is a plain same-origin URL for <img src>/<a href>,
    // auth rides along via the existing httpOnly cookie, same as any other asset.
    downloadUrl: (vaultId: string, attachmentId: string) => `/api/v1/vaults/${vaultId}/attachments/${attachmentId}/download`,
  },

  trash: {
    list: (vaultId: string) => request<ApiTrash>(`/vaults/${vaultId}/trash`),
    restoreNote: (vaultId: string, noteId: string) =>
      request<{ ok: true }>(`/vaults/${vaultId}/trash/notes/${noteId}/restore`, { method: "POST" }),
    restoreFolder: (vaultId: string, folderId: string) =>
      request<{ ok: true }>(`/vaults/${vaultId}/trash/folders/${folderId}/restore`, { method: "POST" }),
    deleteNote: (vaultId: string, noteId: string) =>
      request<{ ok: true }>(`/vaults/${vaultId}/trash/notes/${noteId}`, { method: "DELETE" }),
    deleteFolder: (vaultId: string, folderId: string) =>
      request<{ ok: true }>(`/vaults/${vaultId}/trash/folders/${folderId}`, { method: "DELETE" }),
    empty: (vaultId: string) => request<{ ok: true }>(`/vaults/${vaultId}/trash/empty`, { method: "POST" }),
  },
};

export { ApiError };

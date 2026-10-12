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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

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
};

export { ApiError };

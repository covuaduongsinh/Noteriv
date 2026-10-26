import { GitProvider } from '@/types';
import * as FS from '@/lib/file-system';
import * as GitHub from '@/lib/github-sync';
import { getItem, KEYS } from '@/lib/storage';
import {
  contentHash,
  fetchWithTimeout,
  loadSyncBase,
  loadSyncShas,
  mayUpload,
  pullAction,
  saveSyncBase,
  shouldDeleteLocal,
  vaultFileUri,
  vaultRelativePath,
  writeConflictCopy,
} from '@/lib/sync-state';

export type SyncProvider = GitProvider;
export type SyncResult = GitHub.SyncResult;

interface Remote {
  provider: SyncProvider;
  baseUrl: string;
  project: string;
}

interface RemoteFile {
  path: string;
  sha?: string;
}

function originFromRemote(remote: string): { origin: string; project: string } | null {
  const trimmed = remote.trim().replace(/\.git\/?$/, '');
  const ssh = trimmed.match(/^(?:ssh:\/\/)?git@([^/:]+)(?::(\d+))?[:/]([^\s]+)$/);
  if (ssh) return { origin: `https://${ssh[1]}${ssh[2] ? `:${ssh[2]}` : ''}`, project: ssh[3] };
  try {
    const url = new URL(trimmed);
    return { origin: url.origin, project: url.pathname.replace(/^\/+|\/+$/g, '') };
  } catch {
    return null;
  }
}

export function detectProvider(remote: string, hint?: SyncProvider): SyncProvider | null {
  if (hint) return hint;
  const host = originFromRemote(remote)?.origin.toLowerCase() ?? '';
  if (host.includes('github.com')) return 'github';
  if (host.includes('gitlab')) return 'gitlab';
  if (host.includes('gitea') || host.includes('forgejo')) return 'gitea';
  return null;
}

function parseRemote(remoteUrl: string, hint?: SyncProvider): Remote | null {
  const parsed = originFromRemote(remoteUrl);
  const provider = detectProvider(remoteUrl, hint);
  if (!parsed || !provider || !parsed.project) return null;
  return { provider, baseUrl: parsed.origin, project: parsed.project };
}

export async function getVaultToken(vaultId: string): Promise<string | null> {
  // Old installs keep working without migrating their GitHub token.
  return (await getItem<string>(KEYS.GIT_TOKEN(vaultId))) ?? await getItem<string>(KEYS.GITHUB_TOKEN(vaultId));
}

function encodeBase64(value: string): string {
  const utf8 = encodeURIComponent(value).replace(/%([0-9A-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  if (typeof btoa === 'function') return btoa(utf8);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes = new TextEncoder().encode(value);
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const first = bytes[i];
    const second = bytes[i + 1] ?? 0;
    const third = bytes[i + 2] ?? 0;
    result += chars[first >> 2];
    result += chars[((first & 3) << 4) | (second >> 4)];
    result += i + 1 < bytes.length ? chars[((second & 15) << 2) | (third >> 6)] : '=';
    result += i + 2 < bytes.length ? chars[third & 63] : '=';
  }
  return result;
}

function decodeBase64(value: string): string {
  const cleaned = value.replace(/[^A-Za-z0-9+/]/g, '');
  if (typeof atob === 'function') {
    const latin1 = atob(cleaned);
    return decodeURIComponent(latin1.split('').map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    const first = chars.indexOf(cleaned[i]);
    const second = chars.indexOf(cleaned[i + 1]);
    const third = chars.indexOf(cleaned[i + 2]);
    const fourth = chars.indexOf(cleaned[i + 3]);
    bytes.push((first << 2) | (second >> 4));
    if (third !== -1) bytes.push(((second & 15) << 4) | (third >> 2));
    if (fourth !== -1) bytes.push(((third & 3) << 6) | fourth);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

function api(remote: Remote, path: string, token: string, options: RequestInit = {}): Promise<Response> {
  const headers = remote.provider === 'gitlab'
    ? { 'PRIVATE-TOKEN': token, 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) }
    : { Authorization: `token ${token}`, 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) };
  const prefix = remote.provider === 'gitlab' ? '/api/v4' : '/api/v1';
  return fetchWithTimeout(`${remote.baseUrl}${prefix}${path}`, { ...options, headers });
}

async function branch(remote: Remote, token: string): Promise<string> {
  const project = encodeURIComponent(remote.project);
  const path = remote.provider === 'gitlab' ? `/projects/${project}` : `/repos/${remote.project}`;
  const response = await api(remote, path, token);
  if (!response.ok) throw new Error(`Failed to get repository info: ${response.status}`);
  return (await response.json()).default_branch ?? 'main';
}

async function listFiles(remote: Remote, token: string, ref: string): Promise<RemoteFile[]> {
  if (remote.provider === 'gitlab') {
    const files: RemoteFile[] = [];
    for (let page = 1; ; page++) {
      const response = await api(remote, `/projects/${encodeURIComponent(remote.project)}/repository/tree?ref=${encodeURIComponent(ref)}&recursive=true&per_page=100&page=${page}`, token);
      if (!response.ok) throw new Error(`Failed to get repository tree: ${response.status}`);
      const items = await response.json();
      files.push(...items.filter((item: { type: string }) => item.type === 'blob').map((item: { path: string; id: string }) => ({ path: item.path, sha: item.id })));
      if (items.length < 100) break;
    }
    return files;
  }
  const response = await api(remote, `/repos/${remote.project}/git/trees/${encodeURIComponent(ref)}?recursive=1`, token);
  if (!response.ok) throw new Error(`Failed to get repository tree: ${response.status}`);
  return ((await response.json()).tree ?? []).filter((item: { type: string }) => item.type === 'blob').map((item: { path: string; sha: string }) => ({ path: item.path, sha: item.sha }));
}

/** GitLab's files API takes the path as one encoded segment; Gitea's contents API takes it as segments. */
function encodeFilePath(remote: Remote, path: string): string {
  return remote.provider === 'gitlab' ? encodeURIComponent(path) : path.split('/').map(encodeURIComponent).join('/');
}

async function readRemoteFile(remote: Remote, token: string, ref: string, path: string): Promise<{ content: string; sha?: string }> {
  const encodedPath = encodeFilePath(remote, path);
  if (remote.provider === 'gitlab') {
    const response = await api(remote, `/projects/${encodeURIComponent(remote.project)}/repository/files/${encodedPath}/raw?ref=${encodeURIComponent(ref)}`, token);
    if (!response.ok) throw new Error(`Failed to get file ${path}: ${response.status}`);
    return { content: await response.text() };
  }
  const response = await api(remote, `/repos/${remote.project}/contents/${encodedPath}?ref=${encodeURIComponent(ref)}`, token);
  if (!response.ok) throw new Error(`Failed to get file ${path}: ${response.status}`);
  const data = await response.json();
  return { content: decodeBase64(data.content), sha: data.sha };
}

async function writeRemoteFile(remote: Remote, token: string, ref: string, path: string, content: string, sha?: string): Promise<void> {
  const encodedPath = encodeFilePath(remote, path);
  const message = 'Sync from Noteriv Mobile';
  if (remote.provider === 'gitlab') {
    const response = await api(remote, `/projects/${encodeURIComponent(remote.project)}/repository/files/${encodedPath}`, token, {
      method: sha ? 'PUT' : 'POST',
      body: JSON.stringify({ branch: ref, content, commit_message: message, encoding: 'text' }),
    });
    if (!response.ok) throw new Error(`Failed to write file ${path}: ${response.status} ${await response.text()}`);
    return;
  }
  // Gitea/Forgejo create with POST and update with PUT (which requires the sha).
  const response = await api(remote, `/repos/${remote.project}/contents/${encodedPath}`, token, {
    method: sha ? 'PUT' : 'POST',
    body: JSON.stringify({ branch: ref, content: encodeBase64(content), message, ...(sha ? { sha } : {}) }),
  });
  if (!response.ok) throw new Error(`Failed to write file ${path}: ${response.status} ${await response.text()}`);
}

const markdown = (path: string) => /\.(md|markdown)$/i.test(path) && !path.startsWith('.noteriv/');

async function deleteRemoteFile(remote: Remote, token: string, ref: string, path: string, sha: string): Promise<void> {
  const encodedPath = encodeFilePath(remote, path);
  const message = 'Sync from Noteriv Mobile';
  const response = remote.provider === 'gitlab'
    ? await api(remote, `/projects/${encodeURIComponent(remote.project)}/repository/files/${encodedPath}`, token, {
        method: 'DELETE',
        body: JSON.stringify({ branch: ref, commit_message: message }),
      })
    : await api(remote, `/repos/${remote.project}/contents/${encodedPath}`, token, {
        method: 'DELETE',
        body: JSON.stringify({ branch: ref, message, sha }),
      });
  if (!response.ok) throw new Error(`Failed to delete file ${path}: ${response.status} ${await response.text()}`);
}

/**
 * GitLab and Gitea/Forgejo, the same rules as GitHub (lib/github-sync.ts): both trees give each file's blob sha,
 * recorded at each agreement, so only notes whose sha moved are downloaded.
 */
async function pullOnce(vaultPath: string, token: string, remoteUrl: string, branchName?: string, hint?: SyncProvider): Promise<SyncResult> {
  const remote = parseRemote(remoteUrl, hint);
  if (!remote) return { pulled: 0, pushed: 0, errors: ['Unknown Git provider. Choose GitLab or Gitea/Forgejo for self-hosted remotes.'] };
  if (remote.provider === 'github') return GitHub.pull(vaultPath, token, remoteUrl, branchName);
  const result: SyncResult = { pulled: 0, pushed: 0, errors: [] };
  try {
    const ref = branchName || await branch(remote, token);
    const base = await loadSyncBase(vaultPath, remoteUrl, branchName);
    const shas = await loadSyncShas(vaultPath, remoteUrl, branchName);
    const files = (await listFiles(remote, token, ref)).filter((file) => markdown(file.path));
    const paths = new Set(files.map((file) => file.path));
    // Apply remote deletions only to notes that haven't changed here since the last sync.
    for (const file of await FS.listAllMarkdownFiles(vaultPath)) {
      const path = vaultRelativePath(vaultPath, file.filePath);
      if (path.startsWith('.trash/') || !markdown(path) || paths.has(path)) continue;
      if (shouldDeleteLocal(await FS.readFile(file.filePath), base[path]) && FS.deleteFile(file.filePath)) {
        delete base[path];
        delete shas[path];
        result.pulled++;
      }
    }
    for (const file of files) {
      try {
        const localPath = vaultFileUri(vaultPath, file.path);
        const local = await FS.readFile(localPath);
        const unmoved = base[file.path] !== undefined && file.sha !== undefined && shas[file.path] === file.sha;
        // Unchanged on the remote since the last sync: an edit here is push's, and so is a deletion here.
        if (unmoved && (local !== null || FS.fileMissing(localPath))) continue;
        const remoteFile = await readRemoteFile(remote, token, ref, file.path);
        // Read again: the note may have been saved while the download was in flight.
        const current = await FS.readFile(localPath);
        const remoteHash = contentHash(remoteFile.content);
        // Deleted here, and the remote holds the agreed text (its sha was not recorded yet): push deletes it.
        if (current === null && base[file.path] === remoteHash && FS.fileMissing(localPath)) {
          if (file.sha) shas[file.path] = file.sha;
          continue;
        }
        switch (pullAction(current, remoteFile.content, base[file.path])) {
          case 'skip':
            base[file.path] = remoteHash;
            break;
          case 'take-remote':
            if (!FS.writeFile(localPath, remoteFile.content)) throw new Error('could not write the note');
            base[file.path] = remoteHash;
            result.pulled++;
            break;
          case 'keep-local':
            break;
          case 'conflict':
            // Both versions kept; with the remote's saved as a copy, push may upload this device's.
            if (!(await writeConflictCopy(vaultPath, file.path, remoteFile.content))) throw new Error('could not keep the remote version as a conflict copy');
            base[file.path] = remoteHash;
            result.pulled++;
            break;
        }
        if (file.sha) shas[file.path] = file.sha;
      } catch (error) { result.errors.push(`Pull ${file.path}: ${error instanceof Error ? error.message : String(error)}`); }
    }
    saveSyncBase(vaultPath, remoteUrl, branchName, base, shas);
  } catch (error) { result.errors.push(`Pull failed: ${error instanceof Error ? error.message : String(error)}`); }
  return result;
}

async function pushOnce(vaultPath: string, token: string, remoteUrl: string, branchName?: string, hint?: SyncProvider): Promise<SyncResult> {
  const remote = parseRemote(remoteUrl, hint);
  if (!remote) return { pulled: 0, pushed: 0, errors: ['Unknown Git provider. Choose GitLab or Gitea/Forgejo for self-hosted remotes.'] };
  if (remote.provider === 'github') return GitHub.push(vaultPath, token, remoteUrl, branchName);
  const result: SyncResult = { pulled: 0, pushed: 0, errors: [] };
  try {
    const ref = branchName || await branch(remote, token);
    const base = await loadSyncBase(vaultPath, remoteUrl, branchName);
    const shas = await loadSyncShas(vaultPath, remoteUrl, branchName);
    const files = new Map((await listFiles(remote, token, ref)).map((file) => [file.path, file]));
    const localFiles = await FS.listAllMarkdownFiles(vaultPath);
    for (const file of localFiles) {
      const path = vaultRelativePath(vaultPath, file.filePath);
      if (!markdown(path)) continue;
      try {
        const content = await FS.readFile(file.filePath);
        if (content === null) continue;
        const hash = contentHash(content);
        // Not edited here since the last agreement: whatever the remote did is pull's to apply.
        if (base[path] === hash) continue;
        const existing = files.get(path);
        // The remote is still the agreed version when its sha has not moved; otherwise read it to compare.
        const unmoved = existing?.sha !== undefined && shas[path] === existing.sha && base[path] !== undefined;
        const remoteHash = !existing
          ? null
          : unmoved
            ? base[path]
            : contentHash((await readRemoteFile(remote, token, ref, path)).content);
        if (remoteHash === hash) {
          base[path] = hash;
          if (existing?.sha) shas[path] = existing.sha;
          continue;
        }
        // Writing over a remote edit made elsewhere would lose it; the next pull keeps both versions first.
        if (!mayUpload(hash, remoteHash, base[path])) continue;
        await writeRemoteFile(remote, token, ref, path, content, existing?.sha);
        base[path] = hash;
        // The new sha is not returned here; the next pull reads the note once, finds it equal and records it.
        delete shas[path];
        result.pushed++;
      } catch (error) { result.errors.push(`Push ${path}: ${error instanceof Error ? error.message : String(error)}`); }
    }

    // Notes deleted (or renamed away) here since the last agreement; checked one by one, as on GitHub.
    const listed = new Set(localFiles.map((file) => vaultRelativePath(vaultPath, file.filePath)));
    if (listed.size > 0) {
      for (const path of Object.keys(base)) {
        if (listed.has(path) || !markdown(path)) continue;
        if (!FS.fileMissing(vaultFileUri(vaultPath, path))) continue;
        const existing = files.get(path);
        try {
          if (existing) {
            // Edited elsewhere since (or its sha never recorded): the edit wins, and the next pull brings it back.
            if (existing.sha === undefined || shas[path] !== existing.sha) continue;
            await deleteRemoteFile(remote, token, ref, path, existing.sha);
            result.pushed++;
          }
          delete base[path];
          delete shas[path];
        } catch (error) { result.errors.push(`Delete ${path}: ${error instanceof Error ? error.message : String(error)}`); }
      }
    }
    saveSyncBase(vaultPath, remoteUrl, branchName, base, shas);
  } catch (error) { result.errors.push(`Push failed: ${error instanceof Error ? error.message : String(error)}`); }
  return result;
}

// --- One sync at a time, whoever starts it (the timers in AppContext, Settings) ---

export interface SyncHooks {
  /** Before a run: save the open note, so the sync sees what is on screen. */
  before?: () => void | Promise<void>;
  /** After a run: the open note may have changed on disk. */
  after?: (result: SyncResult) => void | Promise<void>;
}

let hooks: SyncHooks = {};
let queue: Promise<unknown> = Promise.resolve();

export function setSyncHooks(next: SyncHooks): void {
  hooks = next;
}

/** Runs `run` after any sync already going (two at once would overwrite each other's sync state). */
function serialized(run: () => Promise<SyncResult>): Promise<SyncResult> {
  const next = queue.then(async () => {
    await hooks.before?.();
    const result = await run();
    // The sync itself is done and saved; a failing check of the open note must not report it as failed.
    try {
      await hooks.after?.(result);
    } catch (error) {
      console.warn('[Noteriv] After-sync check failed:', error);
    }
    return result;
  });
  queue = next.catch(() => undefined);
  return next;
}

export function pull(vaultPath: string, token: string, remoteUrl: string, branchName?: string, hint?: SyncProvider): Promise<SyncResult> {
  return serialized(() => pullOnce(vaultPath, token, remoteUrl, branchName, hint));
}

export function push(vaultPath: string, token: string, remoteUrl: string, branchName?: string, hint?: SyncProvider): Promise<SyncResult> {
  return serialized(() => pushOnce(vaultPath, token, remoteUrl, branchName, hint));
}

export function sync(vaultPath: string, token: string, remote: string, branch?: string, hint?: SyncProvider): Promise<SyncResult> {
  return serialized(async () => {
    const pulled = await pullOnce(vaultPath, token, remote, branch, hint);
    const pushed = await pushOnce(vaultPath, token, remote, branch, hint);
    return { pulled: pulled.pulled, pushed: pushed.pushed, errors: [...pulled.errors, ...pushed.errors] };
  });
}

export function freshClone(vaultPath: string, token: string, remoteUrl: string, branch?: string, hint?: SyncProvider): Promise<SyncResult> {
  const remote = parseRemote(remoteUrl, hint);
  if (remote?.provider === 'github') return serialized(() => GitHub.freshClone(vaultPath, token, remoteUrl, branch));
  return Promise.resolve({ pulled: 0, pushed: 0, errors: ['Fresh Clone is currently available for GitHub remotes only. Use Sync Now for this provider.'] });
}

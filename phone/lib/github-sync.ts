import * as FS from '@/lib/file-system';
import {
  conflictCopyPath,
  contentHash,
  loadSyncBase,
  loadSyncShas,
  pullAction,
  saveSyncBase,
  shouldDeleteLocal,
  vaultFileUri,
  vaultRelativePath,
} from '@/lib/sync-state';

// --- Types ---

export interface SyncResult {
  pulled: number;
  pushed: number;
  errors: string[];
}

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  content: string;
  encoding: string;
}

// Cache of remote file shas keyed by "owner/repo:path"
const shaCache = new Map<string, string>();

function shaCacheKey(owner: string, repo: string, path: string): string {
  return `${owner}/${repo}:${path}`;
}

// --- Base64 helpers for React Native ---

function base64Encode(str: string): string {
  // Works in RN / Hermes via global btoa polyfill or manual encoding
  if (typeof btoa === 'function') {
    // btoa works on latin1, so encode UTF-8 manually
    const utf8 = encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) =>
      String.fromCharCode(parseInt(p1, 16))
    );
    return btoa(utf8);
  }
  // Fallback: manual base64
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const bytes = new TextEncoder().encode(str);
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    result += chars[b0 >> 2];
    result += chars[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < bytes.length ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    result += i + 2 < bytes.length ? chars[b2 & 63] : '=';
  }
  return result;
}

function base64Decode(b64: string): string {
  if (typeof atob === 'function') {
    const latin1 = atob(b64);
    return decodeURIComponent(
      latin1
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  }
  // Fallback
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const cleaned = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    const a = chars.indexOf(cleaned[i]);
    const b = chars.indexOf(cleaned[i + 1]);
    const c = chars.indexOf(cleaned[i + 2]);
    const d = chars.indexOf(cleaned[i + 3]);
    bytes.push((a << 2) | (b >> 4));
    if (c !== -1) bytes.push(((b & 15) << 4) | (c >> 2));
    if (d !== -1) bytes.push(((c & 3) << 6) | d);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
}

// --- Remote URL parsing ---

export function parseRemote(url: string): { owner: string; repo: string } | null {
  // HTTPS (https://github.com/owner/repo[.git]) or SSH (git@github.com:owner/repo.git). Repo names may contain dots.
  const match = url.trim().match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
  return match ? { owner: match[1], repo: match[2] } : null;
}

// --- GitHub API helpers ---

const API_BASE = 'https://api.github.com';

async function ghFetch(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
}

async function getDefaultBranch(
  owner: string,
  repo: string,
  token: string
): Promise<string> {
  const res = await ghFetch(`/repos/${owner}/${repo}`, token);
  if (!res.ok) throw new Error(`Failed to get repo info: ${await describeFailure(res)}`);
  const data = await res.json();
  return data.default_branch ?? 'main';
}

async function getTree(
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<GitHubTreeItem[]> {
  const res = await ghFetch(
    `/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    token
  );
  // A repository with no commits yet answers 409 ("Git Repository is empty"): nothing to pull, everything to push.
  if (res.status === 409) return [];
  if (!res.ok) throw new Error(`Failed to get tree: ${await describeFailure(res)}`);
  const data = await res.json();
  return data.tree ?? [];
}

/** Status plus GitHub's own message; says so plainly when the hourly API limit is used up. */
async function describeFailure(res: Response): Promise<string> {
  if ((res.status === 403 || res.status === 429) && res.headers.get('x-ratelimit-remaining') === '0') {
    const reset = Number(res.headers.get('x-ratelimit-reset'));
    const at = reset ? new Date(reset * 1000).toLocaleTimeString() : 'later';
    return `${res.status} GitHub API rate limit reached, try again after ${at}`;
  }
  let message = '';
  try {
    message = ((await res.json()) as { message?: string }).message ?? '';
  } catch {
    /* no JSON body */
  }
  return message ? `${res.status} ${message}` : String(res.status);
}

/** A blob's text by sha (works for files the contents API refuses as too large). */
async function getBlobContent(owner: string, repo: string, sha: string, token: string): Promise<string> {
  const res = await ghFetch(`/repos/${owner}/${repo}/git/blobs/${sha}`, token);
  if (!res.ok) throw new Error(`Failed to get blob ${sha.slice(0, 7)}: ${await describeFailure(res)}`);
  const data = (await res.json()) as { content?: string };
  return base64Decode((data.content ?? '').replace(/\n/g, ''));
}

/** Runs `fn` over `items` with at most `limit` in flight. */
async function forEachLimited<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      await fn(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  token: string,
  ref?: string
): Promise<GitHubFileContent> {
  const query = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  const res = await ghFetch(
    `/repos/${owner}/${repo}/contents/${encodeRepoPath(path)}${query}`,
    token
  );
  if (!res.ok) throw new Error(`Failed to get file ${path}: ${res.status}`);
  return res.json();
}

async function putFileContent(
  owner: string,
  repo: string,
  path: string,
  content: string,
  token: string,
  sha?: string,
  message?: string
): Promise<{ sha: string }> {
  const body: Record<string, string> = {
    message: message ?? 'Sync from Noteriv Mobile',
    content: base64Encode(content),
  };
  if (sha) body.sha = sha;

  const res = await ghFetch(
    `/repos/${owner}/${repo}/contents/${encodeRepoPath(path)}`,
    token,
    { method: 'PUT', body: JSON.stringify(body) }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to put file ${path}: ${res.status} ${err}`);
  }
  const data = await res.json();
  return { sha: data.content?.sha ?? '' };
}

// --- Helpers ---

function isMarkdownFile(path: string): boolean {
  return /\.(md|markdown)$/i.test(path);
}

function shouldSkipPath(path: string): boolean {
  return path.startsWith('.noteriv/') || path.startsWith('.noteriv\\');
}

/** A repository path for a contents-API URL; `#`, `?` and spaces must not leak into the URL. */
function encodeRepoPath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

// --- Pull ---

/**
 * Sync used to download every note on every pull, and again on push to compare: for a vault of a few thousand
 * notes that is thousands of API calls per sync (the hourly limit is 5,000) and minutes of work. The sync state
 * now also records each note's remote blob sha at the last agreement, so a note unchanged on both sides costs
 * nothing; only notes whose sha moved are downloaded, by sha (the blobs API, which also serves files over the
 * contents API's 1 MB limit).
 */
const DOWNLOAD_CONCURRENCY = 6;

export async function pull(
  vaultPath: string,
  token: string,
  remote: string,
  branch?: string
): Promise<SyncResult> {
  const result: SyncResult = { pulled: 0, pushed: 0, errors: [] };
  const parsed = parseRemote(remote);
  if (!parsed) {
    result.errors.push('Invalid GitHub remote URL');
    return result;
  }
  const { owner, repo } = parsed;

  try {
    const branchName = branch ?? (await getDefaultBranch(owner, repo, token));
    const tree = await getTree(owner, repo, branchName, token);
    const base = await loadSyncBase(vaultPath, remote, branch);
    const shas = await loadSyncShas(vaultPath, remote, branch);

    // Filter to markdown files only, skip .noteriv/
    const remoteFiles = tree.filter(
      (item) =>
        item.type === 'blob' &&
        isMarkdownFile(item.path) &&
        !shouldSkipPath(item.path)
    );

    // Update sha cache
    for (const item of remoteFiles) {
      shaCache.set(shaCacheKey(owner, repo, item.path), item.sha);
    }

    // Apply deletions made on the remote, but never delete a note that is new
    // or edited on this device: push uploads those.
    const remotePathSet = new Set(remoteFiles.map((f) => f.path));
    const localFiles = await FS.listAllMarkdownFiles(vaultPath);
    for (const file of localFiles) {
      const rel = vaultRelativePath(vaultPath, file.filePath);
      if (shouldSkipPath(rel) || rel.startsWith('.trash/')) continue;
      if (remotePathSet.has(rel)) continue;
      const localContent = await FS.readFile(file.filePath);
      if (shouldDeleteLocal(localContent, base[rel])) {
        FS.deleteFile(file.filePath);
        delete base[rel];
        delete shas[rel];
        result.pulled++;
      }
    }

    // Download what changed on the remote
    await forEachLimited(remoteFiles, DOWNLOAD_CONCURRENCY, async (item) => {
      try {
        const localPath = vaultFileUri(vaultPath, item.path);
        const localContent = await FS.readFile(localPath);
        // Unchanged on the remote since the last sync: nothing to pull (a local edit is push's job).
        if (localContent !== null && base[item.path] !== undefined && shas[item.path] === item.sha) return;
        const remoteContent = await getBlobContent(owner, repo, item.sha, token);

        switch (pullAction(localContent, remoteContent, base[item.path])) {
          case 'skip':
            base[item.path] = contentHash(remoteContent);
            shas[item.path] = item.sha;
            break;
          case 'take-remote':
            FS.writeFile(localPath, remoteContent);
            base[item.path] = contentHash(remoteContent);
            shas[item.path] = item.sha;
            result.pulled++;
            break;
          case 'keep-local':
            // The remote still holds the agreed version; push uploads the local edit against this sha.
            shas[item.path] = item.sha;
            break;
          case 'conflict': {
            // Edited on both sides since the last sync: keep this device's
            // version in place and the remote's alongside it.
            const copy = vaultFileUri(vaultPath, conflictCopyPath(item.path));
            if ((await FS.readFile(copy)) === null) {
              FS.writeFile(copy, remoteContent);
              result.pulled++;
            }
            break;
          }
        }
      } catch (err) {
        result.errors.push(
          `Pull ${item.path}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    });

    saveSyncBase(vaultPath, remote, branch, base, shas);
  } catch (err) {
    result.errors.push(
      `Pull failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return result;
}

// --- Push ---

export async function push(
  vaultPath: string,
  token: string,
  remote: string,
  branch?: string
): Promise<SyncResult> {
  const result: SyncResult = { pulled: 0, pushed: 0, errors: [] };
  const parsed = parseRemote(remote);
  if (!parsed) {
    result.errors.push('Invalid GitHub remote URL');
    return result;
  }
  const { owner, repo } = parsed;

  try {
    const branchName = branch ?? (await getDefaultBranch(owner, repo, token));
    const base = await loadSyncBase(vaultPath, remote, branch);
    const shas = await loadSyncShas(vaultPath, remote, branch);

    // Get the remote tree to know current shas
    const tree = await getTree(owner, repo, branchName, token);
    const remoteFileMap = new Map<string, string>(); // path -> sha
    for (const item of tree) {
      if (item.type === 'blob') {
        remoteFileMap.set(item.path, item.sha);
        shaCache.set(shaCacheKey(owner, repo, item.path), item.sha);
      }
    }

    // List all local markdown files
    const localFiles = await FS.listAllMarkdownFiles(vaultPath);

    // One file at a time: each upload is a commit on the branch, and parallel ones would race for its head.
    for (const file of localFiles) {
      const relPath = vaultRelativePath(vaultPath, file.filePath);
      try {
        if (shouldSkipPath(relPath) || relPath.startsWith('.trash/')) continue;

        const localContent = await FS.readFile(file.filePath);
        if (localContent === null) continue;
        const localHash = contentHash(localContent);
        const remoteSha = remoteFileMap.get(relPath);

        if (remoteSha) {
          // Unchanged on both sides since the last sync.
          if (base[relPath] === localHash && shas[relPath] === remoteSha) continue;
          if (shas[relPath] !== remoteSha) {
            // The remote moved, or this device never recorded its sha: compare before writing.
            const remoteContent = await getBlobContent(owner, repo, remoteSha, token);
            if (remoteContent === localContent) {
              base[relPath] = localHash;
              shas[relPath] = remoteSha;
              continue;
            }
          }
          const { sha } = await putFileContent(owner, repo, relPath, localContent, token, remoteSha, 'Sync from Noteriv Mobile');
          shaCache.set(shaCacheKey(owner, repo, relPath), sha);
          base[relPath] = localHash;
          if (sha) shas[relPath] = sha;
          result.pushed++;
        } else {
          // File doesn't exist on remote - create it
          const { sha } = await putFileContent(owner, repo, relPath, localContent, token, undefined, 'Sync from Noteriv Mobile');
          shaCache.set(shaCacheKey(owner, repo, relPath), sha);
          base[relPath] = localHash;
          if (sha) shas[relPath] = sha;
          result.pushed++;
        }
      } catch (err) {
        result.errors.push(
          `Push ${relPath}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    saveSyncBase(vaultPath, remote, branch, base, shas);
  } catch (err) {
    result.errors.push(
      `Push failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return result;
}

// --- Fresh Clone (delete all + pull) ---

export async function freshClone(
  vaultPath: string,
  token: string,
  remote: string,
  branch?: string
): Promise<SyncResult> {
  const result: SyncResult = { pulled: 0, pushed: 0, errors: [] };
  const parsed = parseRemote(remote);
  if (!parsed) {
    result.errors.push('Invalid GitHub remote URL');
    return result;
  }
  const { owner, repo } = parsed;

  try {
    const branchName = branch ?? (await getDefaultBranch(owner, repo, token));
    const tree = await getTree(owner, repo, branchName, token);

    // Nuke all vault contents except .noteriv/ and .trash/
    const base = vaultPath.endsWith('/') ? vaultPath.slice(0, -1) : vaultPath;
    console.log('[FreshClone] Vault path:', base);
    const entries = FS.readDir(base);
    console.log('[FreshClone] Found', entries.length, 'entries to process');
    for (const entry of entries) {
      const name = entry.name;
      if (name === '.noteriv' || name === '.trash') {
        console.log('[FreshClone] Skipping:', name);
        continue;
      }
      console.log('[FreshClone] Deleting:', entry.path, entry.isDirectory ? '(dir)' : '(file)');
      if (entry.isDirectory) {
        const ok = FS.deleteDir(entry.path);
        console.log('[FreshClone] deleteDir result:', ok);
      } else {
        const ok = FS.deleteFile(entry.path);
        console.log('[FreshClone] deleteFile result:', ok);
      }
    }
    // Verify deletion
    const remaining = FS.readDir(base);
    console.log('[FreshClone] After delete:', remaining.length, 'entries remain:', remaining.map(e => e.name));

    // Pull all remote files (not just markdown — clone everything)
    const remoteFiles = tree.filter(
      (item) =>
        item.type === 'blob' &&
        !shouldSkipPath(item.path)
    );
    console.log('[FreshClone] Remote files to download:', remoteFiles.length);
    const clonedBase: Record<string, string> = {};

    for (const item of remoteFiles) {
      try {
        const localPath = vaultFileUri(vaultPath, item.path);
        console.log('[FreshClone] Downloading:', item.path, '->', localPath);
        const remoteFile = await getFileContent(owner, repo, item.path, token, branchName);
        const remoteContent = base64Decode(remoteFile.content.replace(/\n/g, ''));
        const ok = FS.writeFile(localPath, remoteContent);
        console.log('[FreshClone] Write result:', ok);
        shaCache.set(shaCacheKey(owner, repo, item.path), item.sha);
        if (ok && isMarkdownFile(item.path)) clonedBase[item.path] = contentHash(remoteContent);
        result.pulled++;
      } catch (err) {
        console.log('[FreshClone] Error downloading:', item.path, err);
        result.errors.push(
          `Clone ${item.path}: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
    saveSyncBase(vaultPath, remote, branch, clonedBase);
    console.log('[FreshClone] Done. Pulled:', result.pulled, 'Errors:', result.errors.length);
  } catch (err) {
    result.errors.push(
      `Fresh clone failed: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  return result;
}

// --- Full Sync ---

export async function sync(
  vaultPath: string,
  token: string,
  remote: string,
  branch?: string
): Promise<SyncResult> {
  const pullResult = await pull(vaultPath, token, remote, branch);
  const pushResult = await push(vaultPath, token, remote, branch);

  return {
    pulled: pullResult.pulled,
    pushed: pushResult.pushed,
    errors: [...pullResult.errors, ...pushResult.errors],
  };
}

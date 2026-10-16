/**
 * The storage seam between the UI and a vault.
 *
 * Web talks to a REST API and identifies notes by server id; desktop talks to the filesystem and identifies notes by
 * absolute path. `NoteRef.id` hides that difference: it is an opaque key the adapter understands and the UI only
 * passes back (bookmarks, tabs and selections store it as-is). `path` is always vault-relative with `/` separators
 * and is what the UI may show or parse.
 */

import type { Backlink as WikiBacklink } from "./wiki-link-utils";

export interface NoteRef {
  /** Opaque, adapter-specific key (web: note id, desktop: absolute path). */
  id: string;
  /** Vault-relative path with `/` separators, e.g. `openings/sicilian.md`. */
  path: string;
  /** File name without directories, e.g. `sicilian.md`. */
  name: string;
}

export interface NoteDates {
  createdAt: number;
  modifiedAt: number;
}

export interface NoteBacklink {
  ref: NoteRef;
  /** 1-based line of the link. Absent when the backend cannot say (web). */
  line?: number;
  /** Text around the link. Absent when the backend cannot say (web). */
  snippet?: string;
}

export interface NoteSearchHit {
  ref: NoteRef;
  snippet: string;
}

export interface VaultAdapter {
  readonly kind: "web" | "desktop" | "memory";
  /** Every markdown note in the vault, in no particular order. */
  listNotes(): Promise<NoteRef[]>;
  /** Note body, or null when the note does not exist or cannot be read. */
  readNote(id: string): Promise<string | null>;
  writeNote(id: string, content: string): Promise<void>;
  createNote(path: string, content?: string): Promise<NoteRef>;
  renameNote(id: string, newPath: string): Promise<NoteRef>;
  deleteNote(id: string): Promise<void>;
  search(query: string): Promise<NoteSearchHit[]>;
  /** Notes that link to `id`, sorted by name then line. */
  backlinks(id: string): Promise<NoteBacklink[]>;
  getSettings(): Promise<Record<string, unknown>>;
  saveSettings(settings: Record<string, unknown>): Promise<void>;
  /**
   * Creation and last-change time of every note (ms since epoch), keyed by note id. Optional: callers treat a
   * missing method or a missing entry as "unknown".
   */
  noteDates?(): Promise<Record<string, NoteDates>>;
  /**
   * Stores a binary attachment and returns the link target for markdown (web: attachment URL, desktop:
   * `attachments/<name>` in the vault). Optional: plugins get an error where it is missing.
   */
  saveAttachment?(name: string, data: Blob): Promise<string>;
  /** Subscribe to external changes. Optional: the web client has no change feed yet. */
  watch?(onChange: (id: string) => void): () => void;
}

/** Normalise Windows separators so paths compare and display the same everywhere. */
export function toPosixPath(path: string): string {
  return path.replace(/\\/g, "/");
}

/** Last path segment, `/` or `\` separated. */
export function baseName(path: string): string {
  const p = toPosixPath(path);
  return p.slice(p.lastIndexOf("/") + 1);
}

export function isMarkdownPath(path: string): boolean {
  return /\.(md|markdown)$/i.test(path);
}

/**
 * Vault-relative `/` path for an absolute filesystem path. A path outside the vault is returned normalised but
 * otherwise unchanged rather than guessed at.
 */
export function relativeVaultPath(vaultPath: string, absolutePath: string): string {
  const root = toPosixPath(vaultPath).replace(/\/+$/, "");
  const abs = toPosixPath(absolutePath);
  const insideVault = abs.toLowerCase().startsWith(root.toLowerCase() + "/");
  return insideVault ? abs.slice(root.length + 1) : abs;
}

export function refFromAbsolutePath(vaultPath: string, absolutePath: string): NoteRef {
  return { id: absolutePath, path: relativeVaultPath(vaultPath, absolutePath), name: baseName(absolutePath) };
}

/** Desktop backlinks come from `findBacklinks` keyed by absolute file path. */
export function backlinksFromWikiScan(vaultPath: string, found: WikiBacklink[]): NoteBacklink[] {
  return found.map((b) => ({
    ref: {
      id: b.filePath,
      path: b.relativePath ? toPosixPath(b.relativePath) : relativeVaultPath(vaultPath, b.filePath),
      name: b.fileName,
    },
    line: b.line,
    snippet: b.snippet,
  }));
}

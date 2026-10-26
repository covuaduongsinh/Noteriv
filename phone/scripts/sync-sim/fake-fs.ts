// In-memory stand-in for lib/file-system.ts: file URIs map to text. Only what sync and wiki-links use.
import type { FileEntry } from '@/types';

export const disk = new Map<string, string>();
/** URIs whose writes fail, as when storage is full. */
export const failWrite = new Set<string>();

export async function readFile(path: string): Promise<string | null> {
  return disk.has(path) ? disk.get(path)! : null;
}

export function writeFile(path: string, content: string): boolean {
  if (failWrite.has(path)) return false;
  disk.set(path, content);
  return true;
}

export function deleteFile(path: string): boolean {
  disk.delete(path);
  return true;
}

export function deleteDir(): boolean {
  return true;
}

export function readDir(): FileEntry[] {
  return [];
}

export function fileMissing(path: string): boolean {
  return !disk.has(path);
}

export function fileExists(path: string): boolean {
  return disk.has(path);
}

/** A file, or a folder (every file under it), renamed in place. */
export function rename(oldPath: string, newName: string): boolean {
  const from = oldPath.replace(/\/+$/, '');
  const to = from.slice(0, from.lastIndexOf('/') + 1) + encodeURIComponent(newName);
  const moved = [...disk.keys()].filter((k) => k === from || k.startsWith(from + '/'));
  if (moved.length === 0) return false;
  for (const k of moved) {
    const content = disk.get(k)!;
    disk.delete(k);
    disk.set(to + k.slice(from.length), content);
  }
  return true;
}

/** Like the real one, but without its blind spot: dot folders are listed too, except .noteriv. */
export async function listAllMarkdownFiles(dir: string) {
  return [...disk.keys()]
    .filter((k) => k.startsWith(dir + '/') && /\.(md|markdown)$/i.test(k) && !k.includes('/.noteriv/'))
    .map((k) => ({ filePath: k, fileName: k, relativePath: k.slice(dir.length) }));
}

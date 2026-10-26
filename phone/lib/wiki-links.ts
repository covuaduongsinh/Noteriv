import { linkResolver, resolveLinkTarget, rewriteLinksForMoves } from '@noteriv/core/link-rename';
import { wikiLinkTargets } from '@noteriv/core/graph-utils';
import { readFile, writeFile, listAllMarkdownFiles, rename as renameFile } from '@/lib/file-system';
import { vaultFileUri, vaultRelativePath } from '@/lib/sync-state';

export interface ParsedWikiLink {
  raw: string;
  target: string;
  display: string;
  heading: string | null;
}

export interface Backlink {
  filePath: string;
  fileName: string;
  line: number;
  text: string;
}

const WIKI_LINK_REGEX = /\[\[([^\]]+)\]\]/g;

/**
 * Parse a single wiki link string (including the brackets) into its components.
 *
 * Supports:
 * - [[file]]
 * - [[file|display]]
 * - [[file#heading]]
 * - [[file#heading|display]]
 */
export function parseWikiLink(raw: string): ParsedWikiLink {
  // Strip outer brackets
  let inner = raw;
  if (inner.startsWith('[[') && inner.endsWith(']]')) {
    inner = inner.slice(2, -2);
  }

  let target = inner;
  let display = inner;
  let heading: string | null = null;

  // Check for alias (pipe)
  const pipeIndex = inner.indexOf('|');
  if (pipeIndex !== -1) {
    target = inner.slice(0, pipeIndex).trim();
    display = inner.slice(pipeIndex + 1).trim();
  }

  // Check for heading anchor
  const hashIndex = target.indexOf('#');
  if (hashIndex !== -1) {
    heading = target.slice(hashIndex + 1).trim();
    target = target.slice(0, hashIndex).trim();
  }

  // If no alias was given, the display is the target (without heading)
  if (pipeIndex === -1) {
    display = target || heading || inner;
  }

  return { raw, target, display, heading };
}

/**
 * Find all wiki links in a block of markdown content.
 */
export function findWikiLinks(content: string): ParsedWikiLink[] {
  const links: ParsedWikiLink[] = [];
  let match: RegExpExecArray | null;

  // Reset lastIndex for safety
  WIKI_LINK_REGEX.lastIndex = 0;

  while ((match = WIKI_LINK_REGEX.exec(content)) !== null) {
    links.push(parseWikiLink(match[0]));
  }

  return links;
}

// ---------------------------------------------------------------------------
// Resolving, backlinks and renames: the same rules as web and desktop (@noteriv/core), on vault-relative paths
// ---------------------------------------------------------------------------

interface VaultNote {
  /** The file URI the file system gave. */
  uri: string;
  /** Vault-relative path, as links and sync name it. */
  path: string;
}

async function vaultNotes(vaultPath: string): Promise<VaultNote[]> {
  const files = await listAllMarkdownFiles(vaultPath);
  return files
    .map((file) => ({ uri: file.filePath, path: vaultRelativePath(vaultPath, file.filePath) }))
    .filter((note) => !note.path.startsWith('.trash/'));
}

/**
 * The note a wiki link target points to, or null. As on web: a bare name or a path (a path's tail also
 * matches), `.md` optional, and among notes of the same name the one in the linking note's folder first.
 */
export async function resolveWikiLink(
  target: string,
  vaultPath: string,
  sourceFile?: string | null
): Promise<string | null> {
  const name = target.trim();
  if (!name) return null;
  const notes = await vaultNotes(vaultPath);
  const paths = notes.map((note) => note.path);
  const source = sourceFile ? vaultRelativePath(vaultPath, sourceFile) : '';
  const hit = resolveLinkTarget(name, source, paths) ?? resolveLinkTarget(name.split(/[#^|]/)[0], source, paths);
  return hit ? notes.find((note) => note.path === hit)?.uri ?? null : null;
}

/**
 * Lines of other notes that link to `filePath`, one per line. Links resolve as on web, so a link by path,
 * to a heading (`#`) or to a block (`^`) counts too.
 */
export async function findBacklinks(filePath: string, vaultPath: string): Promise<Backlink[]> {
  const notes = await vaultNotes(vaultPath);
  const target = vaultRelativePath(vaultPath, filePath);
  const resolve = linkResolver(notes.map((note) => note.path));
  const backlinks: Backlink[] = [];

  for (const note of notes) {
    if (note.path === target) continue;
    const content = await readFile(note.uri);
    if (!content || !content.includes('[[')) continue;
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].includes('[[')) continue;
      if (wikiLinkTargets(lines[i], note.path, resolve).includes(target)) {
        backlinks.push({
          filePath: note.uri,
          fileName: fileNameFromPath(note.path),
          line: i + 1,
          text: lines[i].trim(),
        });
      }
    }
  }

  return backlinks;
}

export interface RenameResult {
  /** The renamed note's URI, or null if it was not renamed. */
  uri: string | null;
  /** Notes whose links were rewritten. */
  updated: number;
  /** Notes whose links could not be rewritten. */
  failed: number;
}

/**
 * Renames a note in its folder and rewrites the links to it in every note, as web and desktop do. A name that
 * is taken (in any letter case) is refused.
 */
export async function renameNote(vaultPath: string, fileUri: string, newName: string): Promise<RenameResult> {
  const notes = await vaultNotes(vaultPath);
  const from = vaultRelativePath(vaultPath, fileUri);
  const slash = from.lastIndexOf('/');
  const to = (slash === -1 ? '' : from.slice(0, slash + 1)) + newName;
  if (to === from) return { uri: fileUri, updated: 0, failed: 0 };
  const taken = notes.some((note) => note.path.toLowerCase() === to.toLowerCase() && note.path !== from);
  if (taken || !renameFile(fileUri, newName)) return { uri: null, updated: 0, failed: 0 };

  const uri = vaultFileUri(vaultPath, to);
  const before = notes.map((note) => note.path);
  const moves = [{ from, to }];
  let updated = 0;
  let failed = 0;
  for (const note of notes) {
    const noteUri = note.path === from ? uri : note.uri;
    const content = await readFile(noteUri);
    if (content === null || !content.includes('](') && !content.includes('[[')) continue;
    const next = rewriteLinksForMoves(content, {
      sourceBefore: note.path,
      sourceAfter: note.path === from ? to : note.path,
      moves,
      before,
    });
    if (next === content) continue;
    if (writeFile(noteUri, next)) updated++;
    else failed++;
  }
  return { uri, updated, failed };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function fileNameFromPath(filePath: string): string {
  const segments = filePath.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? '';
  return last.replace(/\.(md|markdown)$/i, '');
}

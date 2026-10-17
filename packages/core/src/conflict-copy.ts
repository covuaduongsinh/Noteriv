/**
 * Conflict copies: when sync finds a note changed on both sides it keeps the local version at the note's path and
 * saves the other version next to it as `<name> (conflict YYYY-MM-DD HHmm[ N]).<ext>` (web server and desktop git
 * sync use the same pattern). This recognises such a path and tells which note it belongs to.
 */

const CONFLICT_RE = /^(.*) \(conflict (\d{4}-\d{2}-\d{2}) (\d{2})(\d{2})(?: \d+)?\)(\.[^./]*)?$/;

export interface ConflictCopyInfo {
  /** Vault-relative path of the note the copy belongs to. */
  originalPath: string;
  /** When the conflict was found, as written in the name (UTC), e.g. `2026-10-17 01:53`. */
  stamp: string;
}

/** `notes/a (conflict 2026-10-17 0153).md` → `{ originalPath: "notes/a.md", stamp: "2026-10-17 01:53" }`; otherwise null. */
export function parseConflictCopy(path: string): ConflictCopyInfo | null {
  const m = CONFLICT_RE.exec(path);
  if (!m) return null;
  const [, stem, date, hh, mm, ext] = m;
  if (!stem || stem.endsWith("/")) return null;
  return { originalPath: `${stem}${ext ?? ""}`, stamp: `${date} ${hh}:${mm}` };
}

export function isConflictCopy(path: string): boolean {
  return parseConflictCopy(path) !== null;
}

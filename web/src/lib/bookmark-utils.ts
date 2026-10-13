/**
 * Bookmark utilities — web identifies a bookmark by stable note id (not file
 * path like desktop, since ids survive rename/move and web has no filesystem
 * path identity). Persisted in Vault.settings.bookmarks, same JSON-in-settings
 * pattern Phase 6 established for themes/snippets.
 */

export function toggleBookmark(bookmarks: string[], noteId: string): string[] {
  return isBookmarked(bookmarks, noteId) ? bookmarks.filter((b) => b !== noteId) : [...bookmarks, noteId];
}

export function isBookmarked(bookmarks: string[], noteId: string): boolean {
  return bookmarks.includes(noteId);
}

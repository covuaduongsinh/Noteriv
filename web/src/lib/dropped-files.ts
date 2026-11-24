/**
 * Files dragged in from the computer onto the file sidebar (as opposed to a note or folder
 * moved inside the vault, which carries the sidebar's own drag type).
 */

/** True while the drag carries files from outside the page. */
export function isFileDrag(dt: DataTransfer | null): boolean {
  return !!dt && Array.from(dt.types ?? []).includes("Files");
}

/**
 * The dropped files, without dropped folders: a browser hands a folder over as an empty
 * "file" that cannot be read, and only its entry tells the two apart.
 */
export function droppedFiles(dt: DataTransfer): File[] {
  const files = Array.from(dt.files ?? []);
  const items = dt.items ? Array.from(dt.items) : [];
  if (items.length !== files.length) return files;
  return files.filter((_, i) => {
    const entry = items[i].webkitGetAsEntry?.();
    return !entry || entry.isFile;
  });
}

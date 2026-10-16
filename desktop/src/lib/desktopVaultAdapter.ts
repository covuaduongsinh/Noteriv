import { findBacklinks } from "@noteriv/core/wiki-link-utils";
import { getSnapshots, loadSnapshot } from "./file-recovery";
import {
  backlinksFromWikiScan,
  baseName,
  isMarkdownPath,
  refFromAbsolutePath,
  toPosixPath,
  type NoteRef,
  type VaultAdapter,
} from "@noteriv/core/vault-adapter";

/**
 * VaultAdapter over the Electron/Tauri bridge. Note ids are absolute file paths. Backlinks and search are computed
 * here, from the file list and file contents, because the filesystem has no index to ask.
 */
export function createDesktopVaultAdapter(vaultPath: string): VaultAdapter {
  const api = () => window.electronAPI;
  // Ids must match what listAllFiles reports, so build paths with the separator the vault path itself uses.
  const sep = vaultPath.includes("\\") ? "\\" : "/";
  const abs = (relative: string) =>
    `${vaultPath.replace(/[\\/]+$/, "")}${sep}${toPosixPath(relative).split("/").join(sep)}`;
  const dirOf = (p: string) => p.slice(0, Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\")));

  async function listNotes(): Promise<NoteRef[]> {
    const files = await api().listAllFiles(vaultPath);
    return files.filter((f) => isMarkdownPath(f.filePath)).map((f) => refFromAbsolutePath(vaultPath, f.filePath));
  }

  return {
    kind: "desktop",

    listNotes,

    readNote: (id) => api().readFile(id),

    async writeNote(id, content) {
      if (!(await api().writeFile(id, content))) throw new Error(`Could not write ${id}`);
    },

    async createNote(path, content = "") {
      const target = abs(path);
      if ((await api().readFile(target)) !== null) throw new Error(`Note already exists: ${path}`);
      const dir = dirOf(target);
      await api().createDir(dir);
      if (!(await api().writeFile(target, content))) throw new Error(`Could not create ${path}`);
      return refFromAbsolutePath(vaultPath, target);
    },

    async renameNote(id, newPath) {
      const target = abs(newPath);
      const dir = dirOf(target);
      await api().createDir(dir);
      if (!(await api().rename(id, target))) throw new Error(`Could not rename ${id}`);
      return refFromAbsolutePath(vaultPath, target);
    },

    async deleteNote(id) {
      if (!(await api().deleteFile(id))) throw new Error(`Could not delete ${id}`);
    },

    async search(query) {
      if (!query.trim()) return [];
      const rows = await api().searchInFiles(vaultPath, query);
      const seen = new Set<string>();
      const hits = [];
      for (const r of rows) {
        if (seen.has(r.filePath)) continue; // first matching line per file, like the web endpoint
        seen.add(r.filePath);
        hits.push({ ref: refFromAbsolutePath(vaultPath, r.filePath), snippet: r.text.trim().slice(0, 120) });
      }
      return hits;
    },

    async backlinks(id) {
      const files = await api().listAllFiles(vaultPath);
      const found = await findBacklinks(baseName(id), vaultPath, files, (p) => api().readFile(p));
      return backlinksFromWikiScan(vaultPath, found);
    },

    async noteDates() {
      // One call for the whole vault; ids are the same absolute paths listAllFiles reports.
      const files = await api().getFileStats(vaultPath);
      return Object.fromEntries(
        files
          .filter((f) => isMarkdownPath(f.filePath))
          .map((f) => [f.filePath, { createdAt: f.birthtimeMs || f.mtimeMs, modifiedAt: f.mtimeMs }])
      );
    },

    // Binary write (raw base64, no `data:` prefix): the old recorder wrote the data-URL text and produced files that
    // would not play.
    // Snapshots: `.noteriv/snapshots/<prefix>-<timestamp>.md`, written on every save (file-recovery.ts); the id is the
    // file name. Git: the vault folder's own repository, when there is one (an empty log otherwise).
    async historySources() {
      return { snapshots: true, git: true };
    },

    async noteSnapshots(id) {
      const snaps = await getSnapshots(vaultPath, id);
      return snaps.map((s) => ({ id: baseName(s.path), timestamp: s.timestamp, size: s.size }));
    },

    async readNoteSnapshot(id, snapshotId) {
      // Only a snapshot of this note, by file name: nothing else in the vault can be read this way.
      const snap = (await getSnapshots(vaultPath, id)).find((s) => baseName(s.path) === snapshotId);
      return snap ? loadSnapshot(snap.path) : null;
    },

    async noteGitLog(id) {
      try {
        return (await api().gitFileLog?.(vaultPath, id)) ?? [];
      } catch {
        return [];
      }
    },

    async readNoteAtCommit(id, hash) {
      try {
        return (await api().gitShowFile?.(vaultPath, id, hash)) ?? null;
      } catch {
        return null;
      }
    },

    async saveAttachment(name, data) {
      const target = abs(`attachments/${name}`);
      await api().createDir(dirOf(target));
      const bytes = new Uint8Array(await data.arrayBuffer());
      let binary = "";
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      if (!(await api().writeBinaryFile(target, btoa(binary)))) throw new Error(`Could not write attachments/${name}`);
      return `attachments/${name}`;
    },

    async getSettings() {
      return (await api().loadSettings()) ?? {};
    },

    async saveSettings(settings) {
      await api().saveSettings(settings);
    },

    watch(onChange) {
      return api().onVaultChanged((filePath) => onChange(filePath));
    },
  };
}

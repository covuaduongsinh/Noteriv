import { findBacklinks } from "@noteriv/core/wiki-link-utils";
import { getSnapshots, loadSnapshot } from "./file-recovery";
import {
  backlinksFromWikiScan,
  baseName,
  isMarkdownPath,
  refFromAbsolutePath,
  relativeVaultPath,
  toPosixPath,
  type NoteRef,
  type NoteSearchHit,
  type VaultAdapter,
} from "@noteriv/core/vault-adapter";

/**
 * VaultAdapter over the Electron/Tauri bridge. Note ids are absolute file paths. Backlinks and search are computed
 * here, from the file list and file contents, because the filesystem has no index to ask.
 */
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;
const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  avif: "image/avif",
};

export function createDesktopVaultAdapter(vaultPath: string): VaultAdapter {
  const api = () => window.electronAPI;
  // Ids must match what listAllFiles reports, so build paths with the separator the vault path itself uses.
  const sep = vaultPath.includes("\\") ? "\\" : "/";
  const abs = (relative: string) =>
    `${vaultPath.replace(/[\\/]+$/, "")}${sep}${toPosixPath(relative).split("/").join(sep)}`;
  const dirOf = (p: string) => p.slice(0, Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\")));
  /** An attachment target: a vault path, or an absolute path (older documents). */
  const fileOf = (target: string) => (/^([a-zA-Z]:[\\/]|\/)/.test(target) ? target : abs(target));
  /** `<dir>/.<name>-annotations.json`, with the file's own separator. */
  const sidecarOf = (file: string) => {
    const cut = Math.max(file.lastIndexOf("/"), file.lastIndexOf("\\"));
    return `${file.slice(0, cut + 1)}.${file.slice(cut + 1)}-annotations.json`;
  };

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
      // One hit per file with all its matching lines (in file order of the results), like the web endpoint.
      const byFile = new Map<string, NoteSearchHit>();
      for (const r of rows) {
        let hit = byFile.get(r.filePath);
        if (!hit) {
          hit = { ref: refFromAbsolutePath(vaultPath, r.filePath), snippet: r.text.trim().slice(0, 120), matches: [] };
          byFile.set(r.filePath, hit);
        }
        hit.matches!.push({ line: r.line, text: r.text.trim().slice(0, 200) });
      }
      return Array.from(byFile.values());
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

    // Images anywhere in the vault folder (dot folders such as .noteriv and .git skipped); targets are vault paths.
    async listAttachments() {
      const out: { target: string; name: string }[] = [];
      const walk = async (dir: string, depth: number): Promise<void> => {
        if (depth > 12) return;
        let entries: { name: string; path: string; isDirectory: boolean }[];
        try {
          entries = await api().readDir(dir);
        } catch {
          return;
        }
        for (const e of entries) {
          if (e.name.startsWith(".")) continue;
          if (e.isDirectory) await walk(e.path, depth + 1);
          else if (IMAGE_EXT.test(e.name)) out.push({ target: relativeVaultPath(vaultPath, e.path), name: e.name });
        }
      };
      await walk(vaultPath, 0);
      return out.sort((a, b) => a.target.localeCompare(b.target));
    },

    // A vault path, or an absolute path (what canvases kept before 2.5b, possibly outside the vault): read as a data: URL.
    async attachmentUrl(target) {
      if (/^(https?:|data:|blob:)/.test(target)) return target;
      const base64 = await api().readBinaryFile(fileOf(target)).catch(() => null);
      if (!base64) return null;
      const ext = (target.split(".").pop() ?? "").toLowerCase();
      return `data:${IMAGE_MIME[ext] ?? "application/octet-stream"};base64,${base64}`;
    },

    async readAttachment(target) {
      const base64 = await api().readBinaryFile(fileOf(target)).catch(() => null);
      if (!base64) return null;
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes.buffer;
    },

    // Data kept with an attachment lives in a hidden file beside it: `.<name>-annotations.json` (the PDF viewer's
    // sidecar since before 2.5c, so existing annotations are found).
    async getAttachmentData(target) {
      const raw = await api().readFile(sidecarOf(fileOf(target))).catch(() => null);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },

    async setAttachmentData(target, data) {
      if (!(await api().writeFile(sidecarOf(fileOf(target)), JSON.stringify(data, null, 2)))) {
        throw new Error(`Could not write the data of ${target}`);
      }
    },

    async fileExists(path) {
      return (await api().readFile(abs(path)).catch(() => null)) !== null;
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

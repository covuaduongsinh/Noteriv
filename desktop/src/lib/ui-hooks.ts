import type { DataviewSource, LocalImageLoader } from "@noteriv/ui/markdown";

/** Local images in a note live as files under the vault folder; the renderer asks for them by relative path. */
export function createDesktopImageLoader(vaultPath: string): LocalImageLoader {
  return {
    resolve: (src) => `${vaultPath}/${src}`,
    load: async (absolutePath) => (await window.electronAPI?.readBinaryFile?.(absolutePath)) ?? null,
  };
}

/** Dataview queries run over every markdown file of the vault, read from disk (no timestamps: the bridge has none here). */
export function createDesktopDataviewSource(vaultPath: string): DataviewSource {
  return async () => {
    const api = window.electronAPI;
    if (!api) return [];
    const files = await api.listAllFiles(vaultPath);
    const notes = [];
    for (const file of files) {
      if (!file.filePath.match(/\.(md|markdown)$/i)) continue;
      const content = await api.readFile(file.filePath);
      if (content === null) continue;
      notes.push({ path: file.filePath, content, created: "", modified: "", size: content.length });
    }
    return notes;
  };
}

import type { LocalImageLoader } from "@noteriv/ui/markdown";
import { refFromAbsolutePath, type NoteRef } from "@noteriv/core/vault-adapter";

/** Local images in a note live as files under the vault folder; the renderer asks for them by relative path. */
export function createDesktopImageLoader(vaultPath: string): LocalImageLoader {
  return {
    resolve: (src) => `${vaultPath}/${src}`,
    load: async (absolutePath) => (await window.electronAPI?.readBinaryFile?.(absolutePath)) ?? null,
  };
}

/** Quick Open on desktop lists every file in the vault (PDFs and images open too), not only markdown notes. */
export function createDesktopFileLister(vaultPath: string): () => Promise<NoteRef[]> {
  return async () => {
    const files = (await window.electronAPI?.listAllFiles(vaultPath)) ?? [];
    return files.map((f) => refFromAbsolutePath(vaultPath, f.filePath));
  };
}

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"]);

/**
 * Files dropped on the editor: images are copied into `<vault>/.imgs/` (never overwriting: a clash gets -1, -2, …)
 * and the markdown that embeds them is returned for the editor to insert. Other files are ignored.
 */
export function createDesktopImageDrop(vaultPath: string): (files: File[]) => Promise<string | null> {
  return async (files) => {
    const api = window.electronAPI;
    if (!api) return null;
    const imgs = files.filter((f) => IMAGE_EXTENSIONS.has(f.name.split(".").pop()?.toLowerCase() || ""));
    if (imgs.length === 0) return null;

    const attachDir = `${vaultPath}/.imgs`;
    await api.createDir(attachDir);

    let insertText = "";
    for (const file of imgs) {
      const ext = file.name.split(".").pop() || "png";
      const baseName = file.name.replace(/\.[^.]+$/, "");
      let destName = file.name;
      let destPath = `${attachDir}/${destName}`;

      let counter = 1;
      while (true) {
        const existing = await api.readFile(destPath);
        if (existing === null) break;
        destName = `${baseName}-${counter}.${ext}`;
        destPath = `${attachDir}/${destName}`;
        counter++;
      }

      const electronPath = (file as File & { path?: string }).path;
      let success = false;
      if (electronPath) {
        success = await api.copyFile(electronPath, destPath);
      }
      if (!success) {
        try {
          const bytes = new Uint8Array(await file.arrayBuffer());
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          success = (await api.writeBinaryFile?.(destPath, btoa(binary))) ?? false;
        } catch {
          // fall through: this file is skipped
        }
      }
      if (success) insertText += `![](.imgs/${destName})\n`;
    }
    return insertText || null;
  };
}


import type { VaultApi } from "@noteriv/plugin-api";

export interface ScannedNote {
  /** Vault-relative, `/` separated. */
  path: string;
  content: string;
}

/** Vault-relative paths of every markdown note under `dir` (the whole vault by default). */
export async function listMarkdown(vault: VaultApi, dir?: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await vault.list(dir)) {
    if (entry.isDir) out.push(...(await listMarkdown(vault, entry.path)));
    else if (/\.(md|markdown)$/i.test(entry.path)) out.push(entry.path);
  }
  return out;
}

/** Every markdown note with its content, read a few at a time (one request per note on web). */
export async function scanVault(vault: VaultApi, concurrency = 8): Promise<ScannedNote[]> {
  const paths = await listMarkdown(vault);
  const out: ScannedNote[] = [];
  for (let i = 0; i < paths.length; i += concurrency) {
    const batch = paths.slice(i, i + concurrency);
    const contents = await Promise.all(batch.map((p) => vault.read(p)));
    batch.forEach((path, k) => {
      const content = contents[k];
      if (content !== null) out.push({ path, content });
    });
  }
  return out;
}

/** File name without folders or the markdown extension. */
export function noteTitle(path: string): string {
  return (path.split("/").pop() ?? path).replace(/\.(md|markdown)$/i, "");
}

/** Folder part of a vault-relative path ("" at the root). */
export function folderOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i < 0 ? "" : path.slice(0, i);
}

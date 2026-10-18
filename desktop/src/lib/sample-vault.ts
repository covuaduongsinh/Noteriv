import type { SampleVaultFile } from "@noteriv/core/sample-vault";

export interface SampleVaultWriter {
  createDir: (dirPath: string) => Promise<unknown>;
  writeFile: (filePath: string, content: string) => Promise<unknown>;
}

/**
 * Writes the "Getting started" notes into a newly created vault folder: each sub-folder once, before its files.
 * `root` is the vault folder; the sample paths use forward slashes, which Windows accepts as well.
 */
export async function writeSampleVault(root: string, files: SampleVaultFile[], fs: SampleVaultWriter): Promise<void> {
  const base = root.replace(/[\\/]+$/, "");
  const made = new Set<string>();
  for (const file of files) {
    const parts = file.path.split("/");
    for (let i = 1; i < parts.length; i++) {
      const dir = parts.slice(0, i).join("/");
      if (made.has(dir)) continue;
      await fs.createDir(`${base}/${dir}`);
      made.add(dir);
    }
    await fs.writeFile(`${base}/${file.path}`, file.content);
  }
}

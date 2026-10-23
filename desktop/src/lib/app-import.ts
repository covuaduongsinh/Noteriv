import type { AppImportReport } from "@noteriv/ui/panels";
import { toBase64, type ImportResult } from "@noteriv/ui/importers/types";

/**
 * Writes what an import from another app produced (Notion, Evernote, HTML) into the vault folder: attachments, then
 * notes. A file already at a path is kept as it is (counted as kept), never overwritten.
 */
export async function writeImportToVault(
  vaultPath: string,
  result: ImportResult,
  onProgress: (done: number, total: number) => void
): Promise<AppImportReport> {
  const api = window.electronAPI;
  const sep = vaultPath.includes("\\") ? "\\" : "/";
  const root = vaultPath.replace(/[\\/]+$/, "");
  const abs = (path: string) => `${root}${sep}${path.split("/").join(sep)}`;

  // Names already in each folder, read once per folder.
  const listed = new Map<string, Promise<Set<string>>>();
  const exists = async (path: string) => {
    const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    if (!listed.has(dir)) {
      listed.set(
        dir,
        api
          .readDir(dir ? abs(dir) : root)
          .then((entries) => new Set(entries.map((e) => e.name.toLowerCase())))
          .catch(() => new Set<string>())
      );
    }
    return (await listed.get(dir)!).has(path.slice(path.lastIndexOf("/") + 1).toLowerCase());
  };

  const report: AppImportReport = { written: 0, kept: 0, failed: [] };
  const total = result.attachments.length + result.notes.length;
  let done = 0;
  const step = () => onProgress(++done, total);
  onProgress(0, total);

  for (const file of result.attachments) {
    try {
      if (await exists(file.path)) report.kept++;
      else if (await api.writeBinaryFile(abs(file.path), toBase64(file.data))) report.written++;
      else report.failed.push({ path: file.path, error: "write failed" });
    } catch (e) {
      report.failed.push({ path: file.path, error: e instanceof Error ? e.message : String(e) });
    }
    step();
  }
  for (const note of result.notes) {
    try {
      if (await exists(note.path)) report.kept++;
      else if (await api.writeFile(abs(note.path), note.content)) report.written++;
      else report.failed.push({ path: note.path, error: "write failed" });
    } catch (e) {
      report.failed.push({ path: note.path, error: e instanceof Error ? e.message : String(e) });
    }
    step();
  }
  return report;
}

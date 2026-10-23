/**
 * What the person picked, as the importers read it: single files, the files of a folder (`webkitRelativePath`), or
 * the entries of zips (one level of zips inside, as Notion splits large exports). A folder all files share (the zip's
 * own top folder) is dropped from the paths.
 */

import type { InputFile } from "./types";

const IGNORED = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini)(\/|$)|(^|\/)\._/i;

function fromBlob(path: string, blob: Blob): InputFile {
  return {
    path,
    bytes: async () => new Uint8Array(await blob.arrayBuffer()),
    text: () => blob.text(),
  };
}

async function zipEntries(data: Blob | Uint8Array, prefix: string, nested: boolean): Promise<InputFile[]> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(data);
  const out: InputFile[] = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir) continue;
    const path = `${prefix}${entry.name.replace(/\\/g, "/")}`;
    if (IGNORED.test(path)) continue;
    if (nested && /\.zip$/i.test(path)) {
      out.push(...(await zipEntries(await entry.async("uint8array"), "", false)));
      continue;
    }
    out.push({ path, bytes: () => entry.async("uint8array"), text: () => entry.async("string") });
  }
  return out;
}

/** Drops a folder every path starts with (`Export/a.md`, `Export/b.md` → `a.md`, `b.md`). */
export function stripCommonRoot(files: InputFile[]): InputFile[] {
  if (files.length === 0) return files;
  const first = files[0].path.split("/")[0];
  if (!files.every((f) => f.path.includes("/") && f.path.split("/")[0] === first)) return files;
  return stripCommonRoot(files.map((f) => ({ ...f, path: f.path.slice(first.length + 1) })));
}

/**
 * Reads picked files into the importers' input. A zip picked as such is opened; a zip inside a picked folder is a file
 * of that folder (an attachment of a page), left as it is.
 */
export async function readPicked(files: File[]): Promise<InputFile[]> {
  const out: InputFile[] = [];
  for (const file of files) {
    const inFolder = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
    const path = (inFolder || file.name).replace(/\\/g, "/");
    if (IGNORED.test(path)) continue;
    if (!inFolder && /\.zip$/i.test(file.name)) out.push(...(await zipEntries(file, "", true)));
    else out.push(fromBlob(path, file));
  }
  return stripCommonRoot(out);
}

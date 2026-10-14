// Moves attachment files between object storage (Garage/S3) and a git working
// copy so a synced repo carries images/PDFs/audio next to the notes. Paths in the
// repo are remembered on Attachment.syncPath so repeated syncs neither duplicate
// uploads nor move files around. Deletions are deliberately NOT propagated in
// either direction: removing a binary on one side never silently removes it on
// the other.

import type { PrismaClient } from "@prisma/client";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readdir, stat, readFile } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import type { Readable } from "node:stream";
import path from "node:path";
import { getObjectStream, putObject, makeStorageKey, getVaultUsage, ATTACHMENT_QUOTA_BYTES } from "./attachments.js";
import { isAssetFile, MAX_ASSET_BYTES } from "./attachmentLinks.js";

const SKIP_DIRS = new Set([".git", ".noteriv", ".obsidian", ".trash", "node_modules"]);

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml",
  bmp: "image/bmp", ico: "image/x-icon", tif: "image/tiff", tiff: "image/tiff", pdf: "application/pdf",
  mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4", flac: "audio/flac", aac: "audio/aac",
  webm: "audio/webm", mp4: "video/mp4", mov: "video/quicktime", mkv: "video/x-matroska",
};

function safeName(filename: string): string {
  return filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(-150) || "file";
}

/** Writes every attachment into `dir` (at its syncPath, or attachments/<name>) and returns id -> repo path. */
export async function exportAttachmentsToDir(prisma: PrismaClient, vaultId: string, dir: string): Promise<Map<string, string>> {
  const attachments = await prisma.attachment.findMany({ where: { vaultId }, orderBy: { createdAt: "asc" } });
  const pathById = new Map<string, string>();
  const taken = new Set(attachments.filter((a) => a.syncPath).map((a) => a.syncPath!.toLowerCase()));

  for (const a of attachments) {
    let rel = a.syncPath;
    if (!rel) {
      const name = safeName(a.filename);
      const ext = path.posix.extname(name);
      const base = name.slice(0, name.length - ext.length) || "file";
      let candidate = `attachments/${name}`;
      for (let i = 2; taken.has(candidate.toLowerCase()); i++) candidate = `attachments/${base} (${i})${ext}`;
      rel = candidate;
      taken.add(rel.toLowerCase());
      await prisma.attachment.update({ where: { id: a.id }, data: { syncPath: rel } });
    }

    const dest = path.join(dir, rel.split("/").join(path.sep));
    let upToDate = false;
    if (existsSync(dest)) upToDate = (await stat(dest)).size === a.size;
    if (!upToDate) {
      try {
        const body = await getObjectStream(a.storageKey);
        if (!body) continue;
        await mkdir(path.dirname(dest), { recursive: true });
        await pipeline(body as Readable, createWriteStream(dest));
      } catch {
        continue; // missing in storage: leave it out rather than fail the whole sync
      }
    }
    pathById.set(a.id, rel);
  }
  return pathById;
}

/** Registers/uploads asset files found in `dir`; returns lower-cased repo path -> attachment id. */
export async function importAttachmentsFromDir(
  prisma: PrismaClient,
  vaultId: string,
  dir: string,
  actorUserId: string | null
): Promise<Map<string, string>> {
  void actorUserId;
  const found: { rel: string; full: string; size: number }[] = [];
  async function walk(cur: string) {
    let entries;
    try {
      entries = await readdir(cur, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (SKIP_DIRS.has(e.name)) continue;
      const full = path.join(cur, e.name);
      if (e.isDirectory()) await walk(full);
      else if (isAssetFile(e.name)) {
        const size = (await stat(full)).size;
        if (size <= MAX_ASSET_BYTES) found.push({ rel: path.relative(dir, full).split(path.sep).join("/"), full, size });
      }
    }
  }
  await walk(dir);

  const existing = await prisma.attachment.findMany({ where: { vaultId } });
  const bySyncPath = new Map(existing.filter((a) => a.syncPath).map((a) => [a.syncPath!.toLowerCase(), a]));
  const unplaced = existing.filter((a) => !a.syncPath);
  const idByPath = new Map<string, string>();
  let used = await getVaultUsage(prisma, vaultId);

  for (const f of found) {
    const key = f.rel.toLowerCase();
    const known = bySyncPath.get(key);
    if (known) {
      idByPath.set(key, known.id);
      continue;
    }
    const filename = f.rel.split("/").pop()!;
    // A web upload that hasn't been placed in the repo yet and matches by name+size: adopt it.
    const idx = unplaced.findIndex((a) => a.filename === filename && a.size === f.size);
    if (idx !== -1) {
      const [a] = unplaced.splice(idx, 1);
      await prisma.attachment.update({ where: { id: a.id }, data: { syncPath: f.rel } });
      idByPath.set(key, a.id);
      continue;
    }
    if (used + f.size > ATTACHMENT_QUOTA_BYTES) continue; // over quota: leave the file in the repo, don't fail the sync
    const ext = filename.split(".").pop()?.toLowerCase() ?? "";
    const mimeType = MIME_BY_EXT[ext] ?? "application/octet-stream";
    const storageKey = makeStorageKey(vaultId, filename);
    await putObject(storageKey, await readFile(f.full), mimeType);
    const created = await prisma.attachment.create({
      data: { vaultId, filename, mimeType, size: f.size, storageKey, syncPath: f.rel },
    });
    used += f.size;
    idByPath.set(key, created.id);
  }
  return idByPath;
}

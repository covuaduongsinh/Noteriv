// Bridges Postgres (source of truth) and a local scratch directory that the
// git/WebDAV sync engines operate on. Only `.md` content is in scope for now —
// attachments/binary files are Phase 6 (object storage) work.

import type { PrismaClient } from "@prisma/client";
import { readdir, readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { recomputeBacklinksForNote } from "./backlinks.js";

/** Writes every note in the vault to `dir/<path>`, removing files for notes that no longer exist (unless `prune: false`). */
export async function exportNotesToDir(
  prisma: PrismaClient,
  vaultId: string,
  dir: string,
  opts: { prune?: boolean } = {}
): Promise<void> {
  const prune = opts.prune !== false;
  // Trashed notes (deletedAt set) stay out of the export so they leave the repo too.
  const notes = await prisma.note.findMany({ where: { vaultId, deletedAt: null }, select: { path: true, content: true } });
  const wanted = new Set(notes.map((n) => n.path));

  await mkdir(dir, { recursive: true });
  for (const note of notes) {
    const dest = path.join(dir, note.path.replace(/\//g, path.sep));
    await mkdir(path.dirname(dest), { recursive: true });
    await writeFile(dest, note.content, "utf8");
  }

  // Remove tracked .md files whose note was deleted in the DB since last export.
  async function pruneRecurse(cur: string) {
    let entries;
    try {
      entries = await readdir(cur, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === ".noteriv") continue;
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) {
        await pruneRecurse(full);
      } else if (entry.name.toLowerCase().endsWith(".md")) {
        const rel = path.relative(dir, full).replace(/\\/g, "/");
        if (!wanted.has(rel)) await unlink(full).catch(() => undefined);
      }
    }
  }
  if (prune) await pruneRecurse(dir);
}

/** Reads every `.md` file in `dir` back into Postgres: upserts by path, deletes notes whose file is gone. */
export async function importDirToNotes(
  prisma: PrismaClient,
  vaultId: string,
  dir: string,
  actorUserId: string | null
): Promise<void> {
  const files: Array<{ rel: string; full: string }> = [];
  async function recurse(cur: string) {
    let entries;
    try {
      entries = await readdir(cur, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === ".noteriv") continue;
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) {
        await recurse(full);
      } else if (entry.name.toLowerCase().endsWith(".md")) {
        files.push({ rel: path.relative(dir, full).replace(/\\/g, "/"), full });
      }
    }
  }
  await recurse(dir);

  const existingNotes = await prisma.note.findMany({ where: { vaultId }, select: { id: true, path: true, content: true } });
  const existingByPath = new Map(existingNotes.map((n) => [n.path, n]));
  const existingFolders = await prisma.folder.findMany({ where: { vaultId }, select: { id: true, path: true } });
  const folderByPath = new Map(existingFolders.map((f) => [f.path, f.id]));

  const seenPaths = new Set<string>();

  for (const { rel, full } of files) {
    seenPaths.add(rel);
    const content = await readFile(full, "utf8");
    const existing = existingByPath.get(rel);

    if (existing) {
      if (existing.content !== content) {
        await prisma.note.update({
          where: { id: existing.id },
          data: { content, sizeBytes: Buffer.byteLength(content, "utf8"), updatedById: actorUserId },
        });
        await recomputeBacklinksForNote(prisma, vaultId, existing.id, content);
      }
      continue;
    }

    // New file pulled from remote — ensure its folder chain exists, then create the note.
    const lastSlash = rel.lastIndexOf("/");
    const name = lastSlash === -1 ? rel : rel.slice(lastSlash + 1);
    const folderPath = lastSlash === -1 ? null : rel.slice(0, lastSlash);
    let folderId: string | null = null;
    if (folderPath) {
      folderId = await ensureFolderChain(prisma, vaultId, folderPath, folderByPath);
    }

    const created = await prisma.note.create({
      data: {
        vaultId,
        folderId,
        name,
        path: rel,
        content,
        sizeBytes: Buffer.byteLength(content, "utf8"),
        createdById: actorUserId,
        updatedById: actorUserId,
      },
    });
    await recomputeBacklinksForNote(prisma, vaultId, created.id, content);
  }

  // Anything in the DB that wasn't on disk after this pull was deleted remotely.
  for (const note of existingNotes) {
    if (!seenPaths.has(note.path)) {
      await prisma.note.delete({ where: { id: note.id } }).catch(() => undefined);
    }
  }
}

/**
 * Creates Postgres notes for `.md` files in `dir` whose path isn't already a
 * note in the DB — never updates or deletes existing notes. Used to rescue
 * remote-only files on the very first git sync of an existing vault, where
 * `ensureWorkingCopy` checks out whatever's already on the remote into `dir`
 * *before* the DB's current content is exported there: without this step,
 * `exportNotesToDir`'s prune pass (which only knows paths already in the DB)
 * would delete those remote-only files from `dir`, and the following
 * add/commit/push would propagate that deletion back to the remote — a real
 * data-loss bug, not just a cosmetic one. Paths that exist in both places are
 * deliberately left untouched here: the DB's content is what `exportNotesToDir`
 * writes next, preserving the sync engine's existing "DB content wins on
 * conflict, remote's prior version just becomes earlier git history" rule for
 * every sync (first or not) rather than only for already-established repos.
 */
export async function importNewNotesOnly(
  prisma: PrismaClient,
  vaultId: string,
  dir: string,
  actorUserId: string | null
): Promise<void> {
  const files: Array<{ rel: string; full: string }> = [];
  async function recurse(cur: string) {
    let entries;
    try {
      entries = await readdir(cur, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === ".noteriv") continue;
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) {
        await recurse(full);
      } else if (entry.name.toLowerCase().endsWith(".md")) {
        files.push({ rel: path.relative(dir, full).replace(/\\/g, "/"), full });
      }
    }
  }
  await recurse(dir);
  if (files.length === 0) return;

  const existingNotes = await prisma.note.findMany({ where: { vaultId }, select: { path: true } });
  const existingPaths = new Set(existingNotes.map((n) => n.path));
  const existingFolders = await prisma.folder.findMany({ where: { vaultId }, select: { id: true, path: true } });
  const folderByPath = new Map(existingFolders.map((f) => [f.path, f.id]));

  for (const { rel, full } of files) {
    if (existingPaths.has(rel)) continue;

    const content = await readFile(full, "utf8");
    const lastSlash = rel.lastIndexOf("/");
    const name = lastSlash === -1 ? rel : rel.slice(lastSlash + 1);
    const folderPath = lastSlash === -1 ? null : rel.slice(0, lastSlash);
    let folderId: string | null = null;
    if (folderPath) {
      folderId = await ensureFolderChain(prisma, vaultId, folderPath, folderByPath);
    }

    const created = await prisma.note.create({
      data: {
        vaultId,
        folderId,
        name,
        path: rel,
        content,
        sizeBytes: Buffer.byteLength(content, "utf8"),
        createdById: actorUserId,
        updatedById: actorUserId,
      },
    });
    await recomputeBacklinksForNote(prisma, vaultId, created.id, content);
  }
}

export async function ensureFolderChain(
  prisma: PrismaClient,
  vaultId: string,
  folderPath: string,
  cache: Map<string, string>
): Promise<string> {
  const cached = cache.get(folderPath);
  if (cached) return cached;

  const segments = folderPath.split("/");
  let parentId: string | null = null;
  let acc = "";
  for (const segment of segments) {
    acc = acc ? `${acc}/${segment}` : segment;
    const existing = cache.get(acc);
    if (existing) {
      parentId = existing;
      continue;
    }
    const folder: { id: string } = await prisma.folder.create({
      data: { vaultId, parentId, name: segment, path: acc },
      select: { id: true },
    });
    cache.set(acc, folder.id);
    parentId = folder.id;
  }
  return parentId!;
}

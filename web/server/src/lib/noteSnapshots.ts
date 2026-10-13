import type { PrismaClient } from "@prisma/client";

/** Mirrors desktop's lib/file-recovery.ts MAX_SNAPSHOTS_PER_FILE. */
export const MAX_SNAPSHOTS_PER_NOTE = 50;

/**
 * Recurring job body (see sync-worker) — for every non-trashed note whose
 * content changed since its last snapshot (or has none yet), writes a new
 * NoteSnapshot row, then prunes anything past MAX_SNAPSHOTS_PER_NOTE (oldest
 * first). Runs across all vaults in one pass, same shape as
 * cleanupExpiredTrash in lib/trash.ts.
 */
export async function captureSnapshots(prisma: PrismaClient): Promise<void> {
  const notes = await prisma.note.findMany({
    where: { deletedAt: null, content: { not: "" } },
    select: { id: true, content: true },
  });

  for (const note of notes) {
    const latest = await prisma.noteSnapshot.findFirst({
      where: { noteId: note.id },
      orderBy: { createdAt: "desc" },
      select: { content: true },
    });
    if (latest && latest.content === note.content) continue;

    await prisma.noteSnapshot.create({ data: { noteId: note.id, content: note.content } });

    const toPrune = await prisma.noteSnapshot.findMany({
      where: { noteId: note.id },
      orderBy: { createdAt: "desc" },
      skip: MAX_SNAPSHOTS_PER_NOTE,
      select: { id: true },
    });
    if (toPrune.length > 0) {
      await prisma.noteSnapshot.deleteMany({ where: { id: { in: toPrune.map((s) => s.id) } } });
    }
  }
}

/** Metadata only (no content) — mirrors desktop's getSnapshots() shape. */
export async function listSnapshots(prisma: PrismaClient, noteId: string) {
  const rows = await prisma.noteSnapshot.findMany({
    where: { noteId },
    orderBy: { createdAt: "desc" },
    select: { id: true, content: true, createdAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    size: Buffer.byteLength(r.content, "utf8"),
  }));
}

export async function getSnapshotContent(prisma: PrismaClient, noteId: string, snapshotId: string): Promise<string | null> {
  const row = await prisma.noteSnapshot.findFirst({ where: { id: snapshotId, noteId }, select: { content: true } });
  return row?.content ?? null;
}

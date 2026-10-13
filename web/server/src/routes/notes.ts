import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireVaultAccess, VaultAccessError } from "../lib/vaultAccess.js";
import { resolvePath } from "../lib/notePath.js";
import { recomputeBacklinksForNote } from "../lib/backlinks.js";
import { trashNote } from "../lib/trash.js";
import { listSnapshots, getSnapshotContent } from "../lib/noteSnapshots.js";
import { getNoteGitHistory, getNoteContentAtCommit } from "../lib/noteHistory.js";

const createNoteSchema = z.object({
  name: z.string().min(1).max(255),
  folderId: z.string().uuid().nullable().optional(),
  content: z.string().default(""),
});

const updateNoteSchema = z.object({
  content: z.string().optional(),
  frontmatter: z.record(z.any()).optional(),
  name: z.string().min(1).max(255).optional(),
  folderId: z.string().uuid().nullable().optional(),
});

export default async function noteRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;
  fastify.addHook("preHandler", fastify.authenticate);

  async function assertVaultAccess(vaultId: string, userId: string, needsWrite = false) {
    const { role } = await requireVaultAccess(prisma, vaultId, userId);
    if (needsWrite && role === "viewer") {
      throw new VaultAccessError(403, "forbidden");
    }
    return role;
  }

  fastify.get("/:vid/notes/:nid", async (request, reply) => {
    const { vid, nid } = request.params as { vid: string; nid: string };
    try {
      await assertVaultAccess(vid, request.user!.id);
      const note = await prisma.note.findFirst({ where: { id: nid, vaultId: vid, deletedAt: null } });
      if (!note) return reply.code(404).send({ error: "not_found" });
      return reply.send(note);
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.post("/:vid/notes", async (request, reply) => {
    const { vid } = request.params as { vid: string };
    const parsed = createNoteSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });
    try {
      await assertVaultAccess(vid, request.user!.id, true);
      const { name, folderId, content } = parsed.data;
      const path = await resolvePath(prisma, vid, folderId, name);

      const existing = await prisma.note.findUnique({ where: { vaultId_path: { vaultId: vid, path } } });
      if (existing) return reply.code(409).send({ error: "path_exists" });

      const note = await prisma.note.create({
        data: {
          vaultId: vid,
          folderId: folderId ?? null,
          name,
          path,
          content,
          sizeBytes: Buffer.byteLength(content, "utf8"),
          createdById: request.user!.id,
          updatedById: request.user!.id,
        },
      });
      await recomputeBacklinksForNote(prisma, vid, note.id, content);
      return reply.code(201).send(note);
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      if (err instanceof Error && err.message === "folder_not_found") {
        return reply.code(400).send({ error: "folder_not_found" });
      }
      throw err;
    }
  });

  fastify.patch("/:vid/notes/:nid", async (request, reply) => {
    const { vid, nid } = request.params as { vid: string; nid: string };
    const parsed = updateNoteSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });
    try {
      await assertVaultAccess(vid, request.user!.id, true);
      const existing = await prisma.note.findFirst({ where: { id: nid, vaultId: vid, deletedAt: null } });
      if (!existing) return reply.code(404).send({ error: "not_found" });

      const { content, frontmatter, name, folderId } = parsed.data;
      let path = existing.path;
      const nextName = name ?? existing.name;
      const nextFolderId = folderId === undefined ? existing.folderId : folderId;
      if (name !== undefined || folderId !== undefined) {
        path = await resolvePath(prisma, vid, nextFolderId, nextName);
      }

      const note = await prisma.note.update({
        where: { id: nid },
        data: {
          ...(content !== undefined ? { content, sizeBytes: Buffer.byteLength(content, "utf8") } : {}),
          ...(frontmatter !== undefined ? { frontmatter } : {}),
          name: nextName,
          folderId: nextFolderId,
          path,
          updatedById: request.user!.id,
        },
      });
      if (content !== undefined) {
        await recomputeBacklinksForNote(prisma, vid, note.id, content);
      }
      return reply.send(note);
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      if (err instanceof Error && err.message === "folder_not_found") {
        return reply.code(400).send({ error: "folder_not_found" });
      }
      throw err;
    }
  });

  fastify.get("/:vid/notes/:nid/backlinks", async (request, reply) => {
    const { vid, nid } = request.params as { vid: string; nid: string };
    try {
      await assertVaultAccess(vid, request.user!.id);
      const backlinks = await prisma.backlink.findMany({
        where: { targetNoteId: nid, vaultId: vid, sourceNote: { deletedAt: null } },
        include: { sourceNote: { select: { id: true, name: true, path: true } } },
      });
      return reply.send(
        backlinks.map((b) => ({ ...b.sourceNote, linkType: b.linkType }))
      );
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // D5 — File Recovery / Time Scrubber: periodic content snapshots (written by
  // the recurring sync-worker job, see lib/noteSnapshots.ts), not per-save.
  fastify.get("/:vid/notes/:nid/snapshots", async (request, reply) => {
    const { vid, nid } = request.params as { vid: string; nid: string };
    try {
      await assertVaultAccess(vid, request.user!.id);
      const note = await prisma.note.findFirst({ where: { id: nid, vaultId: vid } });
      if (!note) return reply.code(404).send({ error: "not_found" });
      return reply.send(await listSnapshots(prisma, nid));
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.get("/:vid/notes/:nid/snapshots/:sid", async (request, reply) => {
    const { vid, nid, sid } = request.params as { vid: string; nid: string; sid: string };
    try {
      await assertVaultAccess(vid, request.user!.id);
      const note = await prisma.note.findFirst({ where: { id: nid, vaultId: vid } });
      if (!note) return reply.code(404).send({ error: "not_found" });
      const content = await getSnapshotContent(prisma, nid, sid);
      if (content === null) return reply.code(404).send({ error: "not_found" });
      return reply.send({ content });
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  // D6 — Note History via git log, only available when the vault has a
  // configured git sync-connection with a working copy that's already been
  // synced at least once (see lib/noteHistory.ts's doc comment for why no
  // hidden per-vault git repo is created just for this).
  fastify.get("/:vid/notes/:nid/history", async (request, reply) => {
    const { vid, nid } = request.params as { vid: string; nid: string };
    try {
      await assertVaultAccess(vid, request.user!.id);
      const note = await prisma.note.findFirst({ where: { id: nid, vaultId: vid } });
      if (!note) return reply.code(404).send({ error: "not_found" });
      const result = await getNoteGitHistory(prisma, vid, note.path);
      return reply.send(result);
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.get("/:vid/notes/:nid/history/:hash", async (request, reply) => {
    const { vid, nid, hash } = request.params as { vid: string; nid: string; hash: string };
    try {
      await assertVaultAccess(vid, request.user!.id);
      const note = await prisma.note.findFirst({ where: { id: nid, vaultId: vid } });
      if (!note) return reply.code(404).send({ error: "not_found" });
      const content = await getNoteContentAtCommit(prisma, vid, note.path, hash);
      if (content === null) return reply.code(404).send({ error: "not_found" });
      return reply.send({ content });
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.delete("/:vid/notes/:nid", async (request, reply) => {
    const { vid, nid } = request.params as { vid: string; nid: string };
    try {
      await assertVaultAccess(vid, request.user!.id, true);
      const existing = await prisma.note.findFirst({ where: { id: nid, vaultId: vid, deletedAt: null } });
      if (!existing) return reply.code(404).send({ error: "not_found" });
      await trashNote(prisma, nid);
      return reply.send({ ok: true });
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });
}

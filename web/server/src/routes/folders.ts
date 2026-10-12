import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireVaultAccess, VaultAccessError } from "../lib/vaultAccess.js";
import { resolvePath } from "../lib/notePath.js";

const createFolderSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.string().uuid().nullable().optional(),
});

export default async function folderRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.post("/:vid/folders", async (request, reply) => {
    const { vid } = request.params as { vid: string };
    const parsed = createFolderSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });
    try {
      const { role } = await requireVaultAccess(prisma, vid, request.user!.id);
      if (role === "viewer") return reply.code(403).send({ error: "forbidden" });

      const { name, parentId } = parsed.data;
      const path = await resolvePath(prisma, vid, parentId, name);
      const folder = await prisma.folder.create({
        data: { vaultId: vid, parentId: parentId ?? null, name, path },
      });
      return reply.code(201).send(folder);
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      if (err instanceof Error && err.message === "folder_not_found") {
        return reply.code(400).send({ error: "parent_not_found" });
      }
      throw err;
    }
  });

  fastify.patch("/:vid/folders/:fid", async (request, reply) => {
    const { vid, fid } = request.params as { vid: string; fid: string };
    const parsed = createFolderSchema.partial().safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });
    try {
      const { role } = await requireVaultAccess(prisma, vid, request.user!.id);
      if (role === "viewer") return reply.code(403).send({ error: "forbidden" });

      const existing = await prisma.folder.findFirst({ where: { id: fid, vaultId: vid } });
      if (!existing) return reply.code(404).send({ error: "not_found" });

      const nextName = parsed.data.name ?? existing.name;
      const nextParentId = parsed.data.parentId === undefined ? existing.parentId : parsed.data.parentId;
      const path = await resolvePath(prisma, vid, nextParentId, nextName);

      const folder = await prisma.folder.update({
        where: { id: fid },
        data: { name: nextName, parentId: nextParentId, path },
      });
      return reply.send(folder);
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.delete("/:vid/folders/:fid", async (request, reply) => {
    const { vid, fid } = request.params as { vid: string; fid: string };
    try {
      const { role } = await requireVaultAccess(prisma, vid, request.user!.id);
      if (role === "viewer") return reply.code(403).send({ error: "forbidden" });
      const existing = await prisma.folder.findFirst({ where: { id: fid, vaultId: vid } });
      if (!existing) return reply.code(404).send({ error: "not_found" });
      await prisma.folder.delete({ where: { id: fid } });
      return reply.send({ ok: true });
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });
}

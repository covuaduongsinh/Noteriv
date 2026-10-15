import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { generateInviteCode, isAdminEmail } from "../lib/registration.js";
import { logAudit } from "../lib/auditLog.js";

const createInviteSchema = z.object({
  note: z.string().max(120).default(""),
  maxUses: z.number().int().min(1).max(500).default(1),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

/**
 * Invite-code management. Admin = an email listed in ADMIN_EMAILS (see lib/registration.ts);
 * there is deliberately no role column: the list lives in Dokploy env, so promoting someone needs
 * access to the server, not just a database row.
 */
export default async function adminRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;
  fastify.addHook("preHandler", fastify.authenticate);
  fastify.addHook("preHandler", async (request, reply) => {
    if (reply.sent) return;
    if (!isAdminEmail(request.user?.email)) {
      return reply.code(403).send({ error: "forbidden" });
    }
  });

  fastify.get("/invites", async (_request, reply) => {
    const rows = await prisma.inviteCode.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
    const now = Date.now();
    return reply.send(
      rows.map((r) => ({
        id: r.id,
        code: r.code,
        note: r.note,
        maxUses: r.maxUses,
        usedCount: r.usedCount,
        expiresAt: r.expiresAt,
        revokedAt: r.revokedAt,
        createdAt: r.createdAt,
        status: r.revokedAt
          ? "revoked"
          : r.expiresAt && r.expiresAt.getTime() <= now
            ? "expired"
            : r.usedCount >= r.maxUses
              ? "used_up"
              : "active",
      }))
    );
  });

  fastify.post("/invites", async (request, reply) => {
    const parsed = createInviteSchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });
    const { note, maxUses, expiresInDays } = parsed.data;

    // 49 bits of randomness makes a collision practically impossible; retry anyway rather than 500.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const row = await prisma.inviteCode.create({
          data: {
            code: generateInviteCode(),
            note,
            maxUses,
            expiresAt: expiresInDays ? new Date(Date.now() + expiresInDays * 86_400_000) : null,
            createdById: request.user!.id,
          },
        });
        logAudit(prisma, { userId: request.user!.id, action: "invite_created", resourceType: "invite_code", resourceId: row.id, metadata: { maxUses, expiresInDays: expiresInDays ?? null }, ip: request.ip });
        return reply.code(201).send({ id: row.id, code: row.code });
      } catch (err) {
        if ((err as { code?: string }).code !== "P2002") throw err;
      }
    }
    return reply.code(500).send({ error: "could_not_generate_code" });
  });

  fastify.delete("/invites/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const row = await prisma.inviteCode.findUnique({ where: { id } });
    if (!row) return reply.code(404).send({ error: "not_found" });
    if (!row.revokedAt) {
      await prisma.inviteCode.update({ where: { id }, data: { revokedAt: new Date() } });
      logAudit(prisma, { userId: request.user!.id, action: "invite_revoked", resourceType: "invite_code", resourceId: id, ip: request.ip });
    }
    return reply.send({ ok: true });
  });
}

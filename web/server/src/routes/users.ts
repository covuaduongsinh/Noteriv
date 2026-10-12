import type { FastifyInstance } from "fastify";
import { logAudit } from "../lib/auditLog.js";

const ACCESS_COOKIE = "noteriv_access";
const REFRESH_COOKIE = "noteriv_refresh";

export default async function userRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;
  fastify.addHook("preHandler", fastify.authenticate);

  /** GDPR-style data export: everything this user owns, as one JSON document. */
  fastify.get("/me/export", async (request, reply) => {
    const userId = request.user!.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true, avatarUrl: true, createdAt: true },
    });
    if (!user) {
      return reply.code(404).send({ error: "not_found" });
    }

    const workspaces = await prisma.workspace.findMany({
      where: { ownerId: userId },
      include: {
        vaults: {
          include: {
            folders: true,
            notes: true,
            plugins: true,
            syncConnections: {
              // Never include credentialsEncrypted in an export — same rule
              // as every other response in this API (see syncConnections.ts's
              // toPublic()).
              select: {
                id: true,
                providerType: true,
                remoteUrl: true,
                branch: true,
                authUsername: true,
                webdavUrl: true,
                webdavPath: true,
                direction: true,
                autoSync: true,
                lastSyncedAt: true,
                lastSyncStatus: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    logAudit(prisma, { userId, action: "data_export", ip: request.ip });
    reply.header("Content-Disposition", `attachment; filename="noteriv-export-${userId}.json"`);
    return reply.send({ exportedAt: new Date().toISOString(), user, workspaces });
  });

  /**
   * Permanently deletes this user's account and everything they own
   * (workspaces, vaults, notes, plugins, sync connections). Irreversible —
   * the frontend must get explicit user confirmation before calling this.
   */
  fastify.delete("/me", async (request, reply) => {
    const userId = request.user!.id;

    await prisma.$transaction(async (tx) => {
      // Workspace->owner has no onDelete:Cascade (a workspace must always
      // have an explicit owner), so owned workspaces must be deleted before
      // the user row — this cascades down through Vault->Folder/Note/
      // Backlink/Plugin/SyncConnection/SyncJob automatically.
      await tx.workspace.deleteMany({ where: { ownerId: userId } });

      // Note.createdBy/updatedBy has no onDelete action either. By this
      // point every note in a workspace this user owned is already gone;
      // this only matters for notes in a workspace they were a non-owner
      // member of (not reachable via the app's UI yet, kept for safety).
      await tx.note.updateMany({ where: { createdById: userId }, data: { createdById: null } });
      await tx.note.updateMany({ where: { updatedById: userId }, data: { updatedById: null } });

      // RefreshToken and WorkspaceMember both cascade on User delete.
      await tx.user.delete({ where: { id: userId } });
    });

    logAudit(prisma, { userId, action: "account_deleted", ip: request.ip });
    reply.clearCookie(ACCESS_COOKIE, { path: "/" });
    reply.clearCookie(REFRESH_COOKIE, { path: "/" });
    return reply.send({ ok: true });
  });
}

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { logAudit } from "../lib/auditLog.js";

const ACCESS_COOKIE = "noteriv_access";
const REFRESH_COOKIE = "noteriv_refresh";

const preferencesSchema = z.object({
  hotkeys: z.record(z.string(), z.string()).optional(),
  editorSettings: z
    .object({
      editorFont: z.string().optional(),
      fontSize: z.number().min(10).max(32).optional(),
      lineHeight: z.number().min(1).max(3).optional(),
      autoSaveInterval: z.number().min(300).max(10000).optional(),
      // Phase D7 — ported from desktop/src/lib/vim-mode.ts's on/off toggle.
      // Found missing via actual browser testing: PUT silently dropped this
      // field (zod strips unknown object keys by default) instead of
      // erroring, so the client's "saved" state was a lie until this was
      // added here.
      vimModeEnabled: z.boolean().optional(),
      // Parity plan v2, Pha 6 — remember to add new fields here too: zod strips unknown keys.
      spellCheck: z.boolean().optional(),
      accentColor: z.string().regex(/^(#[0-9a-fA-F]{6})?$/).optional(),
      tabSize: z.number().int().min(1).max(8).optional(),
      pdfColumnLayout: z.union([z.literal(1), z.literal(2)]).optional(),
      pdfChessboardWidth: z.union([z.literal(75), z.literal(100)]).optional(),
      autoCollapseSidebar: z.boolean().optional(),
    })
    .optional(),
});

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

  // Per-user preferences (hotkey overrides + editor settings) — private to
  // the requesting user, not shared vault config (see UserVaultState for the
  // per-user/per-vault equivalent for workspace state).
  fastify.get("/me/preferences", async (request, reply) => {
    const pref = await prisma.userPreference.findUnique({ where: { userId: request.user!.id } });
    return reply.send({ hotkeys: pref?.hotkeys ?? {}, editorSettings: pref?.editorSettings ?? {} });
  });

  fastify.put("/me/preferences", async (request, reply) => {
    const parsed = preferencesSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });
    const userId = request.user!.id;
    const data = parsed.data;
    const pref = await prisma.userPreference.upsert({
      where: { userId },
      create: {
        userId,
        hotkeys: data.hotkeys ?? {},
        editorSettings: data.editorSettings ?? {},
      },
      update: {
        ...(data.hotkeys !== undefined ? { hotkeys: data.hotkeys } : {}),
        ...(data.editorSettings !== undefined ? { editorSettings: data.editorSettings } : {}),
      },
    });
    return reply.send({ hotkeys: pref.hotkeys, editorSettings: pref.editorSettings });
  });
}

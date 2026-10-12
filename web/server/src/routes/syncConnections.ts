import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireVaultAccess, VaultAccessError } from "../lib/vaultAccess.js";
import { encryptJson, decryptJson } from "../lib/crypto.js";
import { testGitRemote } from "../lib/gitSync.js";
import { webdavTest } from "../lib/webdavSync.js";
import { syncQueue } from "../lib/syncQueue.js";

const gitProviderSchema = z.object({
  providerType: z.enum(["github", "gitlab", "gitea", "forgejo"]),
  remoteUrl: z.string().url(),
  branch: z.string().min(1).max(200).default("main"),
  direction: z.enum(["push", "pull", "both"]).default("both"),
  autoSync: z.boolean().default(false),
  username: z.string().max(200).default(""),
  token: z.string().min(1).max(2000),
});

const webdavProviderSchema = z.object({
  providerType: z.literal("webdav"),
  webdavUrl: z.string().url(),
  webdavPath: z.string().max(500).default("/"),
  direction: z.enum(["push", "pull", "both"]).default("both"),
  autoSync: z.boolean().default(false),
  username: z.string().max(200),
  password: z.string().min(1).max(2000),
});

const createSchema = z.union([gitProviderSchema, webdavProviderSchema]);

// A connection's row is safe to return to the client once its encrypted
// credentials blob is stripped — never send that back, even to the owner.
function toPublic(conn: Record<string, unknown>) {
  const { credentialsEncrypted: _omit, ...rest } = conn;
  return rest;
}

export default async function syncConnectionRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;
  fastify.addHook("preHandler", fastify.authenticate);

  fastify.get("/:vid/sync-connections", async (request, reply) => {
    const { vid } = request.params as { vid: string };
    try {
      await requireVaultAccess(prisma, vid, request.user!.id);
      const conns = await prisma.syncConnection.findMany({ where: { vaultId: vid } });
      return reply.send(conns.map(toPublic));
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.post("/:vid/sync-connections", async (request, reply) => {
    const { vid } = request.params as { vid: string };
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    try {
      const { role } = await requireVaultAccess(prisma, vid, request.user!.id);
      if (role === "viewer") return reply.code(403).send({ error: "forbidden" });

      const data = parsed.data;
      if (data.providerType === "webdav") {
        const conn = await prisma.syncConnection.create({
          data: {
            vaultId: vid,
            providerType: "webdav",
            webdavUrl: data.webdavUrl,
            webdavPath: data.webdavPath,
            direction: data.direction,
            autoSync: data.autoSync,
            credentialsEncrypted: encryptJson({ username: data.username, password: data.password }),
          },
        });
        return reply.code(201).send(toPublic(conn));
      }

      const conn = await prisma.syncConnection.create({
        data: {
          vaultId: vid,
          providerType: data.providerType,
          remoteUrl: data.remoteUrl,
          branch: data.branch,
          authUsername: data.username,
          direction: data.direction,
          autoSync: data.autoSync,
          credentialsEncrypted: encryptJson({ username: data.username, token: data.token }),
        },
      });
      return reply.code(201).send(toPublic(conn));
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.delete("/:vid/sync-connections/:cid", async (request, reply) => {
    const { vid, cid } = request.params as { vid: string; cid: string };
    try {
      const { role } = await requireVaultAccess(prisma, vid, request.user!.id);
      if (role === "viewer") return reply.code(403).send({ error: "forbidden" });
      const existing = await prisma.syncConnection.findFirst({ where: { id: cid, vaultId: vid } });
      if (!existing) return reply.code(404).send({ error: "not_found" });
      await prisma.syncConnection.delete({ where: { id: cid } });
      return reply.send({ ok: true });
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.post("/:vid/sync-connections/:cid/test", async (request, reply) => {
    const { vid, cid } = request.params as { vid: string; cid: string };
    try {
      await requireVaultAccess(prisma, vid, request.user!.id);
      const conn = await prisma.syncConnection.findFirst({ where: { id: cid, vaultId: vid } });
      if (!conn) return reply.code(404).send({ error: "not_found" });

      if (conn.providerType === "webdav") {
        const creds = decryptJson<{ username: string; password: string }>(conn.credentialsEncrypted);
        const result = await webdavTest({ url: conn.webdavUrl!, remotePath: conn.webdavPath ?? "/", ...creds });
        return reply.send(result);
      }
      const creds = decryptJson<{ username: string; token: string }>(conn.credentialsEncrypted);
      const result = await testGitRemote(conn.remoteUrl!, creds.token ? creds : null);
      return reply.send(result);
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.post("/:vid/sync-connections/:cid/trigger", async (request, reply) => {
    const { vid, cid } = request.params as { vid: string; cid: string };
    try {
      const { role } = await requireVaultAccess(prisma, vid, request.user!.id);
      if (role === "viewer") return reply.code(403).send({ error: "forbidden" });
      const conn = await prisma.syncConnection.findFirst({ where: { id: cid, vaultId: vid } });
      if (!conn) return reply.code(404).send({ error: "not_found" });

      await syncQueue.add("sync", { connectionId: cid }, { removeOnComplete: 50, removeOnFail: 50 });
      return reply.send({ ok: true, queued: true });
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.get("/:vid/sync-connections/:cid/status", async (request, reply) => {
    const { vid, cid } = request.params as { vid: string; cid: string };
    try {
      await requireVaultAccess(prisma, vid, request.user!.id);
      const conn = await prisma.syncConnection.findFirst({ where: { id: cid, vaultId: vid } });
      if (!conn) return reply.code(404).send({ error: "not_found" });
      const latestJob = await prisma.syncJob.findFirst({
        where: { syncConnectionId: cid },
        orderBy: { createdAt: "desc" },
      });
      return reply.send({ connection: toPublic(conn), latestJob });
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });

  fastify.get("/:vid/sync-connections/:cid/log", async (request, reply) => {
    const { vid, cid } = request.params as { vid: string; cid: string };
    try {
      await requireVaultAccess(prisma, vid, request.user!.id);
      const conn = await prisma.syncConnection.findFirst({ where: { id: cid, vaultId: vid } });
      if (!conn) return reply.code(404).send({ error: "not_found" });
      const jobs = await prisma.syncJob.findMany({
        where: { syncConnectionId: cid },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
      return reply.send(jobs);
    } catch (err) {
      if (err instanceof VaultAccessError) return reply.code(err.statusCode).send({ error: err.message });
      throw err;
    }
  });
}

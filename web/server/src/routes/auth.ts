import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { hashPassword, verifyPassword } from "../lib/password.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from "../lib/jwt.js";
import { hashToken } from "../lib/tokenHash.js";
import { randomUUID } from "node:crypto";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  displayName: z.string().min(1).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ACCESS_COOKIE = "noteriv_access";
const REFRESH_COOKIE = "noteriv_refresh";

function cookieOpts(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export default async function authRoutes(fastify: FastifyInstance) {
  const { prisma } = fastify;

  async function issueSession(reply: FastifyReply, userId: string, email: string) {
    const accessToken = signAccessToken({ sub: userId, email });

    const tokenId = randomUUID();
    const refreshToken = signRefreshToken({ sub: userId, tokenId });
    await prisma.refreshToken.create({
      data: {
        id: tokenId,
        userId,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
      },
    });

    reply.setCookie(ACCESS_COOKIE, accessToken, cookieOpts(ACCESS_TOKEN_TTL_SECONDS));
    reply.setCookie(REFRESH_COOKIE, refreshToken, cookieOpts(REFRESH_TOKEN_TTL_SECONDS));
  }

  fastify.post("/register", async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }
    const { email, password, displayName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: "email_taken" });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email, passwordHash, displayName },
      });
      const workspace = await tx.workspace.create({
        data: { name: `${displayName}'s workspace`, ownerId: created.id },
      });
      await tx.workspaceMember.create({
        data: { workspaceId: workspace.id, userId: created.id, role: "owner" },
      });
      return created;
    });

    await issueSession(reply, user.id, user.email);
    return reply.code(201).send({ id: user.id, email: user.email, displayName: user.displayName });
  });

  fastify.post("/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body" });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return reply.code(401).send({ error: "invalid_credentials" });
    }

    await issueSession(reply, user.id, user.email);
    return reply.send({ id: user.id, email: user.email, displayName: user.displayName });
  });

  fastify.post("/refresh", async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE];
    if (!token) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    let payload;
    try {
      payload = verifyRefreshToken(token);
    } catch {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const stored = await prisma.refreshToken.findUnique({ where: { id: payload.tokenId } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date() || stored.tokenHash !== hashToken(token)) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    // rotate: revoke old, issue new
    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    await issueSession(reply, user.id, user.email);
    return reply.send({ ok: true });
  });

  fastify.post("/logout", async (request, reply) => {
    const token = request.cookies[REFRESH_COOKIE];
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        await prisma.refreshToken.update({
          where: { id: payload.tokenId },
          data: { revokedAt: new Date() },
        }).catch(() => undefined);
      } catch {
        // ignore invalid token on logout
      }
    }
    reply.clearCookie(ACCESS_COOKIE, { path: "/" });
    reply.clearCookie(REFRESH_COOKIE, { path: "/" });
    return reply.send({ ok: true });
  });

  fastify.get("/me", { preHandler: fastify.authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user!.id } });
    if (!user) {
      return reply.code(404).send({ error: "not_found" });
    }
    return reply.send({ id: user.id, email: user.email, displayName: user.displayName, avatarUrl: user.avatarUrl });
  });
}

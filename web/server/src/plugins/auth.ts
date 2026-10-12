import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { verifyAccessToken } from "../lib/jwt.js";

export interface AuthUser {
  id: string;
  email: string;
}

declare module "fastify" {
  interface FastifyRequest {
    user: AuthUser | null;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorateRequest("user", null);

  fastify.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const token = request.cookies["noteriv_access"];
    if (!token) {
      reply.code(401).send({ error: "unauthorized" });
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      request.user = { id: payload.sub, email: payload.email };
    } catch {
      reply.code(401).send({ error: "unauthorized" });
    }
  });
});

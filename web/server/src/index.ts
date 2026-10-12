import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import prismaPlugin from "./plugins/prisma.js";
import authPlugin from "./plugins/auth.js";
import authRoutes from "./routes/auth.js";
import vaultRoutes from "./routes/vaults.js";
import noteRoutes from "./routes/notes.js";
import folderRoutes from "./routes/folders.js";
import pluginRoutes from "./routes/plugins.js";
import syncConnectionRoutes from "./routes/syncConnections.js";

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN ?? "http://localhost:3456",
  credentials: true,
});
await fastify.register(cookie);
await fastify.register(prismaPlugin);
await fastify.register(authPlugin);

await fastify.register(authRoutes, { prefix: "/api/v1/auth" });
await fastify.register(vaultRoutes, { prefix: "/api/v1/vaults" });
await fastify.register(noteRoutes, { prefix: "/api/v1/vaults" });
await fastify.register(folderRoutes, { prefix: "/api/v1/vaults" });
await fastify.register(pluginRoutes, { prefix: "/api/v1/vaults" });
await fastify.register(syncConnectionRoutes, { prefix: "/api/v1/vaults" });

fastify.get("/healthz", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 4001);
fastify
  .listen({ port, host: "0.0.0.0" })
  .then(() => fastify.log.info(`noteriv-web-server listening on :${port}`))
  .catch((err) => {
    fastify.log.error(err);
    process.exit(1);
  });

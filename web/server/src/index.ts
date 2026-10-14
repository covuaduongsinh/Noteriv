import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import prismaPlugin from "./plugins/prisma.js";
import authPlugin from "./plugins/auth.js";
import authRoutes from "./routes/auth.js";
import vaultRoutes from "./routes/vaults.js";
import noteRoutes from "./routes/notes.js";
import folderRoutes from "./routes/folders.js";
import pluginRoutes from "./routes/plugins.js";
import syncConnectionRoutes from "./routes/syncConnections.js";
import vaultTransferRoutes from "./routes/vaultTransfer.js";
import { clipTokenRoutes, clipPublicRoutes } from "./routes/clipper.js";
import userRoutes from "./routes/users.js";
import userVaultStateRoutes from "./routes/userVaultState.js";
import trashRoutes from "./routes/trash.js";
import attachmentRoutes from "./routes/attachments.js";

const fastify = Fastify({ logger: true, trustProxy: true });

// Prisma first so the public clip route (below) can use it; that route must be registered
// BEFORE the app-wide CORS plugin — it needs its own wide-open CORS (bearer-token auth, no cookies).
await fastify.register(prismaPlugin);
await fastify.register(clipPublicRoutes, { prefix: "/api/v1/clip" });

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN ?? "http://localhost:3457",
  credentials: true,
});
await fastify.register(helmet, {
  // The plugin-sandbox iframe (public/plugin-sandbox.html) is served from
  // this same origin and must stay embeddable and script-executable without
  // Helmet's default CSP fighting the sandbox attribute's own isolation —
  // real frame isolation comes from the iframe's `sandbox` attribute
  // (deliberately missing `allow-same-origin`, see plugin-sandbox/usePluginHost.ts),
  // not from CSP, so a strict default-src here would be redundant friction.
  contentSecurityPolicy: false,
});
await fastify.register(rateLimit, {
  global: true,
  max: 300,
  timeWindow: "1 minute",
});
await fastify.register(cookie);
// 25MB per-file ceiling: a memory-safety cap (files are buffered via
// file.toBuffer() in routes/attachments.ts) well under the per-vault quota,
// not the quota enforcement itself (that's the aggregate check in the route).
await fastify.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } });
await fastify.register(authPlugin);

await fastify.register(authRoutes, { prefix: "/api/v1/auth" });
await fastify.register(vaultRoutes, { prefix: "/api/v1/vaults" });
await fastify.register(noteRoutes, { prefix: "/api/v1/vaults" });
await fastify.register(folderRoutes, { prefix: "/api/v1/vaults" });
await fastify.register(pluginRoutes, { prefix: "/api/v1/vaults" });
await fastify.register(syncConnectionRoutes, { prefix: "/api/v1/vaults" });
await fastify.register(userVaultStateRoutes, { prefix: "/api/v1/vaults" });
await fastify.register(trashRoutes, { prefix: "/api/v1/vaults" });
await fastify.register(attachmentRoutes, { prefix: "/api/v1/vaults" });
await fastify.register(vaultTransferRoutes, { prefix: "/api/v1/vaults" });
await fastify.register(clipTokenRoutes, { prefix: "/api/v1/users" });
await fastify.register(userRoutes, { prefix: "/api/v1/users" });

fastify.get("/healthz", async () => ({ ok: true }));

const port = Number(process.env.PORT ?? 4001);
fastify
  .listen({ port, host: "0.0.0.0" })
  .then(() => fastify.log.info(`noteriv-web-server listening on :${port}`))
  .catch((err) => {
    fastify.log.error(err);
    process.exit(1);
  });

// Standalone sync worker process — run with `npm run dev:worker`. Separate
// from the API process per the plan (docs/plans/2026-10-12-noteriv-web-version.md
// §6): a slow/stuck git or WebDAV sync should never block API request handling.

import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { PrismaClient } from "@prisma/client";
import { runSyncJob } from "../lib/syncRunner.js";

const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:56379", {
  maxRetriesPerRequest: null,
});
const prisma = new PrismaClient();

const worker = new Worker<{ connectionId: string }>(
  "sync-jobs",
  async (job) => {
    console.log(`[sync-worker] running sync for connection ${job.data.connectionId}`);
    await runSyncJob(prisma, job.data.connectionId);
    console.log(`[sync-worker] finished sync for connection ${job.data.connectionId}`);
  },
  { connection, concurrency: 2 }
);

worker.on("failed", (job, err) => {
  console.error(`[sync-worker] job ${job?.id} failed:`, err.message);
});

console.log("noteriv sync-worker started");

process.on("SIGTERM", async () => {
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

// Standalone sync worker process — run with `npm run dev:worker`. Separate
// from the API process per the plan (docs/plans/2026-10-12-noteriv-web-version.md
// §6): a slow/stuck git or WebDAV sync should never block API request handling.

import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { PrismaClient } from "@prisma/client";
import { runSyncJob } from "../lib/syncRunner.js";
import { trashCleanupQueue } from "../lib/trashCleanupQueue.js";
import { cleanupExpiredTrash } from "../lib/trash.js";
import { noteSnapshotQueue } from "../lib/noteSnapshotQueue.js";
import { captureSnapshots } from "../lib/noteSnapshots.js";

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

// Trash cleanup (Phase C1) — separate queue/worker from sync-jobs above, same
// process. A stable jobId means re-registering the repeat schedule on every
// worker restart doesn't create duplicate schedulers.
const trashWorker = new Worker(
  "trash-cleanup",
  async () => {
    console.log("[sync-worker] running trash cleanup (purge past retention window)");
    await cleanupExpiredTrash(prisma);
  },
  { connection, concurrency: 1 }
);
trashWorker.on("failed", (job, err) => {
  console.error(`[sync-worker] trash cleanup job ${job?.id} failed:`, err.message);
});
await trashCleanupQueue.add(
  "purge-expired-trash",
  {},
  { repeat: { every: 24 * 60 * 60 * 1000 }, jobId: "purge-expired-trash" }
);

// Note snapshots (Phase D5) — every 10 minutes, only notes whose content
// changed since their last snapshot get a new row (see captureSnapshots).
const snapshotWorker = new Worker(
  "note-snapshots",
  async () => {
    console.log("[sync-worker] capturing note snapshots");
    await captureSnapshots(prisma);
  },
  { connection, concurrency: 1 }
);
snapshotWorker.on("failed", (job, err) => {
  console.error(`[sync-worker] snapshot job ${job?.id} failed:`, err.message);
});
await noteSnapshotQueue.add(
  "capture-snapshots",
  {},
  { repeat: { every: 10 * 60 * 1000 }, jobId: "capture-snapshots" }
);

console.log("noteriv sync-worker started");

process.on("SIGTERM", async () => {
  await worker.close();
  await trashWorker.close();
  await snapshotWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

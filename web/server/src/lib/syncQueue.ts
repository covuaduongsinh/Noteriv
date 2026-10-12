import { Queue } from "bullmq";
import { Redis } from "ioredis";

const connection = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:56379", {
  maxRetriesPerRequest: null,
});

export const syncQueue = new Queue<{ connectionId: string }>("sync-jobs", { connection });

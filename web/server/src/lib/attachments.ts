import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

// S3-compatible object storage for attachments (Phase C3). Originally planned
// as MinIO, swapped to Garage (web/infra/docker-compose.dev.yml has the full
// story) after `minio/minio`/`bitnami/minio` both turned out to be gone from
// Docker Hub as of 2026-10-13. The app only ever talks the S3 API, so a
// future move to real S3/R2 needs no code change here beyond env vars.
const s3 = new S3Client({
  endpoint: process.env.ATTACHMENTS_S3_ENDPOINT ?? "http://127.0.0.1:59000",
  region: process.env.ATTACHMENTS_S3_REGION ?? "garage",
  forcePathStyle: true, // required by Garage/MinIO-style servers (no virtual-hosted buckets)
  credentials: {
    accessKeyId: process.env.ATTACHMENTS_S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.ATTACHMENTS_S3_SECRET_ACCESS_KEY ?? "",
  },
});

const BUCKET = process.env.ATTACHMENTS_S3_BUCKET ?? "noteriv-attachments";

/// Hard per-vault cap, checked against the sum of Attachment.size rows before
/// every upload — this is the REAL quota enforcement (not the Garage cluster
/// layout's declared capacity, which is only a load-balancing weight, not a
/// write-rejecting limit). Default 500MiB keeps plenty of headroom under the
/// VPS's ~3GB allocated to the bucket even with several vaults in active use.
export const ATTACHMENT_QUOTA_BYTES = Number(process.env.ATTACHMENT_QUOTA_BYTES_PER_VAULT ?? 500 * 1024 * 1024);

export async function getVaultUsage(prisma: PrismaClient, vaultId: string): Promise<number> {
  const agg = await prisma.attachment.aggregate({ where: { vaultId }, _sum: { size: true } });
  return agg._sum.size ?? 0;
}

/// Adaptive B/KB/MB/GB formatting for human-readable quota messages — mirrors
/// web/src/lib/attachment-utils.ts's `formatFileSize` (client-side, not
/// importable here across the web/server package boundary). Fixes a real
/// display bug: the previous `Math.round(bytes / 1024 / 1024)` rounded any
/// quota under 500KB down to "0MB limit", which only ever showed up with an
/// unrealistically small test quota (real default is 500MiB) but was still
/// a wrong message, not just imprecise.
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Cheap reachability/credentials probe for the diagnostics screen. */
export async function checkStorage(): Promise<{ configured: boolean; ok: boolean; endpoint: string; error?: string }> {
  const endpoint = process.env.ATTACHMENTS_S3_ENDPOINT ?? "http://127.0.0.1:59000 (mặc định)";
  const configured = !!process.env.ATTACHMENTS_S3_ENDPOINT && !!process.env.ATTACHMENTS_S3_ACCESS_KEY_ID;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }), { abortSignal: AbortSignal.timeout(4000) });
    return { configured, ok: true, endpoint };
  } catch (err) {
    return { configured, ok: false, endpoint, error: err instanceof Error ? err.message.slice(0, 160) : String(err) };
  }
}

export function makeStorageKey(vaultId: string, filename: string): string {
  const safe = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-150);
  return `${vaultId}/${randomUUID()}-${safe}`;
}

export async function putObject(storageKey: string, body: Buffer, contentType: string): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: storageKey,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getObjectStream(storageKey: string) {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: storageKey }));
  return res.Body; // a Node.js Readable in the Node runtime
}

export async function deleteObject(storageKey: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: storageKey }));
}

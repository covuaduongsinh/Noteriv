import type { PrismaClient } from "@prisma/client";
import path from "node:path";
import { tmpdir } from "node:os";
import { decryptJson } from "./crypto.js";
import { exportNotesToDir, importDirToNotes } from "./vaultFs.js";
import { ensureWorkingCopy, gitSyncCore, type GitCredentials } from "./gitSync.js";
import { webdavSyncCore, type WebdavConfig } from "./webdavSync.js";

// Deliberately defaults to the OS temp dir, NOT a path inside the Noteriv repo:
// an earlier version of this pointed at `./.sync-scratch` relative to the server
// project, which lives inside the Noteriv git working tree. `git add -A` run from
// a subdirectory stages the *whole* enclosing repo, not just that subdirectory —
// so a scratch dir nested inside any git repo risks the sync engine committing
// and pushing unrelated files from that outer repo. Keeping it under the OS temp
// dir by default removes that whole class of mistake; SYNC_SCRATCH_DIR can still
// override it for an operator who's verified their chosen path isn't inside a repo.
const SCRATCH_ROOT = process.env.SYNC_SCRATCH_DIR ?? path.join(tmpdir(), "noteriv-sync-scratch");

interface GitCredentialsBlob {
  username: string;
  token: string;
}
interface WebdavCredentialsBlob {
  username: string;
  password: string;
}

export async function runSyncJob(prisma: PrismaClient, connectionId: string): Promise<void> {
  const connection = await prisma.syncConnection.findUniqueOrThrow({ where: { id: connectionId } });

  const job = await prisma.syncJob.create({
    data: { syncConnectionId: connectionId, status: "running", startedAt: new Date() },
  });

  try {
    const dir = path.resolve(SCRATCH_ROOT, connectionId);
    await exportNotesToDir(prisma, connection.vaultId, dir);

    let pushed = 0;
    let pulled = 0;

    if (connection.providerType === "webdav") {
      const creds = decryptJson<WebdavCredentialsBlob>(connection.credentialsEncrypted);
      const cfg: WebdavConfig = {
        url: connection.webdavUrl!,
        remotePath: connection.webdavPath ?? "/",
        username: creds.username,
        password: creds.password,
      };
      const result = await webdavSyncCore(dir, cfg);
      pushed = result.pushed;
      pulled = result.pulled;
    } else {
      const creds = decryptJson<GitCredentialsBlob>(connection.credentialsEncrypted);
      const gitCreds: GitCredentials | null = creds.token ? { username: creds.username, token: creds.token } : null;
      await ensureWorkingCopy(dir, connection.remoteUrl!, connection.branch, gitCreds);
      const result = await gitSyncCore(dir, connection.branch, gitCreds, `Sync notes ${new Date().toISOString().slice(0, 10)}`);
      pushed = result.pushedCommit ? 1 : 0;
    }

    await importDirToNotes(prisma, connection.vaultId, dir, null);

    const status = "success" as const;
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status, pushedCount: pushed, pulledCount: pulled, finishedAt: new Date() },
    });
    await prisma.syncConnection.update({
      where: { id: connectionId },
      data: { lastSyncedAt: new Date(), lastSyncStatus: { status, pushed, pulled } },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.startsWith("Sync paused:") ? ("conflict" as const) : ("error" as const);
    await prisma.syncJob.update({
      where: { id: job.id },
      data: { status, errorMessage: message, finishedAt: new Date() },
    });
    await prisma.syncConnection.update({
      where: { id: connectionId },
      data: { lastSyncStatus: { status, error: message } },
    });
    throw err;
  }
}

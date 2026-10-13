import type { PrismaClient } from "@prisma/client";
import path from "node:path";
import { tmpdir } from "node:os";
import { decryptJson } from "./crypto.js";
import { exportNotesToDir, importDirToNotes, importNewNotesOnly } from "./vaultFs.js";
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
export const SCRATCH_ROOT = process.env.SYNC_SCRATCH_DIR ?? path.join(tmpdir(), "noteriv-sync-scratch");

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

    let pushed = 0;
    let pulled = 0;

    if (connection.providerType === "webdav") {
      // Unaffected by the git-checkout ordering bug below (webdavSyncCore pulls
      // remote-only files into `dir` itself, after export's prune has already run
      // against whatever was on disk *before* anything remote was fetched — so
      // there's nothing on disk yet for prune to wrongly delete).
      await exportNotesToDir(prisma, connection.vaultId, dir);
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
      // Order matters here: `ensureWorkingCopy` must run on `dir` BEFORE
      // `exportNotesToDir` ever writes to it. On the very first sync of an
      // existing vault against a non-empty remote, `ensureWorkingCopy`'s
      // `git checkout -B branch FETCH_HEAD` refuses to overwrite untracked
      // files — and if the DB's content had already been exported onto `dir`
      // first, those exported files ARE the untracked files in the way,
      // failing every first sync against a non-empty remote. Calling it first
      // (on an empty/nonexistent `dir`, or a no-op on an already-established
      // repo) avoids that entirely. `importNewNotesOnly` then rescues any
      // remote-only paths into the DB before `exportNotesToDir`'s prune pass
      // would otherwise delete them for not being a known note path — it only
      // ever creates, never overwrites or deletes, so the existing "DB content
      // wins on conflict" rule for overlapping paths is unchanged.
      const creds = decryptJson<GitCredentialsBlob>(connection.credentialsEncrypted);
      const gitCreds: GitCredentials | null = creds.token ? { username: creds.username, token: creds.token } : null;
      await ensureWorkingCopy(dir, connection.remoteUrl!, connection.branch, gitCreds);
      await importNewNotesOnly(prisma, connection.vaultId, dir, null);
      await exportNotesToDir(prisma, connection.vaultId, dir);
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

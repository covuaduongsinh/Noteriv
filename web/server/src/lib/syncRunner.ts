import type { PrismaClient } from "@prisma/client";
import path from "node:path";
import { tmpdir } from "node:os";
import { decryptJson } from "./crypto.js";
import { exportNotesToDir, importDirToNotes, importNewNotesOnly } from "./vaultFs.js";
import {
  ensureWorkingCopy,
  ensureGitignore,
  gitSyncCore,
  adoptRemoteTip,
  SyncConflictError,
  type GitCredentials,
} from "./gitSync.js";
import { webdavSyncCore, type WebdavConfig } from "./webdavSync.js";
import type { SyncJobMode } from "./syncQueue.js";

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

/** Expands {date} {time} {count} in a commit message template (desktop parity). */
export function formatCommitMessage(template: string, changedCount: number, now = new Date()): string {
  const iso = now.toISOString();
  return (template || "Sync notes {date}")
    .replace(/\{date\}/g, iso.slice(0, 10))
    .replace(/\{time\}/g, iso.slice(11, 19))
    .replace(/\{count\}/g, String(changedCount));
}

export async function runSyncJob(
  prisma: PrismaClient,
  connectionId: string,
  mode: SyncJobMode = "sync"
): Promise<void> {
  const connection = await prisma.syncConnection.findUniqueOrThrow({ where: { id: connectionId } });

  const job = await prisma.syncJob.create({
    data: { syncConnectionId: connectionId, status: "running", startedAt: new Date() },
  });

  try {
    const dir = path.resolve(SCRATCH_ROOT, connectionId);

    let pushed = 0;
    let pulled = 0;

    if (connection.providerType === "webdav") {
      if (mode !== "sync") throw new Error("Conflict resolution only applies to git connections.");
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
      await importDirToNotes(prisma, connection.vaultId, dir, null);
    } else {
      const creds = decryptJson<GitCredentialsBlob>(connection.credentialsEncrypted);
      const gitCreds: GitCredentials | null = creds.token ? { username: creds.username, token: creds.token } : null;
      const remoteUrl = connection.remoteUrl!;
      const direction = connection.direction;
      const doPull = direction !== "push";
      const doPush = direction !== "pull";

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
      await ensureWorkingCopy(dir, remoteUrl, connection.branch, gitCreds);

      if (mode === "resolve-remote") {
        // Take the remote's content wholesale, then mirror it into the DB.
        await adoptRemoteTip(dir, remoteUrl, connection.branch, gitCreds, "hard");
        await importDirToNotes(prisma, connection.vaultId, dir, null);
        pulled = 1;
      } else if (mode === "resolve-web") {
        // Keep the web's content: move to the remote tip but keep the DB export as the
        // working tree, so the commit below is a plain fast-forward push (no force).
        await adoptRemoteTip(dir, remoteUrl, connection.branch, gitCreds, "mixed");
        await exportNotesToDir(prisma, connection.vaultId, dir);
        await ensureGitignore(dir);
        const result = await gitSyncCore(
          dir,
          connection.branch,
          gitCreds,
          (n) => formatCommitMessage(connection.commitTemplate, n),
          { pull: false, push: true }
        );
        pushed = result.pushedCommit ? 1 : 0;
      } else {
        if (doPull) await importNewNotesOnly(prisma, connection.vaultId, dir, null);
        if (doPush) {
          // Push-only never imports, so remote-only files must not be pruned either —
          // otherwise the push would delete notes the remote has but the vault doesn't.
          await exportNotesToDir(prisma, connection.vaultId, dir, { prune: doPull });
          await ensureGitignore(dir);
        }
        const result = await gitSyncCore(
          dir,
          connection.branch,
          gitCreds,
          (n) => formatCommitMessage(connection.commitTemplate, n),
          { pull: true, push: doPush }
        );
        pushed = result.pushedCommit ? 1 : 0;
        // Pull-only never re-exports the DB, so the working tree is exactly the remote's.
        if (doPull) await importDirToNotes(prisma, connection.vaultId, dir, null);
      }
    }

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
    const conflictFiles = err instanceof SyncConflictError ? err.files : null;
    await prisma.syncJob.update({
      where: { id: job.id },
      data: {
        status,
        errorMessage: message,
        finishedAt: new Date(),
        ...(conflictFiles ? { conflictFiles } : {}),
      },
    });
    await prisma.syncConnection.update({
      where: { id: connectionId },
      data: { lastSyncStatus: { status, error: message, ...(conflictFiles ? { conflictFiles } : {}) } },
    });
    throw err;
  }
}

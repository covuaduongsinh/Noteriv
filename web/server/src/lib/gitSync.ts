// Shells out to the `git` binary. Ports desktop/src-tauri/src/commands_git.rs's
// `git_sync` core (and its hard-won recovery logic) from Rust to Node — see that
// file for the full original comments on *why* each guard exists.
//
// Credentials never travel on the git command line: they are answered through a
// short-lived GIT_ASKPASS helper (see runGit), so a `ps` listing or git's own
// error text can't leak the token.

import { spawn } from "node:child_process";
import { writeFile, rm, mkdir, realpath } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

export interface GitCredentials {
  username: string;
  token: string;
}

interface GitRunResult {
  stdout: string;
  stderr: string;
  success: boolean;
}

/** Thrown when a pull/rebase hit conflicts; `files` lists the unmerged paths. */
export class SyncConflictError extends Error {
  constructor(message: string, public files: string[]) {
    super(message);
    this.name = "SyncConflictError";
  }
}

function shQuote(v: string): string {
  return `'${v.replace(/'/g, `'\\''`)}'`;
}

/** Builds the askpass script body: "Username…" prompts get the user, anything else the token. */
export function askpassBody(creds: GitCredentials, isWin: boolean): string {
  const user = creds.username || "oauth2";
  if (isWin) {
    return `@echo off\r\necho %~1| findstr /i "Username" >nul && (echo ${user}) || (echo ${creds.token})\r\n`;
  }
  return [
    "#!/bin/sh",
    'case "$1" in',
    `  *sername*) printf '%s\\n' ${shQuote(user)} ;;`,
    `  *) printf '%s\\n' ${shQuote(creds.token)} ;;`,
    "esac",
    "",
  ].join("\n");
}

function runGit(args: string[], cwd: string, creds?: GitCredentials | null, timeoutMs?: number): Promise<GitRunResult> {
  return new Promise((resolve) => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      GIT_SSH_COMMAND: "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new",
      GIT_TERMINAL_PROMPT: "0",
      SSH_ASKPASS: "",
    };

    // autocrlf=false: note content must round-trip byte-for-byte; a host git configured
    // with core.autocrlf=true (Windows) would otherwise rewrite line endings in the working copy.
    const fullArgs = [
      "-c", "credential.helper=",
      "-c", "core.askPass=",
      "-c", "credential.modalPrompt=false",
      "-c", "core.autocrlf=false",
      "-c", "core.safecrlf=false",
      ...args,
    ];

    const useCreds = !!creds?.token;
    if (useCreds && (/[\r\n]/.test(creds!.token) || /[\r\n]/.test(creds!.username ?? ""))) {
      resolve({ stdout: "", stderr: "credentials contain a line break", success: false });
      return;
    }

    let askpassFile: string | null = null;
    const isWin = process.platform === "win32";
    if (useCreds) {
      askpassFile = path.join(tmpdir(), `noteriv-askpass-${process.pid}-${randomBytes(6).toString("hex")}.${isWin ? "bat" : "sh"}`);
      env.GIT_ASKPASS = askpassFile;
    }

    const timeout = timeoutMs ?? (useCreds ? 60_000 : 30_000);

    const launch = async () => {
      if (askpassFile) {
        await writeFile(askpassFile, askpassBody(creds!, isWin), { mode: isWin ? undefined : 0o700 });
      }

      const child = spawn("git", fullArgs, { cwd, env });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => (stdout += d.toString()));
      child.stderr.on("data", (d) => (stderr += d.toString()));

      const timer = setTimeout(() => {
        child.kill();
        resolve({ stdout: "", stderr: `git command timed out after ${timeout / 1000}s`, success: false });
      }, timeout);

      child.on("close", async (code) => {
        clearTimeout(timer);
        if (askpassFile) await rm(askpassFile, { force: true }).catch(() => undefined);
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), success: code === 0 });
      });
      child.on("error", async (err) => {
        clearTimeout(timer);
        if (askpassFile) await rm(askpassFile, { force: true }).catch(() => undefined);
        resolve({ stdout: "", stderr: err.message, success: false });
      });
    };

    launch();
  });
}

function okOrThrow(r: GitRunResult): string {
  if (r.success) return r.stdout;
  throw new Error(r.stderr || "git command failed");
}

async function rebaseInProgress(dir: string): Promise<boolean> {
  const r = await runGit(["rev-parse", "--git-dir"], dir);
  const gitDir = r.success && r.stdout ? path.join(dir, r.stdout) : path.join(dir, ".git");
  return existsSync(path.join(gitDir, "rebase-merge")) || existsSync(path.join(gitDir, "rebase-apply"));
}

async function onBranch(dir: string): Promise<boolean> {
  return (await runGit(["symbolic-ref", "--quiet", "HEAD"], dir)).success;
}

/**
 * Converts an ssh:// or git@host:path remote to plain https. Credentials are NOT
 * embedded (they go through GIT_ASKPASS, see runGit). Remotes that are already
 * https, or local paths / file:// (used by tests), are returned unchanged.
 */
export function toHttpsUrl(remoteUrl: string): string {
  const scpMatch = remoteUrl.match(/^git@([^:]+):(.+)$/);
  if (scpMatch) return `https://${scpMatch[1]}/${scpMatch[2]}`;
  if (remoteUrl.startsWith("ssh://")) return "https://" + remoteUrl.slice("ssh://".length).replace(/^[^@]*@/, "");
  return remoteUrl;
}

/** The URL actually handed to git: normalised to https when we hold credentials. */
function effectiveUrl(remote: string, creds: GitCredentials | null): string {
  return creds?.token ? toHttpsUrl(remote) : remote;
}

export async function gitIsInstalled(): Promise<boolean> {
  return (await runGit(["--version"], process.cwd())).success;
}

/** Lightweight connectivity check — doesn't clone, just lists remote refs. */
export async function testGitRemote(
  remoteUrl: string,
  creds: GitCredentials | null
): Promise<{ ok: boolean; error?: string }> {
  // No --exit-code: a reachable but empty repo (no refs yet) exits 0 here, which is a
  // working connection; only network/auth failures exit non-zero.
  const r = await runGit(["ls-remote", effectiveUrl(remoteUrl, creds)], process.cwd(), creds, 20_000);
  return r.success ? { ok: true } : { ok: false, error: r.stderr || "could not reach remote" };
}

/**
 * True only if `dir` itself has a `.git` entry — i.e. it is a repo root, not merely
 * *inside* one. `git rev-parse --is-inside-work-tree` is NOT safe for this check: it
 * walks up to any ancestor `.git` and reports true from inside someone else's repo
 * (this bit a real incident during development — see syncRunner.ts's SCRATCH_ROOT
 * comment for why the scratch dir now also lives outside any repo as a second guard).
 */
function hasOwnGitDir(dir: string): boolean {
  return existsSync(path.join(dir, ".git"));
}

/**
 * Refuses to proceed unless `dir` really is its own repo's top level — the hard
 * backstop against ever running `add -A`/`commit`/`push` against an ancestor
 * repository (such as the Noteriv project's own working copy) if `ensureWorkingCopy`
 * was skipped or its detection was ever fooled again.
 */
async function assertIsOwnRepoRoot(dir: string): Promise<void> {
  const r = await runGit(["rev-parse", "--show-toplevel"], dir);
  if (!r.success) {
    throw new Error(`refusing to sync: "${dir}" is not a git repo at all.`);
  }
  // realpath canonicalizes both Windows short-form (DUONGS~1) vs long-form
  // (duongsinh) path segments and symlinks, which raw string comparison
  // doesn't — a naive compare false-positived on exactly this during testing.
  const [resolvedDir, toplevel] = await Promise.all([
    realpath(dir).catch(() => path.resolve(dir)),
    realpath(r.stdout).catch(() => path.resolve(r.stdout)),
  ]);
  const normalize = (p: string) => p.replace(/\\/g, "/").toLowerCase();
  if (normalize(resolvedDir) !== normalize(toplevel)) {
    throw new Error(
      `refusing to sync: "${dir}" is not its own git repo root (found top-level "${r.stdout}"). ` +
        "This guards against ever running git commands against the wrong repository."
    );
  }
}

/** Clones the repo into `dir` if it isn't already a git working copy there. */
export async function ensureWorkingCopy(
  dir: string,
  remoteUrl: string,
  branch: string,
  creds: GitCredentials | null
): Promise<void> {
  await mkdir(dir, { recursive: true });
  if (hasOwnGitDir(dir)) {
    const existing = await runGit(["remote", "get-url", "origin"], dir);
    if (!existing.success) {
      okOrThrow(await runGit(["remote", "add", "origin", remoteUrl], dir));
    } else if (existing.stdout !== remoteUrl) {
      okOrThrow(await runGit(["remote", "set-url", "origin", remoteUrl], dir));
    }
    return;
  }

  okOrThrow(await runGit(["init"], dir));
  okOrThrow(await runGit(["remote", "add", "origin", remoteUrl], dir));
  okOrThrow(await runGit(["checkout", "-b", branch], dir));

  // Try to fetch+checkout the branch if it already exists on the remote (repo
  // isn't necessarily empty — the user may be connecting an existing vault).
  const fetch = await runGit(["fetch", effectiveUrl(remoteUrl, creds), branch], dir, creds);
  if (fetch.success) {
    okOrThrow(await runGit(["checkout", "-B", branch, "FETCH_HEAD"], dir));
  }
}

const DEFAULT_GITIGNORE = [".DS_Store", "Thumbs.db", ".trash/", "*.tmp", ""].join("\n");

/** Writes desktop's default .gitignore if the working copy has none. */
export async function ensureGitignore(dir: string): Promise<void> {
  const file = path.join(dir, ".gitignore");
  if (!existsSync(file)) await writeFile(file, DEFAULT_GITIGNORE, "utf8");
}

export interface GitSyncOptions {
  /**
   * Fetch + rebase remote changes into the working copy (default true). A push-only
   * connection still needs this at the git level (a push is rejected if the remote moved
   * ahead); "push-only" only means remote changes are never imported into the vault.
   */
  pull?: boolean;
  /** Commit local changes and push them (default true). */
  push?: boolean;
}

export interface GitSyncResult {
  pushedCommit: boolean;
}

/**
 * Core sync cycle: recover from a half-finished rebase, stash local changes,
 * fetch+rebase-pull, detect and bail cleanly on conflicts, commit, push.
 * Assumes `dir` already has the vault's current state materialized onto disk
 * (the caller exports DB notes into `dir` before calling this).
 */
export async function gitSyncCore(
  dir: string,
  branch: string,
  creds: GitCredentials | null,
  message: string | ((changedCount: number) => string),
  opts: GitSyncOptions = {}
): Promise<GitSyncResult> {
  const doPull = opts.pull !== false;
  const doPush = opts.push !== false;

  await assertIsOwnRepoRoot(dir);

  if (await rebaseInProgress(dir)) {
    await runGit(["rebase", "--abort"], dir);
  }

  const remoteR = await runGit(["remote", "get-url", "origin"], dir);
  const remote = remoteR.success ? remoteR.stdout : null;

  if (remote && doPull) {
    const pullUrl = effectiveUrl(remote, creds);
    const hasChanges = await runGit(["status", "--porcelain"], dir);
    const needsStash = hasChanges.success && hasChanges.stdout.length > 0;
    if (needsStash) {
      await runGit(["stash", "push", "-m", "noteriv-sync-stash"], dir);
    }

    await runGit(["fetch", pullUrl], dir, creds);
    const pull = await runGit(["pull", "--rebase", pullUrl, branch], dir, creds);

    if (!pull.success && (await rebaseInProgress(dir))) {
      const unmerged = await runGit(["diff", "--name-only", "--diff-filter=U"], dir);
      const files = unmerged.success ? unmerged.stdout.split("\n").map((l) => l.trim()).filter(Boolean) : [];
      await runGit(["rebase", "--abort"], dir);
      if (needsStash) await runGit(["stash", "pop"], dir);
      throw new SyncConflictError(
        `Sync paused: remote changes conflict with local edits and need manual resolution. ${pull.stderr}`,
        files
      );
    }

    if (needsStash) {
      await runGit(["stash", "pop"], dir);
    }
  }

  if (!(await onBranch(dir))) {
    throw new Error("Sync paused: repository is in a detached HEAD state and needs manual attention.");
  }

  let pushedCommit = false;
  if (doPush) {
    okOrThrow(await runGit(["add", "-A"], dir));
    const status = await runGit(["status", "--porcelain"], dir);
    if (status.success && status.stdout.length > 0) {
      const changed = status.stdout.split("\n").filter(Boolean).length;
      okOrThrow(await runGit(["commit", "-m", typeof message === "function" ? message(changed) : message], dir));
      pushedCommit = true;
    }

    if (remote) {
      const push = await runGit(["push", "-u", effectiveUrl(remote, creds), branch], dir, creds);
      if (!push.success) {
        // Unreachable host, bad credentials, and non-fast-forward rejections all land
        // here — this result was previously discarded entirely, which is how a sync
        // job against a nonexistent remote + fake token could still report "success".
        const rejected = /\[rejected\]|non-fast-forward|fetch first|stale info/i.test(push.stderr);
        throw new Error(
          rejected
            ? `Sync paused: remote has changes that weren't merged locally; push was rejected. ${push.stderr}`
            : `Sync failed: could not push to remote. ${push.stderr || "unknown git push error"}`
        );
      }
    }
  }

  return { pushedCommit };
}

/**
 * Conflict resolution helper: moves the working copy's branch to the remote tip.
 *  - "hard"  : working tree becomes the remote's content (caller then imports it
 *              into the DB — "take remote").
 *  - "mixed" : branch moves to the remote tip but the working tree keeps what the
 *              caller already exported from the DB, so the next add/commit/push is a
 *              plain fast-forward carrying the web's content ("keep web"). No force push.
 */
export async function adoptRemoteTip(
  dir: string,
  remote: string,
  branch: string,
  creds: GitCredentials | null,
  mode: "hard" | "mixed"
): Promise<void> {
  await assertIsOwnRepoRoot(dir);
  if (await rebaseInProgress(dir)) await runGit(["rebase", "--abort"], dir);
  okOrThrow(await runGit(["fetch", effectiveUrl(remote, creds), branch], dir, creds));
  okOrThrow(await runGit(["reset", mode === "hard" ? "--hard" : "--mixed", "FETCH_HEAD"], dir));
}

export interface RemoteState {
  /** Remote tip differs from what the working copy last saw. */
  remoteChanged: boolean;
  remoteReachable: boolean;
  error?: string;
}

/** Cheap "is there something new on the remote?" check — one ls-remote, no fetch. */
export async function getRemoteState(
  dir: string,
  remoteUrl: string,
  branch: string,
  creds: GitCredentials | null
): Promise<RemoteState> {
  const ls = await runGit(["ls-remote", effectiveUrl(remoteUrl, creds), `refs/heads/${branch}`], process.cwd(), creds, 20_000);
  if (!ls.success) return { remoteChanged: false, remoteReachable: false, error: ls.stderr || "could not reach remote" };
  const remoteSha = ls.stdout.split(/\s+/)[0] ?? "";
  if (!hasOwnGitDir(dir)) return { remoteChanged: !!remoteSha, remoteReachable: true };
  const local = await runGit(["rev-parse", "HEAD"], dir);
  const localSha = local.success ? local.stdout : "";
  return { remoteChanged: !!remoteSha && remoteSha !== localSha, remoteReachable: true };
}

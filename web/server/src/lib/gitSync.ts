// Shells out to the `git` binary. Ports desktop/src-tauri/src/commands_git.rs's
// `git_sync` core (and its hard-won recovery logic) from Rust to Node — see that
// file for the full original comments on *why* each guard exists.

import { spawn } from "node:child_process";
import { writeFile, rm, mkdir, realpath } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

interface GitRunResult {
  stdout: string;
  stderr: string;
  success: boolean;
}

function runGit(args: string[], cwd: string, token?: string, timeoutMs?: number): Promise<GitRunResult> {
  return new Promise((resolve) => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      GIT_SSH_COMMAND: "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new",
      GIT_TERMINAL_PROMPT: "0",
      SSH_ASKPASS: "",
    };

    const fullArgs = ["-c", "credential.helper=", "-c", "core.askPass=", "-c", "credential.modalPrompt=false", ...args];

    let askpassFile: string | null = null;
    if (token) {
      const isWin = process.platform === "win32";
      askpassFile = path.join(tmpdir(), `noteriv-askpass-${process.pid}-${Date.now()}.${isWin ? "bat" : "sh"}`);
      env.GIT_ASKPASS = askpassFile;
    }

    const timeout = timeoutMs ?? (token ? 60_000 : 30_000);

    const launch = async () => {
      if (askpassFile) {
        const isWin = process.platform === "win32";
        const body = isWin ? `@echo ${token}\r\n` : `#!/bin/sh\necho "${token}"\n`;
        await writeFile(askpassFile, body, { mode: isWin ? undefined : 0o700 });
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

async function currentBranch(dir: string): Promise<string> {
  let r = await runGit(["branch", "--show-current"], dir);
  if (r.success && r.stdout) return r.stdout;
  r = await runGit(["symbolic-ref", "--short", "HEAD"], dir);
  if (r.success && r.stdout) return r.stdout;
  r = await runGit(["remote", "show", "origin"], dir);
  if (r.success) {
    for (const line of r.stdout.split("\n")) {
      const m = line.trim().match(/^HEAD branch:\s*(.+)$/);
      if (m) return m[1].trim();
    }
  }
  return "main";
}

/** Converts an ssh:// or git@host:path remote to https, then embeds username:token. */
export function makeAuthUrl(remoteUrl: string, username: string, token: string): string {
  if (!token) return remoteUrl;
  let working = remoteUrl;
  const scpMatch = remoteUrl.match(/^git@([^:]+):(.+)$/);
  if (scpMatch) working = `https://${scpMatch[1]}/${scpMatch[2]}`;
  else if (remoteUrl.startsWith("ssh://")) working = "https://" + remoteUrl.slice("ssh://".length).replace(/^[^@]*@/, "");

  try {
    const url = new URL(working);
    if (url.protocol === "https:") {
      url.username = username || "oauth2";
      url.password = token;
      return url.toString();
    }
  } catch {
    // fall through
  }
  return remoteUrl;
}

export async function gitIsInstalled(): Promise<boolean> {
  return (await runGit(["--version"], process.cwd())).success;
}

/** Lightweight connectivity check — doesn't clone, just lists remote refs. */
export async function testGitRemote(
  remoteUrl: string,
  creds: GitCredentials | null
): Promise<{ ok: boolean; error?: string }> {
  const url = creds ? makeAuthUrl(remoteUrl, creds.username, creds.token) : remoteUrl;
  const r = await runGit(["ls-remote", "--exit-code", url, "HEAD"], process.cwd(), creds?.token, 20_000);
  return r.success ? { ok: true } : { ok: false, error: r.stderr || "could not reach remote" };
}

export interface GitCredentials {
  username: string;
  token: string;
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
  const fetchUrl = creds ? makeAuthUrl(remoteUrl, creds.username, creds.token) : remoteUrl;
  const fetch = await runGit(["fetch", fetchUrl, branch], dir, creds?.token);
  if (fetch.success) {
    okOrThrow(await runGit(["checkout", "-B", branch, "FETCH_HEAD"], dir));
  }
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
  message: string
): Promise<GitSyncResult> {
  await assertIsOwnRepoRoot(dir);

  if (await rebaseInProgress(dir)) {
    await runGit(["rebase", "--abort"], dir);
  }

  const remoteR = await runGit(["remote", "get-url", "origin"], dir);
  const remote = remoteR.success ? remoteR.stdout : null;

  if (remote) {
    const pullUrl = creds ? makeAuthUrl(remote, creds.username, creds.token) : "origin";
    const hasChanges = await runGit(["status", "--porcelain"], dir);
    const needsStash = hasChanges.success && hasChanges.stdout.length > 0;
    if (needsStash) {
      await runGit(["stash", "push", "-m", "noteriv-sync-stash"], dir);
    }

    await runGit(["fetch", pullUrl], dir, creds?.token);
    const pull = await runGit(["pull", "--rebase", pullUrl, branch], dir, creds?.token);

    if (!pull.success && (await rebaseInProgress(dir))) {
      await runGit(["rebase", "--abort"], dir);
      if (needsStash) await runGit(["stash", "pop"], dir);
      throw new Error(
        `Sync paused: remote changes conflict with local edits and need manual resolution. ${pull.stderr}`
      );
    }

    if (needsStash) {
      await runGit(["stash", "pop"], dir);
    }
  }

  if (!(await onBranch(dir))) {
    throw new Error("Sync paused: repository is in a detached HEAD state and needs manual attention.");
  }

  okOrThrow(await runGit(["add", "-A"], dir));
  let pushedCommit = false;
  const status = await runGit(["status", "--porcelain"], dir);
  if (status.success && status.stdout.length > 0) {
    okOrThrow(await runGit(["commit", "-m", message], dir));
    pushedCommit = true;
  }

  if (remote) {
    const pushUrl = creds ? makeAuthUrl(remote, creds.username, creds.token) : "origin";
    await runGit(["push", "-u", pushUrl, branch], dir, creds?.token);
  }

  return { pushedCommit };
}

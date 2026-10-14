// Shells out to the `git` binary. Mirrors desktop/main/sync/git.js exactly.

use crate::auth::credentials_for_vault;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;

#[derive(Debug, Serialize, Default)]
pub struct GitStatus {
    #[serde(rename = "isRepo")]
    pub is_repo: bool,
    pub changes: usize,
    pub branch: Option<String>,
    pub remote: Option<String>,
    pub ahead: usize,
    pub behind: usize,
}

#[derive(Debug, Serialize)]
pub struct GitLogEntry {
    pub hash: String,
    pub author: String,
    pub date: String,
    pub message: String,
}

struct GitRunResult {
    stdout: String,
    success: bool,
    stderr: String,
}

/// Run `git <args>` in `cwd`. If `token` is given, uses GIT_ASKPASS so push/pull/clone
/// can authenticate over HTTPS without leaking the token to the URL or process tree.
fn run_git(args: &[&str], cwd: &Path, token: Option<&str>) -> GitRunResult {
    let mut cmd = Command::new("git");

    // On Windows, a spawned console-subsystem process (git.exe) briefly flashes
    // a visible cmd window unless told not to create one. Auto-sync runs this
    // every few seconds, so without this flag the user sees a black window
    // flicker on a loop. CREATE_NO_WINDOW = 0x08000000.
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000);
    }

    // Disable every credential helper (libsecret, manager, store, gnome-keyring,
    // etc.) and any custom askpass for THIS invocation. We pass auth via
    // GIT_ASKPASS + URL when we have a token; if we don't, git must fail fast
    // instead of popping the system credential helper's GUI prompt.
    cmd.args(&["-c", "credential.helper="]);
    cmd.args(&["-c", "core.askPass="]);
    cmd.args(&["-c", "credential.modalPrompt=false"]);
    cmd.args(args).current_dir(cwd);

    let mut env_overrides: Vec<(String, String)> = Vec::new();
    let mut askpass_to_clean: Option<PathBuf> = None;

    // Disable interactive SSH/terminal prompts. Also blank SSH_ASKPASS so any
    // SSH-based fallback can't pop ssh-askpass either.
    cmd.env(
        "GIT_SSH_COMMAND",
        "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new",
    );
    cmd.env("GIT_TERMINAL_PROMPT", "0");
    cmd.env("SSH_ASKPASS", "");
    cmd.env("DISPLAY", std::env::var("DISPLAY").unwrap_or_default());
    // Some GNOME setups inject `seahorse` as the default SSH askpass; clear it.
    cmd.env_remove("SSH_ASKPASS_REQUIRE");

    if let Some(t) = token {
        let pid = std::process::id();
        let tmp = env::temp_dir();
        let is_win = cfg!(target_os = "windows");
        let askpass = if is_win {
            tmp.join(format!("noteriv-askpass-{pid}.bat"))
        } else {
            tmp.join(format!("noteriv-askpass-{pid}.sh"))
        };

        let body = if is_win {
            format!("@echo {t}\r\n")
        } else {
            format!("#!/bin/sh\necho \"{t}\"\n")
        };
        if fs::write(&askpass, body).is_ok() {
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                let _ = fs::set_permissions(&askpass, fs::Permissions::from_mode(0o700));
            }
            env_overrides.push(("GIT_ASKPASS".into(), askpass.to_string_lossy().into_owned()));
            env_overrides.push(("GIT_TERMINAL_PROMPT".into(), "0".into()));
            askpass_to_clean = Some(askpass);
        }
    }

    for (k, v) in &env_overrides {
        cmd.env(k, v);
    }

    let timeout = if token.is_some() {
        Duration::from_secs(60)
    } else {
        Duration::from_secs(30)
    };

    let result = run_with_timeout(cmd, timeout);

    if let Some(p) = askpass_to_clean {
        let _ = fs::remove_file(p);
    }

    result
}

fn run_with_timeout(mut cmd: Command, timeout: Duration) -> GitRunResult {
    use std::io::Read;
    use std::process::Stdio;
    use wait_timeout::ChildExt;

    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
    let mut child = match cmd.spawn() {
        Ok(c) => c,
        Err(e) => {
            return GitRunResult {
                stdout: String::new(),
                stderr: e.to_string(),
                success: false,
            }
        }
    };

    let status = match child.wait_timeout(timeout) {
        Ok(Some(s)) => s,
        Ok(None) => {
            // Timed out — kill it.
            let _ = child.kill();
            let _ = child.wait();
            return GitRunResult {
                stdout: String::new(),
                stderr: format!("git command timed out after {}s", timeout.as_secs()),
                success: false,
            };
        }
        Err(e) => {
            let _ = child.kill();
            let _ = child.wait();
            return GitRunResult {
                stdout: String::new(),
                stderr: e.to_string(),
                success: false,
            };
        }
    };

    let mut stdout = String::new();
    let mut stderr = String::new();
    if let Some(mut s) = child.stdout.take() {
        let _ = s.read_to_string(&mut stdout);
    }
    if let Some(mut s) = child.stderr.take() {
        let _ = s.read_to_string(&mut stderr);
    }

    GitRunResult {
        stdout: stdout.trim().to_string(),
        stderr: stderr.trim().to_string(),
        success: status.success(),
    }
}

fn ok_or_err(r: GitRunResult) -> Result<String, String> {
    if r.success {
        Ok(r.stdout)
    } else {
        Err(if r.stderr.is_empty() {
            "git command failed".into()
        } else {
            r.stderr
        })
    }
}

/// True if a rebase (interactive or `am`-style) is currently in progress in `dir`.
/// A half-finished rebase leaves HEAD detached; committing on top of it is how
/// auto-sync used to silently wedge a repo (local "Sync" commits pile up forever
/// while every push fails), so sync must detect and recover from it.
fn rebase_in_progress(dir: &Path) -> bool {
    let git_dir = {
        let r = run_git(&["rev-parse", "--git-dir"], dir, None);
        if r.success && !r.stdout.is_empty() {
            dir.join(r.stdout)
        } else {
            dir.join(".git")
        }
    };
    git_dir.join("rebase-merge").exists() || git_dir.join("rebase-apply").exists()
}

/// True when HEAD is attached to a branch (not detached / mid-rebase).
fn on_branch(dir: &Path) -> bool {
    run_git(&["symbolic-ref", "--quiet", "HEAD"], dir, None).success
}

/// True only if `dir` itself has a `.git` entry — i.e. it is a repo root, not
/// merely *inside* one. `git rev-parse --is-inside-work-tree` is NOT safe for
/// this: it walks up to any ancestor `.git` and reports true from inside
/// someone else's repo. (Mirrors `hasOwnGitDir` in web/server/src/lib/gitSync.ts,
/// added there after a real incident where this exact check let a sync job
/// run `git add -A`/commit/push against an unrelated ancestor repository.)
fn has_own_git_dir(dir: &Path) -> bool {
    dir.join(".git").exists()
}

/// Refuses to proceed unless `dir` really is its own repo's top level — the
/// hard backstop against ever running `add -A`/commit/push against an
/// ancestor repository. Ported from web's `assertIsOwnRepoRoot` (see that
/// function's comment for the full incident writeup); desktop runs git
/// directly on the user's real vault folder with no scratch-dir buffer, so a
/// false positive here is worse than it was on web, not just equally bad.
fn assert_is_own_repo_root(dir: &Path) -> Result<(), String> {
    let r = run_git(&["rev-parse", "--show-toplevel"], dir, None);
    if !r.success {
        return Err(format!("refusing to sync: \"{}\" is not a git repo at all.", dir.display()));
    }
    // canonicalize (via `dunce`, already used elsewhere in this file) resolves
    // Windows short-form vs long-form path segments and symlinks, which a raw
    // string compare doesn't — a naive compare false-positived on exactly this
    // during the equivalent web fix's testing.
    let resolved_dir = dunce::canonicalize(dir).unwrap_or_else(|_| dir.to_path_buf());
    let toplevel = dunce::canonicalize(Path::new(&r.stdout)).unwrap_or_else(|_| PathBuf::from(&r.stdout));
    let normalize = |p: &Path| p.to_string_lossy().replace('\\', "/").to_lowercase();
    if normalize(&resolved_dir) != normalize(&toplevel) {
        return Err(format!(
            "refusing to sync: \"{}\" is not its own git repo root (found top-level \"{}\"). \
             This guards against ever running git commands against the wrong repository.",
            dir.display(),
            r.stdout
        ));
    }
    Ok(())
}

fn current_branch(dir: &Path) -> String {
    let r = run_git(&["branch", "--show-current"], dir, None);
    if r.success && !r.stdout.is_empty() {
        return r.stdout;
    }
    let r = run_git(&["symbolic-ref", "--short", "HEAD"], dir, None);
    if r.success && !r.stdout.is_empty() {
        return r.stdout;
    }
    let r = run_git(&["remote", "show", "origin"], dir, None);
    if r.success {
        for line in r.stdout.lines() {
            if let Some(rest) = line.trim().strip_prefix("HEAD branch:") {
                return rest.trim().to_string();
            }
        }
    }
    "main".into()
}

#[tauri::command]
pub async fn git_is_installed() -> bool {
    run_git(&["--version"], &env::current_dir().unwrap_or(PathBuf::from(".")), None).success
}

#[tauri::command]
pub async fn git_is_repo(dir: String) -> bool {
    run_git(&["rev-parse", "--is-inside-work-tree"], Path::new(&dir), None).success
}

#[tauri::command]
pub async fn git_init(dir: String) -> Result<bool, String> {
    let p = Path::new(&dir);
    // `has_own_git_dir`, not `is-inside-work-tree` — the latter is true from
    // inside any ancestor repo, which would make git_init silently skip
    // creating `dir`'s own `.git` whenever the vault folder happens to be
    // nested inside some unrelated repo, leaving later git_sync calls with no
    // repo root of their own to find.
    let already = has_own_git_dir(p);
    if !already {
        let r = run_git(&["init"], p, None);
        if !r.success {
            return Err(r.stderr);
        }
    }
    let gi = p.join(".gitignore");
    if !gi.exists() {
        let _ = fs::write(&gi, ".DS_Store\nThumbs.db\n.trash/\n*.tmp\n");
    }
    Ok(true)
}

#[derive(Debug, Deserialize)]
pub struct SetRemoteInput {
    pub dir: String,
    pub url: String,
}

#[tauri::command]
pub async fn git_set_remote(args: SetRemoteInput) -> Result<bool, String> {
    let p = Path::new(&args.dir);
    let existing = run_git(&["remote", "get-url", "origin"], p, None);
    if existing.success {
        if existing.stdout != args.url {
            ok_or_err(run_git(&["remote", "set-url", "origin", &args.url], p, None))?;
        }
    } else {
        ok_or_err(run_git(&["remote", "add", "origin", &args.url], p, None))?;
    }
    Ok(true)
}

#[tauri::command]
pub async fn git_status(dir: String) -> GitStatus {
    let p = Path::new(&dir);
    let is_repo = run_git(&["rev-parse", "--is-inside-work-tree"], p, None).success;
    if !is_repo {
        return GitStatus::default();
    }
    let branch = current_branch(p);
    let remote_r = run_git(&["remote", "get-url", "origin"], p, None);
    let remote = if remote_r.success {
        Some(remote_r.stdout.clone())
    } else {
        None
    };
    let status_out = run_git(&["status", "--porcelain"], p, None);
    let changes = if status_out.success && !status_out.stdout.is_empty() {
        status_out.stdout.lines().filter(|l| !l.is_empty()).count()
    } else {
        0
    };
    let mut ahead = 0usize;
    let mut behind = 0usize;
    if remote.is_some() {
        let a = run_git(
            &["rev-list", "--count", &format!("origin/{branch}..HEAD")],
            p,
            None,
        );
        if a.success {
            ahead = a.stdout.parse().unwrap_or(0);
        }
        let b = run_git(
            &["rev-list", "--count", &format!("HEAD..origin/{branch}")],
            p,
            None,
        );
        if b.success {
            behind = b.stdout.parse().unwrap_or(0);
        }
    }
    GitStatus {
        is_repo: true,
        changes,
        branch: Some(branch),
        remote,
        ahead,
        behind,
    }
}

#[derive(Debug, Deserialize)]
pub struct GitSyncInput {
    pub dir: String,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(rename = "vaultId", default)]
    pub vault_id: Option<String>,
}

#[tauri::command]
pub async fn git_sync(args: GitSyncInput) -> Result<bool, String> {
    let p = Path::new(&args.dir);
    assert_is_own_repo_root(p)?;
    let creds = credentials_for_vault(args.vault_id.as_deref());
    let token_ref = creds.as_ref().map(|c| c.token.as_str());

    let msg = args.message.unwrap_or_else(|| {
        format!("Sync notes {}", Utc::now().format("%Y-%m-%d"))
    });

    let branch = current_branch(p);
    let remote_r = run_git(&["remote", "get-url", "origin"], p, None);
    let remote = if remote_r.success {
        Some(remote_r.stdout.clone())
    } else {
        None
    };

    // Recover from a rebase a previous sync (or a crash) left half-finished.
    // Without this, the add/commit below would stack commits onto a detached
    // HEAD and the repo would silently stop syncing. Abort so we resume clean.
    if rebase_in_progress(p) {
        let _ = run_git(&["rebase", "--abort"], p, None);
    }

    if let Some(r) = remote.as_deref() {
        let pull_url = match &creds {
            Some(c) => c.auth_url(r),
            None => "origin".into(),
        };
        let has_changes = run_git(&["status", "--porcelain"], p, None);
        let needs_stash = has_changes.success && !has_changes.stdout.is_empty();
        if needs_stash {
            let _ = run_git(&["stash", "push", "-m", "noteriv-sync-stash"], p, None);
        }
        let _ = run_git(&["fetch", &pull_url], p, token_ref);
        let pull = run_git(&["pull", "--rebase", &pull_url, &branch], p, token_ref);
        // A conflicting rebase stops mid-way and leaves HEAD detached. Don't
        // commit on top of it: abort, restore the stash, and surface the
        // conflict so the user knows sync needs manual attention.
        if !pull.success && rebase_in_progress(p) {
            let _ = run_git(&["rebase", "--abort"], p, None);
            if needs_stash {
                let _ = run_git(&["stash", "pop"], p, None);
            }
            return Err(format!(
                "Sync paused: remote changes conflict with local edits and need manual resolution. {}",
                pull.stderr
            ));
        }
        if needs_stash {
            let _ = run_git(&["stash", "pop"], p, None);
        }
    }

    // Never commit/push from a detached HEAD: current_branch() guesses a branch
    // name when detached, so an unguarded push would target the wrong ref and
    // silently no-op while local commits accumulate. Bail and surface it.
    if !on_branch(p) {
        return Err(
            "Sync paused: repository is in a detached HEAD state and needs manual attention.".into(),
        );
    }

    ok_or_err(run_git(&["add", "-A"], p, None))?;
    let st = run_git(&["status", "--porcelain"], p, None);
    if st.success && !st.stdout.is_empty() {
        ok_or_err(run_git(&["commit", "-m", &msg], p, None))?;
    }
    if let Some(r) = remote.as_deref() {
        let push_url = match &creds {
            Some(c) => c.auth_url(r),
            None => "origin".into(),
        };
        let push = run_git(&["push", "-u", &push_url, &branch], p, token_ref);
        if !push.success {
            // Unreachable host, bad credentials, and non-fast-forward rejections
            // all land here — this result used to be discarded entirely, which
            // is how a sync against a bad remote/credentials could still return
            // Ok(true) and report success to the UI.
            let rejected = push.stderr.contains("[rejected]")
                || push.stderr.to_lowercase().contains("non-fast-forward")
                || push.stderr.to_lowercase().contains("fetch first")
                || push.stderr.to_lowercase().contains("stale info");
            return Err(if rejected {
                format!(
                    "Sync paused: remote has changes that weren't merged locally; push was rejected. {}",
                    push.stderr
                )
            } else {
                format!(
                    "Sync failed: could not push to remote. {}",
                    if push.stderr.is_empty() { "unknown git push error" } else { &push.stderr }
                )
            });
        }
    }
    Ok(true)
}

#[derive(Debug, Deserialize)]
pub struct GitDirVaultInput {
    pub dir: String,
    #[serde(rename = "vaultId", default)]
    pub vault_id: Option<String>,
}

#[tauri::command]
pub async fn git_pull(args: GitDirVaultInput) -> Result<bool, String> {
    let p = Path::new(&args.dir);
    let creds = credentials_for_vault(args.vault_id.as_deref());
    let branch = current_branch(p);
    let has_changes = run_git(&["status", "--porcelain"], p, None);
    let needs_stash = has_changes.success && !has_changes.stdout.is_empty();
    if needs_stash {
        ok_or_err(run_git(&["stash", "push", "-m", "noteriv-pull-stash"], p, None))?;
    }
    let result = if let Some(c) = creds.as_ref() {
        let remote = ok_or_err(run_git(&["remote", "get-url", "origin"], p, None))?;
        let auth = c.auth_url(&remote);
        run_git(&["pull", &auth, &branch, "--rebase"], p, Some(&c.token))
    } else {
        run_git(&["pull", "origin", &branch, "--rebase"], p, None)
    };
    if needs_stash {
        let _ = run_git(&["stash", "pop"], p, None);
    }
    if !result.success {
        return Err(result.stderr);
    }
    Ok(true)
}

#[tauri::command]
pub async fn git_fetch(args: GitDirVaultInput) -> Result<bool, String> {
    let p = Path::new(&args.dir);
    let creds = credentials_for_vault(args.vault_id.as_deref());
    let res = if let Some(c) = creds.as_ref() {
        let remote = ok_or_err(run_git(&["remote", "get-url", "origin"], p, None))?;
        let auth = c.auth_url(&remote);
        run_git(&["fetch", &auth], p, Some(&c.token))
    } else {
        run_git(&["fetch", "origin"], p, None)
    };
    if !res.success {
        return Err(res.stderr);
    }
    Ok(true)
}

#[derive(Debug, Deserialize)]
pub struct GitLogInput {
    pub dir: String,
    #[serde(default)]
    pub count: Option<u32>,
}

#[tauri::command]
pub async fn git_log(args: GitLogInput) -> Vec<GitLogEntry> {
    let p = Path::new(&args.dir);
    let count = args.count.unwrap_or(20);
    let r = run_git(
        &[
            "log",
            &format!("--max-count={count}"),
            "--pretty=format:%H||%an||%ar||%s",
        ],
        p,
        None,
    );
    if !r.success || r.stdout.is_empty() {
        return Vec::new();
    }
    r.stdout
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(4, "||").collect();
            if parts.len() == 4 {
                Some(GitLogEntry {
                    hash: parts[0].into(),
                    author: parts[1].into(),
                    date: parts[2].into(),
                    message: parts[3].into(),
                })
            } else {
                None
            }
        })
        .collect()
}

#[derive(Debug, Deserialize)]
pub struct GitCloneInput {
    pub url: String,
    pub dir: String,
    #[serde(rename = "vaultId", default)]
    pub vault_id: Option<String>,
}

#[tauri::command]
pub async fn git_clone(args: GitCloneInput) -> Result<bool, String> {
    let target = PathBuf::from(&args.dir);
    let parent = target
        .parent()
        .ok_or_else(|| "invalid clone target".to_string())?;
    let folder_name = target
        .file_name()
        .map(|s| s.to_string_lossy().into_owned())
        .ok_or_else(|| "invalid clone target name".to_string())?;
    let _ = fs::create_dir_all(parent);

    let creds = credentials_for_vault(args.vault_id.as_deref());
    if let Some(c) = creds.as_ref() {
        let auth = c.auth_url(&args.url);
        ok_or_err(run_git(&["clone", &auth, &folder_name], parent, Some(&c.token)))?;
        ok_or_err(run_git(
            &["remote", "set-url", "origin", &args.url],
            &target,
            None,
        ))?;
    } else {
        ok_or_err(run_git(&["clone", &args.url, &folder_name], parent, None))?;
    }
    Ok(true)
}

#[derive(Debug, Deserialize)]
pub struct GitFileLogInput {
    pub dir: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
}

fn relative_unix(dir: &Path, file: &Path) -> String {
    pathdiff(dir, file).replace('\\', "/")
}

fn pathdiff(base: &Path, target: &Path) -> String {
    // Best-effort relative path; falls back to the absolute target.
    let a = dunce::canonicalize(base).unwrap_or_else(|_| base.to_path_buf());
    let b = dunce::canonicalize(target).unwrap_or_else(|_| target.to_path_buf());
    let stripped = b.strip_prefix(&a).ok();
    match stripped {
        Some(p) => p.to_string_lossy().into_owned(),
        None => target.to_string_lossy().into_owned(),
    }
}

#[tauri::command]
pub async fn git_file_log(args: GitFileLogInput) -> Vec<GitLogEntry> {
    let p = Path::new(&args.dir);
    let rel = relative_unix(Path::new(&args.dir), Path::new(&args.file_path));
    let r = run_git(
        &[
            "log",
            "--follow",
            "--pretty=format:%H|%an|%ad|%s",
            "--",
            &rel,
        ],
        p,
        None,
    );
    if !r.success || r.stdout.is_empty() {
        return Vec::new();
    }
    r.stdout
        .lines()
        .filter_map(|line| {
            let parts: Vec<&str> = line.splitn(4, '|').collect();
            if parts.len() == 4 {
                Some(GitLogEntry {
                    hash: parts[0].into(),
                    author: parts[1].into(),
                    date: parts[2].into(),
                    message: parts[3].into(),
                })
            } else {
                None
            }
        })
        .collect()
}

#[derive(Debug, Deserialize)]
pub struct GitShowFileInput {
    pub dir: String,
    #[serde(rename = "filePath")]
    pub file_path: String,
    pub hash: String,
}

#[tauri::command]
pub async fn git_show_file(args: GitShowFileInput) -> Option<String> {
    let p = Path::new(&args.dir);
    let rel = relative_unix(Path::new(&args.dir), Path::new(&args.file_path));
    let r = run_git(&["show", &format!("{}:{}", args.hash, rel)], p, None);
    if r.success {
        Some(r.stdout)
    } else {
        None
    }
}

#[cfg(test)]
mod repo_root_tests {
    use super::*;
    use std::fs;
    use std::process::Command;

    /// A throwaway directory under the OS temp dir, removed on drop. Mirrors
    /// the web fix's test fixtures (never nested inside this project's own
    /// working tree — exactly the mistake this whole fix exists to catch).
    struct TempDir(PathBuf);
    impl TempDir {
        fn new(label: &str) -> Self {
            let unique = format!(
                "noteriv-git-test-{label}-{}-{}",
                std::process::id(),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            );
            let p = env::temp_dir().join(unique);
            fs::create_dir_all(&p).unwrap();
            TempDir(p)
        }
        fn path(&self) -> &Path {
            &self.0
        }
    }
    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }

    fn git(dir: &Path, args: &[&str]) {
        let status = Command::new("git")
            .args(args)
            .current_dir(dir)
            .status()
            .expect("git fixture command failed to spawn");
        assert!(status.success(), "git {:?} failed in {:?}", args, dir);
    }

    fn init_repo_with_commit(dir: &Path) {
        git(dir, &["init", "-q"]);
        git(dir, &["config", "user.email", "test@example.com"]);
        git(dir, &["config", "user.name", "Test"]);
        fs::write(dir.join("note.md"), "hello").unwrap();
        git(dir, &["add", "-A"]);
        git(dir, &["commit", "-q", "-m", "initial"]);
    }

    #[test]
    fn has_own_git_dir_false_for_plain_folder() {
        let t = TempDir::new("plain");
        assert!(!has_own_git_dir(t.path()));
    }

    #[test]
    fn has_own_git_dir_true_after_init() {
        let t = TempDir::new("inited");
        init_repo_with_commit(t.path());
        assert!(has_own_git_dir(t.path()));
    }

    #[test]
    fn assert_is_own_repo_root_passes_for_real_root() {
        let t = TempDir::new("ownroot");
        init_repo_with_commit(t.path());
        assert!(assert_is_own_repo_root(t.path()).is_ok());
    }

    /// The exact incident scenario: an "outer" repo with a vault-like
    /// subdirectory inside it that is NOT itself a git repo. Before this fix,
    /// nothing stopped `git_sync` from treating that subdirectory as safe to
    /// run `add -A`/commit/push in — those commands would silently operate on
    /// the outer repo instead, because `git` resolves `--show-toplevel` (and
    /// used to resolve `--is-inside-work-tree`) from the nearest ANCESTOR
    /// `.git`, not the directory actually passed in.
    #[test]
    fn assert_is_own_repo_root_fails_for_subdir_of_another_repo() {
        let outer = TempDir::new("outer");
        init_repo_with_commit(outer.path());
        let inner = outer.path().join("vault-subdir");
        fs::create_dir_all(&inner).unwrap();
        fs::write(inner.join("other.md"), "unrelated content").unwrap();

        let result = assert_is_own_repo_root(&inner);
        assert!(
            result.is_err(),
            "expected rejection for a directory that is only INSIDE a repo, not its root"
        );
        // Confirm old unsafe check really would have said "yes, this is a repo" —
        // documents exactly what has_own_git_dir correctly refuses that
        // is-inside-work-tree would have waved through.
        assert!(!has_own_git_dir(&inner));
    }

    #[test]
    fn assert_is_own_repo_root_fails_for_non_repo() {
        let t = TempDir::new("notrepo");
        assert!(assert_is_own_repo_root(t.path()).is_err());
    }

    #[tokio::test]
    async fn git_sync_rejects_subdir_of_another_repo_instead_of_corrupting_it() {
        let outer = TempDir::new("outer-sync");
        init_repo_with_commit(outer.path());
        let outer_head_before = {
            let out = Command::new("git")
                .args(["rev-parse", "HEAD"])
                .current_dir(outer.path())
                .output()
                .unwrap();
            String::from_utf8(out.stdout).unwrap().trim().to_string()
        };

        let inner = outer.path().join("vault-subdir");
        fs::create_dir_all(&inner).unwrap();
        fs::write(inner.join("new-note.md"), "should never reach the outer repo").unwrap();

        let result = git_sync(GitSyncInput {
            dir: inner.to_string_lossy().into_owned(),
            message: None,
            vault_id: None,
        })
        .await;

        assert!(result.is_err(), "git_sync must refuse to run inside someone else's repo");

        // The real regression check: the outer repo's HEAD must be untouched —
        // no commit was created in it from the inner directory's content.
        let outer_head_after = {
            let out = Command::new("git")
                .args(["rev-parse", "HEAD"])
                .current_dir(outer.path())
                .output()
                .unwrap();
            String::from_utf8(out.stdout).unwrap().trim().to_string()
        };
        assert_eq!(
            outer_head_before, outer_head_after,
            "outer repo must not have received a new commit from the inner vault-subdir"
        );
    }

    #[tokio::test]
    async fn git_sync_reports_real_push_failure_instead_of_false_success() {
        // First attempt used a seeded-bare-remote + diverged-history setup,
        // expecting `pull --rebase` to hit a conflict — it didn't: git cleanly
        // rebases non-conflicting diverged histories, so that sync legitimately
        // succeeded (test design flaw, not a product bug). A nonexistent
        // remote is the deterministic way to force a real failure, same
        // approach already verified against the equivalent web bug this
        // mirrors (web/server/src/lib/gitSync.ts, see that file's history).
        let local = TempDir::new("bad-remote-local");
        init_repo_with_commit(local.path());
        let fake_remote = env::temp_dir().join(format!(
            "noteriv-git-test-does-not-exist-{}-{}",
            std::process::id(),
            std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()
        ));
        git(
            local.path(),
            &["remote", "add", "origin", &fake_remote.to_string_lossy().into_owned()],
        );

        let result = git_sync(GitSyncInput {
            dir: local.path().to_string_lossy().into_owned(),
            message: Some("test sync".into()),
            vault_id: None,
        })
        .await;

        // Before the fix this returned Ok(true) unconditionally regardless of
        // whether the push (or here, even the fetch) actually reached
        // anything. Against a remote that doesn't exist at all, this must now
        // surface as a real Err.
        assert!(result.is_err(), "sync against a nonexistent remote must not report success");
    }

    /// Regression check: a normal sync against a real, reachable, empty bare
    /// remote (the common case — connecting a brand-new vault to a brand-new
    /// repo) must still succeed after adding the root-check and push-result
    /// handling above. Neither change should affect the happy path.
    #[tokio::test]
    async fn git_sync_still_succeeds_against_a_real_empty_remote() {
        let bare = TempDir::new("happy-bare-remote");
        git(bare.path(), &["init", "-q", "--bare"]);

        let local = TempDir::new("happy-local");
        init_repo_with_commit(local.path());
        git(
            local.path(),
            &["remote", "add", "origin", &bare.path().to_string_lossy().into_owned()],
        );
        git(local.path(), &["branch", "-M", "main"]);

        let result = git_sync(GitSyncInput {
            dir: local.path().to_string_lossy().into_owned(),
            message: Some("test sync".into()),
            vault_id: None,
        })
        .await;

        assert!(result.is_ok(), "sync against a real, reachable, empty remote must still succeed: {result:?}");

        // Confirm the push actually landed on the remote, not just that
        // git_sync returned Ok.
        let log = Command::new("git")
            .args(["log", "--oneline", "main"])
            .current_dir(bare.path())
            .output()
            .unwrap();
        assert!(log.status.success() && !log.stdout.is_empty(), "remote bare repo should have received the pushed commit");
    }
}

// Shells out to the `git` binary. Mirrors desktop/main/sync/git.js exactly.

use crate::auth::credentials_for_vault;
use crate::scope::PathScope;
use crate::AppState;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Duration;
use tauri::Manager;

pub fn is_safe_branch(branch: &str) -> bool {
    if branch.is_empty()
        || branch.len() > 200
        || branch.starts_with('-')
        || branch.starts_with('/')
        || branch.ends_with('/')
        || branch.ends_with('.')
        || branch.ends_with(".lock")
        || branch.contains("..")
        || branch.contains("//")
        || branch.contains(' ')
        || branch.contains('\\')
        || branch.contains(':')
        || branch.contains('^')
        || branch.contains('~')
        || branch.contains('?')
        || branch.contains('*')
        || branch.contains('[')
    {
        return false;
    }
    for part in branch.split('/') {
        if part.starts_with('.') {
            return false;
        }
    }
    branch
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '/' || c == '-')
}

pub fn is_safe_remote_url(url: &str) -> bool {
    let trimmed = url.trim();
    if trimmed.starts_with('-') {
        return false;
    }
    trimmed.starts_with("https://")
}

fn check_dir_scope(scope: Option<&PathScope>, p: &Path) -> Result<(), String> {
    if let Some(s) = scope {
        if !s.is_allowed(p) {
            log::warn!("[git] refused access outside scope: {:?}", p);
            return Err("Path outside permitted scope".into());
        }
    }
    Ok(())
}

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

/// True while a merge is stopped on conflicts (MERGE_HEAD exists).
fn merge_in_progress(dir: &Path) -> bool {
    let r = run_git(&["rev-parse", "--git-dir"], dir, None);
    let git_dir = if r.success && !r.stdout.is_empty() {
        dir.join(r.stdout)
    } else {
        dir.join(".git")
    };
    git_dir.join("MERGE_HEAD").exists()
}

/// True when HEAD is attached to a branch (not detached / mid-rebase).
fn on_branch(dir: &Path) -> bool {
    run_git(&["symbolic-ref", "--quiet", "HEAD"], dir, None).success
}

/// Sibling path for the losing side of a conflict: `notes/a.md` →
/// `notes/a (conflict 2026-10-17 0153).md`, numbered if that exists too.
/// Mirrors `conflictCopyPath` in web/server/src/lib/gitSync.ts.
fn conflict_copy_path(rel: &str, dir: &Path) -> String {
    let (dir_part, file) = match rel.rfind('/') {
        Some(i) => (&rel[..=i], &rel[i + 1..]),
        None => ("", rel),
    };
    let (stem, ext) = match file.rfind('.') {
        Some(i) if i > 0 => (&file[..i], &file[i..]),
        _ => (file, ""),
    };
    let stamp = Utc::now().format("%Y-%m-%d %H%M").to_string();
    let mut n = 1;
    loop {
        let suffix = if n > 1 { format!(" {n}") } else { String::new() };
        let candidate = format!("{dir_part}{stem} (conflict {stamp}{suffix}){ext}");
        if !dir.join(&candidate).exists() {
            return candidate;
        }
        n += 1;
    }
}

/// Resolves every unmerged path of an in-progress merge without losing either side:
/// both changed → the local version stays, the remote one becomes a conflict copy;
/// deleted locally, changed remotely → the deletion stands, the remote version becomes
/// a conflict copy; changed locally, deleted remotely → the local version stays.
/// Returns the conflict copies it created. (Same rules as web/server/src/lib/gitSync.ts.)
fn resolve_conflicts_keep_both(dir: &Path) -> Result<Vec<String>, String> {
    let out = ok_or_err(run_git(&["ls-files", "-u", "-z"], dir, None))?;
    let mut stages: std::collections::BTreeMap<String, (bool, bool)> = std::collections::BTreeMap::new();
    for entry in out.split('\0').filter(|e| !e.is_empty()) {
        let Some(tab) = entry.find('\t') else { continue };
        let stage = entry[..tab].split(' ').nth(2).unwrap_or("");
        let path = entry[tab + 1..].to_string();
        let e = stages.entry(path).or_insert((false, false));
        match stage {
            "2" => e.0 = true,
            "3" => e.1 = true,
            _ => {}
        }
    }

    let mut copies = Vec::new();
    for (rel, (ours, theirs)) in stages {
        let full = dir.join(&rel);
        if theirs {
            ok_or_err(run_git(&["checkout", "--theirs", "--", &rel], dir, None))?;
            let copy = conflict_copy_path(&rel, dir);
            let copy_full = dir.join(&copy);
            if let Some(parent) = copy_full.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            fs::rename(&full, &copy_full).map_err(|e| e.to_string())?;
            ok_or_err(run_git(&["add", "--", &copy], dir, None))?;
            copies.push(copy);
        }
        if ours {
            ok_or_err(run_git(&["checkout", "--ours", "--", &rel], dir, None))?;
            ok_or_err(run_git(&["add", "--", &rel], dir, None))?;
        } else {
            ok_or_err(run_git(&["rm", "--cached", "--quiet", "--ignore-unmatch", "--", &rel], dir, None))?;
            let _ = fs::remove_file(&full);
        }
    }

    let left = run_git(&["ls-files", "-u"], dir, None);
    if !left.success || !left.stdout.is_empty() {
        return Err("Sync paused: some conflicts could not be resolved automatically and need manual attention.".into());
    }
    Ok(copies)
}

/// Stages everything and commits it if anything changed.
fn commit_all(dir: &Path, msg: &str) -> Result<(), String> {
    ok_or_err(run_git(&["add", "-A"], dir, None))?;
    let st = run_git(&["status", "--porcelain"], dir, None);
    if st.success && !st.stdout.is_empty() {
        ok_or_err(run_git(&["commit", "-m", msg], dir, None))?;
    }
    Ok(())
}

/// Fetches `branch` and merges it (3-way). Local changes must already be committed.
/// A fetch failure (empty remote, offline) is not an error here: there is nothing to
/// merge, and the push that follows reports real network problems.
fn merge_remote(dir: &Path, pull_url: &str, branch: &str, token: Option<&str>) -> Result<Vec<String>, String> {
    let fetch = run_git(&["fetch", "--", pull_url, branch], dir, token);
    if !fetch.success {
        return Ok(Vec::new());
    }
    let merge = run_git(&["merge", "--no-edit", "--", "FETCH_HEAD"], dir, None);
    if merge.success {
        return Ok(Vec::new());
    }
    if !merge_in_progress(dir) {
        return Err(format!("Sync paused: could not merge remote changes. {}", merge.stderr));
    }
    let copies = resolve_conflicts_keep_both(dir)?;
    let msg = format!("Noteriv: merge remote changes ({} conflict copies)", copies.len());
    ok_or_err(run_git(&["commit", "--no-edit", "-m", &msg], dir, None))?;
    Ok(copies)
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
pub async fn git_is_repo(app: tauri::AppHandle, dir: String) -> bool {
    let state = app.state::<AppState>();
    git_is_repo_impl(Some(&state.scope), dir).await
}

pub async fn git_is_repo_impl(scope: Option<&PathScope>, dir: String) -> bool {
    let p = Path::new(&dir);
    if check_dir_scope(scope, p).is_err() {
        return false;
    }
    run_git(&["rev-parse", "--is-inside-work-tree"], p, None).success
}

#[tauri::command]
pub async fn git_init(app: tauri::AppHandle, dir: String) -> Result<bool, String> {
    let state = app.state::<AppState>();
    git_init_impl(Some(&state.scope), dir).await
}

pub async fn git_init_impl(scope: Option<&PathScope>, dir: String) -> Result<bool, String> {
    let p = Path::new(&dir);
    check_dir_scope(scope, p)?;
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
pub async fn git_set_remote(app: tauri::AppHandle, args: SetRemoteInput) -> Result<bool, String> {
    let state = app.state::<AppState>();
    git_set_remote_impl(Some(&state.scope), args).await
}

pub async fn git_set_remote_impl(scope: Option<&PathScope>, args: SetRemoteInput) -> Result<bool, String> {
    let p = Path::new(&args.dir);
    check_dir_scope(scope, p)?;
    if !is_safe_remote_url(&args.url) {
        return Err("Invalid remote URL. Only HTTPS URLs are allowed.".into());
    }
    let existing = run_git(&["remote", "get-url", "origin"], p, None);
    if existing.success {
        if existing.stdout != args.url {
            ok_or_err(run_git(&["remote", "set-url", "--", "origin", &args.url], p, None))?;
        }
    } else {
        ok_or_err(run_git(&["remote", "add", "--", "origin", &args.url], p, None))?;
    }
    Ok(true)
}

#[tauri::command]
pub async fn git_status(app: tauri::AppHandle, dir: String) -> GitStatus {
    let state = app.state::<AppState>();
    git_status_impl(Some(&state.scope), dir).await
}

pub async fn git_status_impl(scope: Option<&PathScope>, dir: String) -> GitStatus {
    let p = Path::new(&dir);
    if check_dir_scope(scope, p).is_err() {
        return GitStatus::default();
    }
    let is_repo = run_git(&["rev-parse", "--is-inside-work-tree"], p, None).success;
    if !is_repo {
        return GitStatus::default();
    }
    let branch = current_branch(p);
    if !is_safe_branch(&branch) {
        return GitStatus::default();
    }
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
            &["rev-list", "--count", "--", &format!("origin/{branch}..HEAD")],
            p,
            None,
        );
        if a.success {
            ahead = a.stdout.parse().unwrap_or(0);
        }
        let b = run_git(
            &["rev-list", "--count", "--", &format!("HEAD..origin/{branch}")],
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

/// Commits local changes, merges the remote branch (keeping both sides of real
/// conflicts), commits, pushes. Returns the conflict copies created by the merge.
///
/// Local changes are committed before merging rather than stashed: the old
/// stash → pull --rebase → stash pop sequence ignored a failed pop, so when both
/// sides edited the same note the conflict markers were committed and pushed.
#[tauri::command]
pub async fn git_sync(app: tauri::AppHandle, args: GitSyncInput) -> Result<Vec<String>, String> {
    let state = app.state::<AppState>();
    git_sync_impl(Some(&state.scope), args).await
}

pub async fn git_sync_impl(scope: Option<&PathScope>, args: GitSyncInput) -> Result<Vec<String>, String> {
    let p = Path::new(&args.dir);
    check_dir_scope(scope, p)?;
    assert_is_own_repo_root(p)?;
    let creds = credentials_for_vault(args.vault_id.as_deref());
    let token_ref = creds.as_ref().map(|c| c.token.as_str());

    let msg = args.message.unwrap_or_else(|| {
        format!("Sync notes {}", Utc::now().format("%Y-%m-%d"))
    });

    let branch = current_branch(p);
    if !is_safe_branch(&branch) {
        return Err(format!("Unsafe branch name: {branch}"));
    }
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
    if merge_in_progress(p) {
        let _ = run_git(&["merge", "--abort"], p, None);
    }

    // Never commit/push from a detached HEAD: current_branch() guesses a branch
    // name when detached, so an unguarded push would target the wrong ref and
    // silently no-op while local commits accumulate. Bail and surface it.
    if !on_branch(p) {
        return Err(
            "Sync paused: repository is in a detached HEAD state and needs manual attention.".into(),
        );
    }

    // Commit first so the merge has a common base (git combines edits to different parts of a note).
    commit_all(p, &msg)?;

    let mut copies = Vec::new();
    if let Some(r) = remote.as_deref() {
        let pull_url = match &creds {
            Some(c) => c.auth_url(r),
            None => "origin".into(),
        };
        copies = merge_remote(p, &pull_url, &branch, token_ref)?;
    }

    if let Some(r) = remote.as_deref() {
        let push_url = match &creds {
            Some(c) => c.auth_url(r),
            None => "origin".into(),
        };
        let push = run_git(&["push", "-u", "--", &push_url, &branch], p, token_ref);
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
    Ok(copies)
}

#[derive(Debug, Deserialize)]
pub struct GitDirVaultInput {
    pub dir: String,
    #[serde(rename = "vaultId", default)]
    pub vault_id: Option<String>,
}

#[tauri::command]
pub async fn git_pull(app: tauri::AppHandle, args: GitDirVaultInput) -> Result<bool, String> {
    let state = app.state::<AppState>();
    git_pull_impl(Some(&state.scope), args).await
}

pub async fn git_pull_impl(scope: Option<&PathScope>, args: GitDirVaultInput) -> Result<bool, String> {
    let p = Path::new(&args.dir);
    check_dir_scope(scope, p)?;
    assert_is_own_repo_root(p)?;
    let creds = credentials_for_vault(args.vault_id.as_deref());
    let branch = current_branch(p);
    if !is_safe_branch(&branch) {
        return Err(format!("Unsafe branch name: {branch}"));
    }
    if rebase_in_progress(p) {
        let _ = run_git(&["rebase", "--abort"], p, None);
    }
    if merge_in_progress(p) {
        let _ = run_git(&["merge", "--abort"], p, None);
    }
    if !on_branch(p) {
        return Err("Pull paused: repository is in a detached HEAD state and needs manual attention.".into());
    }
    // Same as git_sync: commit local edits, then merge, so nothing is ever stashed and lost.
    commit_all(p, &format!("Local changes before pull {}", Utc::now().format("%Y-%m-%d %H:%M")))?;
    let remote = ok_or_err(run_git(&["remote", "get-url", "origin"], p, None))?;
    let (pull_url, token) = match creds.as_ref() {
        Some(c) => (c.auth_url(&remote), Some(c.token.as_str())),
        None => ("origin".to_string(), None),
    };
    let fetch = run_git(&["fetch", "--", &pull_url, &branch], p, token);
    if !fetch.success {
        return Err(fetch.stderr);
    }
    merge_remote(p, &pull_url, &branch, token)?;
    Ok(true)
}

#[tauri::command]
pub async fn git_fetch(app: tauri::AppHandle, args: GitDirVaultInput) -> Result<bool, String> {
    let state = app.state::<AppState>();
    git_fetch_impl(Some(&state.scope), args).await
}

pub async fn git_fetch_impl(scope: Option<&PathScope>, args: GitDirVaultInput) -> Result<bool, String> {
    let p = Path::new(&args.dir);
    check_dir_scope(scope, p)?;
    let creds = credentials_for_vault(args.vault_id.as_deref());
    let res = if let Some(c) = creds.as_ref() {
        let remote = ok_or_err(run_git(&["remote", "get-url", "origin"], p, None))?;
        let auth = c.auth_url(&remote);
        run_git(&["fetch", "--", &auth], p, Some(&c.token))
    } else {
        run_git(&["fetch", "--", "origin"], p, None)
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
pub async fn git_log(app: tauri::AppHandle, args: GitLogInput) -> Vec<GitLogEntry> {
    let state = app.state::<AppState>();
    git_log_impl(Some(&state.scope), args).await
}

pub async fn git_log_impl(scope: Option<&PathScope>, args: GitLogInput) -> Vec<GitLogEntry> {
    let p = Path::new(&args.dir);
    if check_dir_scope(scope, p).is_err() {
        return Vec::new();
    }
    let count = args.count.unwrap_or(20);
    let r = run_git(
        &[
            "log",
            &format!("--max-count={count}"),
            "--pretty=format:%H||%an||%ar||%s",
            "--",
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
pub async fn git_clone(app: tauri::AppHandle, args: GitCloneInput) -> Result<bool, String> {
    let state = app.state::<AppState>();
    git_clone_impl(Some(&state.scope), args).await
}

pub async fn git_clone_impl(scope: Option<&PathScope>, args: GitCloneInput) -> Result<bool, String> {
    let target = PathBuf::from(&args.dir);
    if let Some(s) = scope {
        if !s.is_permitted_for_vault(&target) && !s.is_allowed(&target) {
            log::warn!("[git] refused clone to unpermitted target: {:?}", target);
            return Err("Clone target outside permitted scope".into());
        }
    }
    if !is_safe_remote_url(&args.url) {
        return Err("Invalid clone URL. Only HTTPS URLs are allowed.".into());
    }
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
        ok_or_err(run_git(&["clone", "--", &auth, &folder_name], parent, Some(&c.token)))?;
        ok_or_err(run_git(
            &["remote", "set-url", "--", "origin", &args.url],
            &target,
            None,
        ))?;
    } else {
        ok_or_err(run_git(&["clone", "--", &args.url, &folder_name], parent, None))?;
    }
    if let Some(s) = scope {
        s.grant(&args.dir);
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
pub async fn git_file_log(app: tauri::AppHandle, args: GitFileLogInput) -> Vec<GitLogEntry> {
    let state = app.state::<AppState>();
    git_file_log_impl(Some(&state.scope), args).await
}

pub async fn git_file_log_impl(scope: Option<&PathScope>, args: GitFileLogInput) -> Vec<GitLogEntry> {
    let p = Path::new(&args.dir);
    let fp = Path::new(&args.file_path);
    let target = if fp.is_absolute() { fp.to_path_buf() } else { p.join(fp) };
    if check_dir_scope(scope, p).is_err() || check_dir_scope(scope, &target).is_err() {
        return Vec::new();
    }
    let rel = relative_unix(p, &target);
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
pub async fn git_show_file(app: tauri::AppHandle, args: GitShowFileInput) -> Option<String> {
    let state = app.state::<AppState>();
    git_show_file_impl(Some(&state.scope), args).await
}

pub async fn git_show_file_impl(scope: Option<&PathScope>, args: GitShowFileInput) -> Option<String> {
    let p = Path::new(&args.dir);
    if check_dir_scope(scope, p).is_err() {
        return None;
    }
    // Hash must be hex digits only
    if args.hash.is_empty() || args.hash.len() > 64 || !args.hash.chars().all(|c| c.is_ascii_hexdigit()) {
        return None;
    }
    let fp = Path::new(&args.file_path);
    let target = if fp.is_absolute() { fp.to_path_buf() } else { p.join(fp) };
    if check_dir_scope(scope, &target).is_err() {
        return None;
    }
    let rel = relative_unix(p, &target);
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

        let result = git_sync_impl(None, GitSyncInput {
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

        let result = git_sync_impl(None, GitSyncInput {
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

        let result = git_sync_impl(None, GitSyncInput {
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

    /// A bare remote seeded with `files`, plus two clones: `vault` (the desktop vault
    /// git_sync runs in) and `other` (another device pushing to the same remote).
    fn two_clones(files: &[(&str, &str)]) -> (TempDir, TempDir, TempDir) {
        let bare = TempDir::new("conflict-bare");
        git(bare.path(), &["init", "-q", "--bare", "-b", "main"]);
        let seed = TempDir::new("conflict-seed");
        git(seed.path(), &["init", "-q", "-b", "main"]);
        git(seed.path(), &["config", "core.autocrlf", "false"]);
        git(seed.path(), &["config", "user.email", "test@example.com"]);
        git(seed.path(), &["config", "user.name", "Test"]);
        for (name, content) in files {
            fs::write(seed.path().join(name), content).unwrap();
        }
        git(seed.path(), &["add", "-A"]);
        git(seed.path(), &["commit", "-q", "-m", "seed"]);
        git(seed.path(), &["push", "-q", &bare.path().to_string_lossy(), "main"]);
        let clone = |label: &str| {
            let t = TempDir::new(label);
            // autocrlf off from the very first checkout: a machine-wide autocrlf=true would
            // otherwise leave CRLF files that git then reports as locally modified.
            git(t.path(), &["clone", "-q", "-c", "core.autocrlf=false", &bare.path().to_string_lossy(), "."]);
            git(t.path(), &["config", "user.email", "test@example.com"]);
            git(t.path(), &["config", "user.name", "Test"]);
            t
        };
        let vault = clone("conflict-vault");
        let other = clone("conflict-other");
        (bare, vault, other)
    }

    fn commit_and_push(dir: &Path, msg: &str) {
        git(dir, &["add", "-A"]);
        git(dir, &["commit", "-q", "-m", msg]);
        git(dir, &["push", "-q", "origin", "main"]);
    }

    async fn sync(dir: &Path) -> Result<Vec<String>, String> {
        git_sync_impl(None, GitSyncInput { dir: dir.to_string_lossy().into_owned(), message: Some("test sync".into()), vault_id: None }).await
    }

    fn no_markers(dir: &Path) -> bool {
        fs::read_dir(dir).unwrap().flatten().all(|e| {
            !e.path().is_file() || !fs::read_to_string(e.path()).unwrap_or_default().contains("<<<<<<<")
        })
    }

    #[tokio::test]
    async fn git_sync_same_line_keeps_both_versions() {
        let (_bare, vault, other) = two_clones(&[("a.md", "# A\noriginal\n")]);
        fs::write(other.path().join("a.md"), "# A\nREMOTE\n").unwrap();
        commit_and_push(other.path(), "remote edit");
        fs::write(vault.path().join("a.md"), "# A\nLOCAL\n").unwrap();

        let copies = sync(vault.path()).await.expect("sync must not pause on a plain conflict");
        assert_eq!(copies.len(), 1, "one conflict copy expected: {copies:?}");
        assert_eq!(fs::read_to_string(vault.path().join("a.md")).unwrap(), "# A\nLOCAL\n");
        assert_eq!(fs::read_to_string(vault.path().join(&copies[0])).unwrap(), "# A\nREMOTE\n");
        assert!(copies[0].starts_with("a (conflict "), "{copies:?}");
        assert!(no_markers(vault.path()), "no conflict markers may reach the vault");

        git(other.path(), &["pull", "-q", "origin", "main"]);
        assert_eq!(fs::read_to_string(other.path().join("a.md")).unwrap(), "# A\nLOCAL\n");
        assert!(other.path().join(&copies[0]).exists(), "the copy is pushed too");
    }

    #[tokio::test]
    async fn git_sync_merges_edits_to_different_parts() {
        let (_bare, vault, other) = two_clones(&[("g.md", "1\n2\n3\n4\n5\n")]);
        fs::write(other.path().join("g.md"), "1\n2\n3\n4\n5 remote\n").unwrap();
        commit_and_push(other.path(), "remote edit end");
        fs::write(vault.path().join("g.md"), "1 local\n2\n3\n4\n5\n").unwrap();

        let copies = sync(vault.path()).await.unwrap();
        assert!(copies.is_empty(), "{copies:?}");
        assert_eq!(fs::read_to_string(vault.path().join("g.md")).unwrap(), "1 local\n2\n3\n4\n5 remote\n");
    }

    #[tokio::test]
    async fn git_sync_keeps_local_edit_when_remote_deleted() {
        let (_bare, vault, other) = two_clones(&[("i.md", "# I\n"), ("keep.md", "x\n")]);
        git(other.path(), &["rm", "-q", "i.md"]);
        commit_and_push(other.path(), "remote deletes i");
        fs::write(vault.path().join("i.md"), "# I\nlocal edit\n").unwrap();

        let copies = sync(vault.path()).await.unwrap();
        assert!(copies.is_empty(), "{copies:?}");
        assert_eq!(fs::read_to_string(vault.path().join("i.md")).unwrap(), "# I\nlocal edit\n");
    }

    #[tokio::test]
    async fn git_sync_keeps_remote_edit_as_copy_when_deleted_locally() {
        let (_bare, vault, other) = two_clones(&[("h.md", "# H\n"), ("keep.md", "x\n")]);
        fs::write(other.path().join("h.md"), "# H\nremote edit\n").unwrap();
        commit_and_push(other.path(), "remote edits h");
        fs::remove_file(vault.path().join("h.md")).unwrap();

        let copies = sync(vault.path()).await.unwrap();
        assert_eq!(copies.len(), 1, "{copies:?}");
        assert!(!vault.path().join("h.md").exists(), "the local deletion stands");
        assert_eq!(fs::read_to_string(vault.path().join(&copies[0])).unwrap(), "# H\nremote edit\n");
    }

    #[tokio::test]
    async fn git_pull_keeps_uncommitted_edits() {
        let (_bare, vault, other) = two_clones(&[("a.md", "# A\noriginal\n")]);
        fs::write(other.path().join("a.md"), "# A\nREMOTE\n").unwrap();
        commit_and_push(other.path(), "remote edit");
        fs::write(vault.path().join("a.md"), "# A\nLOCAL\n").unwrap();

        let r = git_pull_impl(None, GitDirVaultInput { dir: vault.path().to_string_lossy().into_owned(), vault_id: None }).await;
        assert!(r.is_ok(), "{r:?}");
        assert_eq!(fs::read_to_string(vault.path().join("a.md")).unwrap(), "# A\nLOCAL\n");
        assert!(no_markers(vault.path()));
        let copy = fs::read_dir(vault.path()).unwrap().flatten().find(|e| e.file_name().to_string_lossy().starts_with("a (conflict "));
        assert!(copy.is_some(), "the remote version must be kept as a conflict copy");
    }

    #[test]
    fn test_is_safe_branch_rules() {
        assert!(is_safe_branch("main"));
        assert!(is_safe_branch("feature/my-feature"));
        assert!(is_safe_branch("v1.0.0"));
        assert!(is_safe_branch("user_notes"));

        // Dangerous or invalid branch names
        assert!(!is_safe_branch("-branch"));
        assert!(!is_safe_branch("--upload-pack=exploit"));
        assert!(!is_safe_branch("/slash/start"));
        assert!(!is_safe_branch("slash/end/"));
        assert!(!is_safe_branch("dot.end."));
        assert!(!is_safe_branch("dot.lock"));
        assert!(!is_safe_branch("has..dotdot"));
        assert!(!is_safe_branch("has//double"));
        assert!(!is_safe_branch("has space"));
        assert!(!is_safe_branch("part/.hidden"));
        assert!(!is_safe_branch(""));
    }

    #[test]
    fn test_is_safe_remote_url_rules() {
        assert!(is_safe_remote_url("https://github.com/user/repo.git"));
        // SSH URLs are disallowed to avoid SSH option injection
        assert!(!is_safe_remote_url("git@github.com:user/repo.git"));

        // Dangerous or unapproved remote URLs
        assert!(!is_safe_remote_url("--upload-pack=calc.exe"));
        assert!(!is_safe_remote_url("file:///etc/passwd"));
        assert!(!is_safe_remote_url("ext::sh -c evil%G"));
    }

    #[tokio::test]
    async fn test_git_scope_refusal() {
        let scope = PathScope::default();
        let ungranted = env::temp_dir().join(format!("ungranted-git-test-{}", std::process::id()));
        let dir_str = ungranted.to_string_lossy().into_owned();

        // git_is_repo on ungranted path must return false
        assert!(!git_is_repo_impl(Some(&scope), dir_str.clone()).await);

        // git_init on ungranted path must fail
        assert!(git_init_impl(Some(&scope), dir_str.clone()).await.is_err());

        // git_status on ungranted path returns empty default
        let st = git_status_impl(Some(&scope), dir_str.clone()).await;
        assert!(!st.is_repo);

        // git_sync on ungranted path must fail
        let sync_res = git_sync_impl(Some(&scope), GitSyncInput { dir: dir_str.clone(), message: None, vault_id: None }).await;
        assert!(sync_res.is_err());

        // Relative note path check in git_file_log and git_show_file
        let valid_dir = env::temp_dir().join(format!("granted-git-test-{}", std::process::id()));
        fs::create_dir_all(&valid_dir).unwrap();
        scope.grant(&valid_dir.to_string_lossy());
        fs::write(valid_dir.join("Note.md"), "# Note").unwrap();

        // Must not reject relative note path
        let logs = git_file_log_impl(Some(&scope), GitFileLogInput {
            dir: valid_dir.to_string_lossy().into_owned(),
            file_path: "Note.md".into(),
        }).await;
        // Even if not a repo, it shouldn't reject due to scope check
        assert_eq!(logs.len(), 0);

        let _ = fs::remove_dir_all(&valid_dir);
    }
}

---
title: Git Sync
order: 2
---

# Git Sync

Git sync keeps a vault in a Git repository: every sync commits your changes and brings in changes made elsewhere — on GitHub's website, in another editor, from another tool. You get the repository's full history of your notes and a copy you fully control.

It runs on the Noteriv server, over HTTPS, with an access token you give it. Nothing needs to be installed on your devices.

## Connecting GitHub

1. Open **Settings → Sync** and choose **+ Connect GitHub**.
2. **Step 1** — paste a GitHub personal access token with the `repo` scope (**Create a token →** opens GitHub's token page). Choose **Verify & pick a repo**.
3. **Step 2** — pick an existing repository from the list, or type a name and choose **Create repo** (private by default).
4. **Step 3** — choose the branch, then **Connect**.

On the **first sync**, notes already in the repository are imported into the vault; where a note exists at the same path on both sides, the vault keeps the web's content (the repository's version stays in its Git history). An empty repository gets its branch on the first sync.

**New vault from GitHub…** (vault switcher or File menu) does all of this for a brand-new vault made from a repository.

## Connecting another Git host

Choose **+ Other git (GitLab, Gitea…)** and fill in:

| Field | |
|---|---|
| **Remote URL** | The repository's HTTPS URL, e.g. `https://gitlab.com/you/notes.git` |
| **Username** | Leave empty for GitLab; your login for Gitea and Forgejo; your username for Bitbucket |
| **Access token** | A token (or app password) that can read and write the repository |
| **Branch** | The branch to sync |

| Host | Token to create |
|---|---|
| GitLab | Personal access token with `read_repository` and `write_repository` |
| Gitea / Forgejo | Access token with repository read and write |
| Bitbucket | App password with repository read and write |

Noteriv always connects over HTTPS with the token: an SSH address (`git@host:you/notes.git`) is turned into its HTTPS form.

## How a sync works

At each sync Noteriv:

1. writes the vault — notes, folders and attachments — into a working copy of the repository, with links between notes and to attachments turned into relative paths;
2. commits the changes with the **commit message template** (`{date}`, `{time}` and `{count}` are filled in);
3. fetches the remote and merges its changes;
4. pushes the result, and brings the repository's changes (new notes, edits, deletions) into the vault.

**Push only (web → repo)** skips bringing changes in; **Pull only (repo → web)** never pushes.

When it runs is up to you: by hand (**Sync now**, `Ctrl+Shift+G`), **Auto-sync** every 1–60 minutes, **Sync on save**, or **Pull when opening the vault**. See [Sync overview](./index.md#when-it-syncs).

## Conflicts

If Git cannot merge — the same lines of a note changed in Noteriv and in the repository — the sync stops and the connection shows **Conflict: the web and the repo both changed some files**, listing them. Choose:

- **Keep the web version** — Noteriv's version wins; or
- **Take the repo version** — the repository's version wins.

Click twice to confirm. Nothing is lost: the other side stays in the repository's Git history. When the repository brings in a change to a note that was edited in Noteriv in the meantime, the repository's version is saved as a [conflict copy](../features/conflicts.md) next to the note instead.

## History

With Git sync on, **Note history (git)** shows a note's commits and lets you restore any of them; see [Note history](../features/note-history.md).

## Managing the connection

Each connection in **Settings → Sync** has **Sync now**, **Test connection**, **Check remote**, **Edit** (branch, direction, schedule, commit template, a new token), **Log** (recent runs) and **Delete** (click twice). Deleting a connection does not touch the repository or the vault's notes.

## Troubleshooting

- **"Could not connect"** — check the remote URL and that the token can write to the repository and has not expired; enter a new token under **Edit → Change access token**.
- **Remote unreachable** — the Git host may be down; the next sync tries again.
- **Notes not synced** — the connection shows how many notes are waiting; run **Sync now** and look at **Log**.

> **Desktop app:** Git sync runs on your computer with your own Git installation and credentials; see [Desktop app](../desktop.md#sync).

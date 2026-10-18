---
title: Sync Overview
order: 1
---

# Sync Overview

On the web, your notes are already stored with your account and appear on every device you sign in from — you do not need sync for that. **Sync** connects a vault to an outside copy as well:

- a **Git repository** — GitHub, GitLab, Gitea, Forgejo, Bitbucket or any Git host over HTTPS — for a full version history and a copy you control ([Git sync](./git-sync.md));
- a **WebDAV server** — Nextcloud, ownCloud or any WebDAV server ([WebDAV sync](./webdav-sync.md)).

Sync runs on the Noteriv server, not in your browser: it keeps going with the tab closed, and your phone does not have to do anything.

## Setting it up

Open **Settings → Sync** (or **Git / WebDAV sync** at the bottom of the ribbon). A vault can have several **sync connections**:

- **+ Connect GitHub** — paste a GitHub access token, then pick or create a repository;
- **+ Other git (GitLab, Gitea…)** — a remote URL, an optional username and an access token;
- **+ WebDAV** — a server URL, username, password and remote path.

**New vault from GitHub…** (in the vault switcher and the File menu) creates a vault straight from an existing repository.

Tokens and passwords are stored encrypted on the server and never shown again; to change one, edit the connection and enter a new value.

## When it syncs

Each connection has:

| Setting | What it does | Default |
|---|---|---|
| **Sync direction** | **Two-way**, **Push only (web → repo)** or **Pull only (repo → web)** | Two-way |
| **Auto-sync** | Runs in the background every 1, 5, 10, 30 or 60 minutes | Off (10 minutes when turned on) |
| **Sync on save** | Pushes about 30 seconds after the first save | Off |
| **Pull when opening the vault** | Fetches new changes each time you open the vault | Off |
| **Commit message template** (Git) | Uses `{date}`, `{time}` and `{count}` | |

And you can always sync by hand: **Sync now** on the connection, `Ctrl+Shift+G`, or **Sync Now** in the command palette.

## Seeing what happened

- The **status bar** shows the sync state of the vault: `Git: not connected`, the time of the last sync, `sync: conflict` or `sync: error`. Click it to open the sync settings. The ribbon's sync button turns yellow when something needs your attention.
- Each connection shows its last sync, how many notes are not synced yet, and whether the remote has new changes; **Log** lists the recent runs with their result.
- **Test connection** and **Check remote** help when setting up.

## Conflicts

When the same note was changed both in Noteriv and in the repository (or on the WebDAV server) since the last sync, Noteriv keeps both. How depends on the connection:

- **Git:** a conflict that Git cannot merge stops the sync and shows "Conflict: the web and the repo both changed some files" with the files. Choose **Keep the web version** or **Take the repo version**; the other side stays in the repository's history.
- **WebDAV, and Git when the repository brings in a note that changed in Noteriv meanwhile:** Noteriv's version stays at the note's path and the other version is saved beside it as `Name (conflict YYYY-MM-DD HHmm).md`, with a [conflict banner](../features/conflicts.md) to compare, keep or replace.

## What is synced

- **Git:** every note and folder, and the vault's attachments. Links between notes and to attachments become relative paths in the repository, so it reads well on GitHub or in any editor.
- **WebDAV:** notes (`.md` files) and their folders.
- Deleting a note on one side deletes it on the other at the next sync; it stays in Noteriv's trash for 30 days.

> **Desktop app:** sync runs on your computer with your own Git installation; see [Desktop app](../desktop.md#sync).

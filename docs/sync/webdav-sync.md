---
title: WebDAV Sync
order: 3
---

# WebDAV Sync

WebDAV sync keeps a vault's notes in a folder on a WebDAV server — Nextcloud, ownCloud, a NAS, or any server that speaks WebDAV. Use it when you want your notes as plain files in a cloud folder you already have.

Like Git sync, it runs on the Noteriv server.

## Setting it up

1. Open **Settings → Sync** and choose **+ WebDAV**.
2. Fill in:
   - **Server URL** — the WebDAV address of your server. For Nextcloud it looks like `https://cloud.example.com/remote.php/dav/files/USERNAME/`.
   - **Username** and **Password** — for Nextcloud and ownCloud, create an **app password** in your security settings rather than using your login password.
   - **Remote path** — the folder on the server that holds the vault, e.g. `Notes/`.
3. Save, then **Test connection**.

The password is stored encrypted on the server and never shown again.

## What is synced

The vault's notes (`.md` files) and their folders. Attachments are not synced over WebDAV; use [Git sync](./git-sync.md) if you need them in the outside copy too.

## How a sync works

Noteriv remembers, for every file, what it looked like at the last sync on each side. At each sync it compares:

- **changed on one side only** — the change is copied to the other side;
- **deleted on one side, unchanged on the other** — it is deleted on the other side too (in Noteriv it goes to the trash for 30 days);
- **changed on both sides** — Noteriv's version stays at the path on both sides, and the server's version is kept beside it as `Name (conflict YYYY-MM-DD HHmm).md` (see [Conflicts](../features/conflicts.md));
- **deleted in Noteriv but edited on the server** — the deletion stands, and the server's version becomes a conflict copy;
- **edited in Noteriv but deleted on the server** — the edit is kept.

**Push only** and **Pull only** limit a connection to one direction.

## When it runs

By hand (**Sync now**, `Ctrl+Shift+G`), **Auto-sync** every 1–60 minutes, **Sync on save**, or **Pull when opening the vault** — the same choices as Git; see [Sync overview](./index.md#when-it-syncs).

## Troubleshooting

- **"Could not connect"** — check the server URL (it must point at the WebDAV endpoint), the username and the app password.
- **Files appear twice with "(conflict …)"** — the note was changed on both sides between syncs; compare the two with the conflict banner and keep one.
- **Large folders** — the first sync of a big folder takes longer; later syncs only move what changed.

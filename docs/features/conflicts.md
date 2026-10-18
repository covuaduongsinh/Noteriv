---
title: Conflicts
order: 18
---

# Conflicts

A conflict happens when the same note is changed in two places before one change has seen the other: two browser tabs, your phone and your laptop, an offline edit, or a sync with a Git repository or WebDAV server. Noteriv never resolves this by silently throwing one version away.

## Conflict copies

When Noteriv finds that a note changed elsewhere while you were editing it, it keeps the note as it is and saves **your** version next to it as a separate note:

```
Meeting notes.md
Meeting notes (conflict 2026-10-19 1432).md
```

The time in the name is UTC. You get a message ("This note was changed elsewhere meanwhile. Nothing was overwritten…"), the copy opens beside the note, and the original tab shows the version that is now stored.

This happens:
- **When you save** and the note was changed elsewhere since you opened it — every save checks this (except while editing together in [Collaboration](./collaboration.md));
- **When an offline edit is sent** and the note changed in the meantime (see [Offline use](./offline.md));
- **When sync** brings in a change to a note that was also changed in Noteriv (see [Sync](../sync/index.md)).

## The conflict banner

A conflict copy shows a banner at the top with what it is and four choices:

- **Compare** — the two versions side by side, differences highlighted.
- **Keep the original (delete this copy)** — the copy goes to the trash.
- **Use this version (replace the original)** — the copy's text replaces the original, and the copy goes to the trash.
- **Keep both** — the banner goes away and both notes stay; merge them by hand when you like.

Deleted copies go to the [trash](./attachments-and-trash.md), so you can still restore them for 30 days.

## Git sync conflicts

When a sync with a Git repository finds that both the web and the repository changed the same files, **Settings → Sync** shows "Conflict: the web and the repo both changed some files" with the files concerned and two buttons: **Keep the web version** or **Take the repo version**. The other side stays in the repository's Git history. See [Git sync](../sync/git-sync.md).

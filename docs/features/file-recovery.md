---
title: File Recovery
order: 9
---

# File Recovery

Noteriv keeps earlier versions of your notes so that an accidental deletion of a paragraph, a bad paste or a wrong merge can be undone days later.

## How versions are kept

The server takes a **snapshot** of each note about every 10 minutes while the note keeps changing: when a note's text differs from its last snapshot, a new snapshot is saved. Up to **50 snapshots per note** are kept; older ones are dropped first. Snapshots are stored with the vault on the server, so they are there on every device.

Snapshots are also taken before a sync or a collaboration session replaces a note's text, so what was there before can be found again.

## Restoring a version

1. Open the note.
2. Choose **File Recovery** in the note's toolbar.
3. The dialog lists the note's snapshots, newest first, with how long ago each was taken. Click one to preview it.
4. Choose **Restore** to put that version back into the editor. It is saved like any edit — and the version you replaced becomes a snapshot in turn, so a restore can be undone.

For a quicker look back, the **Time scrubber** (`Ctrl+Shift+H`, part of [Note history](./note-history.md)) plays through the same snapshots on a timeline.

## Deleted notes

A deleted note is not lost either: it waits in the **Trash** for 30 days. See [Attachments and trash](./attachments-and-trash.md).

## Compared with Git history

| | File recovery | Git history |
|---|---|---|
| Needs setup | No | A [Git sync](../sync/git-sync.md) connection |
| When versions are made | About every 10 minutes while the note changes | At every sync |
| How far back | The last 50 snapshots | The whole history of the repository |
| Where to see it | **File Recovery**, time scrubber | [Note history](./note-history.md) |

Use both: snapshots catch the small slips between syncs, Git keeps the long history.

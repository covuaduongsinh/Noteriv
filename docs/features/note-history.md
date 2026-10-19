---
title: Note History
order: 10
---

# Note History

The **Note history** [core plugin](./core-plugins.md) (on by default) shows how a note got to where it is, and lets you bring back an earlier version. It has two views.

## Time scrubber

Press `Ctrl+Shift+H` (or run **Time scrubber** from the command palette) with a note open. A timeline of the note's saved snapshots appears:

- drag the slider, or use `←` and `→`, to step through versions; the note's text at that moment is shown;
- `Space` plays the history like a film; `Esc` closes;
- **Restore this version** replaces the current content with the version on screen.

The snapshots are the same as [File recovery](./file-recovery.md): taken by the server about every 10 minutes while the note changes, 50 per note. A new note has no history yet; keep writing and the timeline builds up.

## Git history

When the vault [syncs with a Git repository](../sync/git-sync.md), **Note history (git)** in the command palette lists the commits that changed the note:

- each commit with its message and date;
- click one to read the note as it was at that commit, and see the changes from it to the current version;
- restore that version if you want it back.

Git history needs a Git sync connection that has run at least once with the note committed; until then the view says there is no Git history for the note.

## Which one to use

- **Time scrubber** for "what did this paragraph say this morning?" — works in every vault, no setup.
- **Git history** for the long view — every sync since the vault was connected, with commit messages.

Restoring from either is an ordinary edit: it is saved, synced and can itself be undone.

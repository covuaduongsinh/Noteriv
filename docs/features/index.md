---
title: Features
order: 1
---

# Features

What you can do with your notes in Noteriv. Some features are [core plugins](./core-plugins.md): those marked *(core plugin, off by default)* need to be turned on first in **Settings → Core plugins**.

## Linking and discovery

### [Wiki-links](./wiki-links.md)

Connect notes with `[[double bracket]]` links, resolved by note name (case-insensitive), with aliases and heading anchors. Click a link to open the note — or create it if it does not exist yet. The **Backlinks** panel lists every note pointing at the open one.

### [Tags](./tags.md)

`#tags` anywhere in a note, nested with slashes (`#project/alpha`), collected in the **Tags** panel with counts.

### [Search](./search.md)

**Quick Open** (`Ctrl+K`) jumps to a note by name; **Search in vault** (`Ctrl+Shift+F`) searches the text of every note and opens a result at its line; `Ctrl+F` finds within the open note.

### [Command palette](./command-palette.md)

`Ctrl+Shift+P` (or `F1`) lists every command with its shortcut.

### [Bookmarks](./bookmarks.md)

Keep the notes you use most in the **Bookmarks** panel (`Ctrl+Shift+B` toggles the open note).

## Daily workflow

### [Daily notes](./daily-notes.md)

`Ctrl+D` opens today's note in the `Daily` folder; a month calendar shows your daily notes and due tasks. *(Core plugin, on by default.)*

### [Templates](./templates.md)

Reusable notes in the `Templates` folder with `{{date}}`, `{{time}}`, `{{title}}` and more; insert one with `Ctrl+Alt+T` or start a new note from one. *(Core plugin, on by default.)*

## History and safety

### [File recovery](./file-recovery.md)

The server keeps earlier versions of every note (up to 50); look through them and restore one.

### [Note history](./note-history.md)

A time scrubber over a note's saved versions (`Ctrl+Shift+H`), and its Git history when the vault syncs with a repository. *(Core plugin, on by default.)*

### [Conflicts](./conflicts.md)

If a note was changed somewhere else while you edited it, nothing is overwritten: your version is saved beside it as a conflict copy, with a banner to compare, keep or discard it.

### [Offline use](./offline.md)

Recently opened vaults and notes open without a connection; edits wait on the device and are sent when you are back online.

## Restructuring

### [Note composer](./note-composer.md)

Merge notes into one, or split a note into several at its headings. *(Core plugin, off by default.)*

### [Import and export](./import-export.md)

Bring in a folder or zip of Markdown notes; export a vault as a zip; download all your data.

### [Attachments and trash](./attachments-and-trash.md)

Images, PDFs and audio stored with the vault, and a trash to restore deleted notes.

## Study and review

### [Flashcards](./flashcards.md)

Spaced repetition over `Q:`/`A:` pairs and `{{cloze}}` deletions in your notes. *(Core plugin, on by default.)*

## Querying and quality

### [Dataview](./dataview.md)

Query your vault like a database with `dataview` code blocks: tables, lists and tasks filtered by tags, folders or frontmatter. *(Core plugin, off by default.)*

### [Lint](./lint.md)

A panel of problems in the open note: broken links, empty or duplicate headings, unclosed code blocks, broken images and more. *(Core plugin, off by default.)*

## Working with others and other apps

### [Collaboration](./collaboration.md)

Edit a note together in real time with other people who have access to the vault.

### [Web clipper](./web-clipper.md)

Save the page you are reading in your browser to the vault's `Clippings` folder with a bookmarklet.

### [Language](./language.md)

English or Vietnamese interface, following your browser unless you choose.

## Shortcuts at a glance

| Action | Shortcut |
|---|---|
| Quick Open | `Ctrl+K` |
| Command palette | `Ctrl+Shift+P` |
| Search in vault | `Ctrl+Shift+F` |
| New note | `Ctrl+N` |
| Today's daily note | `Ctrl+D` |
| Insert template | `Ctrl+Alt+T` |
| Toggle bookmark | `Ctrl+Shift+B` |
| Graph view | `Ctrl+G` |
| Sync now | `Ctrl+Shift+G` |
| Cycle Edit / View / Source | `Ctrl+E` |

On a Mac, use `Cmd` for `Ctrl`. All shortcuts: [Keyboard shortcuts](../getting-started/keyboard-shortcuts.md).

---
title: Core Plugins
order: 15
---

# Core Plugins

Much of Noteriv is built as **core plugins**: features that ship with the app and that you switch on or off per vault in **Settings → Core plugins**. Turning one off removes its commands, ribbon buttons, panels and shortcuts; turning it on brings them back at once. Its settings and data stay in the vault either way.

## The core plugins

| Plugin | On by default | What it adds |
|---|---|---|
| [Calendar and daily notes](daily-notes.md) | Yes | Month calendar of daily notes and due tasks; today's note with `Ctrl+D` or the ribbon |
| [Templates](templates.md) | Yes | Insert a template (`Ctrl+Alt+T`) or start a note from one; templates live in the `Templates` folder |
| [Flashcards](flashcards.md) | Yes | Spaced-repetition review of `Q:`/`A:` pairs and `{{cloze}}` deletions |
| [Graph view](../views/graph-view.md) | Yes | Every note and the links between them (`Ctrl+G` or the ribbon) |
| [Note history](note-history.md) | Yes | Time scrubber over the note's saved versions (`Ctrl+Shift+H`) and its Git history |
| Mermaid | Yes | Diagrams from `` ```mermaid `` code blocks, in the editor, the reading view and PDF export |
| [PDF viewer](../views/pdf-viewer.md) | Yes | Read PDF attachments and annotate them |
| Word count | No | Word count of the open note in the status bar; statistics with `Ctrl+Alt+W` or the ribbon |
| Vault insights | No | Vault statistics: activity heatmap, most-linked and orphan notes, top tags, growth |
| [Markdown lint](lint.md) | No | A panel listing problems in the open note (`Ctrl+Shift+L`) |
| [Note composer](note-composer.md) | No | Merge notes into the open note, or split it by heading |
| Audio recorder | No | Record from the microphone, save it as an attachment and link it in the note |
| [Board (Kanban)](../views/board-view.md) | No | Shows `.board.md` files and notes with `board: true` as a Kanban board |
| [Canvas](../views/canvas.md) | No | Free-form boards of text, notes, images and groups joined by edges (`.canvas` files) |
| [Drawing](../views/drawing-editor.md) | No | Freehand sketches, shapes and text (`.drawing` files) |
| [Slides](../views/slides.md) | No | Present a note full screen, one slide per `---` section |
| [Dataview](dataview.md) | No | Query your notes with `` ```dataview `` blocks: tables, lists and tasks by folder, tag or frontmatter |

The defaults apply to a vault that has never changed them; a vault keeps the choices made in it.

## Turning plugins on and off

1. Open **Settings** (`Ctrl+,`) → **Core plugins**.
2. Switch the plugins you want. The change applies immediately, in every open tab of the vault.

## Where plugins show up

- **Commands** — in the [command palette](command-palette.md) (`Ctrl+Shift+P`), named after the plugin ("Calendar: open", "Templates: insert template", "Lint: toggle panel"…).
- **Ribbon buttons** — Calendar, Daily note, Templates, Flashcards, Graph, Slides, Word count, Vault insights and the audio recorder add buttons to the [ribbon](../getting-started/interface.md#ribbon).
- **Views and panels** — calendars, graphs, boards and canvases open as tabs; lint opens as a side panel.
- **Code blocks** — Mermaid and Dataview render their code blocks in the editor and the reading view.

## Core and community plugins

Core plugins are part of Noteriv and run with the app. [Community plugins](../plugins/index.md) are written by others, installed per vault from the plugin manager, and run in a sandbox with only the permissions you grant.

> **Desktop app:** the same seventeen core plugins with the same defaults, switched in its own **Settings → Core plugins**. A few shortcuts differ; see [Desktop app](../desktop.md#keyboard-shortcuts).

---
title: Views Overview
order: 1
---

# Views Overview

Besides the editor, Noteriv has views that show your notes in other shapes: as a network, a calendar, a Kanban board, a slideshow, a whiteboard, a drawing, or a PDF. Each comes with a [core plugin](../features/core-plugins.md); some are on by default, the others need turning on in **Settings → Core plugins** first.

| View | Plugin on by default | Open it with |
|---|---|---|
| [Graph view](./graph-view.md) | Yes | `Ctrl+G`, **Graph View** in the ribbon, **Open graph view** |
| [Calendar](./calendar-view.md) | Yes | **Calendar view** in the ribbon, **Calendar: open** |
| [PDF viewer](./pdf-viewer.md) | Yes | Opening a PDF attachment |
| [Board (Kanban)](./board-view.md) | No | **New board**, or open a board note |
| [Slides](./slides.md) | No | **Start presentation**, or **Presentation** in the ribbon or the note toolbar |
| [Canvas](./canvas.md) | No | **New canvas**, or open a canvas note |
| [Drawing](./drawing-editor.md) | No | **New drawing**, or open a drawing note |

The names in bold are commands in the [command palette](../features/command-palette.md) (`Ctrl+Shift+P`). Views open as tabs beside your notes. Boards, canvases and drawings are saved as ordinary notes of the vault, so they sync, export and come back from the trash like any other note.

## Graph view

Every note as a node, every `[[wiki-link]]` as an edge, laid out by a force simulation. Click a node to open the note. See [Graph view](./graph-view.md).

## Calendar

A month grid of your daily notes and tasks with due dates. See [Calendar](./calendar-view.md) and [Daily notes](../features/daily-notes.md).

## Board

A Kanban board stored as Markdown: `## Column` headings and `- [ ] card` items. A note shows as a board when its name ends in `.board.md` or its frontmatter says `board: true`. See [Board view](./board-view.md).

## Slides

Present the open note full screen, one slide per `---` section, with speaker notes and an overview. See [Slides](./slides.md).

## Canvas

A free-form whiteboard of text cards, note cards, sticky notes, images and groups joined by edges. On the web a canvas is a note with `canvas: true` in its frontmatter. See [Canvas](./canvas.md).

## Drawing

Freehand sketches, shapes, arrows and text. On the web a drawing is a note with `drawing: true` in its frontmatter. See [Drawing editor](./drawing-editor.md).

## PDF viewer

Read PDF attachments full screen and annotate them: highlights in four colours, underlines and notes; export the annotations as a note. See [PDF viewer](./pdf-viewer.md).

## Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+G` | Graph view |
| `Ctrl+D` | Today's daily note |
| `Ctrl+Shift+P` | Command palette — search for any view by name |

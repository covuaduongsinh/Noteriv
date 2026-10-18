---
title: File Types
order: 5
---

# File Types

Noteriv works with several file types, each serving a specific purpose. This page documents the kinds of notes and files a vault holds. On the web, everything is stored with the vault on the server; in the [desktop app](../desktop.md) these are files in the vault folder.

## Note Files

### .md / .markdown

Standard markdown files containing your notes. This is the primary file type in Noteriv. Every note you create is a `.md` note in plain text; exporting a vault gives you exactly these files.

Markdown files can contain:

- Standard markdown formatting (headings, bold, italic, links, lists, etc.)
- Extended syntax (wiki-links, callouts, math, Mermaid diagrams, dataview queries, etc.)
- YAML frontmatter at the top of the file
- Flashcard definitions (Q:/A: pairs and {{cloze}} deletions)

Both `.md` and `.markdown` extensions are treated identically. The `.md` extension is used by default when creating new notes.

### .board.md

Board notes are standard markdown files with `board: true` in their frontmatter. They are rendered as Kanban boards instead of regular notes. The `.board.md` extension is a naming convention, not a requirement -- any `.md` file with `board: true` in frontmatter is treated as a board.

Board structure:

```markdown
---
board: true
---

## Column One

- [ ] Card one
- [ ] Card two

## Column Two

- [x] Card three
```

H2 headings become columns; task items (`- [ ]`, `- [x]`) become cards. Drag cards between columns. Boards need the Board core plugin; see [Board view](../views/board-view.md).

## Canvas Files

### .canvas (canvas notes)

On the web a canvas is a note whose frontmatter says `canvas: true`, followed by the canvas JSON; in the desktop app it is a `.canvas` file holding the JSON. Canvases are JSON documents that describe a whiteboard layout. They contain nodes (sticky notes, images, and text blocks) and connections between them. The canvas editor provides a freeform, infinite-space workspace for visual note-taking and brainstorming.

Canvas file structure:

```json
{
  "nodes": [
    {
      "id": "node-1",
      "type": "sticky",
      "x": 100,
      "y": 200,
      "width": 200,
      "height": 150,
      "content": "Sticky note text",
      "color": "#f9e2af"
    },
    {
      "id": "node-2",
      "type": "image",
      "x": 400,
      "y": 200,
      "width": 300,
      "height": 200,
      "src": "attachments/diagram.png"
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "from": "node-1",
      "to": "node-2"
    }
  ]
}
```

Node types:

| Type | Description |
|---|---|
| `sticky` | A colored sticky note with text content |
| `image` | An embedded image from the vault or a URL |
| `text` | A text block with markdown support |

Canvases are created with **New canvas** in the command palette (with the Canvas core plugin on).

## Drawing Files

### .drawing (drawing notes)

On the web a drawing is a note whose frontmatter says `drawing: true`; in the desktop app it is a `.drawing` file. Drawings store freehand drawings created in the drawing editor. The drawing editor provides pen, eraser, and shape tools for creating diagrams, annotations, and sketches.

Drawing files are JSON documents containing stroke data, colors, and tool settings. They are rendered as SVG in the drawing editor.

## Attachment Files

Noteriv can display and manage various attachment file types within your vault:

| Type | Extensions | Behavior |
|---|---|---|
| Images | `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.bmp` | Displayed inline in preview, managed via the attachment manager |
| PDFs | `.pdf` | Opened in the PDF viewer with annotation support |
| Audio | `.mp3`, `.wav`, `.ogg`, `.m4a` | Played with the built-in audio player |
| Video | `.mp4`, `.webm` | Played with the built-in video player |
| Other | Any extension | Listed in the attachment manager, downloadable |

On the web, attachments are added in the attachment manager (ribbon → More tools → Attachments) and stored with the vault, up to 500 MB per vault; insert a link to one by clicking it. In an exported zip or a Git repository they appear as files next to the notes, with relative links. See [Attachments and trash](../features/attachments-and-trash.md).

## Vault settings

Settings that belong to a vault — theme, CSS snippets, core and community plugins, bookmarks, sync connections — are stored with the vault on the server and are not part of an exported zip.

In the desktop app they live in the vault's hidden `.noteriv/` folder; see [Desktop app](../desktop.md#vaults-are-folders) for its layout and the app's own data folder.

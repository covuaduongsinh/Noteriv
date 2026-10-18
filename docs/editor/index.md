---
title: Editor Overview
order: 1
---

# Editor Overview

Noteriv's editor is built on [CodeMirror 6](https://codemirror.net/). It is made for Markdown notes: three view modes, a split editor, focus and zen modes, optional Vim keys, and a formatting toolbar.

## View modes

### Live

The default. Lines away from the cursor render as you write — headings, bold and italic, links, images, code blocks, math, task lists — while the line you are on shows its Markdown so you can edit it directly. See [Live mode](./live-mode.md).

### Source

The raw Markdown with syntax highlighting and line numbers, nothing rendered. Use it for precise edits: nested lists, table alignment, frontmatter. See [Source mode](./source-mode.md).

### View

The whole note rendered, read-only. Task checkboxes can still be ticked, and the note is updated. See [View mode](./view-mode.md).

### Switching

- `Ctrl+E` cycles **Edit → View → Source** for the open note.
- The **Edit / View / Source** switch at the right of the title bar.
- **View → Cycle Edit / View / Source** in the app menu, or the command palette.

The mode is remembered per note in your open tabs.

## Split editor

Open a second note beside the first: `Ctrl+\`, or right-click a tab and choose split right. Drag the divider to resize, `Ctrl+Shift+\` closes the split. See [Split editor](./split-editor.md).

## Focus and zen modes

- **Focus mode** (**View → Focus Mode**) dims every line except the current one.
- **Zen mode** (`Ctrl+Shift+Z`) hides the title bar, tabs, ribbon, sidebar and status bar; `Esc` leaves it.

See [Focus and zen modes](./focus-mode.md).

## Vim mode

Modal editing with Normal, Insert and Visual modes, in Live mode. Turn it on in **Settings → Editor → Vim mode**. See [Vim mode](./vim-mode.md).

## Formatting toolbar

In Live mode a row of buttons above the note inserts bold, italic, strikethrough, inline code, links, images, quotes, code blocks, task lists, tables and horizontal rules. See [Formatting toolbar](./formatting-toolbar.md).

## While you type

- **Wiki-link suggestions** — type `[[` and pick a note; see [Wiki-links](../features/wiki-links.md).
- **Closing brackets** — `(`, `[`, `{` and quotes close themselves.
- **Find** — `Ctrl+F` searches the open note.
- **Saving** — notes save themselves shortly after you stop typing (**Settings → General → Auto-save**); `Ctrl+S` saves at once. Without a connection, edits are kept on the device and sent later; see [Offline use](../features/offline.md).
- **Properties** — the **Add properties** bar above the note edits its frontmatter as a form; see [Frontmatter](../reference/frontmatter.md).

## Editor settings

**Settings → Editor** holds the editor options: font size, line height, editor font, spell check, tab size and Vim mode. Auto-save is in **Settings → General**, the accent colour in **Settings → Appearance**, themes and CSS snippets in **Settings → Ecosystem**.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+E` | Cycle Edit / View / Source |
| `Ctrl+\` | Split editor |
| `Ctrl+Shift+\` | Close the split |
| `Ctrl+Shift+Z` | Zen mode |
| `Ctrl+I` | Italic |
| ``Ctrl+` `` | Inline code |
| `Ctrl+F` | Find in the note |
| `Ctrl+Z` / `Ctrl+Y` | Undo / redo |

All shortcuts: [Keyboard shortcuts](../getting-started/keyboard-shortcuts.md).

---
title: Source Mode
order: 3
---

# Source Mode

Source mode shows a note exactly as it is stored: raw Markdown with syntax highlighting, nothing rendered. Use it when you need to see every character — nested lists, table pipes, frontmatter, HTML, or a link whose rendering puzzles you.

Switch to it with `Ctrl+E` (which cycles Edit → View → Source), the **Edit / View / Source** switch in the title bar, or **View → Cycle Edit / View / Source**.

## What you see

- **Syntax highlighting** for Markdown: headings, emphasis, links, list markers, code, quotes. Fenced code blocks are highlighted in their own language (JavaScript, Python, Rust, SQL, YAML and many more).
- **Line numbers** in the gutter.
- **The current line** is highlighted.
- **Long lines wrap** to the width of the editor.

## Editing helps

- **`[[` suggestions** — type `[[` to pick a note to link, as in Live mode.
- **Closing brackets** — `(`, `[`, `{` and quotes close themselves.
- **Find** — `Ctrl+F` opens the search bar at the top of the editor, with replace, case and regular-expression options.
- **Indenting** — `Tab` and `Shift+Tab` indent and outdent the selected lines.
- **Undo and redo** — `Ctrl+Z` and `Ctrl+Y`.

The font, font size, line height and tab size follow **Settings → Editor**.

## Source mode or Live mode?

| | Source | Live |
|---|---|---|
| Rendering | None | Everything except the cursor line |
| Line numbers | Yes | No |
| Formatting toolbar | No | Yes |
| Vim keys | No | Yes (when on) |
| Best for | Exact edits, tables, frontmatter, HTML | Writing |

Both edit the same text and save the same way; switch whenever it helps.

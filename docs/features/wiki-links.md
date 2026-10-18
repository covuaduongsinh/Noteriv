---
title: Wiki-Links
order: 2
---

# Wiki-Links

Wiki-links are the primary way to connect notes in Noteriv. They use double-bracket syntax -- `[[note name]]` -- and resolve to files in your vault by filename, making it easy to build a web of interlinked ideas without worrying about file paths or URLs.

## Basic Syntax

To link to another note, wrap the note's filename (without the `.md` extension) in double square brackets:

```markdown
See [[meeting-notes]] for context.
```

When Noteriv encounters `[[meeting-notes]]`, it searches your vault for a file whose basename matches `meeting-notes` (case-insensitive). If a file called `Meeting-Notes.md`, `meeting-notes.md`, or `MEETING-NOTES.md` exists anywhere in the vault, the link resolves to it.

You do not need to include the file extension. Writing `[[meeting-notes.md]]` also works -- Noteriv strips a trailing `.md` before matching -- but the extension-free form is conventional.

## Display Text Aliases

If you want the rendered link to show different text from the filename, use the pipe syntax:

```markdown
Read the [[project-plan|original plan]] before the review.
```

This renders as a link labeled "original plan" that navigates to the `project-plan.md` file when clicked. The part before the pipe is the target filename; the part after the pipe is the display text.

Aliases are useful when the filename is technical or abbreviated but you want the prose to read naturally.

## Heading Anchors

You can link to a specific heading within a note by appending `#heading-text`:

```markdown
See [[architecture#caching-strategy]] for details.
```

When you click this link, Noteriv opens the `architecture.md` file and scrolls to the heading that matches "caching-strategy". The match is case-insensitive and spaces in the heading are converted to hyphens automatically.

You can combine heading anchors with display text:

```markdown
Refer to the [[architecture#caching-strategy|caching section]] in the architecture doc.
```

## Autocomplete

Typing `[[` in the editor activates wiki-link autocomplete. As you continue typing, a dropdown appears showing files in your vault whose names match what you have typed so far. The list updates with each keystroke and shows up to 30 results.

The autocomplete data is cached for 5 seconds to keep the experience snappy in large vaults. The cache is refreshed automatically after it expires.

To accept a suggestion:

- Use the arrow keys to highlight an entry, then press `Enter` or `Tab`.
- Click a suggestion with the mouse.

The completion inserts the filename and closing `]]` brackets for you, so you do not need to type them manually.

## How Resolution Works

When Noteriv resolves a wiki-link, it follows a two-pass strategy:

1. **Basename match.** It compares the link target (lowercased, `.md` stripped) against the basename of every file in the vault. The first case-insensitive match wins. This means a link like `[[notes]]` will resolve to `Notes.md` regardless of which folder it lives in.

2. **Path match.** If the link target contains a `/` character -- for example, `[[projects/alpha]]` -- Noteriv looks for a file whose relative path ends with `projects/alpha.md`. This lets you disambiguate when two files in different folders share the same basename.

If no note matches, the link still renders like any other; clicking it creates the note (at the root of the vault, or in the folder the link names) and opens it. The [lint panel](./lint.md) lists links whose note does not exist yet.

## Embedding with `![[]]`

Prefixing a wiki-link with `!` turns it into an embed:

```markdown
![[meeting-notes]]
```

In the editor an embed shows as a marked reference to the note (⇱ meeting-notes); embedded content is not displayed inline on the web yet. Embeds count as links for backlinks and the graph.

Image files can also be embedded this way:

```markdown
![[diagram.png]]
```

## Backlinks Panel

The backlinks panel shows every note in your vault that contains a wiki-link pointing to the file you currently have open. It is a read-only, automatically generated view -- you do not need to maintain it.

### Opening the Panel

Choose **Backlinks** in the open note's toolbar, or run **Toggle Backlinks** from the command palette. The panel opens on the right of the editor.

### What It Shows

Every note that links to the open one — with `[[note]]`, `[[note|alias]]` or `![[note]]` — once each, with its name. Self-links are left out. The list is kept up to date by the server each time a note is saved, so it covers the whole vault without scanning anything in your browser.

### Navigating

Click an entry to open the linking note.

## Live Rendering

In live mode, wiki-links on non-cursor lines are rendered as styled clickable text. The double brackets are hidden, and only the display text (or filename if no alias is set) is visible. Placing your cursor on the line reveals the raw `[[...]]` syntax for editing.

Click a rendered wiki-link to open the linked note (or create it). To edit the link instead, put the cursor on its line — click beside the link or use the arrow keys — and the raw syntax appears. Rest the pointer on a link to preview the note.

## Tips

- **Keep filenames short and descriptive.** Since resolution is by filename, shorter names mean faster typing and fewer collisions.
- **Use aliases for readability.** Write `[[api-auth|authentication flow]]` instead of contorting your prose to fit a filename.
- **Check backlinks regularly.** The backlinks panel reveals connections you might not remember making, which is valuable when revisiting old notes.
- **Use the lint panel** to catch broken wiki-links. Noteriv's linting engine flags any `[[target]]` that does not resolve to an existing file.

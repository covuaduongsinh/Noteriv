---
title: Noteriv Documentation
order: 1
---

# Noteriv Documentation

Noteriv is a Markdown note-taking app that runs in your browser. Notes are plain Markdown, linked with `[[wiki-links]]`, organised in vaults, and can be kept in sync with a Git repository or a WebDAV server. It installs on a phone or computer like an app, keeps working without a connection for the notes you have opened, and has a desktop app as well.

These pages describe the **web app**. Where the [desktop app](desktop.md) behaves differently, a short "Desktop app" note says so.

## Sections

| Section | What it covers |
|---|---|
| [Getting started](getting-started/index.md) | Signing up, installing on a phone or computer, your first vault, the interface, keyboard shortcuts |
| [Editor](editor/index.md) | Live, Source and View modes, split editor, focus and zen modes, Vim mode, the formatting toolbar |
| [Features](features/index.md) | Links, tags, search, templates, daily notes, bookmarks, core plugins, offline use, conflicts, import and export, the web clipper and more |
| [Views](views/index.md) | Graph, calendar, Kanban board, slides, canvas, drawing and the PDF viewer |
| [Sync](sync/index.md) | Keeping a vault in a Git repository (GitHub, GitLab, Gitea, Forgejo…) or on a WebDAV server |
| [Plugins](plugins/index.md) | Core plugins, community plugins, writing your own |
| [Themes](themes/index.md) | Built-in themes, accent colours, custom themes, CSS snippets |
| [Phone and tablet](mobile/index.md) | Installing on Android and iOS, the phone layout, Quick note, offline |
| [Desktop app](desktop.md) | How the desktop app differs: vaults as folders, shortcuts, local Git |
| [Reference](reference/index.md) | Markdown syntax, frontmatter, callouts, file types |
| [MCP server](mcp/index.md) | Letting AI assistants read and write a vault folder on your computer |
| [FAQ](faq.md) | Common questions |

## In short

- **Your notes are Markdown.** Every note is a `.md` file in a vault. Export a vault as a zip at any time, or keep it in a Git repository with [sync](sync/index.md).
- **Links make the structure.** `[[Note name]]` links to another note; each note shows its [backlinks](features/wiki-links.md); the [graph](views/graph-view.md) draws them.
- **Plugins add the rest.** Seventeen [core plugins](features/core-plugins.md) ship with the app — calendar, templates, flashcards, graph, Kanban board, canvas and more — and you turn them on and off in **Settings → Core plugins**. [Community plugins](plugins/index.md) run in a sandbox with the permissions you grant.
- **It works on the go.** [Install it](getting-started/installation.md) on your phone, capture a thought with [Quick note](mobile/index.md#quick-note), and keep reading and editing recent notes [offline](features/offline.md).
- **Nothing is overwritten silently.** If a note changed somewhere else while you were editing it, your version is saved next to it as a [conflict copy](features/conflicts.md).
- **English and Vietnamese.** The interface follows your browser's language; change it in **Settings → General → Language** ([details](features/language.md)).

New here? Start with the [quickstart](getting-started/quickstart.md).

# Noteriv

**Markdown knowledge notes for the web and the desktop.** Your notes are plain Markdown files: link them, search them, sync them to Git or WebDAV, edit them together in real time, and extend the app with sandboxed plugins.

> Noteriv is under active development. The hosted web app runs at <https://noteriv.dsc.edu.vn> and is **invite-only** for now. The product name will change before the public launch.

## Features

**Writing and reading**
- Editor with live preview, source and read-only modes; formatting toolbar; vim mode
- Wiki-links (`[[note]]`, aliases, headings), backlinks, tags, outline, bookmarks
- Quick open, command palette, full-text search
- Math (KaTeX), callouts, tables, task lists, frontmatter editor
- Tabs and split panes; per-note view mode

**Your data**
- Plain Markdown, no lock-in; import and export a vault as `.zip`
- Git sync (GitHub, GitLab, Gitea, Forgejo, Codeberg, Bitbucket) and WebDAV sync
- Real-time collaboration on the web (Yjs)
- Attachments, trash with restore, file recovery snapshots
- PDF export with print preview

**Core plugins** (turn on or off in Settings; a disabled plugin loads no code)
- On by default: Flashcards (spaced repetition), Calendar and daily notes, Templates, Graph view, Note history and time scrubber, Mermaid diagrams, PDF viewer with annotations
- Off by default: Word count, Note composer, Vault insights, Markdown lint, Audio recorder, Slides, Board (Kanban), Dataview, Canvas, Drawing

**Extensibility**
- Community plugins run in a sandboxed iframe with explicit permissions, on both web and desktop
- Themes and CSS snippets
- Web clipper (browser extension) and an MCP server for AI assistants (local vaults)

## Apps

| App | Directory | Notes |
|---|---|---|
| Web app | `web/` (Next.js 16), `web/server/` (Fastify + Prisma/PostgreSQL), `web/pdf-service/` | The main product. Multi-user, server-backed |
| Desktop app | `desktop/` (Next.js + Tauri 2) | Same features, notes stored as local files |
| Shared code | `packages/core`, `packages/ui`, `packages/plugin-api`, `packages/plugins` | Logic, editor and UI, plugin API types, core plugins |
| Browser extension | `extension/` | Web clipper |
| MCP server | `mcp/` | Lets AI assistants read and write a local vault |

A mobile experience is planned as an installable web app (PWA).

## Development

`web/`, `desktop/` and `packages/*` are npm workspaces. Install once at the repository root:

```sh
npm install                 # repository root
npm test                    # Vitest: packages/core, packages/ui, packages/plugins
npm run typecheck           # core, web, desktop
npm run dev:web             # web app at http://localhost:3457 (needs the API on port 4001)
npm run build:web           # Next.js standalone build
npm run build:desktop       # desktop UI (static export); Tauri bundle: cd desktop && npm run build
```

`web/server` and `web/pdf-service` are not workspaces; each has its own lockfile and Docker build. Start the API with `cd web/server && npm install && npm run dev`.

The plugin API is described in [`docs/plugin-api/v1.md`](docs/plugin-api/v1.md) (draft).

## Documentation

- User documentation: [`docs/`](docs/) (being updated for the web app)
- Developer handbook (Vietnamese): [`docs/dev/so-tay.md`](docs/dev/so-tay.md)
- Roadmap and session plans (Vietnamese): [`docs/plans/`](docs/plans/), starting from [`2026-10-17-lo-trinh-thuong-mai.md`](docs/plans/2026-10-17-lo-trinh-thuong-mai.md)
- Operations (Vietnamese): [`docs/ops/`](docs/ops/)

## License and origin

MIT. Noteriv started as a fork of [thejacedev/Noteriv](https://github.com/thejacedev/Noteriv) (MIT, © 2026 Jace); the web app, server, shared packages and later work are © 2026 Phùng Đức Tường under the same license. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md) for the origin of the project and third-party material.

## Contact

Security reports and personal-data requests: covuaduongsinh@gmail.com. See also the privacy policy in the web app (`/privacy`).

---
title: Contributing
order: 91
---

# Contributing to Noteriv

Noteriv is open source under the MIT license. Bug reports, ideas, documentation fixes, plugins, themes and pull requests are all welcome.

## Reporting bugs and suggesting features

Open an issue on the project's GitHub repository (`covuaduongsinh/Noteriv`) with:

- what you did, what you expected, and what happened instead;
- the browser (or desktop app) and the device;
- screenshots if they help. **Developer → Diagnostics…** in the app menu produces a report you can copy into the issue.

For a feature, describe the problem it solves before the solution you have in mind.

## Repository layout

| Folder | What it is |
|---|---|
| `web/` | The web app (Next.js) |
| `web/server/` | Its API, sync worker and collaboration server (Fastify, Prisma, PostgreSQL) |
| `web/infra/` | Docker Compose files for development and production |
| `desktop/` | The desktop app (Tauri; the UI is a static Next.js export) |
| `packages/core` | Platform-neutral logic shared by both apps (`@noteriv/core`) |
| `packages/ui` | Shared UI: editor, Markdown rendering, panels, the i18n catalogs (`@noteriv/ui`) |
| `packages/plugins` | The seventeen core plugins |
| `packages/plugin-api` | The plugin API types |
| `e2e/` | End-to-end tests (Playwright) and the desktop smoke test |
| `mcp/` | The [MCP server](mcp/index.md) |
| `extension/` | The browser extension that clips pages to the desktop app |

## Development setup

You need Node.js 22 and npm; for the desktop app also the Rust toolchain (see the [Tauri prerequisites](https://tauri.app/start/prerequisites/)); for the API a PostgreSQL and a Redis (the development compose file in `web/infra/` provides them).

```sh
npm install                 # once, at the repository root (web, desktop and packages are npm workspaces)
npm test                    # unit tests (Vitest) of packages/core, packages/ui, packages/plugins
npm run typecheck           # TypeScript across the workspaces
npm run dev:web             # the web app at http://localhost:3457 (expects the API on port 4001)
npm run build:web           # production build of the web app

cd web/server && npm install && npm run dev     # the API (its own lockfile)
cd desktop && npm run dev                       # the desktop app (Next.js + Tauri)
```

End-to-end tests run against a production build of the web app and a running API; see `e2e/README.md`. `npm run e2e` runs them.

## Conventions

- **Shared code goes in `packages/`**, not copied into each app.
- **Interface text goes in the catalogs**, `packages/ui/src/i18n/locales/en.json` and `vi.json`, never hard-coded; a test fails when a key is missing from either.
- **Commit messages** are in English, in the form `feat(area): …`, `fix(area): …`, `docs: …`.
- Code copied from another project must be recorded in `NOTICE.md` at the time it is copied.
- The maintainers' handbook (Vietnamese) is [`docs/dev/so-tay.md`](dev/so-tay.md); plans and session records are in `docs/plans/`.

## Plugins, themes and snippets

- [Creating plugins](plugins/creating-plugins.md) explains the plugin API; the community plugin list is the [NoterivPlugins](https://github.com/thejacedev/NoterivPlugins) repository.
- [Custom themes](themes/custom-themes.md) and [CSS snippets](themes/css-snippets.md) describe their formats; the community lists are [NoterivThemes](https://github.com/thejacedev/NoterivThemes) and [NoterivSnippets](https://github.com/thejacedev/NoterivSnippets).

## Documentation

These pages live in `docs/` of the repository, in English. Describe the web app first; where the desktop app differs, add a short "Desktop app:" note or extend [Desktop app](desktop.md). Use the interface's own words for buttons and menus, as they appear in `en.json`.

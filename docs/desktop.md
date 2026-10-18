---
title: Desktop App
order: 2
---

# Desktop App

Besides the web app, Noteriv has a desktop app for Windows, macOS and Linux, built with [Tauri](https://tauri.app/). It shares the editor, the panels and the seventeen core plugins with the web app, but works differently in one fundamental way: **a vault is a folder of Markdown files on your computer**, and there is no account or server.

This page lists what is different. Everything not mentioned here works as described in the rest of the documentation.

## Installing

There are no published installers for this edition yet. The desktop app is built from the `desktop/` folder of the repository:

```bash
npm install
cd desktop
npx tauri build            # installers; or: npx tauri build --no-bundle for the program only
```

The build needs Node.js and the Rust toolchain (see the [Tauri prerequisites](https://tauri.app/start/prerequisites/)). See [Contributing](contributing.md) for the development setup.

**Portable mode:** put an empty `portable.txt` next to the program, and it keeps its settings in a `data` folder beside it instead of the user profile.

## Vaults are folders

- On first start, a setup wizard offers **New vault**, **Open folder** (an existing folder of Markdown notes, such as an Obsidian vault) or **Clone from GitHub**. A new vault can start with the getting-started notes.
- Notes are `.md` files; folders are folders. Other apps can edit them while Noteriv is open — it notices the changes.
- Each vault has a hidden `.noteriv/` folder with its own settings:

```
my-vault/
  .noteriv/
    plugin-config.json     core and community plugin state and settings
    plugins/               community plugins, one folder each
    themes/                custom themes (JSON)
    snippets/              CSS snippets (.css)
    snippet-config.json    which snippets are on
    workspace.json         open tabs
    trash/                 deleted notes
    snapshots/             file recovery snapshots
```

- The list of vaults and the app's settings are kept in the app's data folder: `%APPDATA%\Noteriv` on Windows, `~/Library/Application Support/Noteriv` on macOS, `~/.config/Noteriv` on Linux.
- Canvases and drawings are `.canvas` and `.drawing` files; PDF annotations are a hidden `.name.pdf-annotations.json` file beside the PDF.

## Keyboard shortcuts

The desktop app is not limited by browser shortcuts, so a few defaults differ from the [web](getting-started/keyboard-shortcuts.md):

| Action | Desktop | Web |
|---|---|---|
| Quick Open | `Ctrl+P` | `Ctrl+K` |
| Insert link | `Ctrl+K` | — |
| Insert template | `Ctrl+T` | `Ctrl+Alt+T` |
| Zen mode | `Ctrl+Shift+E` | `Ctrl+Shift+Z` |
| Focus mode | `Ctrl+Shift+D` | — |
| Fullscreen | `F11` | — |
| Next / previous tab | `Ctrl+Tab` / `Ctrl+Shift+Tab` | — |
| New folder | `Ctrl+Shift+N` | — |
| Open random note | `Ctrl+Shift+R` | — |
| Save as | `Ctrl+Shift+S` | — |

All of them can be changed in **Settings → Shortcuts**.

## File list

- **Select several files** with `Ctrl+Click` (one by one) and `Shift+Click` (a range), then drag them into a folder or right-click to merge them into one note or delete them.
- Right-click also offers **Open File Location** / **Open Folder Location** in the system file manager.

## Sync

Sync runs on your computer:

- **Git** uses the Git installed on your system, in the vault folder itself (a normal Git repository you can also use from the command line). The access token is stored in a file in the app's data folder (not in the system keyring, which would ask to be unlocked at every sync).
- **WebDAV** and **folder sync** (mirroring the vault to another folder, such as a Dropbox or Google Drive folder) are additional providers in **Settings → Sync**.
- When both sides changed a note, the remote version is saved beside it as a `(conflict …)` copy, as on the web.

## Other differences

- **Note history** reads the vault's own Git repository; **file recovery** keeps a snapshot before each save, in `.noteriv/snapshots/`.
- **Collaboration** connects desktop apps directly to each other: one starts a session, the others join with its room code.
- **Language:** **Settings → General → Language** can follow the operating system's language.
- **Web clipper:** the browser extension in the repository's `extension/` folder sends pages to the desktop app running on the same computer.
- **[MCP server](mcp/index.md):** lets AI assistants work with your vault folders.
- There is no account, no offline mode (everything is already on your computer), no Quick note page and no install-as-app step.

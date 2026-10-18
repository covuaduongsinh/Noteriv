---
title: Plugins
order: 1
---

# Plugins

Noteriv has two kinds of plugins:

- **Core plugins** ship with the app — calendar, templates, flashcards, graph, Kanban board, canvas, Dataview and more. Turn them on and off in **Settings → Core plugins**. See [Core plugins](../features/core-plugins.md).
- **Community plugins** are written by others (or by you) and installed per vault. They run in a sandbox with only the permissions you grant. This page is about them.

## The plugin manager

Open it with **Plugins** at the bottom of the ribbon, **Plugin → Plugins…** in the app menu, **Plugin Manager** in the command palette, or **Settings → Ecosystem**. It has three tabs:

- **Installed** — the vault's community plugins: **Enable** / **Disable**, **Edit permissions**, **Uninstall**.
- **Community** — plugins from the community list, with **Install**.
- **Manual install** — paste a plugin's `manifest.json` and `main.js` to install it directly; useful while developing one.

Installed plugins belong to the vault and are stored with it on the server, so they are there on every device.

## Permissions

Before a plugin is installed, Noteriv shows what it asks for — "This plugin will be granted: …" — and installs it only when you confirm. The permissions are:

| Permission | Lets the plugin |
|---|---|
| Read notes in the vault | Read notes |
| Create, edit and delete notes in the vault | Change notes |
| Read the open note | Read the note in the editor |
| Edit the open note | Change the note in the editor |
| Add commands to the interface | Add commands to the command palette |
| Show information in the status bar | Add status bar items |
| Add side panels and tabs in Settings | Add panels and settings tabs |
| Show special content in notes (code blocks) | Render its own code blocks |

If a plugin tries something it was not granted, the call is blocked and the plugin manager tells you; you can then grant the missing permission or leave it blocked. It also points out permissions a plugin asked for but does not use, so you can remove them. **Edit permissions** changes them at any time.

## The sandbox

A community plugin runs in an isolated frame, apart from the page: it cannot read your session, the page, or other vaults. It talks to Noteriv only through the plugin API, and each call is checked against the permissions you granted. Disabling or uninstalling a plugin stops it at once.

Still, install plugins only from authors you trust: a plugin with write permission can change your notes.

## Writing a plugin

See [Creating plugins](./creating-plugins.md).

> **Desktop app:** community plugins are folders in the vault's `.noteriv/plugins/`; see [Desktop app](../desktop.md).

---
title: Vaults
order: 4
---

# Vaults

A vault is a self-contained collection of notes and folders. Use one vault for everything, or several — work, personal, a research project — each with its own theme, plugins, bookmarks and sync connections.

On the web, vaults belong to your account and are stored on the Noteriv server, so they are the same on every device you sign in from. Every note is still a Markdown file: you can export a vault as a zip of `.md` files at any time or keep it in a Git repository.

> **Desktop app:** a vault is a folder on your computer. See [Desktop app](../desktop.md).

## Your vaults

**Your vaults** is the page you see after signing in (`/vaults`). It lists your vaults and has a field to create a new one. A new account already has a **Getting started** vault with a few notes that show the main features; delete it whenever you like.

From the same page you can also:
- open **Quick note** and the **Install on your phone** guide;
- **Download all my data (JSON)** — every vault, note and setting of your account in one file;
- **Delete account** — removes the account and everything in it (click twice to confirm);
- **Sign out**. Signing out also clears what this device kept for offline use; if edits made offline have not reached the server yet, Noteriv warns you first.

## Switching vaults

Inside a vault, its name at the left of the title bar opens the **vault switcher**: every vault of your account, plus:

- **Rename vault** and **Delete vault** next to each vault. Deleting a vault removes its notes permanently (click twice to confirm); only the vault's owner can do it.
- **New vault** — creates an empty vault.
- **New vault from GitHub…** — creates a vault from a GitHub repository and connects it for [sync](../sync/git-sync.md).
- **Import folder / zip…** — creates a vault from a folder of Markdown files or a zip (see below).

## Importing notes

Bring existing Markdown notes — an Obsidian vault, a folder of notes, a zip export — into Noteriv:

- **File → Import folder / zip…** adds them to the current vault.
- **File → Import as New Vault…** creates a new vault from them.

Folders are kept, `[[links]]` between the imported notes work straight away, and images and other attachments referenced by the notes are uploaded with them. See [Import and export](../features/import-export.md).

## Exporting

**File → Export Vault (.zip)** downloads the whole vault as a zip: every note as a `.md` file in its folder, plus attachments. Nothing about the format is specific to Noteriv; the zip opens in any Markdown editor.

## What a vault keeps

Besides notes and folders, each vault has its own:
- theme, accent colour, custom themes and CSS snippets;
- core plugin choices and community plugins;
- bookmarks;
- attachments (images, PDFs, audio — storage is shared by all your vaults, see [Plan and usage](account.md#plan-and-usage)) and trash;
- sync connections.

Your open tabs are remembered per vault and per account, so a vault opens where you left it.

## Tips

- Start with one vault and use folders and tags; split into several vaults only when the topics never mix.
- Keep regular backups: export a zip from time to time, or connect a Git repository so every change is kept with its history.

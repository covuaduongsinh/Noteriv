---
title: Import and Export
order: 21
---

# Import and Export

Your notes are Markdown files, and Noteriv makes it easy to bring them in and take them out.

## Importing

Bring an existing collection of Markdown notes into Noteriv — an Obsidian vault, a folder of notes, or a zip of them.

- **File → Import folder / zip…** adds the notes to the current vault.
- **File → Import as New Vault…** creates a new vault from them. (Also in the vault switcher: **Import folder / zip…**.)

Pick a folder or a `.zip` file. Noteriv then:
- keeps the folder structure;
- uploads images, PDFs, audio and other files the notes use as [attachments](./attachments-and-trash.md), and updates the notes' links to them (files over 25 MB are skipped and listed);
- rebuilds the links between notes, so `[[wiki-links]]` and backlinks work straight away;
- asks what to do **if a note already exists at the same path**: skip it or overwrite it.

Hidden folders such as `.obsidian` or `.git` are not imported.

## Exporting a vault

**File → Export Vault (.zip)** downloads the whole vault as a zip: every note as a `.md` file in its folder, with the attachments. The zip opens in any Markdown editor or in Obsidian, and can be imported back into Noteriv.

## Downloading all your data

On **Your vaults**, **Download all my data (JSON)** downloads everything your account holds — profile, vaults, notes, folders and settings — in one JSON file.

## Keeping a vault in Git

For a continuous copy rather than a one-off export, connect the vault to a Git repository (GitHub, GitLab, Gitea, Forgejo…) or a WebDAV server: every change is then kept there too. See [Sync](../sync/index.md). **New vault from GitHub…** creates a vault from an existing repository.

## PDF and HTML

To share a single note, use **File → Download PDF** (or **Preview PDF**, **Print…**) or **Publish preview** in the note's toolbar, which makes a static HTML page. See [View mode](../editor/view-mode.md#printing-and-export).

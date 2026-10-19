---
title: FAQ
order: 99
---

# Frequently Asked Questions

## What is Noteriv?

A Markdown note-taking app that runs in your browser, installs on your phone or computer like an app, and has a desktop app as well. Notes are linked with `[[wiki-links]]`, tagged, searched and queried, and can be kept in a Git repository or on a WebDAV server. See the [documentation home](index.md).

## How do I get an account?

Noteriv is in a trial phase: sign-up needs an invite code. With one, choose **Sign up** on the sign-in page. See [Signing up and installing](getting-started/installation.md).

## I forgot my password

Choose **Forgot password?** on the sign-in page and follow the link we email you. See [Your account](getting-started/account.md#forgot-your-password).

## Where are my notes stored?

On the web, in your account on the Noteriv server: each note is a Markdown text, attachments are stored as files. Vaults you open on a device are also kept on that device for [offline use](features/offline.md). In the [desktop app](desktop.md), a vault is a folder on your computer.

## Can I get my notes out?

Always, in plain Markdown:
- **File → Export Vault (.zip)** downloads a vault as `.md` files in folders, with attachments;
- **Download all my data (JSON)** on the vault list downloads everything in your account;
- [Git sync](sync/git-sync.md) keeps a continuous copy in a repository you own.

See [Import and export](features/import-export.md).

## Can I bring my notes from Obsidian (or another Markdown app)?

Yes: **File → Import folder / zip…** or **Import as New Vault…**. Folders, links and attachments come along. See [Import and export](features/import-export.md).

## Is there a mobile app?

Yes — install the web app on your phone from the browser (Android: **Install app** in Chrome's menu; iPhone: **Add to Home Screen** in Safari). It opens full screen, has a phone layout, and offers **Quick note** from its icon. See [Phone and tablet](mobile/index.md).

## Does Noteriv work offline?

For what you have opened on the device: vaults and recently opened notes can be read and edited without a connection, and edits are sent when you are back online. Creating, renaming and deleting notes, settings and sync need a connection. See [Offline use](features/offline.md).

## What happens if the same note is edited in two places?

Nothing is overwritten. Your later save is kept as a conflict copy next to the note, with a banner to compare the two, keep one or keep both. See [Conflicts](features/conflicts.md).

## What sync options are there?

Git (GitHub, GitLab, Gitea, Forgejo, Bitbucket…) and WebDAV (Nextcloud, ownCloud…), set up in **Settings → Sync** and run by the server — automatically, on save, or by hand. Sync is optional: your notes are on every device you sign in from anyway. See [Sync](sync/index.md).

## Can I share a vault with someone?

Not yet: a vault belongs to one account. [Live collaboration](features/collaboration.md) keeps a note in step between your own devices and tabs today.

## Can I install plugins?

Yes. Seventeen [core plugins](features/core-plugins.md) ship with the app and are switched in **Settings → Core plugins**. [Community plugins](plugins/index.md) are installed from the plugin manager and run in a sandbox with the permissions you grant.

## Can I change how it looks?

Ten built-in themes, accent colours, community and custom themes, and CSS snippets. See [Themes](themes/index.md).

## Can I use it in Vietnamese?

Yes. The interface follows your browser's language (English or Vietnamese); choose one in **Settings → General → Language**. See [Language](features/language.md).

## Does Noteriv have Vim mode?

Yes: **Settings → Editor → Vim mode**. See [Vim mode](editor/vim-mode.md).

## What are the keyboard shortcuts?

The essentials: `Ctrl+K` Quick Open, `Ctrl+Shift+P` command palette, `Ctrl+N` new note, `Ctrl+Shift+F` search, `Ctrl+E` editor mode, `Ctrl+,` settings (`Cmd` on a Mac). All of them, and how to change them: [Keyboard shortcuts](getting-started/keyboard-shortcuts.md).

## What if I delete a note by accident?

It goes to the **Trash** (ribbon → More tools), where it can be restored for 30 days. Earlier versions of a note are kept too: **File Recovery** in the note's toolbar, or the time scrubber (`Ctrl+Shift+H`). See [Attachments and trash](features/attachments-and-trash.md) and [File recovery](features/file-recovery.md).

## What is Dataview?

A core plugin (off by default) that queries your notes like a database from a `dataview` code block — tables, lists and task views by folder, tag or frontmatter. See [Dataview](features/dataview.md).

## How do flashcards work?

Write `Q:` / `A:` pairs or `{{cloze}}` deletions in your notes; the Flashcards core plugin schedules reviews with the SM-2 spaced-repetition algorithm. See [Flashcards](features/flashcards.md).

## What is the MCP server?

A small program that lets AI assistants (Claude, Cursor…) read, search and write the Markdown notes of a vault folder on your computer — a desktop-app vault, or a Git clone of a synced vault. It does not connect to the web app. See [MCP server](mcp/index.md).

## Is Noteriv open source?

Yes, under the MIT license. The source, including the web app, its server, the desktop app and the shared packages, is in the project's repository. See [Contributing](contributing.md).

## Can I run my own Noteriv server?

The web app and its server are in the repository (`web/` and `web/server/`) and are deployed with Docker Compose (`web/infra/docker-compose.prod.yml`). There is no step-by-step self-hosting guide in English yet; the operations notes in `docs/ops/` (Vietnamese) describe deployment, backups and monitoring.

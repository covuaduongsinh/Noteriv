---
title: Android App
order: 2
---

# Android App

Besides the web app installed to the home screen, Noteriv has an Android app. It works like the [desktop app](../desktop.md): **a vault is a folder on the phone**, with no account or server, and it syncs with a Git repository (GitHub, GitLab or Gitea/Forgejo), the same repository the web or desktop app can sync with.

There is no app store listing yet. The app is installed from an APK file.

## Installing

1. Download `noteriv-<version>.apk` from a [GitHub release](https://github.com/covuaduongsinh/Noteriv/releases) named "Noteriv Android …".
2. Open it on the phone. Android asks to allow installing apps from this source (the browser or the file manager) the first time.
3. Install. Later versions install over it and keep your vaults.

Every release is signed with the same Noteriv key, so an update installs over the previous version. A build signed differently (for example a debug build you made yourself) must be uninstalled first, which removes its vaults from the phone. Sync them before that.

## First start

The setup screen asks for a vault name and, optionally, connects it to GitHub: pick an existing repository or create a new one. A new vault can start with the **getting started notes** (on by default). They are not added when you connect a repository that already has notes.

GitLab and Gitea/Forgejo are set up afterwards in **Settings → Git Sync**, with the repository address and an access token.

## Sync

- Sync runs when the vault opens, every minute while the app is open, and from **Settings → Git Sync → Sync Now**.
- A note edited on both sides keeps both versions: yours stays in place, the other one is saved next to it as `name (conflict 2026-10-26 0930).md`, the same name the web and desktop apps use, so the web app lists it as a conflict.
- Deleting or renaming a note on the phone deletes or renames it in the repository too, unless someone edited it there in the meantime: then the edit wins and the note comes back.
- Notes deleted from the notes list go to **Trash** (folders too) and can be restored from there.
- Only notes (`.md`) are synced. Images and other attachments are not, yet.

## Quick note

Tap the ⚡ button at the top of the notes list, or press and hold the app icon and choose **Quick note**. Type, then **Save**: the note goes into the **Inbox** folder (change the folder below the text box), named after its first line, as on the web.

## Language

The app follows the phone's language (English or Vietnamese). **Settings → General → Language** chooses one explicitly.

## Core plugins

**Settings → Core plugins** turns the built-in plugins on or off for the vault, with the same list as the web and desktop apps. Some have no phone version yet (canvas, drawing, PDF viewer, vault insights, audio recorder, views, footnotes, unique note): the switch is kept and applies when the feature arrives.

## Not on the phone yet

Canvas and drawing, PDF viewing, audio recording, real-time collaboration, attachments in sync, and iPhone.

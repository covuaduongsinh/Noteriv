---
title: Offline Use
order: 17
---

# Offline Use

Noteriv keeps working when the connection drops — on a train, on a plane, on bad Wi-Fi — for the vaults and notes you have opened on that device.

## What works offline

- **Opening the app.** An [installed](../getting-started/installation.md#install-it-like-an-app) Noteriv opens without a connection; so do pages you have visited before in the browser.
- **Your vault list and vaults** you have opened on this device, with their file tree, open tabs, theme and community plugins.
- **Reading and editing notes** you have opened recently on this device — up to about 300 notes (25 MB of text); the least recently used ones are dropped first.
- **Quick note** keeps your text on the device and saves it by itself once you are back online.

A banner at the top says **Offline — showing what this device kept**.

## What needs a connection

- Opening a note you have never opened on this device. Noteriv says so: open it once while online to have it offline later.
- Creating, renaming, moving and deleting notes and folders; settings; plugins; sync; importing and exporting. Noteriv shows "This needs a connection".
- Signing out (the session lives on the server).

## Editing offline

When you edit a note without a connection:

1. The status bar shows **Kept on this device**: the edit is stored on the device, so closing the tab or reloading the page does not lose it.
2. When the connection comes back, Noteriv sends the edit by itself — straight away when the browser reports it is online, and otherwise every 15 seconds. The **vault list** also sends edits waiting for any of your vaults when it opens.
3. The status bar returns to **saved** and the banner disappears.

If the same note was changed somewhere else in the meantime (on another device, by sync), your offline edit does not overwrite it: it becomes a **conflict copy** next to the note. See [Conflicts](./conflicts.md).

## Signing out with unsent edits

Signing out clears everything Noteriv kept on the device. If edits made offline have not reached the server yet, **Sign out** first tells you how many, and you have to click it again to sign out anyway.

## Privacy

What Noteriv keeps for offline use stays in the browser's storage on that device and belongs to the account that stored it: it is cleared when you sign out, delete your account, or when a different account signs in on that browser. In a private window, or if the browser refuses storage, Noteriv simply works online only.

## Tips

- Before a trip, open the notes you will need once while online.
- [Install Noteriv](../mobile/index.md) on your phone so it opens offline from its icon.

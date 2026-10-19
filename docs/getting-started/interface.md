---
title: Interface
order: 5
---

# Interface

A vault page has six parts: the title bar, the tab bar, the ribbon, the file sidebar, the editor, and the status bar. On a phone the layout changes; see [the phone layout](#on-a-phone) below.

## Title bar

From left to right:

- **Sidebar toggle** — shows or hides the file sidebar (`Ctrl+B`).
- **Vault switcher** — the vault's name; opens the list of your vaults with rename, delete, **New vault**, **New vault from GitHub…** and **Import folder / zip…**. See [Vaults](vaults.md).
- **App menu** — **File**, **Edit**, **View**, **Plugin**, **Settings**, **Developer**. Every menu item is also a command in the command palette and shows its shortcut.
- **Path** of the open note, in the middle.
- **Edit / View / Source** — the editor mode of the open note (`Ctrl+E` cycles through them). See [Editor](../editor/index.md).

## Tab bar

Every open note has a tab. Click to switch, drag to reorder, `Ctrl+W` or the tab's × to close. Right-click a tab to pin it, close it, close the others or those to its right, close all, or open it in a split on the right. The **+** at the end creates a new note. Open tabs are remembered per vault: reloading the page or opening the vault on another device brings them back.

## Ribbon

The narrow bar of icons on the left. From the top:

- **Quick Open** (`Ctrl+K`), **New note** (`Ctrl+N`), **Command palette** (`Ctrl+Shift+P`), **Search in vault** (`Ctrl+Shift+F`);
- **Outline**, **Tags**, **Bookmarks** panels;
- buttons added by core plugins that are on — Calendar, Today's note, Graph, Flashcards, New from template, and so on.

At the bottom:

- **More tools (⋯)** — **Attachments**, **Themes**, **CSS Snippets**, **Trash**;
- **Git / WebDAV sync** — turns yellow when a sync needs attention;
- **Plugins** — the plugin manager;
- **Settings** (`Ctrl+,`).

## File sidebar

The vault's folders and notes. Click a note to open it; double-click a name or press `F2` to rename. Drag notes and folders to move them; drag onto a folder name to move into it.

Right-click for **New File**, **New Folder**, **Rename**, **Delete** (to the trash) and **Copy Path**. The **+** button at the top creates a note. Drag the sidebar's right edge to resize it; double-click the edge to reset.

Deleted notes go to the **Trash** (ribbon → More tools), where they can be restored or deleted permanently. See [Attachments and trash](../features/attachments-and-trash.md).

## Editor

The open note. Above the text:

- the **note toolbar** — the note's path and buttons for **Bookmark this note**, **Backlinks**, **Collaboration**, **Download PDF**, **Publish preview**, **File Recovery**, plus buttons of core plugins;
- **Add properties** — the note's frontmatter, edited as a form (see [Frontmatter](../reference/frontmatter.md));
- the **formatting toolbar** in Live mode (see [Formatting toolbar](../editor/formatting-toolbar.md)).

Panels such as Outline, Tags, Bookmarks and Backlinks open on the right of the editor. With no note open, the editor shows shortcuts to create a note, connect sync, import notes or install plugins.

## Status bar

Along the bottom, while a note is open:

- the editor mode, the vault and the note's path;
- the save state — **saved**, **unsaved** (a save is pending), **Kept on this device** (no connection: the edit is stored on this device and sent later, see [Offline use](../features/offline.md)) or **Not saved — retrying** (the server refused the save; it is retried);
- line and character counts, plus items added by core plugins (word count, for example);
- the sync state (`Git: not connected`, the time of the last sync, or an error); click it to open sync settings.

## On a phone

At phone width (600 px and narrower):

- the ribbon becomes a **bar along the bottom** of the screen; **More tools (⋯)** opens above it;
- the file sidebar becomes a **drawer** over the note: open it with the sidebar toggle in the title bar; tapping beside it or opening a note closes it;
- the note's toolbar buttons scroll sideways, and side panels take the full width.

See [Phone and tablet](../mobile/index.md).

## Zen and focus modes

- **Zen mode** (`Ctrl+Shift+Z`, or **View → Zen Mode**) hides everything but the note; `Esc` brings the interface back.
- **Focus mode** (**View → Focus Mode**) dims every line except the one you are writing.

See [Focus and zen modes](../editor/focus-mode.md).

## Customising

- **Settings → Appearance** — accent colour; **Settings → Editor** — font, font size, line height, tab size, spell check, Vim mode.
- **Settings → Shortcuts** — change any keyboard shortcut.
- **Themes** and **CSS Snippets** (ribbon → More tools, or **Settings → Ecosystem**) — see [Themes](../themes/index.md).

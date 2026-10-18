---
title: Command Palette
order: 8
---

# Command Palette

The command palette is a searchable launcher for every action in Noteriv. Instead of remembering keyboard shortcuts or hunting through menus, you type what you want to do and the palette finds the matching command.

## Opening the Palette

Press `Ctrl+Shift+P` (`Cmd+Shift+P` on a Mac) or `F1`, or choose **Command palette** in the ribbon. The palette opens as a centered overlay with a text input at the top and a scrollable list of commands below.

## Layout

The palette consists of three visual sections:

### Search Input

A text field with a menu icon on the left. As you type, the command list filters instantly. The filter matches against the command's label, category, and internal action name, so you can find a command by any of these attributes.

### Recent Commands

When the search field is empty, the top of the command list shows a "Recent" section containing the commands you used most recently. This lets you repeat frequent actions with just two keystrokes: `Ctrl+Shift+P` then `Enter`.

Recent commands are remembered on the device. The most recently executed command appears first.

### Command List

Below the recent section (or filling the entire list when a filter is active), commands are grouped by category. Each group has a category header (e.g., "File", "Navigation", "Formatting", "View", "Edit", "Sync") followed by the commands in that category.

Each command row shows:

- **Label.** The human-readable name of the command (e.g., "Toggle Bookmark", "Insert Template").
- **Keyboard shortcut.** Displayed on the right side of the row, formatted for your platform. On macOS, `Ctrl` is shown as the command symbol. Commands without a shortcut show no badge.

## Navigation

| Key | Action |
|---|---|
| Type | Filter the command list |
| `Up` / `Down` | Move the selection highlight |
| `Enter` | Execute the selected command |
| `Esc` | Close the palette |
| Click | Execute the clicked command |
| Hover | Move the selection highlight |

The selection highlight starts at the top of the list. When you execute a command, the palette closes automatically and the command runs.

## Available Commands

The palette lists every command of the app, plus those added by the [core plugins](./core-plugins.md) that are on and by community plugins. The built-in commands, by category (shortcuts are the defaults):

### File

| Command | Shortcut |
|---|---|
| Save now | `Ctrl+S` |
| New Note | `Ctrl+N` |
| Close Tab | `Ctrl+W` |
| Close All Tabs | `Ctrl+Shift+W` |
| Close Other Tabs | |
| Pin/Unpin Tab | `Ctrl+Shift+T` |
| Toggle Bookmark | `Ctrl+Shift+B` |
| Open Trash | |
| Preview PDF / Download PDF / Print… | |
| Import folder / zip into this vault… | |
| Import folder / zip as a new vault… | |
| New vault from GitHub repo… | |
| Export vault as zip | |

### Navigation and search

| Command | Shortcut |
|---|---|
| Quick Open | `Ctrl+K` |
| Command Palette | `Ctrl+Shift+P` or `F1` |
| Find in Vault | `Ctrl+Shift+F` |
| Open Random Note | |

### View

| Command | Shortcut |
|---|---|
| Toggle Sidebar | `Ctrl+B` |
| Cycle Edit/View/Source | `Ctrl+E` |
| Settings | `Ctrl+,` |
| Toggle Outline | `Ctrl+Shift+O` |
| Toggle Tag Pane / Toggle Backlinks / Toggle Collaboration | |
| Split Editor / Close Split | `Ctrl+\` / `Ctrl+Shift+\` |
| Zen Mode (hide all chrome) | `Ctrl+Shift+Z` |
| Focus Mode (dim other lines) | |

### Formatting

| Command | Shortcut |
|---|---|
| Italic | `Ctrl+I` |
| Inline Code | ``Ctrl+` `` |
| Bold, Strikethrough, Insert Link, Insert Image, Blockquote, Code Block, Task List, Insert Table, Horizontal Rule | |

### Sync and ecosystem

| Command | Shortcut |
|---|---|
| Sync Now | `Ctrl+Shift+G` |
| Sync Settings (Git / WebDAV) | |
| Plugin Manager, Themes, CSS Snippets | |

### Developer

| Command | Shortcut |
|---|---|
| Reload page (saves first) | |
| Diagnostics (server, sync, plugins)… | |
| Open browser developer tools (F12) | |

## Filtering Behavior

The filter is case-insensitive and matches against three fields simultaneously:

1. **Label** -- the display name (e.g., "Toggle Bookmark").
2. **Category** -- the group name (e.g., "File", "View").
3. **Action** -- the internal identifier (e.g., "toggleBookmark").

This means typing "sync" shows "Sync Now" (matches the label and category), and typing "pdf" shows "Preview PDF" and "Download PDF".

If no commands match the filter, the palette displays "No commands found".

## Customizing Shortcuts

Keyboard shortcuts for commands can be changed in **Settings → Shortcuts**. Your changes belong to your account and apply on every device. The command palette always shows the current effective shortcut, whether it is the default or a custom one.

## Tips

- **Use the palette as a learning tool.** Browse the full list with an empty query to discover commands you did not know existed.
- **Let recent commands work for you.** If you keep inserting templates, the "Templates: insert template" command will stay at the top of the recent list, making it a two-key operation.
- **Search by category.** Typing "format" shows all formatting commands grouped together.
- **Pair with shortcuts.** Once you find yourself using a command frequently via the palette, note its keyboard shortcut and start using that instead for speed.

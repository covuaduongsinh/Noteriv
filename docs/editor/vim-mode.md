---
title: Vim Mode
order: 7
---

# Vim Mode

Noteriv includes full Vim keybinding support through the [`@replit/codemirror-vim`](https://github.com/replit/codemirror-vim) package, which implements a Vim emulation layer on top of CodeMirror 6. When enabled, the editor behaves like Vim with Normal, Insert, and Visual modes, giving you access to the modal editing workflow that Vim users rely on for efficient text manipulation.

## Enabling Vim Mode

Open **Settings → Editor** and turn **Vim mode** on. It applies at once to the editor in Live mode (Source and View modes keep the standard keys). Turn it off the same way.

The cursor shape shows the mode: a block in Normal mode, a bar in Insert mode.

## Modes

### Normal Mode

Normal mode is the default state when Vim mode is active. Keystrokes are interpreted as commands rather than text input. You can navigate, delete, copy, paste, and manipulate text without modifier keys. Press `Escape` from any other mode to return to Normal mode.

The cursor appears as a block cursor in Normal mode, positioned on a character rather than between characters, matching standard Vim behavior.

### Insert Mode

Insert mode allows you to type text normally, just like the editor behaves without Vim mode. Enter Insert mode with any of the standard Vim insert commands:

| Key | Action |
|---|---|
| `i` | Insert before cursor |
| `I` | Insert at beginning of line |
| `a` | Append after cursor |
| `A` | Append at end of line |
| `o` | Open new line below |
| `O` | Open new line above |
| `s` | Substitute character (delete and enter insert) |
| `S` | Substitute line (delete line and enter insert) |
| `c{motion}` | Change (delete motion and enter insert) |
| `C` | Change to end of line |

The cursor changes to a thin line cursor in Insert mode. Press `Escape` or `Ctrl+[` to return to Normal mode.

### Visual Mode

Visual mode lets you select text for operations. There are three variants:

| Key | Action |
|---|---|
| `v` | Character-wise visual mode |
| `V` | Line-wise visual mode |
| `Ctrl+V` | Block (column) visual mode |

In visual mode, the selection is highlighted and you can extend it with any motion command. Apply an operator (`d` to delete, `y` to yank, `c` to change, `>` to indent, `<` to unindent) to act on the selection.

### Command-Line Mode

Press `:` in Normal mode to enter command-line mode; a command input appears at the bottom of the editor. The commands are those of the Vim emulation library, for example:

| Command | Action |
|---|---|
| `:{number}` | Jump to line number |
| `:%s/old/new/g` | Find and replace across the note |
| `:s/old/new/g` | Find and replace on the current line |
| `:noh` | Clear search highlighting |

Noteriv adds no file commands: `:w` is not needed (notes save themselves), and tabs are closed with `Ctrl+W` or the tab's ×.

## Registers and Marks

- **Registers**: `"a` through `"z` for named registers, `"0` for the yank register, `""` for the default register. Use `"{register}{operator}` to specify a register.
- **Marks**: `m{a-z}` to set a mark, `` `{a-z} `` to jump to a mark's exact position, `'{a-z}` to jump to the beginning of the marked line.

## Macros

Record macros with `q{register}` and play them back with `@{register}`. Repeat the last macro with `@@`. Macros can include any sequence of Normal mode commands, motions, and Insert mode text entry.

## Interaction with Noteriv Features

Vim mode works alongside Noteriv's own shortcuts:

- **Command palette** — `Ctrl+Shift+P` (or `F1`) from any Vim mode.
- **Quick Open** — `Ctrl+K`.
- **Split editor** — `Ctrl+\` and `Ctrl+Shift+\`.
- **Live rendering** — lines away from the cursor stay rendered; the cursor line shows raw Markdown.
- **Links** — clicking a rendered `[[wiki-link]]` opens the note, as without Vim.

## Limitations

The Vim emulation is extensive but not identical to full Vim:

- **Vimscript**: Vimscript (`.vimrc`) is not supported. Configuration is done through Noteriv's settings.
- **Plugins**: Vim plugins are not supported. Features like surround, commentary, etc. are not available unless Noteriv implements them natively.
- **Ex commands**: Only a subset of Ex commands (`:s`, `:noh`, line jumps…) is implemented; there are no file commands.
- **Split commands**: `:sp` and `:vsp` are not supported. Use Noteriv's split editor instead.
- **Terminal**: `:terminal` is not available.

---
title: Daily Notes
order: 4
---

# Daily Notes

A daily note is one note per day — a journal, a log, a place for the day's tasks and ideas. Daily notes come with the **Calendar and daily notes** [core plugin](./core-plugins.md), which is on by default.

## Opening today's note

- Press `Ctrl+D` (`Cmd+D` on a Mac),
- choose **Daily note** in the ribbon,
- or run **Open today's daily note** from the command palette.

If today's note does not exist yet, it is created with the date as its heading. Opening it again the same day opens the same note.

## Where daily notes live

Daily notes are named by date, `YYYY-MM-DD.md`, in a folder called **Daily** at the root of the vault (created on first use):

```
Daily/
  2026-10-18.md
  2026-10-19.md
```

They are ordinary notes: rename, move, link and tag them like any other.

## The calendar

**Calendar view** in the ribbon (or **Calendar: open** in the command palette) opens a month calendar in a tab:

- days with a daily note are marked; double-click a day to open its note, or to create it;
- **tasks with a due date** are counted on their day and listed under the calendar. A task gets a due date with `@due(2026-10-25)` on its line — `- [ ] Send the report @due(2026-10-25)` — and a note gets one with `due: 2026-10-25` in its frontmatter;
- move between months with the arrows, or jump back to today.

## A daily template

To start every daily note with the same structure, make a [template](./templates.md) — for example `Templates/Daily.md`:

```markdown
# {{date}}

## Tasks
- [ ]

## Notes
```

Open today's note with `Ctrl+D`, then insert the template with `Ctrl+Alt+T`.

## Reviewing past days

- **Quick Open** (`Ctrl+K`) and type part of a date: `2026-10` lists October's notes.
- **Search in vault** (`Ctrl+Shift+F`) finds text across all of them.
- With [Dataview](./dataview.md) on, a query collects them:

````markdown
```dataview
TABLE mood FROM "Daily" WHERE mood != "" SORT BY file.name DESC LIMIT 30
```
````

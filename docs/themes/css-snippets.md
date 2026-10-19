---
title: CSS Snippets
order: 3
---

# CSS Snippets

CSS snippets let you fine-tune the visual appearance of Noteriv beyond what themes control. A snippet is a small CSS file that overrides specific styles. You can toggle individual snippets on and off without affecting each other, making it easy to experiment with visual changes.

## How Snippets Work

Snippets belong to the vault and are stored with it on the server, so they apply on every device. Manage them in the **CSS Snippets** window: ribbon → **More tools ⋯** → **CSS Snippets**, **Settings → Ecosystem → CSS Snippets**, or the command palette. When a snippet is enabled, its CSS is injected into the application's `<head>` as a `<style>` element. This means snippets can override any CSS rule in the interface, from font sizes and spacing to hiding UI elements entirely.

Snippets are applied after the theme, so they take precedence over theme styles. Multiple enabled snippets are applied in alphabetical order by name.

## Creating a Snippet

1. Open the **CSS Snippets** window.
2. Choose **New Snippet** and enter a name (e.g. "Wider Editor").
3. Write your CSS in the editor and choose **Save**.

> **Desktop app:** snippets are `.css` files in the vault's `.noteriv/snippets/` folder; you can also create them there.

## Enabling and Disabling Snippets

The **Installed** tab of the **CSS Snippets** window lists the vault's snippets, each with a toggle switch. Enable a snippet to apply it immediately; disable it to remove its styles.

## Example Snippets

### Wider Editor

Make the editor content area wider by adjusting the max-width:

```css
/* Wider editor content */
.editor-container {
  max-width: 900px;
}

.cm-editor .cm-content {
  max-width: 900px;
}
```

### Custom Code Font

Change the font used in code blocks and the source editor:

```css
/* Use a different monospace font */
.cm-editor,
pre code,
code {
  font-family: 'Fira Code', 'JetBrains Mono', monospace;
}
```

### Larger Headings

Increase the size of headings in the preview:

```css
/* Bigger headings in preview */
.markdown-preview h1 { font-size: 2.4em; }
.markdown-preview h2 { font-size: 1.9em; }
.markdown-preview h3 { font-size: 1.5em; }
```

### Hide Status Bar

Remove the status bar at the bottom of the window:

```css
/* Hide the status bar */
.status-bar {
  display: none !important;
}
```

### Rounded Callouts

Add rounded corners to callout blocks:

```css
/* Rounded callout boxes */
.callout {
  border-radius: 12px;
  overflow: hidden;
}
```

### Custom Scrollbar

Style the scrollbar to be thinner:

```css
/* Thin scrollbar */
::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-thumb {
  border-radius: 3px;
}
```

### Dimmer Sidebar

Reduce the brightness of the sidebar relative to the editor:

```css
/* Subdued sidebar */
.sidebar {
  opacity: 0.85;
}

.sidebar:hover {
  opacity: 1;
}
```

## Using Theme Variables

Snippets can reference the current theme's CSS custom properties. This makes your snippets compatible with any theme:

```css
/* Use theme colors in custom styles */
.my-custom-element {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border);
}

.my-custom-element:hover {
  background: var(--accent);
  color: var(--bg-primary);
}
```

Available CSS variables from the active theme:

| Variable | Purpose |
|---|---|
| `--bg-primary` | Main background |
| `--bg-secondary` | Panel backgrounds |
| `--bg-tertiary` | Hover/active backgrounds |
| `--border` | Borders and dividers |
| `--text-primary` | Main text |
| `--text-secondary` | Secondary text |
| `--text-muted` | Muted text |
| `--accent` | Accent color (set by accent color picker) |
| `--green`, `--red`, `--yellow`, `--blue` | Semantic colors |
| `--mauve`, `--peach`, `--teal`, `--pink` | Additional accent colors |
| `--scrollbar`, `--scrollbar-hover` | Scrollbar colors |

## Community Snippets

The [NoterivSnippets](https://github.com/thejacedev/NoterivSnippets) repository hosts a curated collection of community-contributed CSS snippets. You can browse and install them from Settings:

Open the **Community** tab of the **CSS Snippets** window, preview a snippet and choose **Install**. Installed snippets are stored with the vault like your own, and you can edit them afterwards.

Community snippets are organized by category:

| Category | Examples |
|---|---|
| Editor | Wider editor, line spacing, custom cursor |
| Typography | Custom fonts, heading sizes, paragraph spacing |
| Sidebar | Compact file tree, colored folders, icon tweaks |
| Preview | Callout styles, table formatting, image borders |
| UI | Hidden elements, custom status bar, tab styling |

To contribute a snippet to the community repository, follow the contributing guidelines in the repository.

## Editing Snippets

To edit an existing snippet:

1. Open the **CSS Snippets** window.
2. Choose **Edit snippet** next to the snippet.
3. Modify the CSS in the editor.
4. Click **Save**.

Changes apply immediately if the snippet is enabled.

## Deleting Snippets

To delete a snippet:

1. Open the **CSS Snippets** window.
2. Choose **Delete** next to the snippet.

The change takes effect immediately.

## Order of Application

Styles are applied in this order:

1. **Base styles** -- Noteriv's built-in CSS.
2. **Theme** -- The active theme's CSS custom properties.
3. **Accent color** -- The selected accent color override.
4. **CSS snippets** -- Enabled snippets in alphabetical order by name.

Because snippets come last, they can override anything. Use `!important` only when necessary, as it can make it harder to override your snippet with another one.

## Tips

- Keep snippets small and focused. One snippet per visual change makes it easy to toggle individual tweaks.
- Name your snippets descriptively: "Wider editor" is better than "fix".
- Test snippets with multiple themes to make sure they look good everywhere. Use `var(--bg-primary)` instead of hard-coded colors.
- If a snippet causes visual issues, disable it in the **CSS Snippets** window. If a snippet hides the ribbon, open the window from the command palette (`Ctrl+Shift+P` → "CSS Snippets").

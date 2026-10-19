---
title: Web Clipper
order: 19
---

# Web Clipper

Save the web page you are reading — or just the part you selected — into a vault, as a Markdown note.

The web clipper is a **bookmarklet**: a bookmark in your browser's bookmarks bar that, when clicked, sends the page to Noteriv. It works in any desktop browser without installing an extension.

## Setting it up

1. Open the vault you want clippings to go to.
2. Open **Settings → Clipper**.
3. Under **New bookmarklet**, give it a name (for example the browser or device it is for) and choose **Create**.
4. Drag the button that appears to your browser's bookmarks bar (or right-click it → add to bookmarks).

The bookmarklet carries a personal token that can only add notes to that one vault. The token is shown only at this moment; if you lose the bookmarklet, create a new one.

Make one bookmarklet per browser or device, so each can be revoked on its own. A vault can have up to 20.

## Clipping

1. On the page you want to keep, select the part to save — or select nothing to save the main article.
2. Click the bookmarklet in your bookmarks bar.
3. A small message on the page says **Saved to Noteriv**.

The note lands in the vault's **Clippings** folder (created on first use), named after the page title. It starts with the source address and the time it was clipped in its frontmatter, then the page title as a heading and the content converted to Markdown.

## Managing bookmarklets

**Settings → Clipper** lists the vault's active tokens, when each was last used, and a **Revoke** button (click twice to confirm). A revoked bookmarklet stops working at once.

## When it does not work

Some websites block pages from sending data elsewhere (a strict content security policy). The bookmarklet then shows "Could not reach Noteriv". Copy the text by hand, or use [Quick note](../mobile/index.md#quick-note).

> **Desktop app:** the repository's `extension/` folder holds a browser extension that clips to the desktop app running on the same computer; see [Desktop app](../desktop.md).

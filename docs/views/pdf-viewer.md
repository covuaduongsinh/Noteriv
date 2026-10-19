---
title: PDF Viewer
order: 7
---

# PDF Viewer

Noteriv includes a built-in PDF viewer that opens PDF files inline, directly inside the application. You can read documents, highlight text, add underlines, write text notes, and export all your annotations to a Markdown file with page references. This eliminates the need to switch to an external PDF reader and makes it easy to integrate PDF reading into your note-taking workflow.

## Opening PDFs

PDFs are [attachments](../features/attachments-and-trash.md) of the vault. Add one in the attachment manager (ribbon → **More tools ⋯** → **Attachments**), then click it there: it opens full screen in the PDF viewer. Close the viewer to come back to your notes.

The viewer comes with the **PDF viewer** [core plugin](../features/core-plugins.md), on by default.

PDFs are rendered using [pdf.js](https://mozilla.github.io/pdf.js/), the same engine used by Firefox for its built-in PDF reader. This provides high-fidelity rendering for text, vector graphics, and embedded images.

## Navigation

### Page Scrolling

The PDF is rendered as a continuous vertical scroll of pages. Scroll down to move through the document, just as you would in any PDF reader. A page counter in the toolbar shows your current page and the total page count (e.g., "Page 14 of 42").

### Zoom

Two zoom buttons in the toolbar let you increase or decrease the rendering scale:

- **Zoom in**: Increases the scale by 0.25 per click, up to a maximum of 4x.
- **Zoom out**: Decreases the scale by 0.25 per click, down to a minimum of 0.25x.

The default zoom is 1x (100%), which maps one PDF point to one screen pixel. At 2x, text is large and sharp, suitable for close reading. At 0.5x, you get an overview of the page layout.

## Annotation Tools

The annotation toolbar provides three tools for marking up the PDF:

### Highlight

Select the highlight tool, then click and drag over text to create a colored highlight. The selected text is captured and stored with the annotation. Four highlight colors are available:

| Color | Use Case |
|---|---|
| Yellow | General highlights, key points |
| Green | Agreement, positive notes |
| Blue | References, citations |
| Pink | Questions, items needing review |

Choose the color from the toolbar before creating the highlight. The color can be changed after creation by selecting the annotation and picking a new color.

### Underline

The underline tool works like the highlight tool but draws a colored line under the selected text instead of a filled background. It uses the same four-color palette. Underlines are useful for marking important phrases without obscuring the text with a background color.

### Text Note

The text note tool lets you place a note marker anywhere on a page. Click a location on the page to create a note pin. A text input appears where you can type your comment. The note stores both the selected text (if any) and your comment. Notes are displayed as small icons on the page; click the icon to view or edit the comment.

## Annotation Data Model

Each annotation is stored as a `PDFAnnotation` object with the following fields:

- **id**: A unique identifier (`ann-{timestamp}-{random}`).
- **page**: The 1-based page number.
- **type**: One of `"highlight"`, `"underline"`, or `"note"`.
- **text**: The text content that was selected when the annotation was created.
- **comment**: An optional comment you wrote about the selected text.
- **color**: The hex color string for the annotation.
- **rect**: The bounding rectangle `{ x, y, w, h }` on the PDF page, in PDF coordinate units.
- **created**: A Unix timestamp (milliseconds) of when the annotation was created.

## Storage

Annotations are not written into the PDF. On the web they are stored with the PDF's attachment record on the server, as the list of annotations described above, so they are the same on every device and the original PDF is never modified.

> **Desktop app:** annotations are saved in a hidden file next to the PDF, `.name.pdf-annotations.json`.

## Exporting Annotations to Markdown

The "Export Annotations" button in the toolbar generates a Markdown note from all annotations in the current PDF. The exported file is saved next to the PDF with the name `{PDF name} - Annotations.md`.

The export groups annotations by type and includes page references:

```markdown
# Annotations: attention-is-all-you-need.pdf

## Highlights

> Attention is all you need -- (page 3)

The core thesis

> Multi-head attention allows the model to jointly attend to information from different representation subspaces -- (page 4)

## Underlines

> self-attention, sometimes called intra-attention -- (page 2)

## Notes

- Clarify relationship between encoder and decoder stacks (page 5)
  The diagram on this page is essential for the architecture overview.
```

Highlights and underlines are formatted as blockquotes with the annotated text and a page reference. Comments appear as regular text below the quote. Notes are formatted as list items with their page reference and comment.

This Markdown file is a regular vault file, so it participates in search, backlinks, and graph view like any other note.

## Loading and Saving

Annotations load when you open the PDF and are saved automatically whenever you create, change or delete one.

## Annotation Lifecycle

1. **Create**: Select a tool (highlight, underline, or note), interact with the PDF, and the annotation is created and saved immediately.
2. **View**: Annotations are rendered as overlays on the PDF pages. Highlights are semi-transparent rectangles, underlines are colored lines, and notes are icon markers.
3. **Edit**: Click an existing annotation to modify its comment or change its color.
4. **Delete**: Use the **Delete** button of the annotation in the annotations list.
5. **Export**: Use the Export button to generate a Markdown summary of all annotations.

## Limitations

- Annotations are stored per-PDF, per-vault. If the same PDF appears in multiple vaults, each vault has its own independent set of annotations.
- The PDF viewer is read-only with respect to the PDF content. You cannot edit the PDF text, add form fields, or sign documents.
- Text selection for highlights depends on the PDF having embedded text. Scanned documents without OCR will not allow text highlighting -- only positional note annotations.
- The viewer renders one page at a time in the visible viewport. Very large PDFs (1000+ pages) may be slow to navigate but do not consume excessive memory.
- Annotations are not part of [Git sync](../sync/git-sync.md); export them to a note if you want them in the repository.

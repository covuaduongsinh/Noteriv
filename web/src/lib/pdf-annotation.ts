/**
 * PDF Annotation utilities — types + markdown export. Ported from
 * desktop/src/lib/pdf-annotation.ts. Desktop persists annotations as a JSON
 * sidecar file next to the PDF on disk (`loadAnnotations`/`saveAnnotations`
 * via electronAPI); web has no filesystem, so the attachment's own
 * `metadata` column is the sidecar instead (see web/server/prisma/schema.prisma's
 * Attachment.metadata comment) — loading/saving goes through
 * webApi.attachments.list()/updateMetadata() in PDFViewer.tsx directly,
 * these two functions are no longer needed and are dropped. The pure
 * data shape + annotationsToMarkdown()/generateAnnotationId()/isPdfFile()
 * are unchanged.
 */

export interface PDFAnnotation {
  id: string;
  page: number;
  type: "highlight" | "note" | "underline";
  text: string;
  comment: string;
  color: string;
  rect: { x: number; y: number; w: number; h: number };
  created: number;
}

/** Generate a markdown note from a PDF's filename + its annotations */
export function annotationsToMarkdown(fileName: string, anns: PDFAnnotation[]): string {
  const sorted = [...anns].sort((a, b) => a.page - b.page || a.created - b.created);

  const highlights = sorted.filter((a) => a.type === "highlight");
  const notes = sorted.filter((a) => a.type === "note");
  const underlines = sorted.filter((a) => a.type === "underline");

  const lines: string[] = [];
  lines.push(`# Annotations: ${fileName}`);
  lines.push("");

  if (highlights.length > 0) {
    lines.push("## Highlights");
    lines.push("");
    for (const h of highlights) {
      lines.push(`> ${h.text} — (page ${h.page})`);
      if (h.comment) {
        lines.push("");
        lines.push(h.comment);
      }
      lines.push("");
    }
  }

  if (underlines.length > 0) {
    lines.push("## Underlines");
    lines.push("");
    for (const u of underlines) {
      lines.push(`> ${u.text} — (page ${u.page})`);
      if (u.comment) {
        lines.push("");
        lines.push(u.comment);
      }
      lines.push("");
    }
  }

  if (notes.length > 0) {
    lines.push("## Notes");
    lines.push("");
    for (const n of notes) {
      lines.push(`- ${n.text || n.comment} (page ${n.page})`);
      if (n.text && n.comment) {
        lines.push(`  ${n.comment}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/** Generate a unique annotation ID */
export function generateAnnotationId(): string {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Check if a filename is a PDF */
export function isPdfFile(filename: string): boolean {
  return /\.pdf$/i.test(filename);
}

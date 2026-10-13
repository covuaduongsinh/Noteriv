/**
 * Note Composer utilities — ported byte-for-byte from
 * desktop/src/lib/note-composer-utils.ts (100% pure, no electronAPI calls here).
 */

export function sanitizeFileName(heading: string): string {
  return (
    heading
      .replace(/[<>:"/\\|?*#]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\s/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 200) || "Untitled"
  );
}

export function mergeNotes(contents: { name: string; content: string }[], addHeadings: boolean): string {
  const parts: string[] = [];
  for (const { name, content } of contents) {
    if (addHeadings) {
      const displayName = name.replace(/\.(md|markdown)$/i, "");
      parts.push(`## ${displayName}`);
      parts.push("");
    }
    parts.push(content.trim());
    parts.push("");
  }
  return parts.join("\n").trimEnd() + "\n";
}

export function splitByHeadings(content: string, level: number): { title: string; content: string }[] {
  const lines = content.split("\n");
  const prefix = "#".repeat(level) + " ";
  const sections: { title: string; content: string }[] = [];

  let currentTitle = "";
  let currentLines: string[] = [];
  let foundFirst = false;

  for (const line of lines) {
    if (line.startsWith(prefix) && !line.startsWith(prefix + "#")) {
      if (foundFirst) {
        sections.push({ title: currentTitle, content: currentLines.join("\n").trim() });
      } else if (currentLines.some((l) => l.trim() !== "")) {
        sections.push({ title: "Preamble", content: currentLines.join("\n").trim() });
      }
      currentTitle = line.slice(prefix.length).trim();
      currentLines = [line];
      foundFirst = true;
    } else {
      currentLines.push(line);
    }
  }

  if (foundFirst) {
    sections.push({ title: currentTitle, content: currentLines.join("\n").trim() });
  } else if (currentLines.some((l) => l.trim() !== "")) {
    sections.push({ title: "Untitled", content: currentLines.join("\n").trim() });
  }

  return sections;
}

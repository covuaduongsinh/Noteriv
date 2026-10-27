import type { AiContextRef } from "./ai-types";

/**
 * Injects structured context XML references into user prompts.
 * Follows Claudian's Zero Context Bloat philosophy:
 * Sends pointers and selections only, letting the AI read full files via VFS tools when needed.
 */
export function buildPromptWithContext(userPrompt: string, context?: AiContextRef): string {
  if (!context) return userPrompt;

  const parts: string[] = [];

  if (context.activeNote) {
    const titleAttr = context.activeNote.title ? ` title="${escapeXml(context.activeNote.title)}"` : "";
    parts.push(`  <active_note path="${escapeXml(context.activeNote.path)}"${titleAttr} />`);
  }

  if (context.selection) {
    const linesAttr =
      context.selection.startLine !== undefined && context.selection.endLine !== undefined
        ? ` lines="${context.selection.startLine}-${context.selection.endLine}"`
        : "";
    parts.push(
      `  <editor_selection path="${escapeXml(context.selection.path)}"${linesAttr}>\n<![CDATA[${context.selection.text}]]>\n  </editor_selection>`
    );
  }

  if (context.mentionedNotes && context.mentionedNotes.length > 0) {
    parts.push("  <mentioned_notes>");
    for (const note of context.mentionedNotes) {
      const titleAttr = note.title ? ` title="${escapeXml(note.title)}"` : "";
      parts.push(`    <note path="${escapeXml(note.path)}"${titleAttr} />`);
    }
    parts.push("  </mentioned_notes>");
  }

  if (context.cursor) {
    parts.push(`  <editor_cursor path="${escapeXml(context.cursor.path)}" line="${context.cursor.line}" />`);
  }

  if (parts.length === 0) return userPrompt;

  return `${userPrompt.trim()}\n\n<context>\n${parts.join("\n")}\n</context>`;
}

/**
 * Extracts context XML block from prompt string if present, returning clean prompt and parsed context.
 */
export function parsePromptContext(rawPrompt: string): {
  cleanPrompt: string;
  context: AiContextRef;
} {
  const match = rawPrompt.match(/<context>([\s\S]*?)<\/context>/);
  if (!match) {
    return { cleanPrompt: rawPrompt, context: {} };
  }

  const cleanPrompt = rawPrompt.replace(/<context>[\s\S]*?<\/context>/, "").trim();
  const contextXml = match[1];
  const context: AiContextRef = {};

  // Active note
  const activeNoteMatch = contextXml.match(/<active_note\s+path="([^"]+)"(?:\s+title="([^"]*)")?\s*\/>/);
  if (activeNoteMatch) {
    context.activeNote = {
      path: unescapeXml(activeNoteMatch[1]),
      title: activeNoteMatch[2] ? unescapeXml(activeNoteMatch[2]) : undefined,
    };
  }

  // Selection
  const selectionMatch = contextXml.match(
    /<editor_selection\s+path="([^"]+)"(?:\s+lines="(\d+)-(\d+)")?>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/editor_selection>/
  );
  if (selectionMatch) {
    context.selection = {
      path: unescapeXml(selectionMatch[1]),
      startLine: selectionMatch[2] ? parseInt(selectionMatch[2], 10) : undefined,
      endLine: selectionMatch[3] ? parseInt(selectionMatch[3], 10) : undefined,
      text: selectionMatch[4],
    };
  }

  // Mentioned notes
  const mentionsBlock = contextXml.match(/<mentioned_notes>([\s\S]*?)<\/mentioned_notes>/);
  if (mentionsBlock) {
    const noteMatches = mentionsBlock[1].matchAll(/<note\s+path="([^"]+)"(?:\s+title="([^"]*)")?\s*\/>/g);
    const notes: Array<{ path: string; title?: string }> = [];
    for (const m of noteMatches) {
      notes.push({
        path: unescapeXml(m[1]),
        title: m[2] ? unescapeXml(m[2]) : undefined,
      });
    }
    if (notes.length > 0) {
      context.mentionedNotes = notes;
    }
  }

  // Cursor
  const cursorMatch = contextXml.match(/<editor_cursor\s+path="([^"]+)"\s+line="(\d+)"\s*\/>/);
  if (cursorMatch) {
    context.cursor = {
      path: unescapeXml(cursorMatch[1]),
      line: parseInt(cursorMatch[2], 10),
    };
  }

  return { cleanPrompt, context };
}

/**
 * Builds standard system prompt for Noteriv AI Assistant.
 */
export function buildSystemPrompt(options?: {
  customInstructions?: string;
  memoryContent?: string;
}): string {
  const parts: string[] = [
    "You are Noteriv AI Assistant, an intelligent personal knowledge assistant.",
    "You have access to the user's personal vault notes via VFS tools.",
    "Guidelines:",
    "- Always verify before assuming: use read_note or search_notes to check actual content.",
    "- When editing notes, prefer minimal, surgical diff patches via patch_note rather than rewriting whole files unnecessarily.",
    "- Preserve the user's formatting, frontmatter, and wiki-link structure.",
    "- The `<context>` XML block attached to user messages contains pointers and highlighted text for reference.",
  ];

  if (options?.customInstructions?.trim()) {
    parts.push(`\nUser Custom Instructions:\n${options.customInstructions.trim()}`);
  }

  if (options?.memoryContent?.trim()) {
    parts.push(`\nLong-term Vault Memory (.noteriv/MEMORY.md):\n${options.memoryContent.trim()}`);
  }

  return parts.join("\n");
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function unescapeXml(safe: string): string {
  return safe
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

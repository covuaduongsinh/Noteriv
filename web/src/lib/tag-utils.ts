/**
 * Tag utilities for parsing and aggregating tags from markdown content.
 *
 * Tags follow Obsidian conventions:
 *  - `#word`, `#CamelCase`, `#nested/tag`, `#tag-with-dashes`
 *  - Must start with a letter (no pure numbers like `#123`)
 *  - Must be preceded by whitespace or be at line start
 *  - Headings (`# Heading`) are NOT tags
 *  - Tags inside fenced code blocks and inline code are skipped
 *  - Tags inside URLs (http://...#anchor) are skipped
 */

import { webApi } from "./webApi";

// Matches a tag: # followed by a letter, then word chars, hyphens, or slashes
// The lookbehind ensures the # is preceded by whitespace or is at line start.
const TAG_REGEX = /(?<=\s|^)#([a-zA-Z][\w/\-]*)/g;

// Detect fenced code block delimiters
const CODE_FENCE_REGEX = /^(`{3,}|~{3,})/;

// Detect inline code spans — we strip these before matching tags
const INLINE_CODE_REGEX = /`[^`]*`/g;

// Detect URLs so we don't match anchors inside them
const URL_REGEX = /https?:\/\/[^\s)>\]]+/g;

/**
 * Extract all unique tags from markdown content.
 * Skips tags inside code blocks (fenced and inline) and URLs.
 * Skips heading lines (lines starting with `# `).
 */
export function parseTags(content: string): string[] {
  const tags = new Set<string>();
  const lines = content.split("\n");
  let inCodeBlock = false;

  for (const line of lines) {
    // Toggle fenced code block state
    const fenceMatch = line.match(CODE_FENCE_REGEX);
    if (fenceMatch) {
      inCodeBlock = !inCodeBlock;
      continue;
    }

    // Skip lines inside code blocks
    if (inCodeBlock) continue;

    // Skip heading lines: lines starting with one or more # followed by a space
    if (/^#{1,6}\s/.test(line.trimStart())) continue;

    // Strip inline code spans and URLs so we don't match tags inside them
    let cleaned = line.replace(INLINE_CODE_REGEX, (m) => " ".repeat(m.length));
    cleaned = cleaned.replace(URL_REGEX, (m) => " ".repeat(m.length));

    // Reset the regex lastIndex since we reuse it
    TAG_REGEX.lastIndex = 0;
    let match;
    while ((match = TAG_REGEX.exec(cleaned)) !== null) {
      tags.add("#" + match[1]);
    }
  }

  return Array.from(tags);
}

/**
 * Scan all notes in a vault and aggregate tag information.
 * Returns an array of { tag, count, notes } sorted by count descending.
 *
 * Unlike desktop (which walks the filesystem via electronAPI), the web
 * version fetches each note's content from the backend. Phase 2 scope only
 * — a dedicated server-side tag-aggregation endpoint (avoiding the N+1
 * fetch) is a reasonable follow-up once vaults grow large, not required yet.
 */
export interface TaggedNote {
  id: string;
  name: string;
}

export async function getAllTags(
  vaultId: string
): Promise<{ tag: string; count: number; notes: TaggedNote[] }[]> {
  const index = await webApi.vaults.index(vaultId);
  const nameById = new Map(index.notes.map((n) => [n.id, n.name]));

  const tagMap = new Map<string, Set<string>>();
  const CONCURRENCY = 10;

  for (let i = 0; i < index.notes.length; i += CONCURRENCY) {
    const batch = index.notes.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (note) => {
        const full = await webApi.notes.get(vaultId, note.id);
        return { noteId: note.id, tags: parseTags(full.content) };
      })
    );

    for (const { noteId, tags } of results) {
      for (const tag of tags) {
        if (!tagMap.has(tag)) tagMap.set(tag, new Set());
        tagMap.get(tag)!.add(noteId);
      }
    }
  }

  const result = Array.from(tagMap.entries()).map(([tag, noteIds]) => ({
    tag,
    count: noteIds.size,
    notes: Array.from(noteIds).map((id) => ({ id, name: nameById.get(id) ?? id })),
  }));

  result.sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));

  return result;
}

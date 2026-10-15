export interface TextStats {
  words: number;
  characters: number;
  /** Whole minutes at 200 words per minute, at least 1 for a non-empty note. */
  readingMinutes: number;
}

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/;
// A word is a run of letters/digits (any script, so Vietnamese diacritics count), allowing inner ' ’ - joins.
const WORD = /[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*/gu;

/** Counts the note body: YAML frontmatter is skipped, markdown punctuation never forms a word. */
export function countText(markdown: string): TextStats {
  const body = markdown.replace(FRONTMATTER, "");
  const words = body.match(WORD)?.length ?? 0;
  const characters = body.replace(/\s+/g, "").length;
  return { words, characters, readingMinutes: words === 0 ? 0 : Math.max(1, Math.round(words / 200)) };
}

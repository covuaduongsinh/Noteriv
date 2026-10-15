/**
 * Link graph of a vault, as the graph view draws it: one node per note, one edge per pair of notes that link to
 * each other in either direction. Pure: contents are read by the caller.
 */

import type { NoteRef } from "./vault-adapter";

export interface LinkGraphEdge {
  source: string;
  target: string;
  /** True when each note also links back to the other. */
  reciprocal: boolean;
}

export interface LinkGraph {
  edges: LinkGraphEdge[];
  /** Edge count per note id; notes without links have no entry. */
  connections: Map<string, number>;
}

const LINK_REGEX = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;

/** `[[Target|alias]]` points at the note whose name (without .md, case-insensitive) is `Target`. */
function labelOf(name: string): string {
  return name.replace(/\.md$/i, "").toLowerCase();
}

/**
 * `contents` maps note id to its text (a missing id counts as empty). Links to unknown notes and to the note
 * itself are ignored. Edges keep the direction of the first link seen for a pair; the pair appears once.
 */
export function buildLinkGraph(notes: NoteRef[], contents: ReadonlyMap<string, string>): LinkGraph {
  const idByLabel = new Map<string, string>();
  for (const n of notes) idByLabel.set(labelOf(n.name), n.id);

  // Directed links first, so reciprocal pairs can be collapsed into one edge afterwards.
  const directed = new Map<string, { source: string; target: string }>();
  for (const note of notes) {
    const content = contents.get(note.id) ?? "";
    const regex = new RegExp(LINK_REGEX.source, LINK_REGEX.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const targetId = idByLabel.get(match[1].trim().toLowerCase());
      if (targetId && targetId !== note.id) {
        directed.set(`${note.id}\0${targetId}`, { source: note.id, target: targetId });
      }
    }
  }

  const seenPairs = new Set<string>();
  const edges: LinkGraphEdge[] = [];
  for (const link of directed.values()) {
    const pair = [link.source, link.target].sort().join("\0");
    if (seenPairs.has(pair)) continue;
    seenPairs.add(pair);
    edges.push({ ...link, reciprocal: directed.has(`${link.target}\0${link.source}`) });
  }

  const connections = new Map<string, number>();
  for (const edge of edges) {
    connections.set(edge.source, (connections.get(edge.source) ?? 0) + 1);
    connections.set(edge.target, (connections.get(edge.target) ?? 0) + 1);
  }
  return { edges, connections };
}

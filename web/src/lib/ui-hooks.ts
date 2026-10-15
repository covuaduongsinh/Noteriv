import type { DataviewSource } from "@noteriv/ui/markdown";
import { webApi } from "./webApi";

/** Dataview queries run over every note of the vault, fetched one by one (same cost profile as the tag pane). */
export function createWebDataviewSource(vaultId: string): DataviewSource {
  return async () => {
    const index = await webApi.vaults.index(vaultId);
    const notes = [];
    for (const summary of index.notes) {
      const note = await webApi.notes.get(vaultId, summary.id);
      notes.push({
        path: note.path,
        content: note.content,
        created: note.createdAt,
        modified: note.updatedAt,
        size: note.sizeBytes,
      });
    }
    return notes;
  };
}

/** Types and utilities for note version history via git (D6). */

import { webApi, type ApiHistoryEntry } from "@/lib/webApi";

export type HistoryEntry = ApiHistoryEntry;

export interface DiffLine {
  type: "same" | "add" | "remove";
  text: string;
}

export async function getFileHistory(vaultId: string, noteId: string): Promise<{ available: boolean; entries: HistoryEntry[] }> {
  try {
    return await webApi.notes.history(vaultId, noteId);
  } catch {
    return { available: false, entries: [] };
  }
}

export async function getFileAtCommit(vaultId: string, noteId: string, hash: string): Promise<string | null> {
  try {
    const { content } = await webApi.notes.historyAt(vaultId, noteId, hash);
    return content;
  } catch {
    return null;
  }
}

/**
 * Simple line-based diff between two strings (ported byte-for-byte from
 * desktop/src/lib/note-history.ts — pure, no electronAPI dependency).
 */
export function diffStrings(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const m = oldLines.length;
  const n = newLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  const stack: DiffLine[] = [];
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      stack.push({ type: "same", text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: "add", text: newLines[j - 1] });
      j--;
    } else {
      stack.push({ type: "remove", text: oldLines[i - 1] });
      i--;
    }
  }

  for (let k = stack.length - 1; k >= 0; k--) {
    result.push(stack[k]);
  }

  return result;
}

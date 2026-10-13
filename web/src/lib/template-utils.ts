/**
 * Template engine for Noteriv Web — `getTemplateVariables`/`processTemplate`
 * ported byte-for-byte from desktop/src/lib/template-utils.ts (100% pure).
 * `listTemplates`/`loadTemplate` are rewritten against `webApi` instead of
 * `window.electronAPI.readDir`/`readFile`: templates are regular notes living
 * in a vault-root folder named `Templates`, found via the already-loaded
 * VaultIndex rather than a filesystem directory listing.
 */

import { webApi, type VaultIndex } from "./webApi";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function getTemplateVariables(noteTitle: string): Record<string, string> {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");

  return {
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${min}`,
    title: noteTitle,
    datetime: now.toISOString(),
    weekday: DAYS[now.getDay()],
    month: MONTHS[now.getMonth()],
    year: yyyy,
  };
}

export function processTemplate(content: string, variables: Record<string, string>): string {
  return content.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    const lower = key.toLowerCase();
    return lower in variables ? variables[lower] : match;
  });
}

export interface TemplateEntry {
  id: string; // noteId
  name: string;
}

/** Templates live as notes directly inside a root-level `Templates` folder. */
export function listTemplates(index: VaultIndex | null): TemplateEntry[] {
  if (!index) return [];
  const templatesFolder = index.folders.find((f) => f.parentId === null && f.name === "Templates");
  if (!templatesFolder) return [];
  return index.notes
    .filter((n) => n.folderId === templatesFolder.id)
    .map((n) => ({ id: n.id, name: n.name.replace(/\.(md|markdown)$/i, "") }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadTemplate(vaultId: string, noteId: string): Promise<string> {
  const note = await webApi.notes.get(vaultId, noteId);
  return note.content;
}

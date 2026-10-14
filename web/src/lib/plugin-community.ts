/**
 * Community plugin marketplace — same repo and manifest shape desktop already
 * uses (desktop/src/lib/plugin-api.ts's fetchCommunityPluginManifest/
 * installCommunityPlugin), ported against webApi.plugins.install instead of
 * window.electronAPI's filesystem writes. Matches the fetch pattern already
 * established for community themes/snippets (lib/theme-utils.ts,
 * lib/css-snippets.ts): fetch manifest.json, then per-item files, fail soft
 * (return null) on any network/parse error rather than throwing.
 */

const COMMUNITY_PLUGINS_BASE = "https://raw.githubusercontent.com/thejacedev/NoterivPlugins/master";

export interface CommunityPluginEntry {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  dir: string;
}

export interface CommunityPluginManifest {
  name: string;
  description: string;
  version: string;
  plugins: CommunityPluginEntry[];
}

export async function fetchCommunityPluginManifest(): Promise<CommunityPluginManifest | null> {
  try {
    const res = await fetch(`${COMMUNITY_PLUGINS_BASE}/manifest.json`);
    if (!res.ok) return null;
    const data = (await res.json()) as CommunityPluginManifest;
    if (!Array.isArray(data.plugins)) return null;
    return data;
  } catch {
    return null;
  }
}

async function fetchCommunityPluginFile(filePath: string): Promise<string | null> {
  try {
    const res = await fetch(`${COMMUNITY_PLUGINS_BASE}/${filePath}`);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// api.<namespace>.<method> -> permission the web sandbox requires for it.
// Desktop plugins have no permission model, so community manifests omit
// `permissions`; we derive the request from the methods the code references.
// This only ever *proposes* grants (shown to the user before install) —
// enforcement stays default-deny in usePluginHost, so a plugin that hides a
// call from this scan simply gets that call rejected at runtime.
const METHOD_TO_PERMISSION: Record<string, string> = {
  "vault.read": "vault:read",
  "vault.list": "vault:read",
  "vault.exists": "vault:read",
  "vault.write": "vault:write",
  "vault.delete": "vault:write",
  "editor.getContent": "editor:read",
  "editor.getSelection": "editor:read",
  "editor.getCursorPosition": "editor:read",
  "editor.setContent": "editor:write",
  "editor.insertAtCursor": "editor:write",
  "editor.replaceSelection": "editor:write",
  "ui.addCommand": "ui:commands",
  "ui.removeCommand": "ui:commands",
  "ui.addStatusBarItem": "ui:statusbar",
  "ui.removeStatusBarItem": "ui:statusbar",
};

export function inferPermissions(mainJs: string): string[] {
  const found = new Set<string>();
  const re = /\b(vault|editor|ui)\s*\.\s*(\w+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(mainJs)) !== null) {
    const perm = METHOD_TO_PERMISSION[`${m[1]}.${m[2]}`];
    if (perm) found.add(perm);
  }
  return Array.from(found);
}

/** Fetches a community plugin's manifest.json + main.js. Returns null if either file is unavailable. */
export async function fetchCommunityPluginSource(
  entry: CommunityPluginEntry
): Promise<{ manifest: Record<string, unknown>; mainJs: string } | null> {
  const [manifestRaw, mainJs] = await Promise.all([
    fetchCommunityPluginFile(`${entry.dir}/manifest.json`),
    fetchCommunityPluginFile(`${entry.dir}/main.js`),
  ]);
  if (!manifestRaw || !mainJs) return null;
  try {
    const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;
    if (!Array.isArray(manifest.permissions)) manifest.permissions = inferPermissions(mainJs);
    return { manifest, mainJs };
  } catch {
    return null;
  }
}

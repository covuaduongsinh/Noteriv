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
  "ui.addSidebarPanel": "ui:panel",
  "ui.removeSidebarPanel": "ui:panel",
  "ui.addSettingsTab": "ui:panel",
  "ui.removeSettingsTab": "ui:panel",
  "markdown.registerCodeBlockProcessor": "markdown:render",
  "markdown.unregisterCodeBlockProcessor": "markdown:render",
};

/** Drops // and /* *\/ comments (not the `//` of a URL) so words inside them don't count as API calls. */
function stripComments(code: string): string {
  // Blank single/double-quoted strings too, so "api.vault.read" inside a message doesn't count.
  const noStrings = code.replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, '""');
  return noStrings.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:\\])\/\/[^\n]*/g, "$1");
}

/**
 * Permissions a plugin's code actually asks for. Only `api.<ns>.<method>(...)` calls count (and calls
 * through an alias such as `var ui = api.ui`), not any text that happens to read `vault.x`: an earlier
 * looser scan granted chessboard read/write access to the vault and the editor it never touches.
 */
export function inferPermissions(mainJs: string): string[] {
  const code = stripComments(mainJs);
  const found = new Set<string>();
  const add = (ns: string, method: string) => {
    const perm = METHOD_TO_PERMISSION[`${ns}.${method}`];
    if (perm) found.add(perm);
  };

  let m: RegExpExecArray | null;
  const direct = /\bapi\s*\.\s*(vault|editor|ui|markdown)\s*\.\s*(\w+)/g;
  while ((m = direct.exec(code)) !== null) add(m[1], m[2]);

  // var ui = api.ui;  /  const { addCommand } = api.ui  (the second form is not tracked per method)
  const aliases = new Map<string, string>();
  const aliasRe = /\b(?:var|let|const)\s+(\w+)\s*=\s*api\s*\.\s*(vault|editor|ui|markdown)\b(?!\s*\.)/g;
  while ((m = aliasRe.exec(code)) !== null) aliases.set(m[1], m[2]);
  for (const [alias, ns] of aliases) {
    const use = new RegExp(`\\b${alias}\\s*\\.\\s*(\\w+)`, "g");
    while ((m = use.exec(code)) !== null) add(ns, m[1]);
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

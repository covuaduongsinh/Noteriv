// ─── Community plugins on desktop ───
// Plugins live in {vaultPath}/.noteriv/plugins/{plugin-id}/ (manifest.json + main.js). Since Plugin API v1 they run
// in the same sandboxed iframe as on web (@noteriv/ui/plugins/sandbox, public/plugin-sandbox.html) with
// default-deny permissions, instead of being executed in the app window with full access.
//
// {vaultPath}/.noteriv/plugin-config.json holds, per vault:
//   enabled      plugin ids that are on
//   settings     per-plugin settings blobs (api.app.loadSettings / saveSettings)
//   permissions  what the user granted each plugin
//   core, coreSettings  core plugins (lib/core-plugins.ts)
// Every write is read-modify-write so no writer drops another one's keys.

import type { PluginPermission } from "@noteriv/plugin-api";
import { inferPermissions } from "@noteriv/core/permissions";
import type { SandboxPluginRecord } from "@noteriv/ui/plugins/sandbox";
import { t } from "@noteriv/ui/i18n";

/** Shown to plugins as `api.app.version`; manifests compare `minAppVersion` against it (chessboard needs 1.3.0). */
export const PLUGIN_APP_VERSION = "1.3.0";

const PLUGINS_DIR = ".noteriv/plugins";
const CONFIG_FILE = ".noteriv/plugin-config.json";

const KNOWN_PERMISSIONS: readonly PluginPermission[] = [
  "vault:read",
  "vault:write",
  "editor:read",
  "editor:write",
  "ui:commands",
  "ui:statusbar",
  "ui:panel",
  "markdown:render",
];

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  minAppVersion?: string;
  main: string;
  codeBlockLanguages?: string[];
  permissions?: string[];
}

/** One installed plugin as the Plugin Manager shows it. */
export interface PluginInstance {
  manifest: PluginManifest;
  enabled: boolean;
  /** Granted by the user (enforced by the sandbox host). */
  permissions: PluginPermission[];
  /** What the plugin asks for: its manifest `permissions`, or inferred from its code when the manifest has none. */
  requested: PluginPermission[];
  error?: string;
}

/** An installed plugin with its code, ready for the sandbox host. */
export interface DesktopPlugin extends PluginInstance {
  mainJs: string;
  settings: Record<string, unknown>;
}

interface PluginConfig {
  enabled?: string[];
  settings?: Record<string, Record<string, unknown>>;
  permissions?: Record<string, string[]>;
  [key: string]: unknown;
}

function onlyKnown(perms: unknown): PluginPermission[] {
  if (!Array.isArray(perms)) return [];
  return perms.filter((p): p is PluginPermission => KNOWN_PERMISSIONS.includes(p as PluginPermission));
}

export function toSandboxRecord(p: DesktopPlugin): SandboxPluginRecord {
  return {
    id: p.manifest.id,
    pluginId: p.manifest.id,
    enabled: p.enabled && !p.error,
    permissions: p.permissions,
    mainJs: p.mainJs,
    settings: p.settings,
  };
}

export class DesktopPluginStore {
  constructor(private readonly vaultPath: string) {}

  private async readConfig(): Promise<PluginConfig> {
    try {
      const raw = await window.electronAPI.readFile(`${this.vaultPath}/${CONFIG_FILE}`);
      return raw ? (JSON.parse(raw) as PluginConfig) : {};
    } catch {
      return {};
    }
  }

  private async updateConfig(change: (c: PluginConfig) => PluginConfig): Promise<void> {
    const next = change(await this.readConfig());
    await window.electronAPI.createDir(`${this.vaultPath}/.noteriv`);
    await window.electronAPI.writeFile(`${this.vaultPath}/${CONFIG_FILE}`, JSON.stringify(next, null, 2));
  }

  /** Every plugin folder with a readable manifest, with its code, grant and settings. */
  async list(): Promise<DesktopPlugin[]> {
    if (!window.electronAPI) return [];
    const config = await this.readConfig();
    const dir = `${this.vaultPath}/${PLUGINS_DIR}`;
    let entries: { name: string; isDirectory: boolean }[];
    try {
      entries = await window.electronAPI.readDir(dir);
    } catch {
      return []; // no plugins folder yet
    }
    const out: DesktopPlugin[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory) continue;
      let manifest: PluginManifest;
      try {
        const raw = await window.electronAPI.readFile(`${dir}/${entry.name}/manifest.json`);
        if (!raw) continue;
        manifest = JSON.parse(raw) as PluginManifest;
      } catch {
        continue; // skip plugins with invalid manifests
      }
      manifest.id = entry.name; // the folder name is the id, as before
      const mainJs = (await window.electronAPI.readFile(`${dir}/${entry.name}/${manifest.main || "main.js"}`)) ?? "";
      out.push({
        manifest,
        enabled: (config.enabled ?? []).includes(manifest.id),
        permissions: onlyKnown(config.permissions?.[manifest.id]),
        requested: Array.isArray(manifest.permissions) ? onlyKnown(manifest.permissions) : onlyKnown(inferPermissions(mainJs)),
        error: mainJs ? undefined : `Main file "${manifest.main}" not found`,
        mainJs,
        settings: config.settings?.[manifest.id] ?? {},
      });
    }
    return out.sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
  }

  setEnabled(id: string, enabled: boolean): Promise<void> {
    return this.updateConfig((c) => {
      const ids = new Set(c.enabled ?? []);
      if (enabled) ids.add(id);
      else ids.delete(id);
      return { ...c, enabled: Array.from(ids) };
    });
  }

  setPermissions(id: string, permissions: PluginPermission[]): Promise<void> {
    return this.updateConfig((c) => ({ ...c, permissions: { ...(c.permissions ?? {}), [id]: onlyKnown(permissions) } }));
  }

  saveSettings(id: string, data: Record<string, unknown>): Promise<void> {
    return this.updateConfig((c) => ({ ...c, settings: { ...(c.settings ?? {}), [id]: data } }));
  }

  /** Copy a plugin folder (top-level files) into the vault. Returns its manifest; the plugin starts disabled. */
  async installFromFolder(sourcePath: string): Promise<PluginManifest> {
    const manifestRaw = await window.electronAPI.readFile(`${sourcePath}/manifest.json`);
    if (!manifestRaw) throw new Error(t("desktop.pluginManager.noManifest"));
    const manifest = JSON.parse(manifestRaw) as PluginManifest;
    if (!manifest.id || !manifest.name || !manifest.main) {
      throw new Error(t("desktop.pluginManager.invalidManifest"));
    }
    const destDir = `${this.vaultPath}/${PLUGINS_DIR}/${manifest.id}`;
    await window.electronAPI.createDir(`${this.vaultPath}/.noteriv`);
    await window.electronAPI.createDir(`${this.vaultPath}/${PLUGINS_DIR}`);
    await window.electronAPI.createDir(destDir);
    for (const entry of await window.electronAPI.readDir(sourcePath)) {
      if (entry.isDirectory) continue; // only top-level files
      const content = await window.electronAPI.readFile(`${sourcePath}/${entry.name}`);
      if (content !== null) await window.electronAPI.writeFile(`${destDir}/${entry.name}`, content);
    }
    return manifest;
  }

  /** Remove the plugin folder and every config entry about it. */
  async uninstall(id: string): Promise<void> {
    await this.updateConfig((c) => {
      const { [id]: _s, ...settings } = c.settings ?? {};
      const { [id]: _p, ...permissions } = c.permissions ?? {};
      return { ...c, enabled: (c.enabled ?? []).filter((x) => x !== id), settings, permissions };
    });
    await window.electronAPI.deleteDir(`${this.vaultPath}/${PLUGINS_DIR}/${id}`);
  }
}

// ── Community plugin directory (thejacedev/NoterivPlugins) ──

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
    return (await res.json()) as CommunityPluginManifest;
  } catch {
    return null;
  }
}

export async function fetchCommunityPluginFile(filePath: string): Promise<string | null> {
  try {
    const res = await fetch(`${COMMUNITY_PLUGINS_BASE}/${filePath}`);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Download a community plugin into the vault. It starts disabled and without permissions until the user allows it. */
export async function installCommunityPlugin(vaultPath: string, entry: CommunityPluginEntry): Promise<boolean> {
  if (!window.electronAPI) return false;
  const [manifestContent, mainContent] = await Promise.all([
    fetchCommunityPluginFile(`${entry.dir}/manifest.json`),
    fetchCommunityPluginFile(`${entry.dir}/main.js`),
  ]);
  if (!manifestContent || !mainContent) return false;

  const pluginDir = `${vaultPath}/${PLUGINS_DIR}/${entry.id}`;
  await window.electronAPI.createDir(`${vaultPath}/.noteriv`);
  await window.electronAPI.createDir(`${vaultPath}/${PLUGINS_DIR}`);
  await window.electronAPI.createDir(pluginDir);
  await window.electronAPI.writeFile(`${pluginDir}/manifest.json`, manifestContent);
  await window.electronAPI.writeFile(`${pluginDir}/main.js`, mainContent);
  return true;
}

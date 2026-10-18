import type { PluginApi } from "@noteriv/plugin-api";
import type { CorePluginDef } from "@noteriv/core/plugin-registry";
import type { VaultAdapter } from "@noteriv/core/vault-adapter";
import type { CorePluginHostConfig } from "@noteriv/ui/plugins";

/**
 * Core plugins shipped with the desktop app (same modules as web; names and descriptions come from the i18n catalog,
 * `plugins.<camelCaseId>.name` / `.description`). `load` must stay a dynamic import() so a disabled plugin's code is a
 * separate chunk.
 */
export const CORE_PLUGINS: CorePluginDef<PluginApi>[] = [
  {
    id: "word-count",
    load: () => import("@noteriv/plugins/word-count"),
  },
  {
    id: "flashcards",
    defaultEnabled: true,
    load: () => import("@noteriv/plugins/flashcards"),
  },
  {
    id: "calendar",
    defaultEnabled: true,
    load: () => import("@noteriv/plugins/calendar"),
  },
  {
    id: "templates",
    defaultEnabled: true,
    load: () => import("@noteriv/plugins/templates"),
  },
  {
    id: "note-composer",
    load: () => import("@noteriv/plugins/note-composer"),
  },
  {
    id: "vault-insights",
    load: () => import("@noteriv/plugins/vault-insights"),
  },
  {
    id: "markdown-lint",
    load: () => import("@noteriv/plugins/markdown-lint"),
  },
  {
    id: "audio-recorder",
    load: () => import("@noteriv/plugins/audio-recorder"),
  },
  {
    id: "graph",
    defaultEnabled: true,
    load: () => import("@noteriv/plugins/graph"),
  },
  {
    id: "slides",
    load: () => import("@noteriv/plugins/slides"),
  },
  {
    id: "note-history",
    defaultEnabled: true,
    load: () => import("@noteriv/plugins/note-history"),
  },
  {
    id: "board",
    load: () => import("@noteriv/plugins/board"),
  },
  {
    id: "mermaid",
    defaultEnabled: true,
    load: () => import("@noteriv/plugins/mermaid"),
  },
  {
    id: "dataview",
    load: () => import("@noteriv/plugins/dataview"),
  },
  {
    id: "canvas",
    load: () => import("@noteriv/plugins/canvas"),
  },
  {
    id: "drawing",
    load: () => import("@noteriv/plugins/drawing"),
  },
  {
    id: "pdf-viewer",
    defaultEnabled: true,
    load: () => import("@noteriv/plugins/pdf-viewer"),
  },
];

const CONFIG_DIR = ".noteriv";
const CONFIG_FILE = ".noteriv/plugin-config.json";

/**
 * `.noteriv/plugin-config.json` is shared with community plugins (`enabled`, `settings`, see lib/plugin-api.ts).
 * Core plugins add `core` (on/off) and `coreSettings`; every write is read-modify-write so the other keys survive.
 */
interface PluginConfigFile {
  enabled?: string[];
  settings?: Record<string, Record<string, unknown>>;
  core?: Record<string, boolean>;
  coreSettings?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

async function readConfig(vaultPath: string): Promise<PluginConfigFile> {
  try {
    const raw = await window.electronAPI.readFile(`${vaultPath}/${CONFIG_FILE}`);
    return raw ? (JSON.parse(raw) as PluginConfigFile) : {};
  } catch {
    return {};
  }
}

async function updateConfig(vaultPath: string, change: (c: PluginConfigFile) => PluginConfigFile): Promise<void> {
  const next = change(await readConfig(vaultPath));
  await window.electronAPI.createDir(`${vaultPath}/${CONFIG_DIR}`);
  const ok = await window.electronAPI.writeFile(`${vaultPath}/${CONFIG_FILE}`, JSON.stringify(next, null, 2));
  if (ok === false) throw new Error("could not write plugin-config.json");
}

/** Review data the app kept before 2.2, or null. */
async function readLegacyFlashcardReviews(vaultPath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await window.electronAPI.readFile(`${vaultPath}/${CONFIG_DIR}/flashcard-reviews.json`);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function desktopCorePluginConfig(vaultPath: string, adapter: VaultAdapter): CorePluginHostConfig {
  return {
    adapter,
    platform: "desktop",
    vaultPath,
    plugins: CORE_PLUGINS,
    storage: {
      stateStore: {
        load: async () => (await readConfig(vaultPath)).core ?? {},
        save: (state) => updateConfig(vaultPath, (c) => ({ ...c, core: state })),
      },
      loadPluginSettings: async (id) => {
        const own = (await readConfig(vaultPath)).coreSettings?.[id];
        // Bridge for data from before flashcards became a plugin (phase 2.2): until the plugin has saved once, hand
        // it the old review file to import. The file is never written again and stays as a backup.
        if (!own && id === "flashcards") {
          const legacy = await readLegacyFlashcardReviews(vaultPath);
          if (legacy) return { legacyReviews: legacy };
        }
        return own ?? {};
      },
      savePluginSettings: (id, data) =>
        updateConfig(vaultPath, (c) => ({ ...c, coreSettings: { ...(c.coreSettings ?? {}), [id]: data } })),
    },
  };
}

import type { PluginApi } from "@noteriv/plugin-api";
import type { CorePluginDef } from "@noteriv/core/plugin-registry";
import type { VaultAdapter } from "@noteriv/core/vault-adapter";
import type { CorePluginHostConfig } from "@noteriv/ui/plugins";

/**
 * Core plugins shipped with the desktop app (same modules as web, English labels like the rest of desktop). `load`
 * must stay a dynamic import() so a disabled plugin's code is a separate chunk.
 */
export const CORE_PLUGINS: CorePluginDef<PluginApi>[] = [
  {
    id: "word-count",
    name: "Word count",
    description: "Word count of the open note in the status bar, plus a command and ribbon button with statistics (Ctrl+Alt+W).",
    load: () => import("@noteriv/plugins/word-count"),
  },
  {
    id: "flashcards",
    name: "Flashcards",
    description: "Spaced repetition (SM-2) over Q:/A: pairs and {{cloze}} deletions in your notes; open it from the ribbon or the command palette.",
    defaultEnabled: true,
    load: () => import("@noteriv/plugins/flashcards"),
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

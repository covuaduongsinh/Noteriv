import { readFile, writeFile, createDir } from '@/lib/file-system';
import { t } from '@/lib/i18n';

/**
 * Core plugins, same ids and defaults as web/src/lib/core-plugins.ts and desktop/src/lib/core-plugins.ts.
 * The phone cannot run the plugin modules (they render with react-dom), so each id switches the phone's own
 * screen or block for that feature. `onPhone: false` means the phone has no such feature yet: the choice is
 * still saved, so it applies once the feature exists.
 */
export interface CorePluginDef {
  id: string;
  defaultEnabled?: boolean;
  onPhone: boolean;
}

export const CORE_PLUGINS: CorePluginDef[] = [
  { id: 'word-count', onPhone: true },
  { id: 'flashcards', defaultEnabled: true, onPhone: true },
  { id: 'calendar', defaultEnabled: true, onPhone: true },
  { id: 'templates', defaultEnabled: true, onPhone: true },
  { id: 'note-composer', onPhone: true },
  { id: 'vault-insights', onPhone: false },
  { id: 'markdown-lint', onPhone: true },
  { id: 'audio-recorder', onPhone: false },
  { id: 'graph', defaultEnabled: true, onPhone: true },
  { id: 'slides', onPhone: true },
  { id: 'note-history', defaultEnabled: true, onPhone: true },
  { id: 'board', onPhone: true },
  { id: 'mermaid', defaultEnabled: true, onPhone: true },
  { id: 'dataview', onPhone: true },
  { id: 'views', onPhone: false },
  { id: 'footnotes', onPhone: false },
  { id: 'unique-note', onPhone: false },
  { id: 'canvas', onPhone: false },
  { id: 'drawing', onPhone: false },
  { id: 'pdf-viewer', defaultEnabled: true, onPhone: false },
];

export type CorePluginState = Record<string, boolean>;

export function isCorePluginEnabled(state: CorePluginState, id: string): boolean {
  const chosen = state[id];
  return typeof chosen === 'boolean' ? chosen : CORE_PLUGINS.find((p) => p.id === id)?.defaultEnabled === true;
}

// --- Storage: `core` in .noteriv/plugin-config.json, the same file and key as desktop ---

const CONFIG_DIR = '.noteriv';
const CONFIG_FILE = '.noteriv/plugin-config.json';

/** The file's settings; null if it exists but cannot be read as an object (it must not be written over then). */
async function readConfig(vaultPath: string): Promise<Record<string, unknown> | null> {
  const raw = await readFile(`${vaultPath}/${CONFIG_FILE}`);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function loadCorePluginState(vaultPath: string): Promise<CorePluginState> {
  const core = (await readConfig(vaultPath))?.core;
  return core && typeof core === 'object' ? (core as CorePluginState) : {};
}

/** Read-modify-write so community plugin keys (`enabled`, `settings`) in the same file survive. */
export async function saveCorePluginState(vaultPath: string, state: CorePluginState): Promise<void> {
  const config = await readConfig(vaultPath);
  // Writing over a damaged file would wipe the community plugins' settings kept in it.
  if (!config) throw new Error('plugin-config.json is damaged; fix or delete it first');
  createDir(`${vaultPath}/${CONFIG_DIR}`);
  const ok = writeFile(`${vaultPath}/${CONFIG_FILE}`, JSON.stringify({ ...config, core: state }, null, 2));
  if (!ok) throw new Error('could not write plugin-config.json');
}

// --- Text: names and descriptions from the shared catalog (`plugins.<camelCaseId>`, as on web) ---

/** `word-count` → `wordCount`, the catalog group (same rule as packages/ui corePluginGroup). */
function group(id: string): string {
  return id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase());
}

export function corePluginText(id: string): { name: string; description: string } {
  const key = `plugins.${group(id)}`;
  const name = t(`${key}.name`);
  const description = t(`${key}.description`);
  return { name: name === `${key}.name` ? id : name, description: description === `${key}.description` ? '' : description };
}

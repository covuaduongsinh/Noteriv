import type { PluginApi } from "@noteriv/plugin-api";
import type { CorePluginDef } from "@noteriv/core/plugin-registry";
import type { VaultAdapter } from "@noteriv/core/vault-adapter";
import { settingsKeyStateStore, type CorePluginHostConfig } from "@noteriv/ui/plugins";

/**
 * Core plugins shipped with the web app. `load` must stay a dynamic import(): it is what keeps a disabled plugin's
 * code out of the page bundle (Next splits it into its own chunk).
 */
export const CORE_PLUGINS: CorePluginDef<PluginApi>[] = [
  {
    id: "word-count",
    name: "Đếm từ",
    description: "Hiện số từ của ghi chú đang mở trên thanh trạng thái; lệnh và nút ribbon xem thống kê (Ctrl+Alt+W).",
    load: () => import("@noteriv/plugins/word-count"),
  },
];

/** Vault settings key holding each core plugin's own settings blob. On/off lives under `corePlugins`. */
const SETTINGS_KEY = "corePluginSettings";

type SettingsBlobs = Record<string, Record<string, unknown>>;

/** Host config for one vault: state and plugin settings live in the vault's settings (DB) via the adapter. */
export function webCorePluginConfig(adapter: VaultAdapter): CorePluginHostConfig {
  return {
    adapter,
    platform: "web",
    vaultPath: null,
    plugins: CORE_PLUGINS,
    storage: {
      stateStore: settingsKeyStateStore(
        () => adapter.getSettings(),
        (s) => adapter.saveSettings(s)
      ),
      async loadPluginSettings(id) {
        const all = (await adapter.getSettings())[SETTINGS_KEY] as SettingsBlobs | undefined;
        return all?.[id] ?? {};
      },
      async savePluginSettings(id, data) {
        const current = await adapter.getSettings();
        const all = (current[SETTINGS_KEY] as SettingsBlobs | undefined) ?? {};
        await adapter.saveSettings({ ...current, [SETTINGS_KEY]: { ...all, [id]: data } });
      },
    },
  };
}

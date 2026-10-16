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
  {
    id: "flashcards",
    name: "Flashcards",
    description: "Ôn tập ngắt quãng (SM-2) từ các cặp dòng Q:/A: và {{cloze}} trong ghi chú; mở bằng nút ribbon hoặc bảng lệnh.",
    defaultEnabled: true,
    load: () => import("@noteriv/plugins/flashcards"),
  },
  {
    id: "calendar",
    name: "Lịch và daily notes",
    description: "Lịch tháng với daily note và việc đến hạn; mở daily note hôm nay bằng Ctrl+D hoặc nút ribbon.",
    defaultEnabled: true,
    load: () => import("@noteriv/plugins/calendar"),
  },
  {
    id: "templates",
    name: "Templates",
    description: "Tạo note mới từ template hoặc chèn template vào note đang mở (Ctrl+Alt+T). Template là các note trong thư mục Templates.",
    defaultEnabled: true,
    load: () => import("@noteriv/plugins/templates"),
  },
  {
    id: "note-composer",
    name: "Note composer",
    description: "Gộp nhiều note vào note đang mở, hoặc tách note đang mở thành nhiều note theo heading.",
    load: () => import("@noteriv/plugins/note-composer"),
  },
  {
    id: "vault-insights",
    name: "Vault insights",
    description: "Thống kê vault: biểu đồ hoạt động, note kết nối nhiều và note mồ côi, tag phổ biến, tăng trưởng, sức khoẻ vault.",
    load: () => import("@noteriv/plugins/vault-insights"),
  },
  {
    id: "markdown-lint",
    name: "Markdown lint",
    description: "Panel bên phải liệt kê vấn đề của note đang mở (link hỏng, heading…); bấm một mục để nhảy tới dòng. Ctrl+Shift+L.",
    load: () => import("@noteriv/plugins/markdown-lint"),
  },
  {
    id: "audio-recorder",
    name: "Ghi âm",
    description: "Ghi âm từ microphone, lưu thành file đính kèm và chèn link vào note đang mở.",
    load: () => import("@noteriv/plugins/audio-recorder"),
  },
  {
    id: "graph",
    name: "Graph view",
    description: "Sơ đồ mọi note và wiki-link giữa chúng; bấm một note để mở. Ctrl+G hoặc nút ribbon.",
    defaultEnabled: true,
    load: () => import("@noteriv/plugins/graph"),
  },
  {
    id: "slides",
    name: "Trình chiếu",
    description: "Trình chiếu note đang mở toàn màn hình, mỗi đoạn ngăn bởi --- là một trang; có ghi chú người trình bày và tổng quan.",
    load: () => import("@noteriv/plugins/slides"),
  },
  {
    id: "note-history",
    name: "Lịch sử note",
    description: "Time scrubber xem lại các bản lưu tự động của note (Ctrl+Shift+H) và lịch sử git khi vault có đồng bộ git; khôi phục phiên bản cũ.",
    defaultEnabled: true,
    load: () => import("@noteriv/plugins/note-history"),
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
        const settings = await adapter.getSettings();
        const own = (settings[SETTINGS_KEY] as SettingsBlobs | undefined)?.[id];
        // Bridge for data from before flashcards became a plugin (phase 2.2): until the plugin has saved once, hand
        // it the old `flashcardReviews` key to import. The old key is never written again and stays as a backup.
        if (!own && id === "flashcards" && settings.flashcardReviews) return { legacyReviews: settings.flashcardReviews };
        return own ?? {};
      },
      async savePluginSettings(id, data) {
        const current = await adapter.getSettings();
        const all = (current[SETTINGS_KEY] as SettingsBlobs | undefined) ?? {};
        await adapter.saveSettings({ ...current, [SETTINGS_KEY]: { ...all, [id]: data } });
      },
    },
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorApi, PluginApi } from "@noteriv/plugin-api";
import type { CorePluginDef } from "@noteriv/core/plugin-registry";
import type { VaultAdapter } from "@noteriv/core/vault-adapter";
import { createCorePluginHost, settingsKeyStateStore, type CorePluginHost } from "@noteriv/ui/plugins";

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

export interface WebCorePluginNotice {
  key: string;
  message: string;
}

interface Ports {
  editor: EditorApi;
  getCurrentFile: () => string | null;
  openFile: (path: string) => boolean;
}

/**
 * One core-plugin host per open vault. On/off choices and plugin settings are stored in the vault's settings (DB)
 * through the VaultAdapter. `ports` may change every render; the host always calls the latest ones.
 */
export function useWebCorePlugins(adapter: VaultAdapter, ports: Ports) {
  const portsRef = useRef(ports);
  portsRef.current = ports;
  const [host, setHost] = useState<CorePluginHost | null>(null);
  const [notices, setNotices] = useState<WebCorePluginNotice[]>([]);

  const dismissNotice = useCallback((key: string) => setNotices((prev) => prev.filter((n) => n.key !== key)), []);

  useEffect(() => {
    const editor: EditorApi = {
      getContent: () => portsRef.current.editor.getContent(),
      setContent: (c) => portsRef.current.editor.setContent(c),
      insertAtCursor: (t) => portsRef.current.editor.insertAtCursor(t),
      getSelection: () => portsRef.current.editor.getSelection(),
      replaceSelection: (t) => portsRef.current.editor.replaceSelection(t),
      getCursorPosition: () => portsRef.current.editor.getCursorPosition(),
    };
    const h = createCorePluginHost({
      adapter,
      platform: "web",
      vaultPath: null,
      editor,
      getCurrentFile: () => portsRef.current.getCurrentFile(),
      openFile: async (path) => portsRef.current.openFile(path),
      notify: (message, durationMs = 4000) => {
        const key = `core:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        setNotices((prev) => [...prev, { key, message }]);
        setTimeout(() => setNotices((prev) => prev.filter((n) => n.key !== key)), durationMs);
      },
      loadPluginSettings: async (id) => {
        const all = (await adapter.getSettings())[SETTINGS_KEY] as Record<string, Record<string, unknown>> | undefined;
        return all?.[id] ?? {};
      },
      savePluginSettings: async (id, data) => {
        const current = await adapter.getSettings();
        const all = (current[SETTINGS_KEY] as Record<string, Record<string, unknown>> | undefined) ?? {};
        await adapter.saveSettings({ ...current, [SETTINGS_KEY]: { ...all, [id]: data } });
      },
      stateStore: settingsKeyStateStore(
        () => adapter.getSettings(),
        (s) => adapter.saveSettings(s)
      ),
      plugins: CORE_PLUGINS,
    });
    setHost(h);
    void h.init();
    return () => {
      setHost(null);
      void h.dispose();
    };
  }, [adapter]);

  return { host, notices, dismissNotice };
}

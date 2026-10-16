"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorApi, PluginApi, PluginPlatform, ViewState } from "@noteriv/plugin-api";
import type { CorePluginDef, PluginStateStore } from "@noteriv/core/plugin-registry";
import type { VaultAdapter } from "@noteriv/core/vault-adapter";
import { createCorePluginHost, type CorePluginHost } from "./core-plugin-host";

/** Where a vault keeps core-plugin state. Built by the app per vault (web: vault settings in the DB; desktop: a file). */
export interface CorePluginStorage {
  stateStore: PluginStateStore;
  loadPluginSettings(pluginId: string): Promise<Record<string, unknown>>;
  savePluginSettings(pluginId: string, data: Record<string, unknown>): Promise<void>;
}

/** Everything that identifies one host. Memoise it per vault: a new object restarts every plugin. */
export interface CorePluginHostConfig {
  adapter: VaultAdapter;
  platform: PluginPlatform;
  vaultPath: string | null;
  plugins: CorePluginDef<PluginApi>[];
  storage: CorePluginStorage;
}

/** Called on every use; may change each render, the host always calls the latest. */
export interface CorePluginPorts {
  editor: EditorApi;
  getCurrentFile: () => string | null;
  openFile: (path: string) => boolean | Promise<boolean>;
  /** A plugin created, changed or deleted notes: refresh the file tree / index. */
  onVaultChanged?: () => void;
}

export interface CorePluginNotice {
  key: string;
  message: string;
}

/** The plugin view on screen (one at a time), shown by `CorePluginViewOverlay`. */
export interface ActiveCorePluginView {
  type: string;
  state: ViewState;
}

/**
 * One core-plugin host for the open vault (null while no vault is open). Starts enabled plugins on mount and stops
 * them all when the vault changes or the page unmounts. Notices from `ui.showNotice` are collected for the app to show,
 * and the view a plugin opened with `workspace.openView` is returned as `activeView`.
 */
export function useCorePluginHost(config: CorePluginHostConfig | null, ports: CorePluginPorts) {
  const portsRef = useRef(ports);
  portsRef.current = ports;
  const [host, setHost] = useState<CorePluginHost | null>(null);
  const [notices, setNotices] = useState<CorePluginNotice[]>([]);
  const [activeView, setActiveView] = useState<ActiveCorePluginView | null>(null);

  const dismissNotice = useCallback((key: string) => setNotices((prev) => prev.filter((n) => n.key !== key)), []);
  const closeView = useCallback(() => setActiveView(null), []);

  useEffect(() => {
    if (!config) return;
    const editor: EditorApi = {
      getContent: () => portsRef.current.editor.getContent(),
      setContent: (c) => portsRef.current.editor.setContent(c),
      insertAtCursor: (t) => portsRef.current.editor.insertAtCursor(t),
      getSelection: () => portsRef.current.editor.getSelection(),
      replaceSelection: (t) => portsRef.current.editor.replaceSelection(t),
      getCursorPosition: () => portsRef.current.editor.getCursorPosition(),
    };
    const h = createCorePluginHost({
      adapter: config.adapter,
      platform: config.platform,
      vaultPath: config.vaultPath,
      editor,
      getCurrentFile: () => portsRef.current.getCurrentFile(),
      openFile: async (path) => portsRef.current.openFile(path),
      openView: async (type, state) => {
        setActiveView({ type, state });
        return true;
      },
      closeView: (types) => setActiveView((v) => (v && types.includes(v.type) ? null : v)),
      onVaultChanged: () => portsRef.current.onVaultChanged?.(),
      notify: (message, durationMs = 4000) => {
        const key = `core:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        setNotices((prev) => [...prev, { key, message }]);
        setTimeout(() => setNotices((prev) => prev.filter((n) => n.key !== key)), durationMs);
      },
      loadPluginSettings: (id) => config.storage.loadPluginSettings(id),
      savePluginSettings: (id, data) => config.storage.savePluginSettings(id, data),
      stateStore: config.storage.stateStore,
      plugins: config.plugins,
    });
    setHost(h);
    void h.init();
    return () => {
      setHost(null);
      setActiveView(null);
      void h.dispose();
    };
  }, [config]);

  return { host, notices, dismissNotice, activeView, closeView };
}

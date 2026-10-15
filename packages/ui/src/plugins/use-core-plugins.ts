"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { CorePluginInfo } from "@noteriv/core/plugin-registry";
import type { CorePluginContributions, CorePluginHost, HostCommand } from "./core-plugin-host";
import { isMacPlatform, matchesHotkey } from "./hotkey";

const NO_PLUGINS: CorePluginInfo[] = [];
const NO_CONTRIBUTIONS: CorePluginContributions = {
  commands: [],
  statusItems: [],
  ribbonIcons: [],
  sidebarPanels: [],
  settingsTabs: [],
  viewTypes: [],
};
const noop = () => () => {};

/** React view of a core-plugin host. `host` may be null while the vault is still loading. */
export function useCorePlugins(host: CorePluginHost | null) {
  const plugins = useSyncExternalStore(
    host ? (l) => host.registry.subscribe(l) : noop,
    () => (host ? host.registry.list() : NO_PLUGINS),
    () => NO_PLUGINS
  );
  const contributions = useSyncExternalStore(
    host ? (l) => host.subscribeContributions(l) : noop,
    () => (host ? host.getContributions() : NO_CONTRIBUTIONS),
    () => NO_CONTRIBUTIONS
  );
  const setEnabled = useCallback(
    (id: string, enabled: boolean) => (host ? host.registry.setEnabled(id, enabled) : Promise.resolve()),
    [host]
  );
  return { plugins, contributions, setEnabled };
}

/**
 * Runs plugin commands from their `hotkey`. App shortcuts win: the check waits until every keydown listener ran and
 * skips a key the app handled (`defaultPrevented`), so a plugin cannot take over Ctrl+S and the like whatever order
 * the listeners were added in.
 */
export function useCorePluginHotkeys(commands: HostCommand[]) {
  const ref = useRef(commands);
  ref.current = commands;
  useEffect(() => {
    const mac = isMacPlatform();
    const onKey = (e: KeyboardEvent) => {
      const cmd = ref.current.find((c) => c.hotkey && matchesHotkey(e, c.hotkey, mac));
      if (!cmd) return;
      setTimeout(() => {
        if (!e.defaultPrevented) cmd.run();
      }, 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

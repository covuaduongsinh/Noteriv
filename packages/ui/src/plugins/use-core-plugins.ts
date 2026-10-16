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
 * Runs plugin commands from their `hotkey`. App shortcuts win: a key the app handled (`defaultPrevented`) is left
 * alone, so a plugin cannot take over Ctrl+S and the like whatever order the listeners were added in. The check runs
 * after every app listener yet still inside the event, so a plugin key can also stop the browser's own action
 * (Ctrl+D would otherwise open the bookmark dialog): the capture listener, which runs first, appends a one-shot
 * bubble listener to `window`, the last stop of the bubble phase, after the app's own listeners there.
 */
export function useCorePluginHotkeys(commands: HostCommand[]) {
  const ref = useRef(commands);
  ref.current = commands;
  useEffect(() => {
    const mac = isMacPlatform();
    const onCapture = (e: KeyboardEvent) => {
      const cmd = ref.current.find((c) => c.hotkey && matchesHotkey(e, c.hotkey, mac));
      if (!cmd) return;
      const afterApp = (ev: KeyboardEvent) => {
        window.removeEventListener("keydown", afterApp);
        if (ev !== e || e.defaultPrevented) return;
        e.preventDefault();
        cmd.run();
      };
      window.addEventListener("keydown", afterApp);
      // If the app stopped propagation the listener never ran: drop it before the next key.
      setTimeout(() => window.removeEventListener("keydown", afterApp), 0);
    };
    window.addEventListener("keydown", onCapture, true);
    return () => window.removeEventListener("keydown", onCapture, true);
  }, []);
}

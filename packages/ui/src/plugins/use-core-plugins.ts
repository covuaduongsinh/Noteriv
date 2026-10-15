"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { CorePluginInfo } from "@noteriv/core/plugin-registry";
import type { CorePluginContributions, CorePluginHost } from "./core-plugin-host";

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

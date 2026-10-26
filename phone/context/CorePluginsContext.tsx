import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  CorePluginState,
  isCorePluginEnabled,
  loadCorePluginState,
  saveCorePluginState,
} from '@/lib/core-plugins';

interface CorePluginsContextValue {
  isEnabled: (id: string) => boolean;
  /** Persists the choice for the open vault; rejects if the file could not be written (the choice still applies). */
  setEnabled: (id: string, enabled: boolean) => Promise<void>;
}

const CorePluginsContext = createContext<CorePluginsContextValue | null>(null);

export function CorePluginsProvider({ children }: { children: React.ReactNode }) {
  const { vault } = useApp();
  const vaultPath = vault?.path ?? '';
  const [state, setState] = useState<CorePluginState>({});
  // Saved choices, read before any change is made: a switch flipped before they load must not replace them all.
  const loaded = useRef<Promise<CorePluginState>>(Promise.resolve({}));
  // Writes in the order the switches were flipped, each from the state after the one before.
  const saving = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    setState({});
    loaded.current = vaultPath ? loadCorePluginState(vaultPath) : Promise.resolve({});
    loaded.current.then((s) => {
      if (!cancelled) setState(s);
    });
    return () => {
      cancelled = true;
    };
  }, [vaultPath]);

  const setEnabled = useCallback(
    (id: string, enabled: boolean) => {
      setState((prev) => ({ ...prev, [id]: enabled }));
      const run = saving.current.then(async () => {
        const saved = await loaded.current;
        const next = { ...saved, [id]: enabled };
        loaded.current = Promise.resolve(next);
        if (vaultPath) await saveCorePluginState(vaultPath, next);
      });
      saving.current = run.catch(() => undefined);
      return run;
    },
    [vaultPath]
  );

  const value = useMemo<CorePluginsContextValue>(
    () => ({ isEnabled: (id) => isCorePluginEnabled(state, id), setEnabled }),
    [state, setEnabled]
  );

  return <CorePluginsContext.Provider value={value}>{children}</CorePluginsContext.Provider>;
}

export function useCorePlugins(): CorePluginsContextValue {
  const ctx = useContext(CorePluginsContext);
  if (!ctx) throw new Error('useCorePlugins must be used within CorePluginsProvider');
  return ctx;
}

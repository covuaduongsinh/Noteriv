import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    let cancelled = false;
    setState({});
    if (vaultPath) {
      loadCorePluginState(vaultPath).then((s) => {
        if (!cancelled) setState(s);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [vaultPath]);

  const setEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      const next = { ...state, [id]: enabled };
      setState(next);
      if (vaultPath) await saveCorePluginState(vaultPath, next);
    },
    [state, vaultPath]
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

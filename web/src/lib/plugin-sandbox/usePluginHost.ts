"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { webApi, type ApiPlugin, type VaultIndex } from "@/lib/webApi";
import type { PluginCommandRef, PluginNotice, EditorBridge, PluginPermission } from "./types";

const SANDBOX_URL = "/plugin-sandbox.html";

const METHOD_PERMISSIONS: Record<string, PluginPermission | null> = {
  "vault.read": "vault:read",
  "vault.list": "vault:read",
  "vault.exists": "vault:read",
  "vault.write": "vault:write",
  "vault.delete": "vault:write",
  "editor.getContent": "editor:read",
  "editor.getSelection": "editor:read",
  "editor.setContent": "editor:write",
  "editor.insertAtCursor": "editor:write",
  "editor.replaceSelection": "editor:write",
  "ui.addCommand": "ui:commands",
  "ui.removeCommand": "ui:commands",
  "ui.showNotice": null, // always allowed, informational only
  "app.loadSettings": null,
  "app.saveSettings": null,
};

interface LoadedPlugin {
  dbId: string;
  pluginId: string;
  permissions: PluginPermission[];
  iframe: HTMLIFrameElement;
  ready: boolean;
}

/**
 * Mounts one sandboxed <iframe> per enabled plugin (see public/plugin-sandbox.html
 * for why the sandbox boundary is what provides isolation, not which origin serves
 * the file) and bridges its postMessage RPC calls to real webApi/editor actions —
 * but only for methods the plugin's manifest declared permissions for.
 */
export function usePluginHost(
  vaultId: string,
  vaultIndex: VaultIndex | null,
  editorBridge: EditorBridge,
  onVaultMutated: () => void
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pluginsRef = useRef<Map<Window, LoadedPlugin>>(new Map());
  const vaultIndexRef = useRef<VaultIndex | null>(vaultIndex);
  vaultIndexRef.current = vaultIndex;

  const [commands, setCommands] = useState<PluginCommandRef[]>([]);
  const [notices, setNotices] = useState<PluginNotice[]>([]);
  const [installed, setInstalled] = useState<ApiPlugin[]>([]);

  const refreshInstalled = useCallback(() => {
    webApi.plugins.list(vaultId).then(setInstalled);
  }, [vaultId]);

  useEffect(() => {
    refreshInstalled();
  }, [refreshInstalled]);

  const dismissNotice = useCallback((key: string) => {
    setNotices((prev) => prev.filter((n) => n.key !== key));
  }, []);

  async function resolveNoteIdByPath(path: string): Promise<string | null> {
    const note = vaultIndexRef.current?.notes.find((n) => n.path === path);
    return note?.id ?? null;
  }

  async function handleVaultRead(path: string): Promise<string | null> {
    const id = await resolveNoteIdByPath(path);
    if (!id) return null;
    const note = await webApi.notes.get(vaultId, id);
    return note.content;
  }

  async function handleVaultWrite(path: string, content: string): Promise<boolean> {
    const id = await resolveNoteIdByPath(path);
    if (id) {
      await webApi.notes.update(vaultId, id, { content });
    } else {
      const lastSlash = path.lastIndexOf("/");
      const name = lastSlash === -1 ? path : path.slice(lastSlash + 1);
      const folderPath = lastSlash === -1 ? null : path.slice(0, lastSlash);
      const folder = folderPath ? vaultIndexRef.current?.folders.find((f) => f.path === folderPath) : null;
      if (folderPath && !folder) {
        // v1 simplification: plugins can write into existing folders or the
        // vault root, but won't auto-create a folder chain from a path string.
        throw new Error(`folder "${folderPath}" does not exist`);
      }
      await webApi.notes.create(vaultId, { name, folderId: folder?.id ?? null, content });
    }
    onVaultMutated();
    return true;
  }

  async function dispatchCall(plugin: LoadedPlugin, method: string, args: unknown[]): Promise<unknown> {
    const required = METHOD_PERMISSIONS[method];
    if (required === undefined) throw new Error(`unknown method "${method}"`);
    if (required && !plugin.permissions.includes(required)) {
      throw new Error(`plugin "${plugin.pluginId}" lacks permission "${required}" for ${method}`);
    }

    switch (method) {
      case "vault.read":
        return handleVaultRead(args[0] as string);
      case "vault.write":
        return handleVaultWrite(args[0] as string, args[1] as string);
      case "vault.exists":
        return (await resolveNoteIdByPath(args[0] as string)) !== null;
      case "vault.list":
        return (vaultIndexRef.current?.notes ?? []).map((n) => ({ path: n.path, name: n.name, isDir: false }));
      case "vault.delete": {
        const id = await resolveNoteIdByPath(args[0] as string);
        if (!id) return false;
        await webApi.notes.remove(vaultId, id);
        onVaultMutated();
        return true;
      }
      case "editor.getContent":
        return editorBridge.getContent();
      case "editor.setContent":
        editorBridge.setContent(args[0] as string);
        return undefined;
      case "editor.insertAtCursor":
        editorBridge.insertAtCursor(args[0] as string);
        return undefined;
      case "editor.getSelection":
        return editorBridge.getSelection();
      case "editor.replaceSelection":
        editorBridge.replaceSelection(args[0] as string);
        return undefined;
      case "ui.addCommand": {
        const cmd = args[0] as { id: string; name: string; icon?: string };
        setCommands((prev) => [
          ...prev.filter((c) => !(c.pluginDbId === plugin.dbId && c.id === cmd.id)),
          { pluginDbId: plugin.dbId, pluginId: plugin.pluginId, id: cmd.id, name: cmd.name, icon: cmd.icon },
        ]);
        return undefined;
      }
      case "ui.removeCommand": {
        const id = args[0] as string;
        setCommands((prev) => prev.filter((c) => !(c.pluginDbId === plugin.dbId && c.id === id)));
        return undefined;
      }
      case "ui.showNotice": {
        const message = args[0] as string;
        const key = `${plugin.dbId}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
        setNotices((prev) => [...prev, { key, message }]);
        const duration = (args[1] as number | undefined) ?? 4000;
        setTimeout(() => dismissNotice(key), duration);
        return undefined;
      }
      case "app.loadSettings": {
        const p = installed.find((ip) => ip.id === plugin.dbId);
        return p?.settings ?? {};
      }
      case "app.saveSettings": {
        await webApi.plugins.update(vaultId, plugin.dbId, { settings: args[0] as Record<string, unknown> });
        refreshInstalled();
        return undefined;
      }
      default:
        throw new Error(`unknown method "${method}"`);
    }
  }

  // Mount/unmount iframes as the enabled-plugin set changes.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const enabled = installed.filter((p) => p.enabled);
    const wanted = new Set(enabled.map((p) => p.id));

    // Tear down iframes for plugins that are no longer enabled/installed.
    for (const [win, loaded] of pluginsRef.current) {
      if (!wanted.has(loaded.dbId)) {
        loaded.iframe.remove();
        pluginsRef.current.delete(win);
        setCommands((prev) => prev.filter((c) => c.pluginDbId !== loaded.dbId));
      }
    }

    const alreadyMounted = new Set(Array.from(pluginsRef.current.values()).map((p) => p.dbId));

    for (const plugin of enabled) {
      if (alreadyMounted.has(plugin.id)) continue;

      const iframe = document.createElement("iframe");
      iframe.sandbox.add("allow-scripts");
      iframe.src = SANDBOX_URL;
      iframe.style.display = "none";
      iframe.setAttribute("title", `plugin:${plugin.pluginId}`);
      container.appendChild(iframe);

      // contentWindow only exists once the iframe element is attached; the LoadedPlugin
      // record is keyed by it below once the frame posts its first "ready" message.
      const bootWhenReady = (event: MessageEvent) => {
        if (event.source !== iframe.contentWindow) return;
        if (event.data?.type !== "noteriv:ready") return;
        window.removeEventListener("message", bootWhenReady);

        const loaded: LoadedPlugin = {
          dbId: plugin.id,
          pluginId: plugin.pluginId,
          permissions: (plugin.manifest.permissions ?? []) as PluginPermission[],
          iframe,
          ready: true,
        };
        pluginsRef.current.set(iframe.contentWindow as Window, loaded);
        iframe.contentWindow?.postMessage({ type: "noteriv:boot", mainJs: plugin.mainJs }, "*");
      };
      window.addEventListener("message", bootWhenReady);
    }
  }, [installed]);

  // Single long-lived listener that routes RPC calls from whichever plugin iframe sent them.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const source = event.source as Window | null;
      if (!source) return;
      const loaded = pluginsRef.current.get(source);
      if (!loaded) return; // not a message from a tracked plugin iframe

      const data = event.data;
      if (!data || typeof data !== "object") return;

      if (data.type === "noteriv:call") {
        dispatchCall(loaded, data.method, data.args ?? [])
          .then((result) => {
            source.postMessage({ type: "noteriv:response", callId: data.callId, ok: true, result }, "*");
          })
          .catch((err: Error) => {
            source.postMessage({ type: "noteriv:response", callId: data.callId, ok: false, error: err.message }, "*");
          });
        return;
      }

      if (data.type === "noteriv:boot-result" && data.ok === false) {
        const key = `${loaded.dbId}:boot-error`;
        setNotices((prev) => [...prev, { key, message: `Plugin "${loaded.pluginId}" lỗi: ${data.error}` }]);
      }

      if (data.type === "noteriv:log" && data.level === "error") {
        const key = `${loaded.dbId}:log:${Date.now()}`;
        setNotices((prev) => [...prev, { key, message: `[${loaded.pluginId}] ${data.message}` }]);
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultId, installed]);

  const runCommand = useCallback((pluginDbId: string, commandId: string) => {
    for (const loaded of pluginsRef.current.values()) {
      if (loaded.dbId === pluginDbId) {
        loaded.iframe.contentWindow?.postMessage({ type: "noteriv:invoke-command", commandId }, "*");
        return;
      }
    }
  }, []);

  return { containerRef, commands, notices, dismissNotice, runCommand, installed, refreshInstalled };
}

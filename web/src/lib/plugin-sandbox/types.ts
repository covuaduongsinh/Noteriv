export type PluginPermission = "vault:read" | "vault:write" | "editor:read" | "editor:write" | "ui:commands";

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  main: string;
  permissions: PluginPermission[];
}

export interface PluginCommandRef {
  pluginDbId: string;
  pluginId: string;
  id: string;
  name: string;
  icon?: string;
}

export interface PluginNotice {
  key: string;
  message: string;
}

/** What the vault page must provide so plugins' `api.editor.*` calls have something real to act on. */
export interface EditorBridge {
  getContent: () => string | null;
  setContent: (content: string) => void;
  insertAtCursor: (text: string) => void;
  getSelection: () => string;
  replaceSelection: (text: string) => void;
}

export type PluginPermission = "vault:read" | "vault:write" | "editor:read" | "editor:write" | "ui:commands" | "ui:statusbar" | "ui:panel" | "markdown:render";

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

export interface PluginStatusItem {
  pluginDbId: string;
  pluginId: string;
  id: string;
  text: string;
  title?: string;
  clickable: boolean;
}

/** Everything a plugin may read synchronously via api.editor.* / api.app.currentFile. */
export interface EditorSnapshot {
  content: string | null;
  selection: string;
  cursor: { line: number; ch: number };
  currentFile: string | null;
}

export type PluginEventName =
  | "file-open"
  | "file-save"
  | "file-create"
  | "file-delete"
  | "editor-change"
  | "vault-change"
  | "layout-change";

/** A sidebar panel or settings tab a plugin registered; `html`/`css` is the sandbox's latest serialised render. */
export interface PluginPanelRef {
  pluginDbId: string;
  pluginId: string;
  kind: "sidebar" | "settings";
  id: string;
  title: string;
  icon?: string;
  html: string;
  css: string;
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

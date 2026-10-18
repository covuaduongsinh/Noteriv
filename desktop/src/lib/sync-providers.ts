import { t } from "@noteriv/ui/i18n";

export type SyncProviderType = "none" | "folder" | "webdav";

export interface FolderSyncConfig {
  targetPath: string;
  direction: "push" | "pull" | "both";
}

export interface WebDAVSyncConfig {
  url: string;
  username: string;
  password: string;
  remotePath: string;
}

export const DEFAULT_WEBDAV_CONFIG: WebDAVSyncConfig = {
  url: "",
  username: "",
  password: "",
  remotePath: "/Noteriv",
};

/** `name` and `description` are read when the menu renders, so they follow the current language. */
export interface SyncProviderInfo {
  type: SyncProviderType;
  name: () => string;
  description: () => string;
}

export const SYNC_PROVIDERS: SyncProviderInfo[] = [
  {
    type: "none",
    name: () => t("desktop.sync.providers.none.name"),
    description: () => t("desktop.sync.providers.none.desc"),
  },
  {
    type: "folder",
    name: () => t("desktop.sync.providers.folder.name"),
    description: () => t("desktop.sync.providers.folder.desc"),
  },
  {
    type: "webdav",
    name: () => t("desktop.sync.providers.webdav.name"),
    description: () => t("desktop.sync.providers.webdav.desc"),
  },
];

export const FOLDER_DIRECTIONS: { label: () => string; value: FolderSyncConfig["direction"] }[] = [
  { label: () => t("settings.sync.direction.both"), value: "both" },
  { label: () => t("settings.sync.direction.push"), value: "push" },
  { label: () => t("settings.sync.direction.pull"), value: "pull" },
];

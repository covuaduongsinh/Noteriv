import { t } from "@noteriv/ui/i18n";

export interface AppSettings {
  autoSaveInterval: number; // seconds, 0 = disabled
  spellCheck: boolean;
  accentColor: string;
  fontSize: number;
  lineHeight: number;
  editorFont: string;
  tabSize: number;
  gitSyncInterval: number; // minutes, 0 = disabled
  syncOnSave: boolean;     // git sync after every manual save
  pullOnOpen: boolean;     // git pull when opening a vault
  commitMessageFormat: string; // template: {date}, {time}, {count}
  extraSyncProvider: "none" | "folder" | "webdav";
  folderSync: { targetPath: string; direction: "push" | "pull" | "both" };
  webdavSync: { url: string; username: string; password: string; remotePath: string };
  theme: string; // theme ID
  autoUpdate: boolean; // check for and install updates automatically
  autoCollapseSidebar: boolean;
  sidebarCollapseWidth: number;
  pdfColumnLayout: 1 | 2;       // number of print columns for PDF export
  pdfChessboardWidth: 75 | 100; // chessboard width as % of column width; no UI in the general product, the chess edition plugin will expose it
  language?: "en" | "vi" | "auto"; // interface language; "auto" follows the system (src/lib/i18n.ts)
}

export const DEFAULT_SETTINGS: AppSettings = {
  autoSaveInterval: 30,
  spellCheck: false,
  accentColor: "#89b4fa",
  fontSize: 15,
  lineHeight: 1.75,
  editorFont: "JetBrains Mono",
  tabSize: 4,
  gitSyncInterval: 5,
  syncOnSave: false,
  pullOnOpen: true,
  commitMessageFormat: "Sync {date} {time}",
  extraSyncProvider: "none",
  folderSync: { targetPath: "", direction: "both" },
  webdavSync: { url: "", username: "", password: "", remotePath: "/Noteriv" },
  theme: "catppuccin-mocha",
  autoUpdate: true,
  autoCollapseSidebar: true,
  sidebarCollapseWidth: 800,
  pdfColumnLayout: 2,
  pdfChessboardWidth: 75,
};

// `label`s are read when a menu renders, so they follow the current language.
export const ACCENT_COLORS = [
  { name: "blue", value: "#89b4fa", label: () => t("settings.accent.blue") },
  { name: "lavender", value: "#b4befe", label: () => t("settings.accent.lavender") },
  { name: "mauve", value: "#cba6f7", label: () => t("settings.accent.mauve") },
  { name: "pink", value: "#f38ba8", label: () => t("settings.accent.pink") },
  { name: "peach", value: "#fab387", label: () => t("settings.accent.peach") },
  { name: "yellow", value: "#f9e2af", label: () => t("settings.accent.yellow") },
  { name: "green", value: "#a6e3a1", label: () => t("settings.accent.green") },
  { name: "teal", value: "#94e2d5", label: () => t("settings.accent.teal") },
];

export const EDITOR_FONTS = [
  { name: "JetBrains Mono", value: "JetBrains Mono" },
  { name: "Fira Code", value: "Fira Code" },
  { name: "Cascadia Code", value: "Cascadia Code" },
  { name: "Source Code Pro", value: "Source Code Pro" },
  { name: "SF Mono", value: "SF Mono" },
  { name: "System Mono", value: "monospace" },
];

export const AUTO_SAVE_OPTIONS = [
  { label: () => t("settings.off"), value: 0 },
  { label: () => t("settings.duration.seconds", { count: 10 }), value: 10 },
  { label: () => t("settings.duration.seconds", { count: 30 }), value: 30 },
  { label: () => t("settings.duration.minutes", { count: 1 }), value: 60 },
  { label: () => t("settings.duration.minutes", { count: 5 }), value: 300 },
];

export const SYNC_OPTIONS = [
  { label: () => t("settings.off"), value: 0 },
  { label: () => t("settings.duration.minutes", { count: 1 }), value: 1 },
  { label: () => t("settings.duration.minutes", { count: 5 }), value: 5 },
  { label: () => t("settings.duration.minutes", { count: 10 }), value: 10 },
  { label: () => t("settings.duration.minutes", { count: 30 }), value: 30 },
];

export const PDF_COLUMN_LAYOUT_OPTIONS = [
  { label: () => t("settings.pdfColumns", { count: 1 }), value: 1 },
  { label: () => t("settings.pdfColumns", { count: 2 }), value: 2 },
];

export function applySettings(s: AppSettings) {
  const root = document.documentElement.style;
  root.setProperty("--accent", s.accentColor);
  root.setProperty("--editor-font-size", `${s.fontSize}px`);
  root.setProperty("--editor-line-height", String(s.lineHeight));
  root.setProperty("--editor-font", `'${s.editorFont}', 'Fira Code', monospace`);
}

export function mergeSettings(saved: Partial<AppSettings>): AppSettings {
  return { ...DEFAULT_SETTINGS, ...saved };
}

export function formatCommitMessage(template: string, changeCount?: number): string {
  const now = new Date();
  return template
    .replace("{date}", now.toISOString().split("T")[0])
    .replace("{time}", now.toLocaleTimeString())
    .replace("{count}", String(changeCount ?? 0));
}

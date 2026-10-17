/**
 * Editor preference option lists — a reduced subset of
 * desktop/src/lib/settings.ts's AppSettings (only the fields web's Settings
 * modal actually wires up: editor font/size/line-height and autosave
 * interval). Applied via the --editor-font/--editor-font-size/
 * --editor-line-height CSS vars globals.css already defines (byte-identical
 * to desktop's stylesheet, see docs/plans/2026-10-13-noteriv-web-ui-parity.md).
 */

export const EDITOR_FONTS: { name: string; value: string }[] = [
  { name: "JetBrains Mono", value: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace' },
  { name: "Fira Code", value: '"Fira Code", "JetBrains Mono", monospace' },
  { name: "Cascadia Code", value: '"Cascadia Code", "JetBrains Mono", monospace' },
  { name: "System Monospace", value: "ui-monospace, Menlo, Consolas, monospace" },
];

export const AUTO_SAVE_OPTIONS: { label: string; value: number }[] = [
  { label: "500ms (gần như tức thì)", value: 500 },
  { label: "800ms (mặc định)", value: 800 },
  { label: "2 giây", value: 2000 },
  { label: "5 giây", value: 5000 },
];

export const DEFAULT_EDITOR_SETTINGS = {
  editorFont: EDITOR_FONTS[0].value,
  fontSize: 15,
  lineHeight: 1.7,
  autoSaveInterval: 800,
  // Phase D7 — ported from desktop/src/lib/vim-mode.ts's on/off toggle.
  vimModeEnabled: false,
  // Parity plan v2, Pha 6 — ported from desktop/src/lib/settings.ts.
  spellCheck: false,
  accentColor: "", // "" = keep the active theme's accent
  tabSize: 4,
  pdfColumnLayout: 2 as 1 | 2,
  // No UI in the general product (still applied to PDF export); the chess edition plugin will expose it.
  pdfChessboardWidth: 75 as 75 | 100,
  /** Collapse the sidebar automatically on narrow windows. */
  autoCollapseSidebar: true,
};

export const ACCENT_COLORS: { name: string; value: string }[] = [
  { name: "Mặc định theo theme", value: "" },
  { name: "Blue", value: "#89b4fa" },
  { name: "Lavender", value: "#b4befe" },
  { name: "Mauve", value: "#cba6f7" },
  { name: "Pink", value: "#f38ba8" },
  { name: "Peach", value: "#fab387" },
  { name: "Yellow", value: "#f9e2af" },
  { name: "Green", value: "#a6e3a1" },
  { name: "Teal", value: "#94e2d5" },
];

export const TAB_SIZES = [2, 4, 8];

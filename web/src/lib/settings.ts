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
};

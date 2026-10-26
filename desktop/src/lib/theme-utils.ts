import { BUILT_IN_THEMES, type ThemeDefinition } from "@noteriv/core/themes";

// The built-in themes and their types live in @noteriv/core (shared with the other apps).
export { BUILT_IN_THEMES, type ThemeColors, type ThemeDefinition } from "@noteriv/core/themes";

/** Mix two hex colors: t=0 → a, t=1 → b. Returns #rrggbb. Falls back to `a`
 *  if either input isn't a parseable hex (custom themes using rgb()/names). */
function mixHex(a: string, b: string, t: number): string {
  const parse = (h: string): [number, number, number] | null => {
    let s = h.trim().replace(/^#/, "");
    if (s.length === 3) s = s.split("").map((c) => c + c).join("");
    if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
    const n = parseInt(s, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const ca = parse(a);
  const cb = parse(b);
  if (!ca || !cb) return a;
  const ch = (x: number, y: number) =>
    Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${ch(ca[0], cb[0])}${ch(ca[1], cb[1])}${ch(ca[2], cb[2])}`;
}

export function applyTheme(theme: ThemeDefinition): void {
  const root = document.documentElement.style;
  root.setProperty("--bg-primary", theme.colors.bgPrimary);
  root.setProperty("--bg-secondary", theme.colors.bgSecondary);
  root.setProperty("--bg-tertiary", theme.colors.bgTertiary);
  root.setProperty("--border", theme.colors.border);
  root.setProperty("--text-primary", theme.colors.textPrimary);
  root.setProperty("--text-secondary", theme.colors.textSecondary);
  root.setProperty("--text-muted", theme.colors.textMuted);
  root.setProperty("--accent", theme.colors.accent);
  root.setProperty("--green", theme.colors.green);
  root.setProperty("--red", theme.colors.red);
  root.setProperty("--yellow", theme.colors.yellow);
  root.setProperty("--blue", theme.colors.blue);
  root.setProperty("--mauve", theme.colors.mauve);
  root.setProperty("--peach", theme.colors.peach);
  root.setProperty("--teal", theme.colors.teal);
  root.setProperty("--pink", theme.colors.pink);
  root.setProperty("--scrollbar", theme.colors.scrollbar);
  root.setProperty("--scrollbar-hover", theme.colors.scrollbarHover);

  // Derived vars themes don't define explicitly. Previously these were left at
  // the Mocha defaults in :root, so the graph canvas (reads --bg-surface) and
  // hover states (--bg-hover) ignored the selected theme. Concrete hex values
  // so the canvas fillStyle/strokeStyle can use them directly.
  root.setProperty("--bg-surface", theme.colors.bgTertiary);
  root.setProperty("--bg-hover", mixHex(theme.colors.bgTertiary, theme.colors.textPrimary, 0.12));
  root.setProperty("--accent-hover", mixHex(theme.colors.accent, theme.colors.textPrimary, 0.15));
}

export async function loadCustomThemes(vaultPath: string): Promise<ThemeDefinition[]> {
  if (!window.electronAPI) return [];
  const themesDir = `${vaultPath}/.noteriv/themes`;
  await window.electronAPI.createDir(themesDir);

  try {
    const entries = await window.electronAPI.readDir(themesDir);
    const themes: ThemeDefinition[] = [];
    for (const entry of entries) {
      if (entry.isDirectory || !entry.name.endsWith(".json")) continue;
      try {
        const raw = await window.electronAPI.readFile(entry.path);
        if (raw) {
          const theme = JSON.parse(raw) as ThemeDefinition;
          if (theme.id && theme.name && theme.colors) {
            themes.push(theme);
          }
        }
      } catch { /* skip invalid */ }
    }
    return themes;
  } catch {
    return [];
  }
}

export async function saveCustomTheme(vaultPath: string, theme: ThemeDefinition): Promise<boolean> {
  if (!window.electronAPI) return false;
  const themesDir = `${vaultPath}/.noteriv/themes`;
  await window.electronAPI.createDir(themesDir);
  return window.electronAPI.writeFile(`${themesDir}/${theme.id}.json`, JSON.stringify(theme, null, 2));
}

export async function deleteCustomTheme(vaultPath: string, themeId: string): Promise<boolean> {
  if (!window.electronAPI) return false;
  return window.electronAPI.deleteFile(`${vaultPath}/.noteriv/themes/${themeId}.json`);
}

export function exportTheme(theme: ThemeDefinition): string {
  return JSON.stringify(theme, null, 2);
}

export function importTheme(json: string): ThemeDefinition | null {
  try {
    const theme = JSON.parse(json) as ThemeDefinition;
    if (!theme.id || !theme.name || !theme.colors || !theme.colors.bgPrimary) return null;
    return theme;
  } catch {
    return null;
  }
}

// ── Community themes ──

const COMMUNITY_REPO_BASE =
  "https://raw.githubusercontent.com/thejacedev/NoterivThemes/main";

export interface CommunityThemeEntry {
  id: string;
  name: string;
  author: string;
  file: string;
  type: "dark" | "light";
}

export interface CommunityManifest {
  name: string;
  description: string;
  version: string;
  themes: CommunityThemeEntry[];
}

export async function fetchCommunityManifest(): Promise<CommunityManifest | null> {
  try {
    const res = await fetch(`${COMMUNITY_REPO_BASE}/manifest.json`);
    if (!res.ok) return null;
    return (await res.json()) as CommunityManifest;
  } catch {
    return null;
  }
}

export async function fetchCommunityTheme(file: string): Promise<ThemeDefinition | null> {
  try {
    const res = await fetch(`${COMMUNITY_REPO_BASE}/${file}`);
    if (!res.ok) return null;
    const theme = (await res.json()) as ThemeDefinition;
    if (!theme.id || !theme.name || !theme.colors) return null;
    return theme;
  } catch {
    return null;
  }
}

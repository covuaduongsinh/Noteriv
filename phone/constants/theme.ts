import {
  BUILT_IN_THEMES as SHARED_THEMES,
  isLightTheme,
  type ThemeColors as SharedThemeColors,
  type ThemeDefinition as SharedThemeDefinition,
} from '@noteriv/core/themes';

// --- Theme type definitions ---

/** The palette of a theme, as on web and desktop (the phone has no scrollbars to colour). */
export type ThemeColors = Omit<SharedThemeColors, 'scrollbar' | 'scrollbarHover'>;

/** A theme as on web and desktop, plus whether it is dark or light. */
export interface ThemeDefinition extends Omit<SharedThemeDefinition, 'author' | 'version' | 'colors'> {
  author?: string;
  version?: string;
  type: 'dark' | 'light';
  colors: ThemeColors;
}

// --- Built-in themes: the same list as web and desktop (@noteriv/core/themes) ---

export const BUILT_IN_THEMES: ThemeDefinition[] = SHARED_THEMES.map((theme) => ({
  ...theme,
  type: isLightTheme(theme.colors) ? 'light' : 'dark',
}));

// --- Helpers ---

export function getTheme(id: string): ThemeColors {
  const theme = BUILT_IN_THEMES.find((t) => t.id === id);
  return theme?.colors ?? BUILT_IN_THEMES[0].colors;
}

// --- Backward compatibility ---

// Legacy palette shape matching the old CatppuccinMocha / CatppuccinLatte exports
const mochaTheme = BUILT_IN_THEMES[0].colors;
const latteTheme = BUILT_IN_THEMES[1].colors;

export const CatppuccinMocha = {
  base: mochaTheme.bgPrimary,
  mantle: mochaTheme.bgSecondary,
  crust: '#11111b',
  surface0: mochaTheme.bgTertiary,
  surface1: mochaTheme.border,
  surface2: '#585b70',
  overlay0: mochaTheme.textMuted,
  overlay1: '#7f849c',
  overlay2: '#9399b2',
  subtext0: '#a6adc8',
  subtext1: mochaTheme.textSecondary,
  text: mochaTheme.textPrimary,
  lavender: '#b4befe',
  blue: mochaTheme.blue,
  sapphire: '#74c7ec',
  sky: '#89dceb',
  teal: mochaTheme.teal,
  green: mochaTheme.green,
  yellow: mochaTheme.yellow,
  peach: mochaTheme.peach,
  maroon: '#eba0ac',
  red: mochaTheme.red,
  mauve: mochaTheme.mauve,
  pink: mochaTheme.pink,
  flamingo: '#f2cdcd',
  rosewater: '#f5e0dc',
};

export const CatppuccinLatte = {
  base: latteTheme.bgPrimary,
  mantle: latteTheme.bgSecondary,
  crust: '#dce0e8',
  surface0: latteTheme.bgTertiary,
  surface1: latteTheme.border,
  surface2: '#acb0be',
  overlay0: latteTheme.textMuted,
  overlay1: '#8c8fa1',
  overlay2: '#7c7f93',
  subtext0: '#6c6f85',
  subtext1: latteTheme.textSecondary,
  text: latteTheme.textPrimary,
  lavender: '#7287fd',
  blue: latteTheme.blue,
  sapphire: '#209fb5',
  sky: '#04a5e5',
  teal: latteTheme.teal,
  green: latteTheme.green,
  yellow: latteTheme.yellow,
  peach: latteTheme.peach,
  maroon: '#e64553',
  red: latteTheme.red,
  mauve: latteTheme.mauve,
  pink: latteTheme.pink,
  flamingo: '#dd7878',
  rosewater: '#dc8a78',
};

export type ThemePalette = typeof CatppuccinMocha;

export const AccentColors = {
  blue: { dark: '#89b4fa', light: '#1e66f5' },
  lavender: { dark: '#b4befe', light: '#7287fd' },
  mauve: { dark: '#cba6f7', light: '#8839ef' },
  pink: { dark: '#f5c2e7', light: '#ea76cb' },
  peach: { dark: '#fab387', light: '#fe640b' },
  yellow: { dark: '#f9e2af', light: '#df8e1d' },
  green: { dark: '#a6e3a1', light: '#40a02b' },
  teal: { dark: '#94e2d5', light: '#179299' },
} as const;

export const Themes = {
  'catppuccin-mocha': CatppuccinMocha,
  'catppuccin-latte': CatppuccinLatte,
} as const;

export type ThemeId = keyof typeof Themes;

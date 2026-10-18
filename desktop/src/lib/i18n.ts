import { isLocale, resolveLocale, setLocale, type Locale } from "@noteriv/ui/i18n";

/**
 * Language of the desktop app.
 *
 * Order: the developer override, the choice in Settings (`AppSettings.language`; "auto" follows the system), the
 * system's languages (as WebView2 reports them), then English. Importing this module applies the system language at
 * once, before the settings file is read. Catalogs other than English load on demand.
 */
export const DEFAULT_LOCALE: Locale = "en";

/** Developer override to try a language: `localStorage["noteriv.locale.dev"] = "vi"`. */
export const DEV_LOCALE_STORAGE_KEY = "noteriv.locale.dev";

/** The Settings value meaning "follow the system". Stored explicitly (see `languageForStoredSettings`). */
export const AUTO_LANGUAGE = "auto";

function systemLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

/** Developer override, then the saved choice, then the system's languages, then English. */
export function chooseLocale(saved?: unknown, preferred: readonly string[] = systemLanguages()): Locale {
  let dev: string | null = null;
  try {
    dev = localStorage.getItem(DEV_LOCALE_STORAGE_KEY);
  } catch {
    /* no storage: no override */
  }
  if (isLocale(dev)) return dev;
  return resolveLocale({ saved, preferred, fallback: DEFAULT_LOCALE });
}

/**
 * The language setting for a settings file as read from disk. Installs from before the setting existed have a
 * settings file without it and keep the English they always had; a new install (no file yet) follows the system.
 */
export function languageForStoredSettings(saved: Record<string, unknown>): "en" | "vi" | "auto" {
  const value = saved.language;
  if (isLocale(value) || value === AUTO_LANGUAGE) return value;
  return Object.keys(saved).length > 0 ? "en" : AUTO_LANGUAGE;
}

/** Applies the language from the app settings (`AppSettings.language`). */
export function applyLanguage(saved: unknown): Promise<void> {
  return setLocale(chooseLocale(saved));
}

if (typeof window !== "undefined") void setLocale(chooseLocale());

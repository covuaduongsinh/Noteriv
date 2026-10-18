import { isLocale, setLocale, type Locale } from "@noteriv/ui/i18n";

/**
 * Language of the desktop app.
 *
 * Until every screen reads its text from the catalogs (Stage 4, end of session 4.5), the app stays English by
 * default and ignores the OS language. At the end of 4.5 the default becomes the OS language with English as the
 * fallback, and Settings gets a Language picker. Other catalogs load on demand.
 */
export const TRANSITION_DEFAULT_LOCALE: Locale = "en";

/** Developer override to try another language before the picker exists: `localStorage["noteriv.locale.dev"] = "vi"`. */
export const DEV_LOCALE_STORAGE_KEY = "noteriv.locale.dev";

/** Developer override, then the saved setting, then the transition default. */
export function chooseLocale(saved?: unknown): Locale {
  let dev: string | null = null;
  try {
    dev = localStorage.getItem(DEV_LOCALE_STORAGE_KEY);
  } catch {
    /* no storage: no override */
  }
  if (isLocale(dev)) return dev;
  if (isLocale(saved)) return saved;
  return TRANSITION_DEFAULT_LOCALE;
}

/** Applies the language from the app settings (`AppSettings.language`). */
export function applyLanguage(saved: unknown): Promise<void> {
  return setLocale(chooseLocale(saved));
}

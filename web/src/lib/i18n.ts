import { isLocale, registerCatalog, setLocale, type Locale } from "@noteriv/ui/i18n";
import vi from "@noteriv/ui/i18n/locales/vi.json";

/**
 * Language of the web app.
 *
 * Until every web screen reads its text from the catalogs (Stage 4, end of session 4.3), the app stays Vietnamese by
 * default and ignores the browser's language, so production never mixes two languages. The Vietnamese catalog is
 * therefore bundled (it is what the first paint shows). At the end of 4.3 the default becomes the browser's
 * language with English as the fallback, and Settings gets a Language picker.
 *
 * Importing this module sets the language, on the server and in the browser alike, so a page that shows catalog
 * text imports it (directly or through `chooseLocale`/`applyLanguage`) before it renders.
 */
export const TRANSITION_DEFAULT_LOCALE: Locale = "vi";

/** Remembered choice, for pages shown before the user's preferences are loaded (login, vault list). */
export const LOCALE_STORAGE_KEY = "noteriv.locale";
/** Developer override to try another language before the picker exists: `localStorage["noteriv.locale.dev"] = "en"`. */
export const DEV_LOCALE_STORAGE_KEY = "noteriv.locale.dev";

registerCatalog("vi", vi);
void setLocale(TRANSITION_DEFAULT_LOCALE);

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Developer override, then the saved choice, then the transition default. */
export function chooseLocale(saved?: unknown): Locale {
  const dev = read(DEV_LOCALE_STORAGE_KEY);
  if (isLocale(dev)) return dev;
  if (isLocale(saved)) return saved;
  return TRANSITION_DEFAULT_LOCALE;
}

/** Applies the language stored on this device (call once mounted: the server render used the default). */
export function applyStoredLanguage(): void {
  void setLocale(chooseLocale(read(LOCALE_STORAGE_KEY)));
}

/** Applies the language from the user's preferences and remembers it on this device. */
export function applyLanguage(saved: unknown): void {
  if (isLocale(saved)) {
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, saved);
    } catch {
      /* private mode: the preference still applies to this page */
    }
  }
  void setLocale(chooseLocale(saved));
}

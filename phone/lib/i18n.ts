import { useSyncExternalStore } from 'react';
// The same module and catalogs as web and desktop (packages/ui/src/i18n). Its React hook (react.ts) is not used:
// it would import the web's React, not the phone's.
import { getLocale, onLocaleChange, registerCatalog, setLocale, t, type Locale } from '@noteriv/ui/i18n';
import vi from '../../packages/ui/src/i18n/locales/vi.json';
import type { AppSettings } from '@/types';

// Bundled up front, so the first screen is already in the chosen language (no lazy load on the phone).
registerCatalog('vi', vi);

export { t, getLocale };
export type { Locale };

/** The phone's own language: Vietnamese for `vi*`, English otherwise. */
export function deviceLocale(): Locale {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase().startsWith('vi') ? 'vi' : 'en';
  } catch {
    return 'en';
  }
}

/** Switches the text to the language chosen in Settings (`auto` = the phone's). */
export function applyLanguage(choice: AppSettings['language'] | undefined): void {
  void setLocale(choice === 'en' || choice === 'vi' ? choice : deviceLocale());
}

/** `t`, with the component re-rendered when the language changes. */
export function useT(): typeof t {
  useSyncExternalStore(onLocaleChange, getLocale, getLocale);
  return t;
}

applyLanguage('auto');

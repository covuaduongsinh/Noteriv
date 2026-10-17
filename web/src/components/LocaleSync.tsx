"use client";

import { useEffect } from "react";
import { applyStoredLanguage } from "@/lib/i18n";

/** Switches to the language stored on this device once the page is mounted (the server rendered the default). */
export default function LocaleSync() {
  useEffect(() => {
    applyStoredLanguage();
  }, []);
  return null;
}

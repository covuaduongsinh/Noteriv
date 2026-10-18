import type { Metadata } from "next";
import "@noteriv/ui/styles/katex.css";
import "./globals.css";
import LocaleSync from "@/components/LocaleSync";
import { DEFAULT_LOCALE, LOCALE_BOOT_SCRIPT } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Noteriv",
  description: "Noteriv — modern markdown notes, in your browser",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The server renders the default language; the head script sets `lang` (and holds the paint) when the browser or
  // the user's choice says otherwise, hence suppressHydrationWarning. The i18n module keeps `lang` up to date after.
  return (
    <html lang={DEFAULT_LOCALE} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOCALE_BOOT_SCRIPT }} />
      </head>
      <body>
        <LocaleSync />
        {children}
      </body>
    </html>
  );
}

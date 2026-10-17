import type { Metadata } from "next";
import "@noteriv/ui/styles/katex.css";
import "./globals.css";
import LocaleSync from "@/components/LocaleSync";

export const metadata: Metadata = {
  title: "Noteriv",
  description: "Noteriv — modern markdown notes, in your browser",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // `lang` is the default language (web/src/lib/i18n.ts); the i18n module updates it when the language changes.
  return (
    <html lang="vi">
      <body>
        <LocaleSync />
        {children}
      </body>
    </html>
  );
}

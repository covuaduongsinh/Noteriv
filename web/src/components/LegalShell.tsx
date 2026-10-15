import Link from "next/link";
import type { ReactNode } from "react";
import { CONTACT_EMAIL, LAST_UPDATED, OPERATOR_NAME, isDraft } from "@/lib/legal";

/** Common frame for the legal pages: draft banner, Vietnamese / English jump links, cross links. */
export default function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex justify-center px-4 py-12">
      <main className="w-full max-w-3xl flex flex-col gap-6 text-[var(--text-primary)]">
        <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
          <Link href="/" className="hover:text-[var(--text-primary)]">
            ← Noteriv
          </Link>
          <nav className="flex gap-4">
            <a href="#vi" className="hover:text-[var(--text-primary)]">
              Tiếng Việt
            </a>
            <a href="#en" className="hover:text-[var(--text-primary)]">
              English
            </a>
            <Link href="/terms" className="hover:text-[var(--text-primary)]">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-[var(--text-primary)]">
              Privacy
            </Link>
          </nav>
        </div>

        {isDraft && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-3 text-sm">
            <strong>Bản nháp / Draft.</strong> Nội dung chưa được chủ dự án duyệt và chưa điền thông tin chủ thể vận hành. Đây
            không phải tư vấn pháp lý. / Not yet reviewed or completed by the operator. This is not legal advice.
          </div>
        )}

        <h1 className="text-3xl font-semibold">{title}</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Cập nhật / Last updated: {LAST_UPDATED}. Chủ thể vận hành / Operator: {OPERATOR_NAME || "[họ tên chủ dự án]"}
          {" · "}
          {CONTACT_EMAIL || "[email liên hệ]"}
        </p>

        {children}
      </main>
    </div>
  );
}

export function Section({ id, lang, title, children }: { id: string; lang: "vi" | "en"; title: string; children: ReactNode }) {
  return (
    <section id={id} lang={lang} className="flex flex-col gap-3 border-t border-[var(--border)] pt-6 scroll-mt-8">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="flex flex-col gap-3 leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1 [&_h3]:text-lg [&_h3]:font-medium [&_h3]:mt-2 [&_a]:text-[var(--accent)]">
        {children}
      </div>
    </section>
  );
}

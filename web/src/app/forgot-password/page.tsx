"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { webApi, ApiError } from "@/lib/webApi";
import { getLocale, t } from "@noteriv/ui/i18n";
import { useLocale } from "@noteriv/ui/i18n/react";
import LanguageSwitch from "@/components/LanguageSwitch";

export default function ForgotPasswordPage() {
  useLocale();
  const [email, setEmail] = useState("");
  // null until the server answers; assumed on when it cannot be asked, so the form is not hidden by mistake.
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    webApi.auth
      .registration()
      .then((r) => setEmailEnabled(r.emailEnabled !== false))
      .catch(() => setEmailEnabled(true));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await webApi.auth.forgotPassword({ email, locale: getLocale() });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) setError(t("web.auth.tooMany"));
      else if (err instanceof ApiError && err.status === 503) setEmailEnabled(false);
      else setError(t("web.auth.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-80 flex flex-col gap-3 p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
        <h1 className="text-xl font-semibold mb-2">{t("web.auth.forgotTitle")}</h1>
        {emailEnabled === false ? (
          <p className="text-sm text-[var(--text-secondary)]">{t("web.auth.emailOff")}</p>
        ) : sent ? (
          <p className="text-sm text-[var(--text-secondary)]" role="status">
            {t("web.auth.forgotSent")}
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--text-secondary)]">{t("web.auth.forgotDesc")}</p>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
            />
            {error && <p className="text-sm text-[var(--red)]">{error}</p>}
            <button
              type="submit"
              disabled={loading || emailEnabled === null}
              className="px-3 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium disabled:opacity-50"
            >
              {loading ? t("web.auth.sending") : t("web.auth.sendLink")}
            </button>
          </>
        )}
        <p className="text-sm text-center">
          <Link href="/login" className="text-[var(--accent)]">
            {t("web.auth.backToSignIn")}
          </Link>
        </p>
        <LanguageSwitch />
      </form>
    </div>
  );
}

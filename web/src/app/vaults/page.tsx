"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { webApi, type ApiVault } from "@/lib/webApi";
import { t } from "@noteriv/ui/i18n";
import { useLocale } from "@noteriv/ui/i18n/react";
import { applyLanguage } from "@/lib/i18n";

export default function VaultsPage() {
  useLocale();
  const router = useRouter();
  const [vaults, setVaults] = useState<ApiVault[] | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    webApi.vaults
      .list()
      .then(setVaults)
      .catch(() => router.replace("/login"));
    webApi.auth
      .me()
      .then((u) => setIsAdmin(!!u.isAdmin))
      .catch(() => undefined);
    // The account's language, so this page (and the next ones) shows it even on a device that never opened a vault.
    webApi.preferences
      .get()
      .then((prefs) => applyLanguage((prefs.editorSettings as { language?: unknown } | undefined)?.language))
      .catch(() => undefined);
  }, [router]);

  async function createVault(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const vault = await webApi.vaults.create({ name: newName.trim() });
      router.push(`/vaults/${vault.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function logout() {
    await webApi.auth.logout();
    router.replace("/login");
  }

  async function exportData() {
    const data = await webApi.users.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "noteriv-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeletingAccount(true);
    try {
      await webApi.users.deleteAccount();
      router.replace("/login");
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <div className="h-screen flex flex-col items-center gap-6 pt-20 px-4">
      <div className="flex items-center justify-between w-full max-w-md">
        <h1 className="text-2xl font-semibold">{t("web.vaultList.title")}</h1>
        <button onClick={logout} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          {t("web.vaultList.signOut")}
        </button>
      </div>

      <div className="w-full max-w-md flex flex-col gap-2">
        {vaults === null && <p className="text-[var(--text-secondary)]">{t("web.vaultList.loading")}</p>}
        {vaults?.length === 0 && (
          <>
            <p className="text-[var(--text-secondary)]">{t("web.vaultList.empty")}</p>
            <p className="text-sm text-[var(--text-muted)]">{t("web.vaultList.emptyHint")}</p>
          </>
        )}
        {vaults?.map((v) => (
          <button
            key={v.id}
            onClick={() => router.push(`/vaults/${v.id}`)}
            className="text-left px-4 py-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] border border-[var(--border)]"
          >
            {v.name}
          </button>
        ))}
      </div>

      <form onSubmit={createVault} className="w-full max-w-md flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("web.vaults.newPlaceholder")}
          className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium disabled:opacity-50"
        >
          {t("web.vaultList.create")}
        </button>
      </form>

      <div className="w-full max-w-md flex flex-col gap-2 mt-8 pt-6 border-t border-[var(--border)]">
        <h2 className="text-sm font-medium text-[var(--text-secondary)]">{t("web.vaultList.account")}</h2>
        {isAdmin && (
          <Link
            href="/admin/invites"
            className="px-3 py-2 rounded-lg text-sm text-[var(--accent)] hover:bg-[var(--bg-secondary)]"
          >
            {t("web.vaultList.invites")}
          </Link>
        )}
        <button
          onClick={exportData}
          className="text-left px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
        >
          {t("web.vaultList.export")}
        </button>
        <button
          onClick={deleteAccount}
          onBlur={() => setConfirmDelete(false)}
          disabled={deletingAccount}
          className="text-left px-3 py-2 rounded-lg text-sm text-[var(--red)] hover:bg-[var(--bg-secondary)] disabled:opacity-50"
        >
          {confirmDelete ? t("web.vaultList.deleteConfirm") : t("web.vaultList.delete")}
        </button>
        <p className="px-3 text-xs text-[var(--text-secondary)]">
          <Link href="/terms" className="hover:text-[var(--text-primary)]">
            {t("web.auth.termsOfUse")}
          </Link>
          {" · "}
          <Link href="/privacy" className="hover:text-[var(--text-primary)]">
            {t("web.auth.privacyPolicy")}
          </Link>
        </p>
      </div>
    </div>
  );
}

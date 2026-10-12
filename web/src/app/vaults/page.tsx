"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { webApi, type ApiVault } from "@/lib/webApi";

export default function VaultsPage() {
  const router = useRouter();
  const [vaults, setVaults] = useState<ApiVault[] | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    webApi.vaults
      .list()
      .then(setVaults)
      .catch(() => router.replace("/login"));
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
    <div className="h-screen flex flex-col items-center gap-6 pt-20">
      <div className="flex items-center justify-between w-full max-w-md">
        <h1 className="text-2xl font-semibold">Vault của bạn</h1>
        <button onClick={logout} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          Đăng xuất
        </button>
      </div>

      <div className="w-full max-w-md flex flex-col gap-2">
        {vaults === null && <p className="text-[var(--text-secondary)]">Đang tải…</p>}
        {vaults?.length === 0 && <p className="text-[var(--text-secondary)]">Chưa có vault nào.</p>}
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
          placeholder="Tên vault mới"
          className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium disabled:opacity-50"
        >
          Tạo
        </button>
      </form>

      <div className="w-full max-w-md flex flex-col gap-2 mt-8 pt-6 border-t border-[var(--border)]">
        <h2 className="text-sm font-medium text-[var(--text-secondary)]">Tài khoản</h2>
        <button
          onClick={exportData}
          className="text-left px-3 py-2 rounded-lg text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]"
        >
          Tải xuống toàn bộ dữ liệu (JSON)
        </button>
        <button
          onClick={deleteAccount}
          onBlur={() => setConfirmDelete(false)}
          disabled={deletingAccount}
          className="text-left px-3 py-2 rounded-lg text-sm text-[var(--red)] hover:bg-[var(--bg-secondary)] disabled:opacity-50"
        >
          {confirmDelete ? "Bấm lần nữa để xoá vĩnh viễn tài khoản + toàn bộ dữ liệu" : "Xoá tài khoản"}
        </button>
      </div>
    </div>
  );
}

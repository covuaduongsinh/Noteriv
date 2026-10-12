"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { webApi, type ApiVault } from "@/lib/webApi";

export default function VaultsPage() {
  const router = useRouter();
  const [vaults, setVaults] = useState<ApiVault[] | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

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
    </div>
  );
}

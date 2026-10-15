"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { webApi, type ApiInvite } from "@/lib/webApi";

const STATUS_LABEL: Record<ApiInvite["status"], string> = {
  active: "Đang dùng được",
  used_up: "Hết lượt",
  expired: "Hết hạn",
  revoked: "Đã thu hồi",
};

function fmt(d: string | null): string {
  return d ? new Date(d).toLocaleDateString("vi-VN") : "—";
}

export default function InvitesPage() {
  const router = useRouter();
  const [invites, setInvites] = useState<ApiInvite[] | null>(null);
  const [note, setNote] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [days, setDays] = useState(30);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setInvites(await webApi.admin.invites.list());
    } catch {
      // Not signed in, or not an admin (403): this page is not for them.
      router.replace("/vaults");
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await webApi.admin.invites.create({ note: note.trim(), maxUses, expiresInDays: days > 0 ? days : undefined });
      setNote("");
      await load();
    } catch {
      setError("Không tạo được mã. Thử lại sau.");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    await webApi.admin.invites.revoke(id);
    await load();
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
    } catch {
      // Clipboard can be blocked; the code is on screen to copy by hand.
    }
  }

  const input = "px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] outline-none focus:ring-1 focus:ring-[var(--accent)]";

  return (
    <div className="min-h-screen flex flex-col items-center gap-6 py-16 px-4">
      <div className="flex items-center justify-between w-full max-w-3xl">
        <h1 className="text-2xl font-semibold">Mã mời đăng ký</h1>
        <Link href="/vaults" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          ← Về danh sách vault
        </Link>
      </div>

      <form onSubmit={create} className="w-full max-w-3xl flex flex-wrap items-end gap-3 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
        <label className="flex flex-col gap-1 text-sm text-[var(--text-secondary)] flex-1 min-w-48">
          Ghi chú (ví dụ: lớp thứ Bảy)
          <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--text-secondary)] w-28">
          Số lượt dùng
          <input type="number" min={1} max={500} value={maxUses} onChange={(e) => setMaxUses(Math.max(1, Number(e.target.value) || 1))} className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm text-[var(--text-secondary)] w-28">
          Hết hạn sau (ngày)
          <input type="number" min={0} max={365} value={days} onChange={(e) => setDays(Math.max(0, Number(e.target.value) || 0))} className={input} />
        </label>
        <button
          type="submit"
          disabled={creating}
          className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium disabled:opacity-50"
        >
          Tạo mã
        </button>
        {error && <p className="w-full text-sm text-[var(--red)]">{error}</p>}
        <p className="w-full text-xs text-[var(--text-secondary)]">Đặt “Hết hạn sau” = 0 để mã không hết hạn.</p>
      </form>

      <div className="w-full max-w-3xl overflow-x-auto rounded-xl border border-[var(--border)]">
        <table className="w-full text-sm">
          <thead className="text-left text-[var(--text-secondary)] bg-[var(--bg-secondary)]">
            <tr>
              <th className="px-3 py-2">Mã</th>
              <th className="px-3 py-2">Ghi chú</th>
              <th className="px-3 py-2">Đã dùng</th>
              <th className="px-3 py-2">Hết hạn</th>
              <th className="px-3 py-2">Trạng thái</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {invites === null && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-[var(--text-secondary)]">
                  Đang tải…
                </td>
              </tr>
            )}
            {invites?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-[var(--text-secondary)]">
                  Chưa có mã nào.
                </td>
              </tr>
            )}
            {invites?.map((i) => (
              <tr key={i.id} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 font-mono tracking-wider">{i.code}</td>
                <td className="px-3 py-2">{i.note || "—"}</td>
                <td className="px-3 py-2">
                  {i.usedCount}/{i.maxUses}
                </td>
                <td className="px-3 py-2">{fmt(i.expiresAt)}</td>
                <td className="px-3 py-2">{STATUS_LABEL[i.status]}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  {i.status === "active" && (
                    <>
                      <button onClick={() => copy(i.code)} className="text-[var(--accent)] mr-3">
                        {copied === i.code ? "Đã chép" : "Chép mã"}
                      </button>
                      <button onClick={() => revoke(i.id)} className="text-[var(--red)]">
                        Thu hồi
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

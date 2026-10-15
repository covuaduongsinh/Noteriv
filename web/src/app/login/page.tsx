"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { webApi, ApiError } from "@/lib/webApi";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await webApi.auth.login({ email, password });
      router.replace("/vaults");
    } catch (err) {
      setError(err instanceof ApiError ? "Email hoặc mật khẩu không đúng." : "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-80 flex flex-col gap-3 p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
        <h1 className="text-xl font-semibold mb-2">Đăng nhập Noteriv</h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <input
          type="password"
          placeholder="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        {error && <p className="text-sm text-[var(--red)]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium disabled:opacity-50"
        >
          {loading ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>
        <p className="text-sm text-[var(--text-secondary)] text-center">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="text-[var(--accent)]">
            Đăng ký
          </Link>
        </p>
        <p className="text-xs text-[var(--text-secondary)] text-center">
          <Link href="/terms" className="hover:text-[var(--text-primary)]">
            Điều khoản
          </Link>
          {" · "}
          <Link href="/privacy" className="hover:text-[var(--text-primary)]">
            Quyền riêng tư
          </Link>
        </p>
      </form>
    </div>
  );
}

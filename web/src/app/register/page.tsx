"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { webApi, ApiError } from "@/lib/webApi";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await webApi.auth.register({ email, password, displayName });
      router.replace("/vaults");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("Email này đã được sử dụng.");
      } else {
        setError("Có lỗi xảy ra. Kiểm tra lại email/mật khẩu (tối thiểu 8 ký tự).");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-80 flex flex-col gap-3 p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
        <h1 className="text-xl font-semibold mb-2">Tạo tài khoản Noteriv</h1>
        <input
          type="text"
          placeholder="Tên hiển thị"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
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
          placeholder="Mật khẩu (tối thiểu 8 ký tự)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        {error && <p className="text-sm text-[var(--red)]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium disabled:opacity-50"
        >
          {loading ? "Đang tạo…" : "Đăng ký"}
        </button>
        <p className="text-sm text-[var(--text-secondary)] text-center">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-[var(--accent)]">
            Đăng nhập
          </Link>
        </p>
      </form>
    </div>
  );
}

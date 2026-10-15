"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { webApi, ApiError, type RegistrationMode } from "@/lib/webApi";

function errorCode(err: unknown): string | null {
  if (err instanceof ApiError && err.body && typeof err.body === "object" && "error" in err.body) {
    return String((err.body as { error: unknown }).error);
  }
  return null;
}

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  // null until the server answers; "invite" is assumed on failure so the field is never hidden by mistake.
  const [mode, setMode] = useState<RegistrationMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    webApi.auth
      .registration()
      .then((r) => setMode(r.mode))
      .catch(() => setMode("invite"));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptTerms) return;
    setError(null);
    setLoading(true);
    try {
      await webApi.auth.register({
        email,
        password,
        displayName,
        acceptTerms: true,
        ...(mode === "invite" ? { inviteCode: inviteCode.trim() } : {}),
      });
      router.replace("/vaults");
    } catch (err) {
      const code = errorCode(err);
      if (code === "invalid_invite") {
        setError("Mã mời không đúng, đã hết lượt, đã hết hạn hoặc đã bị thu hồi. Hãy kiểm tra lại với người gửi mã.");
      } else if (code === "registration_closed") {
        setError("Hiện chưa mở đăng ký tài khoản mới.");
      } else if (err instanceof ApiError && err.status === 409) {
        setError("Email này đã được sử dụng.");
      } else if (err instanceof ApiError && err.status === 429) {
        setError("Bạn thử quá nhiều lần. Vui lòng đợi một phút rồi thử lại.");
      } else {
        setError("Có lỗi xảy ra. Kiểm tra lại email/mật khẩu (tối thiểu 8 ký tự).");
      }
    } finally {
      setLoading(false);
    }
  }

  if (mode === "closed") {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-80 flex flex-col gap-3 p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
          <h1 className="text-xl font-semibold mb-2">Đăng ký chưa mở</h1>
          <p className="text-sm text-[var(--text-secondary)]">Noteriv hiện chưa nhận tài khoản mới.</p>
          <Link href="/login" className="text-sm text-[var(--accent)]">
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <form onSubmit={onSubmit} className="w-80 flex flex-col gap-3 p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
        <h1 className="text-xl font-semibold mb-2">Tạo tài khoản Noteriv</h1>
        {mode !== "open" && (
          <input
            type="text"
            placeholder="Mã mời"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] outline-none focus:ring-1 focus:ring-[var(--accent)] tracking-wider"
          />
        )}
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
        <label className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            required
            className="mt-1"
          />
          <span>
            Tôi đã đọc và đồng ý với{" "}
            <Link href="/terms" target="_blank" className="text-[var(--accent)]">
              Điều khoản sử dụng
            </Link>{" "}
            và{" "}
            <Link href="/privacy" target="_blank" className="text-[var(--accent)]">
              Chính sách quyền riêng tư
            </Link>
            .
          </span>
        </label>
        {error && <p className="text-sm text-[var(--red)]">{error}</p>}
        <button
          type="submit"
          disabled={loading || !acceptTerms || mode === null}
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

"use client";

import { useState } from "react";
import { webApi, type ApiPlugin } from "@/lib/webApi";

const PERMISSION_LABELS: Record<string, string> = {
  "vault:read": "Đọc note trong vault",
  "vault:write": "Tạo/sửa/xoá note trong vault",
  "editor:read": "Đọc nội dung đang mở",
  "editor:write": "Sửa nội dung đang mở",
  "ui:commands": "Thêm lệnh vào giao diện",
};

export default function PluginManager({
  vaultId,
  installed,
  onChanged,
  onClose,
}: {
  vaultId: string;
  installed: ApiPlugin[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const [manifestJson, setManifestJson] = useState("");
  const [mainJs, setMainJs] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);

  async function install(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let manifest;
    try {
      manifest = JSON.parse(manifestJson);
    } catch {
      setError("manifest.json không hợp lệ (phải là JSON).");
      return;
    }
    if (!mainJs.trim()) {
      setError("Thiếu mã nguồn main.js.");
      return;
    }
    setInstalling(true);
    try {
      await webApi.plugins.install(vaultId, { manifest, mainJs });
      setManifestJson("");
      setMainJs("");
      onChanged();
    } catch {
      setError("Cài đặt thất bại — kiểm tra lại manifest (cần id/name/version/permissions hợp lệ).");
    } finally {
      setInstalling(false);
    }
  }

  async function toggle(p: ApiPlugin) {
    await webApi.plugins.update(vaultId, p.id, { enabled: !p.enabled });
    onChanged();
  }

  async function remove(p: ApiPlugin) {
    await webApi.plugins.remove(vaultId, p.id);
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[640px] max-h-[80vh] overflow-y-auto rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Plugins</h2>
          <button onClick={onClose} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            Đóng
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {installed.length === 0 && <p className="text-sm text-[var(--text-muted)]">Chưa cài plugin nào.</p>}
          {installed.map((p) => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-tertiary)]">
              <div>
                <div className="text-sm font-medium">
                  {p.manifest.name} <span className="text-[var(--text-muted)]">v{p.manifest.version}</span>
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {(p.manifest.permissions ?? []).map((perm) => PERMISSION_LABELS[perm] ?? perm).join(", ") || "Không yêu cầu quyền"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => toggle(p)}
                  className="text-xs px-2 py-1 rounded-md bg-[var(--bg-hover)] hover:opacity-80"
                >
                  {p.enabled ? "Tắt" : "Bật"}
                </button>
                <button
                  onClick={() => remove(p)}
                  className="text-xs px-2 py-1 rounded-md bg-[var(--bg-hover)] text-[var(--red)] hover:opacity-80"
                >
                  Gỡ
                </button>
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={install} className="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
          <h3 className="text-sm font-medium text-[var(--text-secondary)]">Cài plugin mới (dán thủ công)</h3>
          <textarea
            value={manifestJson}
            onChange={(e) => setManifestJson(e.target.value)}
            placeholder='manifest.json, vd: {"id":"hello","name":"Hello","version":"1.0.0","description":"","author":"","main":"main.js","permissions":["ui:commands"]}'
            className="h-20 text-xs font-mono px-2 py-1.5 rounded-md bg-[var(--bg-tertiary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          <textarea
            value={mainJs}
            onChange={(e) => setMainJs(e.target.value)}
            placeholder="main.js — module.exports.onLoad = function(api) { ... }"
            className="h-32 text-xs font-mono px-2 py-1.5 rounded-md bg-[var(--bg-tertiary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
          {error && <p className="text-xs text-[var(--red)]">{error}</p>}
          <button
            type="submit"
            disabled={installing}
            className="self-start px-3 py-1.5 rounded-md bg-[var(--accent)] text-[var(--bg-primary)] text-sm font-medium disabled:opacity-50"
          >
            {installing ? "Đang cài…" : "Cài đặt"}
          </button>
        </form>
      </div>
    </div>
  );
}

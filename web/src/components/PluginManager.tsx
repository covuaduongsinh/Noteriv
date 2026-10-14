"use client";

import { useState, useEffect } from "react";
import { webApi, type ApiPlugin } from "@/lib/webApi";
import {
  fetchCommunityPluginManifest,
  fetchCommunityPluginSource,
  type CommunityPluginEntry,
  type CommunityPluginManifest,
} from "@/lib/plugin-community";

const PERMISSION_LABELS: Record<string, string> = {
  "vault:read": "Đọc note trong vault",
  "vault:write": "Tạo/sửa/xoá note trong vault",
  "editor:read": "Đọc nội dung đang mở",
  "editor:write": "Sửa nội dung đang mở",
  "ui:commands": "Thêm lệnh vào giao diện",
  "ui:statusbar": "Hiện thông tin trên thanh trạng thái",
  "ui:panel": "Thêm panel bên cạnh và tab trong Settings",
  "markdown:render": "Hiển thị nội dung đặc biệt trong note (code block)",
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
  const [tab, setTab] = useState<"installed" | "community" | "manual">("installed");
  const [communityManifest, setCommunityManifest] = useState<CommunityPluginManifest | null>(null);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [pendingInstall, setPendingInstall] = useState<{
    entry: CommunityPluginEntry;
    source: { manifest: Record<string, unknown>; mainJs: string };
  } | null>(null);

  useEffect(() => {
    if (tab !== "community" || communityManifest || communityLoading) return;
    setCommunityLoading(true);
    setCommunityError(null);
    fetchCommunityPluginManifest()
      .then((m) => {
        if (!m) setCommunityError("Không tải được danh sách plugin cộng đồng (repo có thể chưa sẵn sàng).");
        setCommunityManifest(m);
      })
      .finally(() => setCommunityLoading(false));
  }, [tab, communityManifest, communityLoading]);

  const installedIds = new Set(installed.map((p) => p.pluginId));

  // Step 1: fetch the source and show the permissions it will get. Step 2
  // (confirmInstall) actually installs — community plugins have no permission
  // model of their own, so the grant is something the user explicitly accepts.
  async function installFromCommunity(entry: CommunityPluginEntry) {
    setInstallingId(entry.id);
    setCommunityError(null);
    try {
      const source = await fetchCommunityPluginSource(entry);
      if (!source) {
        setCommunityError(`Không tải được "${entry.name}" — thiếu manifest.json hoặc main.js trong repo.`);
        return;
      }
      setPendingInstall({ entry, source });
    } catch {
      setCommunityError(`Cài "${entry.name}" thất bại.`);
    } finally {
      setInstallingId(null);
    }
  }

  async function confirmInstall() {
    if (!pendingInstall) return;
    const { entry, source } = pendingInstall;
    setInstallingId(entry.id);
    try {
      await webApi.plugins.install(vaultId, { manifest: source.manifest as ApiPlugin["manifest"], mainJs: source.mainJs });
      setPendingInstall(null);
      onChanged();
    } catch {
      setCommunityError(`Cài "${entry.name}" thất bại.`);
    } finally {
      setInstallingId(null);
    }
  }

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

        <div className="flex gap-1 border-b border-[var(--border)]">
          {([
            ["installed", "Đã cài"],
            ["community", "Cộng đồng"],
            ["manual", "Cài thủ công"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-3 py-1.5 text-sm ${tab === key ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "installed" && (
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
        )}

        {tab === "community" && (
          <div className="flex flex-col gap-2">
            {communityLoading && <p className="text-sm text-[var(--text-muted)]">Đang tải danh sách…</p>}
            {communityError && <p className="text-xs text-[var(--red)]">{communityError}</p>}
            {pendingInstall && (
              <div className="flex flex-col gap-2 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)]">
                <div className="text-sm font-medium">Cài "{pendingInstall.entry.name}"?</div>
                <div className="text-xs text-[var(--text-muted)]">
                  Plugin này sẽ được cấp quyền:{" "}
                  {((pendingInstall.source.manifest.permissions as string[] | undefined) ?? [])
                    .map((p) => PERMISSION_LABELS[p] ?? p)
                    .join(", ") || "không có quyền nào"}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={confirmInstall}
                    disabled={installingId === pendingInstall.entry.id}
                    className="text-xs px-2 py-1 rounded-md bg-[var(--accent)] text-[var(--bg-primary)] hover:opacity-80 disabled:opacity-50"
                  >
                    Xác nhận cài
                  </button>
                  <button
                    onClick={() => setPendingInstall(null)}
                    className="text-xs px-2 py-1 rounded-md bg-[var(--bg-hover)] hover:opacity-80"
                  >
                    Huỷ
                  </button>
                </div>
              </div>
            )}
            {communityManifest?.plugins.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-[var(--bg-tertiary)]">
                <div>
                  <div className="text-sm font-medium">
                    {entry.name} <span className="text-[var(--text-muted)]">v{entry.version}</span>
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">{entry.description} — {entry.author}</div>
                </div>
                <button
                  onClick={() => installFromCommunity(entry)}
                  disabled={installingId === entry.id || installedIds.has(entry.id)}
                  className="text-xs px-2 py-1 rounded-md bg-[var(--bg-hover)] hover:opacity-80 disabled:opacity-50"
                >
                  {installedIds.has(entry.id) ? "Đã cài" : installingId === entry.id ? "Đang cài…" : "Cài đặt"}
                </button>
              </div>
            ))}
            {communityManifest && communityManifest.plugins.length === 0 && (
              <p className="text-sm text-[var(--text-muted)]">Chưa có plugin cộng đồng nào.</p>
            )}
          </div>
        )}

        {tab === "manual" && (
          <form onSubmit={install} className="flex flex-col gap-2 pt-2">
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
        )}
      </div>
    </div>
  );
}

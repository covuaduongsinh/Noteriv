"use client";

import { useCallback, useEffect, useState } from "react";
import { webApi, type ApiPlugin, type ApiSyncConnection } from "@/lib/webApi";

type ServerReport = Awaited<ReturnType<typeof webApi.diagnostics.get>>;

interface Props {
  vaultId: string;
  plugins: ApiPlugin[];
  denied: Record<string, string[]>;
  syncConnections: ApiSyncConnection[];
  onClose: () => void;
}

const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? "không rõ";

function Row({ ok, label, detail }: { ok: boolean | null; label: string; detail?: string }) {
  return (
    <div className="flex gap-2 text-sm" style={{ padding: "3px 0" }}>
      <span style={{ width: 18, color: ok === null ? "var(--text-muted)" : ok ? "var(--green)" : "var(--red)" }}>
        {ok === null ? "•" : ok ? "✓" : "✗"}
      </span>
      <span style={{ minWidth: 190 }}>{label}</span>
      <span className="text-[var(--text-muted)]" style={{ wordBreak: "break-word" }}>
        {detail}
      </span>
    </div>
  );
}

/**
 * Developer > Diagnostics. Collects what is needed to explain "sync fails" / "plugin does nothing"
 * without opening DevTools: server self-check (git, object storage, Redis, worker heartbeat),
 * plugins with their permissions and blocked calls, and the last sync result per connection.
 */
export default function DiagnosticsModal({ vaultId, plugins, denied, syncConnections, onClose }: Props) {
  const [server, setServer] = useState<ServerReport | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    setServer(null);
    setError("");
    webApi.diagnostics.get().then(setServer).catch(() => setError("Không lấy được báo cáo từ máy chủ (API không phản hồi?)."));
  }, []);
  useEffect(load, [load]);

  function report(): string {
    const lines: string[] = [];
    lines.push(`Noteriv diagnostics — ${new Date().toISOString()}`);
    lines.push(`Build web: ${BUILD_TIME}`);
    lines.push(`Trình duyệt: ${navigator.userAgent}`);
    lines.push(`Vault: ${vaultId}`);
    if (server) {
      lines.push(`Server: node ${server.node}, uptime ${server.uptimeSeconds}s, db ${server.database.ok ? "ok" : "LỖI"}, redis ${server.redis.ok ? "ok" : "LỖI"}`);
      lines.push(`git: ${server.git.installed ? server.git.version : "KHÔNG CÓ"}`);
      lines.push(`storage: ${server.storage.ok ? "ok" : "LỖI"} (${server.storage.endpoint})${server.storage.error ? " — " + server.storage.error : ""}`);
      lines.push(`pdf: ${server.pdfService.ok ? "ok" : server.pdfService.configured ? "KHÔNG PHẢN HỒI" : "chưa cấu hình"}`);
      lines.push(`worker: ${server.worker.alive ? "đang chạy" : "KHÔNG PHẢN HỒI"} (heartbeat ${server.worker.ageSeconds ?? "?"}s trước)`);
    } else {
      lines.push(`Server: ${error || "đang tải"}`);
    }
    for (const c of syncConnections) {
      lines.push(`sync ${c.providerType} ${c.remoteUrl ?? c.webdavUrl}: ${JSON.stringify(c.lastSyncStatus)}`);
    }
    for (const p of plugins) {
      lines.push(`plugin ${p.pluginId} (${p.enabled ? "bật" : "tắt"}): quyền=[${(p.manifest.permissions ?? []).join(",")}] bị chặn=[${(denied[p.id] ?? []).join(",")}]`);
    }
    return lines.join("\n");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(report());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Trình duyệt không cho sao chép tự động; hãy chọn và copy thủ công.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xl"
        style={{ width: 620, maxWidth: "94vw", maxHeight: "88vh", overflowY: "auto", padding: 20 }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <h2 className="text-base font-semibold">Chẩn đoán</h2>
          <button onClick={onClose} className="text-[var(--text-muted)]" style={{ padding: 4 }}>
            Đóng
          </button>
        </div>

        <div className="text-xs text-[var(--text-muted)]" style={{ marginBottom: 6 }}>MÁY CHỦ</div>
        {error && <div className="text-sm" style={{ color: "var(--red)" }}>{error}</div>}
        {!server && !error && <div className="text-sm text-[var(--text-muted)]">Đang kiểm tra…</div>}
        {server && (
          <>
            <Row ok={server.database.ok} label="Cơ sở dữ liệu" />
            <Row ok={server.redis.ok} label="Redis (hàng đợi)" />
            <Row ok={server.git.installed} label="git" detail={server.git.version ?? "chưa cài — sync sẽ lỗi"} />
            <Row
              ok={server.storage.ok}
              label="Kho file đính kèm (S3)"
              detail={server.storage.ok ? server.storage.endpoint : `${server.storage.error ?? "không kết nối được"} — ${server.storage.endpoint}`}
            />
            <Row
              ok={server.worker.alive}
              label="Worker (sync nền)"
              detail={server.worker.alive ? `heartbeat ${server.worker.ageSeconds}s trước` : "không thấy heartbeat — sync/auto-sync sẽ không chạy"}
            />
            <Row
              ok={server.pdfService.ok}
              label="Dịch vụ tạo PDF"
              detail={server.pdfService.ok ? "sẵn sàng" : server.pdfService.configured ? "không phản hồi" : "chưa cấu hình (PDF_SERVICE_URL)"}
            />
            {server.scratchDisk && (
              <Row ok={server.scratchDisk.freeMB > 500} label="Đĩa tạm cho sync" detail={`${server.scratchDisk.freeMB} MB trống / ${server.scratchDisk.totalMB} MB`} />
            )}
          </>
        )}

        <div className="text-xs text-[var(--text-muted)]" style={{ margin: "14px 0 6px" }}>SYNC</div>
        {syncConnections.length === 0 && <div className="text-sm text-[var(--text-muted)]">Chưa có kết nối.</div>}
        {syncConnections.map((c) => {
          const st = c.lastSyncStatus as { status?: string; error?: string; warning?: string } | null;
          const ok = st?.status === "success" ? !st.warning : st ? false : null;
          return (
            <Row
              key={c.id}
              ok={ok}
              label={`${c.providerType} · ${(c.remoteUrl ?? c.webdavUrl ?? "").replace(/^https?:\/\//, "").slice(0, 30)}`}
              detail={st ? `${st.status}${st.error ? " — " + st.error : ""}${st.warning ? " — " + st.warning : ""}` : "chưa chạy"}
            />
          );
        })}

        <div className="text-xs text-[var(--text-muted)]" style={{ margin: "14px 0 6px" }}>PLUGIN</div>
        {plugins.length === 0 && <div className="text-sm text-[var(--text-muted)]">Chưa cài plugin nào.</div>}
        {plugins.map((p) => {
          const blocked = denied[p.id] ?? [];
          return (
            <Row
              key={p.id}
              ok={p.enabled ? blocked.length === 0 : null}
              label={`${p.manifest.name} ${p.enabled ? "" : "(tắt)"}`}
              detail={`quyền: ${(p.manifest.permissions ?? []).join(", ") || "không"}${blocked.length ? ` · BỊ CHẶN: ${blocked.join(", ")}` : ""}`}
            />
          );
        })}

        <div className="text-xs text-[var(--text-muted)]" style={{ margin: "14px 0 6px" }}>TRÌNH DUYỆT</div>
        <Row ok={null} label="Build web" detail={BUILD_TIME} />
        <Row ok={null} label="User agent" detail={navigator.userAgent.slice(0, 90)} />

        <div className="flex gap-2" style={{ marginTop: 16 }}>
          <button className="rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-sm" style={{ padding: "7px 14px" }} onClick={load}>
            Kiểm tra lại
          </button>
          <button className="rounded-md text-sm" style={{ padding: "7px 14px", background: "var(--accent)", color: "var(--bg-primary)" }} onClick={copy}>
            {copied ? "Đã sao chép ✓" : "Sao chép báo cáo"}
          </button>
        </div>
      </div>
    </div>
  );
}

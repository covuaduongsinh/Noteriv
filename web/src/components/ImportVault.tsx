"use client";

import { useRef, useState } from "react";
import { webApi } from "@/lib/webApi";
import { formatFileSize } from "@/lib/attachment-utils";
import {
  scanFolder,
  scanZip,
  runImport,
  type ImportScan,
  type ImportProgress,
  type ImportReport,
} from "@/lib/vault-import";

interface ImportVaultProps {
  /** Existing vault to import into, or null to create a new one from the import. */
  vaultId: string | null;
  vaultName?: string;
  onClose: () => void;
  /** Called after a successful import with the vault that received the notes. */
  onFinished: (vaultId: string) => void;
}

const PHASE_LABEL: Record<ImportProgress["phase"], string> = {
  attachments: "Đang tải file đính kèm",
  notes: "Đang nhập note",
  finalize: "Đang cập nhật liên kết",
  done: "Hoàn tất",
};

/**
 * Import a folder or .zip (an Obsidian/Noteriv desktop vault, a GitHub download,
 * a hand-made archive) into this vault or a brand-new one. All parsing happens in
 * the browser; see lib/vault-import.ts.
 */
export default function ImportVault({ vaultId, vaultName, onClose, onFinished }: ImportVaultProps) {
  const folderInput = useRef<HTMLInputElement>(null);
  const zipInput = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [scan, setScan] = useState<ImportScan | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [onConflict, setOnConflict] = useState<"skip" | "overwrite">("skip");
  const [newName, setNewName] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [targetVaultId, setTargetVaultId] = useState<string | null>(vaultId);

  async function onPick(files: File[], kind: "folder" | "zip") {
    setError("");
    setReport(null);
    if (files.length === 0) return;
    setScanning(true);
    try {
      const s = kind === "zip" ? await scanZip(files[0]) : scanFolder(files);
      if (s.notes.length === 0 && s.attachments.length === 0) {
        setError("Không tìm thấy file .md hoặc file đính kèm nào để nhập.");
        setScan(null);
      } else {
        setScan(s);
        setNewName((n) => n || s.rootName);
      }
    } catch {
      setError("Không đọc được nguồn đã chọn (file zip có hợp lệ không?).");
    } finally {
      setScanning(false);
    }
  }

  async function start() {
    if (!scan) return;
    setError("");
    setRunning(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      let target = targetVaultId;
      if (!target) {
        const name = newName.trim() || scan.rootName;
        const created = await webApi.vaults.create({ name });
        target = created.id;
        setTargetVaultId(created.id);
      }
      const rep = await runImport(target, scan, { onConflict }, setProgress, controller.signal);
      setReport(rep);
    } catch {
      setError("Import bị gián đoạn. Bạn có thể chạy lại — những file đã nhập sẽ được bỏ qua.");
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  const totalBytes = scan ? [...scan.notes, ...scan.attachments].reduce((n, i) => n + i.size, 0) : 0;
  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onMouseDown={(e) => e.target === e.currentTarget && !running && onClose()}
    >
      <div
        className="rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xl"
        style={{ width: 520, maxWidth: "94vw", maxHeight: "90vh", overflowY: "auto", padding: 20 }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <h2 className="text-base font-semibold">{vaultId ? `Import vào "${vaultName ?? "vault"}"` : "Import vault mới"}</h2>
          <button onClick={onClose} disabled={running} className="text-[var(--text-muted)]" style={{ padding: 4 }}>
            Đóng
          </button>
        </div>

        {!report && (
          <>
            <p className="text-xs text-[var(--text-muted)]" style={{ marginBottom: 12 }}>
              Chọn thư mục vault (có thể đang dùng với desktop/Obsidian) hoặc file .zip. Note .md giữ nguyên cấu trúc thư mục; ảnh,
              PDF, audio… được tải lên làm file đính kèm và liên kết trong note được cập nhật theo.
            </p>
            <div className="flex gap-2" style={{ marginBottom: 12 }}>
              <button
                className="rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-sm"
                style={{ padding: "8px 14px" }}
                disabled={running || scanning}
                onClick={() => folderInput.current?.click()}
              >
                Chọn thư mục…
              </button>
              <button
                className="rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-sm"
                style={{ padding: "8px 14px" }}
                disabled={running || scanning}
                onClick={() => zipInput.current?.click()}
              >
                Chọn file .zip…
              </button>
            </div>
            <input
              ref={folderInput}
              type="file"
              multiple
              hidden
              {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
              onChange={(e) => {
                onPick(Array.from(e.target.files ?? []), "folder");
                e.target.value = "";
              }}
            />
            <input
              ref={zipInput}
              type="file"
              accept=".zip,application/zip"
              hidden
              onChange={(e) => {
                onPick(Array.from(e.target.files ?? []), "zip");
                e.target.value = "";
              }}
            />
            {scanning && <div className="text-sm text-[var(--text-muted)]">Đang quét…</div>}
          </>
        )}

        {scan && !report && (
          <div style={{ marginTop: 4 }}>
            <div className="rounded-lg bg-[var(--bg-tertiary)] text-sm" style={{ padding: 12, marginBottom: 12 }}>
              <div>
                <b>{scan.notes.length}</b> note · <b>{scan.attachments.length}</b> file đính kèm
                {totalBytes > 0 && <> · {formatFileSize(totalBytes)}</>}
              </div>
              {scan.skipped.length > 0 && (
                <details className="text-xs text-[var(--text-muted)]" style={{ marginTop: 6 }}>
                  <summary>Bỏ qua {scan.skipped.length} file</summary>
                  <ul style={{ marginLeft: 16, listStyle: "disc", maxHeight: 120, overflowY: "auto" }}>
                    {scan.skipped.slice(0, 50).map((s) => (
                      <li key={s.path}>
                        {s.path} — {s.reason}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>

            {!vaultId && (
              <label className="block text-sm" style={{ marginBottom: 10 }}>
                Tên vault mới
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  disabled={running || !!targetVaultId}
                  className="w-full rounded-md bg-[var(--bg-tertiary)] outline-none text-sm"
                  style={{ padding: "6px 8px", marginTop: 4 }}
                />
              </label>
            )}

            <fieldset className="text-sm" style={{ marginBottom: 12 }} disabled={running}>
              <legend className="text-xs text-[var(--text-muted)]" style={{ marginBottom: 4 }}>
                Nếu note đã tồn tại cùng đường dẫn
              </legend>
              <label className="flex items-center gap-2">
                <input type="radio" checked={onConflict === "skip"} onChange={() => setOnConflict("skip")} /> Giữ bản trong vault (bỏ qua)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" checked={onConflict === "overwrite"} onChange={() => setOnConflict("overwrite")} /> Ghi đè bằng bản nhập vào
              </label>
            </fieldset>

            {running && progress && (
              <div style={{ marginBottom: 12 }}>
                <div className="text-xs text-[var(--text-muted)]" style={{ marginBottom: 4 }}>
                  {PHASE_LABEL[progress.phase]} ({progress.done}/{progress.total})
                </div>
                <div className="rounded-full bg-[var(--bg-tertiary)]" style={{ height: 6, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "var(--accent)", transition: "width .2s" }} />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                className="rounded-md text-sm font-medium"
                style={{ padding: "8px 16px", background: "var(--accent)", color: "var(--bg-primary)", opacity: running ? 0.6 : 1 }}
                disabled={running}
                onClick={start}
              >
                {running ? "Đang nhập…" : "Bắt đầu import"}
              </button>
              {running && (
                <button
                  className="rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-sm"
                  style={{ padding: "8px 14px" }}
                  onClick={() => abortRef.current?.abort()}
                >
                  Dừng
                </button>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm" style={{ color: "var(--red)", marginTop: 10 }}>
            {error}
          </div>
        )}

        {report && targetVaultId && (
          <div className="text-sm">
            <div className="rounded-lg bg-[var(--bg-tertiary)]" style={{ padding: 12, marginBottom: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{report.cancelled ? "Đã dừng giữa chừng" : "Import xong"}</div>
              <div>
                Note: {report.notesCreated} mới, {report.notesUpdated} ghi đè, {report.notesSkipped} bỏ qua
              </div>
              <div>
                Đính kèm: {report.attachmentsUploaded} tải lên, {report.attachmentsReused} dùng lại
              </div>
              {report.failures.length > 0 && (
                <details className="text-xs" style={{ marginTop: 6, color: "var(--yellow)" }}>
                  <summary>{report.failures.length} mục lỗi</summary>
                  <ul style={{ marginLeft: 16, listStyle: "disc", maxHeight: 140, overflowY: "auto" }}>
                    {report.failures.slice(0, 80).map((f, i) => (
                      <li key={i}>
                        {f.path} — {f.error}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
            <button
              className="rounded-md text-sm font-medium"
              style={{ padding: "8px 16px", background: "var(--accent)", color: "var(--bg-primary)" }}
              onClick={() => onFinished(targetVaultId)}
            >
              Mở vault
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

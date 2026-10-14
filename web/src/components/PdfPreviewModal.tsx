"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  blob: Blob;
  filename: string;
  onDownload: () => void;
  onClose: () => void;
}

/**
 * Shows the exact PDF the server rendered (same blob "Tải PDF" saves) in the browser's built-in PDF viewer,
 * so the preview always matches the downloaded file.
 */
export default function PdfPreviewModal({ blob, filename, onDownload, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function print() {
    try {
      frameRef.current?.contentWindow?.focus();
      frameRef.current?.contentWindow?.print();
    } catch {
      // some browsers block printing a embedded PDF; the user can download it instead
    }
  }

  const btn = "rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-sm";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex flex-col rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-xl"
        style={{ width: "min(1000px, 94vw)", height: "92vh", padding: 14, gap: 10 }}
      >
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Xem trước · {filename}
          </h2>
          <button className={btn} style={{ padding: "6px 12px", background: "var(--accent)", color: "var(--bg-primary)" }} onClick={onDownload}>
            Tải PDF
          </button>
          <button className={btn} style={{ padding: "6px 12px" }} onClick={print}>
            In
          </button>
          <button className={btn} style={{ padding: "6px 12px" }} onClick={onClose}>
            Đóng
          </button>
        </div>
        {url && (
          <iframe
            ref={frameRef}
            src={url}
            title={`Xem trước ${filename}`}
            className="rounded-md border border-[var(--border)]"
            style={{ flex: 1, width: "100%", background: "#fff" }}
          />
        )}
        <div className="text-xs text-[var(--text-muted)]">Trình duyệt không hiển thị được bản xem trước? Bấm “Tải PDF” để mở bằng ứng dụng khác.</div>
      </div>
    </div>
  );
}

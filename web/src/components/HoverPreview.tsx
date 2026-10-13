"use client";

import { useState, useEffect, useRef } from "react";
import { webApi, type VaultIndex } from "@/lib/webApi";

interface HoverPreviewProps {
  /** Raw `[[target]]` text from the wikilink the pointer is resting over. */
  target: string;
  vaultId: string;
  index: VaultIndex | null;
  position: { x: number; y: number };
  onDismiss: () => void;
}

function stripExtension(name: string): string {
  return name.replace(/\.md$/i, "");
}

/** Resolves a wikilink target the same way the server's backlink recompute does (lib/backlinks.ts): by path, then by stripped note name, case-insensitive. */
function resolveTarget(target: string, index: VaultIndex | null) {
  if (!index) return null;
  const key = stripExtension(target.split("|")[0].split("#")[0].trim()).toLowerCase();
  return (
    index.notes.find((n) => stripExtension(n.path).toLowerCase() === key) ??
    index.notes.find((n) => stripExtension(n.name).toLowerCase() === key) ??
    null
  );
}

export default function HoverPreview({ target, vaultId, index, position, onDismiss }: HoverPreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [adjusted, setAdjusted] = useState(position);

  const resolvedNote = resolveTarget(target, index);
  const linkName = target.split("|")[0].split("#")[0].trim();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (!resolvedNote) {
      setContent(null);
      setLoading(false);
      return;
    }
    webApi.notes
      .get(vaultId, resolvedNote.id)
      .then((note) => {
        if (!cancelled) setContent(note.content);
      })
      .catch(() => {
        if (!cancelled) setContent(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedNote?.id, vaultId]);

  useEffect(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = position.x;
    let y = position.y + 20;
    if (x + rect.width > vw - 16) x = vw - rect.width - 16;
    if (x < 16) x = 16;
    if (y + rect.height > vh - 16) y = position.y - rect.height - 8;
    if (y < 16) y = 16;
    setAdjusted({ x, y });
  }, [position, content, loading]);

  const preview = content ? content.slice(0, 200) + (content.length > 200 ? "…" : "") : null;

  return (
    <div ref={containerRef} className="hp-container" style={{ left: `${adjusted.x}px`, top: `${adjusted.y}px` }} onMouseLeave={onDismiss}>
      <div className="hp-header">
        <svg width="12" height="12" viewBox="0 0 16 16">
          <path d="M4 1h5l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" fill="none" />
          <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </svg>
        <span className="hp-title">{linkName}</span>
      </div>
      <div className="hp-body">
        {loading ? (
          <div className="hp-loading">Đang tải…</div>
        ) : preview ? (
          <pre className="hp-preview-text">{preview}</pre>
        ) : (
          <div className="hp-not-found">{resolvedNote ? "Không tải được nội dung" : "Không tìm thấy note"}</div>
        )}
      </div>
    </div>
  );
}

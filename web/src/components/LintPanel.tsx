"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { lintMarkdown, type LintWarning } from "@noteriv/core/markdown-lint";

interface LintPanelProps {
  content: string;
  /** Names of the notes in the vault (without extension), used to flag broken [[wikilinks]]. */
  noteNames: string[];
  onLineClick: (line: number) => void;
  onClose: () => void;
}

/** Ported from desktop/src/components/LintPanel.tsx; the vault file list comes from the already-loaded VaultIndex instead of IPC. */
export default function LintPanel({ content, noteNames, onLineClick, onClose }: LintPanelProps) {
  const [warnings, setWarnings] = useState<LintWarning[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setWarnings(lintMarkdown(content, "", noteNames));
    }, 600);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content, noteNames]);

  const grouped = useMemo(
    () => ({
      errors: warnings.filter((w) => w.type === "error"),
      warns: warnings.filter((w) => w.type === "warning"),
      infos: warnings.filter((w) => w.type === "info"),
    }),
    [warnings]
  );

  const renderWarning = (w: LintWarning, idx: number) => {
    const icon = w.type === "error" ? "\u274C" : w.type === "warning" ? "\u26A0\uFE0F" : "\u2139\uFE0F";
    return (
      <button
        key={`${w.rule}-${w.line}-${idx}`}
        className={`lint-item lint-item-${w.type}`}
        onClick={() => onLineClick(w.line)}
        title={`${w.rule} (line ${w.line})`}
      >
        <span className="lint-icon">{icon}</span>
        <span className="lint-msg">{w.message}</span>
        <span className="lint-line">L{w.line}</span>
      </button>
    );
  };

  const group = (title: string, items: LintWarning[]) =>
    items.length > 0 && (
      <div className="lint-group">
        <div className="lint-group-header">{title}</div>
        {items.map((w, i) => renderWarning(w, i))}
      </div>
    );

  return (
    <div className="lint-panel">
      <div className="lint-header">
        <span className="lint-title">Lint</span>
        <div className="lint-header-right">
          <span className="lint-counts">
            {grouped.errors.length > 0 && <span className="lint-count-error">{grouped.errors.length} lỗi</span>}
            {grouped.warns.length > 0 && <span className="lint-count-warn">{grouped.warns.length} cảnh báo</span>}
            {grouped.infos.length > 0 && <span className="lint-count-info">{grouped.infos.length} gợi ý</span>}
            {warnings.length === 0 && <span className="lint-count-ok">Không có vấn đề</span>}
          </span>
          <button onClick={onClose} className="lint-close" title="Đóng">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <div className="lint-list">
        {warnings.length === 0 ? (
          <div className="lint-empty">Không tìm thấy vấn đề nào</div>
        ) : (
          <>
            {group("Lỗi", grouped.errors)}
            {group("Cảnh báo", grouped.warns)}
            {group("Gợi ý", grouped.infos)}
          </>
        )}
      </div>
    </div>
  );
}

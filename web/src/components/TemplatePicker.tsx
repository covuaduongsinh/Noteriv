"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { listTemplates, loadTemplate, processTemplate, getTemplateVariables, type TemplateEntry } from "@/lib/template-utils";
import type { VaultIndex } from "@/lib/webApi";

interface TemplatePickerProps {
  vaultId: string;
  index: VaultIndex | null;
  /** Called with the processed content once a template is chosen — the caller creates+opens the new note. */
  onInsert: (content: string, templateName: string) => void;
  onClose: () => void;
}

export default function TemplatePicker({ vaultId, index, onInsert, onClose }: TemplatePickerProps) {
  const templates = listTemplates(index);
  const [filtered, setFiltered] = useState<TemplateEntry[]>(templates);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [previewRaw, setPreviewRaw] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setFiltered(templates);
      setSelectedIdx(0);
      return;
    }
    const lower = query.toLowerCase();
    setFiltered(templates.filter((t) => t.name.toLowerCase().includes(lower)));
    setSelectedIdx(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    const entry = filtered[selectedIdx];
    if (!entry) {
      setPreviewRaw(null);
      return;
    }
    let cancelled = false;
    loadTemplate(vaultId, entry.id).then((raw) => {
      if (!cancelled) setPreviewRaw(raw);
    });
    return () => {
      cancelled = true;
    };
  }, [filtered, selectedIdx, vaultId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const list = listRef.current;
    const item = list?.children[selectedIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const insertTemplate = useCallback(
    (entry: TemplateEntry, raw: string) => {
      const variables = getTemplateVariables(entry.name);
      onInsert(processTemplate(raw, variables), entry.name);
      onClose();
    },
    [onInsert, onClose]
  );

  const insertSelected = useCallback(() => {
    const entry = filtered[selectedIdx];
    if (!entry || previewRaw === null) return;
    insertTemplate(entry, previewRaw);
  }, [filtered, selectedIdx, previewRaw, insertTemplate]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      insertSelected();
    }
  }

  const previewText = previewRaw !== null && filtered[selectedIdx]
    ? processTemplate(previewRaw, getTemplateVariables(filtered[selectedIdx].name))
    : null;

  return (
    <div className="tpl-overlay" onClick={onClose}>
      <div className="tpl-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tpl-input-wrap">
          <svg width="14" height="14" viewBox="0 0 14 14" className="tpl-icon">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown} placeholder="Tìm template…" className="tpl-input" />
        </div>

        {templates.length === 0 ? (
          <div className="tpl-empty">
            <span className="tpl-empty-title">Chưa có template nào</span>
            <span className="tpl-empty-desc">
              Tạo một thư mục <code className="tpl-empty-path">Templates</code> ở gốc vault và thêm note vào đó để dùng làm template.
            </span>
            <span className="tpl-empty-desc">
              Dùng biến như <code className="tpl-empty-path">{"{{date}}"}</code>, <code className="tpl-empty-path">{"{{title}}"}</code>, <code className="tpl-empty-path">{"{{time}}"}</code> để chèn nội dung động.
            </span>
          </div>
        ) : (
          <>
            <div className="tpl-body">
              <div className="tpl-list" ref={listRef}>
                {filtered.map((t, i) => (
                  <button
                    key={t.id}
                    className={`tpl-item${i === selectedIdx ? " tpl-item-active" : ""}`}
                    onClick={() => loadTemplate(vaultId, t.id).then((raw) => insertTemplate(t, raw))}
                    onMouseEnter={() => setSelectedIdx(i)}
                  >
                    <span className="tpl-item-name">{t.name}</span>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="tpl-empty" style={{ padding: "24px 12px" }}>
                    <span className="tpl-empty-desc">Không có template khớp</span>
                  </div>
                )}
              </div>
              <div className="tpl-preview">
                {previewText !== null ? (
                  <>
                    <div className="tpl-preview-label">Xem trước</div>
                    <div className="tpl-preview-content">{previewText}</div>
                  </>
                ) : (
                  <div className="tpl-preview-empty">Chọn một template để xem trước</div>
                )}
              </div>
            </div>
            <div className="tpl-footer">
              <div className="tpl-footer-hint">
                <span><span className="tpl-footer-key">Enter</span> tạo note</span>
                <span><span className="tpl-footer-key">Esc</span> đóng</span>
                <span><span className="tpl-footer-key">↑↓</span> di chuyển</span>
              </div>
              <div className="tpl-footer-hint">{filtered.length} template</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

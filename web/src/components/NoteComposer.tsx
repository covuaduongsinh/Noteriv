"use client";

import { useState, useEffect, useRef } from "react";
import { webApi, type VaultIndex } from "@/lib/webApi";
import { mergeNotes, splitByHeadings, sanitizeFileName } from "@/lib/note-composer-utils";

interface NoteComposerProps {
  vaultId: string;
  index: VaultIndex | null;
  currentNoteId: string | null;
  currentNoteName: string | null;
  currentFolderId: string | null;
  currentContent: string;
  onClose: () => void;
  onNoteSelect: (noteId: string) => void;
  onContentChange: (content: string) => void;
  onRefresh: () => void;
}

type Mode = "merge" | "split";

export default function NoteComposer({
  vaultId,
  index,
  currentNoteId,
  currentNoteName,
  currentFolderId,
  currentContent,
  onClose,
  onNoteSelect,
  onContentChange,
  onRefresh,
}: NoteComposerProps) {
  const [mode, setMode] = useState<Mode>("merge");
  const overlayRef = useRef<HTMLDivElement>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [addHeadings, setAddHeadings] = useState(true);
  const [deleteAfterMerge, setDeleteAfterMerge] = useState(false);
  const [merging, setMerging] = useState(false);

  const [splitLevel, setSplitLevel] = useState<1 | 2>(2);
  const [splitting, setSplitting] = useState(false);

  const allNotes = (index?.notes ?? []).filter((n) => n.id !== currentNoteId);
  const splitPreview = mode === "split" ? splitByHeadings(currentContent, splitLevel) : [];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleBackdrop(e: React.MouseEvent) {
    if (e.target === overlayRef.current) onClose();
  }

  const filteredNotes = searchQuery.trim()
    ? allNotes.filter((n) => n.name.toLowerCase().includes(searchQuery.toLowerCase()) || n.path.toLowerCase().includes(searchQuery.toLowerCase()))
    : allNotes;

  function toggleNote(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function handleMerge() {
    if (selectedIds.length === 0) return;
    setMerging(true);
    try {
      const contents: { name: string; content: string }[] = [];
      for (const id of selectedIds) {
        const note = await webApi.notes.get(vaultId, id);
        contents.push({ name: note.name, content: note.content });
      }

      const mergedPart = mergeNotes(contents, addHeadings);
      onContentChange(currentContent.trimEnd() + "\n\n" + mergedPart);

      if (deleteAfterMerge) {
        for (const id of selectedIds) {
          await webApi.notes.remove(vaultId, id);
        }
        onRefresh();
      }
      onClose();
    } finally {
      setMerging(false);
    }
  }

  async function handleSplit() {
    if (!currentNoteId || splitPreview.length <= 1) return;
    setSplitting(true);
    try {
      let firstCreatedId: string | null = null;
      for (const section of splitPreview) {
        const name = sanitizeFileName(section.title) + ".md";
        if (name === currentNoteName) continue; // avoid overwriting the current note
        try {
          const created = await webApi.notes.create(vaultId, { name, folderId: currentFolderId, content: section.content + "\n" });
          if (!firstCreatedId) firstCreatedId = created.id;
        } catch {
          // name collision or similar — skip this section rather than failing the whole split
        }
      }
      onRefresh();
      if (firstCreatedId) onNoteSelect(firstCreatedId);
      onClose();
    } finally {
      setSplitting(false);
    }
  }

  const currentDisplayName = currentNoteName ? currentNoteName.replace(/\.(md|markdown)$/i, "") : "Chưa chọn note";

  return (
    <div ref={overlayRef} className="nc-overlay" onClick={handleBackdrop}>
      <div className="nc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="nc-header">
          <div className="nc-header-left">
            <h2 className="nc-title">Note Composer</h2>
            <div className="nc-mode-toggle">
              <button className={`nc-mode-btn${mode === "merge" ? " nc-mode-active" : ""}`} onClick={() => setMode("merge")}>
                Gộp
              </button>
              <button className={`nc-mode-btn${mode === "split" ? " nc-mode-active" : ""}`} onClick={() => setMode("split")}>
                Tách
              </button>
            </div>
          </div>
          <button onClick={onClose} className="nc-close-btn">
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="nc-current-file">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M4 2h5l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" />
            <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span>{currentDisplayName}</span>
        </div>

        <div className="nc-body">
          {mode === "merge" ? (
            <div className="nc-merge">
              <div className="nc-search-wrap">
                <svg width="14" height="14" viewBox="0 0 14 14" className="nc-search-icon">
                  <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
                  <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Tìm note để gộp…" className="nc-search-input" autoFocus />
                {selectedIds.length > 0 && <span className="nc-selected-count">{selectedIds.length} đã chọn</span>}
              </div>

              <div className="nc-file-list">
                {filteredNotes.map((n) => {
                  const isSelected = selectedIds.includes(n.id);
                  return (
                    <button key={n.id} className={`nc-file-item${isSelected ? " nc-file-selected" : ""}`} onClick={() => toggleNote(n.id)}>
                      <span className="nc-file-check">
                        {isSelected && (
                          <svg width="12" height="12" viewBox="0 0 12 12">
                            <path d="M2.5 6l2.5 2.5L9.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                          </svg>
                        )}
                      </span>
                      <span className="nc-file-name">{n.name.replace(/\.(md|markdown)$/i, "")}</span>
                      <span className="nc-file-path">{n.path}</span>
                    </button>
                  );
                })}
                {filteredNotes.length === 0 && <div className="nc-empty">Không tìm thấy note</div>}
              </div>

              <div className="nc-options">
                <label className="nc-option">
                  <input type="checkbox" checked={addHeadings} onChange={(e) => setAddHeadings(e.target.checked)} />
                  <span>Thêm tên file làm tiêu đề (h2) giữa các note gộp</span>
                </label>
                <label className="nc-option">
                  <input type="checkbox" checked={deleteAfterMerge} onChange={(e) => setDeleteAfterMerge(e.target.checked)} />
                  <span className="nc-option-danger">Chuyển note nguồn vào thùng rác sau khi gộp</span>
                </label>
              </div>
            </div>
          ) : (
            <div className="nc-split">
              <div className="nc-split-controls">
                <span className="nc-split-label">Tách theo:</span>
                <div className="nc-split-level-toggle">
                  <button className={`nc-split-level-btn${splitLevel === 1 ? " nc-split-level-active" : ""}`} onClick={() => setSplitLevel(1)}>
                    Heading H1
                  </button>
                  <button className={`nc-split-level-btn${splitLevel === 2 ? " nc-split-level-active" : ""}`} onClick={() => setSplitLevel(2)}>
                    Heading H2
                  </button>
                </div>
              </div>

              <div className="nc-split-preview">
                {splitPreview.length <= 1 ? (
                  <div className="nc-empty">Không tìm thấy heading {splitLevel === 1 ? "H1" : "H2"} nào để tách</div>
                ) : (
                  splitPreview.map((section, idx) => (
                    <div key={idx} className="nc-split-section">
                      <div className="nc-split-section-header">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M4 2h5l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" />
                          <path d="M9 2v4h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                        <span className="nc-split-section-title">{sanitizeFileName(section.title)}.md</span>
                      </div>
                      <div className="nc-split-section-preview">
                        {section.content.slice(0, 200)}
                        {section.content.length > 200 ? "…" : ""}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="nc-footer">
          <button onClick={onClose} className="nc-cancel-btn">
            Huỷ
          </button>
          {mode === "merge" ? (
            <button onClick={handleMerge} disabled={selectedIds.length === 0 || merging || !currentNoteId} className="nc-action-btn">
              {merging ? "Đang gộp…" : `Gộp ${selectedIds.length} note`}
            </button>
          ) : (
            <button onClick={handleSplit} disabled={splitPreview.length <= 1 || splitting || !currentNoteId} className="nc-action-btn">
              {splitting ? "Đang tách…" : `Tách thành ${splitPreview.length} note`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

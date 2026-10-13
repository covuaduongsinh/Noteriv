"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { webApi, type ApiNoteSnapshot } from "@/lib/webApi";

interface FileRecoveryProps {
  vaultId: string;
  noteId: string;
  notePath: string;
  onRestore: (content: string) => void;
  onClose: () => void;
  /** Switches to the full-screen scrub-through-time view instead (same data, different UI). */
  onOpenScrubber?: () => void;
}

export default function FileRecovery({ vaultId, noteId, notePath, onRestore, onClose, onOpenScrubber }: FileRecoveryProps) {
  const [snapshots, setSnapshots] = useState<ApiNoteSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<ApiNoteSnapshot | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const fileName = (notePath.split("/").pop() || "Untitled").replace(/\.(md|markdown)$/i, "");

  useEffect(() => {
    setLoading(true);
    webApi.notes
      .snapshots(vaultId, noteId)
      .then(setSnapshots)
      .catch(() => setSnapshots([]))
      .finally(() => setLoading(false));
  }, [vaultId, noteId]);

  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSelectSnapshot = async (snap: ApiNoteSnapshot) => {
    setSelectedSnapshot(snap);
    setLoadingPreview(true);
    try {
      const { content } = await webApi.notes.snapshotContent(vaultId, noteId, snap.id);
      setPreviewContent(content);
    } catch {
      setPreviewContent(null);
    }
    setLoadingPreview(false);
  };

  const handleRestore = () => {
    if (previewContent !== null) {
      onRestore(previewContent);
      onClose();
    }
  };

  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const formatTime = (iso: string): string =>
    new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const formatAge = (iso: string): string => {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div ref={overlayRef} className="fr-overlay" onClick={handleBackdrop}>
      <div className="fr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="fr-header">
          <div className="fr-header-left">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M8 4v4l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2 className="fr-title">File Recovery</h2>
            <span className="fr-file-name">{fileName}</span>
          </div>
          <div className="flex items-center gap-2">
            {onOpenScrubber && (
              <button onClick={onOpenScrubber} className="fr-restore-btn" title="Switch to Time Scrubber view">
                Scrub timeline
              </button>
            )}
            <button onClick={onClose} className="fr-close-btn">
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        <div className="fr-body">
          <div className="fr-list-pane">
            <div className="fr-list-header">
              <span className="fr-list-title">Snapshots</span>
              <span className="fr-list-count">{loading ? "..." : snapshots.length}</span>
            </div>
            <div className="fr-list">
              {loading ? (
                <div className="fr-empty">Loading snapshots...</div>
              ) : snapshots.length === 0 ? (
                <div className="fr-empty">
                  <p>No snapshots found</p>
                  <p className="fr-empty-hint">Snapshots are captured automatically every ~10 minutes while this note changes</p>
                </div>
              ) : (
                snapshots.map((snap) => {
                  const isSelected = selectedSnapshot?.id === snap.id;
                  return (
                    <button
                      key={snap.id}
                      className={`fr-snapshot-item${isSelected ? " fr-snapshot-active" : ""}`}
                      onClick={() => handleSelectSnapshot(snap)}
                    >
                      <div className="fr-snapshot-info">
                        <div className="fr-snapshot-date">
                          {formatDate(snap.createdAt)}
                          <span className="fr-snapshot-time">{formatTime(snap.createdAt)}</span>
                        </div>
                        <div className="fr-snapshot-meta">
                          <span className="fr-snapshot-age">{formatAge(snap.createdAt)}</span>
                          <span className="fr-snapshot-size">{formatSize(snap.size)}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="fr-preview-pane">
            <div className="fr-preview-header">
              <span className="fr-preview-title">Preview</span>
              {selectedSnapshot && previewContent !== null && (
                <button className="fr-restore-btn" onClick={handleRestore}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4h3L2 1M2 4a5 5 0 105 5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Restore
                </button>
              )}
            </div>
            <div className="fr-preview-content">
              {loadingPreview ? (
                <div className="fr-preview-empty">Loading preview...</div>
              ) : previewContent !== null ? (
                <pre className="fr-preview-text">{previewContent}</pre>
              ) : (
                <div className="fr-preview-empty">Select a snapshot to preview</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

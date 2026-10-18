"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getSnapshots, loadSnapshot } from "@/lib/file-recovery";
import "@/styles/file-recovery.css";
import { formatDate as formatIntl, t } from "@noteriv/ui/i18n";
import { useLocale } from "@noteriv/ui/i18n/react";

interface FileRecoveryProps {
  vaultPath: string;
  currentFile: string;
  currentContent: string;
  onRestore: (content: string) => void;
  onClose: () => void;
}

interface SnapshotInfo {
  timestamp: number;
  path: string;
  size: number;
}

export default function FileRecovery({
  vaultPath,
  currentFile,
  currentContent,
  onRestore,
  onClose,
}: FileRecoveryProps) {
  useLocale();
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotInfo | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const fileName = (currentFile.split("/").pop() || "Untitled").replace(
    /\.(md|markdown)$/i,
    ""
  );

  // Load snapshots on mount
  useEffect(() => {
    setLoading(true);
    getSnapshots(vaultPath, currentFile).then((snaps) => {
      setSnapshots(snaps);
      setLoading(false);
    });
  }, [vaultPath, currentFile]);

  // Backdrop click
  const handleBackdrop = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  // Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Preview a snapshot
  const handleSelectSnapshot = async (snap: SnapshotInfo) => {
    setSelectedSnapshot(snap);
    setLoadingPreview(true);
    const content = await loadSnapshot(snap.path);
    setPreviewContent(content);
    setLoadingPreview(false);
  };

  // Restore a snapshot
  const handleRestore = () => {
    if (previewContent !== null) {
      onRestore(previewContent);
      onClose();
    }
  };

  // Delete a snapshot
  const handleDeleteSnapshot = async (snap: SnapshotInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.electronAPI) return;

    await window.electronAPI.deleteFile(snap.path);
    setSnapshots((prev) => prev.filter((s) => s.path !== snap.path));

    if (selectedSnapshot?.path === snap.path) {
      setSelectedSnapshot(null);
      setPreviewContent(null);
    }
  };

  // Format helpers
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return formatIntl(date, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return formatIntl(date, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatAge = (timestamp: number): string => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t("fileRecovery.ago.justNow");
    if (minutes < 60) return t("fileRecovery.ago.minutes", { count: minutes });
    if (hours < 24) return t("fileRecovery.ago.hours", { count: hours });
    if (days < 30) return t("fileRecovery.ago.days", { count: days });
    return t("fileRecovery.ago.months", { count: Math.floor(days / 30) });
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div ref={overlayRef} className="fr-overlay" onClick={handleBackdrop}>
      <div className="fr-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="fr-header">
          <div className="fr-header-left">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M8 4v4l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <h2 className="fr-title">{t("fileRecovery.title")}</h2>
            <span className="fr-file-name">{fileName}</span>
          </div>
          <button onClick={onClose} className="fr-close-btn">
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="fr-body">
          {/* Snapshot list */}
          <div className="fr-list-pane">
            <div className="fr-list-header">
              <span className="fr-list-title">{t("fileRecovery.snapshots")}</span>
              <span className="fr-list-count">
                {loading ? "..." : snapshots.length}
              </span>
            </div>
            <div className="fr-list">
              {loading ? (
                <div className="fr-empty">{t("fileRecovery.loading")}</div>
              ) : snapshots.length === 0 ? (
                <div className="fr-empty">
                  <p>{t("fileRecovery.none")}</p>
                  <p className="fr-empty-hint">
                    {t("fileRecovery.hint.desktop")}
                  </p>
                </div>
              ) : (
                snapshots.map((snap) => {
                  const isSelected = selectedSnapshot?.path === snap.path;
                  return (
                    <button
                      key={snap.path}
                      className={`fr-snapshot-item${isSelected ? " fr-snapshot-active" : ""}`}
                      onClick={() => handleSelectSnapshot(snap)}
                    >
                      <div className="fr-snapshot-info">
                        <div className="fr-snapshot-date">
                          {formatDate(snap.timestamp)}
                          <span className="fr-snapshot-time">
                            {formatTime(snap.timestamp)}
                          </span>
                        </div>
                        <div className="fr-snapshot-meta">
                          <span className="fr-snapshot-age">{formatAge(snap.timestamp)}</span>
                          <span className="fr-snapshot-size">{formatSize(snap.size)}</span>
                        </div>
                      </div>
                      <button
                        className="fr-snapshot-delete"
                        onClick={(e) => handleDeleteSnapshot(snap, e)}
                        title={t("desktop.fileRecovery.delete")}
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12">
                          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      </button>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Preview pane */}
          <div className="fr-preview-pane">
            <div className="fr-preview-header">
              <span className="fr-preview-title">{t("fileRecovery.preview")}</span>
              {selectedSnapshot && previewContent !== null && (
                <button className="fr-restore-btn" onClick={handleRestore}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4h3L2 1M2 4a5 5 0 105 5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t("fileRecovery.restore")}
                </button>
              )}
            </div>
            <div className="fr-preview-content">
              {loadingPreview ? (
                <div className="fr-preview-empty">{t("fileRecovery.loadingPreview")}</div>
              ) : previewContent !== null ? (
                <pre className="fr-preview-text">{previewContent}</pre>
              ) : (
                <div className="fr-preview-empty">
                  {t("fileRecovery.select")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

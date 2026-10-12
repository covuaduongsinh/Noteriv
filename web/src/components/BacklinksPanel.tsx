"use client";

import { useState, useEffect, useCallback } from "react";
import { webApi, type ApiBacklink } from "@/lib/webApi";

interface BacklinksPanelProps {
  /** Id of the note being viewed. */
  noteId: string;
  vaultId: string;
  /** Called when user clicks a backlink to open the linked note. */
  onNoteOpen: (noteId: string) => void;
  /** Called when the panel close button is clicked. */
  onClose: () => void;
}

export default function BacklinksPanel({ noteId, vaultId, onNoteOpen, onClose }: BacklinksPanelProps) {
  const [backlinks, setBacklinks] = useState<ApiBacklink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const results = await webApi.notes.backlinks(vaultId, noteId);
        if (!cancelled) setBacklinks(results);
      } catch (err) {
        console.error("Failed to load backlinks:", err);
        if (!cancelled) setBacklinks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [noteId, vaultId]);

  const handleBacklinkClick = useCallback(
    (id: string) => onNoteOpen(id),
    [onNoteOpen]
  );

  return (
    <div className="bl-panel">
      <div className="bl-header">
        <span className="bl-title">Backlinks</span>
        <div className="bl-header-right">
          {!loading && (
            <span className="bl-count">
              {backlinks.length} {backlinks.length === 1 ? "link" : "links"}
            </span>
          )}
          <button onClick={onClose} className="bl-close" title="Close">
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="bl-list">
        {loading ? (
          <div className="bl-loading">
            <div className="bl-spinner" />
            <span>Scanning vault...</span>
          </div>
        ) : backlinks.length === 0 ? (
          <div className="bl-empty">No backlinks found for this note.</div>
        ) : (
          backlinks.map((bl) => {
            const displayName = bl.name.replace(/\.md$/i, "");
            return (
              <div key={bl.id} className="bl-group">
                <button
                  className="bl-file-header"
                  onClick={() => handleBacklinkClick(bl.id)}
                  title={bl.path}
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" className="bl-file-icon">
                    <path d="M4 1h5l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" fill="none" />
                    <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.2" fill="none" />
                  </svg>
                  <span className="bl-file-name">{displayName}</span>
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

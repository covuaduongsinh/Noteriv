"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { NoteBacklink, NoteRef, VaultAdapter } from "@noteriv/core/vault-adapter";
import { t } from "../i18n";
import { useLocale } from "../i18n/react";

interface BacklinksPanelProps {
  adapter: VaultAdapter;
  /** Id (adapter key) of the note being viewed. */
  noteId: string;
  /** Called when user clicks a backlink to open the linked note. */
  onNoteOpen: (noteId: string) => void;
  /** Called when the panel close button is clicked. */
  onClose: () => void;
}

interface BacklinkGroup {
  ref: NoteRef;
  links: NoteBacklink[];
}

export default function BacklinksPanel({ adapter, noteId, onNoteOpen, onClose }: BacklinksPanelProps) {
  useLocale();
  const [backlinks, setBacklinks] = useState<NoteBacklink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const results = await adapter.backlinks(noteId);
        if (!cancelled) setBacklinks(results);
      } catch (err) {
        console.error("Failed to load backlinks:", err);
        if (!cancelled) setBacklinks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [adapter, noteId]);

  // One group per source note; the web backend reports no line, so a group may hold a single bare entry.
  const groups = useMemo(() => {
    const byId = new Map<string, BacklinkGroup>();
    for (const bl of backlinks) {
      const group = byId.get(bl.ref.id) ?? { ref: bl.ref, links: [] };
      group.links.push(bl);
      byId.set(bl.ref.id, group);
    }
    return Array.from(byId.values());
  }, [backlinks]);

  const handleBacklinkClick = useCallback((id: string) => onNoteOpen(id), [onNoteOpen]);

  return (
    <div className="bl-panel">
      <div className="bl-header">
        <span className="bl-title">{t("panels.backlinks.title")}</span>
        <div className="bl-header-right">
          {!loading && (
            <span className="bl-count">
              {t("panels.backlinks.count", { count: backlinks.length })}
            </span>
          )}
          <button onClick={onClose} className="bl-close" title={t("common.close")}>
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
            <span>{t("panels.backlinks.scanning")}</span>
          </div>
        ) : backlinks.length === 0 ? (
          <div className="bl-empty">{t("panels.backlinks.empty")}</div>
        ) : (
          groups.map(({ ref, links }) => (
            <div key={ref.id} className="bl-group">
              <button className="bl-file-header" onClick={() => handleBacklinkClick(ref.id)} title={ref.path}>
                <svg width="12" height="12" viewBox="0 0 16 16" className="bl-file-icon">
                  <path
                    d="M4 1h5l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2a1 1 0 011-1z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    fill="none"
                  />
                  <path d="M9 1v4h4" stroke="currentColor" strokeWidth="1.2" fill="none" />
                </svg>
                <span className="bl-file-name">{ref.name.replace(/\.md$/i, "")}</span>
              </button>

              {links.map(
                (bl, idx) =>
                  bl.line !== undefined && (
                    <button
                      key={`${ref.id}:${bl.line}:${idx}`}
                      className="bl-snippet"
                      onClick={() => handleBacklinkClick(ref.id)}
                      title={t("panels.backlinks.line", { line: bl.line })}
                    >
                      <span className="bl-line-num">L{bl.line}</span>
                      <span className="bl-snippet-text">{bl.snippet}</span>
                    </button>
                  )
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

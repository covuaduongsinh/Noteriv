"use client";

import { BacklinksIcon, CollabIcon, ExportIcon } from "@/components/icons";

interface NoteToolbarProps {
  notePath: string;
  saving: boolean;
  backlinksVisible: boolean;
  collabVisible: boolean;
  collabPeerCount: number;
  onToggleBacklinks: () => void;
  onToggleCollab: () => void;
  onExportPDF: () => void;
}

/**
 * Per-note action strip — actions that apply to *this* open note, not the
 * whole vault (those live in the Ribbon instead; see the plan doc's
 * ribbon-vs-per-note mapping). Desktop has no direct equivalent for this
 * exact row — Backlinks/Export PDF are triggered via hotkey/command palette
 * there, and Collab doesn't exist in desktop at all — so these are icon
 * buttons styled like `.ribbon-btn` rather than a ported component.
 */
export default function NoteToolbar({
  notePath,
  saving,
  backlinksVisible,
  collabVisible,
  collabPeerCount,
  onToggleBacklinks,
  onToggleCollab,
  onExportPDF,
}: NoteToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] text-sm text-[var(--text-secondary)]">
      <span className="truncate">{notePath}</span>
      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--text-muted)] mr-2">{saving ? "Đang lưu…" : "Đã lưu"}</span>
        <button
          onClick={onToggleBacklinks}
          title="Backlinks"
          className="titlebar-btn"
          style={backlinksVisible ? { color: "var(--accent)", background: "rgba(137,180,250,0.12)" } : undefined}
        >
          <BacklinksIcon />
        </button>
        <button
          onClick={onToggleCollab}
          title="Collaboration"
          className="titlebar-btn"
          style={collabVisible ? { color: "var(--accent)", background: "rgba(137,180,250,0.12)" } : undefined}
        >
          <CollabIcon />
          {collabVisible && collabPeerCount > 0 && <span className="ml-1 text-xs">{collabPeerCount}</span>}
        </button>
        <button onClick={onExportPDF} title="Export PDF" className="titlebar-btn">
          <ExportIcon />
        </button>
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { BacklinksIcon, CollabIcon, ExportIcon, BookmarkIcon, PublishIcon, HistoryIcon } from "@/components/icons";

interface NoteToolbarProps {
  notePath: string;
  backlinksVisible: boolean;
  collabVisible: boolean;
  collabPeerCount: number;
  bookmarked: boolean;
  onToggleBacklinks: () => void;
  onToggleCollab: () => void;
  onExportPDF: () => void;
  onToggleBookmark: () => void;
  onPublish: () => void;
  onFileRecovery: () => void;
  /** Buttons core plugins put here (`ui.addNoteToolbarButton`): Slides, Note history… */
  pluginButtons?: ReactNode;
}

/**
 * Per-note action strip — actions that apply to *this* open note, not the
 * whole vault (those live in the Ribbon instead; see the plan doc's
 * ribbon-vs-per-note mapping). Desktop has no direct equivalent for this
 * exact row — Backlinks/Export PDF are triggered via hotkey/command palette
 * there, and Collab doesn't exist in desktop at all — so these are icon
 * buttons styled like `.ribbon-btn` rather than a ported component. The
 * saved/unsaved indicator moved to StatusBar.tsx (Phase A), matching
 * desktop's status bar rather than living here.
 */
export default function NoteToolbar({
  notePath,
  backlinksVisible,
  collabVisible,
  collabPeerCount,
  bookmarked,
  onToggleBacklinks,
  onToggleCollab,
  onExportPDF,
  onToggleBookmark,
  onPublish,
  onFileRecovery,
  pluginButtons,
}: NoteToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] text-sm text-[var(--text-secondary)]">
      <span className="truncate">{notePath}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleBookmark}
          title={bookmarked ? "Bỏ bookmark" : "Bookmark note này"}
          className="titlebar-btn"
          style={bookmarked ? { color: "var(--accent)" } : undefined}
        >
          <BookmarkIcon />
        </button>
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
        <button onClick={onExportPDF} title="Tải PDF" className="titlebar-btn">
          <ExportIcon />
        </button>
        <button onClick={onPublish} title="Publish preview (static HTML)" className="titlebar-btn">
          <PublishIcon />
        </button>
        <button onClick={onFileRecovery} title="File Recovery" className="titlebar-btn">
          <HistoryIcon />
        </button>
        {pluginButtons}
      </div>
    </div>
  );
}

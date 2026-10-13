"use client";

import {
  QuickOpenIcon,
  NewNoteIcon,
  GraphIcon,
  CalendarIcon,
  FlashcardIcon,
  SettingsIcon,
  SearchIcon,
  OutlineIcon,
  TagIcon,
  TrashIcon,
  BookmarkIcon,
  InsightsIcon,
  TemplateIcon,
  ComposerIcon,
  AttachmentIcon,
} from "@/components/icons";

interface RibbonProps {
  onQuickOpen: () => void;
  onNewNote: () => void;
  onGraph: () => void;
  onSearch: () => void;
  onCalendar: () => void;
  onFlashcards: () => void;
  onSettings: () => void;
  onOutline: () => void;
  onTags: () => void;
  onTrash: () => void;
  onBookmarks: () => void;
  onInsights: () => void;
  onTemplates: () => void;
  onNoteComposer: () => void;
  onAttachments: () => void;
  outlineActive?: boolean;
  tagsActive?: boolean;
  bookmarksActive?: boolean;
}

/**
 * Vault-level left icon rail — equivalent to desktop's ribbon (inlined in
 * desktop/src/app/page.tsx, no standalone file there). Holds actions that
 * apply to the whole vault, not to whichever note happens to be open — see
 * docs/plans/2026-10-13-noteriv-web-ui-parity.md's ribbon-vs-per-note mapping.
 */
export default function Ribbon({
  onQuickOpen,
  onNewNote,
  onGraph,
  onSearch,
  onCalendar,
  onFlashcards,
  onSettings,
  onOutline,
  onTags,
  onTrash,
  onBookmarks,
  onInsights,
  onTemplates,
  onNoteComposer,
  onAttachments,
  outlineActive,
  tagsActive,
  bookmarksActive,
}: RibbonProps) {
  return (
    <div className="ribbon">
      <div className="ribbon-top">
        <button className="ribbon-btn" title="Quick Open (⌘K)" onClick={onQuickOpen}>
          <QuickOpenIcon />
        </button>
        <button className="ribbon-btn" title="New note" onClick={onNewNote}>
          <NewNoteIcon />
        </button>
        <button className="ribbon-btn" title="New from template" onClick={onTemplates}>
          <TemplateIcon />
        </button>
        <button className="ribbon-btn" title="Graph view" onClick={onGraph}>
          <GraphIcon />
        </button>
        <button className="ribbon-btn" title="Tìm trong vault" onClick={onSearch}>
          <SearchIcon />
        </button>
        <button
          className="ribbon-btn"
          title="Outline"
          onClick={onOutline}
          style={outlineActive ? { color: "var(--accent)", background: "rgba(137,180,250,0.12)" } : undefined}
        >
          <OutlineIcon />
        </button>
        <button
          className="ribbon-btn"
          title="Tags"
          onClick={onTags}
          style={tagsActive ? { color: "var(--accent)", background: "rgba(137,180,250,0.12)" } : undefined}
        >
          <TagIcon />
        </button>
        <button
          className="ribbon-btn"
          title="Bookmarks"
          onClick={onBookmarks}
          style={bookmarksActive ? { color: "var(--accent)", background: "rgba(137,180,250,0.12)" } : undefined}
        >
          <BookmarkIcon />
        </button>
        <button className="ribbon-btn" title="Calendar" onClick={onCalendar}>
          <CalendarIcon />
        </button>
        <button className="ribbon-btn" title="Flashcards" onClick={onFlashcards}>
          <FlashcardIcon />
        </button>
        <button className="ribbon-btn" title="Note Composer (merge/split)" onClick={onNoteComposer}>
          <ComposerIcon />
        </button>
        <button className="ribbon-btn" title="Attachments" onClick={onAttachments}>
          <AttachmentIcon />
        </button>
        <button className="ribbon-btn" title="Vault Insights" onClick={onInsights}>
          <InsightsIcon />
        </button>
      </div>
      <div className="ribbon-bottom">
        <button className="ribbon-btn" title="Trash" onClick={onTrash}>
          <TrashIcon size={16} />
        </button>
        <button className="ribbon-btn" title="Settings (Ctrl+,)" onClick={onSettings}>
          <SettingsIcon />
        </button>
      </div>
    </div>
  );
}

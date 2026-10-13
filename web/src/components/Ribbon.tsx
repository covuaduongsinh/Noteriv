"use client";

import {
  QuickOpenIcon,
  NewNoteIcon,
  GraphIcon,
  CalendarIcon,
  FlashcardIcon,
  PluginIcon,
  SnippetsIcon,
  SettingsIcon,
  SearchIcon,
} from "@/components/icons";

interface RibbonProps {
  onQuickOpen: () => void;
  onNewNote: () => void;
  onGraph: () => void;
  onSearch: () => void;
  onCalendar: () => void;
  onFlashcards: () => void;
  onPlugins: () => void;
  onSnippets: () => void;
  onTheme: () => void;
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
  onPlugins,
  onSnippets,
  onTheme,
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
        <button className="ribbon-btn" title="Graph view" onClick={onGraph}>
          <GraphIcon />
        </button>
        <button className="ribbon-btn" title="Tìm trong vault" onClick={onSearch}>
          <SearchIcon />
        </button>
        <button className="ribbon-btn" title="Calendar" onClick={onCalendar}>
          <CalendarIcon />
        </button>
        <button className="ribbon-btn" title="Flashcards" onClick={onFlashcards}>
          <FlashcardIcon />
        </button>
        <button className="ribbon-btn" title="Plugins" onClick={onPlugins}>
          <PluginIcon />
        </button>
      </div>
      <div className="ribbon-bottom">
        <button className="ribbon-btn" title="CSS Snippets" onClick={onSnippets}>
          <SnippetsIcon />
        </button>
        <button className="ribbon-btn" title="Theme" onClick={onTheme}>
          <SettingsIcon />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
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
  MicIcon,
  SyncIcon,
  ThemeIcon,
  PluginIcon,
  SnippetsIcon,
  CommandIcon,
  DailyIcon,
  MoreIcon,
} from "@/components/icons";

interface RibbonProps {
  onQuickOpen: () => void;
  onNewNote: () => void;
  onDailyNote: () => void;
  onCommandPalette: () => void;
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
  onAudioRecorder: () => void;
  onSync: () => void;
  onPlugins: () => void;
  onThemes: () => void;
  onSnippets: () => void;
  syncAttention?: boolean;
  /** Sidebar panels registered by plugins; one extra button each. */
  pluginPanels?: { key: string; title: string; icon?: string }[];
  activePluginPanel?: string | null;
  onPluginPanel?: (key: string) => void;
  outlineActive?: boolean;
  tagsActive?: boolean;
  bookmarksActive?: boolean;
}

const ACTIVE_STYLE = { color: "var(--accent)", background: "rgba(137,180,250,0.12)" } as const;

/**
 * Vault-level left icon rail — equivalent to desktop's ribbon (inlined in
 * desktop/src/app/page.tsx, no standalone file there). Holds actions that
 * apply to the whole vault, not to whichever note happens to be open.
 *
 * It used to hold ~22 buttons and ran off the bottom of the window (Settings got cut off).
 * Now the everyday ones stay on the rail like desktop's and the rest live in the "⋯" popover.
 */
export default function Ribbon(props: RibbonProps) {
  const {
    onQuickOpen, onNewNote, onDailyNote, onCommandPalette, onGraph, onSearch, onCalendar, onSettings,
    onOutline, onTags, onBookmarks, onSync, onPlugins, syncAttention, pluginPanels = [], activePluginPanel = null,
    onPluginPanel, outlineActive, tagsActive, bookmarksActive,
  } = props;

  const [moreOpen, setMoreOpen] = useState(false);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 44, bottom: 8 });

  useEffect(() => {
    if (!moreOpen) return;
    const r = moreBtnRef.current?.getBoundingClientRect();
    if (r) setPos({ left: r.right + 8, bottom: Math.max(8, window.innerHeight - r.bottom) });
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!popRef.current?.contains(t) && !moreBtnRef.current?.contains(t)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  const moreItems: { label: string; icon: React.ReactNode; run: () => void }[] = [
    { label: "Tạo từ template", icon: <TemplateIcon />, run: props.onTemplates },
    { label: "Flashcards", icon: <FlashcardIcon />, run: props.onFlashcards },
    { label: "Note Composer (gộp/tách)", icon: <ComposerIcon />, run: props.onNoteComposer },
    { label: "File đính kèm", icon: <AttachmentIcon />, run: props.onAttachments },
    { label: "Ghi âm", icon: <MicIcon />, run: props.onAudioRecorder },
    { label: "Vault Insights", icon: <InsightsIcon />, run: props.onInsights },
    { label: "Themes", icon: <ThemeIcon />, run: props.onThemes },
    { label: "CSS Snippets", icon: <SnippetsIcon />, run: props.onSnippets },
    { label: "Thùng rác", icon: <TrashIcon size={16} />, run: props.onTrash },
  ];

  return (
    <div className="ribbon">
      <div className="ribbon-top" style={{ overflowY: "auto", scrollbarWidth: "none", minHeight: 0 }}>
        <button className="ribbon-btn" title="Quick Open (Ctrl+K)" onClick={onQuickOpen}>
          <QuickOpenIcon />
        </button>
        <button className="ribbon-btn" title="Note mới" onClick={onNewNote}>
          <NewNoteIcon />
        </button>
        <button className="ribbon-btn" title="Daily note (Ctrl+D)" onClick={onDailyNote}>
          <DailyIcon />
        </button>
        <button className="ribbon-btn" title="Graph view" onClick={onGraph}>
          <GraphIcon />
        </button>
        <button className="ribbon-btn" title="Command palette (Ctrl+Shift+P hoặc F1)" onClick={onCommandPalette}>
          <CommandIcon />
        </button>
        <button className="ribbon-btn" title="Tìm trong vault" onClick={onSearch}>
          <SearchIcon />
        </button>
        <button className="ribbon-btn" title="Outline" onClick={onOutline} style={outlineActive ? ACTIVE_STYLE : undefined}>
          <OutlineIcon />
        </button>
        <button className="ribbon-btn" title="Tags" onClick={onTags} style={tagsActive ? ACTIVE_STYLE : undefined}>
          <TagIcon />
        </button>
        <button className="ribbon-btn" title="Bookmarks" onClick={onBookmarks} style={bookmarksActive ? ACTIVE_STYLE : undefined}>
          <BookmarkIcon />
        </button>
        <button className="ribbon-btn" title="Calendar" onClick={onCalendar}>
          <CalendarIcon />
        </button>
      </div>
      <div className="ribbon-bottom" style={{ flexShrink: 0 }}>
        {pluginPanels.map((p) => (
          <button
            key={p.key}
            className="ribbon-btn"
            title={p.title}
            onClick={() => onPluginPanel?.(p.key)}
            style={{ fontSize: 12, fontWeight: 600, ...(activePluginPanel === p.key ? { color: "var(--accent)" } : {}) }}
          >
            {(p.icon && p.icon.length <= 2 ? p.icon : p.title.charAt(0)).toUpperCase()}
          </button>
        ))}
        <button
          ref={moreBtnRef}
          className="ribbon-btn"
          title="Thêm công cụ"
          onClick={() => setMoreOpen((v) => !v)}
          style={moreOpen ? ACTIVE_STYLE : undefined}
        >
          <MoreIcon />
        </button>
        <button className="ribbon-btn" title="Đồng bộ Git / WebDAV" onClick={onSync} style={syncAttention ? { color: "var(--yellow)" } : undefined}>
          <SyncIcon />
        </button>
        <button className="ribbon-btn" title="Plugins" onClick={onPlugins}>
          <PluginIcon />
        </button>
        <button className="ribbon-btn" title="Settings (Ctrl+,)" onClick={onSettings}>
          <SettingsIcon />
        </button>
      </div>

      {moreOpen && (
        <div
          ref={popRef}
          role="menu"
          className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg"
          style={{ position: "fixed", left: pos.left, bottom: pos.bottom, zIndex: 60, minWidth: 220, padding: 4 }}
        >
          {moreItems.map((it) => (
            <button
              key={it.label}
              role="menuitem"
              onClick={() => {
                setMoreOpen(false);
                it.run();
              }}
              className="w-full flex items-center gap-3 text-sm text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md"
              style={{ padding: "7px 10px" }}
            >
              <span style={{ display: "flex", width: 18, justifyContent: "center", color: "var(--text-muted)" }}>{it.icon}</span>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

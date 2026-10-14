"use client";

import { useEffect, useRef, useState } from "react";
import { formatHotkey, type HotkeyAction, type HotkeyBinding } from "@/lib/hotkeys";

interface MenuEntry {
  action: HotkeyAction;
  label: string;
}

type MenuSection = { title: string; entries: (MenuEntry | "sep")[] };

/**
 * Web counterpart of desktop's native menu bar (src-tauri/src/menu.rs:
 * File / Edit / View / Settings / Developer). Every entry maps to an existing
 * HotkeyAction, so shortcuts shown here follow the user's own rebinds. Native
 * Edit roles (undo/cut/copy/paste), zoom and DevTools belong to the browser.
 */
const SECTIONS: MenuSection[] = [
  {
    title: "File",
    entries: [
      { action: "newNote", label: "New Note" },
      { action: "dailyNote", label: "Today's Daily Note" },
      { action: "insertTemplate", label: "New from Template…" },
      "sep",
      { action: "save", label: "Save" },
      { action: "exportPDF", label: "Export as PDF" },
      "sep",
      { action: "importVault", label: "Import folder / zip…" },
      { action: "importNewVault", label: "Import as New Vault…" },
      { action: "newVaultFromGithub", label: "New Vault from GitHub…" },
      { action: "exportVault", label: "Export Vault (.zip)" },
      "sep",
      { action: "openTrash", label: "Trash" },
      { action: "closeTab", label: "Close Tab" },
    ],
  },
  {
    title: "Edit",
    entries: [
      { action: "findInVault", label: "Find in Vault" },
      { action: "noteComposer", label: "Note Composer…" },
      "sep",
      { action: "toggleBold", label: "Bold" },
      { action: "toggleItalic", label: "Italic" },
      { action: "toggleCode", label: "Inline Code" },
      { action: "insertLink", label: "Insert Link" },
    ],
  },
  {
    title: "View",
    entries: [
      { action: "toggleSidebar", label: "Toggle Sidebar" },
      { action: "toggleViewMode", label: "Cycle Edit / View / Source" },
      { action: "splitEditor", label: "Split Editor" },
      { action: "zenMode", label: "Zen Mode" },
      { action: "focusMode", label: "Focus Mode" },
      { action: "toggleLint", label: "Lint Panel" },
      "sep",
      { action: "toggleOutline", label: "Outline" },
      { action: "toggleTags", label: "Tags" },
      { action: "toggleBacklinks", label: "Backlinks" },
      { action: "graphView", label: "Graph View" },
      "sep",
      { action: "randomNote", label: "Random Note" },
      { action: "commandPalette", label: "Command Palette" },
      { action: "calendarView", label: "Calendar" },
      { action: "flashcardReview", label: "Flashcards" },
      { action: "vaultInsights", label: "Vault Insights" },
    ],
  },
  {
    title: "Settings",
    entries: [
      { action: "settings", label: "Preferences…" },
      { action: "gitSync", label: "Sync Now" },
      { action: "syncSettings", label: "Sync Settings (Git / WebDAV)…" },
      "sep",
      { action: "pluginManager", label: "Plugins…" },
      { action: "themePicker", label: "Themes…" },
      { action: "cssSnippets", label: "CSS Snippets…" },
    ],
  },
  {
    title: "Developer",
    entries: [
      { action: "devToolsHint", label: "Toggle Developer Tools (F12)" },
      { action: "reloadApp", label: "Reload Window" },
      "sep",
      { action: "diagnostics", label: "Diagnostics…" },
    ],
  },
];

interface AppMenuProps {
  hotkeys: HotkeyBinding[];
  platform: string;
  onExecute: (action: HotkeyAction) => void;
}

export default function AppMenu({ hotkeys, platform, onExecute }: AppMenuProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openIdx === null) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenIdx(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIdx(null);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openIdx]);

  const keysFor = (action: HotkeyAction) => hotkeys.find((h) => h.action === action)?.keys ?? "";

  return (
    <div ref={rootRef} className="flex items-center" role="menubar">
      {SECTIONS.map((section, i) => (
        <div key={section.title} className="relative">
          <button
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={openIdx === i}
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            onMouseEnter={() => openIdx !== null && setOpenIdx(i)}
            style={{ padding: "4px 8px" }}
            className={`text-xs rounded-md hover:bg-[var(--bg-hover)] ${
              openIdx === i ? "bg-[var(--bg-hover)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
            }`}
          >
            {section.title}
          </button>
          {openIdx === i && (
            <div
              role="menu"
              className="absolute left-0 top-full mt-1 z-50 min-w-[220px] py-1 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg"
            >
              {section.entries.map((entry, j) =>
                entry === "sep" ? (
                  <div key={`sep-${j}`} className="my-1 border-t border-[var(--border)]" />
                ) : (
                  <button
                    key={entry.action}
                    role="menuitem"
                    onClick={() => {
                      setOpenIdx(null);
                      onExecute(entry.action);
                    }}
                    style={{ padding: "6px 12px" }}
                    className="w-full flex items-center justify-between gap-6 text-xs text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  >
                    <span>{entry.label}</span>
                    <span className="text-[var(--text-muted)]">{formatHotkey(keysFor(entry.action), platform)}</span>
                  </button>
                )
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

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
      "sep",
      { action: "save", label: "Save" },
      { action: "previewPDF", label: "Xem trước PDF" },
      { action: "exportPDF", label: "Tải PDF" },
      { action: "printNote", label: "In…" },
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
      "sep",
      { action: "toggleOutline", label: "Outline" },
      { action: "toggleTags", label: "Tags" },
      { action: "toggleBacklinks", label: "Backlinks" },
      "sep",
      { action: "randomNote", label: "Random Note" },
      { action: "commandPalette", label: "Command Palette" },
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

/** A command of an enabled core plugin (calendar, templates, flashcards…), listed under "Plugin". */
export interface PluginMenuCommand {
  key: string;
  name: string;
  hotkey?: string;
  run(): void;
}

interface AppMenuProps {
  hotkeys: HotkeyBinding[];
  platform: string;
  onExecute: (action: HotkeyAction) => void;
  pluginCommands?: PluginMenuCommand[];
}

type RenderedSection = { title: string; items: ({ key: string; label: string; keys: string; run: () => void } | "sep")[] };

export default function AppMenu({ hotkeys, platform, onExecute, pluginCommands = [] }: AppMenuProps) {
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

  // App sections, then (when any core plugin contributes commands) a "Plugin" section after View.
  const sections: RenderedSection[] = SECTIONS.map((s) => ({
    title: s.title,
    items: s.entries.map((e) => (e === "sep" ? e : { key: e.action, label: e.label, keys: keysFor(e.action), run: () => onExecute(e.action) })),
  }));
  if (pluginCommands.length > 0) {
    const items = [...pluginCommands]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({ key: c.key, label: c.name, keys: (c.hotkey ?? "").replace(/^Mod\+/, "Ctrl+"), run: c.run }));
    sections.splice(3, 0, { title: "Plugin", items });
  }

  return (
    <div ref={rootRef} className="flex items-center" role="menubar">
      {sections.map((section, i) => (
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
              {section.items.map((entry, j) =>
                entry === "sep" ? (
                  <div key={`sep-${j}`} className="my-1 border-t border-[var(--border)]" />
                ) : (
                  <button
                    key={entry.key}
                    role="menuitem"
                    onClick={() => {
                      setOpenIdx(null);
                      entry.run();
                    }}
                    style={{ padding: "6px 12px" }}
                    className="w-full flex items-center justify-between gap-6 text-xs text-left text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  >
                    <span>{entry.label}</span>
                    <span className="text-[var(--text-muted)]">{formatHotkey(entry.keys, platform)}</span>
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

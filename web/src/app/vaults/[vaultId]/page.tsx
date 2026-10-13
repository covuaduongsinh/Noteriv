"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import DOMPurify from "dompurify";
import type { EditorView } from "@codemirror/view";
import Editor from "@/components/Editor";
import SourceEditor from "@/components/SourceEditor";
import ReadOnlyView from "@/components/ReadOnlyView";
import SplitPane from "@/components/SplitPane";
import QuickOpen from "@/components/QuickOpen";
import BacklinksPanel from "@/components/BacklinksPanel";
import CollabPanel from "@/components/CollabPanel";
import PluginManager from "@/components/PluginManager";
import CalendarView from "@/components/CalendarView";
import FlashcardReview from "@/components/FlashcardReview";
import CSSSnippets from "@/components/CSSSnippets";
import VaultHeader from "@/components/VaultHeader";
import TabBar, { type TabBarTab } from "@/components/TabBar";
import Ribbon from "@/components/Ribbon";
import Sidebar from "@/components/Sidebar";
import NoteToolbar from "@/components/NoteToolbar";
import FormattingToolbar from "@/components/FormattingToolbar";
import FrontmatterEditor from "@/components/FrontmatterEditor";
import StatusBar from "@/components/StatusBar";
import OutlinePanel from "@/components/OutlinePanel";
import TagPane from "@/components/TagPane";
import SettingsModal from "@/components/SettingsModal";
import CommandPalette from "@/components/CommandPalette";
import TrashPanel from "@/components/TrashPanel";
import BookmarksPanel from "@/components/BookmarksPanel";
import VaultInsights from "@/components/VaultInsights";
import TemplatePicker from "@/components/TemplatePicker";
import NoteComposer from "@/components/NoteComposer";
import HoverPreview from "@/components/HoverPreview";
import AttachmentManager from "@/components/AttachmentManager";
import AudioRecorder from "@/components/AudioRecorder";
import FileRecovery from "@/components/FileRecovery";
import TimeScrubber from "@/components/TimeScrubber";
import NoteHistory from "@/components/NoteHistory";
import { setImageLightboxHandler } from "@/components/markdown/renderers/images";
import { CloseIcon } from "@/components/icons";
import { toggleBookmark, isBookmarked } from "@/lib/bookmark-utils";
import { usePluginHost } from "@/lib/plugin-sandbox/usePluginHost";
import { startCollab, type CollabSession, type CollabPeer } from "@/lib/collab";
import {
  webApi,
  type ApiVault,
  type VaultIndex,
  type ApiSearchResult,
  type ApiSyncConnection,
  type ViewMode,
} from "@/lib/webApi";
import { isBoardContent } from "@/lib/board-utils";
import { isCanvasContent } from "@/lib/canvas-utils";
import { isDrawingContent } from "@/lib/drawing-utils";
import { exportToPDF } from "@/lib/pdf-export";
import { BUILT_IN_THEMES, getDefaultTheme, applyTheme, loadCustomThemes, type ThemeDefinition } from "@/lib/theme-utils";
import { loadSnippets, applySnippets, refreshSnippets, type CSSSnippet } from "@/lib/css-snippets";
import {
  DEFAULT_HOTKEYS,
  mergeHotkeys,
  hotkeysToOverrideMap,
  matchesHotkey,
  detectPlatform,
  type HotkeyBinding,
  type HotkeyAction,
} from "@/lib/hotkeys";
import { wrapSelection, insertLink, insertImage, insertBlockquote, insertCodeBlock, insertTaskList, insertTable, insertHorizontalRule, insertAtCursor } from "@/lib/editor-commands";
import { DEFAULT_EDITOR_SETTINGS } from "@/lib/settings";

const RECENT_COMMANDS_KEY = "noteriv-recent-commands";

function loadRecentCommands(): HotkeyAction[] {
  try {
    const raw = localStorage.getItem(RECENT_COMMANDS_KEY);
    return raw ? (JSON.parse(raw) as HotkeyAction[]) : [];
  } catch {
    return [];
  }
}

function saveRecentCommand(action: HotkeyAction) {
  try {
    const prev = loadRecentCommands().filter((a) => a !== action);
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify([action, ...prev].slice(0, 5)));
  } catch {
    // localStorage unavailable (private window etc.) — recent list is a convenience, not load-bearing
  }
}

const BoardView = dynamic(() => import("@/components/BoardView"), { ssr: false });
const CanvasView = dynamic(() => import("@/components/CanvasView"), { ssr: false });
const DrawingView = dynamic(() => import("@/components/DrawingView"), { ssr: false });
const SlidePresentation = dynamic(() => import("@/components/SlidePresentation"), { ssr: false });
const PublishPreview = dynamic(() => import("@/components/PublishPreview"), { ssr: false });

const SAVE_DEBOUNCE_MS = 800;
const WORKSPACE_SAVE_DEBOUNCE_MS = 1000;
const DEFAULT_SIDEBAR_WIDTH = 250;

interface OpenTab {
  noteId: string;
  path: string;
  name: string;
  content: string;
  savedContent: string;
}

export default function VaultPage() {
  const params = useParams<{ vaultId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const vaultId = params.vaultId;

  const [vault, setVault] = useState<ApiVault | null>(null);
  const [allVaults, setAllVaults] = useState<ApiVault[]>([]);
  const [index, setIndex] = useState<VaultIndex | null>(null);

  // Tabs — a web vault can now have several notes open at once, mirroring
  // desktop's tab-bar model (docs/plans/2026-10-13-noteriv-web-full-parity.md
  // Phase A1). `tabs` holds in-memory content; Postgres is still the source
  // of truth, refreshed via webApi.notes.get on open.
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [pinnedTabIds, setPinnedTabIds] = useState<Set<string>>(new Set());
  const [fileViewModes, setFileViewModes] = useState<Record<string, ViewMode>>({});
  const [splitTabId, setSplitTabId] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState(0.5);
  const workspaceLoadedRef = useRef(false);
  const workspaceSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const [backlinksVisible, setBacklinksVisible] = useState(false);
  const [outlineVisible, setOutlineVisible] = useState(false);
  const [tagPaneVisible, setTagPaneVisible] = useState(false);
  const [frontmatterCollapsed, setFrontmatterCollapsed] = useState(true);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ApiSearchResult[] | null>(null);
  const [pluginManagerOpen, setPluginManagerOpen] = useState(false);
  const [collabVisible, setCollabVisible] = useState(false);
  const [collabConnected, setCollabConnected] = useState(false);
  const [collabPeers, setCollabPeers] = useState<CollabPeer[]>([]);
  const [displayName, setDisplayName] = useState<string | undefined>(undefined);
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [showCSSSnippets, setShowCSSSnippets] = useState(false);
  const [cssSnippets, setCSSSnippets] = useState<CSSSnippet[]>([]);
  const [currentThemeId, setCurrentThemeId] = useState<string>(getDefaultTheme().id);
  const [editorViewVersion, setEditorViewVersion] = useState(0);

  // Phase B2/B3 — per-user hotkey overrides + editor preferences
  // (web/server/src/routes/users.ts's /me/preferences), Settings modal, and
  // the Command Palette that reads the same hotkey list.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsInitialSection, setSettingsInitialSection] = useState<"general" | "appearance" | "editor" | "shortcuts" | "sync" | "ecosystem">("general");
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [recentCommands, setRecentCommands] = useState<HotkeyAction[]>([]);
  const [hotkeyBindings, setHotkeyBindings] = useState<HotkeyBinding[]>(DEFAULT_HOTKEYS);
  const [editorSettings, setEditorSettingsState] = useState(DEFAULT_EDITOR_SETTINGS);
  const [platform, setPlatform] = useState("web");
  const [syncConnections, setSyncConnections] = useState<ApiSyncConnection[]>([]);
  const preferencesLoadedRef = useRef(false);
  const preferencesSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Phase C — Trash/Bookmarks/Vault Insights/Templates/Note Composer/hover preview
  // (docs/plans/2026-10-13-noteriv-web-full-parity.md Phase C).
  const [showTrash, setShowTrash] = useState(false);
  const [bookmarksVisible, setBookmarksVisible] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [showInsights, setShowInsights] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showNoteComposer, setShowNoteComposer] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showSlidePresentation, setShowSlidePresentation] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showPublishPreview, setShowPublishPreview] = useState(false);
  // D5/D6 (docs/plans/2026-10-13-noteriv-web-full-parity.md Phase D nhóm 4).
  const [showFileRecovery, setShowFileRecovery] = useState(false);
  const [showTimeScrubber, setShowTimeScrubber] = useState(false);
  const [showGitHistory, setShowGitHistory] = useState(false);
  // Cheap client-side gate (no extra request): only offer Note History once a
  // non-WebDAV sync connection has synced at least once. The /history endpoint
  // itself still double-checks server-side and degrades gracefully either way.
  const gitHistoryAvailable = syncConnections.some((c) => c.providerType !== "webdav" && c.lastSyncedAt);
  const [wikilinkHover, setWikilinkHover] = useState<{ target: string; x: number; y: number } | null>(null);
  const wikilinkHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const collabPushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const collabSessionRef = useRef<CollabSession | null>(null);

  const activeTab = tabs.find((t) => t.noteId === activeTabId) ?? null;
  const splitTab = splitTabId ? tabs.find((t) => t.noteId === splitTabId) ?? null : null;
  const draft = activeTab?.content ?? "";
  const viewMode: ViewMode = (activeTabId && fileViewModes[activeTabId]) || "live";
  const draftRef = useRef(draft);
  draftRef.current = draft;
  // Last content applied FROM a remote collab update. CodeMirror's update
  // listener fires for *any* doc change, including the programmatic dispatch
  // Editor.tsx does to reflect a new `content` prop — so a remote update
  // flows: collab onUpdate -> setActiveTabContent -> Editor re-renders ->
  // CodeMirror dispatch -> onChange -> onDraftChange. Without this guard,
  // onDraftChange would immediately push that same content back into Yjs as
  // if the user had typed it, and two tabs would echo each other's updates
  // back and forth, which Yjs's CRDT merges as concurrent edits — corrupting
  // the text within a few round trips. Comparing against the exact string we
  // just received (set synchronously, before the state update) closes the
  // loop regardless of timing.
  const lastRemoteContentRef = useRef<string | null>(null);

  useEffect(() => {
    webApi.auth.me().then((u) => setDisplayName(u.displayName)).catch(() => undefined);
    webApi.vaults.list().then(setAllVaults).catch(() => undefined);
  }, []);

  // D9 — image lightbox: double-click on a rendered <img> (Editor or
  // ReadOnlyView, both share the same renderer pipeline) opens it enlarged.
  useEffect(() => {
    setImageLightboxHandler((src) => setLightboxSrc(src));
    return () => setImageLightboxHandler(null);
  }, []);

  useEffect(() => {
    if (!lightboxSrc) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxSrc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxSrc]);

  function setActiveTabContent(noteId: string, content: string) {
    setTabs((prev) => prev.map((t) => (t.noteId === noteId ? { ...t, content } : t)));
  }

  const editorSettingsRef = useRef(editorSettings);
  editorSettingsRef.current = editorSettings;

  async function persistNote(noteId: string, content: string) {
    await webApi.notes.update(vaultId, noteId, { content });
    setTabs((prev) => prev.map((t) => (t.noteId === noteId ? { ...t, savedContent: content } : t)));
    refreshIndex();
  }

  function scheduleSave(noteId: string, content: string) {
    if (saveTimers.current[noteId]) clearTimeout(saveTimers.current[noteId]);
    saveTimers.current[noteId] = setTimeout(() => {
      persistNote(noteId, content);
    }, editorSettingsRef.current.autoSaveInterval || SAVE_DEBOUNCE_MS);
  }

  function forceSaveActiveTab() {
    if (!activeTabId) return;
    if (saveTimers.current[activeTabId]) clearTimeout(saveTimers.current[activeTabId]);
    persistNote(activeTabId, draftRef.current);
  }

  // Join/leave the realtime collab room for the active note as the panel is
  // toggled or the active tab changes — a web note already has a durable id,
  // so "the room" is just `note:{id}`, no code to generate/share like desktop
  // needed.
  useEffect(() => {
    if (!collabVisible || !activeTabId) {
      collabSessionRef.current?.destroy();
      collabSessionRef.current = null;
      setCollabConnected(false);
      setCollabPeers([]);
      return;
    }

    const noteId = activeTabId;
    let cancelled = false;
    setCollabConnected(false);
    setCollabPeers([]);
    startCollab(
      noteId,
      draftRef.current,
      (content) => {
        lastRemoteContentRef.current = content;
        setActiveTabContent(noteId, content);
        scheduleSave(noteId, content);
      },
      setCollabPeers,
      displayName
    ).then((session) => {
      if (cancelled || !session) return;
      collabSessionRef.current = session;
      setCollabConnected(true);
    });

    return () => {
      cancelled = true;
      collabSessionRef.current?.destroy();
      collabSessionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collabVisible, activeTabId]);

  const refreshIndex = useCallback(() => {
    webApi.vaults.index(vaultId).then(setIndex);
  }, [vaultId]);

  const pluginHost = usePluginHost(
    vaultId,
    index,
    {
      getContent: () => draftRef.current,
      setContent: (content) => onDraftChange(content),
      insertAtCursor: (text) => {
        const view = editorViewRef.current;
        if (!view) return;
        const pos = view.state.selection.main.head;
        view.dispatch({ changes: { from: pos, insert: text }, selection: { anchor: pos + text.length } });
      },
      getSelection: () => {
        const view = editorViewRef.current;
        if (!view) return "";
        const sel = view.state.selection.main;
        return view.state.sliceDoc(sel.from, sel.to);
      },
      replaceSelection: (text) => {
        const view = editorViewRef.current;
        if (!view) return;
        const sel = view.state.selection.main;
        view.dispatch({ changes: { from: sel.from, to: sel.to, insert: text } });
      },
    },
    refreshIndex
  );

  const openNote = useCallback(
    async (noteId: string) => {
      setSearchVisible(false);
      setSearchResults(null);
      setSearchQuery("");

      const alreadyOpen = tabs.some((t) => t.noteId === noteId);
      if (alreadyOpen) {
        setActiveTabId(noteId);
        return;
      }
      const note = await webApi.notes.get(vaultId, noteId);
      setTabs((prev) =>
        prev.some((t) => t.noteId === noteId)
          ? prev
          : [...prev, { noteId, path: note.path, name: note.name, content: note.content, savedContent: note.content }]
      );
      setActiveTabId(noteId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vaultId, tabs]
  );

  function closeTab(noteId: string) {
    if (pinnedTabIds.has(noteId)) return;
    if (splitTabId === noteId) setSplitTabId(null);
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.noteId === noteId);
      const next = prev.filter((t) => t.noteId !== noteId);
      if (activeTabId === noteId) {
        const newIdx = Math.min(idx, next.length - 1);
        setActiveTabId(next[newIdx]?.noteId ?? null);
      }
      return next;
    });
  }

  function reorderTabs(from: number, to: number) {
    setTabs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function handleTogglePin(noteId: string) {
    setPinnedTabIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  }

  function handleCloseOtherTabs(noteId: string) {
    setTabs((prev) => prev.filter((t) => t.noteId === noteId || pinnedTabIds.has(t.noteId)));
    setActiveTabId(noteId);
  }

  function handleCloseAllTabs() {
    setTabs((prev) => {
      const remaining = prev.filter((t) => pinnedTabIds.has(t.noteId));
      if (activeTabId && !pinnedTabIds.has(activeTabId)) {
        setActiveTabId(remaining[0]?.noteId ?? null);
      }
      return remaining;
    });
    setSplitTabId(null);
  }

  function handleCloseTabsToRight(noteId: string) {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.noteId === noteId);
      if (idx === -1) return prev;
      const next = prev.filter((t, i) => i <= idx || pinnedTabIds.has(t.noteId));
      if (activeTabId && !next.some((t) => t.noteId === activeTabId)) setActiveTabId(noteId);
      return next;
    });
  }

  function handleSplitRight(noteId: string) {
    setSplitTabId(noteId);
  }

  function handleCloseSplit() {
    setSplitTabId(null);
  }

  function handleViewModeChange(mode: ViewMode) {
    if (!activeTabId) return;
    setFileViewModes((prev) => ({ ...prev, [activeTabId]: mode }));
  }

  // Load this vault's config (theme/snippets) and this user's workspace
  // state (open tabs/active tab/pinned/view-modes) in parallel.
  useEffect(() => {
    webApi.vaults
      .get(vaultId)
      .then(async (v) => {
        setVault(v);

        setBookmarks((v.settings.bookmarks as string[] | undefined) ?? []);

        const themeId = (v.settings.themeId as string | undefined) ?? getDefaultTheme().id;
        setCurrentThemeId(themeId);
        const builtIn = BUILT_IN_THEMES.find((t) => t.id === themeId);
        if (builtIn) {
          applyTheme(builtIn);
        } else {
          const customs = await loadCustomThemes(vaultId);
          applyTheme(customs.find((t) => t.id === themeId) ?? getDefaultTheme());
        }

        const snips = await loadSnippets(vaultId);
        setCSSSnippets(snips);
        applySnippets(snips);
      })
      .catch(() => router.replace("/vaults"));
    refreshIndex();

    webApi.workspace
      .getState(vaultId)
      .then(async (state) => {
        const notes = await Promise.all(
          state.openTabs.map((t) =>
            webApi.notes
              .get(vaultId, t.noteId)
              .then((note): OpenTab => ({ noteId: note.id, path: note.path, name: note.name, content: note.content, savedContent: note.content }))
              .catch(() => null)
          )
        );
        const restoredTabs = notes.filter((t): t is OpenTab => t !== null);
        setTabs(restoredTabs);
        setPinnedTabIds(new Set(state.pinnedTabIds));
        setFileViewModes(state.fileViewModes);
        setActiveTabId(
          state.activeTabId && restoredTabs.some((t) => t.noteId === state.activeTabId)
            ? state.activeTabId
            : restoredTabs[0]?.noteId ?? null
        );
      })
      .catch(() => undefined)
      .finally(() => {
        workspaceLoadedRef.current = true;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultId, router, refreshIndex]);

  // Persist workspace state (shape only — noteId/path/name, not content;
  // note content already autosaves via scheduleSave) whenever it changes,
  // debounced the same way note autosave is.
  useEffect(() => {
    if (!workspaceLoadedRef.current) return;
    if (workspaceSaveTimer.current) clearTimeout(workspaceSaveTimer.current);
    workspaceSaveTimer.current = setTimeout(() => {
      webApi.workspace
        .updateState(vaultId, {
          openTabs: tabs.map((t) => ({ noteId: t.noteId, path: t.path, name: t.name })),
          activeTabId,
          pinnedTabIds: Array.from(pinnedTabIds),
          fileViewModes,
        })
        .catch(() => undefined);
    }, WORKSPACE_SAVE_DEBOUNCE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultId, tabs, activeTabId, pinnedTabIds, fileViewModes]);

  // Load per-user hotkey overrides + editor preferences once (device-wide
  // across vaults, not per-vault — matches webApi.preferences's /users/me
  // scope). Platform + recent-commands are per-device only (localStorage),
  // never sent to the server.
  useEffect(() => {
    setPlatform(detectPlatform());
    setRecentCommands(loadRecentCommands());
    webApi.preferences
      .get()
      .then((prefs) => {
        setHotkeyBindings(mergeHotkeys(prefs.hotkeys));
        setEditorSettingsState({ ...DEFAULT_EDITOR_SETTINGS, ...prefs.editorSettings });
      })
      .catch(() => undefined)
      .finally(() => {
        preferencesLoadedRef.current = true;
      });
  }, []);

  // Apply editor preferences as CSS vars globals.css already reads
  // (--editor-font/--editor-font-size/--editor-line-height — see
  // docs/plans/2026-10-13-noteriv-web-full-parity.md Phase B2).
  useEffect(() => {
    document.documentElement.style.setProperty("--editor-font", editorSettings.editorFont);
    document.documentElement.style.setProperty("--editor-font-size", `${editorSettings.fontSize}px`);
    document.documentElement.style.setProperty("--editor-line-height", String(editorSettings.lineHeight));
  }, [editorSettings]);

  // Persist hotkey/editor-setting changes, debounced like workspace state.
  useEffect(() => {
    if (!preferencesLoadedRef.current) return;
    if (preferencesSaveTimer.current) clearTimeout(preferencesSaveTimer.current);
    preferencesSaveTimer.current = setTimeout(() => {
      webApi.preferences
        .update({ hotkeys: hotkeysToOverrideMap(hotkeyBindings), editorSettings })
        .catch(() => undefined);
    }, WORKSPACE_SAVE_DEBOUNCE_MS);
  }, [hotkeyBindings, editorSettings]);

  const refreshSyncConnections = useCallback(() => {
    webApi.sync.list(vaultId).then(setSyncConnections).catch(() => undefined);
  }, [vaultId]);

  useEffect(() => {
    refreshSyncConnections();
  }, [refreshSyncConnections]);

  function openSettings(section: typeof settingsInitialSection = "general") {
    setSettingsInitialSection(section);
    setSettingsOpen(true);
  }

  function cycleViewMode() {
    if (!activeTabId) return;
    const order: ViewMode[] = ["live", "view", "source"];
    const next = order[(order.indexOf(viewMode) + 1) % order.length];
    handleViewModeChange(next);
  }

  async function handleGitSyncHotkey() {
    if (syncConnections.length === 0) {
      openSettings("sync");
      return;
    }
    await webApi.sync.trigger(vaultId, syncConnections[0].id);
    refreshSyncConnections();
  }

  function executeCommand(action: HotkeyAction) {
    switch (action) {
      case "save":
        forceSaveActiveTab();
        break;
      case "newNote":
        handleQuickNewNote();
        break;
      case "closeTab":
        if (activeTabId) closeTab(activeTabId);
        break;
      case "closeAllTabs":
        handleCloseAllTabs();
        break;
      case "closeOtherTabs":
        if (activeTabId) handleCloseOtherTabs(activeTabId);
        break;
      case "togglePinTab":
        if (activeTabId) handleTogglePin(activeTabId);
        break;
      case "quickOpen":
        setQuickOpenVisible(true);
        break;
      case "commandPalette":
        setCommandPaletteOpen(true);
        break;
      case "findInVault":
        setSearchVisible(true);
        break;
      case "toggleSidebar":
        setSidebarCollapsed((v) => !v);
        break;
      case "toggleViewMode":
        cycleViewMode();
        break;
      case "settings":
        openSettings("general");
        break;
      case "toggleOutline":
        setOutlineVisible((v) => !v);
        break;
      case "toggleTags":
        setTagPaneVisible((v) => !v);
        break;
      case "graphView":
        handleGraphView();
        break;
      case "toggleBacklinks":
        setBacklinksVisible((v) => !v);
        break;
      case "toggleCollab":
        setCollabVisible((v) => !v);
        break;
      case "exportPDF":
        handleExportPDF();
        break;
      case "calendarView":
        setShowCalendarView(true);
        break;
      case "flashcardReview":
        setShowFlashcards(true);
        break;
      case "pluginManager":
        setPluginManagerOpen(true);
        break;
      case "cssSnippets":
        setShowCSSSnippets(true);
        break;
      case "gitSync":
        handleGitSyncHotkey();
        break;
      case "splitEditor":
        if (activeTabId) handleSplitRight(activeTabId);
        break;
      case "closeSplit":
        handleCloseSplit();
        break;
      case "toggleBold":
        if (editorViewRef.current) wrapSelection(editorViewRef.current, "**", "**");
        break;
      case "toggleItalic":
        if (editorViewRef.current) wrapSelection(editorViewRef.current, "*", "*");
        break;
      case "toggleStrikethrough":
        if (editorViewRef.current) wrapSelection(editorViewRef.current, "~~", "~~");
        break;
      case "toggleCode":
        if (editorViewRef.current) wrapSelection(editorViewRef.current, "`", "`");
        break;
      case "insertLink":
        if (editorViewRef.current) insertLink(editorViewRef.current);
        break;
      case "insertImage":
        if (editorViewRef.current) insertImage(editorViewRef.current);
        break;
      case "insertBlockquote":
        if (editorViewRef.current) insertBlockquote(editorViewRef.current);
        break;
      case "insertCodeBlock":
        if (editorViewRef.current) insertCodeBlock(editorViewRef.current);
        break;
      case "insertTaskList":
        if (editorViewRef.current) insertTaskList(editorViewRef.current);
        break;
      case "insertTable":
        if (editorViewRef.current) insertTable(editorViewRef.current);
        break;
      case "insertHorizontalRule":
        if (editorViewRef.current) insertHorizontalRule(editorViewRef.current);
        break;
      case "toggleBookmark":
        if (activeTabId) handleToggleBookmark(activeTabId);
        break;
      case "openTrash":
        setShowTrash(true);
        break;
      case "insertTemplate":
        setShowTemplatePicker(true);
        break;
      case "noteComposer":
        setShowNoteComposer(true);
        break;
      case "vaultInsights":
        setShowInsights(true);
        break;
    }
  }

  // Global hotkey dispatch — replaces the old Cmd/Ctrl+K-only listener below
  // with a lookup against the full (default-merged-with-user-overrides)
  // binding list, so Shortcuts-tab rebinds actually take effect everywhere,
  // not just in Quick Open.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      for (const binding of hotkeyBindings) {
        if (matchesHotkey(e, binding.keys)) {
          e.preventDefault();
          if (binding.action === "commandPalette") {
            setCommandPaletteOpen(true);
          } else {
            executeCommand(binding.action);
          }
          return;
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotkeyBindings, activeTabId, tabs, pinnedTabIds, viewMode, draft, syncConnections]);

  async function handleThemeSelect(themeId: string) {
    setCurrentThemeId(themeId);
    let theme: ThemeDefinition | undefined = BUILT_IN_THEMES.find((t) => t.id === themeId);
    if (!theme) {
      const customs = await loadCustomThemes(vaultId);
      theme = customs.find((t) => t.id === themeId);
    }
    if (theme) applyTheme(theme);

    const v = await webApi.vaults.get(vaultId);
    await webApi.vaults.update(vaultId, { settings: { ...v.settings, themeId } });
  }

  async function handleToggleBookmark(noteId: string) {
    const next = toggleBookmark(bookmarks, noteId);
    setBookmarks(next);
    const v = await webApi.vaults.get(vaultId);
    await webApi.vaults.update(vaultId, { settings: { ...v.settings, bookmarks: next } });
  }

  function handleWikilinkHover(target: string, x: number, y: number) {
    if (wikilinkHoverTimer.current) clearTimeout(wikilinkHoverTimer.current);
    wikilinkHoverTimer.current = setTimeout(() => setWikilinkHover({ target, x, y }), 300);
  }

  function handleWikilinkLeave() {
    if (wikilinkHoverTimer.current) clearTimeout(wikilinkHoverTimer.current);
    setWikilinkHover(null);
  }

  async function handleCreateFromTemplate(content: string, templateName: string) {
    const note = await webApi.notes.create(vaultId, { name: `${templateName}.md`, folderId: null, content });
    refreshIndex();
    openNote(note.id);
  }

  function openNoteByPath(path: string) {
    const note = index?.notes.find((n) => n.path === path);
    if (note) openNote(note.id);
  }

  async function handleExportPDF() {
    if (!activeTab) return;
    await exportToPDF(draft, activeTab.name);
  }

  async function handleCreateDailyNote(date: string) {
    const note = await webApi.notes.create(vaultId, { name: `${date}.md`, folderId: null, content: `# ${date}\n` });
    refreshIndex();
    openNote(note.id);
  }

  async function handleQuickNewNote() {
    const note = await webApi.notes.create(vaultId, { name: "Untitled.md", folderId: null, content: "" });
    refreshIndex();
    openNote(note.id);
  }

  function handleGraphView() {
    router.push(`/vaults/${vaultId}/graph`);
  }

  function handleHeadingClick(line: number) {
    const view = editorViewRef.current;
    if (!view) return;
    const lineInfo = view.state.doc.line(Math.min(Math.max(line, 1), view.state.doc.lines));
    view.dispatch({ selection: { anchor: lineInfo.from }, scrollIntoView: true });
    view.focus();
  }

  // Open the note requested via ?note=<id> (used by the Graph view's note click)
  useEffect(() => {
    const noteId = searchParams.get("note");
    if (noteId && noteId !== activeTabId) {
      openNote(noteId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function onDraftChange(value: string) {
    if (!activeTabId) return;
    setActiveTabContent(activeTabId, value);
    scheduleSave(activeTabId, value);

    // Don't echo a just-received remote update back into Yjs as if it were a
    // fresh local edit (see lastRemoteContentRef's comment above).
    if (value === lastRemoteContentRef.current) return;

    if (collabSessionRef.current) {
      if (collabPushTimer.current) clearTimeout(collabPushTimer.current);
      collabPushTimer.current = setTimeout(() => {
        collabSessionRef.current?.pushLocalText(value);
      }, 300);
    }
  }

  function onSplitDraftChange(value: string) {
    if (!splitTabId) return;
    setActiveTabContent(splitTabId, value);
    scheduleSave(splitTabId, value);
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const results = await webApi.vaults.search(vaultId, searchQuery.trim());
    setSearchResults(results);
  }

  const tabBarTabs: TabBarTab[] = tabs.map((t) => ({
    noteId: t.noteId,
    path: t.path,
    name: t.name,
    isDirty: t.content !== t.savedContent,
  }));

  function renderNoteBody(tab: OpenTab, mode: ViewMode, isMain: boolean) {
    const content = tab.content;
    const onChange = isMain ? onDraftChange : onSplitDraftChange;
    const onReady = isMain
      ? (view: EditorView) => {
          editorViewRef.current = view;
          setEditorViewVersion((v) => v + 1);
        }
      : undefined;

    if (isBoardContent(content)) {
      return <BoardView key={tab.noteId} content={content} onChange={onChange} />;
    }
    if (isCanvasContent(content)) {
      return (
        <CanvasView
          key={tab.noteId}
          content={content}
          onChange={onChange}
          vaultId={vaultId}
          index={index}
          onNoteSelect={openNote}
        />
      );
    }
    if (isDrawingContent(content)) {
      return <DrawingView key={tab.noteId} content={content} onChange={onChange} />;
    }

    return (
      <div className="flex-1 min-h-0 flex flex-col">
        {mode !== "source" && (
          <FrontmatterEditor
            content={content}
            onChange={onChange}
            collapsed={frontmatterCollapsed}
            onToggleCollapse={() => setFrontmatterCollapsed((v) => !v)}
          />
        )}
        {isMain && mode === "live" && (
          <FormattingToolbar key={editorViewVersion} editorView={editorViewRef.current} />
        )}
        <div className="flex-1 min-h-0">
          {mode === "source" ? (
            <SourceEditor content={content} onChange={onChange} vaultId={vaultId} onViewReady={onReady} />
          ) : mode === "view" ? (
            <ReadOnlyView content={content} onChange={onChange} />
          ) : (
            <Editor
              content={content}
              onChange={onChange}
              vaultId={vaultId}
              vimMode={editorSettings.vimModeEnabled}
              onViewReady={onReady}
              onWikilinkHover={isMain ? handleWikilinkHover : undefined}
              onWikilinkLeave={isMain ? handleWikilinkLeave : undefined}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col" data-vault-id={vaultId}>
      <VaultHeader
        vault={vault}
        vaults={allVaults}
        activeNotePath={activeTab?.path ?? null}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        showViewModes={!!activeTab}
      />

      {tabs.length > 0 && (
        <TabBar
          tabs={tabBarTabs}
          activeTabId={activeTabId}
          pinnedTabIds={pinnedTabIds}
          onTabSelect={setActiveTabId}
          onTabClose={closeTab}
          onTabReorder={reorderTabs}
          onTogglePin={handleTogglePin}
          onCloseOtherTabs={handleCloseOtherTabs}
          onCloseAllTabs={handleCloseAllTabs}
          onCloseTabsToRight={handleCloseTabsToRight}
          onSplitRight={handleSplitRight}
          onNewTab={handleQuickNewNote}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        <Ribbon
          onQuickOpen={() => setQuickOpenVisible(true)}
          onNewNote={handleQuickNewNote}
          onGraph={handleGraphView}
          onSearch={() => setSearchVisible(true)}
          onCalendar={() => setShowCalendarView(true)}
          onFlashcards={() => setShowFlashcards(true)}
          onSettings={() => openSettings("general")}
          onOutline={() => setOutlineVisible((v) => !v)}
          onTags={() => setTagPaneVisible((v) => !v)}
          onTrash={() => setShowTrash(true)}
          onBookmarks={() => setBookmarksVisible((v) => !v)}
          onInsights={() => setShowInsights(true)}
          onTemplates={() => setShowTemplatePicker(true)}
          onNoteComposer={() => setShowNoteComposer(true)}
          onAttachments={() => setShowAttachments(true)}
          onAudioRecorder={() => setShowAudioRecorder(true)}
          outlineActive={outlineVisible}
          tagsActive={tagPaneVisible}
          bookmarksActive={bookmarksVisible}
        />

        {!sidebarCollapsed &&
          (searchVisible ? (
            <div className="sidebar-root flex flex-col" style={{ width: sidebarWidth, minWidth: sidebarWidth }}>
              <div className="sidebar-header">
                <span className="sidebar-title">Tìm kiếm</span>
                <div className="sidebar-actions">
                  <button onClick={() => { setSearchVisible(false); setSearchResults(null); setSearchQuery(""); }} className="sidebar-btn" title="Đóng tìm kiếm">
                    <CloseIcon size={12} />
                  </button>
                </div>
              </div>
              <form onSubmit={runSearch} className="px-3 py-2 border-b border-[var(--border)]">
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm trong nội dung…"
                  className="w-full text-sm px-2 py-1.5 rounded-md bg-[var(--bg-tertiary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </form>
              <div className="flex-1 overflow-y-auto px-2 pb-4">
                {searchResults !== null && (
                  <div className="px-2 py-1 text-xs text-[var(--text-muted)]">{searchResults.length} kết quả</div>
                )}
                {(searchResults ?? []).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => openNote(r.id)}
                    className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[var(--bg-tertiary)]"
                  >
                    <div className="text-sm text-[var(--text-primary)] truncate">{r.name}</div>
                    <div
                      className="text-xs text-[var(--text-muted)] truncate [&_b]:text-[var(--text-primary)] [&_b]:font-semibold"
                      // ts_headline() only ever emits <b>…</b> around matched terms — restrict to that tag.
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(r.snippet, { ALLOWED_TAGS: ["b"] }) }}
                    />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <Sidebar
              vaultId={vaultId}
              vaultName={vault?.name ?? ""}
              index={index}
              activeNoteId={activeTabId}
              width={sidebarWidth}
              onWidthChange={setSidebarWidth}
              onFileSelect={openNote}
              onRefresh={refreshIndex}
              onNewNote={handleQuickNewNote}
            />
          ))}

        <main className="flex-1 flex flex-col relative">
          {activeTab ? (
            <>
              <NoteToolbar
                notePath={activeTab.path}
                backlinksVisible={backlinksVisible}
                collabVisible={collabVisible}
                collabPeerCount={collabPeers.length}
                bookmarked={isBookmarked(bookmarks, activeTab.noteId)}
                gitHistoryAvailable={gitHistoryAvailable}
                onToggleBacklinks={() => setBacklinksVisible((v) => !v)}
                onToggleCollab={() => setCollabVisible((v) => !v)}
                onExportPDF={handleExportPDF}
                onToggleBookmark={() => handleToggleBookmark(activeTab.noteId)}
                onPresent={() => setShowSlidePresentation(true)}
                onPublish={() => setShowPublishPreview(true)}
                onFileRecovery={() => setShowFileRecovery(true)}
                onGitHistory={() => setShowGitHistory(true)}
              />
              {pluginHost.commands.length > 0 && (
                <div className="flex gap-2 px-4 py-1.5 border-b border-[var(--border)] text-xs">
                  {pluginHost.commands.map((cmd) => (
                    <button
                      key={`${cmd.pluginDbId}:${cmd.id}`}
                      onClick={() => pluginHost.runCommand(cmd.pluginDbId, cmd.id)}
                      className="px-2 py-1 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)]"
                    >
                      {cmd.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex-1 flex min-h-0">
                <div className="flex-1 min-w-0 flex flex-col">
                  <SplitPane
                    direction="horizontal"
                    splitRatio={splitRatio}
                    onSplitRatioChange={setSplitRatio}
                    left={renderNoteBody(activeTab, viewMode, true)}
                    right={
                      splitTab
                        ? (
                          <div className="h-full flex flex-col">
                            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)] text-xs text-[var(--text-secondary)]">
                              <span className="truncate">{splitTab.path}</span>
                              <button onClick={handleCloseSplit} className="titlebar-btn" title="Close split">
                                <CloseIcon size={11} />
                              </button>
                            </div>
                            {renderNoteBody(splitTab, (splitTabId && fileViewModes[splitTabId]) || "live", false)}
                          </div>
                        )
                        : null
                    }
                  />
                </div>
                {outlineVisible && (
                  <div className="w-64 border-l border-[var(--border)] overflow-y-auto">
                    <OutlinePanel content={draft} onHeadingClick={handleHeadingClick} onClose={() => setOutlineVisible(false)} />
                  </div>
                )}
                {tagPaneVisible && (
                  <div className="w-64 border-l border-[var(--border)] overflow-y-auto">
                    <TagPane vaultId={vaultId} onTagClick={() => {}} onNoteSelect={openNote} visible={tagPaneVisible} />
                  </div>
                )}
                {bookmarksVisible && (
                  <div className="w-64 border-l border-[var(--border)] overflow-y-auto">
                    <BookmarksPanel
                      bookmarks={bookmarks}
                      index={index}
                      currentNoteId={activeTabId}
                      onNoteSelect={openNote}
                      onBookmarkRemove={handleToggleBookmark}
                      onClose={() => setBookmarksVisible(false)}
                    />
                  </div>
                )}
                {backlinksVisible && (
                  <div className="w-72 border-l border-[var(--border)] overflow-y-auto">
                    <BacklinksPanel
                      noteId={activeTab.noteId}
                      vaultId={vaultId}
                      onNoteOpen={openNote}
                      onClose={() => setBacklinksVisible(false)}
                    />
                  </div>
                )}
                {collabVisible && (
                  <CollabPanel
                    connected={collabConnected}
                    peers={collabPeers}
                    onClose={() => setCollabVisible(false)}
                  />
                )}
              </div>
              <StatusBar
                viewMode={viewMode}
                vaultName={vault?.name ?? ""}
                notePath={activeTab.path}
                content={draft}
                dirty={activeTab.content !== activeTab.savedContent}
                syncSummary={
                  syncConnections.length === 0
                    ? null
                    : syncConnections[0].lastSyncedAt
                    ? `sync: ${new Date(syncConnections[0].lastSyncedAt).toLocaleTimeString()}`
                    : "sync: chưa chạy"
                }
                onOpenSync={() => openSettings("sync")}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
              <span>Chọn hoặc tạo một note để bắt đầu</span>
              <button onClick={() => setQuickOpenVisible(true)} className="text-sm hover:text-[var(--text-primary)]">
                Quick open (⌘K)
              </button>
            </div>
          )}
        </main>
      </div>

      {quickOpenVisible && (
        <QuickOpen
          vaultId={vaultId}
          onSelect={(noteId) => openNote(noteId)}
          onClose={() => setQuickOpenVisible(false)}
        />
      )}

      {showCalendarView && (
        <CalendarView
          vaultId={vaultId}
          onFileSelect={openNoteByPath}
          onCreateDailyNote={handleCreateDailyNote}
          onClose={() => setShowCalendarView(false)}
        />
      )}

      {showFlashcards && (
        <FlashcardReview
          vaultId={vaultId}
          onFileSelect={openNoteByPath}
          onClose={() => setShowFlashcards(false)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          vaultId={vaultId}
          currentThemeId={currentThemeId}
          onThemeSelect={handleThemeSelect}
          hotkeys={hotkeyBindings}
          onHotkeysChange={setHotkeyBindings}
          editorSettings={editorSettings}
          onEditorSettingsChange={(patch) => setEditorSettingsState((prev) => ({ ...prev, ...patch }))}
          platform={platform}
          onOpenPlugins={() => setPluginManagerOpen(true)}
          onOpenSnippets={() => setShowCSSSnippets(true)}
          initialSection={settingsInitialSection}
          onClose={() => {
            setSettingsOpen(false);
            refreshSyncConnections();
          }}
        />
      )}

      {commandPaletteOpen && (
        <CommandPalette
          hotkeys={hotkeyBindings}
          platform={platform}
          recentActions={recentCommands}
          onExecute={executeCommand}
          onRecent={(action) => {
            saveRecentCommand(action);
            setRecentCommands(loadRecentCommands());
          }}
          onClose={() => setCommandPaletteOpen(false)}
        />
      )}

      {showCSSSnippets && (
        <CSSSnippets
          vaultId={vaultId}
          snippets={cssSnippets}
          onSnippetsChange={(snips) => { setCSSSnippets(snips); refreshSnippets(snips); }}
          onClose={() => setShowCSSSnippets(false)}
        />
      )}

      {pluginManagerOpen && (
        <PluginManager
          vaultId={vaultId}
          installed={pluginHost.installed}
          onChanged={pluginHost.refreshInstalled}
          onClose={() => setPluginManagerOpen(false)}
        />
      )}

      {showTrash && (
        <TrashPanel vaultId={vaultId} onClose={() => setShowTrash(false)} onRestored={refreshIndex} />
      )}

      {showInsights && (
        <VaultInsights
          vaultId={vaultId}
          index={index}
          onFileSelect={(noteId) => {
            openNote(noteId);
            setShowInsights(false);
          }}
          onClose={() => setShowInsights(false)}
        />
      )}

      {showTemplatePicker && (
        <TemplatePicker
          vaultId={vaultId}
          index={index}
          onInsert={(content, name) => handleCreateFromTemplate(content, name)}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

      {showAttachments && (
        <AttachmentManager
          vaultId={vaultId}
          onInsert={(markdownLink) => {
            if (editorViewRef.current) insertAtCursor(editorViewRef.current, markdownLink);
          }}
          onClose={() => setShowAttachments(false)}
          onOpenNote={(noteId) => {
            setShowAttachments(false);
            refreshIndex();
            openNote(noteId);
          }}
        />
      )}

      {showAudioRecorder && (
        <AudioRecorder
          vaultId={vaultId}
          onInsert={(markdownLink) => {
            if (editorViewRef.current) insertAtCursor(editorViewRef.current, markdownLink);
          }}
          onClose={() => setShowAudioRecorder(false)}
        />
      )}

      {showNoteComposer && (
        <NoteComposer
          vaultId={vaultId}
          index={index}
          currentNoteId={activeTabId}
          currentNoteName={activeTab?.name ?? null}
          currentFolderId={index?.notes.find((n) => n.id === activeTabId)?.folderId ?? null}
          currentContent={draft}
          onClose={() => setShowNoteComposer(false)}
          onNoteSelect={openNote}
          onContentChange={onDraftChange}
          onRefresh={refreshIndex}
        />
      )}

      {showSlidePresentation && activeTab && (
        <SlidePresentation content={draft} onClose={() => setShowSlidePresentation(false)} />
      )}

      {showPublishPreview && activeTab && (
        <PublishPreview
          vaultId={vaultId}
          index={index}
          content={draft}
          title={activeTab.name.replace(/\.(md|markdown)$/i, "")}
          currentNoteId={activeTabId}
          onClose={() => setShowPublishPreview(false)}
        />
      )}

      {showFileRecovery && activeTab && activeTabId && (
        <FileRecovery
          vaultId={vaultId}
          noteId={activeTabId}
          notePath={activeTab.path}
          onRestore={onDraftChange}
          onClose={() => setShowFileRecovery(false)}
          onOpenScrubber={() => {
            setShowFileRecovery(false);
            setShowTimeScrubber(true);
          }}
        />
      )}

      {showTimeScrubber && activeTab && activeTabId && (
        <TimeScrubber
          vaultId={vaultId}
          noteId={activeTabId}
          notePath={activeTab.path}
          currentContent={draft}
          onRestore={onDraftChange}
          onClose={() => setShowTimeScrubber(false)}
        />
      )}

      {showGitHistory && activeTab && activeTabId && (
        <NoteHistory
          vaultId={vaultId}
          noteId={activeTabId}
          notePath={activeTab.path}
          currentContent={draft}
          onRestore={onDraftChange}
          onClose={() => setShowGitHistory(false)}
        />
      )}

      {lightboxSrc && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "zoom-out",
          }}
          onClick={() => setLightboxSrc(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary runtime src (vault image / attachment URL), not a static asset */}
          <img
            src={lightboxSrc}
            alt=""
            style={{ maxWidth: "92vw", maxHeight: "92vh", objectFit: "contain", borderRadius: 6 }}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {wikilinkHover && (
        <HoverPreview
          target={wikilinkHover.target}
          vaultId={vaultId}
          index={index}
          position={{ x: wikilinkHover.x, y: wikilinkHover.y }}
          onDismiss={handleWikilinkLeave}
        />
      )}

      {/* Hidden sandboxed <iframe> per enabled plugin — see usePluginHost.ts */}
      <div ref={pluginHost.containerRef} style={{ display: "none" }} />

      {pluginHost.notices.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {pluginHost.notices.map((n) => (
            <div
              key={n.key}
              onClick={() => pluginHost.dismissNotice(n.key)}
              className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm cursor-pointer shadow-lg"
            >
              {n.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

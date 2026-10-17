"use client";

import { useEffect, useState, useCallback, useMemo, useRef, type ComponentType } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import type { EditorView } from "@codemirror/view";
import SplitPane from "@/components/SplitPane";
import { QuickOpen, BacklinksPanel, OutlinePanel, TagPane, CommandPalette, BookmarksPanel, ConflictBanner, VaultSearch } from "@noteriv/ui/panels";
import { t } from "@noteriv/ui/i18n";
import { useLocale } from "@noteriv/ui/i18n/react";
import { applyLanguage } from "@/lib/i18n";
import CollabPanel from "@/components/CollabPanel";
import VaultHeader from "@/components/VaultHeader";
import TabBar, { type TabBarTab } from "@/components/TabBar";
import Ribbon from "@/components/Ribbon";
import Sidebar from "@/components/Sidebar";
import NoteToolbar from "@/components/NoteToolbar";
import FrontmatterEditor from "@/components/FrontmatterEditor";
import StatusBar from "@/components/StatusBar";
import { PluginMirror } from "@noteriv/ui/plugins/sandbox";
import { createUntitledNote } from "@/lib/note-names";
import { createWebVaultAdapter } from "@/lib/webVaultAdapter";
import HoverPreview from "@/components/HoverPreview";
import { setImageLightboxHandler } from "@noteriv/ui/markdown/renderers/images";
import { setPostProcessorRunner } from "@noteriv/ui/markdown/vault-hooks";
import { CloseIcon } from "@/components/icons";
import { toggleBookmark, isBookmarked } from "@noteriv/core/bookmark-utils";
import { usePluginHost } from "@/lib/plugin-sandbox/usePluginHost";
import { webCorePluginConfig } from "@/lib/core-plugins";
import {
  CorePluginRibbonButtons,
  CorePluginStatusItems,
  CorePluginNoteToolbarButtons,
  CorePluginFileView,
  matchFileView,
  CorePluginAttachmentViewer,
  matchAttachmentViewer,
  CorePluginSidePanels,
  CorePluginViewOverlay,
  useCorePluginHost,
  useCorePluginHotkeys,
  useCorePlugins,
} from "@noteriv/ui/plugins";
import type { EditorApi } from "@noteriv/plugin-api";
import type { EditorSnapshot } from "@noteriv/ui/plugins/sandbox";
import { startCollab, type CollabSession, type CollabPeer } from "@/lib/collab";
import {
  webApi,
  ApiError,
  type ApiVault,
  type VaultIndex,
  type ApiSyncConnection,
  type ViewMode,
} from "@/lib/webApi";
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
import { wrapSelection, insertLink, insertImage, insertBlockquote, insertCodeBlock, insertTaskList, insertTable, insertHorizontalRule, insertAtCursor, runFormattingAction } from "@noteriv/ui/editor/editor-commands";
import { DEFAULT_EDITOR_SETTINGS } from "@/lib/settings";

const RECENT_COMMANDS_KEY = "noteriv-recent-commands";

function loadRecentCommands(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_COMMANDS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveRecentCommand(action: string) {
  try {
    const prev = loadRecentCommands().filter((a) => a !== action);
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify([action, ...prev].slice(0, 5)));
  } catch {
    // localStorage unavailable (private window etc.) — recent list is a convenience, not load-bearing
  }
}

const PublishPreview = dynamic(() => import("@/components/PublishPreview"), { ssr: false });

// The editor (CodeMirror with its language parsers) is the heaviest part of the page: it loads when a note opens, and
// is prefetched once the vault has loaded and the browser is idle (see the effect below the index load).
type EditorModule = typeof import("@noteriv/ui/editor");
/** Set once the editor module has loaded. */
let editorModule: EditorModule | null = null;
const loadEditor = () => import("@noteriv/ui/editor").then((m) => (editorModule = m));
/**
 * A component of the editor module. Through `dynamic()` it suspends on its first mount even when the module is already
 * here, and React then holds the reveal back for ~300 ms; so once the module has loaded (prefetched), it is rendered
 * directly. The choice is made once per mount, so a mounted editor never swaps implementation.
 */
function editorPart<P extends object>(pick: (m: EditorModule) => ComponentType<P>) {
  const Lazy = dynamic(() => loadEditor().then(pick), { ssr: false }) as ComponentType<P>;
  return function EditorPart(props: P) {
    const [Part] = useState(() => (editorModule ? pick(editorModule) : Lazy));
    return <Part {...props} />;
  };
}
const Editor = editorPart((m) => m.Editor);
const SourceEditor = editorPart((m) => m.SourceEditor);
const ReadOnlyView = editorPart((m) => m.ReadOnlyView);
const FormattingToolbar = editorPart((m) => m.FormattingToolbar);

// Dialogs opened on demand.
const PluginManager = dynamic(() => import("@/components/PluginManager"), { ssr: false });
const CSSSnippets = dynamic(() => import("@/components/CSSSnippets"), { ssr: false });
const SettingsModal = dynamic(() => import("@/components/SettingsModal"), { ssr: false });
const ImportVault = dynamic(() => import("@/components/ImportVault"), { ssr: false });
const DiagnosticsModal = dynamic(() => import("@/components/DiagnosticsModal"), { ssr: false });
const CreateVaultFromGithub = dynamic(() => import("@/components/sync/CreateVaultFromGithub"), { ssr: false });
const TrashPanel = dynamic(() => import("@/components/TrashPanel"), { ssr: false });
const AttachmentManager = dynamic(() => import("@/components/AttachmentManager"), { ssr: false });
const FileRecovery = dynamic(() => import("@/components/FileRecovery"), { ssr: false });
const PdfPreviewModal = dynamic(() => import("@/components/PdfPreviewModal"), { ssr: false });
/** PDF export (markdown → HTML, the PDF service): loaded when used. */
const loadPdfExport = () => import("@/lib/pdf-export");

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
  useLocale(); // re-render on a language change (labels passed to shared panels)
  const params = useParams<{ vaultId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const vaultId = params.vaultId;
  const vaultAdapter = useMemo(() => createWebVaultAdapter(vaultId), [vaultId]);
  const listNotes = useCallback(() => vaultAdapter.listNotes(), [vaultAdapter]);

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
  /** The workspace state as the server has it (loaded, or last sent): an unchanged state is not sent again. */
  const savedWorkspaceRef = useRef<string | null>(null);
  // State twin of workspaceLoadedRef: the `?note=` effect must wait for the
  // saved-tabs restore to finish, otherwise the restore's setTabs overwrites
  // the tab `?note=` just opened.
  const restoreIncompleteRef = useRef(false);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  const [pageNotice, setPageNotice] = useState<string | null>(null);
  const workspaceSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const [backlinksVisible, setBacklinksVisible] = useState(false);
  const [outlineVisible, setOutlineVisible] = useState(false);
  const [tagPaneVisible, setTagPaneVisible] = useState(false);
  const [frontmatterCollapsed, setFrontmatterCollapsed] = useState(true);
  /** The vault search box (shared VaultSearch, as on desktop). */
  const [searchVisible, setSearchVisible] = useState(false);
  /** A line to jump to once the note it belongs to is open in the editor (from a search result). */
  const pendingJumpRef = useRef<{ noteId: string; line: number } | null>(null);
  /** Asks the sidebar to put a just-created note into rename mode. */
  const [sidebarRenameRequest, setSidebarRenameRequest] = useState<{ id: string; name: string; nonce: number } | null>(null);
  const clearSidebarRenameRequest = useCallback(() => setSidebarRenameRequest(null), []);
  const [pluginManagerOpen, setPluginManagerOpen] = useState(false);
  const [collabVisible, setCollabVisible] = useState(false);
  const [collabConnected, setCollabConnected] = useState(false);
  const [collabPeers, setCollabPeers] = useState<CollabPeer[]>([]);
  const [displayName, setDisplayName] = useState<string | undefined>(undefined);
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
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [hotkeyBindings, setHotkeyBindings] = useState<HotkeyBinding[]>(DEFAULT_HOTKEYS);
  const [editorSettings, setEditorSettingsState] = useState(DEFAULT_EDITOR_SETTINGS);
  const [platform, setPlatform] = useState("web");
  const [syncConnections, setSyncConnections] = useState<ApiSyncConnection[]>([]);
  const preferencesLoadedRef = useRef(false);
  /** Preferences as the server has them (loaded, or last sent): unchanged ones are not sent again. */
  const savedPreferencesRef = useRef<string | null>(null);
  const preferencesSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Phase C — Trash/Bookmarks/Vault Insights/Templates/Note Composer/hover preview
  // (docs/plans/2026-10-13-noteriv-web-full-parity.md Phase C).
  const [showTrash, setShowTrash] = useState(false);
  const [showNewFromGithub, setShowNewFromGithub] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<{ blob: Blob; filename: string } | null>(null);
  const [zenMode, setZenMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  // key = `${pluginDbId}:${panelId}` of the plugin sidebar panel shown in place of the file tree
  const [activePluginPanel, setActivePluginPanel] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<"current" | "new" | null>(null);
  const [bookmarksVisible, setBookmarksVisible] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const bookmarkedNotes = useMemo(
    () =>
      bookmarks
        .map((id) => index?.notes.find((n) => n.id === id))
        .filter((n): n is NonNullable<typeof n> => !!n)
        .map((n) => ({ id: n.id, name: n.name, path: n.path })),
    [bookmarks, index]
  );
  const [showAttachments, setShowAttachments] = useState(false);
  /** An attachment shown by a core plugin's viewer (the PDF viewer), over the page. */
  const [attachmentView, setAttachmentView] = useState<{ target: string; name: string } | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [showPublishPreview, setShowPublishPreview] = useState(false);
  // D5/D6 (docs/plans/2026-10-13-noteriv-web-full-parity.md Phase D nhóm 4).
  const [showFileRecovery, setShowFileRecovery] = useState(false);
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
    emitPluginEvent("file-save", tabs.find((t) => t.noteId === noteId)?.path ?? null);
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

  // Once the vault is on screen, fetch the editor while the browser is idle, so opening a note does not wait for it.
  const vaultShown = index !== null;
  useEffect(() => {
    if (!vaultShown) return;
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }).requestIdleCallback;
    const prefetch = () => void loadEditor().catch(() => {});
    if (idle) {
      const id = idle(prefetch, { timeout: 3000 });
      return () => (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
    }
    const t = setTimeout(prefetch, 1500);
    return () => clearTimeout(t);
  }, [vaultShown]);

  const editorBridge: EditorApi = {
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
      getCursorPosition: () => {
        const view = editorViewRef.current;
        if (!view) return { line: 0, ch: 0 };
        const head = view.state.selection.main.head;
        const line = view.state.doc.lineAt(head);
        return { line: line.number - 1, ch: head - line.from };
      },
      setCursor: ({ line, ch }) => {
        const view = editorViewRef.current;
        if (!view) return;
        const docLine = view.state.doc.line(Math.min(Math.max(line + 1, 1), view.state.doc.lines));
        view.dispatch({ selection: { anchor: docLine.from + Math.min(Math.max(ch, 0), docLine.length) }, scrollIntoView: true });
        view.focus();
      },
  };
  /**
   * `workspace.openFile` for both plugin tiers. A note the plugin has just created is not in `index` yet (the refresh
   * is still in flight), so a miss asks the adapter before giving up.
   */
  const openPluginPath = async (path: string) => {
    const note = index?.notes.find((n) => n.path === path) ?? (await vaultAdapter.listNotes()).find((n) => n.path === path);
    if (!note) return false;
    openNote(note.id);
    return true;
  };
  const pluginHost = usePluginHost(vaultId, vaultAdapter, editorBridge, refreshIndex, openPluginPath);

  // Core plugins (Plugin API v1, trusted tier): loaded in-page by dynamic import, state in vault settings.
  const activePathRef = useRef<string | null>(null);
  activePathRef.current = activeTab?.path ?? null;
  const corePluginConfig = useMemo(() => webCorePluginConfig(vaultAdapter), [vaultAdapter]);
  const corePluginHost = useCorePluginHost(corePluginConfig, {
    editor: editorBridge,
    getCurrentFile: () => activePathRef.current,
    // A core plugin opening a note (the PDF viewer's export…) brings the editor forward.
    openFile: async (path) => {
      const ok = await openPluginPath(path);
      if (ok) {
        setShowAttachments(false);
        setAttachmentView(null);
      }
      return ok;
    },
    onVaultChanged: refreshIndex,
  });
  const corePlugins = useCorePlugins(corePluginHost.host);
  useCorePluginHotkeys(corePlugins.contributions.commands);
  // Turning a core plugin on/off is saved per vault; tell the other open tabs of this vault so they follow without a reload.
  const corePluginChannelRef = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    const host = corePluginHost.host;
    if (!host || typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(`noteriv-core-plugins:${vaultId}`);
    channel.onmessage = (e: MessageEvent<{ id?: unknown; enabled?: unknown }>) => {
      if (typeof e.data?.id === "string" && typeof e.data.enabled === "boolean") {
        void host.registry.applyExternalChange(e.data.id, e.data.enabled);
      }
    };
    corePluginChannelRef.current = channel;
    return () => {
      channel.close();
      if (corePluginChannelRef.current === channel) corePluginChannelRef.current = null;
    };
  }, [corePluginHost.host, vaultId]);
  const toggleCorePlugin = useCallback(
    async (id: string, enabled: boolean) => {
      await corePlugins.setEnabled(id, enabled);
      corePluginChannelRef.current?.postMessage({ id, enabled });
    },
    [corePlugins]
  );

  // Core plugins' markdown post-processors run over each rendered piece of a note.
  useEffect(() => {
    const host = corePluginHost.host;
    if (!host) return;
    setPostProcessorRunner((el, ctx) => host.runPostProcessors(el, ctx));
    return () => setPostProcessorRunner(null);
  }, [corePluginHost.host]);
  // File Recovery (core) links to the Time scrubber while the Note history plugin is on.
  const scrubberCommand = corePlugins.contributions.commands.find((c) => c.key === "note-history:scrubber");
  /** Both plugin tiers receive the same app events. */
  const emitPluginEvent = (event: Parameters<typeof pluginHost.emitEvent>[0], ...args: unknown[]) => {
    pluginHost.emitEvent(event, ...args);
    corePluginHost.host?.emit(event, ...args);
  };

  // --- Plugin sandbox feeds (sync editor snapshot + desktop-style events) ---
  // The sandbox's api.editor.* are synchronous like desktop's, so we push a
  // snapshot instead of answering RPC calls. See public/plugin-sandbox.html.
  const activePath = activeTab?.path ?? null;
  const buildEditorSnapshot = useCallback((): EditorSnapshot => {
    const view = editorViewRef.current;
    let selection = "";
    let cursor = { line: 0, ch: 0 };
    if (view) {
      const sel = view.state.selection.main;
      selection = view.state.sliceDoc(sel.from, sel.to);
      const line = view.state.doc.lineAt(sel.head);
      cursor = { line: line.number - 1, ch: sel.head - line.from };
    }
    return { content: activePath ? draftRef.current : null, selection, cursor, currentFile: activePath };
  }, [activePath]);

  useEffect(() => {
    pluginHost.syncEditorState(buildEditorSnapshot());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, activePath, editorViewVersion, buildEditorSnapshot]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onSelection = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        pluginHost.syncEditorState(buildEditorSnapshot());
      }, 150);
    };
    document.addEventListener("selectionchange", onSelection);
    return () => {
      document.removeEventListener("selectionchange", onSelection);
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildEditorSnapshot]);

  const prevDraftRef = useRef<{ tabId: string | null; content: string }>({ tabId: null, content: "" });
  useEffect(() => {
    const prev = prevDraftRef.current;
    if (prev.tabId === activeTabId && prev.content !== draft) emitPluginEvent("editor-change", draft);
    prevDraftRef.current = { tabId: activeTabId, content: draft };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, activeTabId]);

  useEffect(() => {
    if (activePath) emitPluginEvent("file-open", activePath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTabId]);

  const prevNotePathsRef = useRef<Map<string, string> | null>(null);
  useEffect(() => {
    if (!index) return;
    const current = new Map(index.notes.map((n) => [n.id, n.path]));
    const prev = prevNotePathsRef.current;
    prevNotePathsRef.current = current;
    if (!prev) return; // first load isn't a change
    let changed = false;
    for (const [id, path] of current) {
      if (!prev.has(id)) {
        emitPluginEvent("file-create", path);
        changed = true;
      }
    }
    for (const [id, path] of prev) {
      if (!current.has(id)) {
        emitPluginEvent("file-delete", path);
        changed = true;
      }
    }
    if (changed) emitPluginEvent("vault-change");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Search results open a note at a line: move the cursor there once that note's editor is ready.
  useEffect(() => {
    const pending = pendingJumpRef.current;
    const view = editorViewRef.current;
    if (!pending || pending.noteId !== activeTabId || !view) return;
    pendingJumpRef.current = null;
    const line = view.state.doc.line(Math.min(Math.max(pending.line, 1), view.state.doc.lines));
    view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
    view.focus();
  }, [activeTabId, editorViewVersion, draft]);

  const openNote = useCallback(
    async (noteId: string) => {
      setSearchVisible(false);

      const alreadyOpen = tabs.some((t) => t.noteId === noteId);
      if (alreadyOpen) {
        setActiveTabId(noteId);
        return;
      }
      let note;
      try {
        note = await webApi.notes.get(vaultId, noteId);
      } catch (err) {
        setPageNotice(
          err instanceof ApiError && err.status === 404
            ? "Note không còn tồn tại (có thể đã bị xoá hoặc nằm trong Trash)."
            : "Không mở được note, vui lòng thử lại."
        );
        return;
      }
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

    // A superseded run (StrictMode double-effect, vaultId change) must not
    // apply its results: a late setActiveTabId would clobber a tab that
    // `?note=` already opened after the first run signalled ready.
    let cancelled = false;
    webApi.workspace
      .getState(vaultId)
      .then(async (state) => {
        // Tabs to restore will show an editor: fetch its chunk alongside the notes, not after they render.
        if (state.openTabs.length > 0) void loadEditor().catch(() => {});
        // Only a 404 means the note is really gone and its tab should be
        // dropped. Any other failure (network blip, 5xx) leaves the restore
        // incomplete: those tabs are skipped for this session, but we must not
        // persist the shrunken list over the server's good copy.
        let transientFailure = false;
        const inlined = state.notes ?? {};
        const missing = new Set(state.missingNoteIds ?? []);
        const notes = await Promise.all(
          state.openTabs.map((t) =>
            inlined[t.noteId]
              ? Promise.resolve<OpenTab>({
                  noteId: inlined[t.noteId].id,
                  path: inlined[t.noteId].path,
                  name: inlined[t.noteId].name,
                  content: inlined[t.noteId].content,
                  savedContent: inlined[t.noteId].content,
                })
              : missing.has(t.noteId)
              ? Promise.resolve(null)
              : webApi.notes
              .get(vaultId, t.noteId)
              .then((note): OpenTab => ({ noteId: note.id, path: note.path, name: note.name, content: note.content, savedContent: note.content }))
              .catch((err) => {
                if (!(err instanceof ApiError && err.status === 404)) transientFailure = true;
                return null;
              })
          )
        );
        if (cancelled) return;
        const restoredTabs = notes.filter((t): t is OpenTab => t !== null);
        if (transientFailure) {
          restoreIncompleteRef.current = true;
          setPageNotice("Không khôi phục được một số tab do lỗi kết nối; tải lại trang để thử lại.");
        }
        savedWorkspaceRef.current = JSON.stringify({
          openTabs: state.openTabs.map((t) => ({ noteId: t.noteId, path: t.path, name: t.name })),
          activeTabId: state.activeTabId ?? null,
          pinnedTabIds: state.pinnedTabIds,
          fileViewModes: state.fileViewModes,
        });
        setTabs(restoredTabs);
        // Prune ids of dropped tabs so dead pins/view-modes don't linger server-side.
        const liveIds = new Set(restoredTabs.map((t) => t.noteId));
        setPinnedTabIds(new Set(state.pinnedTabIds.filter((id) => liveIds.has(id))));
        setFileViewModes(Object.fromEntries(Object.entries(state.fileViewModes).filter(([id]) => liveIds.has(id))));
        setActiveTabId(
          state.activeTabId && restoredTabs.some((t) => t.noteId === state.activeTabId)
            ? state.activeTabId
            : restoredTabs[0]?.noteId ?? null
        );
      })
      .catch(() => {
        // getState itself failed: never persist an empty workspace over the saved one.
        restoreIncompleteRef.current = true;
      })
      .finally(() => {
        if (cancelled) return;
        workspaceLoadedRef.current = !restoreIncompleteRef.current;
        setWorkspaceReady(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultId, router, refreshIndex]);

  // Persist workspace state (shape only — noteId/path/name, not content;
  // note content already autosaves via scheduleSave) whenever it changes,
  // debounced the same way note autosave is.
  useEffect(() => {
    if (!workspaceLoadedRef.current) return;
    const state = {
      openTabs: tabs.map((t) => ({ noteId: t.noteId, path: t.path, name: t.name })),
      activeTabId: activeTabId ?? null,
      pinnedTabIds: Array.from(pinnedTabIds),
      fileViewModes,
    };
    const serialized = JSON.stringify(state);
    if (serialized === savedWorkspaceRef.current) return;
    if (workspaceSaveTimer.current) clearTimeout(workspaceSaveTimer.current);
    workspaceSaveTimer.current = setTimeout(() => {
      savedWorkspaceRef.current = serialized;
      webApi.workspace.updateState(vaultId, state).catch(() => undefined);
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
        const bindings = mergeHotkeys(prefs.hotkeys);
        const settings = { ...DEFAULT_EDITOR_SETTINGS, ...prefs.editorSettings };
        applyLanguage(settings.language);
        savedPreferencesRef.current = JSON.stringify({ hotkeys: hotkeysToOverrideMap(bindings), editorSettings: settings });
        setHotkeyBindings(bindings);
        setEditorSettingsState(settings);
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

  // Accent override (empty = whatever the active theme defines). Re-applied after theme changes
  // because applyTheme rewrites --accent.
  useEffect(() => {
    const root = document.documentElement;
    if (editorSettings.accentColor) root.style.setProperty("--accent", editorSettings.accentColor);
    else if (preferencesLoadedRef.current) root.style.removeProperty("--accent");
  }, [editorSettings.accentColor, currentThemeId]);

  // Collapse the sidebar on narrow windows (once per crossing, so the user can still reopen it).
  useEffect(() => {
    if (!editorSettings.autoCollapseSidebar) return;
    const query = window.matchMedia("(max-width: 800px)");
    const apply = (narrow: boolean) => narrow && setSidebarCollapsed(true);
    apply(query.matches);
    const onChange = (e: MediaQueryListEvent) => apply(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [editorSettings.autoCollapseSidebar]);

  // Esc leaves zen mode.
  useEffect(() => {
    if (!zenMode) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZenMode(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zenMode]);

  // Persist hotkey/editor-setting changes, debounced like workspace state.
  useEffect(() => {
    if (!preferencesLoadedRef.current) return;
    const prefs = { hotkeys: hotkeysToOverrideMap(hotkeyBindings), editorSettings };
    const serialized = JSON.stringify(prefs);
    if (serialized === savedPreferencesRef.current) return;
    if (preferencesSaveTimer.current) clearTimeout(preferencesSaveTimer.current);
    preferencesSaveTimer.current = setTimeout(() => {
      savedPreferencesRef.current = serialized;
      webApi.preferences.update(prefs).catch(() => undefined);
    }, WORKSPACE_SAVE_DEBOUNCE_MS);
  }, [hotkeyBindings, editorSettings]);

  const refreshSyncConnections = useCallback(() => {
    webApi.sync.list(vaultId).then(setSyncConnections).catch(() => undefined);
  }, [vaultId]);

  useEffect(() => {
    refreshSyncConnections();
    // Keep the status-bar sync entry fresh (auto-sync / sync-on-save finish in the background).
    const t = setInterval(refreshSyncConnections, 60_000);
    return () => clearInterval(t);
  }, [refreshSyncConnections]);

  // "Pull on open": once per vault visit, ask the server to queue a sync for
  // connections that opted in (it skips ones that just ran or need attention).
  const pullOnOpenDoneRef = useRef<string | null>(null);
  useEffect(() => {
    if (pullOnOpenDoneRef.current === vaultId) return;
    if (!syncConnections.some((c) => c.pullOnOpen)) return;
    pullOnOpenDoneRef.current = vaultId;
    webApi.sync.pullOnOpen(vaultId).then(() => setTimeout(refreshSyncConnections, 5000)).catch(() => undefined);
  }, [vaultId, syncConnections, refreshSyncConnections]);

  const syncSummaryText =
    syncConnections.length === 0
      ? "Git: chưa kết nối"
      : syncConnections.some((c) => c.lastSyncStatus?.status === "conflict")
      ? "sync: xung đột"
      : syncConnections.some((c) => c.lastSyncStatus?.status === "error")
      ? "sync: lỗi"
      : syncConnections[0].lastSyncedAt
      ? `sync: ${new Date(syncConnections[0].lastSyncedAt).toLocaleTimeString()}`
      : "sync: chưa chạy";
  const syncTone: "muted" | "warn" | "error" =
    syncConnections.some((c) => c.lastSyncStatus?.status === "error" || c.lastSyncStatus?.status === "conflict")
      ? "error"
      : syncConnections.length === 0
      ? "warn"
      : "muted";

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
        break;
      case "toggleBacklinks":
        setBacklinksVisible((v) => !v);
        break;
      case "toggleCollab":
        setCollabVisible((v) => !v);
        break;
      case "previewPDF":
        handlePreviewPDF();
        break;
      case "exportPDF":
        handleExportPDF();
        break;
      case "printNote":
        handlePrint();
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
      case "syncSettings":
        openSettings("sync");
        break;
      case "importVault":
        setImportMode("current");
        break;
      case "importNewVault":
        setImportMode("new");
        break;
      case "newVaultFromGithub":
        setShowNewFromGithub(true);
        break;
      case "randomNote":
        handleRandomNote();
        break;
      case "diagnostics":
        setShowDiagnostics(true);
        break;
      case "devToolsHint":
        // A web page cannot open the browser's DevTools itself.
        setPageNotice("Nhấn F12 (hoặc Ctrl+Shift+I) để mở công cụ nhà phát triển của trình duyệt.");
        break;
      case "reloadApp":
        handleReloadApp();
        break;
      case "zenMode":
        setZenMode((v) => !v);
        break;
      case "focusMode":
        setFocusMode((v) => !v);
        break;
      case "exportVault":
        window.location.href = webApi.vaultTransfer.exportUrl(vaultId);
        break;
      case "themePicker":
        openSettings("appearance");
        break;
    }
  }

  // Global hotkey dispatch — replaces the old Cmd/Ctrl+K-only listener below
  // with a lookup against the full (default-merged-with-user-overrides)
  // binding list, so Shortcuts-tab rebinds actually take effect everywhere,
  // not just in Quick Open.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // F1 always opens the palette: Ctrl+Shift+P is taken by the browser on some platforms.
      if (e.key === "F1" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
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

  function openNoteByPath(path: string) {
    const note = index?.notes.find((n) => n.path === path);
    if (note) openNote(note.id);
  }

  const pdfOptions = () => ({
    columnLayout: editorSettings.pdfColumnLayout,
    chessboardWidthPercent: editorSettings.pdfChessboardWidth,
  });

  // Download a real PDF (rendered by the server); progress and failures are reported in the page notice.
  async function handleExportPDF() {
    if (!activeTab) return;
    setPageNotice("Đang tạo PDF…");
    try {
      await (await loadPdfExport()).downloadPdf(vaultId, activeTab.noteId, draft, activeTab.name, pdfOptions());
      setPageNotice("Đã tải PDF.");
      setTimeout(() => setPageNotice((n) => (n === "Đã tải PDF." ? null : n)), 3000);
    } catch (err) {
      const message = (err as { body?: { message?: string } } | null)?.body?.message;
      setPageNotice(message ?? "Không tạo được PDF. Bạn có thể dùng File → In… rồi chọn Save as PDF.");
    }
  }

  // Render the same PDF as "Tải PDF" but show it in a modal first; the user downloads from there.
  async function handlePreviewPDF() {
    if (!activeTab) return;
    setPageNotice("Đang tạo bản xem trước…");
    try {
      setPdfPreview(await (await loadPdfExport()).renderPdf(vaultId, activeTab.noteId, draft, activeTab.name, pdfOptions()));
      setPageNotice(null);
    } catch (err) {
      const message = (err as { body?: { message?: string } } | null)?.body?.message;
      setPageNotice(message ?? "Không tạo được bản xem trước PDF.");
    }
  }

  async function handlePrint() {
    if (!activeTab) return;
    await (await loadPdfExport()).exportToPDF(draft, activeTab.name, pdfOptions());
  }

  // Developer > Reload: persist every edited tab first so reloading never drops unsaved text.
  async function handleReloadApp() {
    await Promise.all(tabs.filter((t) => t.content !== t.savedContent).map((t) => persistNote(t.noteId, t.content).catch(() => undefined)));
    window.location.reload();
  }


  function handleRandomNote() {
    const candidates = (index?.notes ?? []).filter((n) => n.id !== activeTabId);
    if (candidates.length === 0) return;
    openNote(candidates[Math.floor(Math.random() * candidates.length)].id);
  }

  // Keep open tabs' name/path in step with renames and moves done in the file tree.
  useEffect(() => {
    if (!index) return;
    const byId = new Map(index.notes.map((n) => [n.id, n]));
    setTabs((prev) => {
      let changed = false;
      const next = prev.map((t) => {
        const n = byId.get(t.noteId);
        if (n && (n.path !== t.path || n.name !== t.name)) {
          changed = true;
          return { ...t, path: n.path, name: n.name };
        }
        return t;
      });
      return changed ? next : prev;
    });
  }, [index]);

  async function handleQuickNewNote() {
    try {
      // Picks "Untitled 2.md" etc. when the name is taken; a plain "Untitled.md" used to 409 silently.
      const note = await createUntitledNote(vaultId, null, index?.notes ?? []);
      refreshIndex();
      openNote(note.id);
      setSidebarRenameRequest({ id: note.id, name: note.name.replace(/\.md$/i, ""), nonce: Date.now() });
    } catch {
      setPageNotice("Không tạo được note mới. Kiểm tra kết nối hoặc quyền ghi vault rồi thử lại.");
    }
  }

  function handleHeadingClick(line: number) {
    const view = editorViewRef.current;
    if (!view) return;
    const lineInfo = view.state.doc.line(Math.min(Math.max(line, 1), view.state.doc.lines));
    view.dispatch({ selection: { anchor: lineInfo.from }, scrollIntoView: true });
    view.focus();
  }

  // Open the note requested via ?note=<id> (a link into a note of this vault)
  // Waits for the saved-tabs restore (workspaceReady) so the note is merged
  // into the restored tab list instead of being overwritten by it.
  useEffect(() => {
    if (!workspaceReady) return;
    const noteId = searchParams.get("note");
    if (noteId && noteId !== activeTabId) {
      openNote(noteId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, workspaceReady]);

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

  const tabBarTabs: TabBarTab[] = tabs.map((t) => ({
    noteId: t.noteId,
    path: t.path,
    name: t.name,
    isDirty: t.content !== t.savedContent,
  }));

  // Sync conflict copies ("<name> (conflict …).md"): compare with the original and resolve from the banner.
  const findNoteByPath = async (path: string) =>
    index?.notes.find((n) => n.path === path) ?? (await vaultAdapter.listNotes()).find((n) => n.path === path) ?? null;
  const loadConflictOriginal = useCallback(
    async (path: string) => {
      const ref = index?.notes.find((n) => n.path === path) ?? (await vaultAdapter.listNotes()).find((n) => n.path === path);
      return ref ? vaultAdapter.readNote(ref.id) : null;
    },
    [index, vaultAdapter]
  );
  async function discardConflictCopy(copyId: string) {
    clearTimeout(saveTimers.current[copyId]);
    delete saveTimers.current[copyId];
    await vaultAdapter.deleteNote(copyId); // to the trash, restorable
    closeTab(copyId);
    refreshIndex();
  }
  async function useConflictCopy(copy: OpenTab, originalPath: string) {
    const original = await findNoteByPath(originalPath);
    if (!original) return;
    await vaultAdapter.writeNote(original.id, copy.content);
    setTabs((prev) => prev.map((t) => (t.noteId === original.id ? { ...t, content: copy.content, savedContent: copy.content } : t)));
    await discardConflictCopy(copy.noteId);
    openNote(original.id);
  }

  function renderNoteBody(tab: OpenTab, mode: ViewMode, isMain: boolean) {
    const content = tab.content;
    const onChange = isMain ? onDraftChange : onSplitDraftChange;
    const onReady = isMain
      ? (view: EditorView) => {
          editorViewRef.current = view;
          setEditorViewVersion((v) => v + 1);
        }
      : undefined;

    // A core plugin's file view (Board…) replaces the editor, except in source mode where the file stays editable as text.
    const fileView = mode !== "source" ? matchFileView(corePlugins.contributions.fileViews, tab.path, content) : undefined;
    if (fileView) {
      return (
        <div className="flex-1 min-h-0" key={`${fileView.key}:${tab.noteId}`}>
          <CorePluginFileView view={fileView} path={tab.path} content={content} onChange={onChange} />
        </div>
      );
    }

    return (
      <div className="flex-1 min-h-0 flex flex-col">
        <ConflictBanner
          path={tab.path}
          content={content}
          loadOriginal={loadConflictOriginal}
          onKeepOriginal={() => discardConflictCopy(tab.noteId)}
          onUseThisVersion={(originalPath) => useConflictCopy(tab, originalPath)}
        />
        {mode !== "source" && (
          <FrontmatterEditor
            content={content}
            onChange={onChange}
            collapsed={frontmatterCollapsed}
            onToggleCollapse={() => setFrontmatterCollapsed((v) => !v)}
          />
        )}
        {isMain && mode === "live" && (
          <FormattingToolbar key={editorViewVersion} onAction={(action) => runFormattingAction(editorViewRef.current, action)} />
        )}
        <div className="flex-1 min-h-0">
          {mode === "source" ? (
            <SourceEditor
              content={content}
              onChange={onChange}
              adapter={vaultAdapter}
              onViewReady={onReady}
              prefs={{ spellCheck: editorSettings.spellCheck, tabSize: editorSettings.tabSize }}
            />
          ) : mode === "view" ? (
            <ReadOnlyView content={content} onChange={onChange} />
          ) : (
            <Editor
              content={content}
              onChange={onChange}
              adapter={vaultAdapter}
              vimMode={editorSettings.vimModeEnabled}
              prefs={{ spellCheck: editorSettings.spellCheck, tabSize: editorSettings.tabSize }}
              focusMode={focusMode}
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
      {!zenMode && (
        <VaultHeader
          vault={vault}
          vaults={allVaults}
          activeNotePath={activeTab?.path ?? null}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          showViewModes={!!activeTab}
          hotkeys={hotkeyBindings}
          platform={platform}
          onMenuAction={executeCommand}
          pluginCommands={corePlugins.contributions.commands}
          onImportNewVault={() => setImportMode("new")}
          onNewFromGithub={() => setShowNewFromGithub(true)}
          onVaultsChanged={() => {
            webApi.vaults.list().then(setAllVaults).catch(() => undefined);
            webApi.vaults.get(vaultId).then(setVault).catch(() => undefined);
          }}
        />
      )}

      {tabs.length > 0 && !zenMode && (
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
        {!zenMode && (
          <Ribbon
            onQuickOpen={() => setQuickOpenVisible(true)}
            onNewNote={handleQuickNewNote}
            onCommandPalette={() => setCommandPaletteOpen(true)}
            onSearch={() => setSearchVisible(true)}
            onSettings={() => openSettings("general")}
            onOutline={() => setOutlineVisible((v) => !v)}
            onTags={() => setTagPaneVisible((v) => !v)}
            onTrash={() => setShowTrash(true)}
            onBookmarks={() => setBookmarksVisible((v) => !v)}
            onAttachments={() => setShowAttachments(true)}
            onSync={() => openSettings("sync")}
            onPlugins={() => setPluginManagerOpen(true)}
            onThemes={() => openSettings("appearance")}
            onSnippets={() => setShowCSSSnippets(true)}
            pluginPanels={pluginHost.panels
              .filter((p) => p.kind === "sidebar")
              .map((p) => ({ key: `${p.pluginDbId}:${p.id}`, title: p.title, icon: p.icon }))}
            coreRibbon={
              <CorePluginRibbonButtons
                icons={corePlugins.contributions.ribbonIcons}
                panels={corePlugins.contributions.sidebarPanels}
                openPanels={corePluginHost.openPanels}
                onTogglePanel={corePluginHost.togglePanel}
              />
            }
            activePluginPanel={activePluginPanel}
            onPluginPanel={(key) => {
              setActivePluginPanel((cur) => (cur === key ? null : key));
              setSidebarCollapsed(false);
            }}
            syncAttention={syncConnections.some((c) => c.lastSyncStatus?.status === "error" || c.lastSyncStatus?.status === "conflict")}
            outlineActive={outlineVisible}
            tagsActive={tagPaneVisible}
            bookmarksActive={bookmarksVisible}
          />
        )}

        {!sidebarCollapsed && !zenMode &&
          (activePluginPanel && pluginHost.panels.some((p) => `${p.pluginDbId}:${p.id}` === activePluginPanel && p.kind === "sidebar") ? (
            (() => {
              const panel = pluginHost.panels.find((p) => `${p.pluginDbId}:${p.id}` === activePluginPanel && p.kind === "sidebar")!;
              return (
                <div className="sidebar-root flex flex-col" style={{ width: sidebarWidth, minWidth: sidebarWidth }}>
                  <div className="sidebar-header">
                    <span className="sidebar-title">{panel.title}</span>
                    <div className="sidebar-actions">
                      <button onClick={() => setActivePluginPanel(null)} className="sidebar-btn" title="Đóng panel">
                        <CloseIcon size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto px-2 py-2">
                    <PluginMirror
                      html={panel.html}
                      css={panel.css}
                      onEvent={(e) => pluginHost.sendMirrorEvent(panel.pluginDbId, "sidebar", panel.id, e)}
                    />
                  </div>
                </div>
              );
            })()
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
              renameRequest={sidebarRenameRequest}
              onRenameRequestHandled={clearSidebarRenameRequest}
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
                onToggleBacklinks={() => setBacklinksVisible((v) => !v)}
                onToggleCollab={() => setCollabVisible((v) => !v)}
                onExportPDF={handleExportPDF}
                onToggleBookmark={() => handleToggleBookmark(activeTab.noteId)}
                onPublish={() => setShowPublishPreview(true)}
                onFileRecovery={() => setShowFileRecovery(true)}
                pluginButtons={<CorePluginNoteToolbarButtons buttons={corePlugins.contributions.noteToolbarButtons} />}
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
                    <TagPane adapter={vaultAdapter} onTagClick={() => {}} onNoteSelect={openNote} visible={tagPaneVisible} />
                  </div>
                )}
                {bookmarksVisible && (
                  <div className="w-64 border-l border-[var(--border)] overflow-y-auto">
                    <BookmarksPanel
                      notes={bookmarkedNotes}
                      currentNoteId={activeTabId}
                      onNoteSelect={openNote}
                      onBookmarkRemove={handleToggleBookmark}
                      onClose={() => setBookmarksVisible(false)}
                      labels={{ hint: t("web.bookmarks.hint") }}
                    />
                  </div>
                )}
                {backlinksVisible && (
                  <div className="w-72 border-l border-[var(--border)] overflow-y-auto">
                    <BacklinksPanel
                      adapter={vaultAdapter}
                      noteId={activeTab.noteId}
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
                <CorePluginSidePanels
                  panels={corePlugins.contributions.sidebarPanels}
                  open={corePluginHost.openPanels}
                  onClose={corePluginHost.togglePanel}
                  closeLabel="Đóng"
                />
              </div>
              {!zenMode && (
                <StatusBar
                  viewMode={viewMode}
                  vaultName={vault?.name ?? ""}
                  notePath={activeTab.path}
                  content={draft}
                  dirty={activeTab.content !== activeTab.savedContent}
                  syncSummary={syncSummaryText}
                  syncTone={syncTone}
                  onOpenSync={() => openSettings("sync")}
                  pluginItems={pluginHost.statusItems}
                  onPluginItemClick={pluginHost.clickStatusItem}
                  coreItems={<CorePluginStatusItems items={corePlugins.contributions.statusItems} buttonClassName="hover:text-[var(--text-primary)]" />}
                />
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
              <span>Chọn hoặc tạo một note để bắt đầu</span>
              <button onClick={() => setQuickOpenVisible(true)} className="text-sm hover:text-[var(--text-primary)]">
                Quick open (⌘K)
              </button>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleQuickNewNote}
                  style={{ padding: "12px 16px" }}
                  className="rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-sm text-[var(--text-primary)] text-left"
                >
                  <div className="font-medium">Tạo note mới</div>
                  <div className="text-xs text-[var(--text-muted)]">Bắt đầu viết ngay</div>
                </button>
                <button
                  onClick={() => openSettings("sync")}
                  style={{ padding: "12px 16px" }}
                  className="rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-sm text-[var(--text-primary)] text-left"
                >
                  <div className="font-medium">Kết nối GitHub / WebDAV</div>
                  <div className="text-xs text-[var(--text-muted)]">Đồng bộ vault với repo của bạn</div>
                </button>
                <button
                  onClick={() => setImportMode("current")}
                  style={{ padding: "12px 16px" }}
                  className="rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-sm text-[var(--text-primary)] text-left"
                >
                  <div className="font-medium">Import thư mục / zip</div>
                  <div className="text-xs text-[var(--text-muted)]">Đưa vault có sẵn lên web</div>
                </button>
                <button
                  onClick={() => setPluginManagerOpen(true)}
                  style={{ padding: "12px 16px" }}
                  className="rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] text-sm text-[var(--text-primary)] text-left"
                >
                  <div className="font-medium">Cài plugin</div>
                  <div className="text-xs text-[var(--text-muted)]">Mở rộng bằng plugin cộng đồng</div>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {searchVisible && (
        <VaultSearch
          adapter={vaultAdapter}
          onOpen={(ref, line) => {
            if (line !== undefined) pendingJumpRef.current = { noteId: ref.id, line };
            openNote(ref.id);
          }}
          onClose={() => setSearchVisible(false)}
        />
      )}

      {quickOpenVisible && (
        <QuickOpen
          load={listNotes}
          onSelect={(noteId) => openNote(noteId)}
          onClose={() => setQuickOpenVisible(false)}
        />
      )}


      <CorePluginViewOverlay host={corePluginHost.host} view={corePluginHost.activeView} onClose={corePluginHost.closeView} />

      {settingsOpen && (
        <SettingsModal
          vaultId={vaultId}
          vaultName={vault?.name}
          pluginTabs={pluginHost.panels.filter((p) => p.kind === "settings")}
          corePlugins={corePlugins.plugins}
          onToggleCorePlugin={(id, enabled) => void toggleCorePlugin(id, enabled)}
          corePluginSettingsTabs={corePlugins.contributions.settingsTabs}
          onPluginEvent={(tab, e) => pluginHost.sendMirrorEvent(tab.pluginDbId, "settings", tab.id, e)}
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
        <CommandPalette<string>
          hotkeys={hotkeyBindings}
          extraItems={[
            ...corePlugins.contributions.commands.map((c) => ({
              action: `core:${c.key}`,
              label: c.name,
              // Palette shortcut text uses Ctrl; formatHotkey shows it as ⌘ on macOS.
              keys: c.hotkey?.replace(/\bMod\b/, "Ctrl") ?? "",
              category: "Core plugin",
            })),
            ...pluginHost.commands.map((c) => ({
              action: `plugin:${c.pluginDbId}:${c.id}`,
              label: c.name,
              keys: "",
              category: `Plugin · ${c.pluginId}`,
            })),
          ]}
          platform={platform}
          recentActions={recentCommands}
          onExecute={(action) => {
            if (action.startsWith("core:")) {
              corePlugins.contributions.commands.find((c) => `core:${c.key}` === action)?.run();
            } else if (action.startsWith("plugin:")) {
              const [, dbId, ...rest] = action.split(":");
              pluginHost.runCommand(dbId, rest.join(":"));
            } else {
              executeCommand(action as HotkeyAction);
            }
          }}
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
          denied={pluginHost.deniedPermissions}
          vaultId={vaultId}
          installed={pluginHost.installed}
          onChanged={pluginHost.refreshInstalled}
          onClose={() => setPluginManagerOpen(false)}
        />
      )}

      {showTrash && (
        <TrashPanel vaultId={vaultId} onClose={() => setShowTrash(false)} onRestored={refreshIndex} />
      )}

      {showAttachments && (
        <AttachmentManager
          vaultId={vaultId}
          onInsert={(markdownLink) => {
            if (editorViewRef.current) insertAtCursor(editorViewRef.current, markdownLink);
          }}
          onClose={() => setShowAttachments(false)}
          viewerOpen={attachmentView !== null}
          onView={(a) => {
            const file = { target: webApi.attachments.downloadUrl(vaultId, a.id), name: a.filename };
            if (!matchAttachmentViewer(corePlugins.contributions.attachmentViewers, file)) return false;
            setAttachmentView(file);
            return true;
          }}
        />
      )}

      {attachmentView &&
        (() => {
          const viewer = matchAttachmentViewer(corePlugins.contributions.attachmentViewers, attachmentView);
          // Above the Attachments dialog (.am-overlay is 8500).
          return viewer ? (
            <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "var(--bg-primary)" }}>
              <CorePluginAttachmentViewer viewer={viewer} target={attachmentView.target} name={attachmentView.name} onClose={() => setAttachmentView(null)} />
            </div>
          ) : null;
        })()}


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
          onOpenScrubber={
            scrubberCommand
              ? () => {
                  setShowFileRecovery(false);
                  scrubberCommand.run();
                }
              : undefined
          }
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

      {pdfPreview && (
        <PdfPreviewModal
          blob={pdfPreview.blob}
          filename={pdfPreview.filename}
          onDownload={() => void loadPdfExport().then((m) => m.saveBlob(pdfPreview.blob, pdfPreview.filename))}
          onClose={() => setPdfPreview(null)}
        />
      )}

      {showDiagnostics && (
        <DiagnosticsModal
          vaultId={vaultId}
          plugins={pluginHost.installed}
          denied={pluginHost.deniedPermissions}
          syncConnections={syncConnections}
          onClose={() => setShowDiagnostics(false)}
        />
      )}

      {showNewFromGithub && (
        <CreateVaultFromGithub
          onClose={() => setShowNewFromGithub(false)}
          onCreated={(id) => {
            setShowNewFromGithub(false);
            router.push(`/vaults/${id}`);
          }}
        />
      )}

      {importMode && (
        <ImportVault
          vaultId={importMode === "current" ? vaultId : null}
          vaultName={vault?.name}
          onClose={() => setImportMode(null)}
          onFinished={(id) => {
            setImportMode(null);
            if (id !== vaultId) router.push(`/vaults/${id}`);
            else refreshIndex();
          }}
        />
      )}

      {zenMode && (
        <button
          onClick={() => setZenMode(false)}
          className="fixed top-2 right-3 z-40 text-xs rounded-md bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          style={{ padding: "4px 10px", opacity: 0.7 }}
        >
          Thoát Zen (Esc)
        </button>
      )}

      {pageNotice && (
        <div
          onClick={() => setPageNotice(null)}
          className="fixed bottom-4 left-4 z-50 px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm cursor-pointer shadow-lg"
        >
          {pageNotice}
        </div>
      )}

      {pluginHost.notices.length + corePluginHost.notices.length > 0 && (
        <div className="fixed right-4 z-50 flex flex-col gap-2" style={{ bottom: 36 }}>
          {[...pluginHost.notices, ...corePluginHost.notices].map((n) => (
            <div
              key={n.key}
              onClick={() => (n.key.startsWith("core:") ? corePluginHost.dismissNotice(n.key) : pluginHost.dismissNotice(n.key))}
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

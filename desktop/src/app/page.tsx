"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import TitleBar from "@/components/TitleBar";
import DocumentTitle from "@/components/DocumentTitle";
import SplitPane from "@/components/SplitPane";
import ContextMenu, { ContextMenuItem } from "@/components/ContextMenu";
import { PluginMirror } from "@noteriv/ui/plugins/sandbox";
import {
  QuickOpen,
  CommandPalette,
  OutlinePanel,
  BacklinksPanel,
  OutgoingLinksPanel,
  PropertiesEditor,
  PropertiesView,
  usePropertyTypes,
  cleanPropertyTypes,
  type PropertyTypesStore,
  TagPane,
  BookmarksPanel,
  ConflictBanner,
  adapterNoteEditor,
  type NoteEditor,
  NoteHoverPreview,
  AppImport,
} from "@noteriv/ui/panels";
import { writeImportToVault } from "@/lib/app-import";
import { t } from "@noteriv/ui/i18n";
import { useLocale } from "@noteriv/ui/i18n/react";
import { applyLanguage, languageForStoredSettings } from "@/lib/i18n";
import { parseConflictCopy } from "@noteriv/core/conflict-copy";
import "@/styles/bookmarks.css";
import { createDesktopVaultAdapter } from "@/lib/desktopVaultAdapter";
import { createDesktopImageLoader, createDesktopImageDrop, createDesktopFileLister } from "@/lib/ui-hooks";
import { bumpEmbedVersion, getEmbedVersion, setEmbedSource, setLocalImageLoader, setPostProcessorRunner } from "@noteriv/ui/markdown/vault-hooks";
import { baseName, refFromAbsolutePath, relativeVaultPath, toPosixPath } from "@noteriv/core/vault-adapter";
import { notesMovedByRename, resolveLinkTarget, rewriteLinksForMoves, updateLinksAfterMove } from "@noteriv/core/link-rename";
import { anchorLine, parseLinkTarget, type Anchor } from "@noteriv/core/note-embed";
import {
  CorePluginRibbonButtons,
  CorePluginStatusItems,
  CorePluginSidePanels,
  CorePluginViewOverlay,
  CorePluginFileView,
  matchFileView,
  CorePluginAttachmentViewer,
  matchAttachmentViewer,
  type HostFileView,
  useCorePluginHost,
  useCorePluginHotkeys,
  useCorePlugins,
} from "@noteriv/ui/plugins";
import { desktopCorePluginConfig } from "@/lib/core-plugins";
import { isImageFile } from "@/lib/attachment-utils";
import { trashFile, cleanupOldTrash } from "@/lib/trash-utils";
import { insertTocPlaceholder, generateTocBlock, updateTocBlocks, hasTocBlock } from "@noteriv/core/toc-utils";
import { insertAtCursor } from "@noteriv/ui/editor/editor-commands";
import {
  HotkeyBinding,
  HotkeyAction,
  DEFAULT_HOTKEYS,
  matchesHotkey,
  mergeHotkeys,
  hotkeysToPersist,
} from "@/lib/hotkeys";
import {
  AppSettings,
  DEFAULT_SETTINGS,
  mergeSettings,
  applySettings,
  formatCommitMessage,
} from "@/lib/settings";
import {
  wrapSelection,
  insertLink as editorInsertLink,
  insertImage as editorInsertImage,
  insertHorizontalRule as editorInsertHR,
  insertCodeBlock as editorInsertCodeBlock,
  insertBlockquote as editorInsertBlockquote,
  insertTaskList as editorInsertTaskList,
  insertTable as editorInsertTable,
} from "@noteriv/ui/editor/editor-commands";
import { toggleBookmark, isBookmarked } from "@noteriv/core/bookmark-utils";
import { getRandomNote } from "@/lib/random-note";
import { saveSnapshot } from "@/lib/file-recovery";
import { DesktopPluginStore, PLUGIN_APP_VERSION, toSandboxRecord, type DesktopPlugin } from "@/lib/plugin-api";
import { useSandboxPluginHost, type EditorSnapshot } from "@noteriv/ui/plugins/sandbox";
import { BUILT_IN_THEMES, applyTheme, loadCustomThemes } from "@/lib/theme-utils";
import { loadSnippets, refreshSnippets, type CSSSnippet } from "@/lib/css-snippets";
import type { EditorView } from "@codemirror/view";

// Dialogs opened on demand (and the first-run wizard): loaded when first shown.
const SetupWizard = dynamic(() => import("@/components/SetupWizard"), { ssr: false });
const SettingsModal = dynamic(() => import("@/components/SettingsModal"), { ssr: false });
const VaultSearch = dynamic(() => import("@noteriv/ui/panels").then((m) => m.VaultSearch), { ssr: false });
const FileRecovery = dynamic(() => import("@/components/FileRecovery"), { ssr: false });
const AttachmentManager = dynamic(() => import("@/components/AttachmentManager"), { ssr: false });
const PluginManagerModal = dynamic(() => import("@/components/PluginManager"), { ssr: false });
const CSSSnippets = dynamic(() => import("@/components/CSSSnippets"), { ssr: false });
const PublishPreview = dynamic(() => import("@/components/PublishPreview"), { ssr: false });
const CollabPanel = dynamic(() => import("@/components/CollabPanel"), { ssr: false });
const TrashPanel = dynamic(() => import("@/components/TrashPanel"), { ssr: false });
/** PDF export (markdown → HTML, print): loaded when used. */
const exportToPDF = async (...args: Parameters<typeof import("@/lib/pdf-export").exportToPDF>) =>
  (await import("@/lib/pdf-export")).exportToPDF(...args);

const Editor = dynamic(() => import("@noteriv/ui/editor").then((m) => m.Editor), { ssr: false });
const SourceEditor = dynamic(() => import("@noteriv/ui/editor").then((m) => m.SourceEditor), { ssr: false });
const ReadOnlyView = dynamic(() => import("@noteriv/ui/editor").then((m) => m.ReadOnlyView), { ssr: false });
const FormattingToolbar = dynamic(() => import("@noteriv/ui/editor").then((m) => m.FormattingToolbar), { ssr: false });
const ImageViewer = dynamic(() => import("@/components/ImageViewer"), { ssr: false });
/** PDFs open in a tab of their own, shown by a core plugin's attachment viewer (the PDF viewer, since 2.5c). */
const isPdfFile = (path: string) => /\.pdf$/i.test(path);

type ViewMode = "live" | "source" | "view";
type AppState = "loading" | "setup" | "app";

interface TabState {
  filePath: string;
  content: string;
  savedContent: string;
  // Non-markdown tabs render a dedicated view instead of the text editor.
  // Absent = a normal markdown note.
  kind?: "pdf" | "image";
}

export default function Home() {
  useLocale(); // re-render on a language change (labels passed to shared panels)
  const [appState, setAppState] = useState<AppState>("loading");
  const [showSetupWizard, setShowSetupWizard] = useState(false);

  // Vault
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [activeVault, setActiveVault] = useState<Vault | null>(null);

  // Tabs
  const [tabs, setTabs] = useState<TabState[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Split editor
  const [splitTab, setSplitTab] = useState<string | null>(null);
  const [splitRatio, setSplitRatio] = useState(0.5);

  // UI
  const [viewMode, setViewMode] = useState<ViewMode>("live");
  const [fileViewModes, setFileViewModes] = useState<Record<string, ViewMode>>({});
  const [editorContextMenu, setEditorContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [sidebarRefresh, setSidebarRefresh] = useState(0);
  const [expandedFolders, setExpandedFolders] = useState<string[]>([]);
  const [fileOrder, setFileOrder] = useState<Record<string, string[]>>({});
  const [platform, setPlatform] = useState("linux");

  // Zen mode
  const [zenMode, setZenMode] = useState(false);

  // Modals / overlays
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [showVaultSearch, setShowVaultSearch] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showAppImport, setShowAppImport] = useState(false);
  // A preview of the note a [[link]] names, after the pointer rests on it a moment.
  const [linkHover, setLinkHover] = useState<{ target: string; x: number; y: number } | null>(null);
  const linkHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleWikilinkHover = useCallback((target: string, x: number, y: number) => {
    if (linkHoverTimer.current) clearTimeout(linkHoverTimer.current);
    linkHoverTimer.current = setTimeout(() => setLinkHover({ target, x, y }), 300);
  }, []);
  const handleWikilinkLeave = useCallback(() => {
    if (linkHoverTimer.current) clearTimeout(linkHoverTimer.current);
    setLinkHover(null);
  }, []);
  // Another tab or view mode replaces the editor (and the link) without the pointer leaving it.
  useEffect(() => handleWikilinkLeave(), [activeTab, viewMode, handleWikilinkLeave]);
  const [showOutline, setShowOutline] = useState(false);
  const [showBacklinks, setShowBacklinks] = useState(false);
  const [showOutgoing, setShowOutgoing] = useState(false);
  const [showProperties, setShowProperties] = useState(false);
  const [showTagPane, setShowTagPane] = useState(false);
  const [showFileRecovery, setShowFileRecovery] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const activeVaultPath = activeVault?.path ?? "";
  const vaultAdapter = useMemo(
    () => (activeVaultPath ? createDesktopVaultAdapter(activeVaultPath) : null),
    [activeVaultPath]
  );
  /**
   * Property types for the vault (one per property name), kept in the vault itself (`.noteriv/property-types.json`):
   * the adapter's settings are the whole app's on desktop, shared by every vault.
   */
  const propertyTypesStore = useMemo<PropertyTypesStore | null>(() => {
    if (!activeVaultPath) return null;
    const sep = activeVaultPath.includes("\\") ? "\\" : "/";
    const dir = `${activeVaultPath.replace(/[\\/]+$/, "")}${sep}.noteriv`;
    const file = `${dir}${sep}property-types.json`;
    return {
      load: async () => {
        const text = await window.electronAPI?.readFile(file);
        try {
          return cleanPropertyTypes(text ? JSON.parse(text) : {});
        } catch {
          return {};
        }
      },
      save: async (types) => {
        await window.electronAPI?.createDir(dir);
        await window.electronAPI?.writeFile(file, JSON.stringify(types, null, 2));
      },
    };
  }, [activeVaultPath]);
  const propertyTypes = usePropertyTypes(propertyTypesStore);
  // The live preview loads local images through the active vault.
  useEffect(() => {
    if (!activeVaultPath) return;
    setLocalImageLoader(createDesktopImageLoader(activeVaultPath));
    return () => {
      setLocalImageLoader(null);
    };
  }, [activeVaultPath]);
  const listFiles = useMemo(
    () => (activeVaultPath ? createDesktopFileLister(activeVaultPath) : async () => []),
    [activeVaultPath]
  );
  const onImageDrop = useMemo(
    () => (activeVaultPath ? createDesktopImageDrop(activeVaultPath) : undefined),
    [activeVaultPath]
  );
  const bookmarkedNotes = useMemo(
    () => bookmarks.map((p) => refFromAbsolutePath(activeVaultPath, p)),
    [bookmarks, activeVaultPath]
  );
  const [frontmatterCollapsed, setFrontmatterCollapsed] = useState(true);

  // Ecosystem
  const [showPluginManager, setShowPluginManager] = useState(false);
  const [showCSSSnippets, setShowCSSSnippets] = useState(false);

  // New features
  const [focusMode, setFocusMode] = useState(false);
  const [showCollab, setShowCollab] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [pinnedTabs, setPinnedTabs] = useState<Set<string>>(new Set());
  const [recentCommands, setRecentCommands] = useState<HotkeyAction[]>([]);
  const [communityPlugins, setCommunityPlugins] = useState<DesktopPlugin[]>([]);
  const [cssSnippets, setCSSSnippets] = useState<CSSSnippet[]>([]);

  // Editor view ref (for formatting commands)
  const editorViewRef = useRef<EditorView | null>(null);
  const contentRef = useRef<string>("");
  const activeTabRef = useRef<string | null>(null);

  // Sync status
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "error">("idle");
  /** Shown after a git sync that had to keep both sides of a conflict (click to dismiss). */
  const [syncConflictNotice, setSyncConflictNotice] = useState<string | null>(null);
  /** "Updated links in N notes" after a rename; hides itself. */
  const [linkNotice, setLinkNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!linkNotice) return;
    const timer = setTimeout(() => setLinkNotice(null), 5000);
    return () => clearTimeout(timer);
  }, [linkNotice]);
  /** Community plugin sidebar panel shown in place of the file tree (`<pluginDbId>:<panelId>`), as on the web. */
  const [activePluginPanel, setActivePluginPanel] = useState<string | null>(null);
  const [gitChanges, setGitChanges] = useState(0);

  // Hotkeys
  const [hotkeys, setHotkeys] = useState<HotkeyBinding[]>(DEFAULT_HOTKEYS.map((d) => ({ ...d })));

  // App settings
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS });

  // Timers
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gitPushRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workspaceSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(settings);
  const sidebarCollapsedRef = useRef(sidebarCollapsed);
  const manualSidebarCollapsedRef = useRef(sidebarCollapsed);
  const responsiveSidebarRef = useRef(false);
  const fontSizeSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    sidebarCollapsedRef.current = sidebarCollapsed;
  }, [sidebarCollapsed]);

  useEffect(() => () => {
    if (fontSizeSaveRef.current) clearTimeout(fontSizeSaveRef.current);
  }, []);

  // Current tab helpers
  const currentTab = tabs.find((t) => t.filePath === activeTab) || null;
  // Dedicated views are driven by the active tab's kind, so they live in the
  // tab strip and own the title bar / export the same way notes do.
  const content = currentTab?.content || "";
  const isDirty = currentTab ? currentTab.content !== currentTab.savedContent : false;

  useEffect(() => {
    const title = activeTab ? `${activeTab} - Noteriv` : activeVault ? `${activeVault.path} - Noteriv` : "Noteriv";
    document.title = title;
    window.electronAPI?.windowSetTitle(title);
  }, [activeTab, activeVault]);

  const handleToggleSidebar = useCallback(() => {
    responsiveSidebarRef.current = false;
    const collapsed = !sidebarCollapsedRef.current;
    manualSidebarCollapsedRef.current = collapsed;
    sidebarCollapsedRef.current = collapsed;
    setSidebarCollapsed(collapsed);
  }, []);

  useEffect(() => {
    if (appState !== "app") return;

    const updateResponsiveSidebar = () => {
      if (!settings.autoCollapseSidebar) {
        if (responsiveSidebarRef.current) {
          responsiveSidebarRef.current = false;
          sidebarCollapsedRef.current = manualSidebarCollapsedRef.current;
          setSidebarCollapsed(manualSidebarCollapsedRef.current);
        }
        return;
      }

      if (window.innerWidth < settings.sidebarCollapseWidth) {
        if (!sidebarCollapsedRef.current) {
          responsiveSidebarRef.current = true;
          sidebarCollapsedRef.current = true;
          setSidebarCollapsed(true);
        }
      } else if (responsiveSidebarRef.current) {
        responsiveSidebarRef.current = false;
        sidebarCollapsedRef.current = manualSidebarCollapsedRef.current;
        setSidebarCollapsed(manualSidebarCollapsedRef.current);
      }
    };

    updateResponsiveSidebar();
    window.addEventListener("resize", updateResponsiveSidebar);
    return () => window.removeEventListener("resize", updateResponsiveSidebar);
  }, [appState, settings.autoCollapseSidebar, settings.sidebarCollapseWidth]);

  // Apply per-file view mode when switching tabs
  useEffect(() => {
    if (activeTab && fileViewModes[activeTab]) {
      setViewMode(fileViewModes[activeTab]);
    }
  }, [activeTab]);

  // Split tab helpers
  const splitTabState = splitTab ? tabs.find((t) => t.filePath === splitTab) || null : null;
  const splitContent = splitTabState?.content || "";

  useEffect(() => {
    contentRef.current = content;
    activeTabRef.current = activeTab;
  });

  const tabInfos = tabs.map((t) => ({
    filePath: t.filePath,
    name: baseName(t.filePath).replace(/\.(md|markdown)$/i, "") || "Untitled",
    isDirty: t.content !== t.savedContent,
  }));

  // ============================================================
  // Workspace persistence
  // ============================================================

  const saveWorkspace = useCallback(async () => {
    if (!window.electronAPI || !activeVault) return;
    const state: WorkspaceState = {
      openTabs: tabs.map((t) => t.filePath),
      activeTab,
      expandedFolders,
      sidebarCollapsed: manualSidebarCollapsedRef.current,
      sidebarWidth,
      viewMode,
      fileOrder,
      fileViewModes,
      pinnedTabs: Array.from(pinnedTabs),
    };
    await window.electronAPI.saveWorkspace(activeVault.path, state);
  }, [activeVault, tabs, activeTab, expandedFolders, sidebarCollapsed, sidebarWidth, viewMode, fileOrder, fileViewModes, pinnedTabs]);

  // Debounced workspace save
  const debounceSaveWorkspace = useCallback(() => {
    if (workspaceSaveRef.current) clearTimeout(workspaceSaveRef.current);
    workspaceSaveRef.current = setTimeout(saveWorkspace, 1000);
  }, [saveWorkspace]);

  // Save workspace when state changes
  useEffect(() => {
    if (appState === "app") debounceSaveWorkspace();
  }, [appState, tabs.length, activeTab, expandedFolders, sidebarCollapsed, sidebarWidth, viewMode, fileOrder, fileViewModes, pinnedTabs, debounceSaveWorkspace]);

  const loadWorkspace = useCallback(async (vault: Vault) => {
    if (!window.electronAPI) return;
    const ws = await window.electronAPI.loadWorkspace(vault.path);
    if (!ws) return;

    // Restore UI state
    const restoredSidebarCollapsed = ws.sidebarCollapsed ?? false;
    manualSidebarCollapsedRef.current = restoredSidebarCollapsed;
    sidebarCollapsedRef.current = restoredSidebarCollapsed;
    responsiveSidebarRef.current = false;
    setSidebarCollapsed(restoredSidebarCollapsed);
    setSidebarWidth(Math.max(180, Math.min(520, ws.sidebarWidth ?? 250)));
    setViewMode(ws.viewMode ?? "live");
    setExpandedFolders(ws.expandedFolders ?? []);
    setFileOrder(ws.fileOrder ?? {});
    setFileViewModes(ws.fileViewModes ?? {});
    setPinnedTabs(new Set(ws.pinnedTabs ?? []));

    // Restore tabs
    const restoredTabs: TabState[] = [];
    for (const filePath of ws.openTabs || []) {
      // Dedicated-view tabs (pdf, image) carry no text content; they load their own files. Restore them by kind, not
      // by reading as text. Canvas and drawing files are text tabs (core plugin file views, since 2.5b).
      let kind: TabState["kind"];
      if (isPdfFile(filePath)) kind = "pdf";
      else if (isImageFile(filePath)) kind = "image";
      if (kind) {
        restoredTabs.push({ filePath, content: "", savedContent: "", kind });
        continue;
      }
      const fileContent = await window.electronAPI.readFile(filePath);
      if (fileContent !== null) {
        restoredTabs.push({ filePath, content: fileContent, savedContent: fileContent });
      }
    }
    setTabs(restoredTabs);
    setActiveTab(ws.activeTab && restoredTabs.some((t) => t.filePath === ws.activeTab) ? ws.activeTab : restoredTabs[0]?.filePath || null);
  }, []);

  // ============================================================
  // Initialization
  // ============================================================

  useEffect(() => {
    async function init() {
      if (!window.electronAPI) { setAppState("setup"); return; }

      // Load recent commands from localStorage
      try {
        const saved = localStorage.getItem("noteriv-recent-commands");
        if (saved) setRecentCommands(JSON.parse(saved));
      } catch {}

      // Load platform
      window.electronAPI.getPlatform().then(setPlatform);

      // Load saved settings
      let merged = DEFAULT_SETTINGS;
      try {
        const saved = await window.electronAPI.loadSettings();
        if (saved.hotkeys) {
          setHotkeys(mergeHotkeys(saved.hotkeys));
        }
        // Installs from before the language setting keep their English; new installs follow the system.
        const language = languageForStoredSettings(saved as Record<string, unknown>);
        merged = { ...mergeSettings(saved), language };
        if (saved.language !== language && Object.keys(saved).length > 0) {
          void window.electronAPI.saveSettings({ ...saved, language });
        }
        setSettings(merged);
        applySettings(merged);
        // Apply theme
        if (merged.theme) {
          const allBuiltIn = BUILT_IN_THEMES;
          const theme = allBuiltIn.find((t) => t.id === merged.theme);
          if (theme) applyTheme(theme);
        }
      } catch {}

      void applyLanguage(merged.language);

      const setupDone = await window.electronAPI.isSetupComplete();
      if (!setupDone) { setAppState("setup"); return; }

      const allVaults = await window.electronAPI.getVaults();
      setVaults(allVaults);

      const active = await window.electronAPI.getActiveVault();
      const vault = active || (allVaults.length > 0 ? await window.electronAPI.setActiveVault(allVaults[0].id) : null);

      if (vault) {
        setActiveVault(vault);

        // Pull on open if enabled
        if (vault.gitRemote && merged.pullOnOpen) {
          try {
            await window.electronAPI.gitPull(vault.path, vault.id);
          } catch {}
        }

        await loadWorkspace(vault);

        // Fetch initial git status
        if (vault.gitRemote) {
          try {
            const status = await window.electronAPI.gitStatus(vault.path);
            setGitChanges(status.changes);
          } catch {}
        }

        // Auto-cleanup old trash (>30 days)
        try { await cleanupOldTrash(vault.path, 30); } catch {}

        // Load CSS snippets
        try {
          const snips = await loadSnippets(vault.path);
          setCSSSnippets(snips);
          refreshSnippets(snips);
        } catch {}

        // Load custom themes and apply if active theme is custom
        try {
          const customs = await loadCustomThemes(vault.path);
          if (merged.theme) {
            const allBuiltIn = BUILT_IN_THEMES;
            const isBuiltIn = allBuiltIn.some((t) => t.id === merged.theme);
            if (!isBuiltIn) {
              const custom = customs.find((t) => t.id === merged.theme);
              if (custom) applyTheme(custom);
            }
          }
        } catch {}

        setAppState("app");
      } else {
        setAppState("setup");
      }
    }
    init();
  }, [loadWorkspace]);

  // ============================================================
  // Re-apply theme & snippets after app is ready
  // (guards against Next.js hydration clearing injected styles)
  // ============================================================

  useEffect(() => {
    if (appState !== "app") return;
    // Re-apply theme
    if (settings.theme) {
      const builtIn = BUILT_IN_THEMES.find((t) => t.id === settings.theme);
      if (builtIn) {
        applyTheme(builtIn);
      } else if (activeVault) {
        loadCustomThemes(activeVault.path).then((customs) => {
          const custom = customs.find((t) => t.id === settings.theme);
          if (custom) applyTheme(custom);
        });
      }
    }
    // Re-apply CSS snippets
    if (cssSnippets.length > 0) {
      refreshSnippets(cssSnippets);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState]);

  // ============================================================
  // Auto-save every 30s
  // ============================================================

  // Both savers read the tabs through a ref: with `tabs` as a dependency the interval was recreated on every
  // keystroke, so its countdown restarted and continuous typing (or a plugin edit) was never auto-saved.
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  /** Tabs a plugin just edited (insert, replace…): saved by the 5 s loop below instead of waiting for auto-save. */
  const quickSaveRef = useRef<Set<string>>(new Set());
  const markPluginEdit = () => {
    if (activeTabRef.current) quickSaveRef.current.add(activeTabRef.current);
  };

  useEffect(() => {
    if (appState !== "app" || settings.autoSaveInterval <= 0) return;
    autoSaveRef.current = setInterval(async () => {
      if (!window.electronAPI) return;
      for (const tab of tabsRef.current) {
        if (tab.content !== tab.savedContent) {
          const success = await window.electronAPI.writeFile(tab.filePath, tab.content);
          if (success) {
            setTabs((prev) =>
              prev.map((t) =>
                t.filePath === tab.filePath ? { ...t, savedContent: t.content } : t
              )
            );
          }
        }
      }
    }, settings.autoSaveInterval * 1000);
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current); };
  }, [appState, settings.autoSaveInterval]);

  // ============================================================
  // Quick auto-save (every 5s) for files shown by a core plugin's file view (Board…) and for notes a plugin just
  // edited: those are discrete actions (move a card, insert a recording), not typing, so they should not wait for
  // the 30 s editor auto-save.
  // ============================================================

  /** Set further down, once the core plugins are known; read here inside the interval. */
  const fileViewForTabRef = useRef<(filePath: string, content: string) => HostFileView | undefined>(() => undefined);
  useEffect(() => {
    if (appState !== "app") return;
    const interval = setInterval(async () => {
      if (!window.electronAPI) return;
      for (const tab of tabsRef.current) {
        const quick = quickSaveRef.current.has(tab.filePath);
        if (quick && tab.content === tab.savedContent) quickSaveRef.current.delete(tab.filePath);
        if (tab.content !== tab.savedContent && !tab.kind && (quick || fileViewForTabRef.current(tab.filePath, tab.content))) {
          quickSaveRef.current.delete(tab.filePath);
          const success = await window.electronAPI.writeFile(tab.filePath, tab.content);
          if (success) {
            setTabs((prev) =>
              prev.map((t) =>
                t.filePath === tab.filePath ? { ...t, savedContent: t.content } : t
              )
            );
          }
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [appState]);

  // ============================================================
  // Vault file watcher — react to external changes (e.g. MCP server)
  // ============================================================

  useEffect(() => {
    if (appState !== "app" || !window.electronAPI?.onVaultChanged) return;
    const unsub = window.electronAPI.onVaultChanged((changedPath: string) => {
      setSidebarRefresh((n) => n + 1);
      bumpEmbedVersion(); // embeds of the changed note load again

      setTabs((prev) => {
        const tab = prev.find((t) => t.filePath === changedPath);
        if (!tab) return prev;
        (async () => {
          // External filesystem changes are authoritative. Never replay an
          // in-memory edit over them, or a stale tab can undo another writer.
          const newContent = await window.electronAPI.readFile(changedPath);
          if (newContent !== null) {
            setTabs((tabs) =>
              tabs.map((t) =>
                t.filePath === changedPath ? { ...t, content: newContent, savedContent: newContent } : t
              )
            );
          }
        })();
        return prev;
      });
    });
    return unsub;
  }, [appState]);

  // ============================================================
  // Git sync
  // ============================================================

  const performSync = useCallback(async (message?: string) => {
    if (!window.electronAPI || !activeVault) return;
    setSyncStatus("syncing");
    try {
      await saveWorkspace();

      // Git sync (if configured)
      if (activeVault.gitRemote) {
        const msg = message || formatCommitMessage(settings.commitMessageFormat);
        const conflictCopies = await window.electronAPI.gitSync(activeVault.path, msg, activeVault.id);
        if (Array.isArray(conflictCopies) && conflictCopies.length > 0) {
          setSyncConflictNotice(
            t("desktop.syncConflicts", {
              count: conflictCopies.length,
              files: `${conflictCopies.slice(0, 3).join(", ")}${conflictCopies.length > 3 ? ", …" : ""}`,
            })
          );
        }
      }

      // Extra sync provider (folder, webdav, s3)
      if (settings.extraSyncProvider !== "none") {
        const config =
          settings.extraSyncProvider === "folder" ? settings.folderSync :
          settings.extraSyncProvider === "webdav" ? settings.webdavSync : null;
        if (config) {
          await window.electronAPI.syncProviderSync(
            activeVault.path,
            settings.extraSyncProvider,
            config
          );
        }
      }

      setLastSyncTime(new Date());
      setSyncStatus("idle");
      // Refresh change count
      if (activeVault.gitRemote) {
        const status = await window.electronAPI.gitStatus(activeVault.path);
        setGitChanges(status.changes);
      }
    } catch {
      setSyncStatus("error");
      setTimeout(() => setSyncStatus("idle"), 3000);
    }
  }, [activeVault, saveWorkspace, settings.commitMessageFormat, settings.extraSyncProvider, settings.folderSync, settings.webdavSync]);

  const handleGitSync = performSync;

  // ============================================================
  // Auto-sync every 5s (pull + push if changes)
  // ============================================================

  useEffect(() => {
    if (appState !== "app" || !activeVault?.gitRemote) return;
    const interval = setInterval(async () => {
      if (!window.electronAPI) return;
      try {
        const status = await window.electronAPI.gitStatus(activeVault.path);
        setGitChanges(status.changes);
        // Auto-sync: always pull, push if there are local changes
        if (status.isRepo && status.remote) {
          performSync();
        }
      } catch {}
    }, 5_000);
    return () => clearInterval(interval);
  }, [appState, activeVault, performSync]);

  // ============================================================
  // Vault operations
  // ============================================================

  const saveDirtyTabs = useCallback(async (): Promise<boolean> => {
    if (!window.electronAPI) return false;
    const dirtyTabs = tabs.filter((tab) => !tab.kind && tab.content !== tab.savedContent);
    for (const tab of dirtyTabs) {
      const saved = await window.electronAPI.writeFile(tab.filePath, tab.content);
      if (!saved) return false;
    }
    if (dirtyTabs.length > 0) {
      const savedPaths = new Set(dirtyTabs.map((tab) => tab.filePath));
      setTabs((current) => current.map((tab) =>
        savedPaths.has(tab.filePath) ? { ...tab, savedContent: tab.content } : tab
      ));
    }
    return true;
  }, [tabs]);

  const handleSetupComplete = useCallback(async (vault: Vault) => {
    setActiveVault(vault);
    if (window.electronAPI) setVaults(await window.electronAPI.getVaults());
    setShowSetupWizard(false);
    setTabs([]);
    setActiveTab(null);
    setAppState("app");
  }, []);

  const handleSwitchVault = useCallback(async (id: string) => {
    if (!window.electronAPI) return;
    if (!await saveDirtyTabs()) return;
    // Save current workspace first
    await saveWorkspace();
    const vault = await window.electronAPI.setActiveVault(id);
    if (vault) {
      setActiveVault(vault);
      setTabs([]);
      setActiveTab(null);
      await loadWorkspace(vault);
    }
  }, [saveDirtyTabs, saveWorkspace, loadWorkspace]);

  const handleOpenFolderAsVault = useCallback(async () => {
    if (!window.electronAPI) return;
    const folder = await window.electronAPI.openFolder();
    if (!folder) return;

    const normalize = (value: string) => value.replace(/[\\/]+$/, "").toLowerCase();
    const existing = vaults.find((vault) => normalize(vault.path) === normalize(folder));
    if (existing) {
      await handleSwitchVault(existing.id);
      return;
    }

    if (!await saveDirtyTabs()) return;
    await saveWorkspace();
    const name = folder.split(/[\\/]/).filter(Boolean).pop() || "Vault";
    const created = await window.electronAPI.createVault({ name, vaultPath: folder });
    const active = await window.electronAPI.setActiveVault(created.id) || created;
    setVaults(await window.electronAPI.getVaults());
    setActiveVault(active);
    setTabs([]);
    setActiveTab(null);
    setExpandedFolders([]);
    setFileOrder({});
    setFileViewModes({});
    setPinnedTabs(new Set());
    setViewMode("live");
    setSidebarWidth(250);
    manualSidebarCollapsedRef.current = false;
    sidebarCollapsedRef.current = false;
    setSidebarCollapsed(false);
    setSidebarRefresh((value) => value + 1);
    setAppState("app");
    await loadWorkspace(active);
  }, [vaults, handleSwitchVault, saveDirtyTabs, saveWorkspace, loadWorkspace]);

  const handleDeleteVault = useCallback(async (id: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.deleteVault(id);
    const allVaults = await window.electronAPI.getVaults();
    setVaults(allVaults);
    if (activeVault?.id === id) {
      if (allVaults.length > 0) {
        const vault = await window.electronAPI.setActiveVault(allVaults[0].id);
        if (vault) { setActiveVault(vault); await loadWorkspace(vault); }
      } else {
        setActiveVault(null);
        setAppState("setup");
      }
    }
  }, [activeVault, loadWorkspace]);

  // ============================================================
  // Tab / editor operations
  // ============================================================

  const openingFilesRef = useRef(new Set<string>());

  const openFile = useCallback(async (filePath: string) => {
    // PDF and images open as dedicated-view tabs (no text content; each view manages its own file I/O). Canvas and
    // drawing files are text tabs shown by core plugin file views (since 2.5b): they load, save and auto-save like
    // notes, and open as plain text when their plugin is off.
    let kind: TabState["kind"];
    if (isPdfFile(filePath)) kind = "pdf";
    else if (isImageFile(filePath)) kind = "image";

    if (kind) {
      setTabs((prev) =>
        prev.some((t) => t.filePath === filePath)
          ? prev
          : [...prev, { filePath, content: "", savedContent: "", kind }]
      );
      setActiveTab(filePath);
      return;
    }

    // Already being opened — block duplicate calls
    if (openingFilesRef.current.has(filePath)) {
      setActiveTab(filePath);
      return;
    }

    // Check current tabs via functional updater (always up to date)
    let found = false;
    setTabs((prev) => {
      found = prev.some((t) => t.filePath === filePath);
      return prev;
    });
    if (found) {
      setActiveTab(filePath);
      return;
    }

    openingFilesRef.current.add(filePath);
    try {
      if (!window.electronAPI) return;
      const fileContent = await window.electronAPI.readFile(filePath);
      if (fileContent === null) return;

      setTabs((prev) => {
        if (prev.some((t) => t.filePath === filePath)) return prev;
        return [...prev, { filePath, content: fileContent, savedContent: fileContent }];
      });
      setActiveTab(filePath);
    } finally {
      openingFilesRef.current.delete(filePath);
    }
  }, []);

  const closeTab = useCallback((filePath: string) => {
    // Pinned tabs cannot be closed
    if (pinnedTabs.has(filePath)) return;
    // Close split if this tab is in the split pane
    if (splitTab === filePath) setSplitTab(null);
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.filePath === filePath);
      const next = prev.filter((t) => t.filePath !== filePath);
      if (activeTab === filePath) {
        // Switch to adjacent tab
        const newIdx = Math.min(idx, next.length - 1);
        setActiveTab(next[newIdx]?.filePath || null);
      }
      return next;
    });
  }, [activeTab, pinnedTabs, splitTab]);

  const handleTogglePin = useCallback((filePath: string) => {
    setPinnedTabs((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  }, []);

  const reorderTabs = useCallback((from: number, to: number) => {
    setTabs((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const handleFileDelete = useCallback((filePath: string) => {
    // Close tab if the deleted file (or a file inside a deleted folder) is open
    setTabs((prev) => {
      const next = prev.filter((t) => !t.filePath.startsWith(filePath));
      if (activeTab && activeTab.startsWith(filePath)) {
        const idx = prev.findIndex((t) => t.filePath === activeTab);
        const newIdx = Math.min(idx, next.length - 1);
        setActiveTab(next[newIdx]?.filePath || null);
      }
      return next;
    });
  }, [activeTab]);

  const handleFileRename = useCallback((oldPath: string, newPath: string) => {
    // Update any open tabs that reference the old path
    setTabs((prev) =>
      prev.map((t) => {
        if (t.filePath === oldPath) {
          return { ...t, filePath: newPath };
        }
        // Handle files inside a renamed folder
        if (t.filePath.startsWith(oldPath + "/") || t.filePath.startsWith(oldPath + "\\")) {
          return { ...t, filePath: t.filePath.replace(oldPath, newPath) };
        }
        return t;
      })
    );
    if (activeTab === oldPath) {
      setActiveTab(newPath);
    } else if (activeTab?.startsWith(oldPath + "/") || activeTab?.startsWith(oldPath + "\\")) {
      setActiveTab(activeTab.replace(oldPath, newPath));
    }
    void updateLinksForRename(oldPath, newPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, vaultAdapter, activeVaultPath]);

  /**
   * Edits from the link panels: a note open in a tab is changed there (the editor shows it and autosave writes it;
   * writing the file under it would let the vault watcher replace unsaved text); any other note goes through the
   * adapter, never over a newer version.
   */
  const editNoteInTabs: NoteEditor = async (id, transform) => {
    const key = (p: string) => toPosixPath(p).toLowerCase();
    const tab = tabsRef.current.find((t) => !t.kind && key(t.filePath) === key(id));
    if (!tab) return vaultAdapter ? adapterNoteEditor(vaultAdapter)(id, transform) : false;
    const next = transform(tab.content);
    if (next === null || next === tab.content) return false;
    setTabs((prev) => prev.map((t) => (t === tab || (!t.kind && key(t.filePath) === key(id)) ? { ...t, content: transform(t.content) ?? t.content } : t)));
    // A discrete edit, not typing: saved by the 5 s loop rather than the editor auto-save (30 s, or off).
    quickSaveRef.current.add(tab.filePath);
    return true;
  };

  /**
   * After a note or folder is renamed or moved on disk, rewrite the links that pointed at the old paths (setting
   * "Update links when renaming", on by default). A tab with unsaved edits is not written here: its text gets the
   * same rewrite and autosave writes it (the vault watcher would otherwise replace the unsaved text with the file's).
   */
  const updateLinksForRename = async (oldPath: string, newPath: string) => {
    if (!vaultAdapter || !activeVaultPath || !window.electronAPI || !settingsRef.current.autoUpdateLinks) return;
    try {
      const notes = await window.electronAPI.listAllFiles(activeVaultPath);
      const attachments = (await vaultAdapter.listAttachments?.()) ?? [];
      const allFiles = [...notes.map((n) => n.filePath), ...attachments.map((a) => a.target)];
      const plan = notesMovedByRename(activeVaultPath, oldPath, newPath, allFiles);
      if (!plan) return;
      const key = (p: string) => toPosixPath(p).toLowerCase();
      const unsaved = new Set(tabsRef.current.filter((tab) => !tab.kind && tab.content !== tab.savedContent).map((tab) => key(tab.filePath)));
      const result = await updateLinksAfterMove(vaultAdapter, plan.moves, plan.before, (ref) => unsaved.has(key(ref.id)));
      const written = new Map(result.changed.map((c) => [key(c.id), c.content]));
      const backToBefore = new Map(plan.moves.map((m) => [m.to.toLowerCase(), m.from]));
      const rewrite = (tab: { filePath: string; content: string }) => {
        const sourceAfter = relativeVaultPath(activeVaultPath, tab.filePath);
        const sourceBefore = backToBefore.get(sourceAfter.toLowerCase()) ?? sourceAfter;
        return rewriteLinksForMoves(tab.content, { sourceBefore, sourceAfter, moves: plan.moves, before: plan.before });
      };
      const rewritten = tabsRef.current.filter((tab) => unsaved.has(key(tab.filePath)) && rewrite(tab) !== tab.content);
      const rewrittenTabs = rewritten.length;
      for (const tab of rewritten) quickSaveRef.current.add(tab.filePath);
      // Decided against each tab's text at update time: a clean tab shows the file's new text; one with unsaved text
      // (from before, or typed while the rewrite ran) keeps it, rewritten the same way, for autosave to write.
      setTabs((prev) =>
        prev.map((tab) => {
          const fresh = written.get(key(tab.filePath));
          if (fresh !== undefined && tab.content === tab.savedContent) return { ...tab, content: fresh, savedContent: fresh };
          if (fresh === undefined && !unsaved.has(key(tab.filePath))) return tab;
          const content = rewrite(tab);
          return content === tab.content ? tab : { ...tab, content };
        })
      );
      const count = result.changed.length + rewrittenTabs;
      if (result.failed.length > 0) setLinkNotice(t("shell.files.linksNotUpdated"));
      else if (count > 0) setLinkNotice(t("shell.files.linksUpdated", { count }));
    } catch {
      setLinkNotice(t("shell.files.linksNotUpdated"));
    }
  };

  const handleRenameCurrentFile = useCallback(async (newName: string) => {
    if (!window.electronAPI || !currentTab) return;
    const oldPath = currentTab.filePath;
    // Either separator: Windows paths from the file listing end in `\name`.
    const cut = Math.max(oldPath.lastIndexOf("/"), oldPath.lastIndexOf("\\"));
    const dir = oldPath.substring(0, cut);
    const oldFileName = oldPath.substring(cut + 1);
    const ext = oldFileName.match(/\.(md|markdown)$/i)?.[0] || ".md";
    const newFileName = newName + ext;
    const newPath = `${dir}${oldPath[cut] ?? "/"}${newFileName}`;
    if (newPath === oldPath) return;
    const success = await window.electronAPI.rename(oldPath, newPath);
    if (success) {
      handleFileRename(oldPath, newPath);
      // Update file order
      setFileOrder((prev) => {
        if (!prev[dir]) return prev;
        const updated = prev[dir].map((n) => n === oldFileName ? newFileName : n);
        return { ...prev, [dir]: updated };
      });
      setSidebarRefresh((k) => k + 1);
    }
  }, [currentTab, handleFileRename]);

  const handleMoveFile = useCallback(async (sourcePath: string, destDir: string) => {
    if (!window.electronAPI) return;
    const name = sourcePath.split(/[\\/]/).pop() || "";
    const newPath = `${destDir}/${name}`;
    if (newPath === sourcePath) return;
    const success = await window.electronAPI.rename(sourcePath, newPath);
    if (success) {
      handleFileRename(sourcePath, newPath);
    }
  }, [handleFileRename]);

  const handleContentChange = useCallback((newContent: string) => {
    if (!activeTab) return;
    setTabs((prev) =>
      prev.map((t) =>
        t.filePath === activeTab ? { ...t, content: newContent } : t
      )
    );
  }, [activeTab]);

  const handleSplitContentChange = useCallback((newContent: string) => {
    if (!splitTab) return;
    setTabs((prev) =>
      prev.map((t) =>
        t.filePath === splitTab ? { ...t, content: newContent } : t
      )
    );
  }, [splitTab]);

  const handleSplitRight = useCallback((filePath?: string) => {
    if (filePath) {
      // Open specific file in split
      setSplitTab(filePath);
    } else if (activeTab) {
      // Toggle split with current tab — if already split, close it
      if (splitTab) {
        setSplitTab(null);
      }
    }
  }, [activeTab, splitTab]);

  const handleCloseSplit = useCallback(() => {
    setSplitTab(null);
  }, []);

  const handleEditorContextMenu = useCallback((e: React.MouseEvent) => {
    // Only show on right-click in the editor area, not on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest(".md-checkbox") || target.closest(".md-table-checkbox") || target.closest("button") || target.closest("a")) return;
    e.preventDefault();
    setEditorContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const getEditorContextMenuItems = useCallback((): ContextMenuItem[] => {
    if (!activeTab) return [];
    const currentFileMode = fileViewModes[activeTab];
    const items: ContextMenuItem[] = [
      {
        label: `${t("desktop.editorMenu.defaultLive")}${currentFileMode === "live" ? " ✓" : ""}`,
        onClick: () => {
          setFileViewModes((prev) => ({ ...prev, [activeTab]: "live" }));
          setViewMode("live");
        },
      },
      {
        label: `${t("desktop.editorMenu.defaultSource")}${currentFileMode === "source" ? " ✓" : ""}`,
        onClick: () => {
          setFileViewModes((prev) => ({ ...prev, [activeTab]: "source" }));
          setViewMode("source");
        },
      },
      {
        label: `${t("desktop.editorMenu.defaultView")}${currentFileMode === "view" ? " ✓" : ""}`,
        onClick: () => {
          setFileViewModes((prev) => ({ ...prev, [activeTab]: "view" }));
          setViewMode("view");
        },
      },
      {
        label: t("desktop.editorMenu.clearDefault"),
        onClick: () => {
          setFileViewModes((prev) => {
            const next = { ...prev };
            delete next[activeTab!];
            return next;
          });
        },
      },
      { label: "", separator: true, onClick: () => {} },
      {
        label: t("shell.tabs.openInSplit"),
        onClick: () => handleSplitRight(activeTab),
      },
      { label: "", separator: true, onClick: () => {} },
      {
        label: focusMode ? t("desktop.editorMenu.exitFocusMode") : t("desktop.editorMenu.focusMode"),
        onClick: () => setFocusMode((f) => !f),
      },
      {
        label: zenMode ? t("desktop.editorMenu.exitZenMode") : t("desktop.editorMenu.zenMode"),
        onClick: () => setZenMode((z) => !z),
      },
    ];
    return items;
  }, [activeTab, fileViewModes, focusMode, zenMode, handleSplitRight]);

  const handleSave = useCallback(async () => {
    if (!window.electronAPI || !currentTab) return;

    // Auto-update TOC blocks before saving
    let contentToSave = currentTab.content;
    if (hasTocBlock(contentToSave)) {
      contentToSave = updateTocBlocks(contentToSave);
      if (contentToSave !== currentTab.content) {
        handleContentChange(contentToSave);
      }
    }

    // Save snapshot for file recovery
    if (activeVault) {
      try { saveSnapshot(activeVault.path, currentTab.filePath, contentToSave); } catch {}
    }
    const success = await window.electronAPI.writeFile(currentTab.filePath, contentToSave);
    if (success) {
      setTabs((prev) =>
        prev.map((t) =>
          t.filePath === currentTab.filePath ? { ...t, savedContent: t.content } : t
        )
      );
      // Sync on save if enabled
      if (settings.syncOnSave && activeVault?.gitRemote) {
        performSync();
      }
    }
  }, [currentTab, settings.syncOnSave, activeVault, performSync]);

  const handleSaveAs = useCallback(async () => {
    if (!window.electronAPI) return;
    const defaultPath = currentTab?.filePath || (activeVault ? `${activeVault.path}/untitled.md` : "untitled.md");
    const filePath = await window.electronAPI.saveFileDialog(defaultPath);
    if (!filePath) return;

    const contentToSave = currentTab?.content || "";
    const success = await window.electronAPI.writeFile(filePath, contentToSave);
    if (success) {
      // Replace current tab or add new
      if (currentTab) {
        setTabs((prev) =>
          prev.map((t) =>
            t.filePath === currentTab.filePath
              ? { filePath, content: contentToSave, savedContent: contentToSave }
              : t
          )
        );
        setActiveTab(filePath);
      }
    }
  }, [currentTab, activeVault]);

  const handleNewFile = useCallback(async () => {
    if (!window.electronAPI || !activeVault) return;
    // Find a unique filename
    // In the interface language ("Untitled", "Chưa đặt tên").
    const base = t("files.untitled");
    let name = `${base}.md`;
    let counter = 1;
    const existing = await window.electronAPI.readDir(activeVault.path);
    const existingNames = existing.map((e) => e.name);
    while (existingNames.includes(name)) {
      counter++;
      name = `${base} ${counter}.md`;
    }
    const filePath = `${activeVault.path}/${name}`;
    await window.electronAPI.createFile(filePath);
    setTabs((prev) => [...prev, { filePath, content: "", savedContent: "" }]);
    setActiveTab(filePath);
    setSidebarRefresh((k) => k + 1);
  }, [activeVault]);

  const handleNewFolder = useCallback(async () => {
    if (!window.electronAPI || !activeVault) return;
    // Find a unique folder name
    const folderBase = t("files.newFolder");
    let name = folderBase;
    let counter = 1;
    const existing = await window.electronAPI.readDir(activeVault.path);
    const existingNames = existing.map((e) => e.name);
    while (existingNames.includes(name)) {
      counter++;
      name = `${folderBase} ${counter}`;
    }
    const dirPath = `${activeVault.path}/${name}`;
    await window.electronAPI.createDir(dirPath);
    setSidebarRefresh((k) => k + 1);
  }, [activeVault]);

  const handleOpenFile = useCallback(async () => {
    if (!window.electronAPI) return;
    const result = await window.electronAPI.openFile();
    if (result) openFile(result.filePath);
  }, [openFile]);

  // ============================================================
  // Additional actions
  // ============================================================

  const handleCloseAllTabs = useCallback(() => {
    setTabs((prev) => {
      const remaining = prev.filter((t) => pinnedTabs.has(t.filePath));
      if (activeTab && !pinnedTabs.has(activeTab)) {
        setActiveTab(remaining[0]?.filePath || null);
      }
      return remaining;
    });
  }, [pinnedTabs, activeTab]);

  const handleCloseOtherTabs = useCallback(() => {
    if (!activeTab) return;
    setTabs((prev) => prev.filter((t) => t.filePath === activeTab || pinnedTabs.has(t.filePath)));
  }, [activeTab, pinnedTabs]);

  const handleDeleteFile = useCallback(async () => {
    if (!window.electronAPI || !currentTab || !activeVault) return;
    const success = await trashFile(activeVault.path, currentTab.filePath);
    if (success) {
      closeTab(currentTab.filePath);
      setSidebarRefresh((k) => k + 1);
    }
  }, [currentTab, closeTab, activeVault]);

  // Sync conflict copies ("<name> (conflict …).md", see commands_git.rs): the banner above the editor compares the
  // open copy with its original and resolves. The original sits next to the copy, so its absolute path is derived
  // from the copy's own path.
  const conflictOriginalAbs = useCallback(
    (copyAbs: string) => parseConflictCopy(copyAbs)?.originalPath ?? null,
    []
  );
  const loadConflictOriginal = useCallback(async () => {
    const abs = currentTab ? conflictOriginalAbs(currentTab.filePath) : null;
    if (!abs || !window.electronAPI) return null;
    return (await window.electronAPI.readFile(abs)) ?? null;
  }, [currentTab, conflictOriginalAbs]);
  const useConflictCopy = useCallback(async () => {
    if (!window.electronAPI || !currentTab) return;
    const abs = conflictOriginalAbs(currentTab.filePath);
    if (!abs) return;
    const copyContent = currentTab.content;
    if (!(await window.electronAPI.writeFile(abs, copyContent))) return;
    setTabs((prev) => prev.map((t) => (t.filePath === abs ? { ...t, content: copyContent, savedContent: copyContent } : t)));
    await handleDeleteFile();
    await openFile(abs);
  }, [currentTab, conflictOriginalAbs, handleDeleteFile, openFile]);

  const handleTrashFileFromSidebar = useCallback(async (filePath: string) => {
    if (!activeVault) return;
    const success = await trashFile(activeVault.path, filePath);
    if (success) {
      handleFileDelete(filePath);
      setSidebarRefresh((k) => k + 1);
    }
  }, [activeVault, handleFileDelete]);

  const handleToggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  const handleZenMode = useCallback(() => {
    setZenMode((z) => !z);
    if (!zenMode) {
      setSidebarCollapsed(true);
    }
  }, [zenMode]);

  /** A line to jump to once its file is open in the editor (a search result), or a heading/block a link names. */
  const pendingJumpRef = useRef<{ filePath: string; line?: number; anchor?: Anchor } | null>(null);
  const jumpIfPending = useCallback(() => {
    const pending = pendingJumpRef.current;
    const view = editorViewRef.current;
    if (!pending || !view || activeTabRef.current !== pending.filePath) return;
    const target = pending.line ?? (pending.anchor ? anchorLine(view.state.doc.toString(), pending.anchor) : null);
    // The editor may still hold the previous note's text: keep the jump for when this note's text arrives.
    if (!target) return;
    pendingJumpRef.current = null;
    const line = view.state.doc.line(Math.min(Math.max(target, 1), view.state.doc.lines));
    view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
    view.focus();
  }, []);
  const handleEditorViewReady = useCallback((view: EditorView) => {
    editorViewRef.current = view;
    jumpIfPending();
  }, [jumpIfPending]);
  const openFileAtLine = useCallback(
    async (filePath: string, line?: number, anchor?: Anchor) => {
      if (line !== undefined || anchor) pendingJumpRef.current = { filePath, line, anchor };
      await openFile(filePath);
      // The editor may already be showing this file (no new view): try now, then once the content has landed.
      setTimeout(jumpIfPending, 50);
    },
    [openFile, jumpIfPending]
  );

  /**
   * Opens what a `[[link]]` names: the note (resolved from the open note, like the editor's links), at the heading or
   * block after `#` when there is one; `[[#Heading]]` jumps within the open note.
   */
  const openWikilinkTarget = useCallback(
    async (raw: string) => {
      if (!window.electronAPI || !activeVault) return;
      const parsed = parseLinkTarget(raw);
      const anchor = parsed.heading || parsed.block ? { heading: parsed.heading, block: parsed.block } : undefined;
      const current = activeTabRef.current;
      if (!parsed.note) {
        if (anchor && current) {
          pendingJumpRef.current = { filePath: current, anchor };
          jumpIfPending();
        }
        return;
      }
      const files = await window.electronAPI.listAllFiles(activeVault.path);
      const rels = files.map((f) => relativeVaultPath(activeVault.path, f.filePath));
      const from = current ? relativeVaultPath(activeVault.path, current) : "";
      const path = resolveLinkTarget(parsed.note, from, rels);
      const match = path ? files[rels.indexOf(path)] : undefined;
      if (match) await openFileAtLine(match.filePath, undefined, anchor);
    },
    [activeVault, openFileAtLine, jumpIfPending]
  );

  // `![[…]]` embeds read notes through this window: an open tab's text (unsaved edits included), else the file.
  // `![[pic.png]]` is loaded like the editor's local images.
  const embedStateRef = useRef({ openWikilinkTarget });
  embedStateRef.current = { openWikilinkTarget };
  useEffect(() => {
    if (!activeVault) return;
    const vaultPath = activeVault.path;
    const images = createDesktopImageLoader(vaultPath);
    // The vault's file list, kept until notes change (the vault watcher bumps the embed version): a page of embeds
    // lists the vault once, not once per embed.
    let listing: { version: number; files: Promise<{ filePath: string }[]> } | null = null;
    const vaultFiles = () => {
      if (!listing || listing.version !== getEmbedVersion()) {
        listing = { version: getEmbedVersion(), files: window.electronAPI.listAllFiles(vaultPath) };
      }
      return listing.files;
    };
    setEmbedSource({
      async load(note) {
        if (!window.electronAPI) return null;
        if (/\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i.test(note)) {
          const abs = images.resolve(note);
          const data = abs ? await images.load(abs) : null;
          const ext = note.slice(note.lastIndexOf(".") + 1).toLowerCase();
          const mime = ext === "svg" ? "image/svg+xml" : ext === "jpg" ? "image/jpeg" : `image/${ext}`;
          return data ? { image: `data:${mime};base64,${data}` } : null;
        }
        const files = await vaultFiles();
        const rels = files.map((f) => relativeVaultPath(vaultPath, f.filePath));
        const current = activeTabRef.current;
        const from = current ? relativeVaultPath(vaultPath, current) : "";
        const path = resolveLinkTarget(note || from, from, rels);
        if (!path) return null;
        const file = files[rels.indexOf(path)].filePath;
        const key = (p: string) => toPosixPath(p).toLowerCase();
        const tab = tabsRef.current.find((t) => !t.kind && key(t.filePath) === key(file));
        const content = tab ? tab.content : await window.electronAPI.readFile(file);
        return content === null ? null : { path, content };
      },
      open: (target) => void embedStateRef.current.openWikilinkTarget(target),
    });
    return () => setEmbedSource(null);
  }, [activeVault]);

  // Wiki link click handler — global mousedown capture
  useEffect(() => {
    const handleWikiClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest(".md-wikilink, .wl-link, [data-target]") as HTMLElement | null;
      if (!link) return;

      const linkTarget = link.getAttribute("data-target") || link.textContent?.trim();
      if (!linkTarget || !window.electronAPI || !activeVault) return;

      e.stopImmediatePropagation();
      e.preventDefault();
      void openWikilinkTarget(linkTarget);
    };

    document.addEventListener("mousedown", handleWikiClick, true);
    return () => document.removeEventListener("mousedown", handleWikiClick, true);
  }, [activeVault, openWikilinkTarget]);

  // External link click handler — open in system browser
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a.md-link") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        (!href.startsWith("http://") &&
          !href.startsWith("https://") &&
          !href.startsWith("mailto:"))
      )
        return;

      e.preventDefault();
      e.stopImmediatePropagation();
      window.electronAPI?.openExternal(href);
    };

    document.addEventListener("click", handleLinkClick, true);
    return () => document.removeEventListener("click", handleLinkClick, true);
  }, []);



  // Insert TOC placeholder
  const handleInsertToc = useCallback(() => {
    const view = editorViewRef.current;
    if (!view) return;
    insertAtCursor(view, insertTocPlaceholder());
  }, []);

  // Insert auto-updating TOC block
  const handleInsertTocBlock = useCallback(() => {
    const view = editorViewRef.current;
    if (!view) return;
    insertAtCursor(view, generateTocBlock(content));
  }, [content]);

  // Update existing TOC blocks
  const handleUpdateToc = useCallback(() => {
    if (!currentTab || !hasTocBlock(content)) return;
    const updated = updateTocBlocks(content);
    if (updated !== content) {
      handleContentChange(updated);
    }
  }, [content, currentTab, handleContentChange]);

  // Insert dataview query template
  // Toggle focus/typewriter mode
  const handleFocusMode = useCallback(() => {
    setFocusMode((f) => !f);
  }, []);

  // Publish note as HTML (show preview first)
  const handlePublish = useCallback(() => {
    if (!currentTab) return;
    setShowPublish(true);
  }, [currentTab]);

  const handleHeadingClick = useCallback((line: number) => {
    const view = editorViewRef.current;
    if (!view) return;
    const docLine = view.state.doc.line(line);
    view.dispatch({
      selection: { anchor: docLine.from },
      scrollIntoView: true,
    });
    view.focus();
  }, []);

  const handleCommandExecute = useCallback((action: HotkeyAction) => {
    const view = editorViewRef.current;
    const actions: Record<HotkeyAction, () => void> = {
      save: handleSave,
      saveAs: handleSaveAs,
      newFile: handleNewFile,
      newFolder: handleNewFolder,
      openFile: handleOpenFile,
      closeTab: () => { if (activeTab) closeTab(activeTab); },
      closeAllTabs: handleCloseAllTabs,
      closeOtherTabs: handleCloseOtherTabs,
      deleteFile: handleDeleteFile,
      nextTab: () => {
        if (tabs.length < 2) return;
        const idx = tabs.findIndex((t) => t.filePath === activeTab);
        setActiveTab(tabs[(idx + 1) % tabs.length].filePath);
      },
      prevTab: () => {
        if (tabs.length < 2) return;
        const idx = tabs.findIndex((t) => t.filePath === activeTab);
        setActiveTab(tabs[(idx - 1 + tabs.length) % tabs.length].filePath);
      },
      quickOpen: () => setShowQuickOpen(true),
      commandPalette: () => {},
      findInFile: () => {},
      findInVault: () => setShowVaultSearch(true),
      toggleSidebar: handleToggleSidebar,
      toggleViewMode: () => setViewMode((m) => m === "live" ? "view" : m === "view" ? "source" : "live"),
      toggleFullscreen: handleToggleFullscreen,
      zenMode: handleZenMode,
      settings: () => setShowSettings(true),
      undo: () => {},
      redo: () => {},
      toggleBold: () => { if (view) wrapSelection(view, "**", "**"); },
      toggleItalic: () => { if (view) wrapSelection(view, "*", "*"); },
      toggleCode: () => { if (view) wrapSelection(view, "`", "`"); },
      toggleStrikethrough: () => { if (view) wrapSelection(view, "~~", "~~"); },
      insertLink: () => { if (view) editorInsertLink(view); },
      insertImage: () => { if (view) editorInsertImage(view); },
      insertHorizontalRule: () => { if (view) editorInsertHR(view); },
      insertCodeBlock: () => { if (view) editorInsertCodeBlock(view); },
      insertBlockquote: () => { if (view) editorInsertBlockquote(view); },
      insertTaskList: () => { if (view) editorInsertTaskList(view); },
      insertTable: () => { if (view) editorInsertTable(view); },
      gitSync: handleGitSync,
      toggleOutline: () => setShowOutline((o) => !o),
      toggleBacklinks: () => setShowBacklinks((b) => !b),
      toggleOutgoingLinks: () => setShowOutgoing((o) => !o),
      toggleProperties: () => setShowProperties((p) => !p),
      toggleTags: () => setShowTagPane((t) => !t),
      toggleBookmark: () => { if (activeTab) setBookmarks((b) => toggleBookmark(b, activeTab)); },
      randomNote: async () => { if (activeVault) { const f = await getRandomNote(activeVault.path); if (f) openFile(f); } },
      fileRecovery: () => setShowFileRecovery(true),
      exportPDF: () => { if (currentTab && !currentTab.kind) exportToPDF(content, baseName(currentTab.filePath).replace(/\.md$/i, "") || "note", { columnLayout: settings.pdfColumnLayout, chessboardWidthPercent: settings.pdfChessboardWidth }); },
      attachments: () => setShowAttachments(true),
      pluginManager: () => setShowPluginManager(true),
      cssSnippets: () => setShowCSSSnippets(true),
      insertToc: handleInsertToc,
      updateToc: handleUpdateToc,
      focusMode: handleFocusMode,
      publishNote: handlePublish,
      startCollab: () => setShowCollab(true),
      openTrash: () => setShowTrash(true),
      importFromApp: () => setShowAppImport(true),
      togglePinTab: () => { if (activeTab) handleTogglePin(activeTab); },
      splitEditor: () => { if (activeTab) handleSplitRight(activeTab); },
      closeSplit: handleCloseSplit,
    };
    actions[action]?.();
  }, [handleSave, handleSaveAs, handleNewFile, handleNewFolder, handleOpenFile, activeTab, tabs, closeTab, handleCloseAllTabs, handleCloseOtherTabs, handleDeleteFile, handleGitSync, handleToggleFullscreen, handleToggleSidebar, handleZenMode, activeVault, openFile, content, currentTab, handleInsertToc, handleUpdateToc, handleFocusMode, handlePublish, handleTogglePin, handleSplitRight, handleCloseSplit]);

  // ============================================================
  // Recent commands handler
  // ============================================================

  const handleRecentCommand = useCallback((action: HotkeyAction) => {
    setRecentCommands((prev) => {
      const filtered = prev.filter((a) => a !== action);
      const updated = [action, ...filtered].slice(0, 5);
      try {
        localStorage.setItem("noteriv-recent-commands", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  // ============================================================
  // Hotkey settings persistence
  // ============================================================

  const handleHotkeysChange = useCallback(async (newHotkeys: HotkeyBinding[]) => {
    setHotkeys(newHotkeys);
    if (window.electronAPI) {
      const stored = await window.electronAPI.loadSettings();
      stored.hotkeys = hotkeysToPersist(newHotkeys);
      await window.electronAPI.saveSettings(stored);
    }
  }, []);

  const handleSettingsChange = useCallback(async (newSettings: AppSettings) => {
    settingsRef.current = newSettings;
    setSettings(newSettings);
    applySettings(newSettings);
    // Apply theme if changed
    if (newSettings.theme) {
      const allBuiltIn = BUILT_IN_THEMES;
      const theme = allBuiltIn.find((t) => t.id === newSettings.theme);
      if (theme) applyTheme(theme);
      // Also check custom themes
      if (!theme && activeVault) {
        loadCustomThemes(activeVault.path).then((customs) => {
          const custom = customs.find((t) => t.id === newSettings.theme);
          if (custom) applyTheme(custom);
        });
      }
    }
    if (window.electronAPI) {
      const stored = await window.electronAPI.loadSettings();
      const { ...appFields } = newSettings;
      await window.electronAPI.saveSettings({ ...stored, ...appFields });
    }
  }, [activeVault]);

  const adjustEditorFontSize = useCallback((delta: number) => {
    const currentSettings = settingsRef.current;
    const fontSize = Math.max(11, Math.min(24, currentSettings.fontSize + delta));
    if (fontSize !== currentSettings.fontSize) {
      const nextSettings = { ...currentSettings, fontSize };
      settingsRef.current = nextSettings;
      setSettings(nextSettings);
      applySettings(nextSettings);

      if (fontSizeSaveRef.current) clearTimeout(fontSizeSaveRef.current);
      fontSizeSaveRef.current = setTimeout(async () => {
        if (!window.electronAPI) return;
        const stored = await window.electronAPI.loadSettings();
        await window.electronAPI.saveSettings({ ...stored, ...nextSettings });
      }, 250);
    }
  }, []);

  // ============================================================
  // Keyboard shortcuts (driven by configurable hotkeys)
  // ============================================================

  const getKeys = useCallback((action: HotkeyAction): string => {
    return hotkeys.find((h) => h.action === action)?.keys ?? "";
  }, [hotkeys]);

  useEffect(() => {
    if (appState !== "app") return;
    // Don't capture hotkeys when a modal is open (settings handles its own)
    if (showSettings) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const view = editorViewRef.current;

      // Support both the main keyboard and numpad variants. Tauri does not
      // provide browser zoom controls, so these adjust the editor font size.
      const primaryModifier = e.ctrlKey || e.metaKey;
      const zoomIn = e.key === "+" || e.key === "=" || e.code === "NumpadAdd";
      const zoomOut = e.key === "-" || e.code === "NumpadSubtract";
      if (primaryModifier && !e.altKey && (zoomIn || zoomOut)) {
        e.preventDefault();
        adjustEditorFontSize(zoomIn ? 1 : -1);
        return;
      }

      // Map actions to handlers
      const actions: Record<HotkeyAction, () => void> = {
        // File
        save: handleSave,
        saveAs: handleSaveAs,
        newFile: handleNewFile,
        newFolder: handleNewFolder,
        openFile: handleOpenFile,
        closeTab: () => { if (activeTab) closeTab(activeTab); },
        closeAllTabs: handleCloseAllTabs,
        closeOtherTabs: handleCloseOtherTabs,
        deleteFile: handleDeleteFile,
        // Navigation
        nextTab: () => {
          if (tabs.length < 2) return;
          const idx = tabs.findIndex((t) => t.filePath === activeTab);
          setActiveTab(tabs[(idx + 1) % tabs.length].filePath);
        },
        prevTab: () => {
          if (tabs.length < 2) return;
          const idx = tabs.findIndex((t) => t.filePath === activeTab);
          setActiveTab(tabs[(idx - 1 + tabs.length) % tabs.length].filePath);
        },
        quickOpen: () => setShowQuickOpen(true),
        commandPalette: () => setShowCommandPalette(true),
        // Search
        findInFile: () => {}, // Handled by CodeMirror
        findInVault: () => setShowVaultSearch(true),
        // View
        toggleSidebar: handleToggleSidebar,
        toggleViewMode: () => setViewMode((m) => m === "live" ? "view" : m === "view" ? "source" : "live"),
        toggleFullscreen: handleToggleFullscreen,
        zenMode: handleZenMode,
        settings: () => setShowSettings(true),
        // Edit
        undo: () => {}, // Handled by CodeMirror
        redo: () => {}, // Handled by CodeMirror
        // Formatting
        toggleBold: () => { if (view) wrapSelection(view, "**", "**"); },
        toggleItalic: () => { if (view) wrapSelection(view, "*", "*"); },
        toggleCode: () => { if (view) wrapSelection(view, "`", "`"); },
        toggleStrikethrough: () => { if (view) wrapSelection(view, "~~", "~~"); },
        insertLink: () => { if (view) editorInsertLink(view); },
        insertImage: () => { if (view) editorInsertImage(view); },
        insertHorizontalRule: () => { if (view) editorInsertHR(view); },
        insertCodeBlock: () => { if (view) editorInsertCodeBlock(view); },
        insertBlockquote: () => { if (view) editorInsertBlockquote(view); },
        insertTaskList: () => { if (view) editorInsertTaskList(view); },
        insertTable: () => { if (view) editorInsertTable(view); },
        // Sync
        gitSync: handleGitSync,
        // Daily notes
        // Outline
        toggleOutline: () => setShowOutline((o) => !o),
        // New features
        toggleBacklinks: () => setShowBacklinks((b) => !b),
        toggleOutgoingLinks: () => setShowOutgoing((o) => !o),
        toggleProperties: () => setShowProperties((p) => !p),
        toggleTags: () => setShowTagPane((t) => !t),
        toggleBookmark: () => { if (activeTab) setBookmarks((b) => toggleBookmark(b, activeTab)); },
        randomNote: async () => { if (activeVault) { const f = await getRandomNote(activeVault.path); if (f) openFile(f); } },
        fileRecovery: () => setShowFileRecovery(true),
        exportPDF: () => { if (currentTab && !currentTab.kind) exportToPDF(content, baseName(currentTab.filePath).replace(/\.md$/i, "") || "note", { columnLayout: settings.pdfColumnLayout, chessboardWidthPercent: settings.pdfChessboardWidth }); },
        attachments: () => setShowAttachments(true),
        pluginManager: () => setShowPluginManager(true),
        cssSnippets: () => setShowCSSSnippets(true),
        insertToc: handleInsertToc,
        updateToc: handleUpdateToc,
        focusMode: handleFocusMode,
        publishNote: handlePublish,
        startCollab: () => setShowCollab(true),
        openTrash: () => setShowTrash(true),
        importFromApp: () => setShowAppImport(true),
        togglePinTab: () => { if (activeTab) handleTogglePin(activeTab); },
        splitEditor: () => { if (activeTab) handleSplitRight(activeTab); },
        closeSplit: handleCloseSplit,
      };

      for (const binding of hotkeys) {
        // Skip empty bindings and actions handled by CodeMirror natively
        if (!binding.keys) continue;
        if (binding.action === "findInFile" || binding.action === "undo" || binding.action === "redo") continue;

        if (matchesHotkey(e, binding.keys)) {
          e.preventDefault();
          actions[binding.action]?.();
          return;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [appState, hotkeys, handleSave, handleSaveAs, handleNewFile, handleNewFolder, handleOpenFile, activeTab, tabs, closeTab, showSettings, handleCloseAllTabs, handleCloseOtherTabs, handleDeleteFile, handleGitSync, handleToggleFullscreen, handleToggleSidebar, handleZenMode, activeVault, openFile, content, currentTab, handleInsertToc, handleUpdateToc, handleFocusMode, handlePublish, handleTogglePin, adjustEditorFontSize]);

  // Electron menu events
  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI || appState !== "app") return;
    const cleanups = [
      window.electronAPI.onMenuSave(handleSave),
      window.electronAPI.onMenuSaveAs(handleSaveAs),
      window.electronAPI.onMenuNewFile(handleNewFile),
      window.electronAPI.onMenuOpenFile(handleOpenFile),
      window.electronAPI.onMenuSettings(() => setShowSettings(true)),
    ];
    return () => cleanups.forEach((fn) => fn());
  }, [appState, handleSave, handleSaveAs, handleNewFile, handleOpenFile]);

  // Folder opening must also work before the first vault has been configured.
  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) return;
    return window.electronAPI.onMenuOpenFolder(handleOpenFolderAsVault);
  }, [handleOpenFolderAsVault]);

  // ============================================================
  // Core plugins (Plugin API v1, trusted tier): dynamic import, state in .noteriv/plugin-config.json
  // ============================================================

  const corePluginConfig = useMemo(
    () => (vaultAdapter && activeVaultPath ? desktopCorePluginConfig(activeVaultPath, vaultAdapter) : null),
    [vaultAdapter, activeVaultPath]
  );
  const corePluginHost = useCorePluginHost(corePluginConfig, {
    editor: {
      getContent: () => (activeTabRef.current ? contentRef.current : null),
      setContent: (next) => {
        const view = editorViewRef.current;
        if (view) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } }); markPluginEdit();
      },
      insertAtCursor: (text) => {
        const view = editorViewRef.current;
        if (!view) return;
        const pos = view.state.selection.main.head;
        view.dispatch({ changes: { from: pos, insert: text }, selection: { anchor: pos + text.length } }); markPluginEdit();
      },
      getSelection: () => {
        const view = editorViewRef.current;
        if (!view) return "";
        return view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
      },
      replaceSelection: (text) => {
        const view = editorViewRef.current;
        if (view) view.dispatch(view.state.replaceSelection(text)); markPluginEdit();
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
    },
    getCurrentFile: () => (activeTabRef.current && activeVaultPath ? relativeVaultPath(activeVaultPath, activeTabRef.current) : null),
    openFile: async (path) => {
      const ref = (await vaultAdapter?.listNotes())?.find((n) => n.path === path);
      if (ref) {
        await openFile(ref.id);
        return true;
      }
      // Not a note: a file a plugin shows itself (a .canvas or .drawing it just created).
      if (!activeVaultPath || !(await vaultAdapter?.fileExists?.(path))) return false;
      const sep = activeVaultPath.includes("\\") ? "\\" : "/";
      await openFile(`${activeVaultPath.replace(/[\\/]+$/, "")}${sep}${toPosixPath(path).split("/").join(sep)}`);
      setSidebarRefresh((k) => k + 1);
      return true;
    },
    onVaultChanged: () => setSidebarRefresh((k) => k + 1),
    // `vault.edit` (views, …): a note open in a tab is changed there.
    editNote: editNoteInTabs,
  });
  const corePlugins = useCorePlugins(corePluginHost.host);
  useCorePluginHotkeys(corePlugins.contributions.commands);
  // Core plugins' markdown post-processors run over each rendered piece of a note.
  useEffect(() => {
    const host = corePluginHost.host;
    if (!host) return;
    setPostProcessorRunner((el, ctx) => host.runPostProcessors(el, ctx));
    return () => setPostProcessorRunner(null);
  }, [corePluginHost.host]);

  // Core plugin file views (Board…) replace the editor of the tabs they match, except in source mode.
  const fileViewFor = (filePath: string, text: string) =>
    matchFileView(corePlugins.contributions.fileViews, relativeVaultPath(activeVaultPath, filePath), text);
  fileViewForTabRef.current = fileViewFor;
  const mainFileView = currentTab && !currentTab.kind && viewMode !== "source" ? fileViewFor(currentTab.filePath, content) : undefined;
  const splitFileView = splitTabState && viewMode !== "source" ? fileViewFor(splitTabState.filePath, splitContent) : undefined;

  // App events for core plugins. Text tabs only: canvas/drawing/PDF tabs have no editor content.
  const coreEventTab = currentTab && !currentTab.kind ? currentTab.filePath : null;
  useEffect(() => {
    if (coreEventTab && activeVaultPath) corePluginHost.host?.emit("file-open", relativeVaultPath(activeVaultPath, coreEventTab));
  }, [coreEventTab, activeVaultPath, corePluginHost.host]);
  useEffect(() => {
    if (coreEventTab) corePluginHost.host?.emit("editor-change", content);
  }, [content, coreEventTab, corePluginHost.host]);

  // ============================================================
  // Community plugins: same sandboxed iframe host as web (default-deny permissions)
  // ============================================================

  const pluginStore = useMemo(() => (activeVaultPath ? new DesktopPluginStore(activeVaultPath) : null), [activeVaultPath]);
  const refreshCommunityPlugins = useCallback(async () => {
    setCommunityPlugins(pluginStore ? await pluginStore.list() : []);
  }, [pluginStore]);
  useEffect(() => {
    if (appState === "app") void refreshCommunityPlugins();
  }, [appState, refreshCommunityPlugins]);
  const sandboxRecords = useMemo(() => communityPlugins.map(toSandboxRecord), [communityPlugins]);
  const sandboxHost = useSandboxPluginHost({
    sandboxUrl: "/plugin-sandbox.html",
    platform: "desktop",
    appVersion: PLUGIN_APP_VERSION,
    installed: sandboxRecords,
    adapter: vaultAdapter,
    editor: {
      getContent: () => (activeTabRef.current ? contentRef.current : null),
      setContent: (next) => {
        const view = editorViewRef.current;
        if (view) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: next } }); markPluginEdit();
      },
      insertAtCursor: (text) => {
        const view = editorViewRef.current;
        if (!view) return;
        const pos = view.state.selection.main.head;
        view.dispatch({ changes: { from: pos, insert: text }, selection: { anchor: pos + text.length } }); markPluginEdit();
      },
      getSelection: () => {
        const view = editorViewRef.current;
        if (!view) return "";
        return view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
      },
      replaceSelection: (text) => {
        const view = editorViewRef.current;
        if (view) view.dispatch(view.state.replaceSelection(text)); markPluginEdit();
      },
    },
    onVaultMutated: () => setSidebarRefresh((n) => n + 1),
    saveSettings: async (id, data) => {
      await pluginStore?.saveSettings(id, data);
      await refreshCommunityPlugins();
    },
    openFile: async (path) => {
      const ref = (await vaultAdapter?.listNotes())?.find((n) => n.path === path);
      if (!ref) return false;
      await openFile(ref.id);
      return true;
    },
  });
  const activeSidebarPanel = activePluginPanel
    ? sandboxHost.panels.find((p) => p.kind === "sidebar" && `${p.pluginDbId}:${p.id}` === activePluginPanel) ?? null
    : null;

  // The sandbox's api.editor.* are synchronous, so the host pushes a snapshot instead of answering RPC calls.
  useEffect(() => {
    const view = editorViewRef.current;
    let selection = "";
    let cursor = { line: 0, ch: 0 };
    if (view) {
      const sel = view.state.selection.main;
      selection = view.state.sliceDoc(sel.from, sel.to);
      const line = view.state.doc.lineAt(sel.head);
      cursor = { line: line.number - 1, ch: sel.head - line.from };
    }
    const currentFile = coreEventTab && activeVaultPath ? relativeVaultPath(activeVaultPath, coreEventTab) : null;
    const snapshot: EditorSnapshot = { content: coreEventTab ? content : null, selection, cursor, currentFile };
    sandboxHost.syncEditorState(snapshot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, coreEventTab, activeVaultPath]);
  useEffect(() => {
    if (coreEventTab && activeVaultPath) sandboxHost.emitEvent("file-open", relativeVaultPath(activeVaultPath, coreEventTab));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coreEventTab, activeVaultPath]);
  const prevSandboxContentRef = useRef<{ tab: string | null; content: string }>({ tab: null, content: "" });
  useEffect(() => {
    const prev = prevSandboxContentRef.current;
    if (coreEventTab && prev.tab === coreEventTab && prev.content !== content) sandboxHost.emitEvent("editor-change", content);
    prevSandboxContentRef.current = { tab: coreEventTab, content };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, coreEventTab]);

  // Web clipper: refresh sidebar when a note is clipped
  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI || appState !== "app") return;
    const cleanup = window.electronAPI.onClipperClipped?.(() => {
      setSidebarRefresh((k) => k + 1);
    });
    return () => cleanup?.();
  }, [appState]);

  // ============================================================
  // Render
  // ============================================================

  if (appState === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--text-muted)]">{t("common.loading")}</span>
        </div>
      </div>
    );
  }

  if (appState === "setup" || showSetupWizard) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  return (
    <div className={`flex flex-col h-screen${zenMode ? " zen-mode" : ""}`}>
      {!zenMode && (
        <TitleBar
          tabs={tabInfos}
          activeTab={activeTab}
          vaults={vaults}
          activeVault={activeVault}
          sidebarCollapsed={sidebarCollapsed}
          viewMode={viewMode}
          showViewModes={!currentTab?.kind}
          pinnedTabs={pinnedTabs}
          onTabSelect={setActiveTab}
          onTabClose={closeTab}
          onTabReorder={reorderTabs}
          onToggleSidebar={handleToggleSidebar}
          onViewModeChange={setViewMode}
          onNewFile={handleNewFile}
          onSave={handleSave}
          onOpenSettings={() => setShowSettings(true)}
          onSwitchVault={handleSwitchVault}
          onCreateVault={() => setShowSetupWizard(true)}
          onDeleteVault={handleDeleteVault}
          onTogglePin={handleTogglePin}
          onCloseOtherTabs={handleCloseOtherTabs}
          onCloseAllTabs={handleCloseAllTabs}
          onCloseTabsToRight={(filePath) => {
            setTabs((prev) => {
              const idx = prev.findIndex((t) => t.filePath === filePath);
              if (idx === -1) return prev;
              return prev.filter((t, i) => i <= idx || pinnedTabs.has(t.filePath));
            });
          }}
          onRevealInSidebar={(filePath) => {
            // Expand parent folders and scroll to file
            const sep = filePath.includes("\\") ? "\\" : "/";
            const norm = toPosixPath(filePath);
            const isUnc = filePath.startsWith("\\\\") || norm.startsWith("//");
            const cleanNorm = isUnc ? norm.replace(/^\/+/,"") : norm;
            const parts = cleanNorm.split("/");
            const folders: string[] = [];
            const startIdx = isUnc ? 2 : 1;
            for (let i = startIdx; i < parts.length - 1; i++) {
              const prefix = isUnc ? `${sep}${sep}` : "";
              folders.push(prefix + parts.slice(0, i + 1).join(sep));
            }
            setExpandedFolders((prev) => {
              const next = new Set(prev);
              for (const f of folders) next.add(f);
              return Array.from(next);
            });
            setSidebarCollapsed(false);
            manualSidebarCollapsedRef.current = false;
            sidebarCollapsedRef.current = false;
          }}
          onCopyPath={(filePath) => {
            navigator.clipboard.writeText(filePath);
          }}
          onSplitRight={(filePath) => handleSplitRight(filePath)}
        />
      )}

      <div className="flex flex-1 overflow-hidden">
        {!zenMode && (
          <div className="ribbon">
            <div className="ribbon-top">
              <button className="ribbon-btn" title={t("shell.ribbon.quickOpen")} onClick={() => setShowQuickOpen(true)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
              <button className="ribbon-btn" title={t("shell.ribbon.newNote")} onClick={handleNewFile}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 2h5l3 3v9H4V2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <path d="M8 6v4M6 8h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
              <button className="ribbon-btn" title={t("shell.ribbon.commandPalette")} onClick={() => setShowCommandPalette(true)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 5l4 3-4 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M9 11h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
              <button className="ribbon-btn" title={t("shell.ribbon.search")} onClick={() => setShowVaultSearch(true)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 4h10M3 8h7M3 12h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M14 13l1 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
              {/* Core plugins (daily note, calendar, flashcards, …): everyday tools, so on the top rail. */}
              <CorePluginRibbonButtons
                icons={corePlugins.contributions.ribbonIcons}
                panels={corePlugins.contributions.sidebarPanels}
                openPanels={corePluginHost.openPanels}
                onTogglePanel={corePluginHost.togglePanel}
              />
            </div>
            <div className="ribbon-bottom">
              {/* Community plugin sidebar panels (api.ui.addSidebarPanel). */}
              {sandboxHost.panels
                .filter((p) => p.kind === "sidebar")
                .map((p) => {
                  const key = `${p.pluginDbId}:${p.id}`;
                  return (
                    <button
                      key={key}
                      className="ribbon-btn"
                      title={p.title}
                      onClick={() => {
                        setActivePluginPanel((cur) => (cur === key ? null : key));
                        if (sidebarCollapsedRef.current) handleToggleSidebar();
                      }}
                      style={{ fontSize: 12, fontWeight: 600, ...(activePluginPanel === key ? { color: "var(--accent)" } : {}) }}
                    >
                      {(p.icon && p.icon.length <= 2 ? p.icon : p.title.charAt(0)).toUpperCase()}
                    </button>
                  );
                })}
              <button className="ribbon-btn" title={t("shell.ribbon.settings")} onClick={() => setShowSettings(true)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
        {!zenMode && activeSidebarPanel && !sidebarCollapsed ? (
          <div className="sidebar-root flex flex-col" style={{ width: sidebarWidth, minWidth: sidebarWidth }}>
            <div className="sidebar-header">
              <span className="sidebar-title">{activeSidebarPanel.title}</span>
              <div className="sidebar-actions">
                <button onClick={() => setActivePluginPanel(null)} className="sidebar-btn" title={t("shell.closePanel")}>
                  ×
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-2 py-2">
              <PluginMirror
                html={activeSidebarPanel.html}
                css={activeSidebarPanel.css}
                onEvent={(e) => sandboxHost.sendMirrorEvent(activeSidebarPanel.pluginDbId, "sidebar", activeSidebarPanel.id, e)}
              />
            </div>
          </div>
        ) : !zenMode && (
          <Sidebar
            vault={activeVault}
            currentFile={activeTab}
            onFileSelect={openFile}
            onFileDelete={handleFileDelete}
            onFileRename={handleFileRename}
            onMoveFile={handleMoveFile}
            onNewFile={handleNewFile}
            onNewFolder={handleNewFolder}
            collapsed={sidebarCollapsed}
            width={sidebarWidth}
            onWidthChange={setSidebarWidth}
            onCollapse={handleToggleSidebar}
            expandedFolders={expandedFolders}
            onExpandedFoldersChange={setExpandedFolders}
            fileOrder={fileOrder}
            onFileOrderChange={setFileOrder}
            refreshTrigger={sidebarRefresh}
            onTrashFile={handleTrashFileFromSidebar}
          />
        )}

        {/* Editor */}
        <div className="flex-1 overflow-hidden bg-[var(--bg-primary)] flex flex-col" data-vault-path={activeVault?.path || ""} onContextMenu={handleEditorContextMenu}>
          {currentTab && !currentTab.kind ? (
            <SplitPane
              left={
                <div className="flex flex-col h-full overflow-hidden">
                  <DocumentTitle
                    filePath={currentTab.filePath}
                    onRename={handleRenameCurrentFile}
                  />
                  <ConflictBanner
                    path={relativeVaultPath(activeVaultPath, currentTab.filePath)}
                    content={content}
                    loadOriginal={loadConflictOriginal}
                    onKeepOriginal={handleDeleteFile}
                    onUseThisVersion={useConflictCopy}
                  />
                  {!zenMode && !mainFileView && viewMode !== "source" && (
                    <PropertiesEditor
                      content={content}
                      onChange={(next) => {
                        handleContentChange(next);
                        // A discrete edit, not typing: saved by the 5 s loop rather than the editor auto-save.
                        quickSaveRef.current.add(currentTab.filePath);
                      }}
                      types={propertyTypes.types}
                      onTypeChange={(key, type) => void propertyTypes.setType(key, type)}
                      knownKeys={Object.keys(propertyTypes.types)}
                      collapsed={frontmatterCollapsed}
                      onToggleCollapse={() => setFrontmatterCollapsed((v) => !v)}
                    />
                  )}
                  {!zenMode &&
                    !mainFileView &&
                    viewMode !== "view" && (
                      <FormattingToolbar onAction={handleCommandExecute} />
                    )}
                  <div className="flex-1 overflow-hidden">
                    {mainFileView ? (
                      <CorePluginFileView
                        key={`${mainFileView.key}:${currentTab.filePath}`}
                        view={mainFileView}
                        path={relativeVaultPath(activeVaultPath, currentTab.filePath)}
                        content={content}
                        onChange={handleContentChange}
                      />
                    ) : viewMode === "view" ? (
                      <ReadOnlyView content={content} onChange={handleContentChange} />
                    ) : viewMode === "source" ? (
                      <SourceEditor content={content} onChange={handleContentChange} onViewReady={handleEditorViewReady} adapter={vaultAdapter} wikilinkLabel="path" />
                    ) : (
                      <Editor content={content} onChange={handleContentChange} onViewReady={handleEditorViewReady} adapter={vaultAdapter} wikilinkLabel="path" onImageDrop={onImageDrop} focusMode={focusMode} onWikilinkHover={handleWikilinkHover} onWikilinkLeave={handleWikilinkLeave} />
                    )}
                  </div>
                </div>
              }
              right={
                splitTabState ? (
                  <div className="flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                      <span className="text-xs text-[var(--text-secondary)] truncate">
                        {baseName(splitTabState.filePath)}
                      </span>
                      <button
                        onClick={handleCloseSplit}
                        className="p-0.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                        title={t("shell.closeSplit")}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      {splitFileView ? (
                        <CorePluginFileView
                          key={`${splitFileView.key}:${splitTabState.filePath}`}
                          view={splitFileView}
                          path={relativeVaultPath(activeVaultPath, splitTabState.filePath)}
                          content={splitContent}
                          onChange={handleSplitContentChange}
                        />
                      ) : viewMode === "view" ? (
                        <ReadOnlyView content={splitContent} onChange={handleSplitContentChange} />
                      ) : viewMode === "source" ? (
                        <SourceEditor content={splitContent} onChange={handleSplitContentChange} adapter={vaultAdapter} wikilinkLabel="path" />
                      ) : (
                        <Editor content={splitContent} onChange={handleSplitContentChange} adapter={vaultAdapter} wikilinkLabel="path" onImageDrop={onImageDrop} focusMode={false} />
                      )}
                    </div>
                  </div>
                ) : null
              }
              splitRatio={splitRatio}
              onSplitRatioChange={setSplitRatio}
              direction="horizontal"
            />
          ) : !currentTab ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <p className="text-[var(--text-muted)] text-sm">{t("desktop.noFile")}</p>
                <p className="text-[var(--text-muted)] text-xs">{t("desktop.noFileHint")}</p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={handleNewFile}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    {t("desktop.createNote")}
                  </button>
                  <button
                    onClick={() => setShowQuickOpen(true)}
                    className="text-xs text-[var(--accent)] hover:underline"
                  >
                    {t("desktop.quickOpenNote")}
                  </button>
                </div>
              </div>
            </div>
          ) : currentTab.kind === "image" ? (
            <ImageViewer filePath={currentTab.filePath} />
          ) : currentTab.kind === "pdf" && activeVault ? (
            (() => {
              const file = { target: relativeVaultPath(activeVault.path, currentTab.filePath), name: baseName(currentTab.filePath) };
              const viewer = matchAttachmentViewer(corePlugins.contributions.attachmentViewers, file);
              return viewer ? (
                <CorePluginAttachmentViewer viewer={viewer} target={file.target} name={file.name} onClose={() => closeTab(currentTab.filePath)} />
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-[var(--text-muted)]">
                  {t("desktop.pdfPluginOff")}
                </div>
              );
            })()
          ) : null}
        </div>

        {/* Editor context menu */}
        {editorContextMenu && (
          <ContextMenu
            x={editorContextMenu.x}
            y={editorContextMenu.y}
            items={getEditorContextMenuItems()}
            onClose={() => setEditorContextMenu(null)}
          />
        )}

        {/* Right side panels */}
        {showOutline && currentTab && (
          <OutlinePanel
            content={content}
            onHeadingClick={handleHeadingClick}
            onClose={() => setShowOutline(false)}
          />
        )}
        {showBacklinks && vaultAdapter && currentTab && (
          <BacklinksPanel
            adapter={vaultAdapter}
            noteId={currentTab.filePath}
            onNoteOpen={openFile}
            onClose={() => setShowBacklinks(false)}
            editNote={editNoteInTabs}
          />
        )}
        {showProperties && vaultAdapter && (
          <PropertiesView
            adapter={vaultAdapter}
            types={propertyTypes.types}
            onTypeChange={(key, type) => void propertyTypes.setType(key, type)}
            onTypeRename={(from, to) => void propertyTypes.renameType(from, to)}
            onNoteOpen={openFile}
            onClose={() => setShowProperties(false)}
            editNote={editNoteInTabs}
          />
        )}
        {showOutgoing && vaultAdapter && currentTab && !currentTab.kind && (
          <OutgoingLinksPanel
            adapter={vaultAdapter}
            noteId={currentTab.filePath}
            content={currentTab.content}
            onNoteOpen={openFile}
            onClose={() => setShowOutgoing(false)}
            editNote={editNoteInTabs}
          />
        )}
        <TagPane
          adapter={vaultAdapter}
          onTagClick={() => {}}
          onNoteSelect={openFile}
          visible={showTagPane}
        />
        {(bookmarks.length > 0 || showTagPane) && (
          <BookmarksPanel
            notes={bookmarkedNotes}
            currentNoteId={activeTab}
            onNoteSelect={openFile}
            onBookmarkRemove={(f) => setBookmarks((b) => b.filter((x) => x !== f))}
            labels={{ hint: t("desktop.bookmarks.hint") }}
          />
        )}
        {/* Sidebar panels of core plugins (Lint, …) */}
        <CorePluginSidePanels
          panels={corePlugins.contributions.sidebarPanels}
          open={corePluginHost.openPanels}
          onClose={corePluginHost.togglePanel}
        />
      </div>

      {/* Status bar */}
      {!zenMode && (
        <div className="flex items-center justify-between h-6 px-3 bg-[var(--bg-secondary)] border-t border-[var(--border)] text-[10px] text-[var(--text-muted)] select-none shrink-0">
          <div className="flex items-center gap-3">
            <span>{t(`shell.status.mode.${viewMode}`)}</span>
            {activeVault && <span>{activeVault.name}</span>}
            {activeTab && (
              <span className="truncate max-w-md">
                {activeVault ? activeTab.replace(activeVault.path, "~") : activeTab}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {currentTab && (
              <span className={isDirty ? "text-[var(--yellow)]" : "text-[var(--green)]"}>
                {isDirty ? t("shell.status.unsaved") : t("shell.status.saved")}
              </span>
            )}
            {(activeVault?.gitRemote || settings.extraSyncProvider !== "none") && (
              <button
                onClick={() => performSync()}
                className={`statusbar-sync${syncStatus === "syncing" ? " syncing" : ""}${syncStatus === "error" ? " sync-error" : ""}`}
                title={lastSyncTime ? t("desktop.status.lastSynced", { time: lastSyncTime.toLocaleTimeString() }) : t("desktop.status.clickToSync")}
              >
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className={syncStatus === "syncing" ? "spin" : ""}>
                  <path d="M2 8a6 6 0 0110.5-4M14 8a6 6 0 01-10.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M12 2v3h-3M4 14v-3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {syncStatus === "syncing"
                  ? t("desktop.status.syncing")
                  : syncStatus === "error"
                  ? t("desktop.status.syncFailed")
                  : gitChanges > 0
                  ? t("desktop.status.changes", { count: gitChanges })
                  : lastSyncTime
                  ? t("desktop.status.synced", { time: lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })
                  : t("desktop.status.sync")}
              </button>
            )}
            {currentTab && !currentTab.kind && (
              <>
                <span>{t("shell.status.lines", { count: content.split("\n").length })}</span>
                <span>{t("shell.status.chars", { count: content.length })}</span>
              </>
            )}
            {!currentTab?.kind && (
              <CorePluginStatusItems items={corePlugins.contributions.statusItems} buttonClassName="cursor-pointer hover:text-[var(--text-secondary)]" />
            )}
            {!currentTab?.kind && sandboxHost.statusItems.map((item) => (
              <span
                key={`${item.pluginDbId}:${item.id}`}
                className={item.clickable ? "cursor-pointer hover:text-[var(--text-secondary)]" : ""}
                onClick={item.clickable ? () => sandboxHost.clickStatusItem(item.pluginDbId, item.id) : undefined}
                title={item.title}
              >
                {item.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Settings */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          hotkeys={hotkeys}
          platform={platform}
          vaultPath={activeVault?.path || ""}
          vault={activeVault}
          onSettingsChange={handleSettingsChange}
          onHotkeysChange={handleHotkeysChange}
          onVaultUpdate={(v) => { setActiveVault(v); setVaults((prev) => prev.map((x) => x.id === v.id ? v : x)); }}
          onOpenPlugins={() => { setShowSettings(false); setShowPluginManager(true); }}
          onOpenSnippets={() => { setShowSettings(false); setShowCSSSnippets(true); }}
          corePlugins={corePlugins.plugins}
          onToggleCorePlugin={(id, enabled) => void corePlugins.setEnabled(id, enabled)}
          corePluginSettingsTabs={corePlugins.contributions.settingsTabs}
          onClose={() => setShowSettings(false)}
        />
      )}

      {linkHover && <NoteHoverPreview target={linkHover.target} position={{ x: linkHover.x, y: linkHover.y }} onDismiss={handleWikilinkLeave} />}

      {showAppImport && activeVault && (
        <AppImport
          write={async (result, onProgress, signal) => {
            const report = await writeImportToVault(activeVault.path, result, onProgress, signal);
            setSidebarRefresh((k) => k + 1);
            return report;
          }}
          existingPaths={async () => (await window.electronAPI.listAllFiles(activeVault.path)).map((f) => relativeVaultPath(activeVault.path, f.filePath))}
          onClose={() => setShowAppImport(false)}
          onOpen={(path) => {
            const sep = activeVault.path.includes("\\") ? "\\" : "/";
            void openFile(`${activeVault.path.replace(/[\\/]+$/, "")}${sep}${toPosixPath(path).split("/").join(sep)}`);
          }}
        />
      )}

      {/* Quick open (Ctrl+P) */}
      {showQuickOpen && activeVault && (
        <QuickOpen
          load={listFiles}
          labels={{ placeholder: t("desktop.quickOpen.placeholder"), empty: t("desktop.quickOpen.empty") }}
          onSelect={openFile}
          onClose={() => setShowQuickOpen(false)}
        />
      )}

      {/* Vault search (Ctrl+Shift+F) */}
      {showVaultSearch && activeVault && vaultAdapter && (
        <VaultSearch
          adapter={vaultAdapter}
          onOpen={(ref, line) => void openFileAtLine(ref.id, line)}
          onClose={() => setShowVaultSearch(false)}
          editNote={editNoteInTabs}
        />
      )}

      {/* Command palette (Ctrl+Shift+P) */}
      {showCommandPalette && (
        <CommandPalette<string>
          hotkeys={hotkeys}
          platform={platform}
          recentActions={recentCommands}
          extraItems={corePlugins.contributions.commands.map((c) => ({
            action: `core:${c.key}`,
            label: c.name,
            // Palette shortcut text uses Ctrl; formatHotkey shows it as ⌘ on macOS.
            keys: c.hotkey?.replace(/\bMod\b/, "Ctrl") ?? "",
            category: t("shell.commands.corePlugin"),
          })).concat(sandboxHost.commands.map((c) => ({
            action: `plugin:${c.pluginDbId}:${c.id}`,
            label: c.name,
            keys: "",
            category: t("shell.commands.plugin", { id: c.pluginId }),
          })))}
          onExecute={(action) => {
            if (action.startsWith("core:")) corePlugins.contributions.commands.find((c) => `core:${c.key}` === action)?.run();
            else if (action.startsWith("plugin:")) {
              const [, dbId, ...rest] = action.split(":");
              sandboxHost.runCommand(dbId, rest.join(":"));
            } else handleCommandExecute(action as HotkeyAction);
          }}
          onRecent={(action) => handleRecentCommand(action as HotkeyAction)}
          onClose={() => setShowCommandPalette(false)}
        />
      )}

      {/* File recovery */}
      {showFileRecovery && activeVault && currentTab && (
        <FileRecovery
          vaultPath={activeVault.path}
          currentFile={currentTab.filePath}
          currentContent={content}
          onRestore={(restored) => { handleContentChange(restored); setShowFileRecovery(false); }}
          onClose={() => setShowFileRecovery(false)}
        />
      )}


      {/* Attachment manager */}
      {showAttachments && activeVault && (
        <AttachmentManager
          vaultPath={activeVault.path}
          onInsert={(link) => {
            if (editorViewRef.current) {
              const view = editorViewRef.current;
              const pos = view.state.selection.main.head;
              view.dispatch({ changes: { from: pos, insert: link } });
            }
            setShowAttachments(false);
          }}
          onClose={() => setShowAttachments(false)}
        />
      )}

      {/* Plugin manager */}
      {showPluginManager && activeVault && (
        <PluginManagerModal
          vaultPath={activeVault.path}
          plugins={communityPlugins}
          denied={sandboxHost.deniedPermissions}
          settingsPanels={sandboxHost.panels}
          onPanelEvent={(panel, e) => sandboxHost.sendMirrorEvent(panel.pluginDbId, panel.kind, panel.id, e)}
          onTogglePlugin={async (id, enabled) => {
            await pluginStore?.setEnabled(id, enabled);
            await refreshCommunityPlugins();
          }}
          onGrantPermissions={async (id, permissions) => {
            await pluginStore?.setPermissions(id, permissions);
            sandboxHost.clearDenied(id);
            await refreshCommunityPlugins();
          }}
          onInstallPlugin={async () => {
            if (!window.electronAPI || !pluginStore) return;
            const folder = await window.electronAPI.openFolder();
            if (!folder) return;
            try {
              await pluginStore.installFromFolder(folder);
              await refreshCommunityPlugins();
            } catch {}
          }}
          onInstalled={refreshCommunityPlugins}
          onUninstallPlugin={async (id) => {
            await pluginStore?.uninstall(id);
            await refreshCommunityPlugins();
          }}
          onClose={() => setShowPluginManager(false)}
        />
      )}

      {/* CSS Snippets */}
      {showCSSSnippets && activeVault && (
        <CSSSnippets
          vaultPath={activeVault.path}
          snippets={cssSnippets}
          onSnippetsChange={(snips) => {
            setCSSSnippets(snips);
            refreshSnippets(snips);
          }}
          onClose={() => setShowCSSSnippets(false)}
        />
      )}


      {/* Drawing Editor */}


      {/* Publish Preview */}
      {showPublish && currentTab && activeVault && (
        <PublishPreview
          content={content}
          title={baseName(currentTab.filePath).replace(/\.(md|markdown)$/i, "") || "note"}
          vaultPath={activeVault.path}
          onClose={() => setShowPublish(false)}
        />
      )}

      {/* Views opened by core plugins (Flashcards review, …) */}
      <CorePluginViewOverlay host={corePluginHost.host} view={corePluginHost.activeView} onClose={corePluginHost.closeView} />

      {/* Live Collaboration */}
      {showCollab && (
        <CollabPanel
          content={content}
          onContentChange={handleContentChange}
          onClose={() => setShowCollab(false)}
        />
      )}

      {/* Trash Panel */}
      {showTrash && activeVault && (
        <TrashPanel
          vaultPath={activeVault.path}
          onClose={() => setShowTrash(false)}
          onRestored={() => setSidebarRefresh((k) => k + 1)}
        />
      )}


      {/* Hidden sandboxed <iframe> per enabled community plugin (see @noteriv/ui/plugins/sandbox) */}
      <div ref={sandboxHost.containerRef} style={{ display: "none" }} />

      {/* Notices from plugins (api.ui.showNotice) and from sync */}
      {corePluginHost.notices.length + sandboxHost.notices.length > 0 || syncConflictNotice || linkNotice ? (
        <div className="fixed right-4 z-50 flex flex-col gap-2" style={{ bottom: 36 }}>
          {linkNotice && (
            <div
              onClick={() => setLinkNotice(null)}
              role="status"
              className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm cursor-pointer shadow-lg"
              style={{ maxWidth: 420 }}
            >
              {linkNotice}
            </div>
          )}
          {syncConflictNotice && (
            <div
              onClick={() => setSyncConflictNotice(null)}
              className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--yellow)] text-sm cursor-pointer shadow-lg"
              style={{ maxWidth: 420 }}
            >
              {syncConflictNotice}
            </div>
          )}
          {[...corePluginHost.notices, ...sandboxHost.notices].map((n) => (
            <div
              key={n.key}
              onClick={() => (n.key.startsWith("core:") ? corePluginHost.dismissNotice(n.key) : sandboxHost.dismissNotice(n.key))}
              className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm cursor-pointer shadow-lg"
            >
              {n.message}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

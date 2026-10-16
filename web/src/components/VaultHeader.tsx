"use client";

import { SidebarToggleIcon } from "@/components/icons";
import VaultSwitcher from "@/components/VaultSwitcher";
import AppMenu, { type PluginMenuCommand } from "@/components/AppMenu";
import type { HotkeyAction, HotkeyBinding } from "@/lib/hotkeys";
import type { ApiVault, ViewMode } from "@/lib/webApi";

interface VaultHeaderProps {
  vault: ApiVault | null;
  vaults: ApiVault[];
  activeNotePath: string | null;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  showViewModes?: boolean;
  hotkeys?: HotkeyBinding[];
  platform?: string;
  onMenuAction?: (action: HotkeyAction) => void;
  /** Core plugin commands for the menu's "Plugin" section. */
  pluginCommands?: PluginMenuCommand[];
  onVaultsChanged?: () => void;
  onImportNewVault?: () => void;
  onNewFromGithub?: () => void;
}

/**
 * Slim header bar — a deliberately reduced translation of desktop's
 * TitleBar.tsx. No OS window controls (minimize/maximize/close manage a
 * native Tauri window; meaningless in a browser tab). The tab strip itself
 * lives in a separate TabBar.tsx (mounted below this header in the vault
 * page) now that web supports multiple open notes — see
 * docs/plans/2026-10-13-noteriv-web-full-parity.md Phase A1. Reuses
 * desktop's `.titlebar`/`.titlebar-controls`/`.titlebar-path`/`.view-toggle`
 * classes, which carry no window-chrome assumptions beyond a fixed bar
 * height.
 */
export default function VaultHeader({
  vault,
  vaults,
  activeNotePath,
  sidebarCollapsed,
  onToggleSidebar,
  viewMode,
  onViewModeChange,
  showViewModes = false,
  hotkeys,
  platform = "web",
  onMenuAction,
  pluginCommands,
  onVaultsChanged,
  onImportNewVault,
  onNewFromGithub,
}: VaultHeaderProps) {
  const displayedPath = activeNotePath || vault?.name || "Noteriv";

  return (
    <div className="titlebar">
      <div className="titlebar-controls">
        <div className="titlebar-section" style={{ paddingLeft: 8 }}>
          <button onClick={onToggleSidebar} className="titlebar-btn" title="Thu gọn sidebar">
            <SidebarToggleIcon collapsed={sidebarCollapsed} />
          </button>
          <div className="titlebar-divider" />
          <VaultSwitcher vaults={vaults} activeVault={vault} onVaultsChanged={onVaultsChanged} onImportNewVault={onImportNewVault} onNewFromGithub={onNewFromGithub} />
          {hotkeys && onMenuAction && (
            <>
              <div className="titlebar-divider" />
              <AppMenu hotkeys={hotkeys} platform={platform} onExecute={onMenuAction} pluginCommands={pluginCommands} />
            </>
          )}
        </div>

        <div className="titlebar-path" title={displayedPath}>
          {displayedPath}
        </div>

        <div className="titlebar-section" style={{ paddingRight: 8 }}>
          {showViewModes && viewMode && onViewModeChange && (
            <div className="view-toggle">
              <button
                onClick={() => onViewModeChange("live")}
                className={`view-toggle-btn ${viewMode === "live" ? "vt-active" : ""}`}
              >
                Edit
              </button>
              <button
                onClick={() => onViewModeChange("view")}
                className={`view-toggle-btn ${viewMode === "view" ? "vt-active" : ""}`}
              >
                View
              </button>
              <button
                onClick={() => onViewModeChange("source")}
                className={`view-toggle-btn ${viewMode === "source" ? "vt-active" : ""}`}
              >
                Source
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

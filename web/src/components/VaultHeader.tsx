"use client";

import { SidebarToggleIcon } from "@/components/icons";
import VaultSwitcher from "@/components/VaultSwitcher";
import type { ApiVault } from "@/lib/webApi";

interface VaultHeaderProps {
  vault: ApiVault | null;
  vaults: ApiVault[];
  activeNotePath: string | null;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

/**
 * Slim header bar — a deliberately reduced translation of desktop's
 * TitleBar.tsx. No OS window controls (minimize/maximize/close manage a
 * native Tauri window; meaningless in a browser tab) and no tab bar (web
 * opens one note at a time; adding multi-tab support is new feature scope,
 * not a visual-parity translation — see the plan doc's design-decisions
 * section). Reuses desktop's `.titlebar`/`.titlebar-controls`/`.titlebar-path`
 * classes, which carry no window-chrome assumptions beyond a fixed bar
 * height.
 */
export default function VaultHeader({ vault, vaults, activeNotePath, sidebarCollapsed, onToggleSidebar }: VaultHeaderProps) {
  const displayedPath = activeNotePath || vault?.name || "Noteriv";

  return (
    <div className="titlebar">
      <div className="titlebar-controls">
        <div className="titlebar-section" style={{ paddingLeft: 8 }}>
          <button onClick={onToggleSidebar} className="titlebar-btn" title="Thu gọn sidebar">
            <SidebarToggleIcon collapsed={sidebarCollapsed} />
          </button>
          <div className="titlebar-divider" />
          <VaultSwitcher vaults={vaults} activeVault={vault} />
        </div>

        <div className="titlebar-path" title={displayedPath}>
          {displayedPath}
        </div>

        <div className="titlebar-section" style={{ paddingRight: 8 }} />
      </div>
    </div>
  );
}

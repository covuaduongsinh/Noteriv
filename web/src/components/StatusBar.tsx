"use client";

import type { ViewMode } from "@/lib/webApi";

interface StatusBarProps {
  viewMode: ViewMode;
  vaultName: string;
  notePath: string | null;
  content: string;
  dirty: boolean;
}

const VIEW_MODE_LABEL: Record<ViewMode, string> = {
  live: "Edit",
  view: "View",
  source: "Source",
};

/**
 * Bottom status bar — ported from the inline block in desktop's
 * app/page.tsx (~L1998-2047: mode · vault · path · saved state · sync status
 * · line/char count · plugin status-bar items). Replaces the standalone
 * save-indicator that used to live in NoteToolbar.tsx.
 *
 * Sync status is intentionally omitted here, not faked — it needs the real
 * sync-connection UI from Phase B (docs/plans/2026-10-13-noteriv-web-full-parity.md)
 * before there's any actual state to show. The trailing flex container is
 * reserved for plugin-registered status-bar items once the plugin sandbox
 * gains a `ui.addStatusBarItem` RPC method (not yet implemented, see
 * usePluginHost.ts's METHOD_PERMISSIONS).
 */
export default function StatusBar({ viewMode, vaultName, notePath, content, dirty }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between h-6 px-3 bg-[var(--bg-secondary)] border-t border-[var(--border)] text-[10px] text-[var(--text-muted)] select-none shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <span>{VIEW_MODE_LABEL[viewMode]}</span>
        {vaultName && <span>{vaultName}</span>}
        {notePath && <span className="truncate max-w-md">{notePath}</span>}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {notePath && (
          <span className={dirty ? "text-[var(--yellow)]" : "text-[var(--green)]"}>
            {dirty ? "unsaved" : "saved"}
          </span>
        )}
        {notePath && (
          <>
            <span>{content.split("\n").length} lines</span>
            <span>{content.length} chars</span>
          </>
        )}
        <div className="flex items-center gap-3" />
      </div>
    </div>
  );
}

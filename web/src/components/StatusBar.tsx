"use client";

import type { ViewMode } from "@/lib/webApi";
import type { PluginStatusItem } from "@/lib/plugin-sandbox/types";

interface StatusBarProps {
  viewMode: ViewMode;
  vaultName: string;
  notePath: string | null;
  content: string;
  dirty: boolean;
  syncSummary?: string | null;
  onOpenSync?: () => void;
  pluginItems?: PluginStatusItem[];
  onPluginItemClick?: (pluginDbId: string, itemId: string) => void;
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
 * Sync status (Phase B1) shows a one-line summary for the vault's first sync
 * connection, if any — clicking it opens Settings > Sync rather than
 * duplicating the connection list/job-polling UI that already lives there.
 * The trailing flex container is reserved for plugin-registered status-bar
 * items once the plugin sandbox gains a `ui.addStatusBarItem` RPC method
 * (not yet implemented, see usePluginHost.ts's METHOD_PERMISSIONS).
 */
export default function StatusBar({
  viewMode,
  vaultName,
  notePath,
  content,
  dirty,
  syncSummary,
  onOpenSync,
  pluginItems = [],
  onPluginItemClick,
}: StatusBarProps) {
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
        {syncSummary && (
          <button onClick={onOpenSync} className="hover:text-[var(--text-primary)]" title="Mở Settings > Sync">
            {syncSummary}
          </button>
        )}
        <div className="flex items-center gap-3">
          {pluginItems.map((item) =>
            item.clickable ? (
              <button
                key={`${item.pluginDbId}:${item.id}`}
                onClick={() => onPluginItemClick?.(item.pluginDbId, item.id)}
                title={item.title}
                className="hover:text-[var(--text-primary)]"
              >
                {item.text}
              </button>
            ) : (
              <span key={`${item.pluginDbId}:${item.id}`} title={item.title}>
                {item.text}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

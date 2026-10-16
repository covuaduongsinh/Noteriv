import { createElement } from "react";
import { createRoot } from "react-dom/client";
import type { CorePlugin, PluginApi } from "@noteriv/plugin-api";
import { LintPanel, type LintLabels } from "./LintPanel";

export { groupWarnings } from "./LintPanel";

export const PANEL_ID = "lint";

// Web speaks Vietnamese, desktop English (same convention as the other core plugins).
const TEXT: Record<"web" | "desktop", LintLabels & { title: string; command: string }> = {
  web: {
    title: "Lint",
    command: "Lint: bật/tắt panel",
    errors: (n) => `${n} lỗi`,
    warnings: (n) => `${n} cảnh báo`,
    infos: (n) => `${n} gợi ý`,
    ok: "Không có vấn đề",
    none: "Không tìm thấy vấn đề nào",
    noNote: "Chưa mở ghi chú.",
    groupErrors: "Lỗi",
    groupWarnings: "Cảnh báo",
    groupInfos: "Gợi ý",
    line: (n) => `dòng ${n}`,
  },
  desktop: {
    title: "Lint",
    command: "Lint: toggle panel",
    errors: (n) => `${n} error${n === 1 ? "" : "s"}`,
    warnings: (n) => `${n} warning${n === 1 ? "" : "s"}`,
    infos: (n) => `${n} info`,
    ok: "No issues",
    none: "No issues found",
    noNote: "No note is open.",
    groupErrors: "Errors",
    groupWarnings: "Warnings",
    groupInfos: "Info",
    line: (n) => `line ${n}`,
  },
};

const ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h7M3 8h5M3 12h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M10.5 10.5l1.5 1.5 3-3.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/** Markdown lint: a right-hand panel listing problems in the open note (broken links, heading levels, …). */
const markdownLint: CorePlugin = {
  onload(api: PluginApi) {
    const t = TEXT[api.app.platform];
    api.ui.addSidebarPanel({
      id: PANEL_ID,
      title: t.title,
      icon: ICON,
      render(container) {
        const root = createRoot(container);
        root.render(createElement(LintPanel, { api, labels: t }));
        // Deferred like reactView: closing can start inside a React event of the app.
        return () => void setTimeout(() => root.unmount(), 0);
      },
    });
    api.ui.addCommand({ id: "toggle", name: t.command, hotkey: "Mod+Shift+L", callback: () => api.ui.toggleSidebarPanel(PANEL_ID) });
  },
};

export default markdownLint;

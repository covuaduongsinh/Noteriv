import { createElement } from "react";
import type { CorePlugin, PluginApi } from "@noteriv/plugin-api";
import { reactView } from "../shared/react-view";
import { GraphView, type GraphLabels } from "./GraphView";

export { loadLinkGraph } from "./GraphView";

export const VIEW_TYPE = "graph";

// Web speaks Vietnamese, desktop English (same convention as the other core plugins).
const TEXT: Record<"web" | "desktop", GraphLabels & { command: string; title: string }> = {
  web: {
    command: "Mở graph view",
    title: "Graph view",
    filter: "Lọc note...",
    close: "Đóng",
    zoomIn: "Phóng to",
    zoomOut: "Thu nhỏ",
    building: "Đang dựng graph...",
    notes: "note",
    connections: "liên kết",
    connectionCount: (n) => `${n} liên kết`,
    oneWay: "một chiều",
    reciprocal: "hai chiều",
    legend: "Chú thích chiều liên kết",
  },
  desktop: {
    command: "Open graph view",
    title: "Graph View",
    filter: "Filter nodes...",
    close: "Close",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    building: "Building graph...",
    notes: "notes",
    connections: "connections",
    connectionCount: (n) => `${n} connection${n !== 1 ? "s" : ""}`,
    oneWay: "one-way",
    reciprocal: "reciprocal",
    legend: "Link direction legend",
  },
};

const ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="8" r="2" stroke="currentColor" stroke-width="1.2"/><circle cx="12" cy="4" r="2" stroke="currentColor" stroke-width="1.2"/><circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="1.2"/><path d="M6 7.2l4-2.4M6 8.8l4 2.4" stroke="currentColor" stroke-width="1.2"/></svg>';

/** Graph view: every note and the wiki-links between them, as a force-directed canvas. */
const graph: CorePlugin = {
  onload(api: PluginApi) {
    const t = TEXT[api.app.platform];
    api.ui.registerView(
      VIEW_TYPE,
      reactView(() =>
        createElement(GraphView, {
          vault: api.vault,
          currentPath: api.app.currentFile,
          labels: t,
          onClose: () => api.workspace.closeView(),
          onNoteSelect: (path) => {
            api.workspace.closeView();
            void api.workspace.openFile(path);
          },
        })
      )
    );
    const open = () => void api.workspace.openView(VIEW_TYPE);
    api.ui.addCommand({ id: "open", name: t.command, hotkey: "Mod+G", callback: open });
    api.ui.addRibbonIcon({ id: "open", title: t.title, icon: ICON, onClick: open });
  },
};

export default graph;

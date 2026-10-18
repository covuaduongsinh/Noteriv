import { createElement } from "react";
import type { CorePlugin, PluginApi } from "@noteriv/plugin-api";
import { pluginT } from "../shared/i18n";
import { reactView } from "../shared/react-view";
import { GraphView, type GraphLabels } from "./GraphView";

export { loadLinkGraph } from "./GraphView";

export const VIEW_TYPE = "graph";

function labelsFor(api: PluginApi): GraphLabels & { command: string; title: string } {
  const t = pluginT(api, "graph");
  return {
    command: t("command"),
    title: t("title"),
    filter: t("filter"),
    close: t("close"),
    zoomIn: t("zoomIn"),
    zoomOut: t("zoomOut"),
    building: t("building"),
    notes: t("notes"),
    connections: t("connections"),
    connectionCount: (count) => t("connectionCount", { count }),
    oneWay: t("oneWay"),
    reciprocal: t("reciprocal"),
    legend: t("legend"),
  };
}

const ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="4" cy="8" r="2" stroke="currentColor" stroke-width="1.2"/><circle cx="12" cy="4" r="2" stroke="currentColor" stroke-width="1.2"/><circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="1.2"/><path d="M6 7.2l4-2.4M6 8.8l4 2.4" stroke="currentColor" stroke-width="1.2"/></svg>';

/** Graph view: every note and the wiki-links between them, as a force-directed canvas. */
const graph: CorePlugin = {
  onload(api: PluginApi) {
    const t = labelsFor(api);
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

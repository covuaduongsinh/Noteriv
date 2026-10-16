import { createElement } from "react";
import type { CorePlugin, PluginApi } from "@noteriv/plugin-api";
import { isCanvasContent, serializeCanvas } from "@noteriv/core/canvas-utils";
import { reactFileView } from "../shared/react-view";
import { createKindFile } from "../shared/new-file";
import { CanvasView } from "./CanvasView";
import { pluginCanvasServices, type CanvasLabels } from "./services";

export { pluginCanvasServices, type CanvasServices, type CanvasLabels } from "./services";

export const FILE_VIEW_ID = "canvas";

// Web speaks Vietnamese, desktop English (same convention as the other core plugins).
const TEXT: Record<"web" | "desktop", CanvasLabels & { create: string; failed: string }> = {
  web: {
    create: "Canvas: tạo canvas mới",
    failed: "Không tạo được canvas mới.",
    searchNotes: "Tìm note...",
    noMatchingNotes: "Không có note phù hợp",
    noteNotFound: "(không tìm thấy note)",
    pickImage: "Chọn ảnh",
    upload: "Tải ảnh lên…",
    uploading: "Đang tải lên…",
    noImages: "Chưa có ảnh nào trong vault. Tải ảnh lên bằng nút bên trên.",
    loading: "Đang tải…",
  },
  desktop: {
    create: "New canvas",
    failed: "Could not create a new canvas.",
    searchNotes: "Search notes...",
    noMatchingNotes: "No matching notes",
    noteNotFound: "(note not found)",
    pickImage: "Pick an image",
    upload: "Upload…",
    uploading: "Uploading…",
    noImages: "No images in the vault yet. Upload one with the button above.",
    loading: "Loading…",
  },
};

/** A canvas: a `.canvas` file (desktop) or a note with `canvas: true` frontmatter (web). */
export function isCanvas(file: { path: string; content: string }): boolean {
  return file.path.endsWith(".canvas") || isCanvasContent(file.content);
}

/** Canvas: boards of text, note, sticky, image and group nodes joined by edges, shown in place of the editor. */
const canvas: CorePlugin = {
  onload(api: PluginApi) {
    const t = TEXT[api.app.platform];
    const services = pluginCanvasServices(api);
    api.ui.registerFileView(
      reactFileView(FILE_VIEW_ID, isCanvas, ({ content, onChange }) => createElement(CanvasView, { content, onChange, services, labels: t }))
    );
    api.ui.addCommand({
      id: "new",
      name: t.create,
      callback: async () => {
        try {
          await createKindFile(api, { base: "Canvas", desktopExt: ".canvas", marker: "canvas", body: serializeCanvas({ nodes: [], edges: [] }) });
        } catch (e) {
          console.error("[canvas] create failed:", e);
          api.ui.showNotice(t.failed);
        }
      },
    });
  },
};

export default canvas;

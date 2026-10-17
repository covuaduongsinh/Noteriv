import { createElement } from "react";
import type { CorePlugin, PluginApi } from "@noteriv/plugin-api";
import { createEmptyDrawing, isDrawingContent, isDrawingFile, serializeDrawing } from "@noteriv/core/drawing-utils";
import { reactFileView } from "../shared/react-view";
import { createKindFile } from "../shared/new-file";
import { DrawingView } from "./DrawingView";

export const FILE_VIEW_ID = "drawing";

// Web speaks Vietnamese, desktop English (same convention as the other core plugins).
const TEXT: Record<"web" | "desktop", { create: string; failed: string }> = {
  web: { create: "Drawing: tạo bản vẽ mới", failed: "Không tạo được bản vẽ mới." },
  desktop: { create: "New drawing", failed: "Could not create a new drawing." },
};

/** A drawing: a `.drawing` file (desktop) or a note with `drawing: true` frontmatter (web). */
export function isDrawing(file: { path: string; content: string }): boolean {
  return isDrawingFile(file.path) || isDrawingContent(file.content);
}

/** Drawing: freehand sketches and shapes, shown in place of the editor. */
const drawing: CorePlugin = {
  onload(api: PluginApi) {
    const t = TEXT[api.app.platform];
    api.ui.registerFileView(reactFileView(FILE_VIEW_ID, isDrawing, ({ content, onChange }) => createElement(DrawingView, { content, onChange })));
    api.ui.addCommand({
      id: "new",
      name: t.create,
      callback: async () => {
        try {
          await createKindFile(api, { base: "Drawing", desktopExt: ".drawing", marker: "drawing", body: serializeDrawing(createEmptyDrawing()) });
        } catch (e) {
          console.error("[drawing] create failed:", e);
          api.ui.showNotice(t.failed);
        }
      },
    });
  },
};

export default drawing;

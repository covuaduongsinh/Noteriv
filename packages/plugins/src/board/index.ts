import { createElement } from "react";
import { createRoot } from "react-dom/client";
import type { CorePlugin, FileView, PluginApi, VaultApi } from "@noteriv/plugin-api";
import { createBoardContent, isBoardContent, isBoardFile } from "@noteriv/core/board-utils";
import { BoardView } from "./BoardView";

export const FILE_VIEW_ID = "board";

// Web speaks Vietnamese, desktop English (same convention as the other core plugins).
const TEXT: Record<"web" | "desktop", { create: string; failed: string }> = {
  web: { create: "Board: tạo board mới", failed: "Không tạo được board mới." },
  desktop: { create: "New board", failed: "Could not create a new board." },
};

/** A board shows for `*.board.md` files and for notes whose frontmatter says `board: true` (both apps, since 2.4b). */
export function isBoard(file: { path: string; content: string }): boolean {
  return isBoardFile(file.path) || isBoardContent(file.content);
}

/** `Board.board.md`, else `Board 2.board.md`, `Board 3.board.md`… at the vault root: the first that does not exist. */
export async function newBoardPath(vault: VaultApi): Promise<string> {
  for (let n = 1; ; n++) {
    const path = n === 1 ? "Board.board.md" : `Board ${n}.board.md`;
    if (!(await vault.exists(path))) return path;
  }
}

const boardView: FileView = {
  id: FILE_VIEW_ID,
  match: isBoard,
  mount(container, ctx) {
    const root = createRoot(container);
    let content = ctx.content;
    const onChange = (next: string) => {
      content = next;
      ctx.setContent(next);
    };
    const render = () => root.render(createElement(BoardView, { content, onChange }));
    render();
    return {
      update(next) {
        content = next;
        render();
      },
      // Unmount may be asked for while React is dispatching one of the board's own events: wait a tick.
      destroy: () => void setTimeout(() => root.unmount(), 0),
    };
  },
};

/** Board: Kanban boards stored as markdown, shown in place of the editor. */
const board: CorePlugin = {
  onload(api: PluginApi) {
    const t = TEXT[api.app.platform];
    api.ui.registerFileView(boardView);
    api.ui.addCommand({
      id: "new",
      name: t.create,
      callback: async () => {
        try {
          const path = await newBoardPath(api.vault);
          await api.vault.write(path, createBoardContent());
          await api.workspace.openFile(path);
        } catch (e) {
          console.error("[board] create failed:", e);
          api.ui.showNotice(t.failed);
        }
      },
    });
  },
};

export default board;

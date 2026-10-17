import { createElement } from "react";
import type { CorePlugin, PluginApi } from "@noteriv/plugin-api";
import { reactView } from "../shared/react-view";
import { NoteComposer, type ComposerLabels } from "./NoteComposer";

export { mergeNotes, splitByHeadings, sanitizeFileName, sectionPath } from "./compose";

export const VIEW_TYPE = "note-composer";

// Web speaks Vietnamese, desktop English (same convention as the other core plugins).
const TEXT: Record<"web" | "desktop", ComposerLabels & { command: string }> = {
  web: {
    command: "Note composer: gộp / tách note",
    title: "Note Composer",
    merge: "Gộp",
    split: "Tách",
    noNote: "Chưa chọn note",
    searchMerge: "Tìm note để gộp…",
    selected: (n) => `${n} đã chọn`,
    noNotes: "Không tìm thấy note",
    addHeadings: "Thêm tên file làm tiêu đề (h2) giữa các note gộp",
    deleteAfter: "Chuyển note nguồn vào thùng rác sau khi gộp",
    splitBy: "Tách theo:",
    noHeadings: (l) => `Không tìm thấy heading ${l} nào để tách`,
    exists: "đã có, sẽ bỏ qua",
    cancel: "Huỷ",
    merging: "Đang gộp…",
    mergeN: (n) => `Gộp ${n} note`,
    splitting: "Đang tách…",
    splitN: (n) => `Tách thành ${n} note`,
    skipped: (n) => `Bỏ qua ${n} phần vì đã có note cùng tên.`,
  },
  desktop: {
    command: "Note composer: merge / split notes",
    title: "Note Composer",
    merge: "Merge",
    split: "Split",
    noNote: "No file selected",
    searchMerge: "Search notes to merge...",
    selected: (n) => `${n} selected`,
    noNotes: "No matching notes",
    addHeadings: "Add file names as headings (h2) between merged notes",
    deleteAfter: "Delete source files after merging",
    splitBy: "Split by:",
    noHeadings: (l) => `No ${l} headings found to split on`,
    exists: "exists, will be skipped",
    cancel: "Cancel",
    merging: "Merging...",
    mergeN: (n) => `Merge ${n} note${n === 1 ? "" : "s"}`,
    splitting: "Splitting...",
    splitN: (n) => `Split into ${n} notes`,
    skipped: (n) => `Skipped ${n} section${n === 1 ? "" : "s"}: a note with that name already exists.`,
  },
};

/** Note composer: merge notes into the open one, or split the open note by its headings. */
const noteComposer: CorePlugin = {
  onload(api: PluginApi) {
    const t = TEXT[api.app.platform];
    api.ui.registerView(VIEW_TYPE, reactView(() => createElement(NoteComposer, { api, labels: t })));
    api.ui.addCommand({ id: "open", name: t.command, callback: () => void api.workspace.openView(VIEW_TYPE) });
  },
};

export default noteComposer;

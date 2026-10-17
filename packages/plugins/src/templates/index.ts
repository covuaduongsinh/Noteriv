import { createElement } from "react";
import type { CorePlugin, PluginApi } from "@noteriv/plugin-api";
import { reactView } from "../shared/react-view";
import { TemplatePicker, type PickerLabels, type TemplateMode } from "./TemplatePicker";

export { getTemplateVariables, processTemplate, freeNotePath, TEMPLATES_FOLDER } from "./engine";

export const VIEW_TYPES: Record<TemplateMode, string> = { create: "templates-create", insert: "templates-insert" };

// Web speaks Vietnamese, desktop English (same convention as the other core plugins).
const TEXT: Record<"web" | "desktop", PickerLabels & { create: string; insert: string }> = {
  web: {
    create: "Templates: tạo note từ template",
    insert: "Templates: chèn template vào note",
    search: "Tìm template…",
    emptyTitle: "Chưa có template nào",
    emptyFolder: (f) => `Tạo một thư mục "${f}" ở gốc vault và thêm note vào đó để dùng làm template.`,
    emptyVariables: "Dùng biến như {{date}}, {{title}}, {{time}} để chèn nội dung động.",
    noMatch: "Không có template khớp",
    preview: "Xem trước",
    previewEmpty: "Chọn một template để xem trước",
    enter: { create: "tạo note", insert: "chèn" },
    close: "đóng",
    move: "di chuyển",
    count: (n) => `${n} template`,
    noNote: "Hãy mở một ghi chú trước khi chèn template.",
  },
  desktop: {
    create: "Templates: new note from template",
    insert: "Templates: insert template",
    search: "Search templates...",
    emptyTitle: "No templates found",
    emptyFolder: (f) => `Create a "${f}" folder in your vault root and add notes to use them as templates.`,
    emptyVariables: "Use variables like {{date}}, {{title}}, {{time}} for dynamic content.",
    noMatch: "No matching templates",
    preview: "Preview",
    previewEmpty: "Select a template to preview",
    enter: { create: "create note", insert: "insert" },
    close: "close",
    move: "navigate",
    count: (n) => `${n} template${n === 1 ? "" : "s"}`,
    noNote: "Open a note before inserting a template.",
  },
};

const ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="2.5" width="10" height="11" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';

/** Templates: notes in the vault's `Templates/` folder, used to start a new note or inserted at the cursor. */
const templates: CorePlugin = {
  onload(api: PluginApi) {
    const t = TEXT[api.app.platform];
    for (const mode of ["create", "insert"] as const) {
      api.ui.registerView(VIEW_TYPES[mode], reactView(() => createElement(TemplatePicker, { api, mode, labels: t })));
    }
    const open = (mode: TemplateMode) => () => void api.workspace.openView(VIEW_TYPES[mode]);
    api.ui.addCommand({ id: "create", name: t.create, callback: open("create") });
    // Desktop keeps its Ctrl/Cmd+T; in a browser that key opens a tab and a page cannot take it, hence the Alt.
    const insertKey = api.app.platform === "desktop" ? "Mod+T" : "Mod+Alt+T";
    api.ui.addCommand({ id: "insert", name: t.insert, hotkey: insertKey, callback: open("insert") });
    api.ui.addRibbonIcon({ id: "create", title: t.create, icon: ICON, onClick: open("create") });
  },
};

export default templates;

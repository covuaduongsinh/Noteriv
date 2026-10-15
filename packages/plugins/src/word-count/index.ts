import type { CorePlugin, PluginApi } from "@noteriv/plugin-api";
import { countText, type TextStats } from "./count";

export { countText, type TextStats };

// Web speaks Vietnamese, desktop English (same convention as the shared panels' labels).
const TEXT = {
  web: {
    words: (n: number) => `${n} từ`,
    title: (s: TextStats) => `${s.characters} ký tự · khoảng ${s.readingMinutes} phút đọc`,
    command: "Đếm từ: thống kê ghi chú",
    ribbon: "Đếm từ",
    notice: (s: TextStats) => `${s.words} từ · ${s.characters} ký tự · khoảng ${s.readingMinutes} phút đọc`,
    noNote: "Chưa mở ghi chú nào.",
  },
  desktop: {
    words: (n: number) => `${n} ${n === 1 ? "word" : "words"}`,
    title: (s: TextStats) => `${s.characters} characters · ~${s.readingMinutes} min read`,
    command: "Word count: show note statistics",
    ribbon: "Word count",
    notice: (s: TextStats) => `${s.words} words · ${s.characters} characters · ~${s.readingMinutes} min read`,
    noNote: "No note is open.",
  },
};

const ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M3 8h10M3 12h6" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';

/** Word count: status bar count for the open note, plus a command and a ribbon button with full statistics. */
const wordCount: CorePlugin = {
  onload(api: PluginApi) {
    const t = TEXT[api.app.platform];

    const update = (content?: unknown) => {
      const text = typeof content === "string" ? content : api.editor.getContent();
      if (text === null) {
        api.ui.removeStatusBarItem("count");
        return;
      }
      const stats = countText(text);
      api.ui.addStatusBarItem({ id: "count", text: t.words(stats.words), title: t.title(stats) });
    };

    const show = () => {
      const text = api.editor.getContent();
      api.ui.showNotice(text === null ? t.noNote : t.notice(countText(text)));
    };

    update();
    api.events.on("editor-change", update);
    api.events.on("file-open", () => update());
    api.ui.addCommand({ id: "show", name: t.command, hotkey: "Mod+Shift+W", callback: show });
    api.ui.addRibbonIcon({ id: "show", title: t.ribbon, icon: ICON, onClick: show });
  },
};

export default wordCount;

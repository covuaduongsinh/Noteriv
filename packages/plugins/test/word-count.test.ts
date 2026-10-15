import { describe, expect, it, vi } from "vitest";
import type { PluginApi } from "@noteriv/plugin-api";
import wordCount, { countText } from "../src/word-count";

describe("countText", () => {
  it("counts Vietnamese words and skips frontmatter and markdown punctuation", () => {
    const note = "---\ntags: [chess]\n---\n# Khai cuộc Sicilian\n\n- **1. e4 c5** là nước đi phổ biến";
    // Khai cuộc Sicilian (3) + 1 e4 c5 (3) + là nước đi phổ biến (5); "tags: [chess]" is frontmatter.
    expect(countText(note).words).toBe(11);
  });

  it("keeps joined words together and reports zero for an empty note", () => {
    expect(countText("don't re-enter").words).toBe(2);
    expect(countText("")).toEqual({ words: 0, characters: 0, readingMinutes: 0 });
    expect(countText("a b").readingMinutes).toBe(1);
  });
});

describe("word-count plugin", () => {
  function fakeApi(content: string | null, platform: "web" | "desktop" = "desktop") {
    const status = new Map<string, { text: string }>();
    const handlers = new Map<string, (...a: unknown[]) => void>();
    const api = {
      app: { platform },
      editor: { getContent: () => content },
      events: { on: (e: string, h: (...a: unknown[]) => void) => handlers.set(e, h) },
      ui: {
        addStatusBarItem: (i: { id: string; text: string }) => status.set(i.id, i),
        removeStatusBarItem: (id: string) => status.delete(id),
        addCommand: vi.fn(),
        addRibbonIcon: vi.fn(),
        showNotice: vi.fn(),
      },
    };
    return { api: api as unknown as PluginApi, status, handlers, ui: api.ui };
  }

  it("shows the count of the open note and follows editor changes", async () => {
    const { api, status, handlers, ui } = fakeApi("one two three");
    await wordCount.onload(api);
    expect(status.get("count")?.text).toBe("3 words");
    handlers.get("editor-change")!("just one");
    expect(status.get("count")?.text).toBe("2 words");
    expect(ui.addCommand).toHaveBeenCalledWith(expect.objectContaining({ id: "show", hotkey: "Mod+Alt+W" }));
    expect(ui.addRibbonIcon).toHaveBeenCalledOnce();
  });

  it("has no status item without an open note, and words its text per platform", async () => {
    const none = fakeApi(null);
    await wordCount.onload(none.api);
    expect(none.status.size).toBe(0);
    const web = fakeApi("một hai", "web");
    await wordCount.onload(web.api);
    expect(web.status.get("count")?.text).toBe("2 từ");
  });
});

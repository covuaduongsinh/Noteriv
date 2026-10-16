import type { CorePlugin, PluginApi, VaultApi } from "@noteriv/plugin-api";
import type { ScannedNote } from "./storage";
import { mountReview, type ReviewLabels } from "./view";

export { extractCards, getDueCards, gradeCard, hashCard, type Flashcard, type CardReview, type Reviews } from "./cards";
export { migrateLegacyReviews, loadReviews, saveReviews, type ScannedNote } from "./storage";

export const VIEW_TYPE = "flashcards-review";

// Web speaks Vietnamese, desktop English (same convention as the shared panels' labels).
const TEXT: Record<"web" | "desktop", ReviewLabels & { command: string; ribbon: string }> = {
  web: {
    command: "Flashcards: ôn tập",
    ribbon: "Flashcards",
    title: "Ôn tập flashcard",
    cards: (n) => `${n} thẻ`,
    due: (n) => `${n} cần ôn`,
    done: (n) => `${n} đã ôn`,
    scanning: "Đang tìm flashcard trong vault…",
    caughtUp: "Đã ôn hết!",
    noCards: "Chưa có flashcard. Thêm cặp dòng Q:/A: hoặc {{cloze}} vào ghi chú.",
    comeBack: (n) => `Đã ôn ${n} thẻ. Mai quay lại ôn tiếp.`,
    showAnswer: "Xem đáp án (Space)",
    close: "Đóng",
    grades: ["Lại", "Khó", "Tạm", "Tốt", "Dễ"],
  },
  desktop: {
    command: "Flashcards: review",
    ribbon: "Flashcards",
    title: "Flashcard Review",
    cards: (n) => `${n} cards`,
    due: (n) => `${n} due`,
    done: (n) => `${n} done`,
    scanning: "Scanning vault for flashcards...",
    caughtUp: "All caught up!",
    noCards: "No flashcards found. Add Q:/A: pairs or {{cloze}} deletions to your notes.",
    comeBack: (n) => `${n} cards reviewed. Come back tomorrow for more.`,
    showAnswer: "Show Answer (Space)",
    close: "Close",
    grades: ["Again", "Hard", "OK", "Good", "Easy"],
  },
};

const ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="10" height="7" rx="1.2" stroke="currentColor" stroke-width="1.2"/><rect x="4.5" y="6" width="10" height="7" rx="1.2" stroke="currentColor" stroke-width="1.2" fill="var(--bg-secondary)"/><path d="M7 9.5h5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>';

async function listMarkdown(vault: VaultApi, dir?: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await vault.list(dir)) {
    if (entry.isDir) out.push(...(await listMarkdown(vault, entry.path)));
    else if (/\.(md|markdown)$/i.test(entry.path)) out.push(entry.path);
  }
  return out;
}

/** Every markdown note in the vault with its content, read a few at a time (one request per note on web). */
export async function scanVault(vault: VaultApi, concurrency = 8): Promise<ScannedNote[]> {
  const paths = await listMarkdown(vault);
  const out: ScannedNote[] = [];
  for (let i = 0; i < paths.length; i += concurrency) {
    const batch = paths.slice(i, i + concurrency);
    const contents = await Promise.all(batch.map((p) => vault.read(p)));
    batch.forEach((path, k) => {
      const content = contents[k];
      if (content !== null) out.push({ path, content });
    });
  }
  return out;
}

/** Flashcards: spaced repetition (SM-2) over Q:/A: pairs and {{cloze}} deletions found in the vault's notes. */
const flashcards: CorePlugin = {
  onload(api: PluginApi) {
    const t = TEXT[api.app.platform];
    api.ui.registerView(VIEW_TYPE, () => ({
      mount: (container) => mountReview(container, api, t, () => scanVault(api.vault)),
    }));
    const open = () => void api.workspace.openView(VIEW_TYPE);
    api.ui.addCommand({ id: "review", name: t.command, callback: open });
    api.ui.addRibbonIcon({ id: "review", title: t.ribbon, icon: ICON, onClick: open });
  },
};

export default flashcards;

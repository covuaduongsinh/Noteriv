import type { CorePlugin, PluginApi } from "@noteriv/plugin-api";
import { scanVault } from "../shared/vault";
import { mountReview, type ReviewLabels } from "./view";

export { extractCards, getDueCards, gradeCard, hashCard, type Flashcard, type CardReview, type Reviews } from "./cards";
export { migrateLegacyReviews, loadReviews, saveReviews } from "./storage";
export { scanVault, type ScannedNote } from "../shared/vault";

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

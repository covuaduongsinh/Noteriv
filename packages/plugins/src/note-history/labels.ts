export interface HistoryLabels {
  gitCommand: string;
  scrubberCommand: string;
  gitTitle: string;
  scrubberTitle: string;
  noNote: string;
  close: string;
  restore: string;
  restoreHint: string;
  restored: string;
  // Git history
  loadingHistory: string;
  loadingVersion: string;
  gitEmpty: string;
  gitEmptyHint: string;
  oldest: string;
  latest: string;
  commits: string;
  noMessage: string;
  changesFrom: (hash: string) => string;
  // Time scrubber
  loadingSnapshots: string;
  scrubberEmpty: string;
  scrubberEmptyHint: string;
  now: string;
  isCurrent: string;
  play: string;
  pause: string;
  keysHint: string;
  ago: {
    justNow: string;
    seconds: (n: number) => string;
    minutes: (n: number) => string;
    hours: (n: number) => string;
    days: (n: number) => string;
  };
}

// Web speaks Vietnamese, desktop English (same convention as the other core plugins). Snapshots are taken differently
// on each platform, which the empty-state hint says.
export const TEXT: Record<"web" | "desktop", HistoryLabels> = {
  web: {
    gitCommand: "Lịch sử git của note",
    scrubberCommand: "Time scrubber: xem lại các phiên bản của note",
    gitTitle: "Lịch sử note (git)",
    scrubberTitle: "Time scrubber",
    noNote: "Mở một ghi chú để xem lịch sử.",
    close: "Đóng",
    restore: "Khôi phục phiên bản này",
    restoreHint: "Thay nội dung hiện tại bằng phiên bản này",
    restored: "Đã khôi phục phiên bản cũ.",
    loadingHistory: "Đang tải lịch sử...",
    loadingVersion: "Đang tải phiên bản...",
    gitEmpty: "Không có lịch sử git cho note này.",
    gitEmptyHint: "Cần một kết nối đồng bộ git đã chạy ít nhất một lần và note này đã được commit.",
    oldest: "Cũ nhất",
    latest: "Mới nhất",
    commits: "Commit",
    noMessage: "(không có mô tả)",
    changesFrom: (h) => `Thay đổi từ ${h} tới hiện tại`,
    loadingSnapshots: "Đang tải các bản lưu...",
    scrubberEmpty: "Note này chưa có bản lưu nào",
    scrubberEmptyHint:
      "Bản lưu được tạo tự động khoảng 10 phút một lần khi note thay đổi. Cứ tiếp tục viết, dòng thời gian sẽ hiện ở đây.",
    now: "Hiện tại (chưa lưu)",
    isCurrent: "Đây là phiên bản hiện tại",
    play: "Phát (Space)",
    pause: "Dừng (Space)",
    keysHint: "← → từng bước · Space phát/dừng · Esc đóng",
    ago: {
      justNow: "vừa xong",
      seconds: (n) => `${n} giây trước`,
      minutes: (n) => `${n} phút trước`,
      hours: (n) => `${n} giờ trước`,
      days: (n) => `${n} ngày trước`,
    },
  },
  desktop: {
    gitCommand: "Note history (git)",
    scrubberCommand: "Time scrubber",
    gitTitle: "Note History",
    scrubberTitle: "Time Scrubber",
    noNote: "Open a note to see its history.",
    close: "Close",
    restore: "Restore this version",
    restoreHint: "Replace current content with this version",
    restored: "Restored an earlier version.",
    loadingHistory: "Loading history...",
    loadingVersion: "Loading version...",
    gitEmpty: "No git history found for this file.",
    gitEmptyHint: "Make sure the vault is a git repository with committed changes.",
    oldest: "Oldest",
    latest: "Latest",
    commits: "Commits",
    noMessage: "(no message)",
    changesFrom: (h) => `Changes from ${h} to current`,
    loadingSnapshots: "Loading snapshots...",
    scrubberEmpty: "No history yet for this note",
    scrubberEmptyHint: "Snapshots are captured every time you save. Keep editing and a timeline will build up here automatically.",
    now: "Now (unsaved)",
    isCurrent: "This is the current version",
    play: "Play (Space)",
    pause: "Pause (Space)",
    keysHint: "← → step · Space play/pause · Esc close",
    ago: {
      justNow: "just now",
      seconds: (n) => `${n}s ago`,
      minutes: (n) => `${n}m ago`,
      hours: (n) => `${n}h ago`,
      days: (n) => `${n}d ago`,
    },
  },
};

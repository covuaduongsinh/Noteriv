import { createElement } from "react";
import type { CorePlugin, PluginApi } from "@noteriv/plugin-api";
import { reactView } from "../shared/react-view";
import { VaultInsights, type InsightsLabels } from "./VaultInsights";

export { computeVaultInsights, computeDailyStreak, buildHeatmap } from "./insights";

export const VIEW_TYPE = "vault-insights";

const ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 13V8M6.5 13V4M10 13V7M13.5 13V2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Web speaks Vietnamese, desktop English (same convention as the other core plugins).
const TEXT: Record<"web" | "desktop", InsightsLabels & { command: string }> = {
  web: {
    command: "Vault insights: thống kê vault",
    title: "Vault Insights",
    close: "Đóng",
    loading: "Đang phân tích vault…",
    activity: "Hoạt động ghi chú",
    heatTip: (d, n) => `${d}: ${n} note sửa đổi`,
    less: "Ít",
    more: "Nhiều",
    overview: "Tổng quan",
    notes: "Notes",
    words: "Từ",
    tags: "Tags",
    links: "Links",
    avgWords: "TB từ/note",
    streak: "Chuỗi ngày viết liên tục",
    current: "Hiện tại",
    longest: "Dài nhất",
    last: (d) => `Gần nhất: ${d}`,
    hubs: "Note kết nối nhiều nhất",
    noHubs: "Chưa có note nào kết nối",
    inOut: (i, o) => `${i} vào / ${o} ra`,
    orphans: "Note mồ côi (không link)",
    noOrphans: "Không có note mồ côi",
    topTags: "Tag phổ biến",
    noTags: "Chưa có tag nào",
    growth: "Tăng trưởng theo thời gian",
    noData: "Chưa có dữ liệu",
    health: "Sức khoẻ vault",
    withBacklinks: "Có backlink",
    withTags: "Có tag",
    withFrontmatter: "Có frontmatter",
    overall: "Sức khoẻ tổng thể",
    undated: (n) => `${n} note không có ngày tháng nên không có trong biểu đồ.`,
    dayLabels: ["", "T2", "", "T4", "", "T6", ""],
    months: ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"],
  },
  desktop: {
    command: "Vault insights: show statistics",
    title: "Vault Insights",
    close: "Close",
    loading: "Analyzing vault...",
    activity: "Note Activity",
    heatTip: (d, n) => `${d}: ${n} note${n === 1 ? "" : "s"} modified`,
    less: "Less",
    more: "More",
    overview: "Overview",
    notes: "Notes",
    words: "Words",
    tags: "Tags",
    links: "Links",
    avgWords: "Avg Words",
    streak: "Daily Streak",
    current: "Current",
    longest: "Longest",
    last: (d) => `Last: ${d}`,
    hubs: "Most Connected",
    noHubs: "No connected notes yet",
    inOut: (i, o) => `${i} in / ${o} out`,
    orphans: "Orphan Notes",
    noOrphans: "No orphan notes",
    topTags: "Top Tags",
    noTags: "No tags yet",
    growth: "Growth Over Time",
    noData: "No data yet",
    health: "Vault Health",
    withBacklinks: "With backlinks",
    withTags: "With tags",
    withFrontmatter: "With frontmatter",
    overall: "Overall health",
    undated: (n) => `${n} note${n === 1 ? "" : "s"} without dates are not in the charts.`,
    dayLabels: ["", "Mon", "", "Wed", "", "Fri", ""],
    months: MONTHS_EN,
  },
};

/** Vault insights: activity heatmap, link hubs and orphans, tags, growth and a vault health score. */
const vaultInsights: CorePlugin = {
  onload(api: PluginApi) {
    const t = TEXT[api.app.platform];
    api.ui.registerView(VIEW_TYPE, reactView(() => createElement(VaultInsights, { api, labels: t })));
    const open = () => void api.workspace.openView(VIEW_TYPE);
    api.ui.addCommand({ id: "open", name: t.command, callback: open });
    api.ui.addRibbonIcon({ id: "open", title: t.title, icon: ICON, onClick: open });
  },
};

export default vaultInsights;

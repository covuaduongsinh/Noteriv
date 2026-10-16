import { createElement } from "react";
import type { CorePlugin, PluginApi } from "@noteriv/plugin-api";
import { formatDate } from "@noteriv/core/calendar-utils";
import { reactView } from "../shared/react-view";
import { CalendarView, type CalendarLabels } from "./CalendarView";
import { openDailyNote } from "./daily";

export { collectCalendarData } from "./CalendarView";
export { dailyNotePath, openDailyNote } from "./daily";

export const VIEW_TYPE = "calendar";

// Web speaks Vietnamese, desktop English (same convention as the other core plugins).
const TEXT: Record<"web" | "desktop", CalendarLabels & { openCalendar: string; todayNote: string; ribbonCalendar: string; ribbonDaily: string }> = {
  web: {
    openCalendar: "Lịch: mở lịch",
    todayNote: "Daily note hôm nay",
    ribbonCalendar: "Lịch",
    ribbonDaily: "Daily note hôm nay",
    months: ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"],
    weekdays: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
    today: "Hôm nay",
    dailyNote: "Daily note",
    dueTasks: "Việc đến hạn",
    notes: "Ghi chú",
    tasksDue: "Việc đến hạn",
    nothing: "Không có ghi chú hay việc nào trong ngày này.",
    createDaily: "Tạo daily note",
    loading: "Đang đọc vault…",
    close: "Đóng",
  },
  desktop: {
    openCalendar: "Calendar: open",
    todayNote: "Open today's daily note",
    ribbonCalendar: "Calendar view",
    ribbonDaily: "Daily note",
    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    today: "Today",
    dailyNote: "Daily note",
    dueTasks: "Due tasks",
    notes: "Notes",
    tasksDue: "Tasks Due",
    nothing: "No notes or tasks for this day.",
    createDaily: "Create daily note",
    loading: "Reading vault…",
    close: "Close",
  },
};

const CALENDAR_ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';
const DAILY_ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" stroke="currentColor" stroke-width="1.2"/><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="8" cy="10" r="1.3" fill="currentColor"/></svg>';

/** Calendar and daily notes: a month view of daily notes and due tasks, and today's note (Ctrl/Cmd+D). */
const calendar: CorePlugin = {
  onload(api: PluginApi) {
    const t = TEXT[api.app.platform];
    api.ui.registerView(VIEW_TYPE, reactView(() => createElement(CalendarView, { api, labels: t })));
    const openCalendar = () => void api.workspace.openView(VIEW_TYPE);
    const today = () => void openDailyNote(api, formatDate(new Date()));
    api.ui.addCommand({ id: "open", name: t.openCalendar, callback: openCalendar });
    api.ui.addCommand({ id: "today", name: t.todayNote, hotkey: "Mod+D", callback: today });
    api.ui.addRibbonIcon({ id: "today", title: t.ribbonDaily, icon: DAILY_ICON, onClick: today });
    api.ui.addRibbonIcon({ id: "open", title: t.ribbonCalendar, icon: CALENDAR_ICON, onClick: openCalendar });
  },
};

export default calendar;

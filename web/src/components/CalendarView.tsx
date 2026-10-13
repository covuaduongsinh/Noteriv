"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  formatDate,
  buildCalendarMonth,
  getWeekdayHeaders,
  extractTasks,
  extractFrontmatterDue,
  type CalendarDay,
  type TaskItem,
} from "@/lib/calendar-utils";
import { webApi } from "@/lib/webApi";

interface CalendarViewProps {
  vaultId: string;
  onFileSelect: (notePath: string) => void;
  onCreateDailyNote: (date: string) => void;
  onClose: () => void;
}

export default function CalendarView({ vaultId, onFileSelect, onCreateDailyNote, onClose }: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>(formatDate(today));
  const [dailyNotes, setDailyNotes] = useState<Map<string, string>>(new Map());
  const [tasksByDate, setTasksByDate] = useState<Map<string, number>>(new Map());
  const [notesByDate, setNotesByDate] = useState<Map<string, number>>(new Map());
  const [dayTasks, setDayTasks] = useState<TaskItem[]>([]);
  const [dayNotes, setDayNotes] = useState<{ name: string; path: string }[]>([]);

  // Scan vault for data. Ported from desktop's electronAPI.listAllFiles +
  // per-file readFile loop — web has no bulk "read every file" primitive, so
  // this fetches the index (cheap: name/path only) then each note's content
  // individually, same N+1-fetch tradeoff Phase 2 already made for tag-utils/
  // GraphView.
  useEffect(() => {
    async function scan() {
      const index = await webApi.vaults.index(vaultId);
      const daily = new Map<string, string>();
      const tasks = new Map<string, number>();
      const notes = new Map<string, number>();

      for (const summary of index.notes) {
        const nameMatch = summary.name.match(/^(\d{4}-\d{2}-\d{2})\.(md|markdown)$/i);
        if (nameMatch) {
          daily.set(nameMatch[1], summary.path);
          notes.set(nameMatch[1], (notes.get(nameMatch[1]) || 0) + 1);
        }

        const note = await webApi.notes.get(vaultId, summary.id);
        const fileTasks = extractTasks(note.content, summary.path);
        for (const task of fileTasks) {
          if (task.dueDate) {
            tasks.set(task.dueDate, (tasks.get(task.dueDate) || 0) + 1);
          }
        }
        const fmDue = extractFrontmatterDue(note.content);
        if (fmDue) {
          tasks.set(fmDue, (tasks.get(fmDue) || 0) + 1);
        }
      }

      setDailyNotes(daily);
      setTasksByDate(tasks);
      setNotesByDate(notes);
    }
    scan();
  }, [vaultId, year, month]);

  // Load details for selected date
  useEffect(() => {
    async function loadDay() {
      if (!selectedDate) return;
      const index = await webApi.vaults.index(vaultId);
      const tasks: TaskItem[] = [];
      const notesForDay: { name: string; path: string }[] = [];

      for (const summary of index.notes) {
        if (summary.name.startsWith(selectedDate)) {
          notesForDay.push({ name: summary.name.replace(/\.(md|markdown)$/i, ""), path: summary.path });
        }

        const note = await webApi.notes.get(vaultId, summary.id);
        const fileTasks = extractTasks(note.content, summary.path);
        for (const task of fileTasks) {
          if (task.dueDate === selectedDate) tasks.push(task);
        }
      }

      setDayTasks(tasks);
      setDayNotes(notesForDay);
    }
    loadDay();
  }, [selectedDate, vaultId]);

  const calendarData = useMemo(
    () => buildCalendarMonth(year, month, dailyNotes, tasksByDate, notesByDate),
    [year, month, dailyNotes, tasksByDate, notesByDate]
  );

  const weekdays = useMemo(() => getWeekdayHeaders(), []);

  const handlePrevMonth = useCallback(() => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }, [month]);

  const handleNextMonth = useCallback(() => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }, [month]);

  const handleToday = useCallback(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelectedDate(formatDate(now));
  }, []);

  const handleDayClick = useCallback((day: CalendarDay) => {
    setSelectedDate(formatDate(day.date));
  }, []);

  const handleDayDoubleClick = useCallback((day: CalendarDay) => {
    if (day.dailyNotePath) {
      onFileSelect(day.dailyNotePath);
      onClose();
    } else {
      onCreateDailyNote(formatDate(day.date));
      onClose();
    }
  }, [onFileSelect, onCreateDailyNote, onClose]);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 90,
      background: "rgba(0,0,0,0.6)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }} onClick={onClose}>
      <div style={{
        background: "var(--bg-primary)",
        borderRadius: 12,
        border: "1px solid var(--bg-tertiary)",
        width: 720,
        maxHeight: "80vh",
        display: "flex",
        overflow: "hidden",
      }} onClick={(e) => e.stopPropagation()}>
        {/* Calendar grid */}
        <div style={{ flex: 1, padding: 20 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <button onClick={handlePrevMonth} style={navBtnStyle}>&lt;</button>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: "var(--text-primary)", fontSize: 18, fontWeight: 600 }}>
                {monthNames[month]} {year}
              </span>
              <button onClick={handleToday} style={{
                padding: "2px 8px", borderRadius: 4, border: "1px solid var(--border)",
                background: "transparent", color: "var(--accent)", fontSize: 11, cursor: "pointer",
              }}>Today</button>
            </div>
            <button onClick={handleNextMonth} style={navBtnStyle}>&gt;</button>
          </div>

          {/* Weekday headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
            {weekdays.map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: 11, color: "var(--text-secondary)", padding: 4, fontWeight: 600 }}>{d}</div>
            ))}
          </div>

          {/* Day grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {calendarData.days.map((day, i) => {
              const dateStr = formatDate(day.date);
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={i}
                  onClick={() => handleDayClick(day)}
                  onDoubleClick={() => handleDayDoubleClick(day)}
                  style={{
                    aspectRatio: "1",
                    border: "none",
                    borderRadius: 6,
                    background: isSelected ? "var(--border)" : day.isToday ? "var(--bg-tertiary)" : "transparent",
                    color: !day.isCurrentMonth ? "var(--text-muted)" : day.isToday ? "var(--accent)" : "var(--text-primary)",
                    fontSize: 13,
                    fontWeight: day.isToday ? 700 : 400,
                    cursor: "pointer",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    outline: isSelected ? "2px solid var(--accent)" : "none",
                    outlineOffset: -2,
                  }}
                >
                  {day.dayOfMonth}
                  <div style={{ display: "flex", gap: 2 }}>
                    {day.hasDailyNote && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent)" }} />}
                    {day.taskCount > 0 && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--green)" }} />}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11, color: "var(--text-secondary)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} /> Daily note
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} /> Due tasks
            </span>
          </div>
        </div>

        {/* Day detail sidebar */}
        <div style={{
          width: 240,
          borderLeft: "1px solid var(--bg-tertiary)",
          padding: 16,
          overflowY: "auto",
          background: "var(--bg-secondary)",
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>
            {selectedDate}
          </div>

          {dayNotes.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6, fontWeight: 600 }}>Notes</div>
              {dayNotes.map((n) => (
                <button
                  key={n.path}
                  onClick={() => { onFileSelect(n.path); onClose(); }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "4px 8px",
                    border: "none",
                    borderRadius: 4,
                    background: "transparent",
                    color: "var(--accent)",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {n.name}
                </button>
              ))}
            </div>
          )}

          {dayTasks.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 6, fontWeight: 600 }}>Tasks Due</div>
              {dayTasks.map((t, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 6,
                  padding: "4px 0",
                  fontSize: 12,
                  color: t.completed ? "var(--text-muted)" : "var(--text-primary)",
                  textDecoration: t.completed ? "line-through" : "none",
                }}>
                  <span style={{ color: t.completed ? "var(--green)" : "var(--yellow)" }}>
                    {t.completed ? "✓" : "○"}
                  </span>
                  <span>{t.text}</span>
                </div>
              ))}
            </div>
          )}

          {dayNotes.length === 0 && dayTasks.length === 0 && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
              No notes or tasks for this day.
              <button
                onClick={() => { onCreateDailyNote(selectedDate); onClose(); }}
                style={{
                  display: "block",
                  marginTop: 8,
                  padding: "4px 0",
                  border: "none",
                  background: "transparent",
                  color: "var(--accent)",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Create daily note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  border: "1px solid var(--border)",
  borderRadius: 6,
  background: "transparent",
  color: "var(--text-primary)",
  fontSize: 14,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import { webApi, type ApiNoteSnapshot } from "@/lib/webApi";

const ReadOnlyView = dynamic(() => import("./ReadOnlyView"), { ssr: false });

interface TimeScrubberProps {
  vaultId: string;
  noteId: string;
  notePath: string;
  currentContent: string;
  onRestore: (content: string) => void;
  onClose: () => void;
}

interface Frame {
  timestamp: number;
  snapshotId: string | null; // null = live "now" frame
  size: number;
}

function formatWhen(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatFull(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function TimeScrubber({
  vaultId,
  noteId,
  notePath,
  currentContent,
  onRestore,
  onClose,
}: TimeScrubberProps) {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [idx, setIdx] = useState(0);
  const [preview, setPreview] = useState<string>(currentContent);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const loadSeq = useRef(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const snaps: ApiNoteSnapshot[] = await webApi.notes.snapshots(vaultId, noteId).catch(() => []);
      if (cancelled) return;
      const ordered = [...snaps].reverse(); // oldest -> newest
      const all: Frame[] = [
        ...ordered.map((s) => ({ timestamp: new Date(s.createdAt).getTime(), snapshotId: s.id, size: s.size })),
        { timestamp: Date.now(), snapshotId: null, size: new Blob([currentContent]).size },
      ];
      setFrames(all);
      setIdx(all.length - 1);
      setPreview(currentContent);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // currentContent intentionally excluded: capture at open time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaultId, noteId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setIdx((i) => Math.min(frames.length - 1, i + 1));
      } else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, frames.length]);

  useEffect(() => {
    if (frames.length === 0) return;
    const frame = frames[idx];
    if (!frame) return;
    if (frame.snapshotId === null) {
      setPreview(currentContent);
      return;
    }
    const seq = ++loadSeq.current;
    (async () => {
      const { content } = await webApi.notes.snapshotContent(vaultId, noteId, frame.snapshotId!).catch(() => ({ content: "" }));
      if (seq !== loadSeq.current) return;
      setPreview(content ?? "");
    })();
  }, [idx, frames, currentContent, vaultId, noteId]);

  useEffect(() => {
    if (!playing) return;
    if (idx >= frames.length - 1) {
      setPlaying(false);
      return;
    }
    const t = setTimeout(() => setIdx((i) => Math.min(frames.length - 1, i + 1)), 450);
    return () => clearTimeout(t);
  }, [playing, idx, frames.length]);

  const current = frames[idx];
  const isLive = current?.snapshotId === null;

  const handleRestore = useCallback(() => {
    if (!current || isLive) return;
    onRestore(preview);
  }, [current, isLive, preview, onRestore]);

  const sliderMax = Math.max(0, frames.length - 1);

  const ticks = useMemo(() => {
    if (frames.length <= 1) return [];
    return frames.map((f, i) => ({ left: (i / (frames.length - 1)) * 100, isLive: f.snapshotId === null }));
  }, [frames]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-primary)]">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3 min-w-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-[var(--accent)] shrink-0">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 4v4l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--text-primary)] truncate">Time Scrubber</div>
            <div className="text-[11px] text-[var(--text-muted)] truncate">{notePath.split("/").pop()}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          title="Close (Esc)"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-sm text-[var(--text-muted)]">Loading snapshots...</div>
        ) : frames.length <= 1 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
            <div className="text-sm text-[var(--text-primary)]">No history yet for this note</div>
            <div className="text-xs text-[var(--text-muted)] max-w-md">
              Snapshots are captured automatically every ~10 minutes while this note changes. Keep editing and a timeline will build up here.
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-8 py-6">
            <ReadOnlyView content={preview} />
          </div>
        )}
      </div>

      {frames.length > 1 && (
        <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)] px-5 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (idx >= frames.length - 1) setIdx(0);
                setPlaying((p) => !p);
              }}
              className="p-2 rounded-full bg-[var(--accent)] text-[var(--bg-primary)] hover:opacity-90 shrink-0"
              title={playing ? "Pause (Space)" : "Play (Space)"}
            >
              {playing ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="4" y="3" width="3" height="10" />
                  <rect x="9" y="3" width="3" height="10" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 3v10l9-5z" />
                </svg>
              )}
            </button>

            <div className="shrink-0 min-w-[140px]">
              <div className="text-xs font-medium text-[var(--text-primary)]">
                {isLive ? "Now (unsaved)" : formatWhen(current?.timestamp ?? 0)}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] truncate">{current ? formatFull(current.timestamp) : ""}</div>
            </div>

            <div className="flex-1 relative h-8 flex items-center">
              <div className="absolute inset-x-0 h-1 bg-[var(--border)] rounded-full" />
              <div
                className="absolute h-1 bg-[var(--accent)] rounded-full"
                style={{ width: `${sliderMax === 0 ? 0 : (idx / sliderMax) * 100}%` }}
              />
              {ticks.map((t, i) => (
                <div
                  key={i}
                  className={`absolute w-0.5 h-2 rounded-full ${
                    t.isLive ? "bg-[var(--green)]" : i === idx ? "bg-[var(--accent)]" : "bg-[var(--text-muted)] opacity-40"
                  }`}
                  style={{ left: `calc(${t.left}% - 1px)` }}
                />
              ))}
              <input
                type="range"
                min={0}
                max={sliderMax}
                value={idx}
                onChange={(e) => {
                  setPlaying(false);
                  setIdx(parseInt(e.target.value, 10));
                }}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
              <div
                className="absolute w-3 h-3 rounded-full bg-[var(--accent)] border-2 border-[var(--bg-secondary)] pointer-events-none shadow"
                style={{ left: `calc(${sliderMax === 0 ? 0 : (idx / sliderMax) * 100}% - 6px)` }}
              />
            </div>

            <div className="shrink-0 text-[11px] text-[var(--text-muted)] tabular-nums">
              {idx + 1} / {frames.length}
            </div>

            <button
              onClick={handleRestore}
              disabled={isLive}
              className="shrink-0 px-3 py-1.5 text-xs rounded-lg bg-[var(--accent)] text-[var(--bg-primary)] font-medium hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
              title={isLive ? "This is the current version" : "Restore this version"}
            >
              Restore this version
            </button>
          </div>

          <div className="mt-2 text-[10px] text-[var(--text-muted)] text-center">← → step · Space play/pause · Esc close</div>
        </div>
      )}
    </div>
  );
}

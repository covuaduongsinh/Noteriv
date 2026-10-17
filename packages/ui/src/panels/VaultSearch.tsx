"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NoteRef, NoteSearchHit, VaultAdapter } from "@noteriv/core/vault-adapter";

export interface VaultSearchLabels {
  placeholder: string;
  noResults: string;
  hint: string;
}

const DEFAULT_LABELS: VaultSearchLabels = {
  placeholder: "Search across all notes…",
  noResults: "No results found",
  hint: "Start typing to search across all notes",
};

export interface VaultSearchProps {
  adapter: VaultAdapter;
  /** Opens the note, at `line` (1-based) when the result is a matching line. */
  onOpen: (ref: NoteRef, line?: number) => void;
  onClose: () => void;
  labels?: Partial<VaultSearchLabels>;
  /** Wait after the last keystroke before searching (ms). */
  debounceMs?: number;
}

interface Row {
  ref: NoteRef;
  line?: number;
  text: string;
}

/** One row per matching line (or per note when the backend gives no lines). */
function toRows(hits: NoteSearchHit[]): Row[] {
  const rows: Row[] = [];
  for (const h of hits) {
    if (h.matches && h.matches.length > 0) {
      for (const m of h.matches) rows.push({ ref: h.ref, line: m.line, text: m.text });
    } else {
      rows.push({ ref: h.ref, text: h.snippet.replace(/<\/?b>/g, "") });
    }
  }
  return rows;
}

/**
 * Search across the vault as you type, results listed by matching line; Enter or a click opens the note at that line.
 * Shared by web and desktop (the search itself is the adapter's: Postgres full-text on the web, a file scan on desktop).
 */
export default function VaultSearch({ adapter, onOpen, onClose, labels, debounceMs = 250 }: VaultSearchProps) {
  const t = { ...DEFAULT_LABELS, ...labels };
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState(0);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setRows([]);
      setSelected(0);
      setSearching(false);
      return;
    }
    setSearching(true);
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      try {
        const hits = await adapter.search(q);
        if (mine !== seq.current) return; // a newer query is on its way
        setRows(toRows(hits));
        setSelected(0);
      } catch {
        if (mine === seq.current) setRows([]);
      } finally {
        if (mine === seq.current) setSearching(false);
      }
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [query, adapter, debounceMs]);

  useEffect(() => {
    const item = listRef.current?.children[selected] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const open = useCallback(
    (row: Row) => {
      onOpen(row.ref, row.line);
      onClose();
    },
    [onOpen, onClose]
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rows[selected]) open(rows[selected]);
    }
  };

  const terms = useMemo(() => query.trim().toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const highlight = (text: string) => {
    const lower = text.toLowerCase();
    const term = terms.find((w) => lower.includes(w));
    if (!term) return text;
    const i = lower.indexOf(term);
    return (
      <>
        {text.slice(0, i)}
        <mark className="search-highlight">{text.slice(i, i + term.length)}</mark>
        {text.slice(i + term.length)}
      </>
    );
  };

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div className="palette palette-wide" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={t.placeholder}>
        <div className="palette-input-wrap">
          <svg width="14" height="14" viewBox="0 0 14 14" className="palette-icon" aria-hidden="true">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t.placeholder}
            className="palette-input"
          />
          {searching && <span className="palette-spinner" />}
        </div>
        <div className="palette-list palette-list-tall" ref={listRef} role="listbox">
          {rows.map((r, i) => (
            <button
              key={`${r.ref.id}:${r.line ?? i}`}
              role="option"
              aria-selected={i === selected}
              className={`palette-item palette-search-item ${i === selected ? "palette-item-active" : ""}`}
              onClick={() => open(r)}
              onMouseEnter={() => setSelected(i)}
            >
              <div className="search-result-top">
                <span className="search-result-file">{r.ref.name.replace(/\.(md|markdown)$/i, "")}</span>
                {r.line !== undefined && <span className="search-result-line">:{r.line}</span>}
              </div>
              <div className="search-result-text">{highlight(r.text)}</div>
            </button>
          ))}
          {!searching && query.trim() && rows.length === 0 && <div className="palette-empty">{t.noResults}</div>}
          {!query.trim() && <div className="palette-empty">{t.hint}</div>}
        </div>
      </div>
    </div>
  );
}

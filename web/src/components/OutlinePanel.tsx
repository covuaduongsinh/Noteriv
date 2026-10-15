"use client";

import { useMemo } from "react";
import { extractOutline } from "@noteriv/core/outline-utils";

interface OutlinePanelProps {
  content: string;
  onHeadingClick: (line: number) => void;
  onClose: () => void;
}

export default function OutlinePanel({ content, onHeadingClick, onClose }: OutlinePanelProps) {
  const headings = useMemo(() => extractOutline(content), [content]);

  const minLevel = headings.length > 0 ? Math.min(...headings.map((h) => h.level)) : 1;

  return (
    <div className="outline-panel">
      <div className="outline-header">
        <span className="outline-title">Outline</span>
        <button onClick={onClose} className="outline-close" title="Close">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="outline-list">
        {headings.length === 0 ? (
          <div className="outline-empty">No headings found</div>
        ) : (
          headings.map((h, i) => (
            <button
              key={i}
              className={`outline-item outline-h${h.level}`}
              style={{ paddingLeft: `${(h.level - minLevel) * 16 + 12}px` }}
              onClick={() => onHeadingClick(h.line)}
            >
              <span className="outline-level">H{h.level}</span>
              <span className="outline-text">{h.text}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

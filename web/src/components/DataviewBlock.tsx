"use client";

import { useState, useEffect, useMemo } from "react";
import { parseQuery, executeQuery, parseNoteData, type QueryResult, type NoteData } from "@/lib/dataview";
import { webApi } from "@/lib/webApi";

interface DataviewBlockProps {
  query: string;
  vaultId: string;
  onFileSelect?: (notePath: string) => void;
}

export default function DataviewBlock({ query, vaultId, onFileSelect }: DataviewBlockProps) {
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parsed = useMemo(() => parseQuery(query), [query]);

  useEffect(() => {
    async function run() {
      if ("error" in parsed) {
        setError(parsed.error);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const index = await webApi.vaults.index(vaultId);
        const notes: NoteData[] = [];

        for (const summary of index.notes) {
          const note = await webApi.notes.get(vaultId, summary.id);
          notes.push(
            parseNoteData(note.path, note.content, {
              created: note.createdAt,
              modified: note.updatedAt,
              size: note.sizeBytes,
            })
          );
        }

        const result = executeQuery(parsed, notes);
        setResult(result);
        setError(null);
      } catch (err) {
        setError(String(err));
      }
      setLoading(false);
    }
    run();
  }, [parsed, vaultId]);

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)", fontSize: 12 }}>
          <div style={{
            width: 12, height: 12, border: "2px solid var(--accent)", borderTopColor: "transparent",
            borderRadius: "50%", animation: "spin 1s linear infinite",
          }} />
          Running query...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...containerStyle, borderColor: "var(--red)" }}>
        <div style={{ color: "var(--red)", fontSize: 12 }}>Dataview Error: {error}</div>
        <pre style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 4, opacity: 0.7 }}>{query}</pre>
      </div>
    );
  }

  if (!result) return null;

  // TABLE view
  if (result.type === "TABLE") {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>TABLE</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {result.fields.map((f) => (
                <th key={f} style={thStyle}>{f}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--bg-tertiary)" }}>
                {result.fields.map((f) => (
                  <td key={f} style={tdStyle}>
                    {f === "file.name" ? (
                      <button
                        onClick={() => onFileSelect?.(row["file.path"])}
                        style={linkStyle}
                      >{row[f]}</button>
                    ) : (
                      row[f] || ""
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {result.rows.length === 0 && (
              <tr><td colSpan={result.fields.length} style={{ ...tdStyle, color: "var(--text-muted)", textAlign: "center" }}>No results</td></tr>
            )}
          </tbody>
        </table>
        <div style={footerStyle}>{result.rows.length} results</div>
      </div>
    );
  }

  // LIST view
  if (result.type === "LIST") {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>LIST</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {result.rows.map((row, i) => (
            <li key={i} style={{ padding: "3px 0" }}>
              <button
                onClick={() => onFileSelect?.(row["file.path"])}
                style={linkStyle}
              >{row["file.name"]}</button>
            </li>
          ))}
          {result.rows.length === 0 && (
            <li style={{ color: "var(--text-muted)", fontSize: 12 }}>No results</li>
          )}
        </ul>
        <div style={footerStyle}>{result.rows.length} results</div>
      </div>
    );
  }

  // TASK view
  if (result.type === "TASK" && result.tasks) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>TASK</div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {result.tasks.map((task, i) => (
            <li key={i} style={{
              display: "flex", alignItems: "flex-start", gap: 6, padding: "3px 0",
              color: task.completed ? "var(--text-muted)" : "var(--text-primary)", fontSize: 12,
            }}>
              <span style={{
                width: 14, height: 14, borderRadius: 3, flexShrink: 0, marginTop: 1,
                border: task.completed ? "none" : "1.5px solid var(--text-muted)",
                background: task.completed ? "var(--green)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--bg-primary)", fontSize: 9,
              }}>{task.completed ? "✓" : ""}</span>
              <span style={{ textDecoration: task.completed ? "line-through" : "none" }}>{task.text}</span>
              <button
                onClick={() => onFileSelect?.(task.filePath)}
                style={{ ...linkStyle, fontSize: 10, opacity: 0.6, marginLeft: "auto" }}
              >{task.fileName}</button>
            </li>
          ))}
          {result.tasks.length === 0 && (
            <li style={{ color: "var(--text-muted)", fontSize: 12 }}>No tasks found</li>
          )}
        </ul>
        <div style={footerStyle}>{result.tasks.length} tasks</div>
      </div>
    );
  }

  return null;
}

const containerStyle: React.CSSProperties = {
  background: "var(--bg-tertiary)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: 12,
  margin: "8px 0",
};

const headerStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: "var(--accent)",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  marginBottom: 8,
};

const footerStyle: React.CSSProperties = {
  fontSize: 10,
  color: "var(--text-muted)",
  marginTop: 8,
  textAlign: "right" as const,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "6px 8px",
  color: "var(--text-secondary)",
  fontSize: 11,
  fontWeight: 600,
  borderBottom: "1px solid var(--border)",
};

const tdStyle: React.CSSProperties = {
  padding: "6px 8px",
  color: "var(--text-primary)",
  fontSize: 12,
};

const linkStyle: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "var(--accent)",
  fontSize: 12,
  cursor: "pointer",
  padding: 0,
  textDecoration: "none",
};

"use client";

import type { FormattingAction } from "./editor-commands";

// The action type and runFormattingAction live in editor-commands.ts (no CodeMirror at runtime), so a host can run an
// action without loading the editor; they are re-exported here as before.
export { runFormattingAction, type FormattingAction } from "./editor-commands";

const actions: { action: FormattingAction; label: string; shortcut?: string; content: string; className?: string }[] = [
  { action: "toggleBold", label: "Bold", content: "B", className: "formatting-toolbar-bold" },
  { action: "toggleItalic", label: "Italic", shortcut: "Ctrl+I", content: "I", className: "formatting-toolbar-italic" },
  { action: "toggleStrikethrough", label: "Strikethrough", content: "S", className: "formatting-toolbar-strike" },
  { action: "toggleCode", label: "Inline code", shortcut: "Ctrl+`", content: "<>" },
  { action: "insertLink", label: "Insert link", shortcut: "Ctrl+K", content: "Link" },
  { action: "insertImage", label: "Insert image", content: "Image" },
  { action: "insertBlockquote", label: "Blockquote", content: "Quote" },
  { action: "insertCodeBlock", label: "Code block", content: "Code" },
  { action: "insertTaskList", label: "Task list", content: "Task" },
  { action: "insertTable", label: "Insert table", content: "Table" },
  { action: "insertHorizontalRule", label: "Horizontal rule", content: "Rule" },
];

/**
 * The toolbar only reports which button was pressed. What an action does is the host's call: the web app runs the
 * editor commands directly (runFormattingAction), the desktop app routes through its hotkey dispatcher, which
 * knows about more commands than these.
 */
export default function FormattingToolbar({ onAction }: { onAction: (action: FormattingAction) => void }) {
  return (
    <div className="formatting-toolbar" aria-label="Formatting toolbar">
      {actions.map(({ action, label, shortcut, content, className }) => (
        <button
          key={action}
          type="button"
          className={`formatting-toolbar-button ${className || ""}`}
          title={shortcut ? `${label} (${shortcut})` : label}
          aria-label={label}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onAction(action)}
        >
          {content}
        </button>
      ))}
    </div>
  );
}

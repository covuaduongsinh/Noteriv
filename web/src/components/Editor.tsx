"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { EditorView, keymap, drawSelection } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { search, searchKeymap } from "@codemirror/search";
import {
  liveMarkdownPlugin,
  markdownRenderTheme,
  mdHighlightStyle,
  editorTheme,
  mathExtension,
} from "@noteriv/ui/markdown";
import { wikilinkAutocompletion } from "@/lib/wikilink-completion";
import { setEditorViewForImages } from "@noteriv/ui/markdown";
import { vimExtension } from "@/lib/vim-mode";
import { prefsCompartment, prefsExtension } from "@/lib/editor-prefs";

interface EditorProps {
  content: string;
  onChange: (value: string) => void;
  onViewReady?: (view: EditorView) => void;
  vaultId?: string;
  className?: string;
  focusMode?: boolean;
  /** Fires when the pointer rests over a rendered `.md-wikilink` span — Phase C5 hover preview. */
  onWikilinkHover?: (target: string, x: number, y: number) => void;
  onWikilinkLeave?: () => void;
  /** Phase D7 — ported from desktop/src/lib/vim-mode.ts. Toggling recreates
   * the CodeMirror instance (see createEditor's deps below) since the vim
   * keymap has to be present at state-creation time, not added after. */
  vimMode?: boolean;
  spellCheck?: boolean;
  tabSize?: number;
}

export default function Editor({ content, onChange, onViewReady, vaultId, className = "", focusMode = false, onWikilinkHover, onWikilinkLeave, vimMode = false, spellCheck = false, tabSize = 4 }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onWikilinkHoverRef = useRef(onWikilinkHover);
  const onWikilinkLeaveRef = useRef(onWikilinkLeave);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => { onChangeRef.current = onChange; });
  useEffect(() => { onWikilinkHoverRef.current = onWikilinkHover; });
  useEffect(() => { onWikilinkLeaveRef.current = onWikilinkLeave; });

  const createEditor = useCallback(() => {
    if (!editorRef.current) return;
    if (viewRef.current) viewRef.current.destroy();

    const state = EditorState.create({
      doc: content,
      extensions: [
        ...vimExtension(vimMode),
        prefsCompartment.of(prefsExtension(spellCheck, tabSize)),
        drawSelection(),
        closeBrackets(),
        history(),
        ...(vaultId ? [wikilinkAutocompletion(vaultId)] : []),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        syntaxHighlighting(mdHighlightStyle),
        editorTheme,
        markdownRenderTheme,
        liveMarkdownPlugin,
        mathExtension(),
        search({ top: true }),
        keymap.of([
          ...searchKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...closeBracketsKeymap,
          indentWithTab,
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.domEventHandlers({
          mouseover(event) {
            const el = (event.target as HTMLElement).closest(".md-wikilink");
            const target = el?.getAttribute("data-target");
            if (target && onWikilinkHoverRef.current) {
              onWikilinkHoverRef.current(target, event.clientX, event.clientY);
            }
          },
          mouseout(event) {
            const el = (event.target as HTMLElement).closest(".md-wikilink");
            if (el) onWikilinkLeaveRef.current?.();
          },
        }),
        EditorView.lineWrapping,
      ],
    });

    viewRef.current = new EditorView({ state, parent: editorRef.current });
    setEditorViewForImages(viewRef.current);
    onViewReady?.(viewRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vimMode]);

  useEffect(() => {
    createEditor();
    return () => { viewRef.current?.destroy(); };
  }, [createEditor]);

  // Sync external content changes
  useEffect(() => {
    if (!viewRef.current) return;
    const current = viewRef.current.state.doc.toString();
    if (current !== content) {
      viewRef.current.dispatch({
        changes: { from: 0, to: current.length, insert: content },
      });
    }
  }, [content]);

  // Apply spell-check / tab-size changes to the live editor without recreating it.
  useEffect(() => {
    viewRef.current?.dispatch({ effects: prefsCompartment.reconfigure(prefsExtension(spellCheck, tabSize)) });
  }, [spellCheck, tabSize]);

  // Toggle focus mode via CSS class on editor container
  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.classList.toggle("editor-focus-mode", focusMode);
  }, [focusMode]);

  // Image drag & drop visual feedback only — actual attachment upload needs
  // the S3-backed attachments endpoint from Phase 6
  // (docs/plans/2026-10-12-noteriv-web-version.md §9), not built yet. The
  // drop handler resets state without inserting anything so dragging a file
  // in doesn't silently do nothing with no feedback.
  useEffect(() => {
    const container = editorRef.current;
    if (!container) return;

    let dragCounter = 0;

    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      dragCounter++;
      setIsDragOver(true);
    };

    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes("Files")) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "none";
    };

    const onDragLeave = () => {
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsDragOver(false);
      }
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      setIsDragOver(false);
      // Phase 6: wire attachment upload here (POST to the attachments endpoint,
      // then insert `![](...)` pointing at the returned URL).
    };

    container.addEventListener("dragenter", onDragEnter);
    container.addEventListener("dragover", onDragOver);
    container.addEventListener("dragleave", onDragLeave);
    container.addEventListener("drop", onDrop, true);

    return () => {
      container.removeEventListener("dragenter", onDragEnter);
      container.removeEventListener("dragover", onDragOver);
      container.removeEventListener("dragleave", onDragLeave);
      container.removeEventListener("drop", onDrop, true);
    };
  }, []);

  return (
    <div
      ref={editorRef}
      className={`h-full overflow-hidden ${className}${isDragOver ? " editor-drop-active" : ""}`}
    />
  );
}

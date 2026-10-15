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
import type { VaultAdapter } from "@noteriv/core/vault-adapter";
import {
  liveMarkdownPlugin,
  markdownRenderTheme,
  mdHighlightStyle,
  editorTheme,
  mathExtension,
  setEditorViewForImages,
} from "../markdown";
import { wikilinkAutocompletion, type WikilinkLabel } from "./wikilink-completion";
import { vimExtension } from "./vim-mode";
import { prefsCompartment, prefsExtension, type EditorPrefs } from "./editor-prefs";

export interface EditorProps {
  content: string;
  onChange: (value: string) => void;
  onViewReady?: (view: EditorView) => void;
  /** Vault whose notes `[[` completes against. Without it completion stays off. */
  adapter?: VaultAdapter | null;
  /** How `[[` suggestions are named; see WikilinkLabel. */
  wikilinkLabel?: WikilinkLabel;
  className?: string;
  focusMode?: boolean;
  /** Fires when the pointer rests over a rendered `.md-wikilink` span — Phase C5 hover preview. */
  onWikilinkHover?: (target: string, x: number, y: number) => void;
  onWikilinkLeave?: () => void;
  /** Toggling recreates the CodeMirror instance (see createEditor's deps below) since the vim
   * keymap has to be present at state-creation time, not added after. */
  vimMode?: boolean;
  /** Spell check and tab size, applied live without recreating the editor. Unset keeps CodeMirror's defaults. */
  prefs?: EditorPrefs;
  /**
   * Handles image files dropped on the editor and returns the markdown to insert at the cursor (or null for
   * nothing). When absent the editor refuses file drops, as the web app does until attachments exist there.
   */
  onImageDrop?: (files: File[]) => Promise<string | null>;
}

export default function Editor({
  content,
  onChange,
  onViewReady,
  adapter = null,
  wikilinkLabel = "name",
  className = "",
  focusMode = false,
  onWikilinkHover,
  onWikilinkLeave,
  vimMode = false,
  prefs,
  onImageDrop,
}: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onWikilinkHoverRef = useRef(onWikilinkHover);
  const onWikilinkLeaveRef = useRef(onWikilinkLeave);
  const onImageDropRef = useRef(onImageDrop);
  const adapterRef = useRef(adapter);
  const prefsRef = useRef(prefs);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => { onChangeRef.current = onChange; });
  useEffect(() => { onWikilinkHoverRef.current = onWikilinkHover; });
  useEffect(() => { onWikilinkLeaveRef.current = onWikilinkLeave; });
  useEffect(() => { onImageDropRef.current = onImageDrop; });
  useEffect(() => { adapterRef.current = adapter; });
  useEffect(() => { prefsRef.current = prefs; });

  const createEditor = useCallback(() => {
    if (!editorRef.current) return;
    if (viewRef.current) viewRef.current.destroy();

    const state = EditorState.create({
      doc: content,
      extensions: [
        ...vimExtension(vimMode),
        prefsCompartment.of(prefsExtension(prefsRef.current)),
        drawSelection(),
        closeBrackets(),
        history(),
        wikilinkAutocompletion(() => adapterRef.current, wikilinkLabel),
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
    viewRef.current?.dispatch({ effects: prefsCompartment.reconfigure(prefsExtension(prefs)) });
  }, [prefs?.spellCheck, prefs?.tabSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle focus mode via CSS class on editor container
  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.classList.toggle("editor-focus-mode", focusMode);
  }, [focusMode]);

  // File drag & drop — native DOM on the container div, NOT inside CodeMirror (the container wraps the whole
  // instance). The drop is captured before CodeMirror sees it. Without an onImageDrop handler the editor shows
  // the "not allowed" cursor and drops nothing, so a dragged-in file never silently does nothing.
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
      e.dataTransfer.dropEffect = onImageDropRef.current ? "copy" : "none";
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

      const handler = onImageDropRef.current;
      if (!handler || !viewRef.current || !e.dataTransfer) return;

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;

      (async () => {
        const insertText = await handler(files);
        if (insertText && viewRef.current) {
          const pos = viewRef.current.state.selection.main.head;
          viewRef.current.dispatch({ changes: { from: pos, insert: insertText } });
        }
      })();
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

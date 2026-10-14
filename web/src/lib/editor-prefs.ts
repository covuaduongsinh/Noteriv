import { Compartment, EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { indentUnit } from "@codemirror/language";

/**
 * Per-user editor preferences that can change while a document is open (spell check,
 * tab size). Living in a Compartment lets the Settings modal reconfigure open editors
 * in place instead of rebuilding them (which would lose cursor and scroll position).
 */
export const prefsCompartment = new Compartment();

export function prefsExtension(spellCheck: boolean, tabSize: number) {
  return [
    EditorState.tabSize.of(tabSize),
    indentUnit.of(" ".repeat(tabSize)),
    EditorView.contentAttributes.of({ spellcheck: spellCheck ? "true" : "false" }),
  ];
}

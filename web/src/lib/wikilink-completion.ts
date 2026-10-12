import { EditorView } from "@codemirror/view";
import { CompletionContext, autocompletion, type Completion } from "@codemirror/autocomplete";
import { webApi } from "./webApi";

let cachedFiles: { label: string; path: string }[] = [];
let cacheVaultId = "";
let cacheTime = 0;
const CACHE_TTL = 5000;

async function loadFiles(vaultId: string): Promise<void> {
  if (!vaultId) return;
  const now = Date.now();
  if (vaultId === cacheVaultId && now - cacheTime < CACHE_TTL) return;

  try {
    const index = await webApi.vaults.index(vaultId);
    cachedFiles = index.notes.map((n) => ({
      label: n.name.replace(/\.(md|markdown)$/i, ""),
      path: n.path,
    }));
    cacheVaultId = vaultId;
    cacheTime = now;
  } catch {
    // ignore
  }
}

function wikilinkCompletions(vaultId: string) {
  return async (context: CompletionContext) => {
    const line = context.state.doc.lineAt(context.pos);
    const textBefore = line.text.slice(0, context.pos - line.from);
    const match = textBefore.match(/\[\[([^\]]*)$/);
    if (!match) return null;

    const query = match[1].toLowerCase();
    const from = context.pos - match[1].length;

    await loadFiles(vaultId);

    const options: Completion[] = cachedFiles
      .filter((f) => !query || f.label.toLowerCase().includes(query))
      .slice(0, 30)
      .map((f) => ({
        label: f.label,
        apply: (view: EditorView, _completion: Completion, from: number, to: number) => {
          // Count how many ] chars exist right after the cursor
          const docLen = view.state.doc.length;
          let closingBrackets = 0;
          for (let i = to; i < Math.min(to + 2, docLen); i++) {
            if (view.state.doc.sliceString(i, i + 1) === "]") closingBrackets++;
            else break;
          }
          // Replace from query start through any existing ]], always end with ]]
          const replaceTo = to + closingBrackets;
          const insert = f.label + "]]";
          view.dispatch({
            changes: { from, to: replaceTo, insert },
            selection: { anchor: from + insert.length },
          });
        },
      }));

    return {
      from,
      options,
      filter: false,
    };
  };
}

export function wikilinkAutocompletion(vaultId: string) {
  return autocompletion({
    override: [wikilinkCompletions(vaultId)],
    activateOnTyping: true,
    defaultKeymap: true,
  });
}

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import DOMPurify from "dompurify";
import type { EditorView } from "@codemirror/view";
import Editor from "@/components/Editor";
import QuickOpen from "@/components/QuickOpen";
import BacklinksPanel from "@/components/BacklinksPanel";
import CollabPanel from "@/components/CollabPanel";
import PluginManager from "@/components/PluginManager";
import { usePluginHost } from "@/lib/plugin-sandbox/usePluginHost";
import { startCollab, type CollabSession, type CollabPeer } from "@/lib/collab";
import { webApi, type ApiVault, type VaultIndex, type ApiNote, type ApiSearchResult } from "@/lib/webApi";

const SAVE_DEBOUNCE_MS = 800;

export default function VaultPage() {
  const params = useParams<{ vaultId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const vaultId = params.vaultId;

  const [vault, setVault] = useState<ApiVault | null>(null);
  const [index, setIndex] = useState<VaultIndex | null>(null);
  const [activeNote, setActiveNote] = useState<ApiNote | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [newNoteName, setNewNoteName] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const [backlinksVisible, setBacklinksVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ApiSearchResult[] | null>(null);
  const [pluginManagerOpen, setPluginManagerOpen] = useState(false);
  const [collabVisible, setCollabVisible] = useState(false);
  const [collabConnected, setCollabConnected] = useState(false);
  const [collabPeers, setCollabPeers] = useState<CollabPeer[]>([]);
  const [displayName, setDisplayName] = useState<string | undefined>(undefined);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collabPushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const collabSessionRef = useRef<CollabSession | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  // Last content applied FROM a remote collab update. CodeMirror's update
  // listener fires for *any* doc change, including the programmatic dispatch
  // Editor.tsx does to reflect a new `content` prop — so a remote update
  // flows: collab onUpdate -> setDraft -> Editor re-renders -> CodeMirror
  // dispatch -> onChange -> onDraftChange. Without this guard, onDraftChange
  // would immediately push that same content back into Yjs as if the user had
  // typed it, and two tabs would echo each other's updates back and forth,
  // which Yjs's CRDT merges as concurrent edits — corrupting the text within
  // a few round trips. Comparing against the exact string we just received
  // (set synchronously, before setDraft) closes the loop regardless of timing.
  const lastRemoteContentRef = useRef<string | null>(null);

  useEffect(() => {
    webApi.auth.me().then((u) => setDisplayName(u.displayName)).catch(() => undefined);
  }, []);

  // Join/leave the realtime collab room for the open note as the panel is toggled
  // or the note changes — a web note already has a durable id, so "the room" is
  // just `note:{id}`, no code to generate/share like desktop needed.
  useEffect(() => {
    if (!collabVisible || !activeNote) {
      collabSessionRef.current?.destroy();
      collabSessionRef.current = null;
      setCollabConnected(false);
      setCollabPeers([]);
      return;
    }

    let cancelled = false;
    setCollabConnected(false);
    setCollabPeers([]);
    startCollab(
      activeNote.id,
      draftRef.current,
      (content) => {
        lastRemoteContentRef.current = content;
        setDraft(content);
        if (activeNote) scheduleSave(activeNote.id, content);
      },
      setCollabPeers,
      displayName
    ).then((session) => {
      if (cancelled || !session) return;
      collabSessionRef.current = session;
      setCollabConnected(true);
    });

    return () => {
      cancelled = true;
      collabSessionRef.current?.destroy();
      collabSessionRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collabVisible, activeNote?.id]);

  const refreshIndex = useCallback(() => {
    webApi.vaults.index(vaultId).then(setIndex);
  }, [vaultId]);

  const pluginHost = usePluginHost(
    vaultId,
    index,
    {
      getContent: () => draftRef.current,
      setContent: (content) => onDraftChange(content),
      insertAtCursor: (text) => {
        const view = editorViewRef.current;
        if (!view) return;
        const pos = view.state.selection.main.head;
        view.dispatch({ changes: { from: pos, insert: text }, selection: { anchor: pos + text.length } });
      },
      getSelection: () => {
        const view = editorViewRef.current;
        if (!view) return "";
        const sel = view.state.selection.main;
        return view.state.sliceDoc(sel.from, sel.to);
      },
      replaceSelection: (text) => {
        const view = editorViewRef.current;
        if (!view) return;
        const sel = view.state.selection.main;
        view.dispatch({ changes: { from: sel.from, to: sel.to, insert: text } });
      },
    },
    refreshIndex
  );

  const openNote = useCallback(
    async (noteId: string) => {
      const note = await webApi.notes.get(vaultId, noteId);
      setActiveNote(note);
      setDraft(note.content);
      setSearchResults(null);
      setSearchQuery("");
    },
    [vaultId]
  );

  useEffect(() => {
    webApi.vaults
      .get(vaultId)
      .then(setVault)
      .catch(() => router.replace("/vaults"));
    refreshIndex();
  }, [vaultId, router, refreshIndex]);

  // Open the note requested via ?note=<id> (used by the Graph view's note click)
  useEffect(() => {
    const noteId = searchParams.get("note");
    if (noteId && noteId !== activeNote?.id) {
      openNote(noteId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Cmd/Ctrl+K opens quick switcher
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuickOpenVisible(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function scheduleSave(noteId: string, content: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await webApi.notes.update(vaultId, noteId, { content });
        refreshIndex();
      } finally {
        setSaving(false);
      }
    }, SAVE_DEBOUNCE_MS);
  }

  function onDraftChange(value: string) {
    setDraft(value);
    if (activeNote) scheduleSave(activeNote.id, value);

    // Don't echo a just-received remote update back into Yjs as if it were a
    // fresh local edit (see lastRemoteContentRef's comment above).
    if (value === lastRemoteContentRef.current) return;

    if (collabSessionRef.current) {
      if (collabPushTimer.current) clearTimeout(collabPushTimer.current);
      collabPushTimer.current = setTimeout(() => {
        collabSessionRef.current?.pushLocalText(value);
      }, 300);
    }
  }

  async function submitNewNote(e: React.FormEvent) {
    e.preventDefault();
    const name = newNoteName?.trim();
    setNewNoteName(null);
    if (!name) return;
    const note = await webApi.notes.create(vaultId, { name, folderId: null, content: "" });
    refreshIndex();
    openNote(note.id);
  }

  async function submitNewFolder(e: React.FormEvent) {
    e.preventDefault();
    const name = newFolderName?.trim();
    setNewFolderName(null);
    if (!name) return;
    await webApi.folders.create(vaultId, { name });
    refreshIndex();
  }

  async function deleteNote(noteId: string) {
    if (confirmDeleteId !== noteId) {
      setConfirmDeleteId(noteId);
      return;
    }
    setConfirmDeleteId(null);
    await webApi.notes.remove(vaultId, noteId);
    if (activeNote?.id === noteId) {
      setActiveNote(null);
      setDraft("");
    }
    refreshIndex();
  }

  async function runSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const results = await webApi.vaults.search(vaultId, searchQuery.trim());
    setSearchResults(results);
  }

  const rootNotes = index?.notes.filter((n) => n.folderId === null) ?? [];

  return (
    <div className="h-screen flex">
      <aside className="w-64 flex flex-col border-r border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]">
          <Link href="/vaults" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            ← Vaults
          </Link>
          <span className="text-sm font-medium truncate ml-2">{vault?.name}</span>
        </div>

        <form onSubmit={runSearch} className="px-3 py-2 border-b border-[var(--border)]">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm trong nội dung…"
            className="w-full text-sm px-2 py-1.5 rounded-md bg-[var(--bg-tertiary)] outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </form>

        {searchResults !== null ? (
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <div className="flex items-center justify-between px-2 py-1 text-xs text-[var(--text-muted)]">
              <span>{searchResults.length} kết quả</span>
              <button onClick={() => { setSearchResults(null); setSearchQuery(""); }} className="hover:text-[var(--text-primary)]">
                Đóng
              </button>
            </div>
            {searchResults.map((r) => (
              <button
                key={r.id}
                onClick={() => openNote(r.id)}
                className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[var(--bg-tertiary)]"
              >
                <div className="text-sm text-[var(--text-primary)] truncate">{r.name}</div>
                <div
                  className="text-xs text-[var(--text-muted)] truncate [&_b]:text-[var(--text-primary)] [&_b]:font-semibold"
                  // ts_headline() only ever emits <b>…</b> around matched terms — restrict to that tag.
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(r.snippet, { ALLOWED_TAGS: ["b"] }) }}
                />
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="flex gap-2 px-3 py-2">
              <button
                onClick={() => setNewNoteName("Untitled.md")}
                className="flex-1 text-sm px-2 py-1.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)]"
              >
                + Note
              </button>
              <button
                onClick={() => setNewFolderName("")}
                className="flex-1 text-sm px-2 py-1.5 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)]"
              >
                + Folder
              </button>
            </div>

            {newNoteName !== null && (
              <form onSubmit={submitNewNote} className="px-3 pb-2">
                <input
                  autoFocus
                  value={newNoteName}
                  onChange={(e) => setNewNoteName(e.target.value)}
                  onBlur={() => setNewNoteName(null)}
                  onKeyDown={(e) => e.key === "Escape" && setNewNoteName(null)}
                  className="w-full text-sm px-2 py-1 rounded-md bg-[var(--bg-tertiary)] outline-none ring-1 ring-[var(--accent)]"
                />
              </form>
            )}

            {newFolderName !== null && (
              <form onSubmit={submitNewFolder} className="px-3 pb-2">
                <input
                  autoFocus
                  placeholder="Tên folder"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onBlur={() => setNewFolderName(null)}
                  onKeyDown={(e) => e.key === "Escape" && setNewFolderName(null)}
                  className="w-full text-sm px-2 py-1 rounded-md bg-[var(--bg-tertiary)] outline-none ring-1 ring-[var(--accent)]"
                />
              </form>
            )}

            <div className="flex-1 overflow-y-auto px-2 pb-4">
              {index?.folders.map((folder) => (
                <div key={folder.id} className="mb-1">
                  <div className="px-2 py-1 text-xs uppercase tracking-wide text-[var(--text-muted)]">
                    {folder.name}
                  </div>
                  {index.notes
                    .filter((n) => n.folderId === folder.id)
                    .map((note) => (
                      <NoteRow
                        key={note.id}
                        note={note}
                        active={activeNote?.id === note.id}
                        confirmingDelete={confirmDeleteId === note.id}
                        onOpen={() => openNote(note.id)}
                        onDelete={() => deleteNote(note.id)}
                      />
                    ))}
                </div>
              ))}

              {rootNotes.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  active={activeNote?.id === note.id}
                  confirmingDelete={confirmDeleteId === note.id}
                  onOpen={() => openNote(note.id)}
                  onDelete={() => deleteNote(note.id)}
                />
              ))}
            </div>
          </>
        )}
      </aside>

      <main className="flex-1 flex flex-col relative">
        {activeNote ? (
          <>
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border)] text-sm text-[var(--text-secondary)]">
              <span>{activeNote.path}</span>
              <div className="flex items-center gap-3">
                <span>{saving ? "Đang lưu…" : "Đã lưu"}</span>
                <button onClick={() => setBacklinksVisible((v) => !v)} className="hover:text-[var(--text-primary)]">
                  Backlinks
                </button>
                <button onClick={() => setCollabVisible((v) => !v)} className="hover:text-[var(--text-primary)]">
                  Collab{collabVisible && collabPeers.length > 0 ? ` (${collabPeers.length})` : ""}
                </button>
                <Link href={`/vaults/${vaultId}/graph`} className="hover:text-[var(--text-primary)]">
                  Graph
                </Link>
                <button onClick={() => setQuickOpenVisible(true)} className="hover:text-[var(--text-primary)]">
                  Quick open (⌘K)
                </button>
                <button onClick={() => setPluginManagerOpen(true)} className="hover:text-[var(--text-primary)]">
                  Plugins
                </button>
              </div>
            </div>
            {pluginHost.commands.length > 0 && (
              <div className="flex gap-2 px-4 py-1.5 border-b border-[var(--border)] text-xs">
                {pluginHost.commands.map((cmd) => (
                  <button
                    key={`${cmd.pluginDbId}:${cmd.id}`}
                    onClick={() => pluginHost.runCommand(cmd.pluginDbId, cmd.id)}
                    className="px-2 py-1 rounded-md bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)]"
                  >
                    {cmd.name}
                  </button>
                ))}
              </div>
            )}
            <div className="flex-1 flex min-h-0">
              <div className="flex-1 min-w-0">
                <Editor
                  content={draft}
                  onChange={onDraftChange}
                  vaultId={vaultId}
                  onViewReady={(view) => { editorViewRef.current = view; }}
                />
              </div>
              {backlinksVisible && (
                <div className="w-72 border-l border-[var(--border)] overflow-y-auto">
                  <BacklinksPanel
                    noteId={activeNote.id}
                    vaultId={vaultId}
                    onNoteOpen={openNote}
                    onClose={() => setBacklinksVisible(false)}
                  />
                </div>
              )}
              {collabVisible && (
                <CollabPanel
                  connected={collabConnected}
                  peers={collabPeers}
                  onClose={() => setCollabVisible(false)}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-[var(--text-muted)]">
            <span>Chọn hoặc tạo một note để bắt đầu</span>
            <div className="flex gap-3 text-sm">
              <button onClick={() => setQuickOpenVisible(true)} className="hover:text-[var(--text-primary)]">
                Quick open (⌘K)
              </button>
              <Link href={`/vaults/${vaultId}/graph`} className="hover:text-[var(--text-primary)]">
                Graph view
              </Link>
              <button onClick={() => setPluginManagerOpen(true)} className="hover:text-[var(--text-primary)]">
                Plugins
              </button>
            </div>
          </div>
        )}
      </main>

      {quickOpenVisible && (
        <QuickOpen
          vaultId={vaultId}
          onSelect={(noteId) => openNote(noteId)}
          onClose={() => setQuickOpenVisible(false)}
        />
      )}

      {pluginManagerOpen && (
        <PluginManager
          vaultId={vaultId}
          installed={pluginHost.installed}
          onChanged={pluginHost.refreshInstalled}
          onClose={() => setPluginManagerOpen(false)}
        />
      )}

      {/* Hidden sandboxed <iframe> per enabled plugin — see usePluginHost.ts */}
      <div ref={pluginHost.containerRef} style={{ display: "none" }} />

      {pluginHost.notices.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {pluginHost.notices.map((n) => (
            <div
              key={n.key}
              onClick={() => pluginHost.dismissNotice(n.key)}
              className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-sm cursor-pointer shadow-lg"
            >
              {n.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteRow({
  note,
  active,
  confirmingDelete,
  onOpen,
  onDelete,
}: {
  note: { id: string; name: string };
  active: boolean;
  confirmingDelete: boolean;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer text-sm ${
        active ? "bg-[var(--bg-hover)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
      }`}
      onClick={onOpen}
    >
      <span className="truncate">{note.name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title={confirmingDelete ? "Bấm lần nữa để xoá" : "Xoá note"}
        className={`px-1 ${
          confirmingDelete
            ? "text-[var(--red)] opacity-100"
            : "opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--red)]"
        }`}
      >
        {confirmingDelete ? "xoá?" : "×"}
      </button>
    </div>
  );
}

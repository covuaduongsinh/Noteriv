"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import ContextMenu, { type ContextMenuItem } from "@/components/ContextMenu";
import { ChevronIcon, PlusIcon } from "@/components/icons";
import { webApi, ApiError, type VaultIndex } from "@/lib/webApi";
import { createUntitledNote } from "@/lib/note-names";

const DND_TYPE = "application/x-noteriv-node";
interface DragPayload {
  type: "folder" | "note";
  id: string;
}

type TreeNode =
  | { type: "folder"; id: string; name: string; children: TreeNode[] }
  | { type: "note"; id: string; name: string; path: string };

function buildTree(index: VaultIndex): TreeNode[] {
  const childFolders = new Map<string | null, VaultIndex["folders"]>();
  for (const f of index.folders) {
    const key = f.parentId;
    if (!childFolders.has(key)) childFolders.set(key, []);
    childFolders.get(key)!.push(f);
  }
  const notesByFolder = new Map<string | null, VaultIndex["notes"]>();
  for (const n of index.notes) {
    const key = n.folderId;
    if (!notesByFolder.has(key)) notesByFolder.set(key, []);
    notesByFolder.get(key)!.push(n);
  }

  function build(parentId: string | null): TreeNode[] {
    const folders = [...(childFolders.get(parentId) ?? [])].sort(
      (a, b) => a.position - b.position || a.name.localeCompare(b.name)
    );
    const notes = [...(notesByFolder.get(parentId) ?? [])].sort((a, b) => a.name.localeCompare(b.name));
    const folderNodes: TreeNode[] = folders.map((f) => ({
      type: "folder",
      id: f.id,
      name: f.name,
      children: build(f.id),
    }));
    const noteNodes: TreeNode[] = notes.map((n) => ({
      type: "note",
      id: n.id,
      name: n.name.replace(/\.(md|markdown)$/i, ""),
      path: n.path,
    }));
    return [...folderNodes, ...noteNodes];
  }

  return build(null);
}

interface TreeRowProps {
  node: TreeNode;
  depth: number;
  expandedFolders: Set<string>;
  onToggleFolder: (id: string) => void;
  activeNoteId: string | null;
  onFileSelect: (noteId: string) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
  renamingId: string | null;
  renameValue: string;
  onRenameChange: (val: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onStartRename: (node: TreeNode) => void;
  dragOverId: string | null;
  onDragOverFolder: (id: string | null) => void;
  onMove: (payload: DragPayload, targetFolderId: string | null) => void;
  onHoverExpand: (id: string) => void;
}

function readPayload(e: React.DragEvent): DragPayload | null {
  try {
    const raw = e.dataTransfer.getData(DND_TYPE);
    return raw ? (JSON.parse(raw) as DragPayload) : null;
  } catch {
    return null;
  }
}

function TreeRow({
  node,
  depth,
  expandedFolders,
  onToggleFolder,
  activeNoteId,
  onFileSelect,
  onContextMenu,
  renamingId,
  renameValue,
  onRenameChange,
  onRenameSubmit,
  onRenameCancel,
  onStartRename,
  dragOverId,
  onDragOverFolder,
  onMove,
  onHoverExpand,
}: TreeRowProps) {
  const indent = depth * 12 + 12;
  const isRenaming = renamingId === node.id;
  const guides = Array.from({ length: depth }, (_, i) => (
    <span key={i} className="sb-guide" style={{ left: `${i * 12 + 19}px` }} />
  ));

  const renameInput = (
    <input
      autoFocus
      value={renameValue}
      onChange={(e) => onRenameChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onRenameSubmit();
        if (e.key === "Escape") onRenameCancel();
      }}
      onBlur={onRenameSubmit}
      onClick={(e) => e.stopPropagation()}
      className="sb-rename"
    />
  );

  const dragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DND_TYPE, JSON.stringify({ type: node.type, id: node.id } satisfies DragPayload));
    e.dataTransfer.effectAllowed = "move";
  };

  if (node.type === "folder") {
    const expanded = expandedFolders.has(node.id);
    const isDropTarget = dragOverId === node.id;
    return (
      <div>
        <div
          role="treeitem"
          tabIndex={0}
          aria-expanded={expanded}
          onClick={() => !isRenaming && onToggleFolder(node.id)}
          onDoubleClick={() => onStartRename(node)}
          onKeyDown={(e) => {
            if (isRenaming || e.target !== e.currentTarget) return;
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggleFolder(node.id);
            } else if (e.key === "F2") {
              e.preventDefault();
              onStartRename(node);
            }
          }}
          onContextMenu={(e) => onContextMenu(e, node)}
          className="sb-row sb-folder"
          draggable={!isRenaming}
          onDragStart={dragStart}
          onDragEnter={() => !expanded && onHoverExpand(node.id)}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes(DND_TYPE)) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            if (dragOverId !== node.id) onDragOverFolder(node.id);
          }}
          onDragLeave={() => dragOverId === node.id && onDragOverFolder(null)}
          onDrop={(e) => {
            const payload = readPayload(e);
            if (!payload) return;
            e.preventDefault();
            e.stopPropagation();
            onDragOverFolder(null);
            onMove(payload, node.id);
          }}
          style={{
            paddingLeft: `${indent}px`,
            ...(isDropTarget ? { background: "var(--bg-hover)", outline: "1px solid var(--accent)" } : {}),
          }}
          title={node.name}
        >
          {guides}
          <ChevronIcon className={`sb-chevron ${expanded ? "sb-chevron-open" : ""}`} />
          {isRenaming ? renameInput : <span className="sb-label">{node.name}</span>}
        </div>
        {expanded &&
          node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              activeNoteId={activeNoteId}
              onFileSelect={onFileSelect}
              onContextMenu={onContextMenu}
              renamingId={renamingId}
              renameValue={renameValue}
              onRenameChange={onRenameChange}
              onRenameSubmit={onRenameSubmit}
              onRenameCancel={onRenameCancel}
              onStartRename={onStartRename}
              dragOverId={dragOverId}
              onDragOverFolder={onDragOverFolder}
              onMove={onMove}
              onHoverExpand={onHoverExpand}
            />
          ))}
      </div>
    );
  }

  const isActive = node.id === activeNoteId;
  return (
    // A div, not a <button>: the rename <input> lives inside the row, and an input inside a
    // button can't be typed into reliably (Firefox ignores keys; Space/Enter re-trigger the button).
    <div
      role="treeitem"
      tabIndex={0}
      aria-selected={isActive}
      onClick={() => !isRenaming && onFileSelect(node.id)}
      onDoubleClick={() => onStartRename(node)}
      onKeyDown={(e) => {
        if (isRenaming || e.target !== e.currentTarget) return;
        if (e.key === "Enter") {
          e.preventDefault();
          onFileSelect(node.id);
        } else if (e.key === "F2") {
          e.preventDefault();
          onStartRename(node);
        }
      }}
      onContextMenu={(e) => onContextMenu(e, node)}
      className={`sb-row${isActive ? " sb-active" : ""}`}
      draggable={!isRenaming}
      onDragStart={dragStart}
      style={{ paddingLeft: `${indent}px` }}
      title={node.path}
    >
      {guides}
      {isActive && <span className="sb-indicator" />}
      {isRenaming ? renameInput : <span className="sb-label">{node.name}</span>}
    </div>
  );
}

interface SidebarProps {
  vaultId: string;
  vaultName: string;
  index: VaultIndex | null;
  activeNoteId: string | null;
  width: number;
  onWidthChange: (width: number) => void;
  onFileSelect: (noteId: string) => void;
  onRefresh: () => void;
  onNewNote: () => void;
  /** Puts a just-created note into rename mode (the page creates notes from the ribbon, menu, palette…). */
  renameRequest?: { id: string; name: string; nonce: number } | null;
}

/**
 * Recursive folder/note tree, built fresh against webApi + VaultIndex (not a
 * direct port of desktop's Sidebar.tsx, which is shaped around
 * electronAPI.readDir). Drag-and-drop here is native HTML5 move-into-folder
 * (parity plan v2, Pha 4); manual reordering within a folder is not supported
 * (children are sorted by name).
 */
export default function Sidebar({
  vaultId,
  vaultName,
  index,
  activeNoteId,
  width,
  onWidthChange,
  onFileSelect,
  onRefresh,
  onNewNote,
  renameRequest,
}: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [renaming, setRenaming] = useState<{ id: string; type: TreeNode["type"]; name: string } | null>(null);
  const renamingId = renaming?.id ?? null;
  const [renameValue, setRenameValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: TreeNode | null } | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [rootDropActive, setRootDropActive] = useState(false);
  const [moveError, setMoveError] = useState("");
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tree = useMemo(() => (index ? buildTree(index) : []), [index]);

  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Expand a collapsed folder after the pointer rests on it mid-drag, so nested targets are reachable.
  const hoverExpand = useCallback((id: string) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setExpandedFolders((prev) => new Set(prev).add(id));
    }, 600);
  }, []);

  async function moveNode(payload: DragPayload, targetFolderId: string | null) {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setMoveError("");
    try {
      if (payload.type === "note") {
        const note = index?.notes.find((n) => n.id === payload.id);
        if (!note || note.folderId === targetFolderId) return;
        await webApi.notes.update(vaultId, payload.id, { folderId: targetFolderId });
      } else {
        const folder = index?.folders.find((f) => f.id === payload.id);
        if (!folder || folder.parentId === targetFolderId || payload.id === targetFolderId) return;
        await webApi.folders.update(vaultId, payload.id, { parentId: targetFolderId });
      }
      if (targetFolderId) setExpandedFolders((prev) => new Set(prev).add(targetFolderId));
      onRefresh();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      setMoveError(
        status === 409
          ? "Đã có mục cùng tên ở thư mục đích."
          : status === 400
          ? "Không thể di chuyển thư mục vào chính nó."
          : "Không di chuyển được."
      );
      setTimeout(() => setMoveError(""), 4000);
    }
  }

  function startRename(node: TreeNode) {
    setRenaming({ id: node.id, type: node.type, name: node.name });
    setRenameValue(node.name);
  }

  // A note the page just created: enter rename mode for it (it may not be in the tree yet).
  useEffect(() => {
    // Ignore a stale request replayed when the sidebar mounts again later (after search, collapse…).
    if (!renameRequest || Date.now() - renameRequest.nonce > 5000) return;
    setRenaming({ id: renameRequest.id, type: "note", name: renameRequest.name });
    setRenameValue(renameRequest.name);
  }, [renameRequest]);

  async function submitRename() {
    const target = renaming;
    const value = renameValue.trim();
    setRenaming(null);
    // Works from what was being renamed, not from `index`: a note created a moment ago is not in
    // the index yet, and looking it up there silently dropped the new name.
    if (!target || !value || value === target.name) return;
    try {
      if (target.type === "folder") {
        await webApi.folders.update(vaultId, target.id, { name: value });
      } else {
        const newName = /\.(md|markdown)$/i.test(value) ? value : `${value}.md`;
        const current = /\.(md|markdown)$/i.test(target.name) ? target.name : `${target.name}.md`;
        if (newName === current) return;
        await webApi.notes.update(vaultId, target.id, { name: newName });
      }
      onRefresh();
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      showActionError(status === 409 ? `Đã có mục tên "${value}" ở đây.` : "Không đổi tên được.");
    }
  }

  async function handleDelete(node: TreeNode) {
    if (node.type === "folder") {
      await webApi.folders.remove(vaultId, node.id);
    } else {
      await webApi.notes.remove(vaultId, node.id);
    }
    onRefresh();
  }

  function showActionError(text: string) {
    setMoveError(text);
    setTimeout(() => setMoveError(""), 4000);
  }

  async function handleNewFileIn(folderId: string | null) {
    try {
      const note = await createUntitledNote(vaultId, folderId, index?.notes ?? []);
      if (folderId) setExpandedFolders((prev) => new Set(prev).add(folderId));
      onRefresh();
      onFileSelect(note.id);
      startRename({ type: "note", id: note.id, name: note.name.replace(/\.md$/i, ""), path: note.path });
    } catch {
      showActionError("Không tạo được note mới.");
    }
  }

  async function handleNewFolderIn(parentId: string | null) {
    // "New Folder", "New Folder 2", … — creating the same name twice is a 409 on the server.
    const siblings = new Set((index?.folders ?? []).filter((f) => f.parentId === parentId).map((f) => f.name.toLowerCase()));
    let name = "New Folder";
    for (let i = 2; siblings.has(name.toLowerCase()); i++) name = `New Folder ${i}`;
    try {
      const folder = await webApi.folders.create(vaultId, { name, parentId });
      if (parentId) setExpandedFolders((prev) => new Set(prev).add(parentId));
      onRefresh();
      startRename({ type: "folder", id: folder.id, name: folder.name, children: [] });
    } catch {
      showActionError("Không tạo được thư mục mới.");
    }
  }

  function handleContextMenu(e: React.MouseEvent, node: TreeNode) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }

  function handleEmptyContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node: null });
  }

  function getContextMenuItems(): ContextMenuItem[] {
    if (!contextMenu) return [];
    const { node } = contextMenu;
    const targetFolderId = node ? (node.type === "folder" ? node.id : null) : null;
    const items: ContextMenuItem[] = [
      { label: "New File", onClick: () => handleNewFileIn(targetFolderId) },
      { label: "New Folder", onClick: () => handleNewFolderIn(targetFolderId) },
    ];
    if (node) {
      items.push({ label: "", separator: true, onClick: () => {} });
      items.push({ label: "Rename", onClick: () => startRename(node) });
      items.push({ label: "Delete", danger: true, onClick: () => handleDelete(node) });
      if (node.type === "note") {
        items.push({ label: "", separator: true, onClick: () => {} });
        items.push({ label: "Copy Path", onClick: () => navigator.clipboard.writeText(node.path) });
      }
    }
    return items;
  }

  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);

  function handleResizeStart(e: React.PointerEvent<HTMLDivElement>) {
    e.preventDefault();
    resizeStateRef.current = { startX: e.clientX, startWidth: width };
    const handleMove = (event: PointerEvent) => {
      const state = resizeStateRef.current;
      if (!state) return;
      onWidthChange(Math.max(180, Math.min(520, state.startWidth + event.clientX - state.startX)));
    };
    const cleanup = () => {
      resizeStateRef.current = null;
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", cleanup);
      document.removeEventListener("pointercancel", cleanup);
      window.removeEventListener("blur", cleanup);
      document.body.style.cursor = "";
    };
    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", cleanup);
    document.addEventListener("pointercancel", cleanup);
    window.addEventListener("blur", cleanup);
    document.body.style.cursor = "col-resize";
  }

  return (
    <div className="sidebar-root" style={{ width, minWidth: width }}>
      <div className="sidebar-header">
        <span className="sidebar-title" title={vaultName}>
          {vaultName}
        </span>
        <div className="sidebar-actions">
          <button onClick={() => handleNewFileIn(null)} className="sidebar-btn" title="New file">
            <PlusIcon size={14} />
          </button>
        </div>
      </div>

      {moveError && <div className="px-3 py-1 text-xs text-[var(--red)]">{moveError}</div>}
      <div
        className="flex-1 overflow-y-auto py-1"
        onContextMenu={handleEmptyContextMenu}
        // Dropping on empty space (not on a folder) moves the item to the vault root.
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes(DND_TYPE)) return;
          e.preventDefault();
          setRootDropActive(true);
        }}
        onDragLeave={(e) => e.currentTarget === e.target && setRootDropActive(false)}
        onDrop={(e) => {
          setRootDropActive(false);
          const payload = readPayload(e);
          if (!payload) return;
          e.preventDefault();
          moveNode(payload, null);
        }}
        style={rootDropActive ? { outline: "1px dashed var(--accent)", outlineOffset: -2 } : undefined}
      >
        {tree.length > 0 ? (
          tree.map((node) => (
            <TreeRow
              key={node.id}
              node={node}
              depth={0}
              expandedFolders={expandedFolders}
              onToggleFolder={toggleFolder}
              activeNoteId={activeNoteId}
              onFileSelect={onFileSelect}
              onContextMenu={handleContextMenu}
              renamingId={renamingId}
              renameValue={renameValue}
              onRenameChange={setRenameValue}
              onRenameSubmit={submitRename}
              onRenameCancel={() => setRenaming(null)}
              onStartRename={startRename}
              dragOverId={dragOverId}
              onDragOverFolder={setDragOverId}
              onMove={moveNode}
              onHoverExpand={hoverExpand}
            />
          ))
        ) : (
          <div className="sidebar-empty">
            <p>No notes yet</p>
            <button onClick={onNewNote}>Create a note</button>
          </div>
        )}
      </div>

      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} items={getContextMenuItems()} onClose={() => setContextMenu(null)} />
      )}

      <div
        className="sidebar-resize-handle"
        role="separator"
        aria-label="Resize file navigator"
        aria-orientation="vertical"
        tabIndex={0}
        onPointerDown={handleResizeStart}
        onDoubleClick={() => onWidthChange(250)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") onWidthChange(Math.max(180, width - 10));
          if (e.key === "ArrowRight") onWidthChange(Math.min(520, width + 10));
        }}
      />
    </div>
  );
}

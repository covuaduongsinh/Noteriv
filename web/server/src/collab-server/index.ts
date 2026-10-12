// Realtime collaboration server — standalone process (run with `npm run dev:collab`),
// separate from the API per the plan (docs/plans/2026-10-12-noteriv-web-version.md §8).
//
// Hand-rolls the Yjs websocket sync protocol directly against `yjs` + `y-protocols`
// instead of depending on the `y-websocket` package's CJS server utils, which avoids
// ESM/CJS interop friction in this `"type": "module"` project. The wire protocol here
// matches y-websocket's reference server exactly, so `y-websocket`'s client-side
// `WebsocketProvider` (used in web/src/lib/collab.ts) works against it unmodified.

import { createServer } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { PrismaClient } from "@prisma/client";
import { parseCookie } from "cookie";
import jwt from "jsonwebtoken";
import { recomputeBacklinksForNote } from "../lib/backlinks.js";

const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const PERSIST_DEBOUNCE_MS = 2500;

const prisma = new PrismaClient();

interface Room {
  noteId: string;
  vaultId: string;
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  clients: Set<WebSocket>;
  persistTimer: ReturnType<typeof setTimeout> | null;
  /** Which awareness client IDs each socket has announced, so disconnect can clear exactly those. */
  connAwarenessIds: Map<WebSocket, Set<number>>;
}

const rooms = new Map<string, Room>();

async function getOrCreateRoom(noteId: string, vaultId: string): Promise<Room> {
  const existing = rooms.get(noteId);
  if (existing) return existing;

  const doc = new Y.Doc();
  const ytext = doc.getText("content");
  const note = await prisma.note.findUnique({ where: { id: noteId }, select: { content: true } });
  if (note && ytext.length === 0) {
    ytext.insert(0, note.content);
  }

  const awareness = new awarenessProtocol.Awareness(doc);
  const room: Room = { noteId, vaultId, doc, awareness, clients: new Set(), persistTimer: null, connAwarenessIds: new Map() };

  doc.on("update", (update: Uint8Array, origin: unknown) => {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeUpdate(encoder, update);
    const message = encoding.toUint8Array(encoder);
    broadcast(room, message, origin as WebSocket | undefined);
    schedulePersist(room);
  });

  awareness.on("update", ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
    const changed = added.concat(updated, removed);
    if (origin instanceof WebSocket || (origin && room.clients.has(origin as WebSocket))) {
      const ws = origin as WebSocket;
      const ids = room.connAwarenessIds.get(ws) ?? new Set<number>();
      for (const id of added.concat(updated)) ids.add(id);
      for (const id of removed) ids.delete(id);
      room.connAwarenessIds.set(ws, ids);
    }
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changed));
    broadcast(room, encoding.toUint8Array(encoder), origin as WebSocket | undefined);
  });

  rooms.set(noteId, room);
  return room;
}

function broadcast(room: Room, message: Uint8Array, exclude?: WebSocket) {
  for (const client of room.clients) {
    if (client !== exclude && client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}

function schedulePersist(room: Room) {
  if (room.persistTimer) clearTimeout(room.persistTimer);
  room.persistTimer = setTimeout(async () => {
    const content = room.doc.getText("content").toString();
    try {
      await prisma.note.update({ where: { id: room.noteId }, data: { content } });
      await recomputeBacklinksForNote(prisma, room.vaultId, room.noteId, content);
    } catch (err) {
      console.error(`[collab-server] failed to persist note ${room.noteId}:`, err);
    }
  }, PERSIST_DEBOUNCE_MS);
}

async function authenticate(cookieHeader: string | undefined): Promise<{ userId: string } | null> {
  if (!cookieHeader) return null;
  const cookies = parseCookie(cookieHeader);
  const token = cookies["noteriv_access"];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { sub: string };
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

async function canAccessNote(userId: string, noteId: string): Promise<{ vaultId: string } | null> {
  const note = await prisma.note.findUnique({ where: { id: noteId }, select: { vaultId: true } });
  if (!note) return null;
  const vault = await prisma.vault.findUnique({ where: { id: note.vaultId }, select: { workspaceId: true } });
  if (!vault) return null;
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: vault.workspaceId, userId } },
  });
  return membership ? { vaultId: note.vaultId } : null;
}

const httpServer = createServer();
const wss = new WebSocketServer({ noServer: true });

httpServer.on("upgrade", async (request, socket, head) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const match = url.pathname.match(/^\/collab\/notes\/([^/]+)$/);
  if (!match) {
    socket.destroy();
    return;
  }
  const noteId = match[1];

  const auth = await authenticate(request.headers.cookie);
  if (!auth) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  const access = await canAccessNote(auth.userId, noteId);
  if (!access) {
    socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, async (ws) => {
    const room = await getOrCreateRoom(noteId, access.vaultId);
    room.clients.add(ws);

    // Initial sync: tell the new client what we have (step 1), and ask for theirs.
    const syncEncoder = encoding.createEncoder();
    encoding.writeVarUint(syncEncoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(syncEncoder, room.doc);
    ws.send(encoding.toUint8Array(syncEncoder));

    const awarenessStates = room.awareness.getStates();
    if (awarenessStates.size > 0) {
      const awarenessEncoder = encoding.createEncoder();
      encoding.writeVarUint(awarenessEncoder, MESSAGE_AWARENESS);
      encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(awarenessStates.keys()))
      );
      ws.send(encoding.toUint8Array(awarenessEncoder));
    }

    ws.on("message", (data: Buffer) => {
      const decoder = decoding.createDecoder(new Uint8Array(data));
      const messageType = decoding.readVarUint(decoder);

      if (messageType === MESSAGE_SYNC) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        syncProtocol.readSyncMessage(decoder, encoder, room.doc, ws);
        if (encoding.length(encoder) > 1) {
          ws.send(encoding.toUint8Array(encoder));
        }
      } else if (messageType === MESSAGE_AWARENESS) {
        // `connAwarenessIds` bookkeeping for this socket happens in the room-level
        // awareness "update" listener (it receives `origin === ws` for this call).
        awarenessProtocol.applyAwarenessUpdate(room.awareness, decoding.readVarUint8Array(decoder), ws);
      }
    });

    ws.on("close", () => {
      room.clients.delete(ws);
      const ids = room.connAwarenessIds.get(ws);
      if (ids && ids.size > 0) {
        awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(ids), null);
      }
      room.connAwarenessIds.delete(ws);
    });
  });
});

const port = Number(process.env.COLLAB_PORT ?? 4002);
httpServer.listen(port, () => {
  console.log(`noteriv collab-server listening on :${port}`);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

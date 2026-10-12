// WebDAV sync — ports desktop/src-tauri/src/commands_sync.rs's `webdav_sync`
// (PROPFIND-based mtime diffing) from Rust+reqwest+quick-xml to Node+axios+fast-xml-parser.

import axios, { type AxiosInstance } from "axios";
import { XMLParser } from "fast-xml-parser";
import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";

const SYNC_EXTS = new Set([".md", ".markdown"]);

export interface WebdavConfig {
  url: string;
  username: string;
  password: string;
  remotePath: string;
}

export interface LocalFile {
  rel: string; // forward-slash relative path
  full: string;
  mtimeMs: number;
}

async function walkLocalFiles(base: string): Promise<LocalFile[]> {
  const out: LocalFile[] = [];
  async function recurse(cur: string) {
    let entries;
    try {
      entries = await readdir(cur, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === ".noteriv") continue;
      const full = path.join(cur, entry.name);
      if (entry.isDirectory()) {
        await recurse(full);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        if (SYNC_EXTS.has(ext)) {
          const s = await stat(full);
          out.push({ rel: path.relative(base, full).replace(/\\/g, "/"), full, mtimeMs: s.mtimeMs });
        }
      }
    }
  }
  await recurse(base);
  return out;
}

function buildClient(cfg: WebdavConfig): AxiosInstance {
  return axios.create({
    timeout: 60_000,
    auth: { username: cfg.username, password: cfg.password },
    headers: { "User-Agent": "Noteriv" },
    validateStatus: () => true, // we check status manually (WebDAV uses 207 Multi-Status)
  });
}

function joinUrl(base: string, p: string): string {
  return `${base.replace(/\/+$/, "")}/${p.replace(/^\/+/, "")}`;
}

interface WebdavEntry {
  rel: string;
  href: string;
  isDir: boolean;
  mtimeMs: number;
}

const xmlParser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });

function parsePropfind(xml: string, basePath: string): WebdavEntry[] {
  const out: WebdavEntry[] = [];
  let parsed: any;
  try {
    parsed = xmlParser.parse(xml);
  } catch {
    return out;
  }
  const multistatus = parsed?.multistatus;
  if (!multistatus) return out;
  const responses = Array.isArray(multistatus.response) ? multistatus.response : [multistatus.response].filter(Boolean);

  for (const resp of responses) {
    const hrefRaw: string | undefined = typeof resp?.href === "string" ? resp.href : resp?.href?.["#text"];
    if (!hrefRaw) continue;

    const propstat = Array.isArray(resp.propstat) ? resp.propstat[0] : resp.propstat;
    const prop = propstat?.prop ?? {};
    const isDir = prop.resourcetype != null && typeof prop.resourcetype === "object" && "collection" in prop.resourcetype;
    const lastModRaw: string | undefined = prop.getlastmodified;

    let hrefPath = hrefRaw;
    const protoMatch = hrefRaw.match(/^https?:\/\/[^/]+(\/.*)$/);
    if (protoMatch) hrefPath = protoMatch[1];
    const decoded = decodeURIComponent(hrefPath);

    const base = basePath.replace(/\/+$/, "");
    let rel = decoded.startsWith(base) ? decoded.slice(base.length) : decoded;
    rel = rel.replace(/^\/+/, "").replace(/\/+$/, "");

    const mtimeMs = lastModRaw ? Date.parse(lastModRaw) || 0 : 0;
    if (rel) out.push({ rel, href: decoded, isDir: !!isDir, mtimeMs });
  }
  return out;
}

async function propfind(client: AxiosInstance, url: string, depth: 0 | 1): Promise<WebdavEntry[]> {
  const body = `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop>
    <D:getlastmodified/>
    <D:resourcetype/>
  </D:prop>
</D:propfind>`;
  const res = await client.request({
    method: "PROPFIND" as any,
    url,
    // Explicit Accept matters: axios' default Accept header includes
    // application/json, and at least one WebDAV server implementation we
    // tested against honors that via content-negotiation and serializes its
    // XML response as JSON instead — silently breaking PROPFIND parsing.
    // Forcing XML here is correct for any spec-compliant WebDAV server too.
    headers: { Depth: String(depth), "Content-Type": "application/xml", Accept: "application/xml, text/xml" },
    data: body,
    responseType: "text",
    transformResponse: (data) => data,
  });
  if (res.status !== 207 && (res.status < 200 || res.status >= 300)) {
    throw new Error(`PROPFIND failed: HTTP ${res.status}`);
  }
  const basePath = new URL(url).pathname;
  return parsePropfind(res.data, basePath);
}

async function mkcol(client: AxiosInstance, url: string): Promise<void> {
  const res = await client.request({ method: "MKCOL" as any, url });
  if (res.status !== 201 && res.status !== 405) {
    throw new Error(`MKCOL HTTP ${res.status}`);
  }
}

async function ensureDir(client: AxiosInstance, baseUrl: string, relDir: string): Promise<void> {
  if (!relDir || relDir === "/") return;
  let acc = "";
  for (const part of relDir.split("/").filter(Boolean)) {
    acc = acc ? `${acc}/${part}` : part;
    try {
      await mkcol(client, `${joinUrl(baseUrl, acc)}/`);
    } catch {
      // best-effort, matches desktop's behavior
    }
  }
}

export async function webdavTest(cfg: WebdavConfig): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = buildClient(cfg);
    const baseUrl = joinUrl(cfg.url, cfg.remotePath);
    await propfind(client, `${baseUrl.replace(/\/+$/, "")}/`, 0);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface WebdavSyncResult {
  pushed: number;
  pulled: number;
}

/** Two-way mtime-based diff sync between local `dir` and a WebDAV remote folder. */
export async function webdavSyncCore(dir: string, cfg: WebdavConfig): Promise<WebdavSyncResult> {
  const client = buildClient(cfg);
  const baseUrl = joinUrl(cfg.url, cfg.remotePath);
  await mkcol(client, `${baseUrl.replace(/\/+$/, "")}/`).catch(() => undefined);

  const remoteEntries = new Map<string, WebdavEntry>();
  const stack: Array<{ prefix: string; url: string }> = [{ prefix: "", url: baseUrl }];
  while (stack.length > 0) {
    const { prefix, url } = stack.pop()!;
    const listed = await propfind(client, `${url.replace(/\/+$/, "")}/`, 1);
    for (const e of listed) {
      const combined = prefix ? `${prefix.replace(/\/+$/, "")}/${e.rel}` : e.rel;
      if (e.isDir) {
        stack.push({ prefix: combined, url: `${url.replace(/\/+$/, "")}/${e.rel}` });
      } else if (SYNC_EXTS.has(path.extname(combined).toLowerCase())) {
        remoteEntries.set(combined, { ...e, rel: combined });
      }
    }
  }

  const local = await walkLocalFiles(dir);
  const localMap = new Map(local.map((f) => [f.rel, f]));

  let pushed = 0;
  let pulled = 0;

  for (const [rel, lf] of localMap) {
    const rf = remoteEntries.get(rel);
    const needsPush = !rf || lf.mtimeMs > rf.mtimeMs;
    if (needsPush) {
      const parent = path.dirname(rel);
      if (parent !== ".") await ensureDir(client, baseUrl, parent);
      const bytes = await readFile(lf.full);
      const res = await client.put(joinUrl(baseUrl, rel), bytes);
      if (res.status < 200 || res.status >= 300) throw new Error(`PUT HTTP ${res.status}`);
      pushed++;
    }
  }

  const serverRoot = new URL(cfg.url).origin;
  for (const [rel, rf] of remoteEntries) {
    const lf = localMap.get(rel);
    const needsPull = !lf || rf.mtimeMs > lf.mtimeMs;
    if (needsPull) {
      const dest = path.join(dir, rel.replace(/\//g, path.sep));
      await mkdir(path.dirname(dest), { recursive: true });
      const res = await client.get(`${serverRoot}${rf.href}`, { responseType: "arraybuffer" });
      if (res.status < 200 || res.status >= 300) throw new Error(`GET HTTP ${res.status}`);
      await writeFile(dest, Buffer.from(res.data));
      pulled++;
    }
  }

  return { pushed, pulled };
}

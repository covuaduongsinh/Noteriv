#!/usr/bin/env node
// Bundle size report for one Next.js route, per feature. Reads the Turbopack analyzer output, so run first:
//
//   web:     npm run build:web && (cd web && npx next analyze --output)
//   desktop: npm run build:desktop && (cd desktop && npx next experimental-analyze --output)
//
//   node scripts/perf/bundle-report.mjs --app web --route "/vaults/[vaultId]" [--json out.json]
//   node scripts/perf/bundle-report.mjs --app desktop --route "/"
//
// For every feature in feature-map.json it reports the "exclusive" client JS: bytes reachable from the route
// only through that feature's modules, i.e. what leaves the bundle when the feature is removed. Bytes count
// as "first load" when they sit in a chunk the route loads up front (route-bundle-stats.json), else "lazy".

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const app = args.app ?? "web";
const route = args.route ?? (app === "web" ? "/vaults/[vaultId]" : "/");
const nextDir = path.join(ROOT, app, ".next");
const dataDir = path.join(nextDir, "diagnostics", "analyze", "data");

function readAnalyzeFile(file) {
  const buf = fs.readFileSync(file);
  const len = buf.readUInt32BE(0);
  return { json: JSON.parse(buf.subarray(4, 4 + len).toString("utf8")), bin: buf.subarray(4 + len) };
}

// Sections like module_dependencies are big-endian u32: [count, end offset per row..., edges...].
function readCsr(bin, section) {
  const v = bin.subarray(section.offset, section.offset + section.length);
  const n = v.readUInt32BE(0);
  const total = v.length / 4;
  return (i) => {
    const start = i === 0 ? 0 : v.readUInt32BE(4 * i);
    const end = v.readUInt32BE(4 * (i + 1));
    const out = [];
    for (let k = start; k < end; k++) out.push(v.readUInt32BE(4 * (1 + n + k)));
    if (1 + n + end > total) throw new Error("bad CSR section");
    return out;
  };
}

const kb = (n) => (n / 1024).toFixed(1);
// Module paths are relative to Turbopack's project root, which may sit above the repo (Next 16.1 used the
// home folder): cut everything up to the repo folder so patterns see "web/…", "packages/…", "node_modules/…".
const repoPrefix = new RegExp(`^\\[project\\]/(?:.*?/)?${path.basename(ROOT).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/|^\\[project\\]/`);
const strip = (p) => p.replace(repoPrefix, "");

const { json: mods, bin: modBin } = readAnalyzeFile(path.join(dataDir, "modules.data"));
const routeFile = path.join(dataDir, ...route.split("/").filter(Boolean), "analyze.data");
const { json: rd } = readAnalyzeFile(routeFile);

// Source index -> full path (sources form a tree of path segments).
const srcPath = [];
const fullPath = (i) => (srcPath[i] ??= rd.sources[i].parent_source_index == null ? rd.sources[i].path : fullPath(rd.sources[i].parent_source_index) + rd.sources[i].path);
rd.sources.forEach((_, i) => fullPath(i));

const outInfo = rd.output_files.map((o) => {
  const client = o.filename.startsWith("[client-fs]");
  return { client, js: client && o.filename.endsWith(".js") };
});
const routePaths = new Set(rd.chunk_parts.filter((p) => outInfo[p.output_file_index].js).map((p) => srcPath[p.source_index]));

// Client module graph (sync + async edges).
const isClient = mods.modules.map((m) => / \[(app-client|client)\] /.test(m.ident));
const deps = readCsr(modBin, mods.module_dependencies);
const asyncDeps = readCsr(modBin, mods.async_module_dependencies);
const dependents = readCsr(modBin, mods.module_dependents);
const children = (i) => [...deps(i), ...asyncDeps(i)].filter((k) => isClient[k]);

const roots = [];
for (let i = 0; i < mods.modules.length; i++) {
  if (isClient[i] && routePaths.has(mods.modules[i].path) && !dependents(i).some((k) => isClient[k])) roots.push(i);
}

// What the route loads up front: every chunk group except the async (dynamic import) ones. The analyzer
// builds on its own, so its chunk names differ from `next build`; match by group, not name. Next 16.1's
// analyzer records no chunk groups (and dynamic imports sit among the plain dependencies, so the graph
// cannot tell them apart either): then every byte is counted in "lazy" and the report says there is no split.
const hasSplit = Boolean(rd.chunk_groups);
const firstLoadOut = new Set((rd.chunk_groups ?? []).filter((g) => g.kind !== "async").flatMap((g) => g.output_file_indices));
const isFirst = (part) => firstLoadOut.has(part.output_file_index);

// Per source path: client JS bytes, split first-load / lazy, raw and compressed (analyzer's estimate).
const sizeByPath = new Map();
let totals = { first: 0, lazy: 0, firstC: 0, lazyC: 0, css: 0 };
for (const part of rd.chunk_parts) {
  const o = outInfo[part.output_file_index];
  if (!o.client) continue;
  if (!o.js) {
    totals.css += part.size;
    continue;
  }
  const p = srcPath[part.source_index];
  const s = sizeByPath.get(p) ?? { first: 0, lazy: 0, firstC: 0, lazyC: 0 };
  if (isFirst(part)) {
    s.first += part.size;
    s.firstC += part.compressed_size;
    totals.first += part.size;
    totals.firstC += part.compressed_size;
  } else {
    s.lazy += part.size;
    s.lazyC += part.compressed_size;
    totals.lazy += part.size;
    totals.lazyC += part.compressed_size;
  }
  sizeByPath.set(p, s);
}

function reach(blocked) {
  const seen = new Set();
  const stack = roots.filter((r) => !blocked.has(r));
  while (stack.length) {
    const i = stack.pop();
    if (seen.has(i)) continue;
    seen.add(i);
    for (const k of children(i)) if (!blocked.has(k) && !seen.has(k)) stack.push(k);
  }
  return seen;
}

function sumPaths(paths) {
  const s = { first: 0, lazy: 0, firstC: 0, lazyC: 0 };
  for (const p of paths) {
    const v = sizeByPath.get(p);
    if (!v) continue;
    for (const k of Object.keys(s)) s[k] += v[k];
  }
  return s;
}

const all = reach(new Set());
const allPaths = new Set([...all].map((i) => mods.modules[i].path));
const featureMap = JSON.parse(fs.readFileSync(path.join(ROOT, "scripts/perf/feature-map.json"), "utf8")).features;
const features = [];
for (const [id, f] of Object.entries(featureMap)) {
  const res = f.patterns.map((p) => new RegExp(p));
  const blocked = new Set();
  mods.modules.forEach((m, i) => {
    if (isClient[i] && res.some((re) => re.test(strip(m.path)))) blocked.add(i);
  });
  const without = new Set([...reach(blocked)].map((i) => mods.modules[i].path));
  const exclusive = [...allPaths].filter((p) => !without.has(p));
  const size = sumPaths(exclusive);
  const top = exclusive
    .map((p) => [p, (sizeByPath.get(p)?.first ?? 0) + (sizeByPath.get(p)?.lazy ?? 0)])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([p, s]) => `${strip(p).replace(/^(web|desktop|packages)\//, "").replace(/^node_modules\//, "npm:")} ${kb(s)}`);
  features.push({ id, label: f.label, modules: blocked.size, ...size, top });
}
features.sort((a, b) => b.first + b.lazy - (a.first + a.lazy));

// Where first-load bytes go, by npm package or app folder (independent of the feature map).
const groupOf = (p) => {
  const s = strip(p);
  if (/node_modules\/next\//.test(s)) return "npm:next";
  const m = s.match(/node_modules\/((@[^/]+\/)?[^/]+)/);
  return m ? `npm:${m[1]}` : s.split("/").slice(0, 3).join("/");
};
const groups = new Map();
for (const [p, s] of sizeByPath) {
  const g = groups.get(groupOf(p)) ?? { first: 0, lazy: 0 };
  g.first += s.first;
  g.lazy += s.lazy;
  groups.set(groupOf(p), g);
}
const topGroups = [...groups].map(([name, s]) => ({ name, ...s })).sort((a, b) => b.first + b.lazy - (a.first + a.lazy)).slice(0, 20);

// Real first-load bytes of the `next build` output on disk (what a browser downloads with gzip / brotli).
// Next 16.4+ lists them in route-bundle-stats.json; for a static export (desktop) the <script> tags of the
// exported page are the same list.
let firstLoadPaths = null;
const statsFile = path.join(nextDir, "diagnostics", "route-bundle-stats.json");
const routeStats = fs.existsSync(statsFile) ? JSON.parse(fs.readFileSync(statsFile, "utf8")).find((r) => r.route === route) : null;
if (routeStats) {
  firstLoadPaths = routeStats.firstLoadChunkPaths.map((rel) => path.join(ROOT, app, rel.replace(/\\/g, "/")));
} else {
  const html = path.join(ROOT, app, "out", route === "/" ? "index.html" : `${route.slice(1)}.html`);
  if (fs.existsSync(html)) {
    const srcs = [...fs.readFileSync(html, "utf8").matchAll(/\/(_next\/static\/chunks\/[^"']+\.js)/g)].map((m) => m[1]);
    firstLoadPaths = [...new Set(srcs)].map((rel) => path.join(ROOT, app, "out", rel));
  }
}
let disk = null;
const firstLoadFiles = firstLoadPaths?.length ?? 0;
if (firstLoadPaths) {
  disk = { raw: 0, gzip: 0, br: 0 };
  for (const file of firstLoadPaths) {
    const buf = fs.readFileSync(file);
    disk.raw += buf.length;
    disk.gzip += zlib.gzipSync(buf).length;
    disk.br += zlib.brotliCompressSync(buf).length;
  }
}

const report = {
  app,
  route,
  next: (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(dataDir, "metadata.json"), "utf8"));
    } catch {
      return null;
    }
  })(),
  hasSplit,
  firstLoadFiles,
  firstLoadDisk: disk,
  analyzer: totals,
  features,
  topGroups,
};

if (args.json) fs.writeFileSync(path.resolve(args.json), JSON.stringify(report, null, 2));

console.log(`# ${app} ${route} (Next ${report.next?.nextVersion ?? "?"}, ${report.next?.gitShortSha ?? "?"}${report.next?.gitDirty ? "+dirty" : ""})`);
if (disk) console.log(`First-load JS on disk: ${firstLoadFiles} files, ${kb(disk.raw)} KB raw, ${kb(disk.gzip)} KB gzip, ${kb(disk.br)} KB brotli`);
if (hasSplit) {
  console.log(`Analyzer client JS: first-load ${kb(totals.first)} KB (~${kb(totals.firstC)} KB compressed), lazy ${kb(totals.lazy)} KB (~${kb(totals.lazyC)} KB compressed); other assets (CSS, fonts) ${kb(totals.css)} KB`);
  console.log("");
  console.log("| Feature | First-load KB | Lazy KB | First-load KB (compressed) | Biggest exclusive modules |");
  console.log("|---|---:|---:|---:|---|");
  for (const f of features) console.log(`| ${f.label} | ${kb(f.first)} | ${kb(f.lazy)} | ${kb(f.firstC)} | ${f.top.join("; ")} |`);
  const sumFirst = features.reduce((s, f) => s + f.first, 0);
  console.log("");
  console.log(`Sum of exclusive first-load across features: ${kb(sumFirst)} KB of ${kb(totals.first)} KB (${((100 * sumFirst) / totals.first).toFixed(1)}%)`);
  console.log("");
  console.log("| Package / folder | First-load KB | Lazy KB |");
  console.log("|---|---:|---:|");
  for (const g of topGroups) console.log(`| ${g.name} | ${kb(g.first)} | ${kb(g.lazy)} |`);
} else {
  console.log(`Analyzer client JS (this Next version records no first-load / lazy split): ${kb(totals.lazy)} KB (~${kb(totals.lazyC)} KB compressed); other assets (CSS, fonts) ${kb(totals.css)} KB`);
  console.log("");
  console.log("| Feature | Total KB | Total KB (compressed) | Biggest exclusive modules |");
  console.log("|---|---:|---:|---|");
  for (const f of features) console.log(`| ${f.label} | ${kb(f.lazy)} | ${kb(f.lazyC)} | ${f.top.join("; ")} |`);
  console.log("");
  console.log("| Package / folder | Total KB |");
  console.log("|---|---:|");
  for (const g of [...topGroups].sort((a, b) => b.lazy - a.lazy)) console.log(`| ${g.name} | ${kb(g.lazy)} |`);
}

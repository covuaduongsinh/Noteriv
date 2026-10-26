#!/usr/bin/env node
// Generates a deterministic test vault for performance measurements (phase 2 baseline and re-measure).
//
//   node scripts/perf/seed-vault.mjs --dir <folder>             write the notes to a local folder (desktop)
//   node scripts/perf/seed-vault.mjs --api http://localhost:4001 --email perf@example.test --password ...
//                                                                register (or log in), create a vault, import
//   node scripts/perf/seed-vault.mjs --api ... --email ... --password ... --cleanup
//                                                                delete that test account and all its vaults
//
// Options: --notes 500 (count), --vault-name "Perf 500". Registration needs REGISTRATION_MODE=open on the API.
// The same seed always produces the same notes, so before/after numbers compare like with like.

import fs from "node:fs";
import path from "node:path";

const args = parseArgs(process.argv.slice(2));
const NOTE_COUNT = Number(args.notes ?? 500);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[key] = true;
    else out[key] = argv[++i];
  }
  return out;
}

// Small seeded PRNG (mulberry32): same notes on every run.
function rng(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = (
  "khai cuộc trung cuộc tàn cuộc chiến thuật chiến lược tốt xe mã tượng hậu vua nhập thành phong cấp " +
  "ghim đôi xiên chiếu hết hòa bế tắc ván đấu phân tích biến thể nước đi ý tưởng kế hoạch cấu trúc " +
  "opening endgame tactic pawn structure initiative tempo outpost file diagonal rank square center"
).split(" ");
const FOLDERS = ["Openings", "Middlegame", "Endgames", "Games", "Tactics", "Daily", "Students", "Reference"];
const TAGS = ["opening", "endgame", "tactic", "review", "lesson", "game", "idea", "todo"];

function generateNotes(count = NOTE_COUNT) {
  const rand = rng(20261016);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const sentence = (n) => {
    const w = Array.from({ length: n }, () => pick(WORDS));
    w[0] = w[0][0].toUpperCase() + w[0].slice(1);
    return w.join(" ") + ".";
  };
  const titles = Array.from({ length: count }, (_, i) => `Note ${String(i + 1).padStart(3, "0")} ${pick(WORDS)}`);
  const notes = [];
  for (let i = 0; i < count; i++) {
    const folder = FOLDERS[i % FOLDERS.length];
    const tags = [pick(TAGS), pick(TAGS)];
    const lines = [
      "---",
      `title: ${titles[i]}`,
      `tags: [${[...new Set(tags)].join(", ")}]`,
      `created: 2026-0${1 + (i % 9)}-${String(1 + (i % 28)).padStart(2, "0")}`,
      "---",
      "",
      `# ${titles[i]}`,
      "",
    ];
    const sections = 2 + Math.floor(rand() * 4);
    for (let s = 0; s < sections; s++) {
      lines.push(`## ${sentence(3).slice(0, -1)}`, "");
      lines.push(`${sentence(12 + Math.floor(rand() * 20))} ${sentence(10)} Xem [[${pick(titles)}]] và [[${pick(titles)}]].`, "");
      lines.push(`- ${sentence(6)} #${pick(TAGS)}`, `- ${sentence(8)}`, `- [ ] ${sentence(5)}`, "");
    }
    // A minority of notes carry heavier blocks, like a real vault (code, math, mermaid, table).
    if (i % 10 === 0) lines.push("```js", `const move = "e4"; // ${sentence(4)}`, "```", "");
    if (i % 25 === 0) lines.push("$$", "E = \\sum_{i=1}^{n} w_i x_i", "$$", "");
    if (i % 50 === 0) lines.push("```mermaid", "graph TD; A[Khai cuộc] --> B[Trung cuộc]; B --> C[Tàn cuộc];", "```", "");
    if (i % 20 === 0) lines.push("| Ván | Kết quả |", "|---|---|", "| 1 | 1-0 |", "| 2 | ½-½ |", "");
    notes.push({ path: `${folder}/${titles[i].replace(/[^\p{L}\p{N} _-]/gu, "")}.md`, content: lines.join("\n") });
  }
  return notes;
}

class Session {
  constructor(base) {
    this.base = base.replace(/\/$/, "");
    this.cookies = new Map();
  }
  async req(method, url, body) {
    const res = await fetch(this.base + "/api/v1" + url, {
      method,
      headers: {
        ...(body ? { "content-type": "application/json" } : {}),
        cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [pair] = c.split(";");
      const eq = pair.indexOf("=");
      this.cookies.set(pair.slice(0, eq), pair.slice(eq + 1));
    }
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, data };
  }
}

async function signIn(s, email, password) {
  const login = await s.req("POST", "/auth/login", { email, password });
  if (login.status === 200) return;
  const reg = await s.req("POST", "/auth/register", { email, password, displayName: "Perf test", acceptTerms: true });
  if (reg.status !== 201) throw new Error(`register failed: ${reg.status} ${JSON.stringify(reg.data)}`);
}

async function main() {
  if (args.dir) {
    const notes = generateNotes();
    for (const n of notes) {
      const file = path.join(args.dir, n.path);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, n.content);
    }
    console.log(`wrote ${notes.length} notes to ${args.dir}`);
    return;
  }
  if (!args.api || !args.email || !args.password) {
    console.error("usage: --dir <folder> | --api <origin> --email <e> --password <p> [--cleanup]");
    process.exitCode = 2;
    return;
  }
  const s = new Session(args.api);
  await signIn(s, args.email, args.password);
  if (args.cleanup) {
    const del = await s.req("DELETE", "/users/me", { password: args.password });
    console.log(`delete account: ${del.status}`);
    return;
  }
  const vault = await s.req("POST", "/vaults", { name: args["vault-name"] ?? `Perf ${NOTE_COUNT}` });
  if (vault.status !== 201) throw new Error(`create vault failed: ${vault.status}`);
  const vid = vault.data.id;
  const notes = generateNotes();
  for (let i = 0; i < notes.length; i += 250) {
    const r = await s.req("POST", `/vaults/${vid}/import/notes`, { files: notes.slice(i, i + 250) });
    if (r.status !== 200 || r.data.errors?.length) throw new Error(`import failed: ${r.status} ${JSON.stringify(r.data).slice(0, 300)}`);
  }
  const fin = await s.req("POST", `/vaults/${vid}/import/finalize`);
  console.log(JSON.stringify({ vaultId: vid, notes: fin.data?.notes }));
}

main().catch((err) => {
  console.error(err.message);
  // exitCode, not exit(): exiting with a fetch socket still open trips a libuv assertion on Windows.
  process.exitCode = 1;
});

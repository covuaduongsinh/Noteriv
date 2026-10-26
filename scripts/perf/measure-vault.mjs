#!/usr/bin/env node
// Times the web app on a vault made by seed-vault.mjs, in a real browser (Playwright's Chromium):
//   tree    from opening the vault to the folder tree showing its last folder
//   note    from clicking a note in the tree to its text in the editor
//   search  from typing a word in vault search to the first result
//   graph   from opening the graph to its first nodes (it reads every note first); null past --graph-timeout
//   typing  milliseconds per character typed into a note, until it is on screen
//   heap    JS heap used after all of the above
// Each step runs --runs times (default 3) in a fresh browser context; the report gives every run and the median.
//
//   node scripts/perf/measure-vault.mjs --web http://127.0.0.1:3457 --email <e> --password <p> --vault "Perf 2000"
//
// The account is the one seed-vault.mjs signed up with. Nothing is written to the vault except the typed text,
// which is removed again (Ctrl+Z) before the note is left.

import { chromium } from "@playwright/test";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((out, a, i, all) => (a.startsWith("--") ? [...out, [a.slice(2), all[i + 1]]] : out), [])
);
const RUNS = Number(args.runs ?? 3);
const WEB = (args.web ?? "http://127.0.0.1:3457").replace(/\/$/, "");
const VAULT = args.vault ?? "Perf 500";
const SEARCH_WORD = args.search ?? "outpost";
const TIMEOUT = 120_000;

if (!args.email || !args.password) {
  console.error("usage: --web <origin> --email <e> --password <p> --vault <name> [--runs 3] [--search word]");
  process.exit(2);
}

const median = (values) => {
  const xs = values.filter((v) => v !== null);
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

async function oneRun(browser) {
  const context = await browser.newContext({ locale: "en-US", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const login = await page.request.post(`${WEB}/api/v1/auth/login`, { data: { email: args.email, password: args.password } });
  if (!login.ok()) throw new Error(`login failed: ${login.status()}`);
  // Opened tabs are restored on the next visit; start each run from none, so "note" measures a real open.
  const vaults = await (await page.request.get(`${WEB}/api/v1/vaults`)).json();
  const vault = (vaults.vaults ?? vaults).find((v) => v.name === VAULT);
  if (!vault) throw new Error(`no vault named ${VAULT}`);
  await page.request.put(`${WEB}/api/v1/vaults/${vault.id}/workspace-state`, { data: { state: {} } }).catch(() => undefined);

  const out = {};
  const sidebarItem = (name) => page.locator(".sidebar-root .sb-label").getByText(name, { exact: true }).first();

  let t = Date.now();
  await page.goto(`${WEB}/vaults/${vault.id}`);
  await sidebarItem("Tactics").waitFor({ timeout: TIMEOUT });
  out.tree = Date.now() - t;

  await sidebarItem("Openings").click();
  const first = page.locator(".sidebar-root .sb-label").filter({ hasText: /^Note 0*1 / }).first();
  await first.waitFor({ timeout: TIMEOUT });
  t = Date.now();
  await first.click();
  await page.locator(".cm-content").first().filter({ hasText: /Note 0*1 / }).waitFor({ timeout: TIMEOUT });
  out.note = Date.now() - t;

  // Typing: characters at the end of the first line, then undone.
  const text = "perf typing check ".repeat(3);
  await page.locator(".cm-content").first().click();
  await page.keyboard.press("Control+Home");
  await page.keyboard.press("End");
  t = Date.now();
  await page.keyboard.type(text);
  await page.locator(".cm-content").first().filter({ hasText: text.trim() }).waitFor({ timeout: TIMEOUT });
  out.typing = Number(((Date.now() - t) / text.length).toFixed(1));
  for (let i = 0; i < 10; i++) await page.keyboard.press("Control+z");

  await page.getByTitle("Search in vault").click();
  const box = page.getByPlaceholder("Search across all notes…");
  t = Date.now();
  await box.fill(SEARCH_WORD);
  await page.getByRole("option").first().waitFor({ timeout: TIMEOUT });
  out.search = Date.now() - t;
  await box.press("Escape");

  // The graph reads every note first (one request each), so this is the vault scan plus the layout. Past
  // --graph-timeout seconds it is recorded as null rather than stopping the run.
  t = Date.now();
  await page.keyboard.press("Control+Shift+P");
  await page.keyboard.type("Open local graph");
  await page.keyboard.press("Enter");
  try {
    await page.waitForFunction(
      (sel) => Number(document.querySelector(sel)?.textContent ?? 0) > 0,
      ".graph-container .graph-stat-value",
      { timeout: Number(args["graph-timeout"] ?? 180) * 1000 }
    );
    out.graph = Date.now() - t;
  } catch {
    out.graph = null;
  }

  const cdp = await context.newCDPSession(page);
  await cdp.send("Performance.enable");
  const { metrics } = await cdp.send("Performance.getMetrics");
  out.heapMB = Number((metrics.find((m) => m.name === "JSHeapUsedSize").value / 1048576).toFixed(1));

  await context.close();
  return out;
}

const browser = await chromium.launch();
const runs = [];
for (let i = 0; i < RUNS; i++) {
  const r = await oneRun(browser);
  runs.push(r);
  console.log(`run ${i + 1}: ${JSON.stringify(r)}`);
}
await browser.close();
const keys = Object.keys(runs[0]);
console.log(`median (${VAULT}): ${JSON.stringify(Object.fromEntries(keys.map((k) => [k, median(runs.map((r) => r[k]))])))}`);

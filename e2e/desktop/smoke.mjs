// Smoke test of the real desktop app (Tauri + WebView2, Windows): runs a built noteriv.exe in portable mode against a
// throwaway vault, drives it with Playwright over the WebView2 debug port, and reports each check. Nothing touches the
// real user config (%APPDATA%\Noteriv): portable mode keeps config and data next to the copied exe.
//
//   npx tauri build --no-bundle            (in desktop/; first build ~15 min)
//   node e2e/desktop/smoke.mjs [path\to\noteriv.exe]
//
// Exit code 0 when every check passes. Screenshots and the console log go to e2e/test-results/desktop/.

import { chromium } from "@playwright/test";
import { spawn, execSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const exe = path.resolve(process.argv[2] ?? path.join(repo, "desktop", "src-tauri", "target", "release", "noteriv.exe"));
const out = path.join(repo, "e2e", "test-results", "desktop");
const PORT = 9223;
mkdirSync(out, { recursive: true });

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok || !detail ? "" : "  -> " + detail}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── fixture: portable app dir + vault ──────────────────────────────────────────────────────────────────────────────
const root = mkdtempSync(path.join(tmpdir(), "noteriv-desktop-smoke-"));
const appDir = path.join(root, "app");
const vault = path.join(root, "vault");
mkdirSync(path.join(appDir, "data"), { recursive: true });
mkdirSync(path.join(vault, ".noteriv", "plugins", "e2e-panel"), { recursive: true });
cpSync(exe, path.join(appDir, "noteriv.exe"));
writeFileSync(path.join(appDir, "portable.txt"), "");
writeFileSync(
  path.join(appDir, "data", "config.json"),
  JSON.stringify({
    vaults: [{ id: "smoke", name: "Smoke vault", path: vault.replace(/\\/g, "/"), gitRemote: null, gitBranch: "main", autoSync: false, lastOpened: Date.now() }],
    activeVaultId: "smoke",
    setupComplete: true,
  })
);

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
function wav() {
  const n = 8000;
  const b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28);
  b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  return b;
}
writeFileSync(path.join(vault, "pic.png"), PNG);
writeFileSync(path.join(vault, "clip.wav"), wav());
writeFileSync(
  path.join(vault, "Alpha.md"),
  "# Alpha\n\nLink to [[Beta]].\n\nInline math $a^2+b^2$ here.\n\n![pic](pic.png)\n\n![Audio](clip.wav)\n\nsmoke needle line\n"
);
writeFileSync(path.join(vault, "Beta.md"), "# Beta\n\nThe second note.\n");
writeFileSync(path.join(vault, "Alpha (conflict 2026-10-17 0153).md"), "# Alpha\n\nLink to [[Beta]] from the other device.\n");
writeFileSync(
  path.join(vault, ".noteriv", "plugins", "e2e-panel", "manifest.json"),
  JSON.stringify({ id: "e2e-panel", name: "E2E panel", version: "1.0.0", description: "smoke", author: "smoke", main: "main.js", permissions: ["ui:panel"] })
);
writeFileSync(
  path.join(vault, ".noteriv", "plugins", "e2e-panel", "main.js"),
  `module.exports = { onLoad(api) { api.ui.addSidebarPanel({ id: "hello", title: "Hello panel", icon: "H", render(el) { el.innerHTML = "<p>panel works</p>"; } }); } };`
);
writeFileSync(
  path.join(vault, ".noteriv", "plugin-config.json"),
  JSON.stringify({ enabled: ["e2e-panel"], permissions: { "e2e-panel": ["ui:panel"] }, core: { "word-count": true } })
);

// ── run ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const app = spawn(path.join(appDir, "noteriv.exe"), [], {
  env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${PORT}` },
  stdio: "ignore",
});
const consoleLines = [];
let browser;
try {
  let connected = false;
  for (let i = 0; i < 60 && !connected; i++) {
    await sleep(1000);
    try {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
      connected = true;
    } catch {
      /* not up yet */
    }
  }
  check("app starts and exposes the WebView2 debug port", connected);
  if (!connected) throw new Error("no debug port");

  let page;
  for (let i = 0; i < 30 && !page; i++) {
    page = browser.contexts().flatMap((c) => c.pages()).find((p) => !p.url().startsWith("devtools"));
    if (!page) await sleep(500);
  }
  // Reloading the WebView is not reliable under Tauri, so messages from before this point are not seen; CSP reports
  // from everything the checks below load (images, audio, plugin iframes, workers) are.
  page.on("console", (m) => consoleLines.push(`[${m.type()}] ${m.text()}`));
  // The page keeps no record of violations reported before we attached, so report them through the console from now
  // on. The app may still navigate while starting up, so install it for later loads too and once more after it settles.
  const reportViolations = () => {
    if (window.__smokeCsp) return;
    window.__smokeCsp = true;
    document.addEventListener("securitypolicyviolation", (e) => console.error(`Refused (CSP ${e.violatedDirective}): ${e.blockedURI}`));
  };
  await page.addInitScript(reportViolations);
  const shot = (name) => page.screenshot({ path: path.join(out, `${name}.png`) }).catch(() => undefined);

  // Sidebar shows the vault
  const label = (name) => page.locator(".sb-label, .sidebar-root *").getByText(name, { exact: true }).first();
  await label("Alpha").waitFor({ timeout: 30000 }).catch(() => undefined);
  await page.evaluate(reportViolations);
  check("vault opens, file tree shows the notes", await label("Alpha").isVisible());
  await shot("1-open");

  // Note rendering: math, local image, local audio
  await label("Alpha").click();
  await page.locator(".cm-content").first().waitFor({ timeout: 15000 });
  await sleep(2500);
  check("note opens in the editor", (await page.locator(".cm-content").first().textContent())?.includes("smoke needle line") ?? false);
  check("inline math renders (KaTeX)", (await page.locator(".katex").count()) > 0);
  const img = page.locator("img.md-inline-img").first();
  check("local image renders", (await img.count()) > 0 && (await img.evaluate((el) => el.naturalWidth > 0).catch(() => false)));
  const audio = page.locator("audio.md-inline-audio").first();
  const audioState = (await audio.count())
    ? await audio.evaluate(async (el) => {
        for (let i = 0; i < 40 && !el.src; i++) await new Promise((r) => setTimeout(r, 100));
        await new Promise((r) => (el.readyState >= 1 ? r(null) : (el.addEventListener("loadedmetadata", () => r(null), { once: true }), setTimeout(r, 3000))));
        return { duration: el.duration, error: el.error ? el.error.code : null };
      })
    : null;
  check("local audio clip plays (has a duration)", !!audioState && audioState.error === null && audioState.duration > 0.5, JSON.stringify(audioState));
  check("word count (core plugin) in the status bar", await page.getByText(/^\d+ words?$/).first().isVisible().catch(() => false));
  await shot("2-note");

  // Conflict copy banner
  await label("Alpha (conflict 2026-10-17 0153)").click();
  await sleep(1500);
  check("conflict banner on a conflict copy", await page.locator("[data-testid=conflict-banner]").isVisible().catch(() => false));
  await page.getByRole("button", { name: "Compare" }).click().catch(() => undefined);
  check("conflict comparison shows the diff", await page.locator("[data-testid=conflict-diff]").isVisible().catch(() => false));
  await shot("3-conflict");

  // Vault search: as you type, opens at the line
  await page.getByTitle("Search in vault").click();
  const box = page.getByPlaceholder("Search across all notes…");
  await box.fill("needle");
  const option = page.getByRole("option").filter({ hasText: "Alpha" }).first();
  await option.waitFor({ timeout: 10000 }).catch(() => undefined);
  check("vault search lists the matching line", (await option.textContent().catch(() => ""))?.includes("smoke needle line") ?? false);
  await box.press("Enter");
  await sleep(1200);
  await page.keyboard.type("Z");
  await sleep(300);
  check("search result opens the note at that line", (await page.locator(".cm-content").first().textContent())?.includes("Zsmoke needle line") ?? false);
  await page.keyboard.press("Backspace");
  await shot("4-search");

  // Auto-save while typing (desktop default: every 30 s)
  await page.keyboard.press("End");
  await page.keyboard.type(" autosaved", { delay: 30 });
  let saved = false;
  for (let i = 0; i < 40 && !saved; i++) {
    await sleep(1000);
    saved = readFileSync(path.join(vault, "Alpha.md"), "utf8").includes("autosaved");
  }
  check("auto-save writes the note while editing", saved);

  // Community plugin sidebar panel
  await page.getByTitle("Hello panel").click().catch(() => undefined);
  await sleep(1500);
  check("community plugin sidebar panel shows", await page.getByText("panel works").first().isVisible().catch(() => false));
  await shot("5-panel");

  // Settings opens; Escape closes the trash panel
  await page.keyboard.press("Control+Comma");
  await sleep(800);
  check("settings opens", await page.getByText("Core plugins", { exact: true }).first().isVisible().catch(() => false));
  await shot("6-settings");
  await page.keyboard.press("Escape");

  const csp = consoleLines.filter((l) => /Content Security Policy|Refused/i.test(l));
  check("no Content-Security-Policy violations in the console", csp.length === 0, csp.slice(0, 5).join(" | "));

  // Control: the policy is really in force — a script from the internet is refused.
  const blocked = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const timer = setTimeout(() => resolve(false), 3000);
        document.addEventListener(
          "securitypolicyviolation",
          (e) => {
            if (e.blockedURI.includes("example.com")) {
              clearTimeout(timer);
              resolve(true);
            }
          },
          { once: false }
        );
        const s = document.createElement("script");
        s.src = "https://example.com/not-allowed.js";
        document.head.appendChild(s);
      })
  );
  check("CSP is in force (a remote script is blocked)", blocked === true);
} catch (err) {
  check("smoke run finished", false, String(err));
} finally {
  writeFileSync(path.join(out, "console.log"), consoleLines.join("\n"));
  await browser?.close().catch(() => undefined);
  try {
    execSync(`taskkill /PID ${app.pid} /T /F`, { stdio: "ignore" });
  } catch {
    /* already gone */
  }
  await sleep(1500);
  rmSync(root, { recursive: true, force: true });
  const failed = results.filter((r) => !r.ok).length;
  console.log(failed === 0 ? `\nALL ${results.length} PASSED` : `\n${failed} of ${results.length} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

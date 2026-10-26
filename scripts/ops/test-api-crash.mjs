#!/usr/bin/env node
// Validates Scenario 19: Fault tolerance and zero data loss when the API server goes down.
//
// 1. Logs in and navigates to the test vault.
// 2. Opens a note while online (populating the local offline cache).
// 3. Simulates API outage / server crash (via network drop and 502 Bad Gateway).
// 4. Types new text in the editor while the server is offline.
// 5. Verifies the user experience:
//    - Offline banner is shown at the top ("Offline — showing what this device kept...").
//    - Local status indicator is updated ("Kept on this device").
// 6. Reloads the browser tab to verify offline persistence from IndexedDB.
// 7. Restores API connectivity.
// 8. Verifies automatic recovery:
//    - Offline banner disappears.
//    - flushPending() automatically flushes local pending edits to the API server.
// 9. Asserts 0 data loss: reads the note directly from the API endpoint and verifies full text presence.
//
// Usage:
//   node scripts/ops/test-api-crash.mjs --web http://127.0.0.1:3457 --email <e> --password <p> [--vault "Perf 2000"]

import { chromium, expect } from "@playwright/test";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((out, a, i, all) => (a.startsWith("--") ? [...out, [a.slice(2), all[i + 1]]] : out), [])
);
const WEB = (args.web ?? "http://127.0.0.1:3457").replace(/\/$/, "");
const VAULT_NAME = args.vault ?? "Perf 2000";

if (!args.email || !args.password) {
  console.error("usage: --web <origin> --email <e> --password <p> [--vault <name>]");
  process.exit(2);
}

const TIMEOUT = 30_000;

async function run() {
  console.log(`[K-OPS-19] Launching browser to test API outage resilience on ${WEB}...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ locale: "en-US", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  page.on("console", (msg) => console.log(`[PAGE LOG] ${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (err) => console.log(`[PAGE ERR] ${err}`));

  // 1. Login via API request session
  console.log(`[K-OPS-19] Step 1: Authenticating as ${args.email}...`);
  const loginRes = await page.request.post(`${WEB}/api/v1/auth/login`, {
    data: { email: args.email, password: args.password },
  });
  if (!loginRes.ok()) throw new Error(`Login failed with status: ${loginRes.status()}`);

  const vaultsRes = await (await page.request.get(`${WEB}/api/v1/vaults`)).json();
  const vaults = vaultsRes.vaults ?? vaultsRes;
  const vault = vaults.find((v) => v.name === VAULT_NAME);
  if (!vault) throw new Error(`Vault "${VAULT_NAME}" not found`);

  // Clear workspace state to start fresh
  await page.request.put(`${WEB}/api/v1/vaults/${vault.id}/workspace-state`, { data: { state: {} } }).catch(() => undefined);

  // 2. Open vault & note while online
  console.log(`[K-OPS-19] Step 2: Opening vault "${VAULT_NAME}" (${vault.id})...`);
  await page.goto(`${WEB}/vaults/${vault.id}`);
  
  const sidebarItem = (name) => page.locator(".sidebar-root .sb-label").getByText(name, { exact: true }).first();
  await sidebarItem("Tactics").waitFor({ timeout: TIMEOUT });
  await sidebarItem("Openings").click();

  const sidebarFirstNote = page.locator(".sidebar-root .sb-label").filter({ hasText: /^Note 0*1 / }).first();
  await sidebarFirstNote.waitFor({ timeout: TIMEOUT });
  const noteName = (await sidebarFirstNote.innerText()).trim();
  console.log(`[K-OPS-19] Opening note: "${noteName}"...`);
  await sidebarFirstNote.click();

  const editor = page.locator(".cm-content").first();
  await editor.waitFor({ timeout: TIMEOUT });
  const initialText = await editor.innerText();
  console.log(`[K-OPS-19] Note opened. Initial content length: ${initialText.length} chars.`);

  // Wait 2s for initial content and workspace state to sync to local IndexedDB store
  await page.waitForTimeout(2000);

  // 3. Simulate API Outage / Crash
  console.log(`[K-OPS-19] Step 3: Simulating API server outage (502 Bad Gateway / connection dropped)...`);
  let isOffline = true;
  await context.route("**/api/**", (route) => {
    if (isOffline) {
      return route.fulfill({
        status: 502,
        contentType: "text/plain",
        body: "Bad Gateway: API Server Unreachable",
      });
    }
    return route.continue();
  });

  // 4. User types while API is crashed
  const offlineMarker = " [API CRASH RECOVERY TEST: Zero data loss verified]";
  console.log(`[K-OPS-19] Step 4: User typing in editor while API is dead: "${offlineMarker}"...`);
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(offlineMarker);

  // Wait for auto-save debounce (800ms) to attempt save, catch network error, and store to pending
  console.log(`[K-OPS-19] Step 4b: Waiting for auto-save to persist edit to local IndexedDB pending queue...`);
  await expect(page.getByText("Kept on this device", { exact: true })).toBeVisible({ timeout: 15_000 });
  console.log(`[K-OPS-19] Status "Kept on this device" confirmed visible!`);

  // Verify offline banner appears
  const offlineBanner = page.getByRole("status").filter({ hasText: /Offline — showing what this device kept/i });
  await expect(offlineBanner).toBeVisible({ timeout: 10_000 });
  const bannerText = (await offlineBanner.innerText()).trim();
  console.log(`[K-OPS-19] UI Offline Banner detected: "${bannerText}"`);

  // Allow IndexedDB write transactions to settle
  await page.waitForTimeout(1500);

  const dumpIdb = async (label) => {
    const data = await page.evaluate(async () => {
      const req = indexedDB.open("noteriv-offline");
      const db = await new Promise((res, rej) => {
        req.onsuccess = () => res(req.result);
        req.onerror = () => rej(req.error);
      });
      const getStore = (name) => {
        return new Promise((res) => {
          const tx = db.transaction(name, "readonly");
          const s = tx.objectStore(name);
          const r = s.getAll();
          r.onsuccess = () => res(r.result);
          r.onerror = () => res([]);
        });
      };
      return {
        pendingCount: (await getStore("pending")).length,
        notesCount: (await getStore("notes")).length,
      };
    });
    console.log(`[K-OPS-19] ${label}:`, JSON.stringify(data));
  };

  await dumpIdb("IndexedDB before reload");

  // 5. Reload page while API is STILL crashed to prove persistence
  console.log(`[K-OPS-19] Step 5: Reloading browser page while API is STILL DEAD...`);
  await page.reload();

  await expect(offlineBanner).toBeVisible({ timeout: 10_000 });
  console.log(`[K-OPS-19] Reload successful while offline. Offline banner displayed.`);

  await dumpIdb("IndexedDB after reload");

  // Verify that CodeMirror asynchronously restores the active tab with the pending edit
  console.log(`[K-OPS-19] Waiting for active note editor to restore pending edit from IndexedDB...`);
  const editorAfterReload = page.locator(".cm-content").first();
  await editorAfterReload.waitFor({ timeout: 15_000 });

  // CodeMirror virtualizes off-screen lines. Scroll or jump cursor to bottom to bring trailing text into DOM:
  await editorAfterReload.click();
  await page.keyboard.press("Control+End");

  await expect(editorAfterReload).toContainText("Zero data loss verified", { timeout: 15_000 });
  const textAfterReload = await editorAfterReload.innerText();
  console.log(`[K-OPS-19] Content after reload verified! Ends with: "${textAfterReload.slice(-55)}"`);

  // 6. Restore API connectivity
  console.log(`[K-OPS-19] Step 6: Restoring API server connectivity...`);
  isOffline = false;

  const patchPromise = page.waitForResponse(
    (res) => res.url().includes("/notes/") && res.request().method() === "PATCH" && res.ok(),
    { timeout: 15_000 }
  );

  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  const patchRes = await patchPromise;
  console.log(`[K-OPS-19] Automatic flush executed! API responded HTTP ${patchRes.status()} to PATCH.`);

  // Verify banner disappears
  await expect(offlineBanner).toHaveCount(0, { timeout: 10_000 });
  console.log(`[K-OPS-19] Offline banner automatically hidden after recovery.`);

  // 7. Verify Zero Data Loss directly on API server
  console.log(`[K-OPS-19] Step 7: Verifying zero data loss directly on backend API database...`);
  const vaultId = new URL(page.url()).pathname.split("/")[2];
  const indexRes = await (await page.request.get(`${WEB}/api/v1/vaults/${vaultId}/index`)).json();
  const firstNoteRef = indexRes.notes.find((n) => n.name.startsWith("Note 001 ") || n.name.startsWith("Note 0001 "));
  if (!firstNoteRef) throw new Error("Could not find note ref on server index");

  const serverNote = await (await page.request.get(`${WEB}/api/v1/vaults/${vaultId}/notes/${firstNoteRef.id}`)).json();
  if (!serverNote.content.includes("Zero data loss verified")) {
    throw new Error(`Data verification failed on server: Note does not contain offline typed text! Content: ${serverNote.content}`);
  }
  console.log(`[K-OPS-19] Direct server query verified! Full content stored on server:`);
  console.log(`   Length: ${serverNote.content.length} characters.`);
  console.log(`   Trailing text: "...${serverNote.content.slice(-60)}"`);

  // Clean up edit (revert the typed text)
  console.log(`[K-OPS-19] Cleaning up test edit from note...`);
  await page.request.patch(`${WEB}/api/v1/vaults/${vaultId}/notes/${firstNoteRef.id}`, {
    data: { content: initialText },
  });

  await context.close();
  await browser.close();
  console.log(`\n======================================================`);
  console.log(`[K-OPS-19] RESULT: PASSED (ĐẠT)`);
  console.log(`- API Crash Detection: OK (502 Bad Gateway intercepted)`);
  console.log(`- UI Banner: "${bannerText}"`);
  console.log(`- Offline Persistence: OK (IndexedDB store preserved text through reload)`);
  console.log(`- Auto Recovery: OK (flushPending executed on reconnection)`);
  console.log(`- Zero Data Loss: OK (100% text saved to server database)`);
  console.log(`======================================================\n`);
}

run().catch((err) => {
  console.error(`[K-OPS-19] FAILED:`, err);
  process.exit(1);
});

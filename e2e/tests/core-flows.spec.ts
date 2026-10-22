import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// The main path a new user takes, end to end through the real UI: sign up with an invite code,
// create a vault, write and link notes, rename, search, switch a core plugin on, delete a note
// and restore it from the trash. One account per run, deleted at the end.

test.describe.configure({ mode: "serial" });

let context: BrowserContext;
let page: Page;
const stamp = Date.now();
const email = `e2e-${stamp}@example.test`;
// Throwaway account on the test database; never reused or printed.
const password = `E2e-${stamp}-${Math.random().toString(36).slice(2)}`;

test.beforeAll(async ({ browser }) => {
  // One context for the whole run, so a second tab (same session) can be opened.
  context = await browser.newContext();
  page = await context.newPage();
});

test.afterAll(async () => {
  // Remove the account and everything it owns, whatever happened above (E2E_KEEP_ACCOUNT=1 keeps it to debug).
  if (!process.env.E2E_KEEP_ACCOUNT) await page.request.delete("/api/v1/users/me").catch(() => undefined);
  await context.close();
});

const sidebarItem = (name: string) => page.locator(".sidebar-root .sb-label").getByText(name, { exact: true }).first();
const editor = () => page.locator(".cm-content").first();

/** Waits until the page has saved a note whose content contains `text`. */
const noteSaved = (text: string) =>
  page.waitForResponse(
    (r) =>
      /\/api\/v1\/vaults\/[^/]+\/notes\/[^/]+$/.test(r.url()) &&
      ["PATCH", "PUT"].includes(r.request().method()) &&
      (r.request().postData() ?? "").includes(text) &&
      r.ok()
  );

async function renameViaContextMenu(from: string, to: string) {
  await sidebarItem(from).click({ button: "right" });
  await page.getByText("Rename", { exact: true }).click();
  const input = page.locator(".sidebar-root input.sb-rename").first();
  await input.fill(to);
  await input.press("Enter");
  await expect(sidebarItem(to)).toBeVisible();
}

test("sign up with an invite code", async () => {
  const invite = process.env.E2E_INVITE_CODE;
  expect(invite, "global-setup seeds E2E_INVITE_CODE").toBeTruthy();
  await page.goto("/register");
  await page.getByPlaceholder("Invite code").fill(invite!);
  await page.getByPlaceholder("Display name").fill("E2E Tester");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password (at least 8 characters)").fill(password);
  await page.locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: "Sign up" }).click();
  // Sign-up also writes the Getting started vault before moving on, which takes a few requests more: well under a
  // second next to the database (CI, production), up to ~40 s through the SSH tunnel to the dev database.
  await expect(page).toHaveURL(/\/vaults$/, { timeout: 60_000 });
});

test("a new account starts with the Getting started vault, its notes linked", async () => {
  await page.getByRole("button", { name: /^Getting started/ }).click();
  await expect(page).toHaveURL(/\/vaults\/[0-9a-f-]{36}$/);
  await expect(sidebarItem("Links and backlinks")).toBeVisible();
  await sidebarItem("Welcome").click();
  await page.getByTitle("Backlinks", { exact: true }).click();
  // The links between sample notes resolve: every other note links back to Welcome.
  await expect(page.locator(".bl-panel .bl-list")).toContainText("Links and backlinks");
  await page.getByTitle("Backlinks", { exact: true }).click();
  await page.goto("/vaults");
});

test("create a vault and open it", async () => {
  await page.getByPlaceholder("New vault name").fill("E2E vault");
  await page.getByPlaceholder("New vault name").press("Enter");
  // A new vault opens straight away.
  await expect(page).toHaveURL(/\/vaults\/[0-9a-f-]{36}$/);
  await expect(page.getByTitle("New note", { exact: true })).toBeVisible();
});

/** A new note starts in rename mode: type its name right away. */
async function nameNewNote(name: string) {
  const input = page.locator(".sidebar-root input.sb-rename").first();
  await expect(input).toBeFocused();
  await input.fill(name);
  await input.press("Enter");
  await expect(sidebarItem(name)).toBeVisible();
}

test("write two linked notes, rename them, see the backlink", async () => {
  await page.getByTitle("New note", { exact: true }).click();
  await expect(editor()).toBeVisible();
  await nameNewNote("Draft");
  await renameViaContextMenu("Draft", "First");

  await page.getByTitle("New file", { exact: true }).click(); // the sidebar's own "+" button
  await nameNewNote("Second");
  await editor().click();
  const secondSaved = noteSaved("The second note");
  await page.keyboard.type("# Second\n\nThe second note.");
  await secondSaved;

  await sidebarItem("First").click();
  await editor().click();
  const firstSaved = noteSaved("Hello e2e world");
  // The editor closes brackets itself, so typing "[[Second" yields "[[Second]]".
  await page.keyboard.type("# First\n\nHello e2e world, see [[Second");
  await page.keyboard.press("Escape"); // dismiss the link suggestions
  await firstSaved;

  await sidebarItem("Second").click();
  await page.getByTitle("Backlinks", { exact: true }).click();
  await expect(page.locator(".bl-panel .bl-list")).toContainText("First");
});

test("clicking a wiki-link opens the note, or creates it when it does not exist yet", async () => {
  await sidebarItem("First").click();
  await editor().click();
  await page.keyboard.press("Control+Home"); // off the link's line, so the link renders
  await page.locator(".cm-content .md-wikilink", { hasText: "Second" }).first().click();
  await expect(page.locator(".tab-active")).toContainText("Second");
  await expect(editor()).toContainText("The second note");

  await editor().click();
  await page.keyboard.press("Control+End");
  const saved = noteSaved("[[Third idea]]");
  await page.keyboard.type("\n\nSee [[Third idea");
  await page.keyboard.press("Escape");
  await saved;
  await page.keyboard.press("Control+Home");
  await page.locator(".cm-content .md-wikilink", { hasText: "Third idea" }).first().click();
  await expect(sidebarItem("Third idea")).toBeVisible();
  await expect(page.locator(".tab-active")).toContainText("Third idea");
});

test("renaming a note rewrites the links that point to it", async () => {
  // "Second" (open in a tab, saved) links to [[Third idea]].
  const rewritten = noteSaved("[[Third thought]]");
  await renameViaContextMenu("Third idea", "Third thought");
  await rewritten;
  await expect(page.getByText("Updated links in 1 note")).toBeVisible();
  await sidebarItem("Second").click();
  await expect(editor()).toContainText("Third thought");
  await expect(editor()).not.toContainText("Third idea");
  // The link still resolves: Third thought lists Second as a backlink (the panel may still be open from above).
  await sidebarItem("Third thought").click();
  const backlinks = page.locator(".bl-panel .bl-list");
  if (!(await page.locator(".bl-panel").isVisible())) await page.getByTitle("Backlinks", { exact: true }).click();
  await expect(backlinks).toContainText("Second");
});

test("unlinked mentions can be turned into links; Outgoing links lists what a note links to", async () => {
  // "Third thought" names "Second" without a link.
  await sidebarItem("Third thought").click();
  await editor().click();
  await page.keyboard.press("Control+End");
  const typed = noteSaved("Back to second.");
  await page.keyboard.type("\n\nBack to second.");
  await typed;

  await sidebarItem("Second").click();
  if (!(await page.locator(".bl-panel").isVisible())) await page.getByTitle("Backlinks", { exact: true }).click();
  const unlinked = page.locator(".bl-unlinked");
  await expect(unlinked).toContainText("Third thought");
  // The mention is in a note open in a tab: it is changed there and saved by the tab itself.
  const linked = noteSaved("Back to [[second]].");
  await unlinked.locator(".bl-link-btn").first().click();
  await linked;
  await expect(unlinked).toContainText("No other note names this one without a link.");

  await page.keyboard.press("Control+Shift+P");
  await page.keyboard.type("Outgoing links");
  await page.keyboard.press("Enter");
  await expect(page.locator(".ol-panel")).toContainText("Third thought");
  await page.locator(".ol-panel .bl-close").click();
});

test("search finds the matching line as you type and opens the note there", async () => {
  await sidebarItem("Second").click();
  await page.getByTitle("Search in vault").click();
  const box = page.getByPlaceholder("Search across all notes…");
  await box.fill("e2e world"); // no Enter needed to search
  const result = page.getByRole("option").filter({ hasText: "First" });
  await expect(result).toContainText("Hello e2e world");
  await expect(result).toContainText(":3"); // the line it is on
  await box.press("Enter");
  await expect(box).toHaveCount(0);
  await expect(page.locator(".cm-content").first()).toContainText("Hello e2e world");
  // The cursor is at the start of that line: a typed character lands there.
  await page.keyboard.type("Z");
  await expect(page.locator(".cm-content").first()).toContainText("ZHello e2e world");
  await page.keyboard.press("Backspace");
  await expect(page.locator(".cm-content").first()).not.toContainText("ZHello");
});

test("switching a core plugin on adds its feature", async () => {
  await sidebarItem("First").click();
  await page.keyboard.press("Control+Comma"); // Settings (the ribbon button can sit under the dev-mode badge)
  await page.getByText("Core plugins", { exact: true }).click();
  const row = page.locator('[data-core-plugin="word-count"]');
  const toggle = row.getByRole("switch");
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await page.keyboard.press("Escape");
  await expect(page.getByText(/^\d+ words?$/).first()).toBeVisible();
});

test("the Language setting switches the interface to Vietnamese and back to the browser's language", async () => {
  const other = await context.newPage();
  await other.goto(page.url());
  const prefsSaved = (check: (body: string) => boolean) =>
    other.waitForResponse((r) => r.url().endsWith("/users/me/preferences") && r.request().method() === "PUT" && check(r.request().postData() ?? "") && r.ok());
  try {
    await other.locator(".sidebar-root .sb-label").getByText("First", { exact: true }).click();
    await expect(other.locator("html")).toHaveAttribute("lang", "en");
    await other.keyboard.press("Control+Comma");
    const toVi = prefsSaved((b) => b.includes('"language":"vi"'));
    await other.getByLabel("Language", { exact: true }).selectOption("vi");
    await expect(other.locator("html")).toHaveAttribute("lang", "vi");
    await expect(other.getByText("Ngôn ngữ", { exact: true }).first()).toBeVisible(); // Settings re-rendered
    await toVi;
    await other.keyboard.press("Escape");
    await expect(other.getByText(/^\d+ từ$/).first()).toBeVisible(); // core plugin text
    await expect(other.getByTitle("Tìm trong vault")).toBeVisible(); // ribbon
    // The choice is the account's: a reload keeps it.
    await other.reload();
    await other.locator(".sidebar-root .sb-label").getByText("First", { exact: true }).click();
    await expect(other.locator("html")).toHaveAttribute("lang", "vi");
    await expect(other.getByTitle("Thêm công cụ")).toBeVisible();
    // Back to "follow the browser" (English here).
    await other.keyboard.press("Control+Comma");
    const toAuto = prefsSaved((b) => !b.includes('"language"'));
    await other.getByLabel("Ngôn ngữ", { exact: true }).selectOption("auto");
    await expect(other.locator("html")).toHaveAttribute("lang", "en");
    await toAuto;
    await other.keyboard.press("Escape");
  } finally {
    await other.close();
  }
});

test("a browser set to Vietnamese gets the Vietnamese interface before signing in", async ({ browser }) => {
  const vi = await browser.newContext({ locale: "vi-VN" });
  try {
    const p = await vi.newPage();
    await p.goto("/login");
    await expect(p.getByRole("heading", { name: "Đăng nhập Noteriv" })).toBeVisible();
    await expect(p.locator("html")).toHaveAttribute("lang", "vi");
    // The language links switch it right there, and the choice stays on this device.
    await p.getByRole("button", { name: "English" }).click();
    await expect(p.getByRole("heading", { name: "Sign in to Noteriv" })).toBeVisible();
    await p.reload();
    await expect(p.getByRole("heading", { name: "Sign in to Noteriv" })).toBeVisible();
  } finally {
    await vi.close();
  }
});

test("another open tab follows a core plugin switch without reloading", async () => {
  const other = await context.newPage();
  await other.goto(page.url());
  // Open a note there explicitly: the restored tabs may not have reached the server yet.
  await other.locator(".sidebar-root .sb-label").getByText("First", { exact: true }).click();
  await expect(other.getByText(/^\d+ words?$/).first()).toBeVisible();

  await page.keyboard.press("Control+Comma");
  await page.getByText("Core plugins", { exact: true }).click();
  const toggle = page.locator('[data-core-plugin="word-count"]').getByRole("switch");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("Escape");

  await expect(other.getByText(/^\d+ words?$/)).toHaveCount(0);
  await other.close();
});

test("reloading restores the open tabs without a request per note", async () => {
  // workspace-state now carries the open notes, so no per-note GET is needed to restore them.
  // Other tabs opened earlier in this run (one note each) may have saved the workspace last: switching between the
  // two open notes here makes this page save its own state again.
  await sidebarItem("Second").click();
  await sidebarItem("First").click();
  const noteGets: string[] = [];
  const onRequest = (r: { url: () => string; method: () => string }) => {
    if (r.method() === "GET" && /\/api\/v1\/vaults\/[^/]+\/notes\/[^/?]+$/.test(r.url())) noteGets.push(r.url());
  };
  page.on("request", onRequest);
  const syncLists: string[] = [];
  const onSync = (r: { url: () => string; method: () => string }) => {
    if (r.method() === "GET" && r.url().endsWith("/sync-connections")) syncLists.push(r.url());
  };
  page.on("request", onSync);
  // The open tabs are saved to the server a moment after they change; reload only once they are there.
  const vaultId = new URL(page.url()).pathname.split("/")[2];
  await expect
    .poll(async () => ((await (await page.request.get(`/api/v1/vaults/${vaultId}/workspace-state`)).json()).openTabs ?? []).length)
    .toBeGreaterThanOrEqual(2);
  await page.reload();
  await expect(page.locator(".cm-content").first()).toContainText(/Hello e2e world|The second note/);
  await expect(page.getByText("First.md", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Second.md", { exact: true }).first()).toBeVisible();
  await page.waitForTimeout(1500);
  page.off("request", onRequest);
  page.off("request", onSync);
  expect(noteGets, "restored tabs come from workspace-state").toHaveLength(0);
  expect(syncLists.length, "sync connections are fetched once on open").toBeLessThanOrEqual(1);
});

test("a deleted note goes to the trash and can be restored", async () => {
  await sidebarItem("Second").click({ button: "right" });
  await page.getByText("Delete", { exact: true }).click();
  await expect(sidebarItem("Second")).toHaveCount(0);

  await page.getByTitle("More tools").click();
  await page.getByRole("menuitem", { name: "Trash" }).click();
  await page.getByTitle("Restore file", { exact: true }).first().click();
  await page.keyboard.press("Escape"); // closes the trash panel
  await expect(sidebarItem("Second")).toBeVisible();
});

test("a save without network is kept on the device and sent once the network is back", async () => {
  await sidebarItem("First").click();
  const notePatch = /\/api\/v1\/vaults\/[^/]+\/notes\/[^/]+$/;
  await page.route(notePatch, (route) => (route.request().method() === "PATCH" ? route.abort("internetdisconnected") : route.fallback()));
  await editor().click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" offline edit");
  // No network: the edit is kept on this device (and would survive a reload) until it can be sent.
  await expect(page.getByText("Kept on this device", { exact: true })).toBeVisible();
  await page.unroute(notePatch);
  const resent = noteSaved("offline edit");
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await resent;
  await expect(page.getByText("saved", { exact: true })).toBeVisible();
});

test("Quick note files the text into Inbox/ of the chosen vault", async () => {
  const vaultUrl = page.url();
  await page.goto("/quick");
  await page.getByLabel("Vault").selectOption({ label: "E2E vault" });
  await page.getByLabel("Note text").fill("Call the bank\nabout the card");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Saved to Inbox\/Call the bank\.md/)).toBeVisible();
  await expect(page.getByLabel("Note text")).toHaveValue("");
  await page.goto(vaultUrl);
  await sidebarItem("Inbox").click();
  await expect(sidebarItem("Call the bank")).toBeVisible();
});

test("on a phone the ribbon is a bottom bar and the file list a drawer", async () => {
  const phone = await context.newPage();
  try {
    await phone.setViewportSize({ width: 390, height: 844 });
    await phone.goto(page.url());
    const ribbon = phone.locator(".ribbon");
    await expect(ribbon).toBeVisible();
    const bar = (await ribbon.boundingBox())!;
    expect(bar.y + bar.height).toBeGreaterThan(844 - 2);
    expect(bar.width).toBeGreaterThan(380);
    // The sidebar starts closed; the header button opens it as a drawer, opening a note closes it again.
    const drawer = phone.locator(".sidebar-root");
    await expect(drawer).toHaveCount(0);
    await phone.getByTitle("Collapse sidebar", { exact: true }).click();
    await expect(drawer).toBeVisible();
    await drawer.locator(".sb-label").getByText("First", { exact: true }).click();
    await expect(drawer).toHaveCount(0);
    await expect(phone.locator(".cm-content").first()).toContainText("Hello e2e world");
    // The note's own buttons scroll into view instead of being cut off.
    const last = phone.getByTitle("File Recovery", { exact: true });
    await last.scrollIntoViewIfNeeded();
    const box = (await last.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    // "More tools" opens above the bottom bar.
    await phone.getByTitle("More tools", { exact: true }).click();
    const menu = (await phone.getByRole("menu").boundingBox())!;
    expect(menu.y + menu.height).toBeLessThanOrEqual(bar.y + 1);
  } finally {
    await phone.close();
  }
});

test("a note changed elsewhere meanwhile is not overwritten: the edit becomes a conflict copy", async () => {
  await sidebarItem("First").click();
  await expect(editor()).toContainText("Hello e2e world");
  const vaultId = new URL(page.url()).pathname.split("/")[2];
  const index = await (await page.request.get(`/api/v1/vaults/${vaultId}/index`)).json();
  const first = index.notes.find((n: { name: string }) => n.name === "First.md");
  // Another device saves the note (no base version: an unconditional write).
  const other = await page.request.patch(`/api/v1/vaults/${vaultId}/notes/${first.id}`, { data: { content: "# First\n\nChanged on another device." } });
  expect(other.ok()).toBe(true);

  await editor().click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" local words");
  await expect(page.getByText(/was changed elsewhere meanwhile/)).toBeVisible();
  await expect(page.locator(".sidebar-root .sb-label").getByText(/^First \(conflict \d{4}-\d{2}-\d{2} \d{4}\)$/)).toBeVisible();
  await expect(page.locator("[data-testid=conflict-banner]")).toBeVisible();
  await expect(editor()).toContainText("local words"); // the copy, opened beside the note
  await sidebarItem("First").click();
  await expect(editor()).toContainText("Changed on another device.");
});

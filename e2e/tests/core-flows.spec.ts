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
  await page.getByPlaceholder("Mã mời").fill(invite!);
  await page.getByPlaceholder("Tên hiển thị").fill("E2E Tester");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Mật khẩu (tối thiểu 8 ký tự)").fill(password);
  await page.locator('input[type="checkbox"]').check();
  await page.getByRole("button", { name: "Đăng ký" }).click();
  await expect(page).toHaveURL(/\/vaults$/);
});

test("create a vault and open it", async () => {
  await page.getByPlaceholder("Tên vault mới").fill("E2E vault");
  await page.getByPlaceholder("Tên vault mới").press("Enter");
  // A new vault opens straight away.
  await expect(page).toHaveURL(/\/vaults\/[0-9a-f-]{36}$/);
  await expect(page.getByTitle("Note mới")).toBeVisible();
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
  await page.getByTitle("Note mới").click();
  await expect(editor()).toBeVisible();
  await nameNewNote("Draft");
  await renameViaContextMenu("Draft", "First");

  await page.getByTitle("New file").click(); // the sidebar's own "+" button
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
  await page.getByTitle("Backlinks").click();
  await expect(page.locator(".bl-panel .bl-list")).toContainText("First");
});

test("search finds a note by its content", async () => {
  await page.getByTitle("Tìm trong vault").click();
  const box = page.getByPlaceholder("Tìm trong nội dung…");
  await box.fill("e2e world");
  await box.press("Enter");
  const result = page.getByRole("button", { name: /First\.md/ });
  await expect(result).toContainText("e2e world");
  await result.click();
  await expect(page.locator(".cm-content").first()).toContainText("Hello e2e world");
  // Opening a result may already have closed the search panel.
  const close = page.getByTitle("Đóng tìm kiếm");
  if (await close.isVisible()) await close.click();
  await expect(sidebarItem("Second")).toBeVisible();
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
  await expect(page.getByText(/^\d+ từ$/).first()).toBeVisible();
});

test("another open tab follows a core plugin switch without reloading", async () => {
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.getByText(/^\d+ từ$/).first()).toBeVisible();

  await page.keyboard.press("Control+Comma");
  await page.getByText("Core plugins", { exact: true }).click();
  const toggle = page.locator('[data-core-plugin="word-count"]').getByRole("switch");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await page.keyboard.press("Escape");

  await expect(other.getByText(/^\d+ từ$/)).toHaveCount(0);
  await other.close();
});

test("reloading restores the open tabs without a request per note", async () => {
  // workspace-state now carries the open notes, so no per-note GET is needed to restore them.
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

  await page.getByTitle("Thêm công cụ").click();
  await page.getByText("Thùng rác", { exact: true }).click();
  await page.getByTitle("Khôi phục").first().click();
  await page.keyboard.press("Escape"); // closes the trash panel
  await expect(sidebarItem("Second")).toBeVisible();
});

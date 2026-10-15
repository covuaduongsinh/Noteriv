// Copies the one plugin sandbox page (packages/ui/public/plugin-sandbox.html) into each app's public/ folder,
// because Next serves static files only from the app's own public/. packages/ui/test/sandbox-copies.test.ts fails
// when a copy drifts. Run: npm run sync:sandbox
import { copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "packages/ui/public/plugin-sandbox.html");
for (const app of ["web", "desktop"]) {
  const target = join(root, app, "public/plugin-sandbox.html");
  copyFileSync(source, target);
  console.log(`copied -> ${app}/public/plugin-sandbox.html`);
}

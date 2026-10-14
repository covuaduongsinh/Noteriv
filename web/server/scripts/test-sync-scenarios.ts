// Manual end-to-end check of the git sync engine against LOCAL bare repos (no
// network, no GitHub). Run: npx tsx scripts/test-sync-scenarios.ts
// Covers the three scenarios the sync code's history demands: empty remote,
// remote with conflicting commits, and several two-way rounds — plus direction
// modes, commit templates, .gitignore, conflict resolution and the askpass helper.
// Uses the dev database (DATABASE_URL) and removes everything it creates.

import { PrismaClient } from "@prisma/client";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { encryptJson } from "../src/lib/crypto.js";
import { runSyncJob, formatCommitMessage } from "../src/lib/syncRunner.js";
import { askpassBody } from "../src/lib/gitSync.js";
import { putObject, makeStorageKey, deleteObject } from "../src/lib/attachments.js";
import { toRelativeLinks, fromRelativeLinks } from "../src/lib/attachmentLinks.js";

const prisma = new PrismaClient();
const root = mkdtempSync(path.join(tmpdir(), "noteriv-sync-test-"));
let failures = 0;

function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + detail}`);
  if (!ok) failures++;
}
const git = (cwd: string, ...args: string[]) =>
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...args], { cwd, encoding: "utf8" }).trim();

async function main() {
  // --- fixtures: user/workspace/vault + bare remote ---
  const user = await prisma.user.create({ data: { email: `synctest-${Date.now()}@example.test`, displayName: "Sync Test" } });
  const ws = await prisma.workspace.create({ data: { name: "t", ownerId: user.id, members: { create: { userId: user.id, role: "owner" } } } });
  const vault = await prisma.vault.create({ data: { name: "sync-test", workspaceId: ws.id } });
  const bare = path.join(root, "remote.git");
  git(root, "init", "--bare", "-b", "main", bare);

  const conn = await prisma.syncConnection.create({
    data: {
      vaultId: vault.id,
      providerType: "gitea",
      remoteUrl: bare,
      branch: "main",
      authUsername: "",
      credentialsEncrypted: encryptJson({ username: "", token: "" }),
      commitTemplate: "web {date} {count} changed",
    },
  });
  const note = (name: string, content: string) =>
    prisma.note.create({ data: { vaultId: vault.id, name, path: name, content, sizeBytes: content.length, createdById: user.id, updatedById: user.id } });
  const cloneRemote = (label: string) => {
    const d = path.join(root, label);
    git(root, "clone", bare, d);
    return d;
  };
  const push = (d: string, msg: string) => {
    git(d, "add", "-A");
    git(d, "commit", "-m", msg);
    git(d, "push", "origin", "main");
  };
  const noteContent = async (p: string) => (await prisma.note.findFirst({ where: { vaultId: vault.id, path: p, deletedAt: null } }))?.content ?? null;
  const lastJob = () => prisma.syncJob.findFirst({ where: { syncConnectionId: conn.id }, orderBy: { createdAt: "desc" } });

  // --- 1. empty remote ---
  await note("a.md", "# A\none");
  await note("b.md", "# B\ntwo");
  await runSyncJob(prisma, conn.id);
  const c1 = cloneRemote("c1");
  check("empty remote: files pushed", existsSync(path.join(c1, "a.md")) && existsSync(path.join(c1, "b.md")));
  check("empty remote: default .gitignore created", existsSync(path.join(c1, ".gitignore")));
  const subject = git(c1, "log", "-1", "--format=%s");
  check("commit message template applied", /^web \d{4}-\d{2}-\d{2} \d+ changed$/.test(subject), subject);
  check("job success", (await lastJob())?.status === "success");

  // --- 2. multi-round two-way ---
  await prisma.note.updateMany({ where: { vaultId: vault.id, path: "a.md" }, data: { content: "# A\none (web edit)" } });
  await runSyncJob(prisma, conn.id);
  git(c1, "pull");
  check("round: web edit reaches remote", readFileSync(path.join(c1, "a.md"), "utf8").includes("web edit"));
  writeFileSync(path.join(c1, "c.md"), "# C\nfrom remote");
  push(c1, "remote adds c");
  await runSyncJob(prisma, conn.id);
  check("round: remote-only note imported", (await noteContent("c.md")) === "# C\nfrom remote");
  await prisma.note.updateMany({ where: { vaultId: vault.id, path: "b.md" }, data: { deletedAt: new Date() } });
  await runSyncJob(prisma, conn.id);
  git(c1, "pull");
  check("round: trashed note removed from repo", !existsSync(path.join(c1, "b.md")));
  const nested = await prisma.folder.create({ data: { vaultId: vault.id, name: "sub", path: "sub" } });
  await prisma.note.create({ data: { vaultId: vault.id, folderId: nested.id, name: "d.md", path: "sub/d.md", content: "nested", sizeBytes: 6, createdById: user.id, updatedById: user.id } });
  await runSyncJob(prisma, conn.id);
  git(c1, "pull");
  check("round: nested folder note pushed", existsSync(path.join(c1, "sub", "d.md")));

  // --- 3. conflict then resolve (keep web) ---
  await prisma.note.updateMany({ where: { vaultId: vault.id, path: "a.md" }, data: { content: "# A\nWEB SIDE" } });
  writeFileSync(path.join(c1, "a.md"), "# A\nREMOTE SIDE");
  push(c1, "remote edits a");
  // A plain sync lets the DB win on overlapping paths, so force a *git-level* conflict:
  // commit locally in the scratch copy with content the remote also changed.
  const scratch = path.resolve(process.env.SYNC_SCRATCH_DIR ?? path.join(tmpdir(), "noteriv-sync-scratch"), conn.id);
  writeFileSync(path.join(scratch, "a.md"), "# A\nLOCAL COMMITTED");
  git(scratch, "add", "-A");
  git(scratch, "commit", "-m", "local divergent commit");
  let conflicted = false;
  try {
    await runSyncJob(prisma, conn.id);
  } catch {
    conflicted = true;
  }
  const job = await lastJob();
  check(
    "conflict: job marked conflict with file list",
    conflicted && job?.status === "conflict" && Array.isArray(job?.conflictFiles) && (job.conflictFiles as string[]).includes("a.md"),
    JSON.stringify(job)
  );

  await runSyncJob(prisma, conn.id, "resolve-web");
  git(c1, "pull");
  check("resolve-web: remote now carries web content (fast-forward, no force)", readFileSync(path.join(c1, "a.md"), "utf8").includes("WEB SIDE"));
  check("resolve-web: job success", (await lastJob())?.status === "success");

  // --- 4. resolve-remote ---
  writeFileSync(path.join(c1, "a.md"), "# A\nREMOTE WINS");
  push(c1, "remote edit 2");
  writeFileSync(path.join(scratch, "a.md"), "# A\nLOCAL DIVERGE 2");
  git(scratch, "add", "-A");
  git(scratch, "commit", "-m", "local divergent 2");
  try {
    await runSyncJob(prisma, conn.id);
  } catch {
    /* expected conflict */
  }
  await runSyncJob(prisma, conn.id, "resolve-remote");
  check("resolve-remote: DB took remote content", ((await noteContent("a.md")) ?? "").includes("REMOTE WINS"), String(await noteContent("a.md")));

  // --- 5. direction modes ---
  await prisma.syncConnection.update({ where: { id: conn.id }, data: { direction: "pull" } });
  await prisma.note.updateMany({ where: { vaultId: vault.id, path: "a.md" }, data: { content: "# A\nWEB ONLY EDIT" } });
  git(c1, "pull");
  writeFileSync(path.join(c1, "e.md"), "# E\nremote new");
  push(c1, "remote adds e");
  await runSyncJob(prisma, conn.id);
  git(c1, "pull");
  check("direction=pull: remote note imported", (await noteContent("e.md")) === "# E\nremote new");
  check("direction=pull: web edit NOT pushed", !readFileSync(path.join(c1, "a.md"), "utf8").includes("WEB ONLY EDIT"));

  await prisma.syncConnection.update({ where: { id: conn.id }, data: { direction: "push" } });
  await prisma.note.updateMany({ where: { vaultId: vault.id, path: "a.md" }, data: { content: "# A\nPUSHED NOW" } });
  writeFileSync(path.join(c1, "f.md"), "# F\nremote only");
  push(c1, "remote adds f");
  await runSyncJob(prisma, conn.id);
  git(c1, "pull");
  check("direction=push: web edit pushed", readFileSync(path.join(c1, "a.md"), "utf8").includes("PUSHED NOW"));
  check("direction=push: remote note NOT imported", (await noteContent("f.md")) === null);

  // --- 6. attachments travel with the repo (needs the dev Garage tunnel) ---
  await prisma.syncConnection.update({ where: { id: conn.id }, data: { direction: "both" } });
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
  const storageKey = makeStorageKey(vault.id, "pic one.png");
  const storageKeys = [storageKey];
  await putObject(storageKey, PNG, "image/png");
  const att = await prisma.attachment.create({ data: { vaultId: vault.id, filename: "pic one.png", mimeType: "image/png", size: PNG.length, storageKey } });
  const url = `/api/v1/vaults/${vault.id}/attachments/${att.id}/download`;
  await note("img.md", `# Img\n![pic](${url})\n`);
  await runSyncJob(prisma, conn.id);
  git(c1, "pull");
  check("attachments: file pushed to attachments/", existsSync(path.join(c1, "attachments", "pic one.png")));
  const pushed = readFileSync(path.join(c1, "img.md"), "utf8");
  check("attachments: note link is repo-relative in the repo", pushed.includes("![pic](attachments/pic%20one.png)") && !pushed.includes("/api/v1/"), pushed);
  check("attachments: DB link stays a web URL", ((await noteContent("img.md")) ?? "").includes(url));
  const jobsBefore = await prisma.syncJob.count({ where: { syncConnectionId: conn.id } });
  await runSyncJob(prisma, conn.id);
  check("attachments: second sync is a no-op (no duplicate upload)", (await prisma.attachment.count({ where: { vaultId: vault.id } })) === 1 && (await prisma.syncJob.count({ where: { syncConnectionId: conn.id } })) === jobsBefore + 1);

  mkdirSync(path.join(c1, "assets", "img"), { recursive: true });
  writeFileSync(path.join(c1, "assets", "img", "remote pic.png"), PNG);
  writeFileSync(path.join(c1, "gallery.md"), "# Gallery\n![r](assets/img/remote%20pic.png)\n");
  push(c1, "remote adds image + note");
  await runSyncJob(prisma, conn.id);
  const remoteAtt = await prisma.attachment.findFirst({ where: { vaultId: vault.id, filename: "remote pic.png" } });
  if (remoteAtt) storageKeys.push(remoteAtt.storageKey);
  check("attachments: remote image imported with its repo path", remoteAtt?.syncPath === "assets/img/remote pic.png", JSON.stringify(remoteAtt));
  check("attachments: remote note link rewritten to web URL", ((await noteContent("gallery.md")) ?? "").includes(`/attachments/${remoteAtt?.id}/download`), String(await noteContent("gallery.md")));
  const ids = new Map([[att.id, "attachments/pic one.png"]]);
  const rel = toRelativeLinks(vault.id, "sub/n.md", `![x](${url})`, ids);
  check("link helpers: relative path from a subfolder", rel === "![x](../attachments/pic%20one.png)", rel);
  check("link helpers: round trip is identity", fromRelativeLinks(vault.id, "sub/n.md", rel, new Map([["attachments/pic one.png".toLowerCase(), att.id]])) === `![x](${url})`);
  for (const k of storageKeys) await deleteObject(k).catch(() => undefined);

  // --- 7. helpers ---
  check("commit template tokens", formatCommitMessage("x {count} {date}", 3, new Date("2026-01-02T03:04:05Z")) === "x 3 2026-01-02");
  const body = askpassBody({ username: "me", token: "tok'en" }, false);
  const script = path.join(root, "askpass.sh");
  writeFileSync(script, body, { mode: 0o700 });
  if (process.platform !== "win32") {
    check(
      "askpass answers username/password prompts",
      execFileSync(script, ["Username for 'https://x'"], { encoding: "utf8" }).trim() === "me" &&
        execFileSync(script, ["Password for 'https://me@x'"], { encoding: "utf8" }).trim() === "tok'en"
    );
  } else {
    check("askpass script generated (the .sh variant is executed on Linux CI only)", body.includes("case"));
  }

  await prisma.vault.delete({ where: { id: vault.id } }).catch(() => undefined);
  await prisma.workspace.delete({ where: { id: ws.id } }).catch(() => undefined);
  await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
}

main()
  .catch((e) => {
    console.error("SCRIPT ERROR", e);
    failures++;
  })
  .finally(async () => {
    await prisma.$disconnect();
    rmSync(root, { recursive: true, force: true });
    console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
    process.exit(failures === 0 ? 0 : 1);
  });

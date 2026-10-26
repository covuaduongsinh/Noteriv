// Phone sync against in-memory GitHub and Gitea stand-ins and an in-memory vault. No network, no device.
// Run from the repo root: npx tsx --tsconfig phone/scripts/sync-sim/tsconfig.json phone/scripts/sync-sim/run.ts
import { createHash } from 'node:crypto';
import { disk, failWrite } from './fake-fs';
import { sync } from '@/lib/provider-sync';
import { renameNote } from '@/lib/wiki-links';
import { parseConflictCopy } from '@noteriv/core/conflict-copy';

const blobSha = (c: string) => createHash('sha1').update(`blob ${Buffer.byteLength(c)}\0`).update(c).digest('hex');
const b64 = (c: string) => Buffer.from(c).toString('base64').replace(/(.{60})/g, '$1\n');

/** One remote repository: path -> text. */
class Repo {
  files = new Map<string, string>();
  empty = false;
  truncated = false;
  failBlob = new Set<string>();
  calls: string[] = [];
  /** Gitea: tree entries per page (0 = one page). */
  pageSize = 0;
  /** GitLab: last commit id per path. */
  commits = new Map<string, string>();
  /** Runs right before the next write or delete lands, as an edit made elsewhere in between. */
  meanwhile: (() => void) | null = null;
  set(path: string, content: string) {
    this.files.set(path, content);
    this.commits.set(path, `c${Math.random().toString(36).slice(2)}`);
  }
}

const github = new Repo();
const gitea = new Repo();
const gitlab = new Repo();

function gitlabRoute(u: URL, method: string, body: Record<string, string>): Response {
  const repo = gitlab;
  const prefix = '/api/v4/projects/me%2Fnotes';
  const rest = u.pathname.slice(prefix.length);
  if (rest === '') return json({ default_branch: 'main' });
  if (rest === '/repository/tree') {
    const page = Number(u.searchParams.get('page') ?? 1);
    const all = [...repo.files.keys()].map((p) => ({ path: p, type: 'blob', id: blobSha(repo.files.get(p)!) }));
    return json(all.slice((page - 1) * 100, page * 100));
  }
  const m = rest.match(/^\/repository\/files\/([^/]+)(\/raw)?$/);
  if (!m) return json({ message: `unexpected ${method} ${rest}` }, 500);
  const path = decodeURIComponent(m[1]);
  const current = repo.files.get(path);
  if (m[2]) return current === undefined ? json({}, 404) : new Response(current);
  if (method === 'HEAD') {
    if (current === undefined) return new Response(null, { status: 404 });
    return new Response(null, { headers: { 'x-gitlab-blob-id': blobSha(current), 'x-gitlab-last-commit-id': repo.commits.get(path)! } });
  }
  repo.meanwhile?.();
  repo.meanwhile = null;
  const after = repo.files.get(path);
  if ((method === 'PUT' || method === 'DELETE') && body.last_commit_id && body.last_commit_id !== repo.commits.get(path)) {
    return json({ message: 'You are attempting to update a file that has changed since you started editing it.' }, 400);
  }
  if (method === 'DELETE') {
    if (after === undefined) return json({}, 404);
    repo.files.delete(path);
    return new Response(null, { status: 204 });
  }
  if (method === 'POST' && after !== undefined) return json({ message: 'exists' }, 400);
  if (method === 'PUT' && after === undefined) return json({ message: 'missing' }, 400);
  repo.set(path, body.content);
  return json({ file_path: path });
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

(globalThis as { fetch: unknown }).fetch = async (url: string, opts: RequestInit = {}) => {
  const u = new URL(url);
  const method = opts.method ?? 'GET';
  const body = opts.body ? JSON.parse(String(opts.body)) : {};
  if (u.host === 'gitlab.example.com') {
    gitlab.calls.push(`${method} ${u.pathname}`);
    return gitlabRoute(u, method, body);
  }
  const repo = u.host === 'api.github.com' ? github : gitea;
  repo.calls.push(`${method} ${u.pathname}`);
  const path = u.pathname.replace('/repos/me/notes', '').replace('/api/v1', '');
  if (path === '') return json({ default_branch: 'main' });
  if (path.startsWith('/git/trees/')) {
    if (repo.empty && repo.files.size === 0) return json({ message: 'Git Repository is empty.' }, 409);
    const tree = [...repo.files].map(([p, c]) => ({ path: p, type: 'blob', sha: blobSha(c) }));
    if (repo.pageSize) {
      const page = Number(u.searchParams.get('page') ?? 1);
      return json({ truncated: page * repo.pageSize < tree.length, tree: tree.slice((page - 1) * repo.pageSize, page * repo.pageSize) });
    }
    return json({ truncated: repo.truncated, tree });
  }
  if (path.startsWith('/git/blobs/')) {
    const sha = path.split('/').pop()!;
    if (repo.failBlob.delete(sha)) return json({ message: 'rate limited' }, 500);
    const c = [...repo.files.values()].find((v) => blobSha(v) === sha);
    return c === undefined ? json({}, 404) : json({ content: b64(c) });
  }
  if (path.startsWith('/contents/')) {
    const p = decodeURIComponent(path.slice('/contents/'.length));
    const current = repo.files.get(p);
    if (method === 'GET') return current === undefined ? json({}, 404) : json({ content: b64(current), sha: blobSha(current) });
    if (method === 'DELETE') {
      if (current === undefined || body.sha !== blobSha(current)) return json({ message: 'sha mismatch' }, 409);
      repo.files.delete(p);
      return json({});
    }
    if (method === 'PUT' && p === failUpload) return json({ message: 'network' }, 502);
    // GitHub: PUT creates or updates; Gitea: POST creates, PUT updates. An update must name the current sha.
    if (current !== undefined && body.sha !== blobSha(current)) return json({ message: 'sha mismatch' }, 409);
    if (current === undefined && body.sha) return json({ message: 'no such file' }, 422);
    const c = Buffer.from(body.content, 'base64').toString('utf8');
    repo.files.set(p, c);
    return json({ content: { sha: blobSha(c) } });
  }
  return json({ message: `unexpected ${method} ${path}` }, 500);
};

const V = 'file:///vault';
const at = (rel: string) => `${V}/${rel.split('/').map(encodeURIComponent).join('/')}`;
let fails = 0;
/** A path whose upload the GitHub stand-in refuses once (a network error). */
let failUpload: string | null = null;
const check = (name: string, ok: boolean, detail: unknown = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + JSON.stringify(detail)}`);
  if (!ok) fails++;
};
const notesOnDisk = () => [...disk.keys()].filter((k) => k.endsWith('.md')).length;
const copiesOf = (rel: string) =>
  [...disk.keys()]
    .map((k) => decodeURIComponent(k.slice(V.length + 1)))
    .filter((p) => parseConflictCopy(p)?.originalPath === rel)
    .map((p) => disk.get(at(p)));

async function run(repo: Repo, remote: string, hint?: 'gitea' | 'gitlab') {
  repo.calls = [];
  const r = await sync(V, 't', remote, undefined, hint);
  const downloads = repo.calls.filter((c) => c.includes('/git/blobs/') || (c.startsWith('GET') && (c.includes('/contents/') || c.endsWith('/raw')))).length;
  const writes = repo.calls.filter((c) => /^(PUT|POST) /.test(c)).length;
  const deletes = repo.calls.filter((c) => c.startsWith('DELETE')).length;
  return { r, n: repo.calls.length, downloads, writes, deletes };
}

async function githubScenarios() {
  const R = 'https://github.com/me/notes.git';
  const repo = github.files;
  const go = () => run(github, R);
  for (let i = 0; i < 300; i++) repo.set(`notes/n${i}.md`, `# Note ${i}\nTiếng Việt ${i}`);
  repo.set('big.md', 'x'.repeat(1_200_000));
  repo.set('a b #1.md', 'special');
  disk.set(at('local.md'), 'made on phone');

  let s = await go();
  check('first sync pulls every remote note', s.r.pulled === 302 && s.r.errors.length === 0, s.r);
  check('first sync pushes the phone note', s.r.pushed === 1 && repo.get('local.md') === 'made on phone', s.r);
  check('utf-8 and >1 MB notes intact', disk.get(at('notes/n7.md')) === '# Note 7\nTiếng Việt 7' && disk.get(at('big.md'))?.length === 1_200_000);
  check('special path round-trips', disk.get(at('a b #1.md')) === 'special');
  s = await go();
  check(`idle sync: no downloads or writes (${s.n} API calls)`, s.downloads === 0 && s.writes === 0 && s.r.pulled === 0 && s.r.pushed === 0, s);

  repo.set('notes/n3.md', 'changed on web');
  s = await go();
  check('remote edit: one download, applied', s.downloads === 1 && disk.get(at('notes/n3.md')) === 'changed on web' && s.writes === 0, s);
  disk.set(at('notes/n4.md'), 'changed on phone');
  s = await go();
  check('local edit: one upload, no downloads', s.writes === 1 && s.downloads === 0 && repo.get('notes/n4.md') === 'changed on phone', s);

  repo.set('notes/n5.md', 'web side');
  disk.set(at('notes/n5.md'), 'phone side');
  s = await go();
  check('both edited: phone version uploaded, web version kept as a copy the web app recognises',
    copiesOf('notes/n5.md').join() === 'web side' && repo.get('notes/n5.md') === 'phone side', { copies: copiesOf('notes/n5.md'), s: s.r });
  repo.set('notes/n5.md', 'web side 2');
  disk.set(at('notes/n5.md'), 'phone side 2');
  s = await go();
  check('second conflict: both web versions kept', copiesOf('notes/n5.md').sort().join() === 'web side,web side 2' && repo.get('notes/n5.md') === 'phone side 2', copiesOf('notes/n5.md'));

  repo.delete('notes/n6.md');
  s = await go();
  check('remote delete of an unedited note applies here', !disk.has(at('notes/n6.md')), s);
  s = await go();
  check('steady again', s.downloads === 0 && s.writes === 0 && s.deletes === 0, s);

  // Deletions and renames made on the phone.
  disk.delete(at('notes/n8.md'));
  s = await go();
  check('phone delete: deleted on the remote, not pulled back', !repo.has('notes/n8.md') && !disk.has(at('notes/n8.md')) && s.deletes === 1, s);
  s = await go();
  check('phone delete: stays deleted', !disk.has(at('notes/n8.md')) && s.deletes === 0 && s.writes === 0, s);

  disk.delete(at('notes/n12.md'));
  repo.set('notes/n12.md', 'edited on web meanwhile');
  s = await go();
  check('phone delete vs web edit: the edit wins and comes back', repo.get('notes/n12.md') === 'edited on web meanwhile' && disk.get(at('notes/n12.md')) === 'edited on web meanwhile', s.r);

  disk.set(at('notes/linker.md'), 'see [[n13]] and [[notes/n13#Top|top]]');
  await go();
  const renamed = await renameNote(V, at('notes/n13.md'), 'Thirteen.md');
  check('rename on phone rewrites links', renamed.uri !== null && renamed.updated === 1 && disk.get(at('notes/linker.md')) === 'see [[Thirteen]] and [[notes/Thirteen#Top|top]]', { renamed, linker: disk.get(at('notes/linker.md')) });
  s = await go();
  check('rename on phone: old path deleted, new path and link fix uploaded',
    !repo.has('notes/n13.md') && repo.get('notes/Thirteen.md') === '# Note 13\nTiếng Việt 13' && repo.get('notes/linker.md')?.includes('[[Thirteen]]') === true, s.r);
  s = await go();
  check('rename on phone: steady after', s.writes === 0 && s.deletes === 0 && !disk.has(at('notes/n13.md')), s);

  // A folder renamed here: every note in it moves, links to them follow.
  disk.set(at('proj/a.md'), 'A');
  disk.set(at('proj/sub/b.md'), 'B links [[proj/a]]');
  disk.set(at('index.md'), 'see [[proj/sub/b]]');
  await go();
  const folder = await renameNote(V, at('proj') + '/', 'Projects', true);
  check('folder rename on phone rewrites links to the notes in it',
    folder.moves.length === 2 && disk.get(at('index.md')) === 'see [[Projects/sub/b]]' && disk.get(at('Projects/sub/b.md')) === 'B links [[Projects/a]]',
    { folder, index: disk.get(at('index.md')), b: disk.get(at('Projects/sub/b.md')) });
  s = await go();
  check('folder rename on phone: remote follows',
    !repo.has('proj/a.md') && !repo.has('proj/sub/b.md') && repo.get('Projects/a.md') === 'A' && repo.get('index.md') === 'see [[Projects/sub/b]]', s.r);

  // A rename whose new note fails to upload must not delete the old one on the remote.
  await renameNote(V, at('notes/n14.md'), 'Fourteen.md');
  failUpload = 'notes/Fourteen.md';
  s = await go();
  check('rename with failed upload: old note kept on the remote', repo.get('notes/n14.md') === '# Note 14\nTiếng Việt 14' && !repo.has('notes/Fourteen.md'), s.r);
  failUpload = null;
  s = await go();
  check('rename with failed upload: next sync completes it', !repo.has('notes/n14.md') && repo.has('notes/Fourteen.md') && s.r.errors.length === 0, s.r);

  // Pull failures must not let push overwrite remote edits.
  repo.set('notes/n10.md', 'desktop edit');
  github.failBlob.add(blobSha('desktop edit'));
  s = await go();
  check('failed download: remote edit not overwritten', repo.get('notes/n10.md') === 'desktop edit' && s.r.errors.length === 1, s.r);
  s = await go();
  check('failed download: next sync takes it', disk.get(at('notes/n10.md')) === 'desktop edit' && s.writes === 0, s);
  repo.set('notes/n11.md', 'remote new text');
  failWrite.add(at('notes/n11.md'));
  s = await go();
  check('failed write: remote kept, error reported', repo.get('notes/n11.md') === 'remote new text' && s.r.errors.length === 1, s.r);
  failWrite.clear();
  s = await go();
  check('failed write: next sync takes it', disk.get(at('notes/n11.md')) === 'remote new text', s.r);

  github.truncated = true;
  const before = disk.size;
  s = await go();
  check('truncated tree: sync stops, nothing deleted', disk.size === before && s.r.errors.length > 0 && s.writes === 0 && s.deletes === 0, s.r);
  github.truncated = false;

  disk.set(at('both.md'), 'phone copy');
  repo.set('both.md', 'remote copy');
  s = await go();
  check('no shared history: remote kept as a copy, phone uploaded', copiesOf('both.md').join() === 'remote copy' && repo.get('both.md') === 'phone copy', s.r);

  // Every note deleted elsewhere (the repository keeps commits): deleted here too.
  const savedRepo = new Map(repo);
  const savedDisk = new Map(disk);
  repo.clear();
  repo.set('README.txt', 'readme');
  s = await go();
  check('all notes deleted remotely: deleted here, not re-uploaded', notesOnDisk() === 0 && repo.size === 1, { left: notesOnDisk(), s: s.r });
  repo.clear();
  for (const [k, v] of savedRepo) repo.set(k, v);
  disk.clear();
  for (const [k, v] of savedDisk) disk.set(k, v);
  s = await go();
  check('restored: steady', s.writes === 0 && s.deletes === 0 && s.r.errors.length === 0, s.r);

  // The repository is recreated empty: nothing here is deleted, everything is uploaded.
  const notes = notesOnDisk();
  repo.clear();
  github.empty = true;
  s = await go();
  check('recreated empty repo: nothing deleted here, all uploaded', notesOnDisk() === notes && repo.size === notes, { notes, repo: repo.size, s: s.r });
  github.empty = false;
}

async function giteaScenarios() {
  disk.clear();
  const R = 'https://git.example.com/me/notes';
  const repo = gitea.files;
  const go = () => run(gitea, R, 'gitea');
  for (let i = 0; i < 50; i++) repo.set(`g/n${i}.md`, `gitea ${i}`);
  disk.set(at('mine.md'), 'phone');

  let s = await go();
  check('gitea: first sync', s.r.pulled === 50 && repo.get('mine.md') === 'phone' && s.r.errors.length === 0, s.r);
  s = await go();
  check('gitea: second sync reads only the note it uploaded', s.downloads <= 1 && s.writes === 0, s);
  s = await go();
  check(`gitea: idle sync downloads nothing (${s.n} API calls)`, s.downloads === 0 && s.writes === 0, s);
  repo.set('g/n1.md', 'edited on web');
  s = await go();
  check('gitea: remote edit, one download', s.downloads === 1 && disk.get(at('g/n1.md')) === 'edited on web', s);
  disk.set(at('g/n2.md'), 'edited on phone');
  s = await go();
  check('gitea: local edit uploaded', repo.get('g/n2.md') === 'edited on phone' && s.writes === 1, s);
  repo.set('g/n3.md', 'web');
  disk.set(at('g/n3.md'), 'phone');
  s = await go();
  check('gitea: both edited, both kept', copiesOf('g/n3.md').join() === 'web' && repo.get('g/n3.md') === 'phone', s.r);
  disk.delete(at('g/n4.md'));
  s = await go();
  check('gitea: phone delete reaches the remote', !repo.has('g/n4.md') && s.deletes === 1, s);
  s = await go();
  check('gitea: stays deleted', !disk.has(at('g/n4.md')) && s.writes === 0 && s.deletes === 0, s);
  repo.delete('g/n5.md');
  s = await go();
  check('gitea: remote delete applies here', !disk.has(at('g/n5.md')), s.r);
  gitea.pageSize = 7;
  const before = notesOnDisk();
  s = await go();
  check('gitea: a tree sent in pages is read whole (nothing deleted here)', notesOnDisk() === before && s.r.errors.length === 0 && s.writes === 0 && s.deletes === 0, { before, now: notesOnDisk(), s: s.r });
  gitea.pageSize = 0;
}

async function gitlabScenarios() {
  disk.clear();
  const R = 'https://gitlab.example.com/me/notes';
  const go = () => run(gitlab, R, 'gitlab');
  for (let i = 0; i < 30; i++) gitlab.set(`l/n${i}.md`, `gitlab ${i}`);
  disk.set(at('mine.md'), 'phone');
  let s = await go();
  check('gitlab: first sync', s.r.pulled === 30 && gitlab.files.get('mine.md') === 'phone' && s.r.errors.length === 0, s.r);
  await go();
  s = await go();
  check(`gitlab: idle sync downloads nothing (${s.n} API calls)`, s.downloads === 0 && s.writes === 0, s);
  disk.set(at('l/n1.md'), 'phone edit');
  s = await go();
  check('gitlab: local edit uploaded', gitlab.files.get('l/n1.md') === 'phone edit' && s.r.errors.length === 0, s.r);
  // Edited elsewhere between the listing and the write: GitLab refuses, nothing is lost, the next sync merges.
  disk.set(at('l/n2.md'), 'phone edit 2');
  gitlab.meanwhile = () => gitlab.set('l/n2.md', 'web edit in between');
  s = await go();
  check('gitlab: write racing an edit elsewhere is refused', gitlab.files.get('l/n2.md') === 'web edit in between' && s.r.errors.length === 1, s.r);
  s = await go();
  check('gitlab: next sync keeps both', copiesOf('l/n2.md').join() === 'web edit in between' && gitlab.files.get('l/n2.md') === 'phone edit 2', { copies: copiesOf('l/n2.md'), s: s.r });
  disk.delete(at('l/n3.md'));
  gitlab.meanwhile = () => gitlab.set('l/n3.md', 'web edit before delete');
  s = await go();
  check('gitlab: delete racing an edit elsewhere is refused', gitlab.files.get('l/n3.md') === 'web edit before delete', s.r);
  s = await go();
  check('gitlab: and the edit comes back here', disk.get(at('l/n3.md')) === 'web edit before delete', s.r);
  disk.delete(at('l/n4.md'));
  s = await go();
  check('gitlab: phone delete reaches the remote', !gitlab.files.has('l/n4.md'), s.r);
}

(async () => {
  await githubScenarios();
  await giteaScenarios();
  await gitlabScenarios();
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();

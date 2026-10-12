# Kế hoạch triển khai bản Web cho Noteriv

## Bối cảnh

Noteriv hiện có 3 nền tảng độc lập, không dùng workspace chung (không pnpm/turbo), nằm cạnh nhau tại root: `desktop/` (Tauri 2 + Next.js 16, note = file markdown trên đĩa, Rust backend ở `desktop/src-tauri/src/` xử lý filesystem/git/sync/auth), `phone/` (Expo/React Native, hoàn toàn tách biệt code với desktop, sync qua REST API git provider), `mcp/` (MCP server Node.js qua stdio). Toàn bộ UI/rendering/business-logic ở `desktop/src/` (components, markdown renderer, plugin sandbox, dataview, flashcards, graph/calendar/board view, theme system) là JS/TS/CSS/SVG/DOM thuần chạy trong webview — ranh giới native/web rất rõ: mọi logic OS-dependent (filesystem tự do, shell ra `git` binary, token lưu đĩa, HTTP server local cho Web Clipper, file watcher, auto-updater, window chrome) nằm trong `desktop/src-tauri/src/`, giao tiếp với frontend qua đúng 1 lớp `window.electronAPI` (định nghĩa đầy đủ ở `desktop/src/types/electron.d.ts`, đã xác minh trực tiếp — 50+ method).

Người dùng muốn có thêm một **bản web**. Sau khi khảo sát, người dùng đã chốt 3 quyết định kiến trúc quan trọng:

1. **Kiến trúc**: Web app **server-backed, multi-user thật sự** — vault lưu trên server, truy cập từ mọi nơi không cần mang theo máy có vault local. Đây là lựa chọn effort lớn nhất trong các phương án (so với phương án local-first qua File System Access API, hoặc mở rộng Expo Web) vì dự án hiện **chưa có bất kỳ server-side storage/account system nào** — phải xây from scratch.
2. **Phạm vi**: Feature parity **gần đầy đủ** với desktop — editor, markdown rendering, wikilinks/backlinks, plugin sandbox, graph view, PDF export, calendar/board view, flashcards, theme/CSS snippets, và **collaboration realtime**.
3. **Sync**: Hỗ trợ **cả hai** — Git provider REST API (GitHub/GitLab/Gitea/Forgejo, theo pattern đã có ở `phone/lib/github-sync.ts`) và WebDAV (theo pattern đã có ở `desktop/src-tauri/src/commands_sync.rs`).

Kế hoạch dưới đây thiết kế kiến trúc, data model, API, chiến lược tái dùng code, và các giai đoạn triển khai cụ thể cho lựa chọn này.

**Lưu ý quan trọng về rủi ro** (đọc kỹ trước khi duyệt plan): đây là một **sản phẩm server mới xây from scratch**, không phải một bản "port" nhỏ. Hai phần khó nhất — plugin sandbox đa người dùng (mục 7) và sync engine chạy server-side (mục 6) — mỗi phần có độ phức tạp tương đương cả 6 phase còn lại gộp lại, vì desktop/mobile chưa từng phải giải quyết các vấn đề bảo mật multi-tenant này. Dự án sẽ cần hạ tầng hoàn toàn mới (server hosting, Postgres, Redis, S3-compatible storage, domain/SSL, KMS cho mã hoá credential) và **chi phí vận hành hàng tháng liên tục** — khác với desktop/mobile hiện tại không tốn chi phí server. Coi đây là nỗ lực nhiều quý cho một nhóm nhỏ, không phải một dự án cuối tuần.

---

## 1. Tech stack đề xuất

**Frontend**: `web/` là một project Next.js 16 + React 19 + TypeScript + Tailwind 4 **độc lập mới**, không phải workspace chung với desktop (đúng theo pattern hiện tại của dự án — các project độc lập cạnh nhau). **Port (copy + điều chỉnh)**, không symlink, phần lớn `desktop/src/components/*.tsx` và `desktop/src/lib/*.ts` thuần DOM/JS/CSS (xem mục 3). Next.js chạy ở server mode thật (không `output: "export"` tĩnh như desktop) vì cần SSR cho trang có auth. Editor: CodeMirror 6 — port nguyên vẹn vì là thư viện web thuần, không có ràng buộc Tauri.

**Backend**: Node.js + TypeScript, framework **Fastify** (nhẹ, phù hợp team nhỏ hơn NestJS). Giữ **binary `git` thật** làm engine thực thi sync (port logic từ `commands_git.rs`) chạy server-side trong container — vì Rust code đã giải quyết sẵn các vấn đề khó (rebase recovery, detached-HEAD guard, GIT_ASKPASS) mà viết lại thuần JS theo kiểu `phone/lib/github-sync.ts` (phù hợp 1 user mobile, không phù hợp backend multi-tenant nhiều repo) sẽ phải giải lại từ đầu.

**Database**: **PostgreSQL** cho mọi metadata quan hệ (user, workspace, vault, folder, note metadata, sync-connection, plugin, theme, session). **Nội dung note**: lưu markdown thô trong cột `text` của Postgres (không object storage) — vì note nhỏ, cần search/collab/consistency transactional. **Attachment lớn** (ảnh, audio, PDF, canvas/drawing data) → **S3-compatible object storage** (S3/R2/MinIO). Full-text search: Postgres `tsvector` + GIN index ban đầu, có đường nâng cấp lên Meilisearch/Typesense sau.

**Auth**: **JWT tự xây** (access + refresh token, httpOnly cookie) — không dùng Clerk/NextAuth để giữ toàn quyền sở hữu dữ liệu, đúng tinh thần "dữ liệu của bạn vẫn là của bạn" mà README gốc nêu. **GitHub OAuth tách biệt rõ hai mục đích, không gộp chung**: (1) đăng nhập — scope `read:user`, phiên ngắn hạn; (2) sync credential — OAuth App riêng hoặc PAT do user nhập, scope `repo`, chỉ yêu cầu khi user chủ động kết nối sync target, lưu mã hoá server-side — mirror đúng cách `desktop/src-tauri/src/auth.rs` tách biệt sync-credential khỏi identity (desktop chưa có khái niệm login nên đây là phần mới hoàn toàn cho web).

---

## 2. Kiến trúc tổng thể

```
Browser (web/, Next.js SSR)
  ├─ CodeMirror editor, webApi.ts (implement cùng interface ElectronAPI, gọi REST thay vì invoke())
  └─ Plugin host (iframe sandbox / Web Worker)
        │ HTTPS (REST + WebSocket)
Backend API (Fastify)
  ├─ Auth, Notes/Folders CRUD + FTS, Search, Plugin API, Sync API, Settings/Theme/Snippet API
        │ enqueue job                         │ WS upgrade
  Sync Worker (BullMQ/Redis)         Realtime Collab Server (y-websocket)
  ├─ Git: shell ra git binary thật  ├─ 1 Y.Doc per noteId, awareness/presence
  └─ WebDAV: PROPFIND/PUT/GET
        │
  PostgreSQL (users, vaults, notes, sync_connections, plugins...) + S3/R2 (attachments)
```

**Luồng dữ liệu chính**:
- **Tạo/đọc note**: Browser → `POST/GET /api/v1/vaults/:id/notes` → đọc/ghi 1 row Postgres (không cần walk filesystem như desktop's `readDir`/`readFile`).
- **Search**: `GET /api/v1/vaults/:id/search?q=...` → Postgres `tsvector` ranked query, thay thế `searchInFiles`/`listAllFiles` (`electron.d.ts:186-203`) — trên server bắt buộc phải index, không thể walk disk mỗi lần vì vault có thể lớn và chia sẻ nhiều người.
- **Sync với git repo ngoài**: User kết nối repo (OAuth/PAT) → credential mã hoá lưu `sync_connections` → trigger → **Sync Worker** giữ 1 working-copy server-side mỗi `sync_connection`, chạy `git fetch/pull --rebase/push` thật — port gần nguyên vẹn logic recovery từ `commands_git.rs:337-414` (stash-guard, rebase-abort, detached-HEAD guard, GIT_ASKPASS) — rồi diff working-copy với Postgres để đồng bộ hai chiều.
- **WebDAV sync**: cùng worker, port logic PROPFIND/mtime-diff từ `commands_sync.rs:122-177, 261-367, 461-556` sang Node/axios + `fast-xml-parser`.
- **Collaboration realtime**: 2 browser cùng mở 1 note → mỗi bên mở WebSocket tới collab server, join room `note:{noteId}` → Yjs CRDT broadcast qua server relay (không còn P2P WebRTC như desktop vì web cần hỗ trợ user sau NAT/firewall không thể discover P2P) → snapshot nội dung text được debounce-flush lại vào cột `notes.content` để giữ Postgres là nguồn sự thật cho search/sync/non-realtime read.

---

## 3. Chiến lược tái dùng code từ `desktop/src/`

**Port gần nguyên vẹn** (đã xác minh là JS/TS/CSS/DOM/SVG thuần, không gọi Tauri): toàn bộ `desktop/src/components/markdown/*` (wikilinks, embeds, KaTeX, mermaid, callouts); `markdown-to-html.ts`, `pdf-export.ts` (đã xác minh chỉ dùng `document.createElement("iframe")` + `window.print()`, không gọi API Tauri nào); `collab.ts` (chỉ cần đổi transport `WebrtcProvider` → `WebsocketProvider`, phần còn lại — Y.Doc, awareness, room logic — giữ nguyên); `dataview.ts`, `flashcard-utils.ts` (thuật toán SM-2), `wiki-link-utils.ts`, `tag-utils.ts`, `frontmatter-utils.ts`, `template-utils.ts`, `toc-utils.ts`, `board-utils.ts`, `calendar-utils.ts`, `canvas-utils.ts`, `drawing-utils.ts`, `theme-utils.ts`, `css-snippets.ts`, `vim-mode.ts`, `hotkeys.ts`; và hầu hết component hiển thị thuần (`GraphView.tsx`, `BoardView.tsx`, `CalendarView.tsx`, `FlashcardReview.tsx`, `DataviewBlock.tsx`, `Canvas.tsx`, `DrawingEditor.tsx`, `OutlinePanel.tsx`, `TagPane.tsx`, `CommandPalette.tsx`).

**Cần lớp adapter thay thế** (`web/src/lib/webApi.ts`): mọi nơi gọi `window.electronAPI.*` (đã đọc trực tiếp `electron.d.ts`, 50+ method — file CRUD, vault management, GitHub auth, git operations, settings, sync providers folder/webdav, search/file listing, window controls, updater, menu events) phải được viết lại gọi REST/WebSocket. **Thiết kế: `webApi.ts` implement đúng cùng interface `ElectronAPI`**, để mọi component/lib copy từ desktop gọi `window.electronAPI.readFile(...)` v.v. **không cần sửa call site** — chỉ swap global từ Tauri shim (`desktop/src-tauri/src/shim.rs`) sang singleton gọi `fetch()`.

Chi tiết mapping quan trọng:
- `readFile/writeFile/readDir/createFile/deleteFile/...` → `GET/PUT/POST/DELETE /api/v1/vaults/:id/notes(folders)/:path`, đổi mô hình "path tuỳ ý trên đĩa" → "path trong vault thuộc user đã auth".
- `getConfig/getVaults/createVault/...` → `/api/v1/vaults` CRUD scoped theo `userId`/`workspaceId`, thay cho `store.rs`'s JSON config local.
- `authSaveToken/authHasToken/...` → `/api/v1/vaults/:id/sync-connections/*`, credential mã hoá server-side, **không bao giờ trả plaintext về client** — khác biệt hành vi lớn nhất so với desktop's disk storage.
- `gitIsInstalled/gitSync/gitPull/.../gitShowFile` → `/api/v1/vaults/:id/sync/*`, enqueue/poll job server-side (không thể chạy git trong browser).
- `loadSettings/saveSettings` → `/api/v1/users/me/settings` + `/api/v1/vaults/:id/settings`.
- `syncProviderSync` (folder/webdav) → `/api/v1/vaults/:id/sync/webdav/*`; **provider "folder"** (sync vào folder local kiểu Google Drive mount) **không có tương đương server-side và nên bỏ hẳn** — cần nói rõ với người dùng chuyển từ desktop.
- `searchInFiles/listAllFiles/getFileStats` → `/api/v1/vaults/:id/search`, `/files`, backed bởi Postgres.
- `onVaultChanged`/`onClipperClipped`/`onMenuSave` (event-based) → **WebSocket channel** `vault:{id}:changed`, thay cho Tauri event bus (`watcher.rs` + `shim.rs:34-42`).
- `windowMinimize/windowMaximize/.../updaterCheck/...` → **bỏ hẳn**, stub no-op trong `webApi.ts` để component không crash.
- Web Clipper (`clipperGetPort`, server local port 27123 ở `clipper.rs`) → đổi thành endpoint `POST /api/v1/clip` có auth token, thay vì gọi `localhost:27123` — workstream riêng, nhỏ, không nằm trong 7 phase chính dưới đây.

**Cần data-source adapter mới** (không chỉ đổi transport): `dataview.ts` và wiki-link/backlink resolver hiện giả định có thể enumerate toàn bộ vault từ in-memory tree build lúc startup bằng walk filesystem. Trên web, "vault index" phải fetch từ `GET /api/v1/vaults/:id/index` (metadata + tag + frontmatter mọi note) rồi cache client-side, sau đó logic query/resolution chạy y nguyên trên index đã cache.

---

## 4. Data model (PostgreSQL)

Các bảng chính: `users`, `oauth_identities` (login-only, tách biệt sync credential), `workspaces` + `workspace_members` (role owner/editor/viewer — mỗi user có 1 workspace cá nhân tự tạo cho v1), `vaults`, `folders`, `notes` (content text + `content_tsv` tsvector generated + frontmatter jsonb), `note_versions` (snapshot, tương đương `file-recovery.ts` của desktop), `attachments` (storage_key trỏ S3/R2), `tags`/`note_tags`, `backlinks` (precompute, refresh khi save), `sync_connections` (provider_type github/gitlab/gitea/forgejo/webdav, `credentials_encrypted` bytea AES-256-GCM, direction push/pull/both, auto_sync), `sync_jobs` (audit trail), `plugins` (per-vault, main_js_storage_key, permissions), `themes`/`css_snippets`, `collab_sessions` (room registry, có thể để Redis thay Postgres).

Khác biệt chính so với model desktop (`Vault` struct ở `store.rs`): `gitRemote`/`gitBranch`/`autoSync` tách khỏi vault thành bảng `sync_connections` riêng vì web hỗ trợ **nhiều sync target đồng thời/vault** (vd GitHub + WebDAV backup cùng lúc) — điều desktop's single-remote model không cần.

---

## 5. Thiết kế API backend

**REST** (không GraphQL) — khớp sát shape "method-per-operation" của `ElectronAPI` hiện tại, giảm diff khi port component, và giữ job-polling của sync worker đơn giản. Versioned `/api/v1`.

Nhóm endpoint chính: Auth (`register/login/refresh/logout/oauth/github/*`); Vaults/Workspaces (CRUD + `GET /vaults/:id/index` cho client cache); Notes/Folders (CRUD, rename, versions, backlinks); Search/Tags; Attachments (presigned upload); Settings/Themes/Snippets/Plugins (CRUD + install/enable); Sync (`sync-connections` CRUD, `/test`, `/trigger`, `/status`, `/log`); Realtime qua WS riêng (`/ws/vaults/:id` cho change notification, `/ws/collab/notes/:id` cho Yjs protocol). Mọi route sau JWT middleware; route theo vault kiểm thêm role qua `workspace_members`.

---

## 6. Sync engine (Git REST + WebDAV)

**Bắt buộc chạy server-side, không bao giờ client-side** — nếu chạy client-side sẽ phải gửi PAT/password WebDAV của user về browser mỗi lần tải trang, rủi ro lộ secret cao hơn hẳn so với mô hình local-only hiện tại mà `auth.rs`/`commands_git.rs` đã cẩn thận tránh.

- Credential mã hoá at-rest trong `sync_connections.credentials_encrypted` (AES-256-GCM, envelope encryption qua KMS), **không bao giờ trả về client** trong bất kỳ response nào.
- **Sync Worker** (BullMQ + Redis, hoặc job table Postgres đơn giản cho v1) chạy process riêng: nhánh Git giữ 1 working-copy server-local mỗi `sync_connection`, port chính xác logic recovery từ `commands_git.rs` — detect rebase-in-progress và abort trước khi commit (dòng 194-204), stash-guard trước pull (dòng 367-390), từ chối push từ detached HEAD (dòng 395-399), dùng `GIT_ASKPASS` env-var injection thay vì nhúng token vào URL process args (dòng 76-100) để tránh lộ token qua `ps` trên host worker chia sẻ. Nhánh WebDAV port logic diff theo mtime từ `commands_sync.rs` (dòng 122-177, 461-556) sang Node/axios + `fast-xml-parser` cho PROPFIND XML (thay `quick_xml` của Rust).
- Mỗi lần sync = 1 row `sync_jobs` để audit; conflict (rebase fail, 409 content divergence) hiện `status: 'conflict'` kèm message rõ ràng, không tự động retry vô hạn — mirror đúng hành vi "Sync paused: ... needs manual attention" ở `commands_git.rs:377-389`, UI nên hiện banner hành động thay vì tự lặp.
- **Tần suất**: desktop auto-sync mỗi 5 giây — nhưng polling liên tục mỗi 5s cho nhiều user sẽ không scale và dễ chạm rate-limit API của GitHub. v1 nên mặc định **"Sync now" thủ công + webhook-trigger** (GitHub webhook on push → enqueue job), poll định kỳ dài hơn (2-5 phút) là tuỳ chọn opt-in.

---

## 7. Plugin sandbox trên web

Cơ chế `new Function()` chạy trực tiếp trong webview chính của desktop (`plugin-api.ts:293-369`) chấp nhận được vì single-user, local-only. Trên web multi-tenant, đây là **vector XSS same-origin**: plugin độc hại/bị compromise chạy `new Function()` trong trang chính có thể đọc JWT cookie/localStorage và exfiltrate session của user khác nếu plugin được share/lên marketplace.

**Đề xuất: sandbox bằng `<iframe>` sandboxed + `postMessage` RPC**, kế thừa đúng pattern mobile đã dùng (WebView sandbox riêng cho code-block plugin, xác nhận ở `phone/lib/plugins.ts` + `MarkdownPreview.tsx`):
- Serve `main.js` của mỗi plugin từ **origin riêng, không cookie/credential** (subdomain riêng hoặc `sandbox` attribute với `allow-scripts` nhưng KHÔNG `allow-same-origin`) — plugin độc hại không đọc được cookie/localStorage của trang chính, không có credential nào sẵn.
- Mọi gọi `api.vault.read/write`, `api.editor.*` proxy qua `postMessage` tới parent, parent kiểm permission khai báo trong manifest (field mới `permissions: ["vault:read", "editor:read"]`) trước khi thực hiện API call thật và trả kết quả lại.
- UI injection (status bar, sidebar panel, settings tab) không thể chèn DOM tuỳ ý vào parent — plugin gửi mô tả UI khai báo (text/icon/template an toàn) cho host render bằng component React tin cậy, hoặc panel `render()` chạy trong iframe con nhỏ hơn.
- **Web Worker** cho plugin xử lý thuần text-in/text-out (code-block processor như Dataview, chess notation) — không cần DOM, rẻ hơn iframe.
- Flow install community plugin port với thêm **cổng review/kiểm duyệt server-side** trước khi plugin được list "verified" trên marketplace web, vì web cho phép install bởi bất kỳ user nào (khác desktop — hành động cài đặt có chủ ý của chính user trên máy họ).

---

## 8. Realtime collaboration

- Triển khai collab server riêng dựa trên **`y-websocket`** (pattern tham chiếu phổ biến, customize phần auth: từ chối WS upgrade nếu JWT không có quyền trên `noteId` đó).
- **Room = `note:{noteId}`**, 1 `Y.Doc`/note chứa 1 `Y.Text` cho nội dung — khớp model hiện tại ở `collab.ts:80` (`doc.getText("content")`). Trước khi accept join, collab server gọi API backend xác thực quyền truy cập vault của note đó.
- **Persistence bridge**: debounce 2-5s, flush `Y.Text.toString()` về cột `notes.content` qua internal API — giữ Postgres eventually consistent để search/sync/non-collab read vẫn đúng. Khi sync worker git-sync 1 note đang có collab room active, phải coi nội dung flush gần nhất từ collab server là authoritative để tránh race.
- Presence/awareness (`collab.ts:97-105`) port nguyên vẹn, chỉ đổi nguồn tên/màu user từ `localStorage` anon sang profile đã auth.
- `CollabPanel.tsx` port với UX đơn giản hoá: bỏ model "share room code" vì mỗi note đã có identity bền (`noteId`) trong hệ multi-user — thay bằng "whoever có quyền edit note này đã ở cùng room", kèm flow "Invite" (add user vào vault/workspace).

---

## 9. Các giai đoạn triển khai

**Phase 1 — Nền tảng: Auth, Vault/Note CRUD, Editor cơ bản**
Mới: scaffold `web/` Next.js, `web/server/` Fastify, Postgres migration (users/workspaces/vaults/folders/notes), JWT auth, `webApi.ts` (subset file/vault CRUD). Port: `Editor.tsx`, `SourceEditor.tsx`, `TitleBar.tsx` (bỏ window controls), `Sidebar.tsx` (backed bởi `/vaults/:id/index` thay `readDir`).

**Phase 2 — Markdown rendering, Search, Graph view**
Port nguyên vẹn toàn bộ `components/markdown/*`, `wiki-link-utils.ts`, `tag-utils.ts`, `frontmatter-utils.ts`, `toc-utils.ts`, `GraphView.tsx`, `BacklinksPanel.tsx`, `TagPane.tsx`, `QuickOpen.tsx`. Mới: `tsvector` search endpoint + trigger, bảng `backlinks` + recompute-on-save.

**Phase 3 — Plugin sandbox**
Mới: `web/src/lib/plugin-sandbox/` (iframe host, Worker host, postMessage RPC, permission validation), bảng `plugins`, endpoint install/enable/disable, lưu `main.js` trên S3/R2. Port với viết lại sandbox: types từ `plugin-api.ts` (giữ `PluginManifest`/`PluginCommand`/event-bus types, viết lại execution theo mục 7).

**Phase 4 — Sync: Git provider REST + WebDAV**
Mới: `web/server/sync-worker/` (BullMQ worker), bảng `sync_connections`/`sync_jobs`, module mã hoá credential. Port: logic shell-git từ `commands_git.rs` → Node child_process wrapper giữ nguyên guard rebase/detached-HEAD/stash; logic WebDAV từ `commands_sync.rs` → Node/axios; tham khảo `phone/lib/github-sync.ts` làm fallback REST-only path cho môi trường không shell được `git`.

**Phase 5 — Collaboration realtime**
Mới: `web/server/collab-server/` (y-websocket), bảng `collab_sessions`, internal auth-check + flush-back API. Port với đổi transport: `collab.ts` (WebRTC → WebSocket), `CollabPanel.tsx` (room-code → vault-membership invite).

**Phase 6 — PDF export, Flashcards, Calendar/Board view, Theme/Snippets**
Port gần nguyên vẹn: `pdf-export.ts`, `PDFViewer.tsx` (bỏ file-dialog save, thay browser download), `flashcard-utils.ts` + `FlashcardReview.tsx`, `calendar-utils.ts` + `CalendarView.tsx`, `board-utils.ts` + `BoardView.tsx`, `dataview.ts` + `DataviewBlock.tsx` (data-source adapter theo mục 3), `theme-utils.ts`/`css-snippets.ts` + UI tương ứng. Mới: bảng themes/snippets + CRUD, attachment upload-to-S3.

**Phase 7 — Hoàn thiện, bảo mật, deploy**
Rate limiting, audit log, export/xoá dữ liệu kiểu GDPR, invite workspace/team, CI/CD, staging+prod, domain/SSL/CDN, monitoring/alerting, load test collab server + sync worker, pen-test riêng ranh giới iframe sandbox, chiến lược backup/restore Postgres + S3.

---

## 10. Vị trí code mới

Thêm thư mục mới ngang hàng, đúng pattern hiện tại (project độc lập, không workspace):

```
Noteriv/
├── desktop/   (giữ nguyên)
├── phone/     (giữ nguyên)
├── mcp/       (giữ nguyên)
├── extension/ (giữ nguyên — nhận thêm backend target ở phase sau)
└── web/                       ← MỚI
    ├── app/ (hoặc src/app/)   Next.js App Router
    ├── src/components/        component đã port + mới
    ├── src/lib/               module logic thuần đã port + webApi.ts
    ├── src/lib/plugin-sandbox/
    ├── server/                Fastify backend (package.json riêng, deploy unit riêng)
    │   ├── src/routes/, src/services/, src/sync-worker/, src/collab-server/
    ├── db/                    Postgres migration (Prisma hoặc node-pg-migrate)
    └── package.json
```

Nếu sau này trùng lặp code giữa `desktop/src/lib/*.ts` và `web/src/lib/*.ts` trở thành gánh nặng maintain, có thể tách package chung ở một refactor sau — nhưng việc đó nằm ngoài phạm vi kế hoạch này.

---

## 11. Rủi ro & đánh đổi cần lưu ý

- **Effort**: đây là sản phẩm server from-scratch, không phải "port nhỏ". Phase 3 (sandbox) và Phase 4 (sync engine) là 2 phase nặng/rủi ro nhất — mỗi phase effort tương đương 6 phase còn lại gộp lại, vì phải giải quyết vấn đề bảo mật/consistency multi-tenant hoàn toàn mới mà desktop/mobile chưa từng gặp.
- **Bề mặt bảo mật multi-tenant hoàn toàn mới**: mọi API endpoint, plugin sandbox, và cách sync worker xử lý credential phải được thiết kế với threat model này từ đầu, không thể bổ sung sau.
- **Hạ tầng mới mà dự án chưa từng cần**: server hosting, Postgres managed, Redis, S3-compatible storage, domain + SSL, KMS/secrets manager, log/metrics/error-tracking, CI/CD riêng biệt khỏi pipeline build desktop/mobile hiện có — xác nhận hiện repo **không có** Dockerfile, IaC, hay server code nào ngoài MCP stdio server.
- **Chi phí vận hành liên tục**: khác desktop (zero cost, máy user) và mobile (zero cost, hạ tầng GitHub gánh sync), web app có **chi phí hàng tháng tăng theo số user** — compute, DB, storage egress, đặc biệt collab server và sync worker chạy liên tục. Cần có mô hình giá/plan nếu muốn tự bền vững.
- **Git-sync ở quy mô lớn khó hơn vẻ ngoài**: shell git thật server-side mỗi vault nghĩa là quản lý nhiều working-copy, dung lượng đĩa, và lock đồng thời (2 trigger cùng 1 vault không được chạy song song) — vấn đề desktop single-machine chưa từng gặp.
- **Vài tính năng không thể port 1:1**: provider "folder sync" (đồng bộ vào folder local kiểu Google Drive mount) không có tương đương server-side, nên bỏ hẳn, cần thông báo rõ cho user chuyển từ desktop; các tính năng window-chrome (`windowMinimize`, menu accelerator) không áp dụng cho tab browser.
- **Trách nhiệm marketplace plugin**: khi plugin có thể install bởi bất kỳ user (không còn side-load có chủ ý như desktop), Noteriv phải chịu trách nhiệm kiểm duyệt plugin community trước khi hiển thị cho user khác — hiện chưa có quy trình này.

---

## File quan trọng tham chiếu khi triển khai

- `desktop/src/types/electron.d.ts` — contract `ElectronAPI` đầy đủ mà `webApi.ts` phải implement lại.
- `desktop/src/lib/plugin-api.ts` — model sandbox/execution hiện tại, cần tái kiến trúc theo mục 7 nhưng giữ type manifest/command/event.
- `desktop/src-tauri/src/commands_git.rs` — logic git-sync correctness (rebase recovery, detached-HEAD guard, GIT_ASKPASS) để port vào sync worker.
- `desktop/src-tauri/src/commands_sync.rs` — logic diff WebDAV PROPFIND/MKCOL/PUT/GET để port vào cùng sync worker.
- `desktop/src-tauri/src/auth.rs` — pattern xử lý token/credential (và lý do không dùng OS keyring) làm nền cho thiết kế mã hoá credential server-side ở mục 6.
- `desktop/src/lib/collab.ts` — logic Yjs CRDT để port với transport đổi WebRTC → WebSocket.
- `phone/lib/github-sync.ts` — tham chiếu REST-only sync, dùng như fallback path khi không shell được `git` binary trên server.

---

## Xác minh sau khi triển khai

- Build `web/` chạy được (`npm run dev`), đăng nhập, tạo vault/note, thấy nội dung render đúng.
- Chạy test sync: kết nối 1 repo GitHub test, trigger sync, kiểm tra conflict-handling bằng cách tạo xung đột thủ công.
- Mở 2 browser session khác user, cùng edit 1 note, xác nhận thấy thay đổi + cursor của nhau theo thời gian thực.
- Cài 1 plugin test (bao gồm 1 plugin cố tình đọc `document.cookie`) để xác nhận sandbox chặn đúng — không rò rỉ cookie/localStorage của trang chính.
- Export PDF, review flashcard, mở calendar/board view để xác nhận parity với desktop.

---

## Ghi chú tiến độ (cập nhật trong lúc triển khai)

- **Phase 1-5**: hoàn tất, verify qua browser thật, commit+push ở `fe6ed51`.
- **Phase 6**: hoàn tất (PDF export, flashcards, calendar/board view, dataview, theme/CSS snippets), verify qua browser thật, commit+push ở `28bb50f`.
- Phát hiện một gap tiền-Phase-6 (JWT access token không tự refresh sau 15 phút) — dời xử lý sang Phase 7 theo đúng phạm vi mục đó ("bảo mật").
- Chi tiết đầy đủ từng phase (bug tìm được, quyết định kiến trúc, lý do) nằm trong memory file của dự án, không lặp lại ở đây để tránh trôi khỏi thực tế theo thời gian.

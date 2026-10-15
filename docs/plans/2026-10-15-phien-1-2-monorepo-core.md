# Phiên 1.2: Monorepo (npm workspaces) và package `@noteriv/core` — kế hoạch chi tiết

## Bối cảnh

Web (`web/`) và desktop (`desktop/`) đang giữ **hai bản sao** của cùng logic (`src/lib/`: 33 tên file trùng nhau, theo đo ngày 2026-10-14: 9 giống hệt, 24 đã lệch). Mỗi lần sửa lỗi phải làm hai lần, và hai bên dần khác nhau. Phiên 1.2 tạo nền móng dùng chung: một monorepo npm workspaces và package TypeScript thuần `@noteriv/core`, rồi chuyển vào đó các module logic thuần, có test. Người dùng **chưa thấy thay đổi**; production không đổi. Phiên làm trong worktree Orca `C:\Users\duongsinh\orca\workspaces\Noteriv\phase1-repo-cleanup` (nhánh mới `…/phase1-core` tách từ `next`).

## Phát hiện khi đọc mã (chỉ đọc) — những điều kế hoạch gốc chưa tính tới

1. **Không có `package.json` hay lockfile ở gốc.** Mỗi package có lockfile riêng: `web/`, `desktop/`, `web/server/`, `web/pdf-service/`, `phone/`, `mcp/`.
2. **`web/server` và `web/pdf-service` KHÔNG nên vào workspace.** `web/server/Dockerfile` build với context `../server` và `COPY package.json package-lock.json` (lockfile riêng); đưa nó vào workspace sẽ làm mất lockfile đó và hỏng Docker. Server chưa cần package chung ở giai đoạn này (đúng như kế hoạch gốc ghi). Khác kế hoạch gốc: workspaces chỉ gồm `packages/*`, `web`, `desktop`.
3. **Nhiều module "tiện ích thuần" thật ra gọi `webApi`**: `tag-utils`, `template-utils`, `flashcard-utils`, `css-snippets`, `theme-utils`, `vault-insights-utils` (web import `webApi`; desktop gọi `window.electronAPI`). Phần khác nhau giữa hai bên chính là phần vào/ra này. Vì vậy không thể "chuyển nguyên file": phải **tách** logic thuần (parse, tính toán) về `core`, phần vào/ra ở lại app. Giai đoạn 1.3 (VaultAdapter) sẽ thống nhất phần vào/ra sau.
4. **Khối lượng đổi import nhỏ:** 8 module ứng viên đầu tiên chỉ được import ở 15 chỗ trong 12 file của web (đo bằng grep).
5. **Next 16 (tài liệu trong `node_modules/next/dist/docs`):**
   - Turbopack tự biên dịch package workspace; webpack (App Router) cũng vậy. Vẫn khai `transpilePackages: ["@noteriv/core"]` cho tường minh.
   - Turbopack tự nhận gốc dự án từ lockfile; thêm lockfile ở gốc repo làm gốc dịch chuyển từ `web/` lên gốc repo.
   - **`output: "standalone"` mặc định chỉ lần theo thư mục dự án.** Khi `node_modules` được hoist lên gốc repo, phải đặt `outputFileTracingRoot` về gốc repo, nếu không image `web` thiếu thư viện lúc chạy. Kèm theo, thư mục standalone lồng thêm một cấp (`.next/standalone/web/server.js`), nên `CMD` và các lệnh `COPY` trong `web/Dockerfile` phải đổi.
6. **CI:** `web-ci.yml` (job `frontend`) dùng `npm install`, **không** `npm ci`, vì lockfile sinh trên Windows làm `npm ci` hỏng trên Linux (ghi chú ngay trong file). `release.yml` (chạy khi đẩy tag `v*`) làm việc trong `desktop/`, dùng `npm ci`, Node 20, `cache-dependency-path: desktop/package-lock.json`: sẽ gãy khi lockfile chuyển lên gốc. Workflow này chỉ chạy khi có tag nên **không thể thử đầy đủ** trong phiên này.
7. **Không có `.dockerignore`** ở đâu cả. Context của `web/Dockerfile` là gốc repo; khi build cục bộ trong worktree có `node_modules`, context sẽ rất lớn.
8. **Phiên bản lệch giữa hai app** (`web`: `next ^16.4.0`, `mermaid ^10.8`, `katex ^0.19`, `y-websocket`; `desktop`: `next 16.1.6`, `mermaid ^11.13`, `katex ^0.16`, `y-webrtc`). `react` giống nhau (19.2.3). `@noteriv/core` không phụ thuộc thư viện nào nên chưa gặp xung đột; việc thống nhất phiên bản là của Phiên 1.4 (`@noteriv/ui`).
9. Chưa có khung test nào ở `web/` hay `desktop/`: Vitest chỉ thêm ở `packages/core`.

## Thiết kế

- **Gốc repo:** `package.json` (private, `workspaces: ["packages/*", "web", "desktop"]`, script `test`, `typecheck`) + `package-lock.json` mới. Bỏ `web/package-lock.json` và `desktop/package-lock.json`.
- **`packages/core`** (`@noteriv/core`): TypeScript thuần, **không** phụ thuộc React, Next, Tauri, CodeMirror, `webApi`, `window`/DOM-API riêng của app. **Nạp theo mã nguồn** (không bước build): `exports` trỏ thẳng tới `src/*.ts` (`"./*": "./src/*.ts"`), app import `@noteriv/core/<module>`. Test bằng Vitest; `tsc --noEmit` kiểm kiểu.
- **Quy tắc chuyển module** (sau khi lập bảng kiểm kê thật bằng `cmp`/`diff`, bước 2):
  - **A. Giống hệt ở hai bên và không import mã riêng của app** → `git mv` về `core`, xoá bản kia, đổi import (codemod, kiểm bằng `tsc`).
  - **B. Khác nhau chỉ ở phần vào/ra** (gọi `webApi` hay `electronAPI`) → **tách**: hàm thuần sang `core`; file ở app giữ hàm vào/ra, import hàm thuần từ `core` và **re-export** để mọi chỗ gọi cũ không đổi. Re-export là tạm thời, gỡ ở 1.3/1.4 khi có VaultAdapter.
  - **C. Khác nhau về logic** → so sánh từng cặp, hợp nhất về bản tốt hơn (mặc định bản web, đã có sửa lỗi gần đây), giữ phần riêng của desktop nếu thật sự cần, **viết test trước khi hợp nhất** để chốt hành vi.
  - **D. Phụ thuộc React/CodeMirror/DOM/`@/…` của app** (`editor-commands`, `vim-mode`, `wikilink-completion`, `settings`, `hotkeys`, `plugin-api`…) → **không chuyển** ở phiên này.
- **Mục tiêu:** ít nhất 15 module trong `core`, mỗi module có test đặc tả hành vi hiện tại (ưu tiên: `frontmatter-utils`, `tag-utils`, `wiki-link-utils`, `toc-utils`, `markdown-lint`, `flashcard-utils`, `calendar-utils`, `template-utils`, rồi `board-utils`, `canvas-utils`, `drawing-utils`, `slide-utils`, `dataview`, `bookmark-utils`, `note-composer-utils`, `sanitize-html`, `markdown-to-html`, `vault-insights-utils`, `attachment-utils`).

## Các bước

Chia **ba mốc**, mỗi mốc commit và build xanh trước khi sang mốc sau. Mốc 1 chứa phần rủi ro nhất (Docker, lockfile) nên được thử trên staging **trước khi** chuyển mã.

### Mốc 1 — Khung monorepo, chưa chuyển mã
1. **Kiểm kê** (chỉ đọc): script tạm (ngoài repo) chạy `cmp`/`diff` cho 33 tên trùng ở `src/lib/` và cho `components/markdown/` (để biết phần nào đủ giống nhau để chuyển ở 1.4); liệt kê import của từng file; xếp loại A/B/C/D; lưu bảng vào `docs/plans/2026-10-15-phien-1-2-kiem-ke-core.md`.
2. Nhánh `…/phase1-core` từ `next`. Tạo `package.json` gốc, `packages/core` (`package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`), một module mồi (ví dụ `src/version.ts` hoặc module A đầu tiên) kèm test, `.dockerignore` gốc (loại `node_modules`, `.next`, `.git`, `phone`, `desktop/src-tauri/target`, `**/out`).
3. `npm install` ở gốc worktree (lần đầu, vài phút). So sánh phiên bản đã resolve của các gói chính với `web/package-lock.json` và `desktop/package-lock.json` cũ (`next`, `react`, `react-dom`, `@codemirror/*`, `yjs`, `mermaid`, `katex`, `dompurify`, `pdfjs-dist`): **mọi chỗ thay đổi phải được giải thích**; nếu một gói nhảy phiên bản bất ngờ, ghim đúng phiên bản cũ trong manifest của app. Xoá hai lockfile cũ.
4. `web/next.config.ts`: `transpilePackages`, `outputFileTracingRoot: path.join(__dirname, "..")`, giữ nguyên headers/rewrites. `desktop/next.config.ts`: `transpilePackages`. Thêm `@noteriv/core` vào `dependencies` (`"*"`) của hai app.
5. `web/Dockerfile` (context gốc repo): `COPY package.json package-lock.json`, `COPY web/package.json`, `COPY desktop/package.json`, `COPY packages/core/package.json` → `npm install -w web --include-workspace-root` (không cài phần của desktop như `@tauri-apps/cli`) → `COPY packages packages`, `COPY web web` → build → image chạy `node web/server.js` với `static` và `public` copy vào đúng thư mục lồng `web/`. Sẽ chỉnh theo kết quả build thật.
6. CI: `web-ci.yml` job `frontend` chạy ở gốc (`npm install`, `npm run typecheck -w web`, `npm run build -w web`, `npm test -w @noteriv/core`), `cache-dependency-path` về lockfile gốc, `paths` thêm `packages/**`, `package.json`, `package-lock.json`. Job `server` giữ nguyên. `release.yml`: cài ở gốc và build từ `desktop/` (xem rủi ro).
7. **Kiểm mốc 1** (xem mục Kiểm chứng) rồi commit. **Hỏi rồi** push `next` để staging build bằng Dockerfile mới; xanh mới sang Mốc 2.

### Mốc 2 — Module loại A (giống hệt)
8. `git mv` từng module A vào `packages/core/src/`, xoá bản trùng, codemod đổi import (`@/lib/x`, `./x`, `../lib/x` → `@noteriv/core/x`) ở cả hai app, `tsc --noEmit` cho cả hai, viết test đặc tả hành vi cho mỗi module (3–6 ca/module: trường hợp thường, biên, đầu vào lạ).
9. Mỗi nhóm 3–5 module một commit; sau mỗi nhóm chạy `tsc` (web, desktop), test core, `next build` web.

### Mốc 3 — Module loại B và C
10. Với B: tách hàm thuần, app giữ phần vào/ra + re-export, test hàm thuần. Với C: viết test cho **cả hai** bản trước, chọn bản hợp nhất, chạy test trên bản hợp nhất, ghi quyết định trong bảng kiểm kê (mỗi dòng: bản nào thắng, vì sao).
11. Kiểm cuối (đủ danh sách ở dưới), cập nhật tài liệu, gộp và push (hỏi).

## Tệp chính
- Mới: `package.json`, `package-lock.json` (gốc), `.dockerignore`, `packages/core/**`, `docs/plans/2026-10-15-phien-1-2-kiem-ke-core.md`, `docs/plans/2026-10-15-phien-1-2-monorepo-core.md` (bản kế hoạch này).
- Sửa: `web/next.config.ts`, `desktop/next.config.ts`, `web/package.json`, `desktop/package.json`, `web/Dockerfile`, `.github/workflows/web-ci.yml`, `.github/workflows/release.yml`, các file import ở `web/src/**` và `desktop/src/**`, `README.md` (lệnh dev mới), `docs/plans/2026-10-14-huong-dan-ban-giao-phien.md`, bảng trạng thái ở file Giai đoạn 1.
- Xoá: `web/package-lock.json`, `desktop/package-lock.json`, các bản sao đã chuyển.
- Không đụng: `web/server/**`, `web/pdf-service/**`, `phone/`, `mcp/`, `extension/`, thư mục `D:\code\Noteriv` (nhánh `main`, dev server và file chưa commit của chủ dự án).

## Kiểm chứng (điều kiện "xong")
Chạy từ gốc worktree sau khi `npm install`:
- `npx tsc --noEmit` ở `web/` và `desktop/` sạch; `npm test -w @noteriv/core` xanh; `packages/core` có **≥ 15 module** và mỗi module có test.
- `npm run build -w web` (Next standalone) và `npm run build:next -w desktop` (static export ra `out/`) đều chạy.
- **Docker thật trên máy** (có Docker Desktop): `docker build -f web/Dockerfile` với đúng build-arg như compose, chạy container rồi `curl` `/login`, `/terms`, `/api/v1/healthz` (qua rewrite) trả mã đúng; so kích thước image với bản trước.
- **Mô phỏng CI trên Linux** bằng `docker run node:22` (và Node 20 cho desktop): `npm ci` có chạy với lockfile sinh trên Windows không (quyết định `npm ci` hay `npm install` cho CI và `release.yml`); `next build` của desktop trong container.
- `npm ls react react-dom` chỉ một bản; bảng so phiên bản (bước 3) không có thay đổi bất ngờ.
- Staging (sau push, hỏi trước): build xanh, `healthz` ok, chủ dự án (hoặc tôi, nếu chủ dự án đăng nhập basic-auth một lần trong Chrome) thử tay: mở ghi chú, sửa frontmatter, ngăn tag, panel lint, chèn template, thẻ flashcard, lịch, wikilink, mục lục (mỗi cái dùng module đã chuyển). Production **không** deploy lại (đối chiếu số lần deploy).
- Không còn bản sao của module đã chuyển (`git grep` tên file ở hai app chỉ còn phần vào/ra + re-export loại B).

## Điểm dừng để hỏi chủ dự án
Push `next` (staging build lại, ~7 phút, vài GB đĩa; VPS ~89%); gộp vào `main` (**không** làm trong phiên này); nếu bảng so phiên bản cho thấy một gói nhảy phiên bản lớn; nếu Docker/`npm ci` buộc đổi cách cài; mọi thao tác trên Docker daemon của VPS.

## Rủi ro
| Rủi ro | Cách giảm |
|---|---|
| Image `web` thiếu thư viện hoặc sai đường dẫn khi chạy (gốc tracing, thư mục lồng `web/`) | `outputFileTracingRoot`; **build và chạy container cục bộ trước**; thử staging ở cuối Mốc 1, chưa chuyển mã |
| Lockfile mới làm trôi phiên bản gói (resolve lại từ registry) | So bảng phiên bản với lockfile cũ; ghim lại nếu cần; hai app giữ phiên bản `next` hiện có |
| `npm ci` hỏng trên Linux với lockfile sinh trên Windows | Mô phỏng bằng `node:22` trong Docker; CI và Docker dùng `npm install` như hiện nay nếu `ci` hỏng |
| `release.yml` không thể thử đủ (chỉ chạy khi có tag) | Chạy phần cài đặt và `next build` của desktop trong container Linux; ghi rõ "chưa thử đầy đủ" ở bàn giao; kiểm lại ở lần tag kế tiếp |
| Hợp nhất mã lệch làm mất bản sửa lỗi | Bản web là gốc; test đặc tả viết **trước** khi hợp nhất; mỗi nhóm nhỏ, `tsc` + build sau mỗi nhóm |
| Phần tách loại B làm đổi hành vi | App giữ re-export nên chỗ gọi không đổi; test hàm thuần; kiểm tay trên staging |
| Máy dev của chủ dự án bị ảnh hưởng | Làm hoàn toàn trong worktree; `D:\code\Noteriv` không đụng |
| Worktree cần `npm install` lớn, tốn đĩa D: | Chấp nhận (một lần); không ảnh hưởng VPS |

## Chưa nằm trong phiên này
VaultAdapter (1.3), `@noteriv/ui` và thống nhất phiên bản `mermaid`/`katex`/`next` (1.4), Plugin API (1.5), đưa `web/server` vào workspace (không cần), gộp `next` vào `main`.

## Điều chỉnh khi thực hiện (2026-10-15)

- **Mốc 1 có chuyển một module thật** (`frontmatter-utils`), không chỉ khung rỗng, để kiểm đường nạp mã ở cả hai app và trong Docker.
- **Docker Desktop không bật được** trên máy chủ dự án, nên **không** build image cục bộ. Thay bằng: (a) build và chạy thử server standalone từ một bản sao tạm (mô phỏng cấu trúc image), (b) PR nháp trong repo (đã đóng) để chạy Web CI trên máy Linux của GitHub (xanh cả 3 job), (c) staging build bằng Dockerfile mới. Việc mô phỏng `npm ci` trên Linux (Node 20/22) và chạy `release.yml` **chưa làm**; CI dùng `npm install -w …` như trước.
- **Ghim `@tauri-apps/*`** theo `Cargo.lock` (không có trong kế hoạch gốc).
- **Sửa lỗi treo** của `markdownToHTML` (không có trong kế hoạch gốc, phát hiện khi viết test).
- **Mốc 3 (loại B) chưa làm**: để cùng VaultAdapter ở 1.3.
- Số module đạt đúng mục tiêu 15; không nhiều hơn.

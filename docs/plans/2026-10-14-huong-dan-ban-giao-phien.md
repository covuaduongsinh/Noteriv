# Hướng dẫn bàn giao: đọc trước khi bắt đầu một phiên làm việc mới

> Ngày lập: 2026-10-14. Dành cho **mọi phiên Claude mới** làm việc trên Noteriv web. Phiên mới không biết gì về các cuộc trò chuyện trước, nên file này tóm tắt những gì cần biết. **Không chứa secret.** Cập nhật file này khi hạ tầng hoặc quy tắc thay đổi.

## 1. Cách chủ dự án mở một phiên mới

Dán câu sau (đổi tên file giai đoạn và số phiên):

> Đọc `docs/plans/2026-10-14-huong-dan-ban-giao-phien.md` và `docs/plans/2026-10-14-giai-doan-0-nen-mong-an-toan.md`, rồi lập kế hoạch và triển khai **Phiên 0.1**.

Các tài liệu định hướng (theo thứ tự thực hiện):

| GĐ | File kế hoạch |
|---|---|
| Tổng | `docs/plans/2026-10-14-lo-trinh-noteriv-chess-pkm.md` |
| 0 | `docs/plans/2026-10-14-giai-doan-0-nen-mong-an-toan.md` |
| 1 | `docs/plans/2026-10-14-giai-doan-1-tach-repo-package-chung-plugin-api.md` |
| 2 | `docs/plans/2026-10-14-giai-doan-2-thu-gon-core-plugin.md` |
| 3 | `docs/plans/2026-10-14-giai-doan-3-co-vua-core-plugin.md` |
| 4 | `docs/plans/2026-10-14-giai-doan-4-tai-lieu-plugin-cli.md` |
| 5 | `docs/plans/2026-10-14-giai-doan-5-dong-bo-di-dong-chia-se.md` |
| 6 | `docs/plans/2026-10-14-giai-doan-6-ai-mcp-ra-mat.md` |

Lịch sử xây bản web: `docs/plans/2026-10-12-noteriv-web-version.md` và các file `docs/plans/2026-10-1x-*.md`.

**Trước khi làm một phiên:** kiểm bảng "Trạng thái" cuối file giai đoạn (phiên trước đã xong chưa) và mục "Điều kiện bắt đầu" ở đầu file.

## 2. Về chủ dự án và cách làm việc

- Chủ dự án **không chuyên IT**: giải thích bằng tiếng Việt dễ hiểu, đưa **khuyến nghị kèm lý do**, hỏi khi cần quyết định (dùng câu hỏi có lựa chọn).
- **Ngôn ngữ:** trả lời và tài liệu bằng tiếng Việt; code, tên file, commit message, PR bằng tiếng Anh.
- **Kế hoạch luôn lưu trong `docs/plans/`** (đặt tên `YYYY-MM-DD-<chủ-đề>.md`). Plan mode: chỉ đọc và viết file kế hoạch, **không chạy shell** (kể cả lệnh "chỉ kiểm tra").
- **Mô hình nhánh:** `main` = production (Dokploy tự deploy); `next` = tái cấu trúc (Giai đoạn 1 trở đi), bản staging deploy từ `next`. Sửa lỗi production: nhánh từ `main`, rồi **merge `main` vào `next`** (một chiều). Gộp `next` vào `main` chỉ ở mốc được chủ dự án duyệt. **Không bao giờ force-push `main`.**
- **Nơi làm việc từ Giai đoạn 1 (đã chốt 2026-10-15):** `D:\code\Noteriv` luôn ở **`main`** (production, dev server và các file chưa commit của chủ dự án). Việc Giai đoạn 1 làm trong **worktree riêng do Orca tạo** từ `origin/next`, nhánh `covuaduongsinh/phase1-<việc>` (Orca tự thêm tiền tố tài khoản). Một nhánh không thể được checkout ở hai thư mục, nên đừng để thư mục gốc đứng trên `next`. Mỗi worktree cần `npm install` và file `.env` riêng. Trong Orca, ô Project hiện `thejacedev/Noteriv` (kho upstream): **đừng mở PR hay đẩy nhánh lên upstream từ Orca**; việc push luôn tới `origin` và phải hỏi chủ dự án.
- **Hỏi trước khi push hoặc deploy.** Chủ dự án thường trả lời "push và deploy luôn" khi đồng ý. Mỗi lần push `next` làm staging tự build (7 phút, vài GB đĩa), nên gộp nhiều thay đổi vào ít lần push và tắt staging sau khi thử.
- **Giấy phép và ghi công:** `LICENSE` (MIT, © Jace + © Phùng Đức Tường), `NOTICE.md` (nguồn gốc fork, quy tắc ghi mã bên thứ ba **tại thời điểm nhập**; danh sách "Imported components" hiện trống). Theo dõi upstream: `docs/upstream-notes.md`, kiểm mỗi tháng (lần kế tiếp ~2026-11-15). Không đăng lại tệp nhị phân do upstream dựng (APK) thành sản phẩm của dự án này.
- **Không dán hoặc ghi secret** vào chat, tài liệu, commit. Khi đọc env Dokploy chỉ in **tên** biến.
- **Không đụng các file chưa commit của chủ dự án** (hiện có: `desktop/examples/plugins/chessboard/*`, `docs/plans/2026-10-12-chessboard-plugin-improvements.md`). Khi `git add`, liệt kê từng file, không dùng `git add -A` hay `git add docs`.
- **Kiểm chứng bằng chạy thật** (trình duyệt, API, chụp màn hình) trước khi báo "đã xong", và nói rõ phần nào chưa kiểm.
- Cuối mỗi phiên: cập nhật bảng **"Trạng thái"** trong file kế hoạch giai đoạn tương ứng.

## 3. Định hướng sản phẩm (đã chốt 2026-10-14)

- **Web là sản phẩm chính**; **desktop vẫn được duy trì với cùng tính năng** nhờ dùng chung mã (`packages/*` từ Giai đoạn 1). Mọi tính năng mới phải chạy trên cả hai.
- Đối tượng: **cộng đồng PKM cờ vua**. Tên: **Noteriv**.
- **Noteriv thay thế ChessNote** (`D:\code\chessnote`, fork SilverBullet). ChessNote đã ngừng chạy; chỉ chuyển **tính năng**, không có dữ liệu cần chuyển. Tài liệu thuật toán cờ: `D:\code\chessnote\docs\CHESS_MODULES.md` và `docs/modules/`. Kiểm tra giấy phép trước khi chép mã (xem mục 3 của lộ trình).
- Upstream `thejacedev/Noteriv` (remote `upstream`): **chỉ học ý tưởng**, không merge. **Chưa tách repo** (quyết định 2026-10-14); việc tách được xem lại ở cuối Giai đoạn 2.
- Thứ tự: 0 an toàn → 1 nền móng chung + Plugin API → 2 thu gọn thành core plugin → 3 cờ vua (core plugin) → 4 hệ sinh thái plugin → 5 đồng bộ/PWA/chia sẻ/lớp học → 6 AI/MCP/ra mắt.
- Mốc: tag `v-web-parity-2026-10-14` (commit `05f7318`).

## 4. Bản đồ mã nguồn

| Thư mục | Nội dung |
|---|---|
| `web/` | Frontend Next.js 16 (App Router). **Đọc `web/AGENTS.md`**: Next 16 có thay đổi lớn, tra `node_modules/next/dist/docs/` trước khi viết code |
| `web/src/app/vaults/[vaultId]/page.tsx` | Trang chính (editor, panel, lệnh, modal) |
| `web/src/lib/` | `webApi.ts` (client REST), `pdf-export.ts`, `plugin-sandbox/*`, `hotkeys.ts`, `markdown-to-html.ts` |
| `web/src/components/` | Ribbon, AppMenu, SettingsModal, PluginManager, DiagnosticsModal, PdfPreviewModal… |
| `web/public/plugin-sandbox.html` | Sandbox plugin (iframe `sandbox="allow-scripts"`, RPC qua postMessage, quyền mặc định bị chặn) |
| `web/server/` | API Fastify + Prisma/PostgreSQL; `src/routes/*`, `src/lib/{gitSync,syncRunner,vaultFs,attachments,attachmentSync}.ts` |
| `web/server/src/sync-worker/` | Worker BullMQ (sync git/WebDAV) |
| `web/server/src/collab-server/` | Cộng tác thời gian thực (Yjs qua WebSocket) |
| `web/pdf-service/` | Dịch vụ nội bộ HTML → PDF (puppeteer-core + Chromium, tắt JS, chặn mạng, xác thực bằng token) |
| `web/infra/` | `docker-compose.prod.yml` (production), `docker-compose.dev.yml` |

## 5. Hạ tầng production

- **VPS** `217.15.160.118` (SSH alias sẵn, user `root`). **Dùng chung** với ERPNext và các dịch vụ khác, nên **mọi container phải có `mem_limit`**. Kiểm `df -h /` và `free -h` trước khi thêm dịch vụ (ngày 2026-10-14: đĩa 89%, RAM khoảng 7,9GB).
- **Dokploy** `https://dokploy.dsc.edu.vn`, composeId production `3tKquEXFX1KEN2EueeUGm`, file compose `web/infra/docker-compose.prod.yml`, nhánh `main`.
  - Push `main` thì tự deploy (5–8 phút). Xem trạng thái: `GET /api/deployment.allByCompose?composeId=…` với header `x-api-key`.
  - API key: đọc từ file cục bộ của chủ dự án `~/.config/noteriv/dokploy.key` (có từ 2026-10-15); nếu chưa có, hỏi chủ dự án. **Không ghi key vào file trong repo.**
  - Secret nằm trong env compose của Dokploy (`compose.one` để đọc, `compose.update` để sửa; khi in chỉ in tên biến).
- **Tên miền:** `https://noteriv.dsc.edu.vn` (Traefik của Dokploy định tuyến tới `noteriv-web` và `noteriv-collab`).
- **Container** (tiền tố `compose-parse-mobile-card-ue7dq8-`): `noteriv-web`, `noteriv-api`, `noteriv-worker`, `noteriv-collab`, `noteriv-pdf`, `noteriv-postgres`, `noteriv-redis`, `noteriv-garage`, `noteriv-backup` (từ 2026-10-15).
- **Sao lưu:** `noteriv-backup` chạy 02:00 mỗi đêm, mã hoá age, đẩy vào repo private `covuaduongsinh/noteriv-backups`; giám sát healthchecks.io. Runbook: `docs/ops/sao-luu-khoi-phuc.md`. Khoá age bí mật **chỉ chủ dự án giữ**. Các file khoá cục bộ của chủ dự án nằm ở `~/.config/noteriv/` (`dokploy.key`, `backup-age.key`, `backup-deploy-key`) — đọc từ file, không in giá trị. Tên service có tiền tố `noteriv-` là **bắt buộc** (tránh trùng DNS trên mạng `dokploy-network` dùng chung).
- **Staging** (từ 2026-10-15): compose Dokploy `klW9MC4cRpRHiPHMcMwIq` (`noteriv-staging`), nhánh **`next`**, `https://staging-noteriv.dsc.edu.vn` có basic-auth (user/mật khẩu trong `~/.config/noteriv/staging-basic-auth.txt`; middleware ở `/etc/dokploy/traefik/dynamic/noteriv-staging.yml` trên VPS). Tiền tố container `compose-generate-cross-platform-alarm-cdil47-`. **Mặc định tắt**, **không có sao lưu** (`BACKUP_REPLICAS=0`). Push `next` tự deploy nhờ webhook GitHub thứ hai. Chi tiết và quy trình: `docs/ops/trien-khai.md`.
- **Đăng ký và pháp lý** (từ 2026-10-15): đăng ký **chỉ bằng mã mời** (`REGISTRATION_MODE=invite`, giá trị lạ hoặc rỗng = đóng); `ADMIN_EMAILS` (production: `duongsinhchess@gmail.com`) quản lý mã tại `/admin/invites` (liên kết ở trang "Vault của bạn"). `/terms` và `/privacy` công khai; họ tên chủ thể vận hành đặt trong `web/src/lib/legal.ts` (`OPERATOR_NAME`; còn trống thì hiện nhãn Bản nháp). Quên mật khẩu **chưa có** tự phục vụ. **Migration thêm cột vào bảng `users`: áp migration TRƯỚC khi deploy mã mới** (xem `docs/ops/trien-khai.md` mục 7) vì mã mới đọc cột đó ở mọi truy vấn user. Sự cố và bí mật: `docs/ops/su-co.md`, `docs/ops/bi-mat.md`.
- **Giám sát** (từ 2026-10-15): `GET /api/v1/healthz` (công khai, DB + Redis, 200/503). UptimeRobot kiểm trang chủ và `/api/v1/healthz` mỗi 5 phút; healthchecks.io check `noteriv-host` nhận ping từ cron trên VPS (`/usr/local/bin/noteriv-check-host`, mỗi 10 phút, cấu hình `/etc/noteriv/check-host.env`, ngưỡng đĩa > 90% hoặc RAM khả dụng < 300MB). Chi tiết: `docs/ops/giam-sat.md`. Kho Docker trên VPS dùng containerd, `docker prune` thu được rất ít; đĩa phần lớn là image dự án khác (paperclip, ERPNext).
- **Migration Prisma chạy tay** sau deploy: `docker exec <container noteriv-api> npx prisma migrate deploy`.
- **Sau mỗi deploy** kiểm: `docker ps | grep noteriv`, trang chủ trả 200, menu Developer → Chẩn đoán (DB, Redis, git, S3, worker, dịch vụ PDF).

## 6. Chạy môi trường dev cục bộ (Windows)

1. Tunnel tới dịch vụ dev trên VPS: `ssh -N -L 55432:127.0.0.1:55432 -L 56379:127.0.0.1:56379 -L 59000:127.0.0.1:59000 217.15.160.118` (chạy nền).
2. API: trong `web/server`, chạy `npm run dev` (cổng 4001) và `npm run dev:worker`. Env ở `web/server/.env` (gitignored, đã có `PDF_SERVICE_URL=http://127.0.0.1:4003`, `PDF_SERVICE_TOKEN=devtoken`).
3. Web: trong `web`, chạy `npx next dev -p 3457`. Mở bằng **`http://localhost:3457`** (không dùng `127.0.0.1`, vì cookie).
4. Dịch vụ PDF (khi cần): `node web/pdf-service/src/index.mjs` với env `PDF_SERVICE_TOKEN=devtoken`, `PORT=4003`, `PDF_CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe`.
5. Dọn sau khi thử: tắt các tiến trình đã mở, xoá user và vault thử (qua API).

## 7. Kiểm thử

- Kiểu: `npx tsc --noEmit` trong `web/` và `web/server/`; build: `npx next build` trong `web/`.
- Sync: `web/server/scripts/test-sync-scenarios.ts` (và `test-s3-down.ts`).
- Giao diện: claude-in-chrome. Nếu click hoặc gõ không tác dụng, dùng `javascript_tool` để bắn sự kiện DOM (`.click()`, setter `value` + sự kiện `input`). Menu tự đóng giữa hai lệnh, nên mở menu và bấm mục trong **cùng một** lệnh JS.
- PDF: kiểm bằng PyMuPDF (`python -c "import fitz"` có sẵn) để dựng ảnh trang và xem font (`page.get_fonts()`).

## 8. Bài học đã trả giá (đừng lặp lại)

- **Không đặt thư mục scratch của git sync bên trong một repo git** (từng commit nhầm vào repo Noteriv thật). `gitSync.ts` đã có `assertIsOwnRepoRoot`; đừng gỡ nó.
- Token git chỉ truyền qua `GIT_ASKPASS`, không đưa vào URL hay argv. Trên Windows dùng `-c core.autocrlf=false`.
- Tailwind v4: CSS reset phải nằm trong `@layer base`, nếu không utility padding và margin sẽ bị vô hiệu.
- Font PDF: Georgia không có glyph tiếng Việt dựng sẵn (dấu bị lệch); dùng Noto Serif, Liberation Serif, Times New Roman.
- Không restart Docker daemon trên VPS khi chưa hỏi (ảnh hưởng mọi dịch vụ khác).
- Next.js dev: StrictMode chạy effect 2 lần; effect khôi phục trạng thái cần cờ `cancelled`.

## 9. Việc còn treo từ trước (không thuộc Giai đoạn 0 nhưng cần nhớ)

- Chưa thử chọn hoặc tạo repo GitHub bằng token thật trong luồng "Tạo vault từ GitHub".
- Plugin chessboard bản web chưa được đăng lên `thejacedev/NoterivPlugins`. Có thể bỏ qua: Giai đoạn 3 thay nó bằng core plugin `chess-board`, và Giai đoạn 4 có kho plugin riêng.

# Hướng dẫn bàn giao: đọc trước khi bắt đầu một phiên làm việc mới

> Ngày lập: 2026-10-14. Dành cho **mọi phiên Claude mới** làm việc trên Noteriv web. Phiên mới không biết gì về các cuộc trò chuyện trước, nên file này tóm tắt những gì cần biết. **Không chứa secret.** Cập nhật file này khi hạ tầng hoặc quy tắc thay đổi.

## 1. Cách chủ dự án mở một phiên mới

Dán câu sau (đổi số phiên):

> Đọc `docs/plans/2026-10-14-huong-dan-ban-giao-phien.md` và `docs/plans/2026-10-14-giai-doan-0-nen-mong-an-toan.md`, rồi lập kế hoạch và triển khai **Phiên 0.1**.

Các tài liệu định hướng:
- Lộ trình tổng: `docs/plans/2026-10-14-lo-trinh-noteriv-chess-pkm.md`
- Giai đoạn 0: `docs/plans/2026-10-14-giai-doan-0-nen-mong-an-toan.md`
- Lịch sử xây bản web: `docs/plans/2026-10-12-noteriv-web-version.md` và các file `docs/plans/2026-10-1x-*.md`

## 2. Về chủ dự án và cách làm việc

- Chủ dự án **không chuyên IT**: giải thích bằng tiếng Việt dễ hiểu, đưa **khuyến nghị kèm lý do**, hỏi khi cần quyết định (dùng câu hỏi có lựa chọn).
- **Ngôn ngữ:** trả lời và tài liệu bằng tiếng Việt; code, tên file, commit message, PR bằng tiếng Anh.
- **Kế hoạch luôn lưu trong `docs/plans/`** (đặt tên `YYYY-MM-DD-<chủ-đề>.md`). Plan mode: chỉ đọc và viết file kế hoạch, **không chạy shell** (kể cả lệnh "chỉ kiểm tra").
- **Hỏi trước khi push hoặc deploy.** Chủ dự án thường trả lời "push và deploy luôn" khi đồng ý.
- **Không dán hoặc ghi secret** vào chat, tài liệu, commit. Khi đọc env Dokploy chỉ in **tên** biến.
- **Không đụng các file chưa commit của chủ dự án** (hiện có: `desktop/examples/plugins/chessboard/*`, `docs/plans/2026-10-12-chessboard-plugin-improvements.md`). Khi `git add`, liệt kê từng file, không dùng `git add -A` hay `git add docs`.
- **Kiểm chứng bằng chạy thật** (trình duyệt, API, chụp màn hình) trước khi báo "đã xong", và nói rõ phần nào chưa kiểm.
- Cuối mỗi phiên: cập nhật bảng **"Trạng thái"** trong file kế hoạch giai đoạn tương ứng.

## 3. Định hướng sản phẩm (đã chốt 2026-10-14)

- **Web là sản phẩm chính**; `desktop/` ở chế độ giữ nguyên.
- Đối tượng: **cộng đồng PKM cờ vua**. Tên: **Noteriv**.
- **Noteriv thay thế ChessNote** (`D:\code\chessnote`, fork SilverBullet). ChessNote đã ngừng chạy; chỉ chuyển **tính năng**, không có dữ liệu cần chuyển. Tài liệu thuật toán cờ: `D:\code\chessnote\docs\CHESS_MODULES.md` và `docs/modules/`. Kiểm tra giấy phép trước khi chép mã (xem mục 3 của lộ trình).
- Upstream `thejacedev/Noteriv` (remote `upstream`): **chỉ học ý tưởng**, không merge vào `web/`.
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
  - API key: đọc từ file cục bộ của chủ dự án (sau Phiên 0.4: `~/.config/noteriv/dokploy.key`); nếu chưa có, hỏi chủ dự án. **Không ghi key vào file trong repo.**
  - Secret nằm trong env compose của Dokploy (`compose.one` để đọc, `compose.update` để sửa; khi in chỉ in tên biến).
- **Tên miền:** `https://noteriv.dsc.edu.vn` (Traefik của Dokploy định tuyến tới `noteriv-web` và `noteriv-collab`).
- **Container** (tiền tố `compose-parse-mobile-card-ue7dq8-`): `noteriv-web`, `noteriv-api`, `noteriv-worker`, `noteriv-collab`, `noteriv-pdf`, `noteriv-postgres`, `noteriv-redis`, `noteriv-garage`. Tên service có tiền tố `noteriv-` là **bắt buộc** (tránh trùng DNS trên mạng `dokploy-network` dùng chung).
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
- Plugin chessboard bản web chưa được đăng lên `thejacedev/NoterivPlugins` (và có thể không cần, vì Giai đoạn 1 sẽ đưa bàn cờ vào lõi).

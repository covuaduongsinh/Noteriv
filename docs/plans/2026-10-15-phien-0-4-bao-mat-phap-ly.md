# Phiên 0.4: Bảo mật, pháp lý, tài liệu vận hành — kế hoạch chi tiết

## Bối cảnh

Sau 0.1–0.3 đã có sao lưu, staging và giám sát. Còn bốn lỗ hổng trước khi mời học viên: (1) **bất kỳ ai cũng đăng ký được** (`POST /api/v1/auth/register` không có điều kiện), (2) Dokploy API key đã lộ trong chat vẫn dùng được, (3) chưa có điều khoản/quyền riêng tư và chưa lưu việc người dùng đồng ý, (4) chưa có security headers và chưa chạy `npm audit`. Phiên này đóng cả bốn và viết hai tài liệu vận hành còn thiếu.

Quyết định đã chốt với chủ dự án: admin = `duongsinhchess@gmail.com`; chủ thể vận hành trong điều khoản = **cá nhân (chủ dự án)**; Dokploy key do **chủ dự án tự xoay** rồi báo lại; Sentry hoãn.

## Phát hiện khi đọc mã (chỉ đọc)

- `web/server/src/routes/auth.ts:62` — `/register` kiểm Zod (`email`, `password` 8–200, `displayName`), tạo `User` + `Workspace` + `WorkspaceMember` trong một `prisma.$transaction`; có `bruteForceGuard` 10/phút; dùng `logAudit` (`lib/auditLog.ts`, fire-and-forget). Đây là điểm chặn.
- `plugins/auth.ts`: `request.user = { id, email }` — đủ để kiểm admin bằng email, **không cần cột `role`**.
- Schema `User` (`prisma/schema.prisma:43`) chưa có trường đồng ý điều khoản; migration mẫu: `20261014160000_clip_tokens/migration.sql` (SQL tay, đặt tên `YYYYMMDDHHMMSS_ten`).
- Web: `src/app/register/page.tsx` (form client), `src/lib/webApi.ts:324` (`auth.register`), `/auth/me` hiện **không** trả cờ admin; `src/app/layout.tsx` đang `lang="en"` dù UI tiếng Việt; **không có** `middleware`/`proxy` nên `/terms` và `/privacy` công khai được sẵn.
- `web/next.config.ts` chưa có `headers()`. API đã dùng `@fastify/helmet` (CSP tắt, HSTS mặc định) nên header cho `/api/*` đã có; cần header cho các trang Next.
- Plugin sandbox (`public/plugin-sandbox.html`) nạp cùng origin trong iframe `sandbox="allow-scripts"` (không có `allow-same-origin`), xem trước PDF dùng iframe `blob:`. `frame-ancestors 'self'` phù hợp cả hai; một CSP đầy đủ có thể làm hỏng chúng nên chỉ để **report-only**. Next 16: tra `web/node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md` trước khi viết `headers()` (theo `web/AGENTS.md`).
- `docs/ops/trien-khai.md` đã có từ 0.2; còn thiếu `su-co.md` và `bi-mat.md`.

## Các bước

### Bước 0 — Việc của chủ dự án (làm song song, không chặn mã)
1. **Xoay Dokploy key:** tạo key mới trong Dokploy, lưu vào `~/.config/noteriv/dokploy.key.new` (file mới, **chưa đè file cũ**). Báo tôi → tôi thử key mới (`compose.one`) → bạn xoá key cũ trong giao diện → tôi dùng key cũ (đọc từ `dokploy.key`) gọi thử, **phải ra 401** → rồi mới đổi tên `.new` thành `dokploy.key`.
2. Điền họ tên và email liên hệ vào bản nháp điều khoản khi tôi gửi (đây không phải tư vấn pháp lý).

### Bước 1 — Đăng ký có kiểm soát (nhánh `phase0/security` từ `main`)
- **Migration** `web/server/prisma/migrations/20261015120000_invite_codes/migration.sql` + `schema.prisma`:
  - bảng `invite_codes`: `id`, `code` (unique), `note`, `max_uses` (mặc định 1), `used_count` (0), `expires_at?`, `revoked_at?`, `created_by_id?` (FK `users`, SET NULL), `created_at`;
  - `users`: thêm `invite_code_id?` (FK SET NULL, để biết ai vào bằng mã nào), `terms_accepted_at?`, `terms_version?`.
- **Biến môi trường:** `REGISTRATION_MODE=invite|open|closed` (mặc định `invite`, đọc mỗi request; giá trị lạ → coi như `closed`, an toàn) và `ADMIN_EMAILS` (phân tách bằng dấu phẩy, không phân biệt hoa thường). Thêm vào `web/server/.env.example` và vào compose (`${REGISTRATION_MODE:-invite}`, `${ADMIN_EMAILS:-}`) để production không cần đặt `REGISTRATION_MODE`.
- **`routes/auth.ts`:**
  - `registerSchema` thêm `inviteCode?: string` và `acceptTerms: z.literal(true)`.
  - Trong cùng `$transaction` tạo user: nếu mode `invite`, tiêu thụ mã bằng `invite_codes.updateMany` với điều kiện nguyên tử `used_count < max_uses AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())` rồi `used_count + 1`; `count === 0` → hủy transaction trả `403 {"error":"invalid_invite"}` (một thông báo chung cho sai/hết hạn/đã dùng/bị thu hồi). Nếu tạo user lỗi (email trùng) transaction rollback nên **mã không bị mất**.
  - `closed` → `403 {"error":"registration_closed"}`; `open` → bỏ qua mã. `terms_accepted_at`, `terms_version` ghi theo hằng `TERMS_VERSION = "2026-10-15"`. `logAudit` ghi `register` kèm `inviteCodeId`.
  - Thêm `GET /api/v1/auth/registration` (công khai) → `{ mode }` để trang đăng ký biết có hiện ô mã mời không.
  - `/auth/me` thêm `isAdmin`.
- **Route quản trị mới** `routes/admin.ts` (`/api/v1/admin/*`, `preHandler: authenticate` + kiểm email trong `ADMIN_EMAILS`, không phải admin → 403): `GET /invites` (danh sách kèm `used_count`), `POST /invites` (`note`, `maxUses`, `expiresInDays?`; mã sinh bằng `crypto.randomBytes` từ bảng chữ cái dễ đọc, ví dụ 10 ký tự không có `0/O/1/I`), `DELETE /invites/:id` (thu hồi = đặt `revoked_at`, không xoá để còn dấu vết). Mọi thao tác ghi `logAudit`. Đăng ký route trong `src/index.ts`.
- **Giao diện:** `register/page.tsx` thêm ô "Mã mời" (khi `mode === "invite"`) và checkbox "Tôi đồng ý Điều khoản và Chính sách quyền riêng tư" kèm liên kết; bắt `invalid_invite`/`registration_closed` hiện thông báo tiếng Việt. `webApi.ts`: `auth.registration()`, `auth.register` thêm 2 trường, `admin.invites.{list,create,revoke}`. Trang mới `src/app/admin/invites/page.tsx` (bảng mã, nút tạo, sao chép mã, thu hồi; không phải admin → chuyển về `/vaults`); thêm mục "Mã mời" trong menu ứng dụng chỉ hiện khi `isAdmin` (đọc `AppMenu.tsx` khi làm).
- Người dùng cũ (1 user hiện có) **không bị ảnh hưởng**; `terms_accepted_at` của họ để trống, và lần đăng nhập sau có thể hỏi đồng ý (để sau, ghi vào "chưa làm" nếu không kịp).

### Bước 2 — Điều khoản và Quyền riêng tư
- Mới: `src/app/terms/page.tsx`, `src/app/privacy/page.tsx` — trang tĩnh, mỗi trang có **hai phần**: Tiếng Việt trước, English sau (thẻ `lang` đúng cho từng phần), nút/anchor chuyển nhanh. Nội dung nháp do tôi soạn dựa trên sự thật của hệ thống: dữ liệu lưu (email, tên hiển thị, hash mật khẩu, ghi chú, đính kèm, token đồng bộ đã mã hoá), nơi lưu (VPS riêng; sao lưu mã hoá age vào GitHub private mỗi đêm, giữ tối đa ~12 tháng), không bán dữ liệu, không quảng cáo, cookie đăng nhập (httpOnly), cách xuất (`/users/me/export`) và xoá tài khoản (`DELETE /users/me`, có cảnh báo: dữ liệu trong sao lưu cũ bị xoá dần theo vòng 12 tháng), liên hệ. Chủ thể: `[Họ tên chủ dự án]`, email `[email liên hệ]` — **chủ dự án điền và duyệt**; ghi rõ "đây không phải tư vấn pháp lý".
- Chân trang liên kết `/terms` `/privacy` trên login/register và trong menu ứng dụng. `layout.tsx`: `lang="vi"`.

### Bước 3 — Security headers
- `web/next.config.ts` thêm `async headers()` cho mọi đường dẫn: `Strict-Transport-Security: max-age=15552000` (**không** `includeSubDomains`, khớp helmet của API), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy: frame-ancestors 'self'` (bắt buộc), và `Content-Security-Policy-Report-Only` với chính sách đầy đủ (theo tài liệu Next 16) chỉ để quan sát. Không đặt `X-Frame-Options` riêng (đã có `frame-ancestors`).
- Sau khi bật, **kiểm bằng trình duyệt**: plugin chessboard (sandbox iframe) vẫn chạy, xem trước PDF (iframe `blob:`) vẫn hiện, WebSocket cộng tác vẫn nối; xem console có báo vi phạm report-only nào.

### Bước 4 — `npm audit`
- Chạy `npm audit` trong `web/`, `web/server/`, `web/pdf-service/`. Sửa mức **high/critical** bằng cập nhật không phá vỡ (`npm audit fix`, hoặc nâng đúng gói được chỉ ra). Nếu cần nâng major hoặc đổi API → dừng, báo chủ dự án các lựa chọn, không tự làm. Sau sửa: `npx tsc --noEmit` ở `web/` và `web/server/`, `npx next build`, `web/server/scripts/test-sync-scenarios.ts`, và `pdf-service` smoke (tải PDF thật). `package-lock.json` chỉ commit khi build qua.

### Bước 5 — Tài liệu vận hành
- Mới: `docs/ops/su-co.md` (tiếng Việt, cho người không chuyên: trang không vào được / `healthz` đỏ / đĩa đầy / sync lỗi / PDF lỗi / không đăng ký được; mỗi mục: xem gì trước, lệnh nào, khi nào khôi phục từ sao lưu, liên kết `giam-sat.md` và `sao-luu-khoi-phuc.md`), `docs/ops/bi-mat.md` (danh mục secret: **tên biến**, dùng ở đâu, lưu ở đâu, cách xoay, hậu quả khi mất — gồm `ENCRYPTION_KEY`, `JWT_*`, `POSTGRES_PASSWORD`, `GARAGE_*`, `PDF_SERVICE_TOKEN`, `BACKUP_*`, Dokploy key, khoá age, basic-auth staging, URL healthchecks; **không ghi giá trị**).
- Bổ sung `trien-khai.md` (thêm `REGISTRATION_MODE`, `ADMIN_EMAILS`, cách tạo mã mời), `giam-sat.md`/handoff nếu cần; cập nhật bảng "Trạng thái" 0.4 và file bàn giao (quy tắc đăng ký, trang pháp lý).
- Chép kế hoạch này sang `docs/plans/2026-10-15-phien-0-4-bao-mat-phap-ly.md`.

### Bước 6 — Thử trên staging, rồi lên production
1. Merge `phase0/security` vào `next`, **hỏi rồi push** (staging tự deploy; kèm các commit tài liệu đang chờ). Kiểm đĩa/RAM trước khi bật.
2. Chạy migration trên staging: `docker exec <api-staging> npx prisma migrate deploy`. Đặt env staging `ADMIN_EMAILS` (qua API Dokploy, chỉ in tên biến) rồi redeploy.
3. Kiểm trên staging (xem mục Kiểm chứng). Sau đó **hỏi rồi** merge vào `main`; trước khi production deploy, đặt env production: `ADMIN_EMAILS=duongsinhchess@gmail.com` (giữ `REGISTRATION_MODE` mặc định `invite`). Chạy `prisma migrate deploy` trên production; kiểm lại.
4. Merge `main` vào `next`. Tắt staging, xoá dữ liệu thử.

## Tệp chính sẽ tạo / sửa
- Sửa: `web/server/prisma/schema.prisma`, `web/server/src/routes/auth.ts`, `web/server/src/index.ts`, `web/server/.env.example`, `web/infra/docker-compose.prod.yml` (2 biến), `web/src/lib/webApi.ts`, `web/src/app/register/page.tsx`, `web/src/app/login/page.tsx`, `web/src/app/layout.tsx`, `web/next.config.ts`, `web/src/components/AppMenu.tsx`, các `package*.json` nếu audit cần.
- Mới: migration `20261015120000_invite_codes`, `web/server/src/routes/admin.ts`, `web/src/app/{terms,privacy}/page.tsx`, `web/src/app/admin/invites/page.tsx`, `docs/ops/{su-co,bi-mat}.md`, `docs/plans/2026-10-15-phien-0-4-bao-mat-phap-ly.md`.
- Tái dùng: `logAudit` (`lib/auditLog.ts`), `fastify.authenticate`, mẫu `clipTokenRoutes` (`routes/clipper.ts`) cho route danh sách/tạo/thu hồi, `bruteForceGuard`.

## Kiểm chứng (điều kiện "xong")
- Key Dokploy cũ trả 401; key mới dùng được.
- Đăng ký **không** mã mời → 403 `invalid_invite`; mã sai → 403; mã hợp lệ → 201 và `used_count` +1; dùng lại mã `max_uses=1` → 403; mã hết hạn/thu hồi → 403; thiếu `acceptTerms` → 400; email trùng **không** tiêu hao mã. `REGISTRATION_MODE=closed` → 403, `open` → 201 không cần mã.
- Người không phải admin gọi `/api/v1/admin/invites` → 403; chưa đăng nhập → 401; admin tạo/xem/thu hồi được, giao diện `/admin/invites` hoạt động.
- `/terms` và `/privacy` xem được khi chưa đăng nhập, đúng hai ngôn ngữ; checkbox đồng ý chặn đăng ký khi chưa tích.
- `curl -I https://noteriv.dsc.edu.vn` thấy đủ headers; plugin chessboard, xem trước PDF, cộng tác vẫn chạy (kiểm bằng trình duyệt thật).
- `npm audit` sạch mức high/critical ở cả ba thư mục (hoặc ghi rõ phần còn lại và lý do); build và kiểm thử qua.
- `su-co.md`, `bi-mat.md` đã có; production sau deploy: trang chủ 200, `healthz` 200, người dùng hiện có vẫn đăng nhập được.

## Điểm dừng để hỏi chủ dự án
Push `next`; merge vào `main` và đặt env production; chạy migration production; `npm audit` cần nâng major; nội dung điều khoản trước khi công bố; xoá dữ liệu thử.

## Rủi ro
- Đặt `REGISTRATION_MODE` sai/lạ mặc định đóng (an toàn) chứ không mở.
- CSP full bật enforce có thể làm hỏng plugin/PDF → **chỉ report-only** ở phiên này.
- Migration thêm cột nullable và bảng mới nên không khoá bảng `users` lâu và tương thích ngược; vẫn chạy trên staging trước.
- Sao lưu 02:00 sau khi lên production phải vẫn xanh (schema mới nằm trong dump).

## Chưa nằm trong phiên này
Sentry (hoãn); hỏi người dùng cũ đồng ý điều khoản khi đăng nhập; xác minh email/đặt lại mật khẩu qua email (cần máy chủ gửi thư); CSP enforce.

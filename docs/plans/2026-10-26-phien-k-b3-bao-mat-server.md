# Phiên K-B3: Bảo mật Server (Admin Email, MIME Attachments, Refresh Token Reuse, Collab Origin, Diagnostics, Account Deletion)

Ngày: 2026-10-26
Nhánh: `covuaduongsinh/k-b3-bao-mat-server`
Mục tiêu: Hoàn tất các hạng mục bảo mật máy chủ (M1, M2, M4, M5, L1, L2, L3, L6) theo báo cáo rà soát bảo mật `~/.config/noteriv/bao-mat-2026-10-26.md`.

---

## Các hạng mục triển khai

### 1. M1. `ADMIN_EMAILS` bắt buộc email đã xác minh
- File: `web/server/src/lib/registration.ts`, `web/server/src/routes/admin.ts`.
- Hiện trạng: `isAdmin(user)` chỉ kiểm tra `user.role === 'admin' || isAdminEmail(user.email)`. Nếu địa chỉ trong `ADMIN_EMAILS` chưa có tài khoản, kẻ tấn công đăng ký đúng địa chỉ đó sẽ lập tức chiếm quyền admin trước khi xác minh hộp thư.
- Khắc phục: `isAdmin` yêu cầu `user.role === 'admin' || (isAdminEmail(user.email) && user.emailVerifiedAt != null)`. Cập nhật query `select` ở `admin.ts` lấy thêm `emailVerifiedAt`.

### 2. M2. File đính kèm: Content-Disposition, MIME whitelist, CSP sandbox
- File: `web/server/src/routes/attachments.ts`.
- Hiện trạng: `GET /:vid/attachments/:aid/download` trả về `inline` với MIME do người upload chọn mà không kiểm tra; nguy cơ Stored XSS khi mở chia sẻ file đính kèm HTML/SVG.
- Khắc phục:
  - Whitelist `SAFE_INLINE_MIME_TYPES` (jpeg, png, gif, webp, avif, pdf, audio/*, video/*).
  - Loại không an toàn (SVG, HTML, JS, XML, ...) buộc trả `Content-Disposition: attachment; filename="..."` và `Content-Type: application/octet-stream`.
  - Bổ sung header an toàn: `Content-Security-Policy: default-src 'none'; sandbox` và `X-Content-Type-Options: nosniff`.
  - Chuẩn hoá ký tự `"` và xuống dòng trong filename.

### 3. M4. Refresh Token: Phát hiện dùng lại (Reuse Detection) & xoay vòng nguyên tử
- File: `web/server/src/routes/auth.ts`.
- Hiện trạng: Khi refresh token bị lộ và kẻ tấn công gửi lại token cũ đã bị thu hồi, hệ thống chỉ báo 401 mà không phát hiện dấu hiệu đánh cắp tài khoản; xoay vòng token dùng `update` thông thường.
- Khắc phục:
  - Chuẩn RFC 6819: Nếu refresh token hợp lệ về mặt chữ ký nhưng `revokedAt != null`, đây là dấu hiệu token bị chiếm đoạt -> lập tức thu hồi toàn bộ refresh token còn hiệu lực của `userId` đó và ghi cảnh báo audit.
  - Xoay vòng nguyên tử: `prisma.refreshToken.updateMany({ where: { id: stored.id, revokedAt: null }, data: { revokedAt: new Date() } })`. Nếu `count !== 1` (xảy ra xung đột đua), huỷ mọi token của user và trả 401.

### 4. M5. Collab WebSocket: Kiểm tra Origin & Giới hạn dung lượng tin nhắn
- File: `web/server/src/collab-server/index.ts`.
- Hiện trạng: Chưa kiểm tra `Origin` trong bắt tay HTTP upgrade (nguy cơ Cross-Site WebSocket Hijacking - CSWSH); `maxPayload` của ws nhận mặc định 100MB.
- Khắc phục:
  - Whitelist `Origin`: cho phép `APP_URL`, `ALLOWED_ORIGINS`, `noteriv.dsc.edu.vn`, `localhost`, `127.0.0.1`, `tauri://*`. Chặn origin lạ bằng HTTP 403.
  - Cấu hình `maxPayload: 2 * 1024 * 1024` (2MB).

### 5. L1. Endpoint `/api/v1/diagnostics` chỉ dành cho Admin
- File: `web/server/src/routes/diagnostics.ts`.
- Hiện trạng: Người dùng đăng nhập bất kỳ đều có thể đọc thông tin chi tiết hạ tầng (endpoint S3, trạng thái Redis/Worker, dung lượng đĩa).
- Khắc phục: Bổ sung preHandler kiểm tra `isAdmin(me)`, trả 403 nếu không phải admin.

### 6. L2. `DELETE /users/me` yêu cầu xác nhận mật khẩu
- File: `web/server/src/routes/users.ts`, `web/src/lib/webApi.ts`, `web/src/lib/account-actions.ts`, `web/src/app/vaults/page.tsx`, `web/src/components/TermsGate.tsx`.
- Hiện trạng: `DELETE /users/me` không đòi mật khẩu, chỉ cần cookie phiên là xoá toàn bộ dữ liệu.
- Khắc phục: Yêu cầu `{ password: string }` trong body, kiểm tra bằng `verifyPassword`. Cập nhật UI yêu cầu nhập mật khẩu xác nhận.

### 7. L3. Giới hạn số lần đăng nhập thất bại theo tài khoản (Account Lockout / Rate Limiting)
- File: `web/server/src/routes/auth.ts`.
- Khắc phục: Quản lý số lần đăng nhập sai theo email. Sau 5 lần thử sai liên tiếp trong 15 phút, khoá tạm thời yêu cầu đăng nhập đối với email đó (trả về 429). Reset khi đăng nhập đúng.

### 8. L6. Chạy container bằng user không đặc quyền (`USER node`)
- File: `web/server/Dockerfile`.
- Khắc phục: Thêm `USER node` trong runner image để không chạy Node dưới quyền root.

---

## Kế hoạch kiểm thử & nghiệm thu
1. Cập nhật `web/server/scripts/test-security.ts` để kiểm tra đơn vị:
   - `isAdmin` chỉ cấp quyền khi email đã verify.
   - Whitelist MIME an toàn và Content-Disposition inline vs attachment.
   - Kiểm tra `isAllowedOrigin` cho Collab server.
2. Chạy `npm --prefix web/server test` hoặc `npx tsx scripts/test-security.ts`.
3. Chạy `npm run typecheck` và `npm test` toàn bộ workspace.
4. Điều subagent `code-reviewer` rà soát độc lập.
5. Tạo PR và xin phép người dùng trước khi merge.

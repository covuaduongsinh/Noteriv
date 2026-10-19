# Phiên 5.4: Trang quản trị

> Ngày: 2026-10-19 · Chặng: [5](2026-10-17-chang-5-nen-tang-thuong-mai.md) · Nhánh: `covuaduongsinh/chang5-admin` (tách từ `covuaduongsinh/chang5-plans-done`, nên PR mang theo commit tài liệu "5.3 on production")

## Chủ dự án chốt

1. **Khoá có hiệu lực ngay.** Mọi request kiểm trạng thái khoá trong DB.
2. **Vai trò admin lưu trong DB**, cấp/thu trên giao diện. Email trong `ADMIN_EMAILS` luôn là admin và không bị thu trên giao diện.
3. **Thêm ba việc:** gửi liên kết đặt lại mật khẩu, đánh dấu email đã xác minh, xoá tài khoản.

## Đã làm

### Server

- **Migration `20261019180000_admin`:**
  - enum `UserRole`;
  - cột `users.role` (mặc định `user`) và `users.locked_at`;
  - chỉ mục `audit_logs(created_at)`.
- **`isAdmin({ role, email })`** (`lib/registration.ts`) = vai trò `admin` hoặc email nằm trong `ADMIN_EMAILS`.
  - Trang admin và `/auth/me` đọc vai trò từ DB, không còn tin email trong token. Nhờ vậy thu quyền có hiệu lực ngay, và đổi email không còn giữ quyền cũ thêm 15 phút.
- **Khoá:**
  - `authenticate` (`plugins/auth.ts`) đọc `lockedAt` ở mỗi request (truy vấn theo khoá chính) và trả 401 `account_locked`;
  - `refresh` từ chối;
  - `login` trả 403 `account_locked`, chỉ sau khi đúng mật khẩu (để không lộ cho người lạ rằng địa chỉ có tài khoản);
  - collab-server từ chối mở kết nối mới;
  - web clipper từ chối token của tài khoản bị khoá;
  - khi khoá, mọi refresh token bị thu hồi.
- **`lib/accounts.ts` `deleteAccount`:** tách từ `DELETE /users/me`, để admin dùng chung.
- **`routes/admin.ts`:**
  - `GET /admin/users` (tìm, 50 người mỗi trang, kèm mức dùng);
  - `GET /admin/plans`;
  - `PATCH /admin/users/:id`: gói, khoá, vai trò;
  - `POST …/password-reset`, `POST …/verify-email`;
  - `DELETE /admin/users/:id`;
  - `GET /admin/audit`: lọc theo hành động/email, phân trang bằng `before`.
  - **Chặn:** tự khoá, tự thu quyền, tự xoá; thu quyền admin từ `ADMIN_EMAILS`; xoá một admin.
  - **Audit:** `admin_user_locked/unlocked`, `admin_plan_assigned`, `admin_role_changed`, `admin_password_reset_sent`, `admin_email_verified`, `admin_user_deleted`; thêm `login_refused_locked`.
- **Sửa một lỗi cũ (phát hiện khi tách `deleteAccount`):**
  - audit `account_deleted` được ghi kèm `userId` của tài khoản vừa xoá, nên khoá ngoại làm lệnh ghi thất bại;
  - `logAudit` nuốt lỗi, nên **chưa bao giờ có dòng nào được lưu**;
  - nay ghi người bị xoá ở `resourceId`. Ảnh chụp trang Nhật ký xác nhận dòng `account_deleted` đã xuất hiện.

### Web

- **`components/AdminNav.tsx`:** ba thẻ Người dùng / Mã mời / Nhật ký. Trang `/admin/invites` dùng khung này.
- **`/admin`:**
  - tìm khi nhấn Enter, phân trang;
  - nhãn admin / locked / unverified; mức dùng; ô chọn gói;
  - Khoá/Mở khoá, cấp/thu quyền admin, "Send reset link", "Mark verified", "Delete" bấm hai lần;
  - nút nào không hợp lệ thì bị khoá, có chú thích.
- **`/admin/audit`:** lọc, bảng, "Load more".
- **Trang Vault:** liên kết "Administration (admin)" → `/admin`.
- **Trang đăng nhập:** báo tài khoản bị khoá, kèm email liên hệ.
- **Chữ mới:** `web.admin.*`, `web.auth.locked`, `web.vaultList.admin` (en + vi).

### Tài liệu

- `docs/ops/trien-khai.md`:
  - mục 7: vai trò admin, việc khoá, trang quản trị, xử lý yêu cầu hỗ trợ;
  - mục 9: đổi gói trên giao diện.
- `docs/getting-started/account.md`: mục "If your account is locked".

## Kiểm chứng

- `npm run typecheck` sạch; `npx tsc --noEmit` trong `web/server` sạch; `npm test`: 508 test đạt.
- **Migration** đã áp vào DB dev.
- **E2E mới `e2e/tests/admin.spec.ts`** (7 test, hai tài khoản):
  - người thường bị đưa khỏi `/admin`, API trả 403;
  - đổi gói: phía người dùng thấy gói mới;
  - "Mark verified";
  - khoá: request kế tiếp của người dùng nhận 401, đăng nhập thấy "locked"; mở khoá thì đăng nhập lại được;
  - "Send reset link" tạo thư trong outbox;
  - cấp quyền admin thì người dùng gọi được API admin, thu lại thì 403;
  - admin không tự khoá hay tự thu quyền được (API 400, nút bị khoá);
  - Nhật ký có `admin_user_locked`;
  - xoá bằng hai lần bấm, phiên của người bị xoá nhận 401.
- **E2E toàn bộ trên bản build production:** **ba lần liền 40/40** (build lại sau lần sửa chữ cuối cùng).
- **Ảnh chụp:** `/admin` (tiếng Anh) và `/admin/audit` (tiếng Việt), bố cục đúng. Sửa nhãn mức dùng từ "1 vaults" thành "Vaults 1 · … · Sync 0".

## Còn để sau

- Kết nối cộng tác **đang mở** của người bị khoá chỉ đứt khi token hết hạn (tối đa 15 phút), vì collab-server là tiến trình riêng.
- Audit của một admin đã bị xoá hiện người thực hiện là "—", vì khoá ngoại `SetNull`.
- Phân trang nhật ký theo thời gian: hai dòng cùng một mili-giây ở ranh giới trang có thể bị bỏ sót. Chấp nhận được với một trang tra cứu.

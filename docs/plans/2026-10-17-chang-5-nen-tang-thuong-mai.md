# Chặng 5: Nền tảng thương mại

> Ngày lập: 2026-10-17 · Trạng thái: **đang làm** (5.1 từ 2026-10-19) · Lộ trình: [2026-10-17-lo-trinh-thuong-mai.md](2026-10-17-lo-trinh-thuong-mai.md)
> **Phiên mới hãy đọc trước:** [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md)
> **Điều kiện bắt đầu:** Chặng 3 xong (nhất là 3.5 xung đột đồng bộ). Nên xong Chặng 4 (email, trang tài khoản cần đa ngôn ngữ).

## Mục tiêu

- Người lạ tự đăng ký, xác minh email, tự lấy lại mật khẩu, không cần admin.
- Máy chủ biết mỗi người dùng thuộc **gói** nào và chặn khi vượt **hạn mức**, độc lập với cách thu tiền (mô hình kinh doanh chưa chốt).
- Vận hành được khi có người dùng thật: biết khi có lỗi, biết sản phẩm được dùng thế nào, đúng luật quốc tế.

## Hiện trạng

- Không có gửi email. Đặt lại mật khẩu chỉ bằng `web/server/src/cli/reset-password.ts`. Không có `emailVerified`.
- Đăng ký: `web/server/src/lib/registration.ts` (`invite` mặc định, `open`, `closed`), model `InviteCode`.
- Hạn mức: chỉ `ATTACHMENT_QUOTA_BYTES_PER_VAULT` (500 MiB/vault) ở `web/server/src/lib/attachments.ts`.
- Admin: biến môi trường `ADMIN_EMAILS`, một trang `web/src/app/admin/invites/page.tsx`.
- Không có Sentry, không có đo lường; `/privacy` ghi "không đo hành vi".

---

## Phiên 5.1: Email và tài khoản

1. Chọn dịch vụ email giao dịch (Resend, Postmark hoặc Amazon SES; cân nhắc giá, độ tin cậy, miền gửi). Thêm module gửi email ở server, mẫu email đa ngôn ngữ (Chặng 4).
2. Xác minh email (cột `emailVerifiedAt`, token một lần, hết hạn). **Migration thêm cột vào `users`: áp trước khi deploy** (`docs/ops/trien-khai.md` mục 7).
3. Tự đặt lại mật khẩu (token một lần, rate limit, thu hồi mọi refresh token sau khi đổi). Giữ CLI cho admin.
4. Đổi email (xác minh địa chỉ mới).
5. Ghi `logAudit` cho các sự kiện trên.

## Phiên 5.2: Mở đăng ký

1. `REGISTRATION_MODE=open` (đã hỗ trợ) + Cloudflare Turnstile ở form đăng ký và quên mật khẩu.
2. Rate limit sẵn có (`@fastify/rate-limit`) cho các route mới.
3. Chưa xác minh email thì giới hạn (ví dụ không mời cộng tác, không tạo kết nối sync).

## Phiên 5.3: Gói và hạn mức

1. Model `Plan` (tên, hạn mức dạng JSON hoặc cột) và gán gói cho `User` (mặc định gói miễn phí). Hạn mức gợi ý (chốt con số khi chốt mô hình kinh doanh):
   - tổng dung lượng đính kèm **theo người dùng** (thay/kèm quota theo vault hiện có);
   - số vault; số kết nối sync; số người cộng tác mỗi vault; số snapshot lịch sử giữ lại;
   - hạn mức AI (dành chỗ cho sau ra mắt).
2. Kiểm **phía máy chủ** ở mọi route liên quan; lỗi trả mã rõ ràng, giao diện hiện thông báo dễ hiểu + chỗ nâng cấp (tạm dẫn tới trang "liên hệ").
3. Trang "Gói và mức dùng" trong Cài đặt: đang dùng bao nhiêu / hạn mức.
4. **Thanh toán chưa làm** ở chặng này: cắm vào sau khi chốt mô hình (đầu Chặng 6). Khuyến nghị bán quốc tế từ Việt Nam qua **merchant of record** (Paddle hoặc Lemon Squeezy); Stripe thường không nhận pháp nhân Việt Nam. Xác minh điều kiện lúc chọn.

## Phiên 5.4: Trang quản trị

1. Vai trò admin lưu trong DB (giữ `ADMIN_EMAILS` làm cách khởi tạo admin đầu tiên).
2. `/admin`: danh sách người dùng (tìm, khoá/mở, gán gói), mức dùng, mã mời (trang hiện có), nhật ký audit.
3. Mọi thao tác admin ghi `logAudit`.

## Phiên 5.5: Vận hành

1. Theo dõi lỗi: Sentry (dịch vụ) hoặc GlitchTip (tự host, tốn RAM VPS); cho web, API, worker, desktop. Lọc dữ liệu cá nhân trước khi gửi. (Quyết định treo từ phiên 0.3.)
2. Đo lường tôn trọng quyền riêng tư (Plausible, dịch vụ hoặc tự host): trang xem, đăng ký, giữ chân. Sửa câu "không đo hành vi" trong `/privacy` cho đúng.
3. Trang trạng thái công khai (UptimeRobot status page sẵn có).

## Phiên 5.6: Pháp lý quốc tế

1. Điều khoản và quyền riêng tư theo GDPR: cơ sở xử lý, quyền của người dùng (xuất/xoá: đã có `GET /users/me/export`, `DELETE /users/me`), danh sách bên xử lý phụ (email, Sentry, Plausible, nhà cung cấp máy chủ), DPA cho khách tổ chức.
2. Chính sách hoàn tiền và điều khoản thanh toán: soạn nháp, áp dụng khi bật thu phí.
3. Tăng `TERMS_VERSION`; người dùng cũ đồng ý lại theo cơ chế đã có.

### Xong khi (cả chặng)
- Một người lạ đăng ký, xác minh email, quên và lấy lại mật khẩu mà không cần admin.
- Vượt hạn mức bị chặn ở máy chủ, có thông báo dễ hiểu; admin đổi gói được.
- Lỗi production hiện trong công cụ theo dõi lỗi; số liệu sử dụng xem được.

## Ước lượng
4–6 buổi.

## Trạng thái

| Phiên | Trạng thái | Ngày | Commit / ghi chú |
|---|---|---|---|
| 5.1 Email và tài khoản | Xong, đã lên production | 2026-10-19 | PR #18, merge `4a03f9d`; Resend, xác minh, quên mật khẩu, đổi email; [bản ghi](2026-10-19-phien-5-1-email.md). Email tắt ở production cho tới khi chủ dự án tạo domain Resend và đặt env |
| 5.2 Mở đăng ký | Xong, đã lên production | 2026-10-19 | PR #19, merge `1118361`; Turnstile (đăng ký, quên mật khẩu), chặn 4 việc khi chưa xác minh, email chữ thường; production vẫn `invite`; [bản ghi](2026-10-19-phien-5-2-mo-dang-ky.md) |
| 5.3 Gói và hạn mức | Xong, đã lên production | 2026-10-19 | PR #20, merge `8bd78c8`; bảng `plans` + `users.plan_id`, free 10 vault / 1 GB / 3 kết nối / 50 bản lịch sử, CLI `cli/plan.ts`, Cài đặt → Plan and usage; [bản ghi](2026-10-19-phien-5-3-goi-han-muc.md) |
| 5.4 Trang quản trị | Xong, đã lên production | 2026-10-19 | PR #21, merge `dae66bb`; `users.role` + `users.locked_at`, khoá có hiệu lực ngay, `/admin` (người dùng, gói, khoá, quyền admin, đặt lại mật khẩu, xác minh, xoá), `/admin/audit`; [bản ghi](2026-10-19-phien-5-4-quan-tri.md) |
| 5.5 Vận hành | Chưa làm | | |
| 5.6 Pháp lý quốc tế | Chưa làm | | |

# Phiên 5.2: Mở đăng ký

> Ngày: 2026-10-19 · Chặng: [5](2026-10-17-chang-5-nen-tang-thuong-mai.md) · Nhánh: `covuaduongsinh/chang5-signup` (tách từ `covuaduongsinh/chang5-email-done`, nên PR mang theo commit tài liệu "5.1 on production")

## Chủ dự án chốt

1. **Production vẫn để `REGISTRATION_MODE=invite`.** Mã sẵn sàng cho `open`, nhưng chỉ bật khi đã có Resend, Turnstile và xong 5.6. Bật chỉ là đổi một biến môi trường.
2. **Cloudflare Turnstile ở đăng ký và quên mật khẩu.** Đăng nhập không có, vì đã có giới hạn 10 lần/phút.
3. **Tài khoản chưa xác minh bị chặn bốn việc:** đồng bộ (kể cả các lệnh GitHub), tải đính kèm, web clipper, xuất PDF.
4. **Email lưu và so khớp bằng chữ thường.**

## Đã làm

### Server

- **Email chữ thường:**
  - `emailField` trong `lib/registration.ts` (`trim` + `toLowerCase` rồi kiểm định dạng), dùng cho đăng ký, đăng nhập, quên mật khẩu và đổi email;
  - CLI `reset-password` cũng chuyển về chữ thường;
  - migration chỉ sửa dữ liệu `20261019140000_lowercase_emails` (cả `email_tokens.new_email`). Nếu có hai tài khoản chỉ khác chữ hoa, chỉ mục unique sẽ huỷ cả transaction.
- **Turnstile** (`lib/turnstile.ts`):
  - bật khi có đủ `TURNSTILE_SITE_KEY` và `TURNSTILE_SECRET_KEY`;
  - kiểm bằng `siteverify`, timeout 10 giây, **lỗi thì chặn**;
  - `register` và `forgot-password` nhận `captchaToken` và kiểm trước khi đọc DB, nên bot không dò được cả "email đã có";
  - `GET /auth/registration` trả `turnstileSiteKey`, nên đổi key không cần build lại web.
- **Chặn tài khoản chưa xác minh** (`lib/emailGate.ts`, preHandler `requireVerifiedEmail`):
  - gắn vào: `POST /:vid/sync-connections`, 4 route `/:vid/github/*`, `POST /:vid/attachments`, `POST /me/clip-tokens`, `POST /:vid/notes/:nid/pdf`;
  - trả 403 `email_unverified` và ghi audit `blocked_unverified`;
  - **chỉ chặn khi email đang bật**, để không khoá ai khi email còn tắt.

### Web

- **Widget** `components/TurnstileWidget.tsx`:
  - tải script Cloudflare một lần;
  - theo ngôn ngữ giao diện; cỡ `compact` khi màn hình dưới 640 px;
  - `reset` sau mỗi lần gửi lỗi, vì mỗi token chỉ dùng được một lần.
- **Trang đăng ký và quên mật khẩu:** hiện widget khi server gửi site key. Nút gửi chờ đến khi kiểm tra qua, và thẻ nới lên 22 rem để vừa widget.
- **Câu "Verify your email first"** (`web.account.verifyFirst`) hiện ở:
  - Đồng bộ;
  - trình quản lý đính kèm;
  - web clipper;
  - xuất và xem trước PDF.
- **Nhập vault:** gặp lỗi chưa xác minh thì không thử tải tiếp, mỗi tệp còn lại ghi lý do "email not verified yet" (giống cách xử lý khi hết dung lượng).
- **CSP report-only:** thêm `https://challenges.cloudflare.com` vào `script-src`, `frame-src`, `connect-src`.
- **`/privacy` (en + vi):** thêm Cloudflare Turnstile.

### Hạ tầng và tài liệu

- **Cấu hình:** compose production và `.env.example` thêm `TURNSTILE_SITE_KEY` và `TURNSTILE_SECRET_KEY`.
- **Tài liệu người dùng:**
  - `getting-started/account.md`: mục mới "Before your email is verified", ghi email không phân biệt chữ hoa/thường, và có bước kiểm tra chống bot;
  - `installation.md`: đăng ký có hoặc không có mã mời; bước kiểm tra chống bot;
  - một dòng ở mỗi trang `attachments-and-trash.md`, `web-clipper.md`, `sync/index.md`, `import-export.md`.
- **Tài liệu vận hành:**
  - `docs/ops/trien-khai.md` mục 7: điều kiện trước khi bật `open`, Turnstile, việc chặn, email chữ thường;
  - `bi-mat.md`: `TURNSTILE_SECRET_KEY`.

## Kiểm chứng

- `npm run typecheck` sạch; `npx tsc --noEmit` trong `web/server` sạch; `npm test`: 508 test đạt.
- **Migration:** trên DB dev có 0 email trùng và 0 email có chữ hoa; đã áp.
- **E2E mới trong `account.spec.ts`** (nay có 7 test):
  - tài khoản chưa xác minh bị chặn đủ 4 việc qua API (403 `email_unverified`, kể cả lệnh GitHub);
  - trình quản lý đính kèm hiện câu "Verify your email first";
  - sau khi xác minh thì tải đính kèm được (201);
  - đăng nhập bằng email viết HOA được; đăng ký lại cùng email khác chữ hoa thì nhận 409.
- **E2E toàn bộ trên bản build production, Turnstile tắt (29 test):**
  - lượt đầu: hai lần 29/29, một lần hỏng 1 test "Getting started vault" ở bước giao diện. Log API không có lỗi và mọi lượt đăng ký đều tạo vault mẫu. Chạy riêng `core-flows` thêm 3 lần: đều đạt. Coi là chập chờn; ảnh lỗi đã bị lần chạy sau ghi đè nên chưa rõ nguyên nhân;
  - chạy lại: **ba lần liền 29/29**.
- **Bật Turnstile bằng key thử của Cloudflare** (widget thật, qua mạng Cloudflare):
  - E2E toàn bộ đạt **29/29**, sau khi sửa hai lệnh gọi API trực tiếp trong test cho có gửi token giả của Cloudflare. Đây là lỗi của test, không phải của mã;
  - sau khi sửa test, chưa chạy lại toàn bộ ở chế độ Turnstile tắt. Khi Turnstile tắt, server bỏ qua token đó; CI sẽ chạy ở chế độ này;
  - `curl` không có token: `register` và `forgot-password` đều trả `captcha_failed`;
  - gọi thẳng `verifyTurnstile`: secret thử "luôn trượt" → false, "luôn đạt" → true, không có token → false.
- **Thử tay:**
  - màn hình trang đăng ký có widget: tiếng Anh, tiếng Việt, và tiếng Việt ở bề rộng 390 px (widget cỡ gọn); nút "Sign up" khoá cho tới khi đủ điều kiện;
  - `REGISTRATION_MODE=open`: không có ô mã mời; đăng ký được và vào `/vaults`.
- **Dọn dẹp:** đã xoá tài khoản thử còn sót trong DB dev.
- **CI lần đầu (PR #19): job `e2e` hỏng vì hai lỗi, đã sửa:**
  1. **Test của phiên này:** CI không có S3, nên sau khi xác minh, tải đính kèm trả 500 thay vì 201. Test giờ kiểm "không còn 403 `email_unverified`", không phụ thuộc kho lưu trữ.
  2. **Lỗi có từ 4.7 (`web/src/components/Ribbon.tsx`):**
     - menu "More tools" được vẽ một khung hình ở vị trí mặc định (`bottom: 8`, đè lên thanh dưới của điện thoại), rồi một `useEffect` mới đặt lại vị trí;
     - test điện thoại đo trúng khung hình đó: menu kết thúc ở 836 = 844 − 8;
     - sửa bằng `useLayoutEffect`: vị trí được tính trước khi trình duyệt vẽ, người dùng cũng không còn thấy menu nháy.
  - Sau khi sửa: build lại bản production, E2E toàn bộ **ba lần liền 29/29**.
  - Hai test chập chờn trên CI (đạt khi chạy lại) không liên quan tới phiên này: "reloading restores the open tabs" và "open a vault and two notes while online".

## Việc của chủ dự án

- Cloudflare dashboard → **Turnstile → Add widget**:
  - hostname `noteriv.dsc.edu.vn` và `staging-noteriv.dsc.edu.vn`;
  - chế độ *Managed*;
  - lưu secret vào `~/.config/noteriv/turnstile.key`.
- Rồi đặt `TURNSTILE_SITE_KEY` và `TURNSTILE_SECRET_KEY` trong env Dokploy và deploy lại. Claude làm được nếu chủ dự án cho phép; key đọc từ file, không in ra.
- Resend: các bước trong bản ghi 5.1.
- **Bật `open`:** khi đủ các điều kiện ở `docs/ops/trien-khai.md` mục 7.

## Còn để sau

- Tự xoá tài khoản chưa xác minh sau N ngày: để 5.5 (vận hành).
- Hạn mức theo gói: 5.3.

# Danh mục bí mật của Noteriv

> Dành cho chủ dự án và các phiên Claude. Cập nhật: 2026-10-15 (Phiên 0.4). **File này chỉ ghi tên, nơi cất và cách xoay; không bao giờ ghi giá trị.** Khi cần đọc một giá trị, đọc từ nơi cất, không dán vào chat, tài liệu hay commit.

## 1. Bí mật của máy chủ (nằm trong env compose trên Dokploy)

Production: compose `noteriv-prod`; staging: `noteriv-staging` (**giá trị riêng, sinh mới**, không dùng lại). Bản sao mã hoá của các giá trị production nằm trong `secrets.env.age` của mỗi bản sao lưu (xem [`sao-luu-khoi-phuc.md`](sao-luu-khoi-phuc.md)).

| Tên biến | Dùng ở đâu | Nếu mất | Nếu lộ / cách xoay |
|---|---|---|---|
| `POSTGRES_PASSWORD` | postgres, api, worker, collab, backup | Lấy lại từ `secrets.env.age` (cần khoá age) | Lộ: đổi mật khẩu trong Postgres (`ALTER USER noteriv …`), đổi env, deploy lại. Thử trên staging trước |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | api (ký token đăng nhập), collab (kiểm token) | Không mất dữ liệu; mọi người phải đăng nhập lại | Đổi env, deploy lại → **mọi phiên bị đăng xuất** |
| `ENCRYPTION_KEY` | api, worker (mã hoá token đồng bộ GitHub/WebDAV) | **Không giải mã được token đồng bộ đã lưu** → người dùng phải kết nối lại. Phải lấy từ `secrets.env.age` | Đổi = cùng hậu quả như mất. Chỉ đổi khi bắt buộc, báo người dùng trước |
| `GARAGE_RPC_SECRET`, `GARAGE_ADMIN_TOKEN` | garage (file cấu hình sinh lúc khởi động) | Lấy lại từ `secrets.env.age` | Đổi cùng lúc với tạo lại cấu hình Garage; thử trên staging, vì ảnh hưởng cụm lưu trữ |
| `ATTACHMENTS_S3_ACCESS_KEY_ID`, `ATTACHMENTS_S3_SECRET_ACCESS_KEY` | api, worker, backup (truy cập kho đính kèm) | Tạo lại bằng `web/infra/garage-bootstrap.sh` (secret chỉ hiện một lần) | Tạo key mới (`garage key create`), đưa vào env, deploy, rồi xoá key cũ |
| `PDF_SERVICE_TOKEN` | api và pdf (xác thực giữa hai dịch vụ nội bộ) | Không mất dữ liệu | Đổi một giá trị trong env, deploy lại (cả hai dịch vụ đọc cùng biến) |
| `BACKUP_AGE_RECIPIENT` | backup (khoá **công khai** age) | Không bí mật | — |
| `BACKUP_DEPLOY_KEY_B64` | backup (đẩy vào repo `noteriv-backups`) | Tạo lại | Xem mục 6 của `sao-luu-khoi-phuc.md` |
| `BACKUP_HEALTHCHECK_URL` | backup (ping healthchecks.io) | Tạo lại check | Lộ = ai đó gửi được tín hiệu "ổn" giả; tạo URL mới trên healthchecks.io |
| `REGISTRATION_MODE`, `ADMIN_EMAILS` | api | — | Không phải bí mật nhưng quyết định ai đăng ký/quản trị được; chỉ sửa trong Dokploy |
| `TURNSTILE_SECRET_KEY` (từ phiên 5.2; `TURNSTILE_SITE_KEY` đi kèm là công khai) | api (kiểm tra chống bot ở đăng ký, quên mật khẩu) | Không mất dữ liệu; thiếu một trong hai key thì kiểm tra tắt | Lộ = người khác hỏi Cloudflare thay mình, không vượt được kiểm tra. Xoay secret trong Cloudflare dashboard → Turnstile, đưa vào env, deploy lại |
| `RESEND_API_KEY` (từ phiên 5.1) | api (gửi thư tài khoản qua Resend) | Không mất dữ liệu; thư ngừng gửi (quên mật khẩu, xác minh) cho tới khi có key mới | Lộ = người khác gửi thư dưới tên miền của mình. Tạo key mới (quyền *Sending access*) trên resend.com, đưa vào env, deploy lại, rồi xoá key cũ |

## 2. Bí mật của chủ dự án (nằm trên máy cá nhân, `~/.config/noteriv/`)

| File | Là gì | Nếu mất | Nếu lộ / cách xoay |
|---|---|---|---|
| `backup-age.key` | **Khoá bí mật age** giải mã mọi bản sao lưu | **Không khôi phục được gì.** Phải có 2 bản cất riêng (trình quản lý mật khẩu + USB/bản in) | Xem mục 6 của `sao-luu-khoi-phuc.md` (tạo cặp mới, xoá nhánh sao lưu cũ nếu khoá cũ đã lộ) |
| `dokploy.key` | Dokploy API key (điều khiển deploy, env, domain) | Tạo key mới trong Dokploy | Lộ = người khác đọc được toàn bộ env (kể cả secret ở mục 1). **Xoay ngay**: tạo key mới → thử → xoá key cũ trong Dokploy. Một key cũ đã lộ trong chat ngày 2026-10-14 nên phải được xoay trong Phiên 0.4; xem bảng Trạng thái của Giai đoạn 0 để biết đã xoay xong chưa |
| `staging-basic-auth.txt` | `user:mật-khẩu` vào staging | Đặt lại, băm lại | Đổi file, rồi nhờ phiên Claude băm lại (`openssl passwd -apr1`) vào `/etc/dokploy/traefik/dynamic/noteriv-staging.yml` |
| `backup-deploy-key.pub` | Phần **công khai** của deploy key | — | — |

## 3. Bí mật trên VPS (ngoài Dokploy)

| Vị trí | Là gì | Ghi chú |
|---|---|---|
| `/etc/noteriv/check-host.env` (quyền 600) | URL ping check `noteriv-host` | Lộ = ping giả. Tạo URL mới trên healthchecks.io và sửa file |
| `/etc/dokploy/traefik/dynamic/noteriv-staging.yml` (quyền 600) | Hash mật khẩu basic-auth staging | Hash, không phải mật khẩu gốc |
| Khoá SSH root vào VPS | Quyền toàn máy | Nếu nghi lộ, thay khoá `authorized_keys` ngay |

## 4. Bí mật ở dịch vụ ngoài

- **GitHub:** hai webhook của repo `Noteriv` có URL chứa token deploy của Dokploy (production và staging). Lộ = ai đó kích deploy được. Đổi bằng cách tạo lại token compose trong Dokploy rồi cập nhật webhook.
- **GitHub deploy key** của repo `noteriv-backups` (quyền ghi, chỉ repo đó).
- **healthchecks.io, UptimeRobot:** tài khoản của chủ dự án; bật xác thực hai bước.
- **Resend** (từ phiên 5.1): tài khoản của chủ dự án, giữ domain gửi thư `noteriv.dsc.edu.vn`; bật xác thực hai bước. Bản key cục bộ: `~/.config/noteriv/resend.key`.
- **Sentry** (từ phiên 5.5): tài khoản của chủ dự án, vùng dữ liệu EU; bật xác thực hai bước. `SENTRY_DSN` chỉ cho phép *gửi* lỗi vào project (trang web nào cũng thấy nó), không đọc được gì. Lộ DSN thì người khác có thể gửi lỗi giả làm tốn hạn mức: tạo key mới trong Project Settings → Client Keys, đặt env, deploy lại, rồi tắt key cũ. Bản cục bộ: `~/.config/noteriv/sentry.dsn`.

## 5. Phụ thuộc có cảnh báo `npm audit` chưa vá được (đã chấp nhận, ngày 2026-10-15)

- `web/server`: `prisma` → `@prisma/config` → `deepmerge-ts` (mức high, "stack exhaustion khi gộp đối tượng đệ quy"). **Chưa có bản Prisma nào vá được**: 6.19.3 và 7.10.0 đều ghim `deepmerge-ts@7.1.5`; 8.0.0 mới là bản thử nghiệm và vẫn nằm trong dải bị cảnh báo. Lỗi nằm trong công cụ dòng lệnh Prisma (đọc cấu hình), không xử lý dữ liệu do người dùng gửi lên, nên không khai thác được từ bên ngoài. **Xem lại** khi Prisma ra bản ổn định dùng `deepmerge-ts` ≥ 8.
- `web/server`: `fast-xml-parser` (mức moderate, tiêm CDATA khi **tạo** XML); vá cần nâng major 5. Mã chỉ dùng `XMLParser` để **đọc** phản hồi WebDAV (`lib/webdavSync.ts`), không gọi `XMLBuilder`, nên lỗi không chạm tới. Xem lại cùng đợt nâng phụ thuộc.
- `web`: 2 cảnh báo mức low qua `mermaid` → `katex`; bỏ qua.
- `web/pdf-service`: đã nâng `puppeteer-core` lên 25, hết cảnh báo.
- Chạy lại `npm audit --omit=dev` ở `web/`, `web/server/`, `web/pdf-service/` mỗi quý hoặc trước khi mời thêm người dùng.

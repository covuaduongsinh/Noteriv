# Triển khai Noteriv: staging trước, production sau

> Cập nhật: 2026-10-15 (Phiên 0.2). Bản đầy đủ (kèm xử lý sự cố) sẽ hoàn thiện ở Phiên 0.4.

## 1. Hai môi trường

| | Production | Staging |
|---|---|---|
| Địa chỉ | `https://noteriv.dsc.edu.vn` | `https://staging-noteriv.dsc.edu.vn` (basic-auth) |
| Dokploy compose | `3tKquEXFX1KEN2EueeUGm` (`noteriv-prod`) | `klW9MC4cRpRHiPHMcMwIq` (`noteriv-staging`) |
| Nhánh git | `main` | `next` |
| File compose | `web/infra/docker-compose.prod.yml` (dùng chung) | như bên trái |
| Tiền tố container | `compose-parse-mobile-card-ue7dq8-` | `compose-generate-cross-platform-alarm-cdil47-` |
| Trạng thái thường | Luôn chạy | **Tắt** (chỉ bật khi cần thử) |
| Sao lưu | Có (`noteriv-backup`, 02:00) | **Không** (`BACKUP_REPLICAS=0`, không có khoá backup) |
| Secret | Riêng | Riêng, sinh mới. Không dùng lại của production |

Khác biệt giữa hai môi trường nằm hết trong **env của compose trên Dokploy**: `PUBLIC_ORIGIN`, `PUBLIC_WS_ORIGIN`, `BACKUP_REPLICAS` (mặc định là giá trị production, nên production không cần đặt).

## 2. Bật, tắt staging

- Dokploy → compose `noteriv-staging` → **Start / Stop**. Hoặc API: `compose.start`, `compose.stop` với header `x-api-key` (key ở `~/.config/noteriv/dokploy.key`).
- Staging dùng khoảng 0,6GB RAM khi rảnh (giới hạn tổng ≈ 3GB). Trước khi bật kiểm `free -m` và `df -h /` trên VPS; **đĩa ≥ 92% thì dừng và hỏi chủ dự án**.
- Push vào `next` sẽ tự deploy staging (kể cả khi đang tắt thì deploy sẽ bật nó lên): xong việc thì tắt lại.
- **Cơ sở dữ liệu staging có thể trống mỗi lần dựng lại** (2026-10-16: 0 người dùng, 0 vault dù trước đó đã đăng ký). Đăng ký chỉ bằng mã mời, nên khi bật staging để thử tay: tạo mã mời bằng `psql` trên container postgres staging (`insert into invite_codes (id, code, note, max_uses, expires_at) values (gen_random_uuid(), '<mã 10 ký tự, bảng chữ cái không có 0/O/1/I/L>', 'ghi chú', 1, now() + interval '2 days')`), rồi chủ dự án tự đăng ký (mật khẩu do chính họ đặt). Không dùng dữ liệu staging để giữ ghi chú thật.
- **Mở staging trong Chrome:** nhập basic-auth một lần trong cửa sổ ẩn danh; địa chỉ không có dấu chấm cuối (`…dsc.edu.vn.` gây `ERR_SSL_PROTOCOL_ERROR`). Phiên Claude không nhập được mật khẩu vào hộp này (hộp của trình duyệt, ngoài máy local), nên chủ dự án tự làm bước đăng nhập rồi chụp màn hình.

## 3. Quy trình git

1. Việc Giai đoạn 0 và sửa lỗi production: nhánh `phase0/...` hoặc `fix/...` từ `main`.
2. Cần thử: merge nhánh đó vào `next`, push → staging tự deploy. Thử bằng tài khoản thử.
3. Đạt thì (sau khi chủ dự án đồng ý) merge nhánh vào `main` → production tự deploy (5–8 phút).
4. Sau mỗi thay đổi lên `main`: **merge `main` vào `next`** (một chiều).
5. Tái cấu trúc (Giai đoạn 1 trở đi) làm trên `next`; chỉ gộp `next` vào `main` ở mốc đã duyệt.
6. Không bao giờ force-push `main`.

Migration Prisma: chạy trên staging trước (`docker exec <api-staging> npx prisma migrate deploy`), rồi mới production.

## 4. Khởi tạo staging từ đầu (nếu phải dựng lại)

1. Compose mới trên Dokploy: nguồn git `https://github.com/covuaduongsinh/Noteriv.git`, nhánh `next`, đường dẫn `web/infra/docker-compose.prod.yml`, hai domain `staging-noteriv.dsc.edu.vn` (web → `noteriv-web:3000`, `/collab` → `noteriv-collab:4002`).
2. Env: `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `GARAGE_RPC_SECRET`, `GARAGE_ADMIN_TOKEN`, `PDF_SERVICE_TOKEN` (mỗi cái sinh ngẫu nhiên mới), `PUBLIC_ORIGIN=https://staging-noteriv.dsc.edu.vn`, `PUBLIC_WS_ORIGIN=wss://staging-noteriv.dsc.edu.vn`, `BACKUP_REPLICAS=0`. **Không** đặt `BACKUP_*` khác.
3. Sau lần deploy đầu: `docker exec <api-staging> npx prisma migrate deploy`; chạy `web/infra/garage-bootstrap.sh` (`GARAGE_CONTAINER=<garage-staging>`), đưa `ATTACHMENTS_S3_ACCESS_KEY_ID/SECRET_ACCESS_KEY` vào env Dokploy rồi redeploy.
4. Bảo vệ: file `/etc/dokploy/traefik/dynamic/noteriv-staging.yml` trên VPS (basic-auth + `X-Robots-Tag: noindex`). Nó định nghĩa hai router ưu tiên cao (`priority` 10000 và 10001) trỏ vào service `<tiền-tố>-18-websecure@docker` và `<tiền-tố>-19-websecure@docker` do Dokploy sinh ra. **Số 18, 19 là chỉ số domain**: nếu xoá/tạo lại domain thì đọc lại nhãn Traefik (`docker inspect` container `noteriv-web`/`noteriv-collab` của staging) và sửa file. Mật khẩu: băm `openssl passwd -apr1` từ `~/.config/noteriv/staging-basic-auth.txt`, không ghi giá trị vào repo hay chat. File chứa hash nên đặt `chmod 600`.

## 5. Kiểm sau mỗi lần deploy staging

- `https://staging-noteriv…` không mật khẩu → 401; có mật khẩu → 200 và header `X-Robots-Tag`.
- `https://noteriv.dsc.edu.vn` vẫn 200, không bị hỏi mật khẩu.
- Menu Developer → Chẩn đoán: DB, Redis, storage, worker, PDF đều xanh.
- `docker ps | grep cdil47`: **không có** container `noteriv-backup`.
- `docker exec <web-staging> getent hosts noteriv-api` ra IP của api **staging** (không phải production).
- `curl -u user:… https://staging-noteriv.dsc.edu.vn/api/v1/healthz` → `{"ok":true}` (200). Production: `curl https://noteriv.dsc.edu.vn/api/v1/healthz`. Giám sát: xem [`giam-sat.md`](giam-sat.md).

## 6. Lưu ý

- Dữ liệu staging chỉ là dữ liệu thử. Khi diễn tập khôi phục dùng dữ liệu thật, phải xoá ngay sau đó.
- Staging chia sẻ VPS với ERPNext và dịch vụ khác: mọi container đều có `mem_limit`. Build image staging tốn thêm vài GB đĩa (lần đầu ~5GB).

## 7. Đăng ký và quản trị (từ Phiên 0.4)

- `REGISTRATION_MODE` (env của `noteriv-api`): `invite` (mặc định, cần mã mời), `open` (ai cũng đăng ký) hoặc `closed` (đóng). **Giá trị lạ hoặc rỗng = đóng**, để gõ sai không vô tình mở đăng ký. Đổi trong Dokploy rồi deploy lại.
- **Trước khi bật `open` ở production** (chủ dự án chốt ở phiên 5.2: giữ `invite` tới lúc đủ các điều kiện sau):
  - đã bật email (mục 8), để người mới xác minh được địa chỉ;
  - đã bật Turnstile (dưới đây);
  - xong phiên 5.6 (điều khoản và quyền riêng tư quốc tế);
  - sao lưu tay ngay trước khi đổi.
  Đổi bằng cách đặt `REGISTRATION_MODE=open` trong env Dokploy rồi deploy lại; quay về `invite` cũng vậy.
- **Turnstile** (Cloudflare, từ phiên 5.2): kiểm tra chống bot ở form đăng ký và quên mật khẩu. Bật khi có đủ `TURNSTILE_SITE_KEY` (công khai, trang lấy qua `GET /api/v1/auth/registration`) và `TURNSTILE_SECRET_KEY` (bí mật). Tạo widget trong Cloudflare dashboard → Turnstile, chế độ *Managed*, hostname `noteriv.dsc.edu.vn` và `staging-noteriv.dsc.edu.vn`. Cloudflare không trả lời thì form từ chối (lỗi thì chặn). Key thử luôn đạt để chạy E2E tại máy: site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.
- **Tài khoản chưa xác minh** (từ phiên 5.2, chỉ khi email đang bật): không tạo được kết nối đồng bộ và lệnh GitHub, không tải đính kèm, không tạo token web clipper, không xuất PDF (403 `email_unverified`, audit `blocked_unverified`). Mã: `web/server/src/lib/emailGate.ts`.
- **Email lưu bằng chữ thường** (từ phiên 5.2, `emailField` trong `web/server/src/lib/registration.ts`; migration `20261019140000_lowercase_emails`, chỉ sửa dữ liệu, áp trước khi deploy).
- `ADMIN_EMAILS` (cùng chỗ): danh sách email (cách nhau dấu phẩy) được quản lý mã mời. Rỗng = không ai là admin. Production: `duongsinhchess@gmail.com`.
- Tạo mã mời: đăng nhập bằng email admin → **Vault của bạn → Quản lý mã mời** (`/admin/invites`) → nhập ghi chú, số lượt dùng, số ngày hiệu lực → **Tạo mã** → **Chép mã** gửi cho người được mời. Thu hồi bằng nút **Thu hồi** (mã không bị xoá, chỉ vô hiệu).
- Mỗi lần đăng ký lưu `invite_code_id` và thời điểm + phiên bản điều khoản đã đồng ý (`terms_accepted_at`, `terms_version`). Khi sửa điều khoản đáng kể, đổi `TERMS_VERSION` ở **cả** `web/server/src/lib/registration.ts` và `web/src/lib/legal.ts`.
- Trang `/terms` và `/privacy` hiện nhãn **Bản nháp** cho tới khi điền `OPERATOR_NAME` và `CONTACT_EMAIL` trong `web/src/lib/legal.ts`.
- Migration `20261015120000_invite_codes` (đã áp dụng ở production ngày 2026-10-15). **Quy tắc rút ra:** khi migration chỉ *thêm* bảng/cột nullable mà mã mới đọc cột đó ở mọi truy vấn (ở đây là `users`), áp migration **trước** khi deploy (sao lưu thủ công, rồi `psql -1` file `migration.sql` vào Postgres), deploy, rồi `prisma migrate resolve --applied <tên>` để Prisma ghi nhận. Nếu làm ngược lại, đăng nhập lỗi cho tới khi migration chạy. Staging thì chạy `migrate deploy` bình thường.

## 8. Email tài khoản (từ Phiên 5.1)

- Thư xác minh email, đặt lại mật khẩu và xác nhận đổi email gửi qua **Resend** từ `no-reply@noteriv.dsc.edu.vn`. Mã: `web/server/src/lib/email/` (gửi, mẫu thư en/vi), `lib/emailTokens.ts` (token một lần), `lib/accountEmails.ts`.
- Biến của `noteriv-api` (đặt trong env compose Dokploy):
  - `EMAIL_PROVIDER`: `resend` để bật; `file` (ghi thư ra `EMAIL_OUTBOX_DIR`, chỉ dùng cho dev/E2E); rỗng = **tắt** (giao diện ẩn "Forgot password?", trang Quên mật khẩu báo chưa có).
  - `RESEND_API_KEY`: bí mật (xem `bi-mat.md`). Thiếu key thì coi như tắt.
  - `EMAIL_FROM`: mặc định `Noteriv <no-reply@noteriv.dsc.edu.vn>`. Đổi khi đổi tên miền ở Chặng 6 (thêm domain mới vào Resend trước).
  - `APP_ORIGIN`: gốc của liên kết trong thư; compose đặt bằng `PUBLIC_ORIGIN`, nên staging tự trỏ về staging.
- **DNS:** domain `noteriv.dsc.edu.vn` phải được Resend xác minh (các bản ghi SPF, DKIM, MX mà Resend đưa ra trong mục Domains). Chưa xác minh thì Resend trả lỗi 403 và log API có dòng `email not sent` (không có nội dung thư).
- **Thử nhanh** (staging): bấm **Forgot password?** với email của mình, xem thư tới; hoặc đăng ký tài khoản thử và xem thư xác minh.
- **Hạn và giới hạn:** liên kết xác minh và đổi email 24 giờ, đặt lại mật khẩu 1 giờ, mỗi liên kết dùng một lần; mỗi người một thư mỗi loại mỗi phút; `forgot-password` 5 lần/phút/IP. Đổi mật khẩu hay đổi email thì mọi phiên bị thu hồi (token truy cập cũ còn sống tối đa 15 phút).
- **Khi email hỏng hoặc người dùng không nhận được thư:** vẫn đặt lại mật khẩu bằng CLI như cũ (đầu file `web/server/src/cli/reset-password.ts`).
- Migration `20261019120000_email_accounts` thêm cột `users.email_verified_at` (tài khoản có sẵn được ghi là đã xác minh) và bảng `email_tokens`. Như mục 7: áp **trước** khi deploy ở production.
- Dev/E2E: chạy API với `EMAIL_PROVIDER=file`; thư nằm ở `web/server/.email-outbox/` (đã gitignore), `e2e/tests/account.spec.ts` đọc liên kết từ đó.

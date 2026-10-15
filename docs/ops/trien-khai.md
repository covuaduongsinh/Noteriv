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
- `ADMIN_EMAILS` (cùng chỗ): danh sách email (cách nhau dấu phẩy) được quản lý mã mời. Rỗng = không ai là admin. Production: `duongsinhchess@gmail.com`.
- Tạo mã mời: đăng nhập bằng email admin → **Vault của bạn → Quản lý mã mời** (`/admin/invites`) → nhập ghi chú, số lượt dùng, số ngày hiệu lực → **Tạo mã** → **Chép mã** gửi cho người được mời. Thu hồi bằng nút **Thu hồi** (mã không bị xoá, chỉ vô hiệu).
- Mỗi lần đăng ký lưu `invite_code_id` và thời điểm + phiên bản điều khoản đã đồng ý (`terms_accepted_at`, `terms_version`). Khi sửa điều khoản đáng kể, đổi `TERMS_VERSION` ở **cả** `web/server/src/lib/registration.ts` và `web/src/lib/legal.ts`.
- Trang `/terms` và `/privacy` hiện nhãn **Bản nháp** cho tới khi điền `OPERATOR_NAME` và `CONTACT_EMAIL` trong `web/src/lib/legal.ts`.
- Migration `20261015120000_invite_codes` (đã áp dụng ở production ngày 2026-10-15). **Quy tắc rút ra:** khi migration chỉ *thêm* bảng/cột nullable mà mã mới đọc cột đó ở mọi truy vấn (ở đây là `users`), áp migration **trước** khi deploy (sao lưu thủ công, rồi `psql -1` file `migration.sql` vào Postgres), deploy, rồi `prisma migrate resolve --applied <tên>` để Prisma ghi nhận. Nếu làm ngược lại, đăng nhập lỗi cho tới khi migration chạy. Staging thì chạy `migrate deploy` bình thường.

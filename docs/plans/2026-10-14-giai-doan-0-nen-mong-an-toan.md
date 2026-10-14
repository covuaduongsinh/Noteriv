# Giai đoạn 0: Nền móng an toàn (trước khi mời người dùng)

> Ngày lập: 2026-10-14 · Trạng thái: **chưa triển khai** · Thuộc lộ trình: [2026-10-14-lo-trinh-noteriv-chess-pkm.md](2026-10-14-lo-trinh-noteriv-chess-pkm.md)
> **Phiên mới hãy đọc trước:** [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md) (quy tắc, hạ tầng, cách chạy dev, cách kiểm thử).

## Mục tiêu

Noteriv sắp giữ dữ liệu của người khác (học viên, giáo viên). Trước khi mời bất kỳ ai, phải đảm bảo:
1. **Không bao giờ mất dữ liệu**: có sao lưu tự động, và **đã thử khôi phục thành công**.
2. **Cập nhật không làm hỏng bản thật**: mọi thay đổi thử trên staging trước.
3. **Biết ngay khi có sự cố**: trang chết, đĩa đầy, sao lưu không chạy thì có cảnh báo.
4. **Cửa vào được kiểm soát**: đăng ký bằng mã mời, khoá bị lộ đã được xoay, có điều khoản và chính sách quyền riêng tư.

## Quyết định đã chốt (2026-10-14)

- Tên sản phẩm: **Noteriv**. Máy chủ: **VPS hiện tại** (`217.15.160.118`, dùng chung với dịch vụ khác).
- Nơi sao lưu: **GitHub (repo private)**, có mã hoá, kích thước được giới hạn (xem 0.1). Khi đính kèm vượt khoảng 1,5GB thì chuyển phần đính kèm sang Cloudflare R2 hoặc Backblaze B2.

## Quy ước chung cho mọi phiên

- Mỗi phiên làm trên nhánh riêng `phase0/<tên>` (ví dụ `phase0/backup`) tách từ `main`. Từ phiên 0.2 trở đi, merge vào `next` để thử trên staging, rồi merge vào `main`.
- Đầu phiên: viết kế hoạch chi tiết của phiên (file riêng trong `docs/plans/`, ví dụ `2026-10-xx-phien-0-1-sao-luu.md`), chủ dự án duyệt rồi mới làm.
- Cuối phiên: cập nhật mục **"Trạng thái"** ở cuối file này (ngày, commit, việc còn dở).
- **Hỏi chủ dự án trước khi push hoặc deploy.** Không ghi secret vào chat, tài liệu hay commit.

---

## Phiên 0.1: Sao lưu tự động lên GitHub (quan trọng nhất)

### Việc kiểm trước khi làm (sau khi được duyệt)
- Đo dung lượng DB: `docker exec <postgres> psql -U noteriv -c "select pg_size_pretty(pg_database_size('noteriv'))"`.
- Đo dung lượng bucket Garage `noteriv-attachments` (S3 `ListObjectsV2` tổng `Size`, hoặc `du` trên volume `noteriv-prod-garagedata`).
- Đọc `web/server/src/lib/attachments.ts`: khoá object đính kèm có **bất biến** không (đặt tên theo hash hay id). Nếu bất biến, sao lưu tăng dần (chỉ thêm object mới); nếu không, tar cả bucket.

### Thiết kế
- **Repo đích:** `covuaduongsinh/noteriv-backups` (**private**). Quyền ghi bằng **deploy key** riêng cho repo này (không dùng token cá nhân). Khoá SSH bí mật của deploy key đưa vào env Dokploy dạng base64 (`BACKUP_DEPLOY_KEY_B64`).
- **Service mới** `noteriv-backup` trong `web/infra/docker-compose.prod.yml`:
  - Image tự build từ `web/infra/backup/Dockerfile`: `alpine` + `postgresql16-client` + `git` + `openssh-client` + `age` + `aws-cli` (hoặc `rclone`) + `busybox crond`.
  - `mem_limit: 128m`, `restart: unless-stopped`, không publish cổng.
  - Env: `DATABASE_URL` (như API), `ATTACHMENTS_S3_*` (như worker), `BACKUP_AGE_RECIPIENT` (khoá **công khai** age), `BACKUP_DEPLOY_KEY_B64`, `BACKUP_REPO=git@github.com:covuaduongsinh/noteriv-backups.git`, `BACKUP_HEALTHCHECK_URL`, `BACKUP_SECRETS_BUNDLE` (xem dưới), `TZ=Asia/Ho_Chi_Minh`.
- **File mã:** `web/infra/backup/Dockerfile`, `backup.sh`, `restore.sh`, `crontab`, `README.md`.

### Nội dung mỗi bản sao lưu (02:00 hằng ngày, giờ Việt Nam)
1. `db.dump.age`: `pg_dump -Fc` rồi mã hoá bằng age.
2. `attachments/…age`: đính kèm từ Garage (tăng dần hoặc tar, theo kết quả kiểm ở trên).
3. `secrets.env.age`: các biến bí mật cần để khôi phục (`POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `GARAGE_*`, `ATTACHMENTS_S3_*`, `PDF_SERVICE_TOKEN`). Thiếu `ENCRYPTION_KEY` thì không giải mã được token sync GitHub/WebDAV của người dùng. Cách đưa vào: Dokploy truyền các biến này vào container backup; script ghi chúng ra file rồi mã hoá ngay, không bao giờ ghi bản rõ ra đĩa lâu dài.
4. `manifest.json` (không mã hoá, không chứa dữ liệu nhạy cảm): thời điểm, kích thước từng phần, commit mã nguồn đang chạy, migration Prisma mới nhất, số user, note, đính kèm (để đối chiếu khi khôi phục).

### Mã hoá
- Dùng `age`. **Chỉ khoá công khai** nằm trên VPS. **Khoá bí mật do chủ dự án giữ**: trình quản lý mật khẩu + một bản in hoặc USB cất riêng. Mất khoá bí mật nghĩa là không khôi phục được, nên phải có 2 bản.
- Lý do: DB chứa toàn bộ nội dung ghi chú, hash mật khẩu, token đã mã hoá; repo GitHub dù private vẫn không nên chứa bản rõ.

### Giữ kích thước repo ổn định ("khe xoay vòng")
- Giới hạn GitHub: file tối đa 100MB, nên chia file lớn bằng `split -b 90m` (khi khôi phục thì `cat` ghép lại). Repo nên dưới khoảng 2GB.
- Mỗi bản sao lưu là **một commit mồ côi** (`git checkout --orphan`), được **force-push** vào một "khe":
  - `daily-mon` … `daily-sun` (7 bản theo thứ trong tuần),
  - `weekly-0` … `weekly-3` (vào Chủ nhật, theo `số tuần % 4`),
  - `monthly-01` … `monthly-12` (ngày 1 hằng tháng).
- Tối đa 23 bản; bản cũ trong cùng khe tự bị thay thế, nên repo không phình mãi.
- Nếu tổng đính kèm **vượt 1,5GB**: bỏ qua phần đính kèm, ghi vào manifest, gửi cảnh báo (healthcheck báo lỗi) để chủ dự án quyết định chuyển phần đính kèm sang R2/B2.

### Giám sát sao lưu
- Cuối `backup.sh`: thành công thì gọi `curl $BACKUP_HEALTHCHECK_URL`, lỗi thì gọi `…/fail` (healthchecks.io, gói miễn phí).
- Cấu hình healthchecks: chu kỳ 1 ngày, ân hạn 2 giờ. Không có tín hiệu thì email cho chủ dự án.

### Khôi phục
- `restore.sh <khe>`: clone khe đó → ghép file → giải mã bằng khoá bí mật (chủ dự án cung cấp **tạm thời** khi khôi phục) → `pg_restore --clean --if-exists` vào DB **trống** → đẩy đính kèm vào Garage → in số user, note, đính kèm để đối chiếu với `manifest.json`.
- Runbook từng bước cho người không chuyên: `docs/ops/sao-luu-khoi-phuc.md` (cách lấy khoá, chạy lệnh nào, kiểm tra gì, ai cần báo).

### Việc chủ dự án làm
1. Tạo repo private `noteriv-backups` trên GitHub.
2. Tạo cặp khoá age (phiên sẽ hướng dẫn từng lệnh, hoặc phiên tạo rồi giao file khoá bí mật cho bạn) và cất khoá bí mật ở 2 nơi.
3. Thêm deploy key (khoá công khai do phiên tạo) vào repo, **bật "Allow write access"**.
4. Tạo tài khoản healthchecks.io, tạo một check và gửi URL ping cho phiên (URL này không phải bí mật quan trọng, nhưng nên đưa vào env Dokploy chứ không đưa vào mã).

### Thế nào là xong
- Có ít nhất 1 bản trên GitHub ở đúng khe; trong repo không có file nào ở dạng rõ (trừ `manifest.json`).
- **Diễn tập khôi phục thành công** lên staging (sau phiên 0.2) hoặc lên Postgres và Garage tạm cục bộ, với số user, note, đính kèm khớp manifest.
- healthchecks.io báo xanh. Chạy thử lỗi (sai mật khẩu DB) thì nhận được email cảnh báo.

### Rủi ro
- Backup chạy lúc 02:00 có thể tăng tải ngắn. `pg_dump` không khoá ghi, chấp nhận được.
- Deploy key bị lộ thì chỉ ảnh hưởng repo backups, và dữ liệu vẫn đã mã hoá.

---

## Phiên 0.2: Bản staging và quy trình "thử trước, lên thật sau"

### Thiết kế
- **Ứng dụng Dokploy compose thứ hai** (tạo qua giao diện hoặc API `compose.create`), nguồn là repo này, **nhánh `next`** (nhánh tái cấu trúc, tạo ở phiên này từ `main`; xem mô hình nhánh ở Giai đoạn 1, phiên 1.1), cùng file `web/infra/docker-compose.prod.yml`.
- Tên miền: `staging-noteriv.dsc.edu.vn`. Volume tự tách riêng vì khác compose project. **Secret riêng**, sinh mới, không dùng lại secret production.
- **Mặc định tắt**, chỉ bật khi cần thử (Dokploy "Stop/Start"), vì RAM VPS khoảng 7,9GB, còn trống khoảng 3,5GB, và bộ staging đầy đủ chiếm tới khoảng 2,5GB giới hạn.
- **Sửa compose dùng chung 2 môi trường:** thay giá trị cứng bằng biến có mặc định là production, để production không đổi hành vi:
  - `CORS_ORIGIN: ${PUBLIC_ORIGIN:-https://noteriv.dsc.edu.vn}`
  - build arg `NEXT_PUBLIC_COLLAB_WS_URL: ${PUBLIC_WS_ORIGIN:-wss://noteriv.dsc.edu.vn}`
  - Rà soát mọi chỗ khác có `noteriv.dsc.edu.vn` cứng trong `web/` (grep).
- **Bảo vệ staging:** middleware Traefik basic-auth (mật khẩu do chủ dự án đặt) + header `X-Robots-Tag: noindex`; cấu hình theo cách Dokploy hỗ trợ (domain settings hoặc file dynamic Traefik `/etc/dokploy/traefik/dynamic/`).
- **Dữ liệu staging:** chỉ dữ liệu thử. Khi diễn tập khôi phục (0.1) thì dữ liệu thật được nạp tạm, **xoá ngay sau khi diễn tập**.

### Quy trình git (ghi cả vào file bàn giao)
- `main` = production; `next` = staging và tái cấu trúc.
1. Việc của Giai đoạn 0 và sửa lỗi production: nhánh `phase0/...` hoặc `fix/...` từ `main`.
2. Cần thử trên staging thì merge nhánh đó vào `next`, push, Dokploy tự deploy staging. Bật staging nếu đang tắt.
3. Chủ dự án thử trên staging. Đạt thì merge nhánh vào `main` (production), sau khi chủ dự án đồng ý.
4. Luôn **merge `main` vào `next`** sau mỗi thay đổi production (một chiều), để `next` không tụt hậu.
5. Việc tái cấu trúc (Giai đoạn 1 trở đi) làm trên `next`; chỉ gộp `next` vào `main` ở các mốc đã duyệt.
- Migration Prisma: chạy trên staging trước (`docker exec <api-staging> npx prisma migrate deploy`), rồi mới chạy trên production.

### Việc chủ dự án làm
- Thêm bản ghi DNS `staging-noteriv` (A record về `217.15.160.118`).
- Chọn mật khẩu basic-auth cho staging.

### Thế nào là xong
- Đăng nhập staging bằng user thử, mở note và tải PDF được.
- Push vào `next` không làm production deploy lại.
- Diễn tập khôi phục của 0.1 làm trên staging thành công, rồi dữ liệu đã được xoá.

---

## Phiên 0.3: Theo dõi và dọn VPS

### Việc cụ thể
1. **Endpoint sức khoẻ công khai** `GET /api/v1/healthz`: trả `{ "ok": true }` khi DB và Redis đều trả lời; lỗi thì HTTP 503. Không lộ phiên bản hay chi tiết. Tái dùng phần kiểm DB/Redis trong `web/server/src/routes/diagnostics.ts`.
2. **Theo dõi uptime** (UptimeRobot hoặc healthchecks.io, miễn phí): gọi trang chủ và `/api/v1/healthz` mỗi 5 phút; cảnh báo qua email (tuỳ chọn thêm Telegram).
3. **Theo dõi máy chủ:** script `web/infra/ops/check-host.sh` chạy bằng cron trên VPS mỗi 10 phút. Ping healthchecks thành công khi đĩa ≤ 90% và RAM trống ≥ 300MB, ngược lại ping `/fail` kèm số liệu. Hướng dẫn cài đặt nằm trong `web/infra/ops/README.md`.
4. **Dọn đĩa** (đang khoảng 89%):
   - `docker system df -v` để tìm nguồn của khoảng 31GB build cache không tự giải phóng (đã ghi nhận trước đây: `docker builder prune -a` báo 0B).
   - Xoá image và container không dùng; bật tính năng dọn dẹp Docker định kỳ của Dokploy.
   - **Không restart Docker daemon** nếu chưa hỏi chủ dự án, vì nó làm gián đoạn mọi dịch vụ khác trên VPS (ERPNext…).
   - Mục tiêu: đĩa **dưới 80%**.
5. **(Tuỳ chọn, cần chủ dự án duyệt vì gửi dữ liệu ra dịch vụ ngoài)** Sentry gói miễn phí cho web và api; bật lọc để không gửi nội dung ghi chú.

### Việc chủ dự án làm
- Tạo tài khoản UptimeRobot (hoặc dùng chung healthchecks.io) và chọn kênh nhận cảnh báo.
- Quyết định có dùng Sentry không.

### Thế nào là xong
- Tắt thử `noteriv-api` trên **staging** (cấu hình theo dõi tạm cho staging) thì nhận email trong vòng 10 phút; bật lại thì nhận email báo phục hồi.
- Đĩa VPS dưới 80%; script cron chạy và healthchecks báo xanh.

---

## Phiên 0.4: Bảo mật, pháp lý, tài liệu vận hành

### Việc cụ thể
1. **Xoay Dokploy API key** đã lộ trong chat. Chủ dự án tạo key mới trong giao diện Dokploy và xoá key cũ; key mới lưu ở file cục bộ `~/.config/noteriv/dokploy.key` trên máy của chủ dự án. Các phiên đọc key từ file đó, **không dán vào chat**.
2. **Đăng ký có kiểm soát:** biến `REGISTRATION_MODE=invite|open|closed` (mặc định `invite`):
   - Bảng `InviteCode` (mã, người tạo, số lần dùng tối đa, hạn dùng) + migration Prisma.
   - `POST /api/v1/auth/register` trong `web/server/src/routes/auth.ts` (đã có rate limit 10/phút) kiểm tra mã mời.
   - Giao diện: ô "Mã mời" trên trang đăng ký; mục quản lý mã mời cho admin (xác định admin bằng biến `ADMIN_EMAILS`).
   - Lý do: chưa có máy chủ gửi email để xác minh; nhóm thử đầu tiên là học viên của trung tâm.
3. **HTTP security headers** trong `web/next.config.ts` (`headers()`): `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Content-Security-Policy: frame-ancestors 'self'`. CSP đầy đủ ở chế độ **report-only** trước, để không làm hỏng plugin sandbox (`public/plugin-sandbox.html`, iframe `sandbox="allow-scripts"`) và iframe `blob:` của xem trước PDF. Kiểm lại cả hai sau khi bật.
4. **`npm audit`** trong `web/`, `web/server/`, `web/pdf-service/`; sửa các lỗi high và critical (cập nhật gói, chạy lại build và kiểm thử).
5. **Trang `/terms` và `/privacy`** (tiếng Việt và tiếng Anh). Bản nháp do Claude soạn và chủ dự án duyệt; đây **không phải tư vấn pháp lý**. Nêu rõ dữ liệu nào được lưu, sao lưu ở đâu (GitHub private, đã mã hoá), cách xoá tài khoản. Có checkbox "Tôi đồng ý" khi đăng ký và link ở chân trang.
6. **Tài liệu vận hành** trong `docs/ops/`:
   - `trien-khai.md`: quy trình staging → production, migration, cách xem trạng thái deploy.
   - `su-co.md`: trang không vào được, đĩa đầy, sync lỗi, PDF lỗi (xem gì trước, lệnh nào, khi nào khôi phục từ backup).
   - `bi-mat.md`: danh mục secret (tên biến, dùng ở đâu, nơi lưu, cách xoay). **Không ghi giá trị.**

### Việc chủ dự án làm
- Xoay key Dokploy và lưu vào file cục bộ.
- Duyệt nội dung Điều khoản và Quyền riêng tư.
- Cho biết email nào là admin.

### Thế nào là xong
- Key cũ không còn dùng được.
- Đăng ký không có mã mời bị từ chối; đăng ký có mã hợp lệ thành công.
- `curl -I https://noteriv.dsc.edu.vn` thấy đủ headers; plugin chessboard và xem trước PDF vẫn chạy.
- `npm audit` sạch mức high và critical.
- 3 file trong `docs/ops/` đã có.

---

## Thứ tự và ước lượng

| Thứ tự | Phiên | Ước lượng | Phụ thuộc |
|---|---|---|---|
| 1 | 0.1 Sao lưu | 1 buổi | Chủ dự án tạo repo, khoá age, healthchecks |
| 2 | 0.2 Staging | 1 buổi | DNS `staging-noteriv` |
| 3 | Diễn tập khôi phục | 1–2 giờ | 0.1 + 0.2 |
| 4 | 0.3 Theo dõi, dọn VPS | 1 buổi | 0.2 (để thử cảnh báo) |
| 5 | 0.4 Bảo mật, pháp lý | 1–2 buổi | — |

Giai đoạn tiếp theo: [Giai đoạn 1: tách repo, package dùng chung, Plugin API v1](2026-10-14-giai-doan-1-tach-repo-package-chung-plugin-api.md). Điều kiện: xong 0.1 và 0.2; 0.3 và 0.4 có thể làm song song với Giai đoạn 1.

## Trạng thái

| Phiên | Trạng thái | Ngày | Commit / ghi chú |
|---|---|---|---|
| 0.1 | Chưa làm | | |
| 0.2 | Chưa làm | | |
| Diễn tập khôi phục | Chưa làm | | |
| 0.3 | Chưa làm | | |
| 0.4 | Chưa làm | | |

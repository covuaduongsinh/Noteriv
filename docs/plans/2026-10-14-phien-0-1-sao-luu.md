# Phiên 0.1: Sao lưu tự động lên GitHub — kế hoạch chi tiết

## Bối cảnh

Noteriv sắp giữ dữ liệu của học viên và giáo viên, nhưng hiện **chưa có bản sao lưu nào**. Nếu volume Postgres hoặc Garage trên VPS hỏng thì mất hết. Phiên 0.1 (`docs/plans/2026-10-14-giai-doan-0-nen-mong-an-toan.md`) thêm một service `noteriv-backup` chạy 02:00 hằng ngày, mã hoá bằng age, đẩy vào repo private `covuaduongsinh/noteriv-backups`, có giám sát healthchecks.io và **một lần diễn tập khôi phục thật**.

Quyết định đã chốt với chủ dự án (2026-10-14):
- Khoá age: **phiên tạo trên máy Windows của chủ dự án**, lưu file cục bộ; không vào chat, không lên VPS (chỉ khoá công khai lên VPS).
- Đính kèm: **tăng dần, lưu 1 lần** trên nhánh riêng `attachments` (đã kiểm: khoá object là `${vaultId}/${randomUUID()}-${safe}` trong `web/server/src/lib/attachments.ts:61`, chỉ tạo mới hoặc xoá, không bao giờ ghi đè → bất biến).
- Diễn tập khôi phục: **container tạm trên VPS** (Postgres + Garage tạm, mạng riêng, `--memory`), xoá sạch sau khi xong.

Điều chỉnh so với thiết kế gốc: thiết kế gốc đặt toàn bộ đính kèm trong mỗi "khe" (23 khe × dung lượng đính kèm, mã hoá age không tất định nên git không khử trùng được) → repo vượt 2GB rất nhanh. Tách đính kèm sang nhánh `attachments` chỉ-thêm giải quyết việc này; các khe chỉ chứa DB + secrets + manifest (manifest liệt kê danh sách khoá đính kèm tại thời điểm đó).

## Bước 0 — Đầu phiên (sau khi duyệt)
1. Nhánh `phase0/backup` từ `main`. Không đụng các file chưa commit của chủ dự án (`desktop/examples/plugins/chessboard/*`, `docs/plans/2026-10-12-chessboard-plugin-improvements.md`).
2. Chép kế hoạch này sang `docs/plans/2026-10-14-phien-0-1-sao-luu.md` (quy ước của giai đoạn).
3. Kiểm trên VPS (chỉ đọc): `df -h /`, `free -h`; dung lượng DB (`pg_database_size`); dung lượng bucket (`du -sh` trên volume `noteriv-prod-garagedata` hoặc liệt kê S3); ước kích thước `pg_dump -Fc` → tính 23 × dump. Nếu 23 × dump > ~1GB thì giảm số khe monthly (ghi vào kế hoạch, báo chủ dự án).
4. Kiểm Dokploy có truyền biến commit nguồn (`SOURCE_COMMIT` hoặc tương tự) cho compose không; nếu không, manifest ghi `"unknown"` cho commit (vẫn có migration mới nhất từ `_prisma_migrations`).

## Bước 1 — Mã nguồn (`web/infra/backup/`)

**`Dockerfile`**: `alpine:3.20` + `postgresql16-client git openssh-client age rclone curl jq tzdata busybox-extras(crond có sẵn trong busybox)`; `COPY backup.sh restore.sh lib.sh crontab`; nhúng **known_hosts của GitHub** (fingerprint công bố chính thức, không `ssh-keyscan` lúc chạy); `CMD ["crond","-f","-l","8"]`; user không phải root nếu crond cho phép, nếu không thì giữ root nhưng không publish cổng.

**`lib.sh`** (dùng chung): `die`, `log`, `ping_hc start|ok|fail <msg>` (curl `-fsS -m 10 --retry 3`; bỏ qua nếu thiếu `BACKUP_HEALTHCHECK_URL`), dựng ssh key từ `BACKUP_DEPLOY_KEY_B64` vào thư mục tmpfs `/run/backup` (chmod 600, `trap` xoá khi thoát), `GIT_SSH_COMMAND="ssh -i … -o IdentitiesOnly=yes -o UserKnownHostsFile=/etc/backup/known_hosts"`, cấu hình rclone qua biến `RCLONE_CONFIG_GARAGE_*` (type s3, provider Other, endpoint `ATTACHMENTS_S3_ENDPOINT`, path style).

**`backup.sh`** (có `flock` chống chạy chồng, `set -euo pipefail`, `trap` gọi `ping_hc fail` khi lỗi):
1. `ping_hc start`. Kiểm đủ biến bắt buộc.
2. Chọn khe theo `TZ=Asia/Ho_Chi_Minh`: luôn `daily-<mon..sun>`; thêm `weekly-<tuần%4>` nếu Chủ nhật; thêm `monthly-<MM>` nếu ngày 1. Cho phép ép khe qua tham số (`backup.sh --slot test-manual`) để chạy thử lần đầu.
3. **Đính kèm (nhánh `attachments`)**: `git clone --filter=blob:none --no-checkout --branch attachments` (tạo nhánh mồ côi nếu chưa có) → `git ls-tree -r --name-only` lấy danh sách đã sao lưu → `rclone lsjson -R garage:$BUCKET` lấy danh sách hiện có + tổng dung lượng.
   - Tổng > 1,5GB (`BACKUP_ATTACHMENTS_MAX_BYTES`, mặc định 1610612736): bỏ qua phần đính kèm, ghi `attachments.skipped=true` vào manifest, và **kết thúc bằng `ping_hc fail`** sau khi đẩy xong DB (để vẫn có DB, nhưng có cảnh báo).
   - Với mỗi khoá mới: `rclone cat … | age -r "$BACKUP_AGE_RECIPIENT" > attachments/<khoá>.age` (file >90MB thì `split -b 90m` thành `.age.part-aa…`). Commit + push nhánh `attachments` (thường, không force). Không xoá object đã xoá khỏi Garage (bản DB cũ còn tham chiếu).
4. **DB**: `pg_dump -Fc "$DATABASE_URL" | age -r … > db.dump.age` (pipe, không có bản rõ trên đĩa); split nếu >90MB.
5. **Secrets**: in đúng danh sách tên biến (`POSTGRES_PASSWORD JWT_ACCESS_SECRET JWT_REFRESH_SECRET ENCRYPTION_KEY GARAGE_RPC_SECRET GARAGE_ADMIN_TOKEN ATTACHMENTS_S3_ACCESS_KEY_ID ATTACHMENTS_S3_SECRET_ACCESS_KEY PDF_SERVICE_TOKEN`) dạng `KEY=value` qua pipe thẳng vào `age` → `secrets.env.age`. Biến nào thiếu thì ghi tên vào manifest `secrets.missing`.
6. **`manifest.json`** (jq): thời điểm, khe, kích thước từng phần, commit nguồn, migration mới nhất, `count(*)` users/notes/attachments, tổng byte đính kèm, số khoá đính kèm + sha256 của danh sách khoá, commit hiện tại của nhánh `attachments`. Không chứa dữ liệu người dùng.
7. Mỗi khe: thư mục làm việc tạm → `git init` → `git checkout --orphan <khe>` → add `db.dump.age* secrets.env.age manifest.json` + `README.txt` ngắn → commit → `git push --force origin <khe>` cho từng khe đã chọn (cùng commit cho nhiều khe).
8. Kiểm sau push: `git ls-remote origin <khe>` khớp SHA; `ping_hc ok` (hoặc `fail` nếu đính kèm bị bỏ qua). Xoá thư mục tạm.

**`restore.sh <khe> [--target-db URL] [--target-s3 …]`**: đọc khoá bí mật từ `AGE_IDENTITY_FILE` (tạm thời, chủ dự án cung cấp) → clone khe + `attachments` (shallow) → ghép part → `age -d` → **từ chối nếu DB đích có bảng** (trừ `--force-nonempty`) → `pg_restore --clean --if-exists --no-owner` → với mỗi khoá trong danh sách của manifest: giải mã và `rclone rcat` lên Garage đích → in số users/notes/attachments và so với manifest; khác thì thoát mã lỗi. `secrets.env.age` chỉ giải mã ra **stdout** khi có `--show-secrets`.

**`crontab`**: `0 2 * * * /backup/backup.sh >> /proc/1/fd/1 2>&1` (log vào docker logs).

**`README.md`**: kiến trúc ngắn, biến môi trường, cách chạy tay, cách thêm khe.

## Bước 2 — Compose (`web/infra/docker-compose.prod.yml`)
Thêm service `noteriv-backup` (build `context: ./backup`), `restart: unless-stopped`, `mem_limit: 128m`, không cổng, `tmpfs: /run/backup`, `depends_on: noteriv-postgres (healthy)`. Env:
- `DATABASE_URL` giống API; `ATTACHMENTS_S3_*` giống worker; `TZ: Asia/Ho_Chi_Minh`; `BACKUP_REPO: git@github.com:covuaduongsinh/noteriv-backups.git`.
- `BACKUP_AGE_RECIPIENT`, `BACKUP_DEPLOY_KEY_B64`, `BACKUP_HEALTHCHECK_URL`: dùng `${VAR:-}` (**không** `:?`, để thiếu biến chỉ làm backup báo lỗi chứ không chặn cả deploy production).
- Các biến secret ở mục 5 truyền lại từ env compose (`${POSTGRES_PASSWORD}` …, `GARAGE_*` dùng `:-`).
Lý do 128m đủ: pg_dump/age/rclone đều stream; nếu thiếu, ghi lại và tăng lên 192m.

## Bước 3 — Thử cục bộ trước khi đụng production
- `docker build` image (nếu máy có Docker; nếu không thì build trên VPS trong thư mục tạm `/root/noteriv-backup-test`, không đụng compose Dokploy).
- Chạy `backup.sh --slot test-local` với DB dev (tunnel 55432) + Garage dev (59000) + một repo thử? → Dùng chính repo `noteriv-backups` với khe `test-*`, xoá khe thử sau đó (`git push origin :test-local`).
- `shellcheck` cho các script nếu có sẵn.

## Bước 4 — Việc chủ dự án (phiên dẫn từng bước khi tới lượt)
1. Tạo repo private `noteriv-backups` trên GitHub.
2. Phiên tạo trên máy chủ dự án: khoá age (`age-keygen -o ~/.config/noteriv/backup-age.key`, cài `age` qua winget/scoop nếu chưa có — hỏi trước khi cài) và deploy key (`ssh-keygen -t ed25519 -N "" -f ~/.config/noteriv/backup-deploy-key`). Chủ dự án cất **khoá age bí mật ở 2 nơi** (trình quản lý mật khẩu + USB/bản in), xác nhận rồi mới tiếp.
3. Chủ dự án thêm deploy key công khai vào repo, **bật Allow write access**.
4. Tạo check healthchecks.io (chu kỳ 1 ngày, ân hạn 2 giờ, email), gửi URL ping.
5. Phiên đưa vào env Dokploy (`compose.update`, chỉ in tên biến): `BACKUP_AGE_RECIPIENT`, `BACKUP_DEPLOY_KEY_B64` (base64 của khoá deploy bí mật, đọc từ file, không in ra), `BACKUP_HEALTHCHECK_URL`. Sau đó xoá file deploy key bí mật trên máy (nó đã nằm trong Dokploy).

## Bước 5 — Đưa lên production (hỏi chủ dự án trước khi push)
- Commit tiếng Anh, `git add` từng file. Hỏi → push `phase0/backup`, merge vào `main` (chưa có `next`/staging; thay đổi chỉ thêm service mới, không đổi service cũ) → Dokploy deploy → theo dõi `deployment.allByCompose`.
- Sau deploy: `docker ps | grep noteriv` (8 + backup), trang chủ 200, Chẩn đoán xanh.
- Chạy tay lần đầu: `docker exec <noteriv-backup> /backup/backup.sh` → khe `daily-<hôm nay>` (+ weekly/monthly nếu đúng ngày) và nhánh `attachments` xuất hiện; healthchecks xanh.
- Kiểm repo không có bản rõ: clone về, mọi file trừ `manifest.json`/`README.txt` phải bắt đầu bằng header `age-encryption.org/v1`.
- Thử lỗi: `docker exec -e DATABASE_URL=postgresql://noteriv:sai@… <backup> /backup/backup.sh --slot test-fail` → healthchecks đỏ + email; chạy lại đúng → xanh. Xoá khe `test-*`.

## Bước 6 — Diễn tập khôi phục (container tạm trên VPS)
1. `docker network create noteriv-restore-drill` (không nối `dokploy-network`).
2. `docker run -d --name drill-pg --network … --memory 256m -e POSTGRES_PASSWORD=<ngẫu nhiên> postgres:16-alpine`; `drill-garage` (`dxflrs/garage:v1.0.1`, `--memory 192m`, file toml tạm với secret ngẫu nhiên) + `garage layout assign/apply`, `bucket create`, `key create` (theo cách đã làm ở `docker-compose.dev.yml`).
3. Chép khoá age bí mật lên VPS **tạm thời** (`scp` vào `/dev/shm/drill-age.key`, chmod 600) — có xác nhận của chủ dự án.
4. Chạy image backup với `restore.sh daily-<…>` trỏ vào DB/Garage tạm → so số liệu với manifest; tải thử 1–2 đính kèm và so sha256 với bản trên Garage production.
5. Dọn: `shred -u /dev/shm/drill-age.key`, `docker rm -f drill-pg drill-garage`, xoá volume và network, kiểm `docker ps -a | grep drill` trống.

## Bước 7 — Tài liệu và kết thúc
- `docs/ops/sao-luu-khoi-phuc.md` (tiếng Việt, cho người không chuyên): bản sao lưu nằm đâu, khe là gì, cách xem đã chạy chưa (healthchecks), khi nhận email lỗi thì làm gì, khôi phục từng bước (lấy khoá ở đâu, lệnh nào, kiểm gì, dọn khoá sau đó), cách xoay deploy key / khoá age.
- Cập nhật bảng "Trạng thái" (0.1 và dòng "Diễn tập khôi phục") trong file giai đoạn 0; thêm `noteriv-backup` vào danh sách container ở mục 5 của file bàn giao.
- Commit tài liệu, hỏi trước khi push.

## Tệp sẽ tạo / sửa
- Mới: `web/infra/backup/{Dockerfile,lib.sh,backup.sh,restore.sh,crontab,README.md,known_hosts}`, `docs/ops/sao-luu-khoi-phuc.md`, `docs/plans/2026-10-14-phien-0-1-sao-luu.md`.
- Sửa: `web/infra/docker-compose.prod.yml`, `docs/plans/2026-10-14-giai-doan-0-nen-mong-an-toan.md` (Trạng thái + ghi chú thay đổi thiết kế đính kèm), `docs/plans/2026-10-14-huong-dan-ban-giao-phien.md` (container mới).

## Kiểm chứng (điều kiện "xong")
- Khe `daily-*` và nhánh `attachments` có trên GitHub; không file nào ở dạng rõ trừ `manifest.json`/`README.txt`.
- Diễn tập khôi phục: số users/notes/attachments khớp manifest; sha256 đính kèm mẫu khớp.
- healthchecks.io xanh sau lần chạy thật; lần chạy cố ý lỗi gây email cảnh báo.
- Production vẫn bình thường sau deploy (trang chủ 200, Chẩn đoán xanh, `docker stats` backup dưới 128m).
- Phần nào chưa kiểm được (ví dụ chạy tự động lúc 02:00 đêm đầu) sẽ ghi rõ trong Trạng thái.

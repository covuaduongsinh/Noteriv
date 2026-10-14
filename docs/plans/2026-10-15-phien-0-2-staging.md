# Phiên 0.2: Bản staging và quy trình "thử trước, lên thật sau" — kế hoạch chi tiết

## Bối cảnh

Production (`noteriv.dsc.edu.vn`) đã có sao lưu (0.1) nhưng **mọi thay đổi vẫn đẩy thẳng lên bản thật**. Trước khi mời học viên, cần một bản staging để thử migration, tính năng và PDF mà không rủi ro dữ liệu thật. Phiên này tạo: nhánh `next`, bản compose Dokploy thứ hai (staging, mặc định tắt), tên miền `staging-noteriv.dsc.edu.vn` có basic-auth, và ghi quy trình git/deploy vào tài liệu.

Hiện trạng đã kiểm (chỉ đọc):
- Repo chỉ có nhánh `main` (+ `origin/main`); **chưa có `next`**.
- `web/infra/docker-compose.prod.yml` có đúng **2 chỗ cứng** domain production: `CORS_ORIGIN` (dòng 63) và build arg `NEXT_PUBLIC_COLLAB_WS_URL` (dòng 234). Ngoài ra chỉ có 2 file `.env.example` (không ảnh hưởng triển khai). Cookie đăng nhập là host-only (`auth.ts` không đặt `domain`) nên staging và production không lẫn phiên.
- Tổng `mem_limit` của stack ≈ 3,0GB (VPS còn trống ~3,5GB, đĩa 89%).

## Rủi ro phải xử lý trong thiết kế

1. **Staging không được sao lưu đè lên repo backup thật.** Service `noteriv-backup` trong compose dùng chung có `BACKUP_REPO` cứng và sẽ chạy 02:00. Nếu staging có deploy key/age key thì nó force-push dữ liệu thử vào các khe production. → Staging **không đặt** `BACKUP_AGE_RECIPIENT`, `BACKUP_DEPLOY_KEY_B64`, `BACKUP_HEALTHCHECK_URL` (script sẽ dừng ở bước kiểm biến, không đẩy gì) **và** thêm `deploy.replicas: ${BACKUP_REPLICAS:-1}` để staging đặt `BACKUP_REPLICAS=0` (khỏi tốn 128MB). Kiểm bằng thực tế: container backup staging không chạy.
2. **Trùng tên DNS trên `dokploy-network`** (bài học ghi ở đầu compose). Staging dùng cùng tên service `noteriv-*`. Sau khi dựng, phải chứng minh `noteriv-web` staging gọi đúng `noteriv-api` staging (không phải production): `docker exec <web-staging> getent hosts noteriv-api` so với IP container api staging. Nếu trùng, bật "Isolated Deployment" của Dokploy cho compose staging (hoặc đổi tên service qua biến).
3. **Đĩa 89%:** build 3–4 image mới tốn vài GB. Trước khi build: `df -h /`; nếu > 92% thì dừng và hỏi chủ dự án trước khi dọn (dọn đĩa chính thức thuộc 0.3). Không restart Docker daemon.
4. **Secret staging sinh mới**, không dùng lại của production. `ENCRYPTION_KEY` khác thì token sync của production không giải mã được ở staging — đúng ý muốn.
5. Push `next` **không được** làm production deploy: kiểm nhánh theo dõi của compose production = `main`.

## Các bước (thứ tự thực hiện)

### Bước 0 — Chuẩn bị (cần chủ dự án)
- Chủ dự án thêm DNS: A record `staging-noteriv` → `217.15.160.118`.
- Chủ dự án chọn mật khẩu basic-auth, lưu vào file cục bộ `~/.config/noteriv/staging-basic-auth.txt` (dòng `user:mật-khẩu`). Phiên chỉ đọc file này để băm, không in ra chat.
- Đọc API key Dokploy từ `~/.config/noteriv/dokploy.key` (không in).

### Bước 1 — Nhánh và sửa compose (trên `phase0/staging`, tách từ `main`)
- Tạo nhánh `phase0/staging` từ `main`. Không đụng file chưa commit của chủ dự án (`desktop/examples/plugins/chessboard/*`, `docs/plans/2026-10-12-chessboard-plugin-improvements.md`); `git add` từng file.
- Chép kế hoạch này sang `docs/plans/2026-10-15-phien-0-2-staging.md`.
- Sửa `web/infra/docker-compose.prod.yml` (mặc định = giá trị production nên production **không đổi hành vi**):
  - `CORS_ORIGIN: ${PUBLIC_ORIGIN:-https://noteriv.dsc.edu.vn}`
  - build arg `NEXT_PUBLIC_COLLAB_WS_URL: ${PUBLIC_WS_ORIGIN:-wss://noteriv.dsc.edu.vn}`
  - `noteriv-backup`: thêm `deploy: { replicas: ${BACKUP_REPLICAS:-1} }`.
  - Cập nhật comment đầu file nói rõ biến nào dùng để tách staging.
- Cập nhật `web/.env.example`/`web/server/.env.example` chỉ khi cần ghi chú (domain ví dụ giữ nguyên).
- Kiểm cú pháp compose bằng `docker compose config` (nếu máy có Docker) với và không có biến, so sánh kết quả mặc định với bản trước (không đổi).

### Bước 2 — Nhánh `next`
- Tạo `next` từ `main`, merge `phase0/staging` vào `next`.
- **Hỏi chủ dự án rồi** mới push `phase0/staging` và `next` lên `origin`.

### Bước 3 — Tạo compose staging trên Dokploy (qua API, key từ file)
- Trước hết đọc cấu hình compose production (`compose.one`, composeId `3tKquEXFX1KEN2EueeUGm`): kiểu nguồn, `sourceType`, cách khai domain cho `noteriv-web` (cổng) và `noteriv-collab` (cổng 4002, đường dẫn `/collab`), `autoDeploy`, nhánh. Chỉ in tên biến env.
- `compose.create` (cùng project) → cấu hình nguồn: repo này, **nhánh `next`**, file `web/infra/docker-compose.prod.yml`, tự deploy bật.
- Env riêng cho staging (secret sinh mới bằng `openssl rand`, ghi thẳng vào Dokploy, không in): `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `GARAGE_RPC_SECRET`, `GARAGE_ADMIN_TOKEN`, `PDF_SERVICE_TOKEN`; cộng `PUBLIC_ORIGIN=https://staging-noteriv.dsc.edu.vn`, `PUBLIC_WS_ORIGIN=wss://staging-noteriv.dsc.edu.vn`, `BACKUP_REPLICAS=0`. **Không** đặt các biến `BACKUP_*` khác.
- `domain.create` cho `noteriv-web` và `noteriv-collab` giống production nhưng host `staging-noteriv.dsc.edu.vn`, HTTPS Let's Encrypt.

### Bước 4 — Bảo vệ staging
- Basic-auth + `X-Robots-Tag: noindex, nofollow` bằng middleware Traefik. Bước đầu **tìm cách Dokploy hỗ trợ** (middleware trong domain settings hoặc file động `/etc/dokploy/traefik/dynamic/`). Băm mật khẩu bằng `openssl passwd -apr1` từ file cục bộ. Đảm bảo áp dụng cho **cả** router web lẫn collab, và production **không** bị gắn middleware này.
- Nếu không gắn được middleware cho router do Dokploy sinh ra: dừng và hỏi chủ dự án chọn phương án thay thế (không tự chế).

### Bước 5 — Deploy lần đầu và khởi tạo
- Kiểm `df -h /`, `free -h` trước. Deploy compose staging; theo dõi `deployment.allByCompose`.
- Khởi tạo dữ liệu: `docker exec <api-staging> npx prisma migrate deploy`; chạy `web/infra/garage-bootstrap.sh` cho Garage staging (tạo bucket + key), rồi đưa `ATTACHMENTS_S3_ACCESS_KEY_ID/SECRET` vào env Dokploy staging và redeploy.
- Kiểm: `docker ps | grep noteriv` (container staging, **không có** backup chạy), `docker stats --no-stream` tổng bộ nhớ < ~3GB, `getent hosts` như rủi ro 2.

### Bước 6 — Kiểm chứng (điều kiện "xong")
1. Không có basic-auth → 401; có → trang chủ 200; header `X-Robots-Tag` có mặt; production `curl -I` vẫn 200 và **không** có basic-auth.
2. Đăng ký user thử, tạo vault + note, mở lại sau reload, sửa cộng tác (WS `wss://staging-noteriv…/collab` kết nối được), tải PDF, menu Developer → Chẩn đoán xanh (DB, Redis, S3, worker, PDF). Bằng trình duyệt thật (claude-in-chrome).
3. Push một commit vặt vào `next` → staging deploy, **production không deploy lại** (đối chiếu danh sách deployment của composeId production trước và sau).
4. Dừng/khởi động staging bằng Dokploy Stop/Start hoạt động; để staging **tắt** khi xong.
5. Dọn: xoá user, vault thử trên staging; dừng staging.
6. Merge `phase0/staging` vào `main` (hỏi trước) → production redeploy; xác nhận trang chủ 200, Chẩn đoán xanh, 9 container chạy, `docker inspect` biến `CORS_ORIGIN` production vẫn đúng. Rồi merge `main` vào `next` (một chiều).

### Bước 7 — Tài liệu
- Mới: `docs/ops/trien-khai.md` bản sơ bộ (hoặc mục "Quy trình staging" tạm trong `docs/ops/`; bản đầy đủ thuộc 0.4): staging → production, bật/tắt staging, migration thử trước, xem trạng thái deploy.
- Sửa `docs/plans/2026-10-14-huong-dan-ban-giao-phien.md`: thêm compose staging (composeId, domain, nhánh `next`), quy trình git, ghi chú "staging mặc định tắt, không có backup".
- Cập nhật bảng "Trạng thái" trong `2026-10-14-giai-doan-0-nen-mong-an-toan.md` (dòng 0.2: ngày, commit, việc còn dở; ghi chú chưa kiểm gì).
- Hỏi trước khi push commit tài liệu.

## Tệp sẽ tạo / sửa
- Sửa: `web/infra/docker-compose.prod.yml`; `docs/plans/2026-10-14-huong-dan-ban-giao-phien.md`; `docs/plans/2026-10-14-giai-doan-0-nen-mong-an-toan.md`.
- Mới: `docs/plans/2026-10-15-phien-0-2-staging.md`, `docs/ops/trien-khai.md`.
- Ngoài repo: compose Dokploy staging, DNS (chủ dự án), middleware Traefik trên VPS.

## Điểm dừng để hỏi chủ dự án
Push nhánh; deploy staging lần đầu (tốn đĩa/RAM); đĩa > 92%; không gắn được basic-auth; merge vào `main`; bất kỳ thao tác nào trên Docker daemon.

## Chưa nằm trong phiên này
Diễn tập khôi phục lên staging (dòng riêng trong bảng trạng thái, đã làm trên container tạm); theo dõi uptime cho staging (0.3).

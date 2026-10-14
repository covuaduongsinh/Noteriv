# Phiên 0.3: Theo dõi uptime, theo dõi máy chủ, dọn đĩa VPS — kế hoạch chi tiết

## Bối cảnh

Production đã có sao lưu (0.1) và staging (0.2), nhưng **chưa ai được báo khi trang chết, đĩa đầy hay worker treo**. Đĩa VPS đang 90–91% (ngày 2026-10-15, 14–16GB trống; build image staging lần đầu đã tốn ~5GB) nên đây là rủi ro gần nhất: một lần build nữa có thể làm đầy đĩa và kéo sập cả ERPNext dùng chung. Phiên này thêm endpoint sức khoẻ, giám sát bên ngoài, giám sát máy chủ bằng cron, và đưa đĩa xuống dưới 80%.

Phát hiện khi đọc mã (chỉ đọc):
- `web/server/src/index.ts:74` đã có `GET /healthz` nhưng **chỉ trả `{ok:true}`, không kiểm DB/Redis**, và **không ra được ngoài**: Traefik chỉ định tuyến tới `noteriv-web` (Next), mà Next chỉ rewrite `/api/*` sang API. Vì vậy cần route **`/api/v1/healthz`**.
- `web/server/src/routes/diagnostics.ts` đã có sẵn cách kiểm DB (`prisma.$queryRaw\`SELECT 1\``) và Redis (`syncQueue.client`, import từ `../lib/syncQueue.js`) → tái dùng, không viết lại. Route đó cần đăng nhập nên không dùng cho monitor.
- `rateLimit` toàn cục 300/phút/IP: monitor 5 phút/lần không chạm ngưỡng, nhưng vẫn tắt rate limit cho route này.
- `web/infra/backup/lib.sh` có `ping_hc` (curl `-fsS -m 10 --retry 3`, bỏ qua khi thiếu URL) làm mẫu phong cách cho script ops.

## Quyết định cần chủ dự án (hỏi trước khi làm)

1. **Công cụ giám sát bên ngoài:** khuyến nghị **UptimeRobot** (chủ động gọi URL mỗi 5 phút, gói miễn phí) cho trang chủ + `/api/v1/healthz`, và **healthchecks.io** (đã có tài khoản từ 0.1) cho script máy chủ. Lý do: healthchecks.io chỉ *nhận* tín hiệu, không tự gọi URL.
2. **Sentry:** mặc định **không làm** (gửi dữ liệu lỗi ra dịch vụ ngoài, cần bật lọc nội dung ghi chú). Chỉ làm nếu chủ dự án duyệt.

## Các bước

### Bước 1 — Endpoint sức khoẻ (nhánh `phase0/monitoring` từ `main`)
- Thêm `GET /api/v1/healthz` vào `web/server/src/index.ts` (đăng ký **trước** các route cần xác thực, `config: { rateLimit: false }`): chạy song song kiểm DB và Redis, mỗi bên timeout 3 giây (`Promise.race`); cả hai OK → `200 {"ok":true}`, ngược lại → `503 {"ok":false}`. **Không lộ phiên bản hay chi tiết lỗi**; ghi chi tiết vào log (`request.log.warn`).
- Giữ nguyên `/healthz` cũ (liveness nội bộ).
- Kiểm: `npx tsc --noEmit` trong `web/server`.

### Bước 2 — Script theo dõi máy chủ
- Mới: `web/infra/ops/check-host.sh` (bash, `set -u`, tương thích alpine/ubuntu). Đọc `CHECK_HOST_URL` từ `/etc/noteriv/check-host.env` (chmod 600, **không** đưa vào repo).
  - Đĩa: `df --output=pcent /` ≤ 90%.
  - RAM: **`MemAvailable`** trong `/proc/meminfo` ≥ 300MB (không dùng cột `free`, vì cột đó tụt xuống ~150MB mỗi khi build dù máy vẫn ổn).
  - Đủ → `curl $URL`; thiếu → `curl $URL/fail --data "disk=91% mem=412MB"`. Có `CHECK_HOST_FORCE_FAIL=1` để thử đường báo lỗi.
- Mới: `web/infra/ops/README.md` (cài đặt: copy script vào `/usr/local/bin`, tạo file env, thêm `/etc/cron.d/noteriv-check-host` chạy 10 phút/lần).
- Kiểm cục bộ: `shellcheck` nếu có; chạy thử với ngưỡng giả.

### Bước 3 — Thử trên staging, rồi lên production
1. Merge `phase0/monitoring` vào `next`, **hỏi rồi push** (kèm commit tài liệu `42edee8` đang chờ). Webhook tự deploy staging (bật staging, ~5 phút).
2. Trên staging: `curl -u … /api/v1/healthz` → 200; dừng `noteriv-redis` staging → 503; bật lại → 200. (Chứng minh nó thật sự kiểm Redis/DB.)
3. **Hỏi rồi** merge vào `main` → production deploy; `curl https://noteriv.dsc.edu.vn/api/v1/healthz` → 200 không cần đăng nhập, `/api/v1/diagnostics` vẫn 401.

### Bước 4 — Dọn đĩa (làm TRƯỚC khi bật cron máy chủ, vì đĩa 91% sẽ báo đỏ ngay)
Chỉ đọc trước, rồi hỏi chủ dự án từng nhóm xoá:
- `docker system df -v`, `docker buildx du --verbose`, `docker builder ls`: tìm lý do ~34GB build cache "không giải phóng" (lần trước `builder prune -a` báo 0B; hiện chỉ ~1,5–2,3GB được coi là reclaimable → nghi cache còn được tham chiếu bởi nhiều builder hoặc layer chung với image đang dùng).
- Liệt kê image không gắn container nào, container đã thoát, volume mồ côi (`docker volume ls -f dangling=true`), log container lớn (`/var/lib/docker/containers/*/*-json.log`), thư mục build cũ của Dokploy.
- Xoá theo thứ tự an toàn → ít an toàn, **mỗi nhóm hỏi trước**: build cache cũ (`docker builder prune --filter until=168h`), image không dùng (`docker image prune -a --filter until=168h`), container đã thoát. **Không xoá volume, không đụng container/image của ERPNext và dịch vụ khác, không restart Docker daemon.**
- Bật dọn định kỳ trong Dokploy (Settings → Server → Daily Docker Cleanup) nếu có.
- Nếu không đạt < 80% bằng cách an toàn: báo chủ dự án các lựa chọn (mở rộng đĩa, chuyển build ra ngoài VPS) thay vì tự xoá mạnh tay.

### Bước 5 — Cài giám sát (cần chủ dự án tạo tài khoản/check)
- Chủ dự án: tạo trên healthchecks.io một check "noteriv-host" (chu kỳ 10 phút, ân hạn 10 phút); tạo tài khoản UptimeRobot; chọn kênh cảnh báo (email, tuỳ chọn Telegram). Gửi cho phiên **URL ping** (không phải secret nặng nhưng đưa vào file env trên VPS, không vào repo).
- Phiên cài script + cron trên VPS; tạo 2 monitor UptimeRobot (trang chủ, `/api/v1/healthz`) — nếu chủ dự án không muốn đưa API key UptimeRobot cho phiên thì chủ dự án tự tạo theo hướng dẫn trong `web/infra/ops/README.md`.

### Bước 6 — Kiểm chứng cảnh báo (điều kiện "xong")
1. Staging đang bật: tạo monitor tạm UptimeRobot trên staging (có basic-auth, **chủ dự án tự nhập** mật khẩu trong giao diện UptimeRobot), dừng `noteriv-api` staging → email "Down" trong ~10 phút; bật lại → email "Up". Xoá monitor tạm.
2. `CHECK_HOST_FORCE_FAIL=1 check-host.sh` → healthchecks đỏ + email; chạy thường → xanh.
3. Cron chạy thật: sau 20 phút healthchecks "noteriv-host" xanh.
4. `df -h /` < 80%; tắt staging khi xong; xoá dữ liệu thử.

### Bước 7 — Tài liệu
- Mới: `docs/ops/giam-sat.md` (tiếng Việt, cho người không chuyên: ai gửi cảnh báo, nhận email thì làm gì, cách xem trạng thái, cách tạm tắt cảnh báo khi bảo trì).
- Sửa: `docs/plans/2026-10-14-huong-dan-ban-giao-phien.md` (mục hạ tầng: endpoint, monitor, cron), bảng "Trạng thái" dòng 0.3 trong `2026-10-14-giai-doan-0-nen-mong-an-toan.md`, `docs/ops/trien-khai.md` (thêm bước kiểm `/api/v1/healthz`).
- Chép kế hoạch này sang `docs/plans/2026-10-15-phien-0-3-theo-doi-don-vps.md`. Không dùng `git add -A`; không đụng file chưa commit của chủ dự án (`desktop/examples/plugins/chessboard/*`, `docs/plans/2026-10-12-chessboard-plugin-improvements.md`).

## Tệp sẽ tạo / sửa
- Sửa: `web/server/src/index.ts`; ba file tài liệu ở Bước 7.
- Mới: `web/infra/ops/check-host.sh`, `web/infra/ops/README.md`, `docs/ops/giam-sat.md`, `docs/plans/2026-10-15-phien-0-3-theo-doi-don-vps.md`.
- Ngoài repo: cron + file env trên VPS, monitor UptimeRobot, check healthchecks.io.

## Điểm dừng để hỏi chủ dự án
Push `next`; merge vào `main`; mỗi nhóm xoá khi dọn đĩa; lấy URL/API key giám sát; bất kỳ thao tác nào trên Docker daemon; quyết định Sentry.

## Rủi ro
- Bật staging để thử sẽ tốn thêm đĩa/RAM trong lúc đĩa đang 90%: kiểm `df` trước, dừng nếu ≥ 92% và dọn trước (đổi thứ tự Bước 4 lên trước Bước 3).
- Cron báo đỏ liên tục nếu đĩa chưa < 90%: vì vậy cài cron sau khi dọn.
- `/api/v1/healthz` công khai: chỉ trả `ok` hay không, không lộ gì; rate limit đã tắt nên chỉ nên để monitor tin cậy gọi (chấp nhận được vì không làm việc nặng, mỗi lần 2 truy vấn nhẹ).

## Chưa nằm trong phiên này
Sentry (chờ duyệt); bảo mật/pháp lý (0.4); diễn tập khôi phục định kỳ.

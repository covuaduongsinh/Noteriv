# Giám sát Noteriv: ai báo cho bạn khi có sự cố

> Dành cho chủ dự án (không cần biết lập trình) và cho các phiên Claude. Cập nhật: 2026-10-19 (Phiên 5.5: Sentry, trang trạng thái).
> Kỹ thuật: [`web/infra/ops/README.md`](../../web/infra/ops/README.md). Sao lưu: [`sao-luu-khoi-phuc.md`](sao-luu-khoi-phuc.md).

## 1. Ba "người gác" và việc mỗi người báo

| Người gác | Kiểm cái gì | Bao lâu | Báo bằng |
|---|---|---|---|
| **UptimeRobot** (bên ngoài) | Trang chủ `noteriv.dsc.edu.vn` trả 200; `/api/v1/healthz` trả 200 (nghĩa là API, Postgres, Redis đều trả lời) | 5 phút | Email "Down" / "Up" |
| **healthchecks.io, check `noteriv-host`** | Đĩa VPS ≤ 90% và RAM khả dụng ≥ 300MB (script cron trên VPS) | 10 phút | Email khi script báo lỗi, **hoặc khi mất tín hiệu** (VPS chết) |
| **healthchecks.io, check sao lưu** | Sao lưu 02:00 mỗi đêm chạy thành công | 1 ngày | Email khi sao lưu lỗi hoặc không chạy |
| **Sentry** (từ phiên 5.5, khi đã đặt `SENTRY_DSN`) | Lỗi của web, API, worker, collab | Ngay khi có lỗi mới | Email "New issue" |

`/api/v1/healthz` công khai nhưng chỉ trả `{"ok":true}` hoặc `{"ok":false}`: không lộ phiên bản hay chi tiết lỗi.

## 2. Nhận email thì làm gì

| Email | Nghĩa là | Việc đầu tiên (nhờ một phiên Claude) |
|---|---|---|
| UptimeRobot: trang chủ **Down** | Web hoặc Traefik không phản hồi | `ssh 217.15.160.118 'docker ps \| grep noteriv'` xem container nào không chạy; xem log container đó |
| UptimeRobot: `healthz` **Down**, trang chủ vẫn lên | API chạy nhưng Postgres hoặc Redis hỏng | `docker logs --tail 50 <noteriv-api>` (dòng `healthz failed` ghi rõ db hay redis); kiểm container `noteriv-postgres`, `noteriv-redis` |
| `noteriv-host` đỏ, nói **disk** | Đĩa > 90% | Làm theo mục 3, **không** build thêm cho tới khi dọn xong |
| `noteriv-host` đỏ, nói **mem** | RAM khả dụng < 300MB (thường do bật staging hoặc một dịch vụ khác ngốn RAM) | Tắt staging (Dokploy → `noteriv-staging` → Stop); xem `docker stats --no-stream` |
| `noteriv-host` **không có tín hiệu** | VPS chết, cron chết, hoặc mạng | Thử `ssh`; nếu không vào được, kiểm bảng điều khiển nhà cung cấp VPS |
| Sao lưu thất bại | Xem [`sao-luu-khoi-phuc.md`](sao-luu-khoi-phuc.md) mục 4 | |

Dữ liệu không mất chỉ vì có email cảnh báo: các cảnh báo này nhằm để bạn biết sớm. Quyết định khôi phục từ sao lưu vẫn thuộc về bạn.

## 3. Đĩa đầy

- Xem nhanh: `ssh 217.15.160.118 'df -h /; docker system df'`.
- **Không** chạy `docker system prune -a`, không xoá volume, không restart Docker: VPS dùng chung với ERPNext và các dịch vụ khác.
- Chi tiết những gì đã dọn và cách dọn lần này nằm trong mục "Dọn đĩa" bên dưới (cập nhật khi có kết quả).

## 4. Tạm tắt cảnh báo khi bảo trì

- UptimeRobot: mở monitor → **Pause**; nhớ **Resume** sau khi xong.
- `noteriv-host`: không cần tắt; chỉ báo khi đĩa/RAM quá ngưỡng. Nếu cố ý làm VPS bận lâu, tạm dừng check trên healthchecks.io (nút **Pause**).

## 5. Ghi chú vận hành

- Script nằm ở `/usr/local/bin/noteriv-check-host`, cấu hình ở `/etc/noteriv/check-host.env` (URL ping, **không** nằm trong git), cron ở `/etc/cron.d/noteriv-check-host`, log ở `/var/log/noteriv-check-host.log`.
- Thử đường báo lỗi: `CHECK_HOST_FORCE_FAIL=1 noteriv-check-host` (check chuyển đỏ, chạy lại bình thường để về xanh).

## 6. Sentry: lỗi của ứng dụng (từ Phiên 5.5)

**Việc chủ dự án làm một lần:**
1. Vào sentry.io → **Sign up** (gói Developer, miễn phí). Khi tạo tổ chức, ở mục **Data Storage Location** chọn **European Union (Germany)**. Mục này không đổi được về sau.
2. Bật xác thực hai bước (User Settings → Security).
3. **Create Project** → nền tảng **Node.js** → tên `noteriv`. Một project dùng chung cho web, API, worker và collab; tag `service` phân biệt chúng.
4. Project Settings → **Client Keys (DSN)** → chép DSN (dạng `https://…@o….ingest.de.sentry.io/…`). Lưu vào `~/.config/noteriv/sentry.dsn` rồi báo phiên Claude. Phiên sẽ hỏi trước khi đặt `SENTRY_DSN` trong Dokploy và deploy lại.
5. Alerts: giữ luật mặc định **"Alert on new issues"** (email khi có lỗi mới).

**Khi nhận email "New issue":** mở issue trong Sentry, xem các tag:
- `service`: api / worker / collab, hoặc trình duyệt;
- `route`: API nào bị lỗi;
- `queue`: job nào của worker.

Gửi link issue cho một phiên Claude. Lỗi trình duyệt không có source map, nên tên hàm bị rút gọn; dòng lỗi và trang vẫn đủ để lần ra.

**Thử sau khi đặt DSN** (production, trong container api):
```bash
docker exec <noteriv-api> node --input-type=module -e "const s = await import('./dist/lib/sentry.js'); s.initSentry('api'); s.captureError(new Error('noteriv sentry test')); await s.flushSentry(5000)"
```
Issue "noteriv sentry test" hiện trong Sentry sau ít giây. Đánh dấu **Resolve** sau khi xem.

**Gói miễn phí:** khoảng 5.000 lỗi mỗi tháng. Khi gần hết hạn mức, Sentry gửi email báo; lỗi lặp lại được gom vào một issue.

## 7. Trang trạng thái công khai (từ Phiên 5.5)

**Việc chủ dự án làm một lần:**
1. UptimeRobot → **Status Pages** → **Add Status Page**, chọn 2 monitor đang có (trang chủ và `/api/v1/healthz`), đặt tên "Noteriv".
2. Chép link status page (dạng `https://stats.uptimerobot.com/…`) rồi gửi cho phiên Claude. Link này công khai, không phải bí mật.
3. Phiên sẽ hỏi trước khi đặt `STATUS_PAGE_URL` trong Dokploy và deploy lại; sau đó link **Status** hiện ở chân trang đăng nhập, trang Vault và trang pháp lý.

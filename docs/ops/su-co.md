# Xử lý sự cố Noteriv

> Dành cho chủ dự án (không chuyên) và các phiên Claude. Cập nhật: 2026-10-15 (Phiên 0.4).
> Liên quan: [`giam-sat.md`](giam-sat.md) (ai báo cho bạn), [`sao-luu-khoi-phuc.md`](sao-luu-khoi-phuc.md) (khôi phục), [`trien-khai.md`](trien-khai.md) (staging, deploy), [`bi-mat.md`](bi-mat.md) (khoá, mật khẩu).

## Nguyên tắc chung

1. **Đừng hoảng, đừng xoá gì.** Dữ liệu thật nằm trong volume Postgres và Garage; sao lưu mã hoá nằm ở GitHub. Hầu hết sự cố chỉ là một container dừng.
2. VPS **dùng chung với ERPNext** và dịch vụ khác: không restart Docker, không `docker system prune`, không xoá volume.
3. Việc đầu tiên luôn là **xem**, rồi mới sửa: `ssh 217.15.160.118`, sau đó các lệnh bên dưới. Nhờ một phiên Claude nếu chưa quen.
4. Khôi phục từ sao lưu là **phương án cuối** và chỉ khi bạn đồng ý (có thể mất dữ liệu sau thời điểm sao lưu).

Lệnh dùng nhiều (tiền tố container production là `compose-parse-mobile-card-ue7dq8-`):

```sh
docker ps --format '{{.Names}}  {{.Status}}' | grep noteriv          # cái nào đang chạy
docker logs --tail 80 compose-parse-mobile-card-ue7dq8-noteriv-api-1  # log (đổi api bằng web, worker, collab, pdf, postgres, redis, garage, backup)
df -h /; free -m                                                       # đĩa, RAM
```

## 1. Trang không vào được (UptimeRobot báo Down)

1. Thử `https://noteriv.dsc.edu.vn/` từ điện thoại (4G) để loại trừ lỗi mạng của bạn.
2. `docker ps | grep noteriv`: container nào **không** `Up`?
   - `noteriv-web` hoặc Traefik lỗi: xem log `noteriv-web`; thử **Deploy lại** compose `noteriv-prod` trong Dokploy.
   - Nhiều container cùng chết: kiểm đĩa/RAM (mục 3). Hết RAM thường do bật staging hoặc dịch vụ khác.
3. Trang lên nhưng đăng nhập báo lỗi: xem mục 2.
4. Không SSH được: VPS chết hoặc mạng; dùng bảng điều khiển của nhà cung cấp VPS.

## 2. `healthz` đỏ (UptimeRobot báo `/api/v1/healthz` Down, trang chủ vẫn lên)

1. `docker logs --tail 50 …-noteriv-api-1 | grep healthz`: dòng `healthz failed` ghi rõ **db** hay **redis** hỏng.
2. Postgres: `docker ps | grep postgres` (phải `healthy`). Nếu dừng: `docker start <container postgres>`; kiểm đĩa đầy (Postgres dừng khi hết chỗ).
3. Redis: tương tự `noteriv-redis`. Redis chết thì đồng bộ GitHub/WebDAV và cộng tác tạm hỏng, ghi chú vẫn đọc được.
4. Sau khi bật lại, `curl https://noteriv.dsc.edu.vn/api/v1/healthz` phải ra `{"ok":true}`.

## 3. Đĩa đầy (`noteriv-host` báo disk)

1. `df -h /` rồi tìm chỗ nặng: `docker system df` (không có `-v`/prune khi chưa hiểu).
2. Đã biết: Docker dùng kho containerd, `prune` thu được rất ít; phần lớn là image dự án khác. Đã dọn được: cache npm của root, bản VS Code Server cũ. Xem [`giam-sat.md`](giam-sat.md) mục 3.
3. Chưa dọn xong thì **không build/deploy thêm** (mỗi lần build staging tốn vài GB).
4. Nếu Postgres đã dừng vì hết chỗ: giải phóng đĩa **trước**, rồi mới `docker start`.

## 4. Đồng bộ GitHub/WebDAV lỗi

1. Trong app: menu **Developer → Chẩn đoán**: xem `worker` (phải sống), `git` (đã cài), `storage` (Garage ok).
2. `worker` không sống: `docker logs --tail 80 …-noteriv-worker-1`; thường là Redis hoặc Postgres chưa lên. Bật lại container worker.
3. Một vault riêng lỗi: mở cài đặt đồng bộ của vault để xem nhật ký và nút **Kiểm tra kết nối**. Lỗi 401/403 thường là token GitHub hết hạn hoặc bị thu hồi: người dùng nhập lại token.
4. Sau khi đổi `ENCRYPTION_KEY` (không nên), mọi kết nối đồng bộ cũ không giải mã được: người dùng phải kết nối lại.

## 5. Tải PDF lỗi

1. **Chẩn đoán → PDF service**: nếu đỏ, `docker logs --tail 50 …-noteriv-pdf-1`.
2. Container pdf chết vì hết RAM (giới hạn 768MB): bật lại; nếu lặp lại, thử tài liệu nhỏ hơn và báo phiên Claude.
3. Báo 401 giữa api và pdf: `PDF_SERVICE_TOKEN` hai bên không khớp (cùng một biến env, kiểm sau khi sửa env mà chưa deploy lại cả hai).
4. PDF bị lệch dấu tiếng Việt: font. Dùng Noto Serif, Liberation Serif, Times New Roman (không dùng Georgia).

## 6. Người dùng không đăng ký được / quên mật khẩu

- **Không đăng ký được:**
  - "Mã mời không đúng…": mã sai, hết lượt, hết hạn hoặc bị thu hồi. Quản trị viên vào **Vault của bạn → Quản lý mã mời** (`/admin/invites`) để xem trạng thái, tạo mã mới.
  - "Chưa mở đăng ký": biến `REGISTRATION_MODE` đang là `closed` (hoặc gõ sai, vì giá trị lạ cũng được coi là đóng). Sửa trong Dokploy (`invite`, `open` hoặc `closed`) rồi deploy lại.
  - "Bạn thử quá nhiều lần": giới hạn 10 lần/phút/IP; đợi một phút (cả lớp dùng chung một mạng có thể chạm ngưỡng).
- **Quên mật khẩu: hiện chưa có tính năng đặt lại mật khẩu** (chưa có máy chủ gửi email). Cách tạm: nhờ phiên Claude đặt lại thủ công cho tài khoản đó (băm mật khẩu mới, cập nhật `users.password_hash`) sau khi bạn xác minh người đó là ai. Việc này nằm trong danh sách cần làm.
- Muốn tạm dừng nhận người mới: đặt `REGISTRATION_MODE=closed` (người dùng cũ vẫn đăng nhập bình thường).

## 7. Khi nào khôi phục từ sao lưu

Chỉ khi dữ liệu thật bị mất hoặc hỏng (xoá nhầm hàng loạt, volume Postgres/Garage hỏng, VPS mất). Làm theo [`sao-luu-khoi-phuc.md`](sao-luu-khoi-phuc.md) mục 5b, chọn khe **trước** thời điểm sự cố. Cần khoá age bí mật của bạn ([`bi-mat.md`](bi-mat.md)).

## 8. Người dùng báo mất ghi chú

1. Ghi chú vừa xoá thường nằm ở **Thùng rác** của vault (tự dọn sau thời hạn lưu).
2. Xem **lịch sử/snapshot** của ghi chú trong app.
3. Còn lại mới tính đến sao lưu: khôi phục **vào môi trường tạm** (như diễn tập), lấy lại ghi chú đó, không ghi đè DB đang chạy.

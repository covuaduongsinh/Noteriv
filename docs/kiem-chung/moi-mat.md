# Đánh giá mọi mặt

> Chặng K – Kiểm chứng ([kế hoạch](../plans/2026-10-20-chang-k-kiem-chung.md)). Mục 1 làm ở Tuần 0; mục 2–6 ở Tuần 3–5.
> Số liệu ghi kèm ngày đo / ngày tra và nguồn.

## 1. Số liệu nền (Tuần 0)

| Chỉ số | Giá trị | Ngày đo | Cách đo |
|---|---|---|---|
| Số tài khoản / vault / note trên production | | | `/admin/stats` |
| Đĩa VPS dùng / còn | | | `df -h /` |
| RAM / swap dùng | | | `free -h` |
| RAM các container `noteriv-*` | | | `docker stats --no-stream` |
| Dung lượng Garage (đính kèm) | | | |
| Kích thước bản sao lưu gần nhất | | | |
| Thời gian mở vault thật của chủ dự án | | | Trình duyệt, tải lại trang, đến khi thấy cây thư mục |
| Số lỗi Sentry 7 ngày qua | | | Sentry |
| Uptime 30 ngày | | | UptimeRobot |

## 2. Kỹ thuật

- **Hiệu năng**: kết quả kịch bản 16–17 ([kich-ban.md](kich-ban.md)); so với ngân sách ở `docs/perf/2026-10-17-after-phase2.md`.
- **Bảo mật**: chạy `/security-review` trên mã hiện tại; liệt kê phát hiện theo mức; mục Chặn/Nặng vào [loi-va-gop-y.md](loi-va-gop-y.md).
- **Độ tin cậy**: số lỗi Sentry theo tuần, sự cố/downtime trong 6 tuần.
- **Nợ kỹ thuật đã biết** (đánh giá: có cần trả trước khi bán không):

| Mục | Ảnh hưởng | Cần trước khi bán? |
|---|---|---|
| Nâng Prisma 7 | | |
| Garage trên VPS chỉ ~3 GB | | |
| Cộng tác thay cả văn bản, chưa ghép từng thao tác (không giữ con trỏ người khác) | | |
| Desktop chưa gửi lỗi về Sentry | | |
| Ký mã desktop Windows/macOS | | |
| Lockfile tạo trên Windows, CI phải `npm install` | | |

## 3. Vận hành và chi phí

Ước tính chi phí **mỗi tháng** khi chạy trên máy chủ riêng (Chặng 6.3):

| Hạng mục | 100 người dùng | 1.000 | 10.000 | Nguồn giá, ngày tra |
|---|---|---|---|---|
| Máy chủ (VPS/dedicated) | | | | |
| Lưu trữ đính kèm (S3/R2) | | | | |
| Email (Resend) | | | | |
| Theo dõi lỗi (Sentry) | | | | |
| Sao lưu | | | | |
| Tên miền, chứng chỉ ký mã (chia theo tháng) | | | | |
| **Tổng** | | | | |
| **Chi phí / người dùng / tháng** | | | | |

Thời gian vận hành của một người mỗi tuần (ước tính từ 6 tuần thật): cập nhật, sao lưu, xem lỗi, hỗ trợ.

## 4. Pháp lý

- **Nhãn hiệu**: chọn 5–10 tên ứng viên; tra sơ bộ USPTO, WIPO Global Brand Database, EUIPO; tên miền .com/.app/.io; GitHub, app store. **Chỉ tra, chưa chọn** (chọn ở Chặng 6.1).

| Tên | USPTO | WIPO | EUIPO | .com | .app | .io | Ghi chú |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

- **Giấy phép**: MIT cho phép bán; điều kiện giữ ghi công (`LICENSE`, `NOTICE.md`).
- **Nghiên cứu đối thủ**: [Điều khoản của Obsidian](https://obsidian.md/terms) (cập nhật 2025-02-20, tra 2026-10-22) cấm dịch ngược và cấm dùng phần mềm để làm sản phẩm cạnh tranh. Ngày 2026-10-22, một lần chạy REA trên `obsidian.asar` đã dừng ngay lúc bắt đầu và kết quả đã xoá. **Quy tắc:** chỉ nghiên cứu đối thủ qua nguồn công khai (tài liệu, changelog, bảng giá, API công khai), không dịch ngược app độc quyền, không chép giao diện hay chữ. Áp dụng cho cả 12 app trong [doi-thu.md](doi-thu.md). Chi tiết: [obsidian-cong-khai.md](obsidian-cong-khai.md) mục 1.
- **Thanh toán quốc tế từ Việt Nam**: điều kiện Paddle và Lemon Squeezy với người bán/pháp nhân Việt Nam (có nguồn); hệ quả thuế ở Việt Nam (cần hỏi kế toán — ghi câu hỏi, không tự kết luận).
- **Dữ liệu cá nhân**: `/privacy`, `/terms` đã có từ 5.6; ghi điểm còn thiếu nếu bán cho EU / Việt Nam (Nghị định 13/2023 về dữ liệu cá nhân).

## 5. Kinh doanh

- **Giả thuyết giá**: dựa trên bảng giá đối thủ ([doi-thu.md](doi-thu.md)); 2–3 phương án gói (miễn phí / cá nhân / nhóm) với hạn mức tương ứng `plans`.
- **Điểm hoà vốn**: số khách trả tiền cần để bù chi phí mục 3 (và nếu muốn, công sức của chủ dự án).
- **Kênh tiếp cận khả thi** cho một người: Product Hunt, Show HN, r/PKM, r/ObsidianMD, cộng đồng Việt Nam, cộng đồng cờ vua sẵn có của chủ dự án.
- **Sản phẩm chung vs. phiên bản cờ vua làm ngách đầu tiên**: so quy mô thị trường, mức cạnh tranh, lợi thế sẵn có (trung tâm cờ vua, học viên), công sức thêm.
- **Giới hạn**: chỉ một người dùng thử nên chưa có bằng chứng về mức sẵn lòng trả tiền.

## 6. Năng lực

| Câu hỏi | Đánh giá |
|---|---|
| Một người + AI có kham nổi hỗ trợ khách (email, lỗi) ở 100 / 1.000 người dùng? | |
| Ai xử lý sự cố đêm / khi chủ dự án bận? | |
| Cập nhật bảo mật phụ thuộc (Next, Fastify, …) mất bao lâu mỗi tháng? | |
| Cần thêm người / dịch vụ gì? | |

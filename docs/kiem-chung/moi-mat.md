# Đánh giá mọi mặt

> Chặng K – Kiểm chứng ([kế hoạch](../plans/2026-10-20-chang-k-kiem-chung.md)). Mục 1 làm ở Tuần 0; mục 2–6 ở Tuần 3–5.
> Số liệu ghi kèm ngày đo / ngày tra và nguồn.

## 1. Số liệu nền (Tuần 0)

| Chỉ số | Giá trị | Ngày đo | Cách đo |
|---|---|---|---|
| Số tài khoản / vault / note trên production | Chưa đo: Claude không được đọc database production. Chủ dự án xem ở `/admin/stats` | | `/admin/stats` |
| Đĩa VPS dùng / còn | 95 GB / 145 GB (66%), còn 50 GB | 2026-10-26 | `df -h /` |
| RAM / swap dùng | RAM 4,8 / 7,8 GiB (còn khả dụng 3,0 GiB); swap 8,8 / 15 GiB | 2026-10-26 | `free -h` |
| RAM các container `noteriv-*` | Production khoảng 340 MiB cộng lại: api 76, worker 77, collab 55, postgres 50, web 39, redis 33, garage 6, pdf 2, backup 1. Dev (postgres, redis, garage) khoảng 12 MiB | 2026-10-26 | `docker stats --no-stream` |
| Dung lượng Garage (đính kèm) | | | |
| Kích thước bản sao lưu gần nhất | Bản sao thủ công gần nhất (`pre-5-5`, 2026-10-19) là 16,6 MB. Bản sao tự động đẩy lên repo `noteriv-backups`, chưa đo | 2026-10-26 | `ls /root/noteriv-manual-backups` |
| Thời gian mở vault thật của chủ dự án | | | Trình duyệt, tải lại trang, đến khi thấy cây thư mục |
| Số lỗi Sentry 7 ngày qua | | | Sentry |
| Uptime 30 ngày | | | UptimeRobot |

## 2. Kỹ thuật

- **Hiệu năng**: kết quả kịch bản 16–17 ([kich-ban.md](kich-ban.md)); so với ngân sách ở `docs/perf/2026-10-17-after-phase2.md`.
  - 2026-10-26: các việc thường ngày (cây thư mục ~1,7 s, mở note < 0,1 s, tìm kiếm ~1,4 s) gần như không đổi từ 2.000 lên 10.000 note. Vấn đề lớn là các plugin quét cả vault bằng một request mỗi note, vướng giới hạn 300 request/phút ở production ([loi-va-gop-y.md](loi-va-gop-y.md) #5).
- **Bảo mật**: chạy `/security-review` trên mã hiện tại; liệt kê phát hiện theo mức; mục Chặn/Nặng vào [loi-va-gop-y.md](loi-va-gop-y.md).
  - 2026-10-26: rà soát chỉ đọc code (server, web, desktop, phone). Mức rủi ro tổng thể **cao** trước khi mở đăng ký: 3 lỗ Nghiêm trọng và 1 Cao ở worker sync (đã vá trong [phiên K-B1](../plans/2026-10-26-phien-k-b1-bao-mat-server.md), PR #47, qua 2 lượt review), 2 Cao ở desktop, 5 Trung bình, 6 Thấp ([loi-va-gop-y.md](loi-va-gop-y.md) #6–#8). Thấy ổn: phân quyền theo vault (không thấy IDOR), mã hoá credentials, SQL có tham số, token email, plugin sandbox, sanitize markdown. Báo cáo đầy đủ **không để trong repo công khai** (mô tả lỗ chưa vá): giữ ở máy chủ dự án, `~/.config/noteriv/bao-mat-2026-10-26.md`.
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

Chi tiết, nguồn và giả định: [chi-phi.md](chi-phi.md) (2026-10-26). Tóm tắt: khoảng €37 / €63 / €104 mỗi tháng ở 100 / 1.000 / 10.000 người đăng ký (€0,37 / €0,06 / €0,01 mỗi người); khi còn ít người, khoản lớn nhất là ký mã desktop (~€25/tháng). Azure Trusted Signing không cấp cho pháp nhân/cá nhân Việt Nam.

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
- **Đã tra 2026-10-26, chi tiết ở [phap-ly.md](phap-ly.md):** Stripe chưa mở cho pháp nhân Việt Nam; Lemon Squeezy và Polar.sh có trả tiền về Việt Nam, Paddle chưa xác minh; Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 thay Nghị định 13/2023 từ 01/01/2026; có 13 câu hỏi cho kế toán/luật sư.
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

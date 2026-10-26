# Lỗi và góp ý

> Chặng K – Kiểm chứng ([kế hoạch](../plans/2026-10-20-chang-k-kiem-chung.md)). Nguồn: [nhật ký](nhat-ky.md), [kịch bản](kich-ban.md), Sentry, so sánh đối thủ.

## Mức độ

| Mức | Nghĩa | Xử lý trong chặng này |
|---|---|---|
| **Chặn** | Mất/hỏng dữ liệu, không đăng nhập/mở/lưu được, lỗ hổng bảo mật | Sửa ngay, không để mở quá 7 ngày |
| **Nặng** | Việc chính làm được nhưng rất khó chịu hoặc sai; người lạ sẽ bỏ app | Sửa trong chặng |
| **Nhẹ** | Khó chịu nhỏ, có cách tránh | Chỉ sửa nếu lặp lại ≥ 3 lần trong nhật ký |
| **Ý tưởng** | Tính năng mới, cải tiến | Không làm; đưa vào backlog sau quyết định |

Trạng thái: `Mở` · `Đang sửa (nhánh …)` · `Đã sửa (PR #…)` · `Không sửa (lý do)`.

## Danh sách

| # | Ngày | Nguồn | Mức | Mô tả ngắn | Nơi (web/desktop/PWA) | Số lần gặp | Trạng thái |
|---|---|---|---|---|---|---|---|
| 1 | 2026-10-22 | Smoke desktop (phiên K-O1) | Nặng | Trên Windows, đổi tên và kéo-thả di chuyển file trong cây thư mục im lặng thất bại. Nguyên nhân: đường dẫn chỉ được tách theo `/`, trong khi danh sách file trả về `…\tên.md` | desktop | 1 | Đang sửa (nhánh `covuaduongsinh/k-obs-doi-ten-link`) |
| 2 | 2026-10-22 | Đọc code (phiên K-O1) | Nhẹ | Cùng nguyên nhân với #1, còn sót ở: tên file khi xuất PDF, tên tab của vùng chia, tiêu đề tài liệu, gợi ý wiki-link (`desktop/src/app/page.tsx` các chỗ `split("/").pop()`). Có thể hiện cả đường dẫn thay vì tên | desktop | 0 | Mở |
| 3 | 2026-10-22 | Đọc code (phiên K-O1) | Nhẹ | Đổi tên ảnh hoặc tệp đính kèm trên desktop không sửa `![[ảnh.png]]`, vì `listAllFiles` chỉ liệt kê `.md` | desktop | 0 | Mở |
| 4 | 2026-10-23 | Review (phiên K-O9) | Nhẹ | Plugin "Vault insights" phân giải wiki-link theo cách riêng, chưa hiểu `[[Note#Tiêu đề]]`/`[[Note^khối]]`, nên có thể đếm note đó là mồ côi hoặc liên kết hỏng, trong khi đồ thị thì nối đúng. Nên dùng chung cách phân giải trong core | web, desktop | 0 | Đã sửa (PR #38) |
| 5 | 2026-10-26 | Kịch bản 16–17 | Nặng | Đồ thị, Vault insights, dataview… đọc **từng note bằng một request** (`packages/plugins/src/shared/vault.ts` `scanVault`, 8 song song). Vault vài nghìn note gửi vài nghìn request; production giới hạn **300 request/phút mỗi IP**, nên trên khoảng 300 note các tính năng này có thể bị 429 và hỏng, không chỉ chậm. Hướng sửa: endpoint đọc nội dung theo lô (hoặc trả nội dung trong danh sách note) cho `VaultApi` trên web | web | 1 | Mở |
| 6 | 2026-10-26 | Rà soát bảo mật (moi-mat mục 2) | Chặn | Worker sync: tên note/thư mục, branch, symlink và host nội bộ cho phép ghi/đọc file trên worker (C1–C3, H1) | web (server) | 0 | Đang sửa (PR #47, chờ merge) |
| 7 | 2026-10-26 | Rà soát bảo mật | Nặng | Desktop: WebDAV ghi ra ngoài vault (H2); lệnh vault/git của Tauri bỏ qua scope (H3). Phone: token GitHub trong AsyncStorage, `allowBackup` bật (M3) | desktop, phone | 0 | Mở (phiên K-B2) |
| 8 | 2026-10-26 | Rà soát bảo mật | Nặng | Server, mức Trung bình/Thấp: `ADMIN_EMAILS` không đòi email đã xác minh; đính kèm trả `inline` với Content-Type tuỳ ý; refresh token không phát hiện dùng lại; collab không kiểm Origin, payload 100 MB; diagnostics lộ hạ tầng; xoá tài khoản không hỏi lại mật khẩu; giới hạn đăng nhập chỉ theo IP; container chạy root | web (server) | 0 | Mở (phiên K-B3) |

## Phiên sửa đã làm

| Tuần | Nhánh / PR | Các mục | Ghi chú |
|---|---|---|---|
| Ngoại lệ 2 | `covuaduongsinh/k-obs-don-gioi-han`, PR #38 | #4 | [Phiên K-O12](../plans/2026-10-23-phien-k-o12-don-gioi-han.md): đồ thị và Vault insights dùng chung một cách phân giải liên kết |

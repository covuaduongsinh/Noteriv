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
| 1 | 2026-10-22 | Smoke desktop (phiên K-O1) | Nặng | Trên Windows, đổi tên và kéo-thả di chuyển file trong cây thư mục im lặng thất bại. Nguyên nhân: đường dẫn chỉ được tách theo `/`, trong khi danh sách file trả về `…\tên.md` | desktop | 1 | Đã sửa (PR #26 và phiên K-DESKTOP-PATHS) |
| 2 | 2026-10-22 | Đọc code (phiên K-O1) | Nhẹ | Cùng nguyên nhân với #1, còn sót ở: tên file khi xuất PDF, tên tab của vùng chia, tiêu đề tài liệu, gợi ý wiki-link (`desktop/src/app/page.tsx` các chỗ `split("/").pop()`). Có thể hiện cả đường dẫn thay vì tên | desktop | 0 | Đã sửa (phiên K-DESKTOP-PATHS, chuẩn hoá `baseName`/`toPosixPath`) |
| 3 | 2026-10-22 | Đọc code (phiên K-O1) | Nhẹ | Đổi tên ảnh hoặc tệp đính kèm trên desktop không sửa `![[ảnh.png]]`, vì `listAllFiles` chỉ liệt kê `.md` | desktop | 0 | Đã sửa (phiên K-DESKTOP-PATHS, gộp attachments và mở rộng `notesMovedByRename`) |
| 4 | 2026-10-23 | Review (phiên K-O9) | Nhẹ | Plugin "Vault insights" phân giải wiki-link theo cách riêng, chưa hiểu `[[Note#Tiêu đề]]`/`[[Note^khối]]`, nên có thể đếm note đó là mồ côi hoặc liên kết hỏng, trong khi đồ thị thì nối đúng. Nên dùng chung cách phân giải trong core | web, desktop | 0 | Đã sửa (PR #38) |
| 5 | 2026-10-26 | Kịch bản 16–17 | Nặng | Đồ thị, Vault insights, dataview… đọc **từng note bằng một request** (`packages/plugins/src/shared/vault.ts` `scanVault`, 8 song song). Vault vài nghìn note gửi vài nghìn request; production giới hạn **300 request/phút mỗi IP**, nên trên khoảng 300 note các tính năng này có thể bị 429 và hỏng, không chỉ chậm. Hướng sửa: endpoint đọc nội dung theo lô (`POST /:vid/notes/batch`) và `readAll`/`readBatch` cho `VaultApi` | web | 1 | Đã sửa (PR #51, đo lại đồ thị đạt 3,86 s) |
| 6 | 2026-10-26 | Rà soát bảo mật (moi-mat mục 2) | Chặn | Worker sync: tên note/thư mục, branch, symlink và host nội bộ cho phép ghi/đọc file trên worker (C1–C3, H1) | web (server) | 0 | Đã sửa (PR #47) |
| 7 | 2026-10-26 | Rà soát bảo mật | Nặng | Desktop: WebDAV ghi ra ngoài vault (H2); lệnh vault/git của Tauri bỏ qua scope (H3). Phone: token GitHub trong AsyncStorage, `allowBackup` bật (M3) | desktop, phone | 0 | Đã sửa (PR #49) |
| 8 | 2026-10-26 | Rà soát bảo mật | Nặng | Server, mức Trung bình/Thấp: `ADMIN_EMAILS` không đòi email đã xác minh; đính kèm trả `inline` với Content-Type tuỳ ý; refresh token không phát hiện dùng lại; collab không kiểm Origin, payload 100 MB; diagnostics lộ hạ tầng; xoá tài khoản không hỏi lại mật khẩu; giới hạn đăng nhập chỉ theo IP; container chạy root | web (server) | 0 | Đã sửa (PR #50) |

## Phiên sửa đã làm

| Tuần | Nhánh / PR | Các mục | Ghi chú |
|---|---|---|---|
| Ngoại lệ 2 | `covuaduongsinh/k-obs-don-gioi-han`, PR #38 | #4 | [Phiên K-O12](../plans/2026-10-23-phien-k-o12-don-gioi-han.md): đồ thị và Vault insights dùng chung một cách phân giải liên kết |
| Tuần 1 | `covuaduongsinh/k-b1-bao-mat-server`, PR #47 | #6 | [Phiên K-B1](../plans/2026-10-26-phien-k-b1-bao-mat-server.md): bảo mật worker sync (C1–C3, H1) |
| Tuần 1 | `covuaduongsinh/k-b2-bao-mat-desktop-phone`, PR #49 | #7 | [Phiên K-B2](../plans/2026-10-26-phien-k-b2-bao-mat-desktop-phone.md): bảo mật desktop (WebDAV traversal, git scope) & phone (SecureStore, backup) |
| Tuần 1 | `covuaduongsinh/k-b3-bao-mat-server`, PR #50 | #8 | [Phiên K-B3](../plans/2026-10-26-phien-k-b3-bao-mat-server.md): bảo mật server mức Trung bình/Thấp (admin emails, attachment disposition, token reuse, non-root) |
| Tuần 1 | `covuaduongsinh/k-loi-5-doc-note-hang-loat`, PR #51 | #5 | [Phiên Lỗi #5](../plans/2026-10-26-phien-loi-5-doc-note-hang-loat.md): batch note reading endpoint và tối ưu hoá scanVault, giải phóng tắc nghẽn đồ thị |

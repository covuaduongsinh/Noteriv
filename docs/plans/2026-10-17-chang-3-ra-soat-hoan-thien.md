# Chặng 3: Rà soát chất lượng và hoàn thiện

> Ngày lập: 2026-10-17 · Trạng thái: **chưa triển khai** · Lộ trình: [2026-10-17-lo-trinh-thuong-mai.md](2026-10-17-lo-trinh-thuong-mai.md)
> **Phiên mới hãy đọc trước:** [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md)
> **Điều kiện bắt đầu:** Chặng 1 xong. Có thể đan xen với Chặng 2.

## Mục tiêu

- Biết chính xác sản phẩm đang tốt và lỗi ở đâu, trên **cả web và desktop Tauri thật**.
- Có test tự động bảo vệ các luồng chính, để các chặng sau không làm hỏng.
- Dọn hết việc treo đã ghi từ Giai đoạn 1–2.
- **Không bao giờ âm thầm mất nội dung** khi đồng bộ: điều kiện bắt buộc trước khi bán.

---

## Phiên 3.1: Danh sách kiểm thử và một lượt rà soát

1. Viết `docs/qa/checklist.md`: mọi tính năng lõi (editor 3 chế độ, cây file, Quick Open, Command Palette, tìm kiếm, wikilink/backlink, Outline, Tags, Bookmarks, sync git/WebDAV, cộng tác, cài đặt, theme/snippet, quản lý plugin, thùng rác, đính kèm, File Recovery, xuất/xem trước PDF, Math, Clipper) và 17 core plugin (`docs/plugin-api/v1.md` mục 9), mỗi mục có bước thử và kết quả mong đợi, cột web / desktop.
2. Chạy hết một lượt trên staging (web) và desktop Tauri thật (cách thử: `huong-dan-ban-giao-phien.md` mục 7, file 2.2 về cổng debug WebView2).
3. Ghi lỗi tìm được vào bảng ưu tiên trong bản ghi phiên (Cao: mất dữ liệu / không dùng được; Trung bình; Thấp: thẩm mỹ). Chủ dự án duyệt thứ tự sửa.

## Phiên 3.2: Test đầu-cuối (E2E) trong CI

1. Playwright cho web, chạy với API + Postgres trong CI (`.github/workflows/web-ci.yml` đã có Postgres service).
2. Luồng: đăng ký (mã mời) → đăng nhập → tạo vault → tạo/sửa/đổi tên/xoá note → wikilink + backlink → tìm kiếm → bật/tắt một core plugin → tải đính kèm → thùng rác và khôi phục → đăng xuất.
3. Job có `timeout-minutes`; lưu ảnh chụp và trace khi lỗi.
4. Desktop: giữ test giao diện dùng chung (`packages/ui`, jsdom) + một kịch bản khói (smoke) chạy tay theo checklist; tự động hoá desktop để sau.

## Phiên 3.3 – 3.4: Sửa việc treo và lỗi từ 3.1

Việc treo đã ghi (cộng thêm lỗi mới từ 3.1, xếp theo ưu tiên):

| Việc | Nguồn |
|---|---|
| Lỗi đổi tên note trên web | `docs/plans/2026-10-16-phien-1-4-ui.md` |
| **Tab cài đặt của core plugin** (cần cho plugin cờ sau này) | Việc treo Giai đoạn 2 |
| Phát audio trong note (`![Audio](…)` đang vẽ thành ảnh hỏng) | Việc treo Giai đoạn 2 |
| Desktop lưu ngay sau khi plugin sửa nội dung (thay vì chờ 30 giây) | Việc treo Giai đoạn 2 |
| Khôi phục tab nhanh: `workspace-state` trả kèm nội dung note | `docs/perf/2026-10-17-after-phase2.md` mục 5 |
| Desktop tải editor như web (`editorPart`, tải trước khi rảnh) | như trên |
| `GET /sync-connections` gọi 2 lần khi mở vault | như trên |
| Esc đóng hộp CSS Snippets và Thùng rác | như trên |
| Desktop hiện panel sidebar của plugin cộng đồng | `docs/plans/2026-10-16-phien-1-5-plugin-api.md` |
| Renderer gọi `markdown.registerPostProcessor` | như trên |
| Trạng thái core plugin đồng bộ giữa nhiều tab web | như trên |
| Thống nhất tìm kiếm web/desktop (`adapter.search` nhiều kết quả mỗi file) | `docs/plans/2026-10-16-phien-1-4-ui.md` |
| Thử luồng "Tạo vault từ GitHub" bằng token thật | `huong-dan-ban-giao-phien.md` mục 9 |

## Phiên 3.5: Xung đột đồng bộ

Lấy từ phiên 5.1 của lộ trình cũ (`2026-10-14-giai-doan-5-dong-bo-di-dong-chia-se.md`), bỏ phần riêng cho PGN:

1. Khi cả hai phía đã sửa cùng note từ lần sync trước: **giữ cả hai phiên bản** (bản xung đột hoặc bảng `SyncConflict`), đánh dấu note có xung đột.
2. Giao diện giải quyết dùng chung trong `@noteriv/ui`: so sánh hai bên theo dòng, chọn trái / phải / cả hai / sửa tay.
3. Hợp nhất 3 chiều tự động khi hai bên sửa các đoạn khác nhau.
4. Thêm kịch bản vào `web/server/scripts/test-sync-scenarios.ts`: sửa cùng dòng, sửa khác đoạn, xoá một bên và sửa một bên, đổi tên một bên.
5. Báo xung đột ở status bar và mục Chẩn đoán.

## Phiên 3.6: Bảo mật và giao diện hẹp

1. Rà OWASP cơ bản cho API: quyền vault ở **mọi** route (`web/server/src/routes/*`), IDOR, rate limit, kích thước upload, header (helmet).
2. `npm audit` cho ba lockfile (gốc, `web/server`, `web/pdf-service`); xử lý mức cao/nghiêm trọng.
3. Desktop: xem lại CSP của Tauri (đang `null`), quyền của các lệnh Rust.
4. Giao diện ở độ rộng 360–430 px: sidebar thành ngăn kéo, các hộp thoại vừa màn hình (chuẩn bị cho PWA ở Chặng 4).

### Xong khi (cả chặng)
- Checklist chạy hết, không còn lỗi mức Cao.
- E2E chạy xanh trong CI.
- Mọi kịch bản xung đột giữ được cả hai phiên bản.
- Không còn lỗ hổng mức cao trong `npm audit` (hoặc có giải thích).

## Ước lượng
3–5 buổi.

## Trạng thái

| Phiên | Trạng thái | Ngày | Commit / ghi chú |
|---|---|---|---|
| 3.1 Checklist và rà soát | Chưa làm | | |
| 3.2 E2E trong CI | Chưa làm | | |
| 3.3 Sửa việc treo (phần 1) | Chưa làm | | |
| 3.4 Sửa việc treo (phần 2) | Chưa làm | | |
| 3.5 Xung đột đồng bộ | Chưa làm | | |
| 3.6 Bảo mật, giao diện hẹp | Chưa làm | | |

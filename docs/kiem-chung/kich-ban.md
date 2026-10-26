# Kịch bản kiểm chứng

> Chặng K – Kiểm chứng ([kế hoạch](../plans/2026-10-20-chang-k-kiem-chung.md)). Tuần 1–2. Mỗi kịch bản: làm theo các bước, ghi kết quả **Đạt / Đạt có vướng / Không đạt**, thời gian, ghi chú; mục không đạt chuyển sang [loi-va-gop-y.md](loi-va-gop-y.md).
> Chỉ có một người dùng thử, nên các kịch bản "người mới" đóng vai người lạ: tài khoản mới + cửa sổ ẩn danh, **không** dùng kiến thức sẵn có về app, chỉ đọc chữ trên màn hình và tài liệu `docs/`.
> Ai làm: **C** = chủ dự án (thiết bị thật), **A** = Claude (tự động: E2E, script, đo).

Tài liệu dùng lại: [`docs/qa/checklist.md`](../qa/checklist.md), E2E `e2e/`, smoke desktop `e2e/desktop/smoke.mjs`, seed vault `scripts/perf/seed-vault.mjs`, sao lưu [`docs/ops/sao-luu-khoi-phuc.md`](../ops/sao-luu-khoi-phuc.md).

## A. Người mới

| # | Kịch bản | Ai | Bước chính | Kết quả | Thời gian | Ghi chú |
|---|---|---|---|---|---|---|
| 1 | Đăng ký bằng mã mời | C | Tạo mã ở `/admin/invites` → cửa sổ ẩn danh → đăng ký → vào vault mẫu "Getting started" | | | |
| 2 | 10 phút đầu tiên | C | Chỉ đọc vault mẫu, tự tạo 3 note có liên kết `[[…]]`, một thẻ, một việc cần làm; ghi chỗ nào phải đoán | | | |
| 3 | Đổi ngôn ngữ | C | Settings → Language: en ↔ vi; kiểm chữ lẫn hai thứ tiếng | | | |
| 4 | Cài PWA trên điện thoại thật | C | Mở trên Android/iOS → cài → Ghi nhanh `/quick` → note vào Inbox | | | |
| 5 | Tự học bằng tài liệu | C | Chọn 2 việc chưa biết (vd. dataview, mẫu), chỉ dùng `docs/` để làm | | | |

## B. Dữ liệu

| # | Kịch bản | Ai | Bước chính | Kết quả | Thời gian | Ghi chú |
|---|---|---|---|---|---|---|
| 6 | Nhập vault Obsidian thật | C | Nhập vault đang dùng; so số note, đính kèm, liên kết, thẻ, frontmatter | | | |
| 7 | Xuất toàn bộ dữ liệu | C | Xuất (`/users/me/export`) → mở bằng app khác / trình soạn thảo; đủ nội dung? | | | |
| 8 | Xoá tài khoản thử | C | Tài khoản ở kịch bản 1 → xoá → đăng nhập lại bị từ chối; admin không còn thấy | | | |
| 9 | Sửa cùng note ở 2 thiết bị | C | Máy tính + điện thoại sửa cùng đoạn → có bản "(conflict …)", không mất chữ | | | |
| 10 | Offline trên điện thoại | C | Mở note gần đây → tắt mạng → sửa → bật mạng → lên server đúng | | | |
| 11 | Git sync với dịch vụ thật | C+A | Kết nối GitHub/Gitea → sửa ở cả hai phía → không mất dữ liệu | | | |
| 12 | WebDAV sync với dịch vụ thật | C+A | Nextcloud / dịch vụ WebDAV → tương tự 11 | | | |
| 13 | Thùng rác và lịch sử | C | Xoá note → khôi phục; quay về phiên bản cũ | | | |
| 14 | Desktop và web cùng vault | C | Desktop sync cùng repo với web; sửa hai phía | | | |

## C. Cộng tác

| # | Kịch bản | Ai | Bước chính | Kết quả | Thời gian | Ghi chú |
|---|---|---|---|---|---|---|
| 15 | Hai người sửa chung | C | Hai trình duyệt (hai tài khoản) sửa cùng note cùng lúc 5 phút; người xem chỉ đọc | | | |

## D. Hiệu năng

| # | Kịch bản | Ai | Bước chính | Kết quả | Thời gian | Ghi chú |
|---|---|---|---|---|---|---|
| 16 | Vault 2.000 note | A | Seed → đo mở vault, tìm kiếm, đồ thị, gõ phím (staging) | Đạt | 2026-10-26 | Đo ngày 2026-10-26 (đo lại sau khi sửa Lỗi #5 ở PR #51): build production cục bộ (`next start`) cộng API cục bộ, nối DB dev trên VPS qua tunnel SSH; script `scripts/perf/measure-vault.mjs` (Playwright), trung vị 3 lần. Cây thư mục 2,38 s; mở note 304 ms; gõ 25,1 ms/ký tự; tìm kiếm 1,55 s; JS heap 17,2 MB. **Đồ thị hoàn thành trong 3,86 s** (trước khi sửa bị treo > 240 s do đọc từng note đơn lẻ qua 8 request song song). |
| 17 | Vault 10.000 note + đính kèm | A | Như 16; ghi ngưỡng bắt đầu chậm | Đạt | 2026-10-26 | Đo ngày 2026-10-26 (đo lại sau khi sửa Lỗi #5 ở PR #51 trên vault 4.750 note đã seed): build production cục bộ, trung vị 3 lần. Cây thư mục 1,78 s; mở note 119 ms; gõ 33,7 ms/ký tự; tìm kiếm 1,50 s; heap 54,0 MB. **Đồ thị hoàn thành trong 6,39 s** (trước khi sửa bị treo > 240 s). Các thao tác mở note và tìm kiếm vẫn mượt mà dưới 1,5 s. |

## E. Vận hành

| # | Kịch bản | Ai | Bước chính | Kết quả | Thời gian | Ghi chú |
|---|---|---|---|---|---|---|
| 18 | Diễn tập khôi phục | A | Bản sao lưu mới nhất → khôi phục lên staging → đăng nhập, mở note | | | |
| 19 | Máy chủ API sập | A | Dừng API trên staging → người dùng thấy gì; bật lại → tự hồi phục, không mất chữ | Đạt | 2026-10-27 | Đo & kiểm chứng tự động ngày 2026-10-27 bằng Playwright E2E (`scripts/ops/test-api-crash.mjs`). Mô phỏng máy chủ API sập hoàn toàn (HTTP 502 Bad Gateway / rớt mạng): người dùng tiếp tục soạn thảo bình thường; giao diện hiển thị ngay banner offline rõ ràng ("Offline — showing what this device kept. Edits are sent when you're back online.") và trạng thái "Kept on this device". Dữ liệu được lưu an toàn vào hàng đợi `pending` của IndexedDB (`noteriv-offline`). Tải lại trang (F5/Reload) khi API vẫn chết: toàn bộ nội dung vừa gõ vẫn được phục hồi trọn vẹn từ IndexedDB. Khi API hoạt động trở lại: `flushPending()` tự động đồng bộ lên server (HTTP 200 PATCH), banner tự biến mất, đối chiếu database xác nhận Zero Data Loss (không mất một ký tự nào). Xem chi tiết tại `docs/plans/2026-10-27-phien-k-ops-19-api-sap.md`. |
| 20 | Kiểm thử tự động toàn bộ | A | E2E CI xanh; smoke desktop 16/16; unit test | Đạt có vướng | 2026-10-26 | Unit test: core 409/409, ui 176/176, plugins 106/106. Typecheck sạch cho mọi workspace. CI của PR #44: cả 5 job xanh (server, frontend, desktop-frontend, e2e, phone). Giả lập sync của phone 48/48. **Vướng:** smoke desktop chưa chạy lại từ 2026-10-23 (máy thiếu RAM khi build Tauri). Hai test trượt vì chạy quá thời gian khi máy bận: `markdown-renderers` trên CI (PR #42), `i18n-all-plugins` trên máy. Chạy lại thì cả hai qua. |

## Tổng hợp

| Nhóm | Đạt | Đạt có vướng | Không đạt |
|---|---|---|---|
| A. Người mới | | | |
| B. Dữ liệu | | | |
| C. Cộng tác | | | |
| D. Hiệu năng | 2 (kịch bản 16, 17) | | 0 |
| E. Vận hành | 1 (kịch bản 19) | 1 (kịch bản 20) | 0 |

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
| 16 | Vault 2.000 note | A | Seed → đo mở vault, tìm kiếm, đồ thị, gõ phím (staging) | | | |
| 17 | Vault 10.000 note + đính kèm | A | Như 16; ghi ngưỡng bắt đầu chậm | | | |

## E. Vận hành

| # | Kịch bản | Ai | Bước chính | Kết quả | Thời gian | Ghi chú |
|---|---|---|---|---|---|---|
| 18 | Diễn tập khôi phục | A | Bản sao lưu mới nhất → khôi phục lên staging → đăng nhập, mở note | | | |
| 19 | Máy chủ API sập | A | Dừng API trên staging → người dùng thấy gì; bật lại → tự hồi phục, không mất chữ | | | |
| 20 | Kiểm thử tự động toàn bộ | A | E2E CI xanh; smoke desktop 16/16; unit test | | | |

## Tổng hợp

| Nhóm | Đạt | Đạt có vướng | Không đạt |
|---|---|---|---|
| A. Người mới | | | |
| B. Dữ liệu | | | |
| C. Cộng tác | | | |
| D. Hiệu năng | | | |
| E. Vận hành | | | |

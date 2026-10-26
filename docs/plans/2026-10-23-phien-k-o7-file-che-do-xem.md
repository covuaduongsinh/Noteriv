# Phiên K-O7: file chế độ xem `.view` (G5, phần 2)

> Chặng K, Ngoại lệ 2 ([kế hoạch](2026-10-20-chang-k-kiem-chung.md)) · Bản đồ khoảng trống: [obsidian-cong-khai.md](../kiem-chung/obsidian-cong-khai.md) mục G5
> Phần 1: [Phiên K-O5](2026-10-22-phien-k-o5-che-do-xem.md) · Nhánh `covuaduongsinh/k-obs-view-file` · Ngày 2026-10-23 · Đợt 2

## Hành vi

Chủ dự án đã chốt (2026-10-22): một chế độ xem lưu được ở hai dạng, **dùng chung cú pháp**. Phần 1 làm khối ` ```view `, phiên này làm dạng file riêng.

- **Tạo:** lệnh **"Chế độ xem mới" / "New view"**, cần bật core plugin "Chế độ xem".
  - Desktop: tạo file `View.view` ở gốc vault. Cả file là phần cấu hình.
  - Web: tạo note `View.md` có frontmatter `view: true`, cấu hình nằm sau frontmatter. Cách đánh dấu này giống canvas và drawing.
- **Mở:** file hiện thành chế độ xem thay cho editor. Trên cùng có thanh chọn **Bảng / Thẻ / Danh sách / Kanban**. Bấm vào một kiểu thì dòng `layout:` trong file được ghi lại (thêm dòng nếu chưa có), rồi lưu như khi gõ.
- **Sửa cấu hình:** chuyển sang chế độ source, tức editor văn bản thường. Thanh công cụ có dòng gợi ý việc này.
- **Cú pháp:** giống hệt nội dung khối ` ```view ` (`from`, `where`, `layout`, `columns`, `sort`, `group`, `limit`). Sửa ô hay kéo thẻ kanban ghi vào note giống như với khối.
- **Note đánh dấu `view: true` không tự hiện trong danh sách của các chế độ xem**, vì nó là cấu hình chứ không phải dữ liệu.
- **Kanban:** bấm Kanban khi file chưa có `group` thì một dòng `group:` được thêm luôn. Giá trị là cột đầu tiên là thuộc tính, không có thì `status`.
- **Tắt plugin:** file mở ra như văn bản thường, không mất gì.
- **Lưu ý:** một note sẵn có mang thuộc tính `view: true` (đúng kiểu đúng/sai) cũng được coi là file chế độ xem. Cách hiểu này giống `canvas: true` và `drawing: true`.

## Sau review (agent code-reviewer, 2026-10-23)

Review không có lỗi CRITICAL hay HIGH. Đã sửa:
- **(MEDIUM)** Bấm Kanban trên file mới thì báo lỗi "group" và không nút nào sáng → tự thêm `group`.
- **(MEDIUM)** `match` chạy ở mỗi lần render tab mà lại đọc cả front matter → giờ lọc nhanh 4 KB đầu trước khi đọc.
- Note có BOM: không hiện thành view nhưng vẫn bị loại khỏi danh sách → nhận cả BOM.
- Có hai dòng `layout:`: chỉ dòng đầu được đổi trong khi dòng cuối mới có hiệu lực → đổi mọi dòng.
- File `.view` có front matter thì cấu hình bị đọc sai → luôn tách front matter.
- Thanh cuộn lồng nhau trong khung file view → bỏ `overflow` riêng.

## Cách làm

- **Core** (`packages/core/src/views.ts`): thêm `isViewFile`, `isViewNote`, `viewFileSettings`, `setViewLayout`, `VIEW_FILE_EXT`, `VIEW_FILE_TEMPLATE`, cùng 4 test.
- **Plugin** (`packages/plugins/src/views/index.ts`):
  - `createViewFileView` dùng chung processor với khối code, đăng ký qua `ui.registerFileView`.
  - Lệnh `new` dùng `createKindFile` như canvas.
  - Nguồn dữ liệu bỏ qua note `view: true`.
  - Thêm 2 test.
- **i18n:** `plugins.views.{create, failed, layouts.*, fileHint}`, kèm mô tả mới. **CSS:** `.nv-file*`, `.nv-layout`.
- **Không đổi** API plugin hay server.

## Kiểm thử

- core 390/390, plugins 96/96, ui 135/135; `tsc` sạch cho web và desktop.
- E2E web trên bản build production: **59/59**, có test mới "New view creates a view file that shows notes; its layout buttons rewrite the file".
- Smoke desktop (`e2e/desktop/smoke.mjs`) trên bản build cuối: **20/20**.

## Trạng thái

| Việc | Trạng thái |
|---|---|
| File `.view` + note `view: true` | Xong |
| Review độc lập | Xong, đã sửa |
| Merge vào main | Xong, PR #32, đã lên production 2026-10-23 |

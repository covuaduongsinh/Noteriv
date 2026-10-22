# Phiên K-O5: chế độ xem trên thuộc tính, khối ```view (G5, phần 1)

> Chặng K, Ngoại lệ 2 ([kế hoạch](2026-10-20-chang-k-kiem-chung.md)) · Bản đồ khoảng trống: [obsidian-cong-khai.md](../kiem-chung/obsidian-cong-khai.md) mục G5
> Nhánh `covuaduongsinh/k-obs-che-do-xem` · Ngày 2026-10-22 · Đợt 2

## Chủ dự án đã chốt

- Một chế độ xem được lưu thành **khối code trong note**, không dùng định dạng `.base` của Obsidian.
- Làm **cả hai dạng**: phiên này làm khối ` ```view `. Loại file `.view` riêng, dùng chung cú pháp, để một phiên sau.

## Hành vi

Bật core plugin **"Chế độ xem" / "Views"** trong Cài đặt → Core plugins (mặc định tắt), rồi viết:

````
```view
from: Projects            # thư mục và/hoặc #tag; để trống: cả vault
where: status != done     # một điều kiện, hoặc danh sách (phải đúng hết)
layout: table             # table | cards | list | kanban
columns: [file, status, due]
sort: due asc             # một hoặc danh sách; mặc định asc
group: status             # bắt buộc với kanban
limit: 50
```
````

**Điều kiện `where`:**
- Dạng `<trường> <phép so sánh> <giá trị>`. Phép so sánh: `=` `!=` `>` `>=` `<` `<=` `contains` `!contains`.
- Kiểm tồn tại: `<trường> exists` / `!exists`.
- Trường là tên thuộc tính (có dấu cũng được), hoặc `file.name` / `file.path` / `file.folder` / `file.created` / `file.modified`. Riêng `file` là tên note.
- `contains` trên tag có phân cấp: `project` khớp cả `project/a`.

**Các kiểu hiển thị:**
- **Bảng:** bấm vào ô để sửa (Enter để lưu, Esc để huỷ); thuộc tính đúng/sai hiện thành ô tích. Có `group` thì mỗi nhóm có một dòng tiêu đề.
- **Thẻ:** lưới các thẻ.
- **Danh sách:** gạch đầu dòng.
- **Kanban:** cột theo `group`. Kéo thẻ sang cột khác để đặt giá trị. Với trường list (ví dụ tags), chỉ mục của cột cũ được thay, các mục khác giữ nguyên.

**Ghi dữ liệu:**
- Ghi qua `vault.edit`: note đang mở thì sửa ngay trong tab, note khác thì ghi có kiểm phiên bản.
- Giá trị ghi theo kiểu hiện có của thuộc tính. Gõ chữ vào thuộc tính Số thì không ghi gì.
- View tự vẽ lại khi vault thay đổi (lưu note khác, sync), sau 0,3 giây ổn định.

**Giới hạn:**
- `from: #tag` chỉ xét `tags` trong frontmatter, không xét tag viết trong thân note.
- Lệnh "Chèn chế độ xem" thêm một khối mẫu.

## Thay đổi API plugin (`1.0.0-draft.11`, xem `docs/plugin-api/v1.md` §11)

- **`vault.edit(path, transform)`, chỉ cho core plugin.** Sửa note qua tab nếu note đang mở.
  - Trước đây `vault.write` của plugin ghi đè bên dưới tab đang mở, nên lần lưu sau của tab bị coi là bản cũ.
  - Host nhận cách sửa qua `CorePluginPorts.editNote`; web và desktop truyền vào `editNoteInTabs`.
- **`vault.frontmatter()`, chỉ cho core plugin.** Lấy khối frontmatter của mọi note.
  - Web: một request (`/vaults/:id/frontmatter` từ G4).
  - Desktop: đọc file.
- Sandbox của plugin cộng đồng có stub "core only" cho cả hai.

## Cách làm

- **Core:** `packages/core/src/views.ts` (`parseViewSpec`, `runView`, `fieldValue`, `formatCell`), 12 test.
- **Plugin:** `packages/plugins/src/views/index.ts`, 8 test.
  - Nguồn dữ liệu đọc qua `vault.frontmatter`, cache 5 giây.
  - Sau khi sửa, giá trị vừa ghi được ưu tiên trong 10 giây, để tab chưa kịp lưu không làm hiện lại giá trị cũ.
- **CSS:** `.nv-*` trong `packages/ui/styles/app.css`, chỉ dùng `var(--…)`.

## Sau review (agent code-reviewer, 2026-10-22)

Review không tìm thấy XSS (mọi chỗ render dùng `textContent`). Sự kiện bên trong widget không lọt vào editor. Các điểm đã sửa:
- **(HIGH)** Kéo thẻ kanban trên trường list làm mất các mục khác.
- Gõ sai vào ô số làm xoá giá trị.
- `= 0` khớp cả note không có trường đó.
- Tên trường có dấu bị báo lỗi.
- View không tự cập nhật khi note khác thay đổi.
- Sửa thất bại thì ô nhập bị kẹt và lỗi bị nuốt.
- Sắp xếp giảm dần với list rỗng.
- `contains` theo tag phân cấp.
- Kéo file hay chữ từ ngoài vào bị coi như kéo thẻ.
- Dọn các bản ghi "giá trị vừa sửa" đã hết hạn.

## Kiểm thử

- core 374/374, ui 132/132, plugins 94/94; `tsc` sạch cho web và desktop.
- E2E web trên bản build production: **57/57**, có test mới: tạo thuộc tính, bật plugin, chèn khối view, thấy bảng, sửa ô và note được lưu.
- Smoke desktop: **20/20**.

## Trạng thái

| Việc | Trạng thái |
|---|---|
| Khối ```view + API plugin | Xong |
| Review độc lập | Xong, đã sửa theo góp ý |
| Loại file `.view` | [Phiên K-O7](2026-10-23-phien-k-o7-file-che-do-xem.md) |
| Merge vào main | Xong, PR #30 |

# Phiên K-O10: ba tiện ích nhỏ (G9, G10, G11)

> Chặng K, Ngoại lệ 2 ([kế hoạch](2026-10-20-chang-k-kiem-chung.md)) · Bản đồ khoảng trống: [obsidian-cong-khai.md](../kiem-chung/obsidian-cong-khai.md) mục G9, G10, G11
> Nhánh `covuaduongsinh/k-obs-tien-ich` · Ngày 2026-10-23 · Đợt 3 (gom 3 việc theo lựa chọn của chủ dự án)

## Hành vi

### G9: Tạo note mã thời gian (core plugin mới "Tạo note mã thời gian", mặc định tắt)

- Lệnh **"Tạo note mã thời gian"** tạo note đặt tên theo thời điểm hiện tại (mặc định `YYYYMMDDHHmm`, ví dụ `202610231430.md`) rồi mở ra.
  - Nếu tên đã có thì đánh số tiếp: `202610231430 2.md`.
- Cài đặt nằm ngay dưới dòng của plugin trong Cài đặt → Core plugins, kèm dòng xem trước tên note kế tiếp:
  - **Thư mục:** để trống là gốc vault. Đường dẫn được làm sạch, bỏ `..`, `.` và dấu `/` thừa.
  - **Định dạng tên:** các mã `YYYY MM DD HH mm ss` được thay bằng thời gian, phần chữ khác giữ nguyên. Chữ đặt trong `[…]` được giữ nguyên văn, ví dụ `YYYYMMDD [Summary]` không bị thay `mm`.
  - Tên note và từng thư mục đều được làm sạch cho hợp lệ trên Windows:
    - bỏ ký tự mà tên file hay liên kết không chứa được (`\ / : * ? " < > | # ^ [ ]`, ký tự điều khiển);
    - bỏ dấu chấm và dấu cách ở cuối;
    - thêm `_` sau tên thiết bị như `CON` hay `NUL`.
  - Bấm lệnh hai lần thật nhanh chỉ tạo một note. Cài đặt được lưu ngay khi ngừng gõ, và khi đóng cài đặt.

### G10: Ô Chú thích cuối trang (core plugin mới "Chú thích cuối trang", mặc định tắt)

- Lệnh **"Bật/tắt ô Chú thích cuối trang"** mở ô bên phải. Ô liệt kê chú thích của note đang mở theo thứ tự xuất hiện:
  - chú thích `[^id]` cùng định nghĩa `[^id]: …`, kể cả các dòng thụt lề nối tiếp và các đoạn sau dòng trống, và cả định nghĩa nằm trong trích dẫn, danh sách hay thụt lề tới 3 dấu cách;
  - chú thích trong dòng `^[…]`.
- Bấm một mục để tới định nghĩa. Các nút ↑ (↑1, ↑2… khi có nhiều chỗ) để tới từng chỗ tham chiếu.
- Báo **"Chưa có định nghĩa"** khi có tham chiếu mà thiếu định nghĩa, và **"Chưa được dùng"** khi có định nghĩa mà không chỗ nào tham chiếu.
- Bỏ qua frontmatter, code (khối lẫn trong dòng), URL của liên kết và `\[` đã escape. Ô tự cập nhật khi gõ và khi đổi note.

### G11: Xem trước khi rê chuột, giờ có cả trên desktop

- Rê chuột lên một `[[liên kết]]` khoảng 0,3 giây thì hiện thẻ xem trước. Trước đây chỉ có trên web.
- Thẻ hiện:
  - phần đầu note (tối đa 600 ký tự, bỏ frontmatter);
  - hoặc **chỉ mục `#tiêu đề`, hay khối `^id`** khi liên kết trỏ vào đó;
  - hoặc ảnh, khi liên kết trỏ tới ảnh.
- Báo rõ khi không có note, khi note không có tiêu đề hay khối đó, hoặc khi note trống.
- Thẻ đóng khi rời liên kết, khi bấm Esc, cuộn trang, đổi tab hoặc đổi chế độ xem.
- Web và desktop dùng **chung một component**, tìm note theo đúng cách các khối nhúng `![[…]]` làm: ưu tiên note cùng thư mục, và nội dung lấy từ tab đang mở nếu có.

## Cách làm

- **Core:** `packages/core/src/footnotes.ts` (`listFootnotes`), 7 test.
- **Plugin mới:**
  - `packages/plugins/src/footnotes/` (`FootnotesPanel`, panel qua `ui.addSidebarPanel`);
  - `packages/plugins/src/unique-note/` (lệnh và tab cài đặt qua `ui.addSettingsTab`);
  - 6 test (`test/tien-ich.test.tsx`). Cả hai được đăng ký trong `web/src/lib/core-plugins.ts` và `desktop/src/lib/core-plugins.ts`.
- **UI:** `packages/ui/src/panels/NoteHoverPreview.tsx` đọc qua `getEmbedSource()`, kèm 2 test.
  - Web xoá `web/src/components/HoverPreview.tsx` để dùng bản chung.
  - Desktop nối `onWikilinkHover`/`onWikilinkLeave` vào editor chính.
- **i18n:** `plugins.footnotes.*`, `plugins.uniqueNote.*`, `panels.hoverPreview.*`; bỏ `web.hoverPreview.*`. **CSS:** `.hp-image`, `.fn-*`, `.un-*`, chỉ dùng `var(--…)`.
- Không đổi API plugin hay server.

## Sau review (agent code-reviewer, 2026-10-23)

Không có lỗi CRITICAL hay HIGH, không có XSS hay đường dẫn thoát khỏi vault. Đã sửa:
- **(MEDIUM)** Định nghĩa nằm trong trích dẫn, danh sách hoặc thụt lề bị báo "chưa có định nghĩa".
- **(MEDIUM)** Tham chiếu đứng ngay trước dấu `:` bị bỏ qua.
- **(MEDIUM)** Chú thích trong dòng có `[[liên kết]]` bị cắt cụt.
- Footnote:
  - định nghĩa nhiều đoạn bị cắt sau dòng trống;
  - dòng ` ```js ` đóng nhầm khối code;
  - BOM;
  - `[^…]` nằm trong URL bị tính là tham chiếu.
- Note mã thời gian:
  - tên note hoặc thư mục không hợp lệ trên Windows (`CON`, dấu chấm ở cuối, `C:`);
  - chữ có `mm` bị thay;
  - bấm lệnh hai lần tạo đè cùng một note;
  - cài đặt mất khi đóng lúc ô nhập còn focus, hoặc bị ghi đè khi vừa mở.
- Thẻ xem trước kẹt lại khi đổi tab hay đổi chế độ xem bằng phím, và không đóng được bằng Esc. Lỗi này có trên cả web.

**Còn để lại:** khi đóng tab cuối cùng, ô Chú thích vẫn giữ danh sách cũ (giống ô Markdown lint), vì desktop không phát sự kiện nào cho việc đó.

## Kiểm thử

- core 400/400, plugins 105/105, ui 146/146; `tsc` sạch cho web và desktop.
  - Hai test quét catalog i18n đôi khi vượt 5 giây khi máy bận. Chạy riêng thì đạt.
- E2E web trên bản build production: **63/63**, có 2 test mới: xem trước khi rê chuột; Footnotes và note mã thời gian.
- Smoke desktop: **21/21**, có kiểm tra mới "resting on a link previews the note" (rê lại tối đa 3 lần nếu editor chưa vẽ xong dòng).

## Trạng thái

| Việc | Trạng thái |
|---|---|
| G9 note mã thời gian | Xong |
| G10 ô Chú thích cuối trang | Xong |
| G11 xem trước khi rê chuột trên desktop | Xong |
| Review độc lập | Xong, đã sửa |
| Merge vào main | Chờ chủ dự án |

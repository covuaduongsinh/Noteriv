# Phiên K-O11: nhập dữ liệu từ Notion, Evernote và HTML (G12)

> Chặng K, Ngoại lệ 2 ([kế hoạch](2026-10-20-chang-k-kiem-chung.md)) · Bản đồ khoảng trống: [obsidian-cong-khai.md](../kiem-chung/obsidian-cong-khai.md) mục G12
> Nhánh `covuaduongsinh/k-obs-nhap` · Ngày 2026-10-23 · Đợt 4 · Chủ dự án chọn: Notion + Evernote + HTML chung

## Ranh giới

Chỉ đọc **file người dùng tự xuất ra** theo định dạng công khai:
- file `.zip` "Markdown & CSV" của Notion;
- file `.enex` của Evernote, có DTD công khai;
- thư mục hoặc `.zip` HTML do Bear, Google Keep (Takeout) hay trình duyệt xuất ra.

Không gọi API của các app đó, không đọc dữ liệu nội bộ của chúng, không chép mã nào của chúng.

## Hành vi

- **Lệnh mới "Nhập từ Notion, Evernote, HTML…"** có trên cả web lẫn desktop. Hộp thoại gồm các bước:
  1. chọn nguồn;
  2. chọn file hoặc thư mục;
  3. xem trước số note và tệp đính kèm sẽ nhập, kèm các file bị bỏ qua và lý do;
  4. đặt tên **thư mục đích**, mặc định là "Notion", "Evernote" hoặc "HTML";
  5. bấm Nhập, theo dõi tiến độ, xem báo cáo.
- Mọi note được đặt trong thư mục đích. **Không gì có sẵn trong vault bị ghi đè**: note trùng đường dẫn với note đã có thì được đánh số (`Note 2.md`), tệp đính kèm trùng thì giữ bản cũ.
- Hộp thoại đóng bằng Esc (trừ khi đang nhập).
- **Notion** (`.zip` Markdown & CSV, kể cả zip lồng trong zip của bản xuất lớn):
  - Bỏ mã 32 ký tự Notion gắn vào tên file và thư mục.
  - Liên kết giữa các trang thành `[[wiki-link]]`. Ảnh và tệp đính kèm giữ được.
  - Database (CSV) thành một thư mục note:
    - mỗi hàng là một note, cột thành thuộc tính frontmatter. Giá trị lấy từ chính trang của hàng đó, nên hai hàng trùng tên vẫn giữ đúng thuộc tính của mình;
    - thêm một note tổng hợp mang tên database, chứa khối ` ```view ` dạng bảng (nối với G5).
- **Evernote** (`.enex`, chọn được nhiều file, mỗi file là một sổ):
  - Note thành Markdown, chuyển từ ENML/HTML. Giữ được tiêu đề, đoạn và dòng trống, danh sách (lồng nhau, có khối bên trong), việc cần làm, bảng, liên kết, code (cả khối code của Evernote), trích dẫn và đường kẻ. Phần mã hoá `en-crypt` bị bỏ.
  - Ảnh và tệp đính kèm đặt vào `_resources/`, nối với note qua mã băm MD5 như ENEX quy định.
  - Frontmatter gồm `created`, `updated`, `tags` và `source` (URL gốc).
- **HTML chung** (thư mục hoặc `.zip`):
  - Mỗi file `.html`/`.htm` thành một note. Tiêu đề lấy từ `<title>` hoặc `<h1>`. Ảnh tham chiếu tương đối và ảnh `data:` được nhập kèm; ảnh `data:` hỏng chỉ còn chữ thay thế.
  - Nhận nhãn của Google Keep thành tag.
  - File `.md` có sẵn trong thư mục thì nhập nguyên. File `.zip` nằm trong thư mục được giữ là tệp đính kèm, không bị bung.
- Chỉ giữ liên kết `http`, `https`, `mailto` và đường dẫn trong bản xuất. Ký tự `$` và ký hiệu đầu dòng (`#`, `-`, `1.`) trong văn bản được escape để không thành công thức, tiêu đề hay danh sách.

## Cách làm

- **`packages/ui/src/importers/`:** bộ chuyển đổi chạy trong trình duyệt và WebView, dùng `DOMParser`; test trên jsdom.
  - `html-to-markdown.ts`
  - `md5.ts`
  - `enex.ts`
  - `notion.ts`
  - `html-folder.ts`
  - `input.ts`: đọc zip, thư mục hoặc file, dùng `jszip`.
  - Tất cả trả về cùng một dạng `{ notes, attachments, skipped }`, đường dẫn tính trong thư mục đích.
- **`packages/ui/src/panels/AppImport.tsx`:** hộp thoại dùng chung. App truyền vào hàm `write` để ghi kết quả:
  - **web:** chuyển thành `ImportScan` rồi đi qua `runImport` sẵn có, tức tải tệp đính kèm lên rồi viết lại liên kết;
  - **desktop:** ghi file vào vault bằng `writeFile`/`writeBinaryFile`.
- Không đổi server, API plugin hay schema.

## Sau review (agent code-reviewer, 2026-10-23)

Lượt đầu kết luận "yêu cầu sửa": không có lỗ hổng bảo mật, không ghi được ra ngoài thư mục đích, nhưng có 3 lỗi HIGH. Đã sửa:
- **(HIGH)** Hai hàng database cùng tên nhận nhầm thuộc tính của nhau.
- **(HIGH)** Một ảnh `data:` hỏng làm hỏng cả lần nhập HTML.
- **(HIGH)** Bước xem trước giữ toàn bộ tệp đính kèm trong bộ nhớ trong lúc nhập, tức tốn gấp đôi. Giờ chỉ giữ số đếm.
- **(MEDIUM)** Các lỗi đã sửa:
  - `---` sau một dòng biến dòng đó thành tiêu đề;
  - danh sách con dưới mục đánh số bị tách ra;
  - khối bên trong mục danh sách bị ép thành một dòng;
  - bảng lồng bị nhân đôi hàng;
  - khối code và dòng trống của Evernote bị mất, `en-crypt` lộ ra;
  - liên kết có dấu ngoặc trong tên không được chuyển;
  - cột của khối view không khớp tên thuộc tính;
  - zip nằm trong thư mục bị bung;
  - note trùng đường dẫn có sẵn bị bỏ qua, trong khi liên kết lại trỏ vào note cũ.
- **(LOW)** Các lỗi đã sửa:
  - phần mở rộng của tên chưa được làm sạch;
  - thiếu escape `$` và ký hiệu đầu dòng;
  - chỉ chặn được `javascript:` ở dạng thô;
  - xuống dòng trong URL;
  - "Mở note đầu tiên" mở note tổng hợp của database;
  - hộp thoại không đóng bằng Esc, không đặt focus, thanh tiến độ thiếu nhãn;
  - key i18n thừa;
  - file `.json` của Keep bị liệt kê là bỏ qua.

**Còn để lại (ghi nhận):**
- Chưa có nút huỷ khi đang nhập.
- Chưa có giới hạn tổng dung lượng: bản xuất rất lớn vẫn được đọc vào bộ nhớ một lần.
- Trang Notion giữ dòng `# Tiêu đề` như trong Notion.
- Tên thư mục đích không chứa được `/`, nên không nhập thẳng vào thư mục con.
- Ảnh SVG tải lên web dùng chung route tải xuống sẵn có. Cách route này đặt `Content-Type` cho SVG là việc của đường upload, nên kiểm riêng.

## Kiểm thử

- ui 170/170. Có 5 file test mới: `importers-html`, `importers-enex` (gồm vector MD5 của RFC 1321), `importers-notion`, `importers-folder`, `importers-dialog`, cùng các test review. Dữ liệu mẫu tự viết theo đặc tả định dạng, không dùng dữ liệu thật.
- `tsc` sạch cho `ui`, web và desktop.
- E2E web trên bản build production: **64/64**. Test mới nhập một `.zip` Notion mẫu và một `.enex` mẫu.
- Smoke desktop (`e2e/desktop/smoke.mjs`) trên bản build cuối: **22/22**. Kiểm tra mới nhập `.enex` và thấy file trong vault.

## Trạng thái

| Việc | Trạng thái |
|---|---|
| Bộ chuyển đổi + hộp thoại | Xong |
| Review độc lập | Xong, đã sửa |
| Merge vào main | Chờ chủ dự án |

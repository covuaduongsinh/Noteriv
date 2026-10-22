# Phiên K-O6: tìm kiếm có toán tử, tìm & thay thế toàn vault (G6)

> Chặng K, Ngoại lệ 2 ([kế hoạch](2026-10-20-chang-k-kiem-chung.md)) · Bản đồ khoảng trống: [obsidian-cong-khai.md](../kiem-chung/obsidian-cong-khai.md) mục G6
> Nhánh `covuaduongsinh/k-obs-tim-kiem` · Ngày 2026-10-22 · Đợt 2

## Hành vi

Ô "Tìm trong vault" (Ctrl+Shift+F) hiểu cú pháp sau; mặc định không phân biệt hoa thường:

| Cú pháp | Nghĩa |
|---|---|
| `từ1 từ2` | Phải có cả hai, trong nội dung hoặc tên file |
| `a OR b` | Có a hoặc có b |
| `-từ`, `-(…)` | Loại trừ |
| `( … )` | Nhóm |
| `"cụm từ"` | Đúng cụm từ |
| `/regex/` | Biểu thức chính quy (JavaScript) |
| `file:` / `path:` / `content:` | Chỉ tìm trong tên file / đường dẫn / nội dung |
| `tag:x` | Note có thẻ `x` (trong frontmatter hoặc `#x` trong thân), không khớp thẻ con |
| `line:(a b)` | a và b cùng nằm trên một dòng |
| `match-case:` / `ignore-case:` | Phân biệt / không phân biệt hoa thường |
| `[status]`, `[status:done]`, `[status:null]` | Note có / có giá trị / có nhưng rỗng thuộc tính đó |

**Cách chạy:**
- **Truy vấn chỉ gồm từ thường:** vẫn dùng tìm kiếm có xếp hạng như trước (web: full-text của Postgres; desktop: quét file).
- **Truy vấn có toán tử:**
  - Lọc trước bằng các từ mà mọi kết quả buộc phải chứa, qua `notesContaining` (web chỉ cần một request).
  - Sau đó đánh giá chính xác bằng core.
  - Không có từ nào để lọc (chỉ có `path:`, regex…) thì đọc mọi note.
- Truy vấn sai cú pháp thì báo rõ lỗi, ví dụ thiếu dấu nháy đóng hoặc regex sai.

**Thay thế (nút Thay thế trong ô tìm):**
- Thay đúng **một** từ, cụm từ hoặc `/regex/` (regex dùng được `$1`). Được kèm bộ lọc như `path:`, `tag:`, `[thuộc tính]`, phủ định. Không dùng được với `OR`, hay khi có hai thứ cần thay.
- **Bấm hai lần** để xác nhận. Lần bấm đầu đếm trước số note sẽ thực sự đổi và hiện trên nút ("Bấm lần nữa để thay trong 3 note").
- Áp dụng cho **mọi** note khớp, không chỉ những note đang hiện. Danh sách trên màn hình với truy vấn thường có thể chỉ là 50 kết quả đầu.
- Mỗi note được kiểm lại trên nội dung hiện tại trước khi thay. Note đang mở thì thay trong tab, note khác thì ghi có kiểm phiên bản. Note bị đổi ở nơi khác giữa chừng thì bỏ qua và được đếm vào thông báo "không thay được".
- Chỉ thay **nguyên từ** với từ/cụm từ thường (`cat` không đụng `category`), và **không đụng frontmatter**. Regex khớp chuỗi rỗng (`/x*/`) bị từ chối.
- Danh sách kết quả hiện tối đa 500 dòng.

## Cách làm

- **Core:** `packages/core/src/search-query.ts`, 12 test.
  - Phân tích: `parseSearch` (bộ phân tích đệ quy), `isPlainQuery`.
  - Đánh giá: `matchNote`, `prefilterTerms`.
  - Thay thế: `replaceTarget`, `replaceInText`.
- **Server:** `POST /notes/containing` khớp cả tên note (trước chỉ nội dung), để lọc trước không bỏ sót note khớp theo tên file.
- **UI:** `packages/ui/src/panels/VaultSearch.tsx`, với 3 test mới (toán tử, lỗi cú pháp, thay thế hai bước). Web và desktop truyền `editNote={editNoteInTabs}`.
- **i18n:** `panels.vaultSearch.*` (dòng gợi ý mới liệt kê các toán tử). **CSS:** `.search-replace-*`.

## Kiểm thử

- core 386/386, ui 135/135; `tsc` sạch cho web, desktop và server.
- E2E web trên bản build production: **58/58**, có test mới "search operators narrow results, and replace changes the text in every matching note".
- Smoke desktop (`e2e/desktop/smoke.mjs`) trên bản build cuối: **20/20**.

## Review độc lập (đã sửa)

- Thay cả chuỗi con trong từ khác → chỉ thay nguyên từ.
- Thay cả trong frontmatter → chỉ thay phần thân.
- Regex khớp rỗng chèn chữ khắp nơi → từ chối làm đích thay.
- `foo OR`, `()` lặng lẽ khớp mọi note → báo lỗi cú pháp.
- Lọc trước bằng nội dung bỏ sót note khớp theo tên → server khớp cả tên.
- `/usr/bin` bị đọc thành regex → đọc thành chữ; nhận cờ `g`, dấu `/` trong `[...]`.
- Regex biên dịch lại mỗi note → biên dịch một lần.
- UI: bấm Thay hai lần liền → khoá khi đang chạy; note bị bỏ qua vì xung đột giờ được đếm; kết quả cũ của truy vấn trước có thể lấp danh sách sau khi truy vấn lỗi → đã chặn; thông báo cũ còn khi đổi truy vấn → xoá.

## Giới hạn đã biết

- Regex của người dùng chạy trên luồng chính; regex rất tệ (backtracking) có thể làm treo tab một lúc.
- Truy vấn thường dùng full-text có stemming của Postgres, truy vấn có toán tử khớp chuỗi chính xác, nên hai loại có thể cho kết quả hơi khác nhau với cùng một từ.
- Không phân biệt hoa thường dựa trên `toLowerCase`, có thể lệch với vài ký tự ngoài ASCII so với Postgres.

## Trạng thái

| Việc | Trạng thái |
|---|---|
| Toán tử + thay thế | Xong |
| Review độc lập | Xong, đã sửa |
| Merge vào main | Chờ chủ dự án |

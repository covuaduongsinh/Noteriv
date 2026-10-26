# Phiên K-O8: lệnh gạch chéo `/` trong editor (G7)

> Chặng K, Ngoại lệ 2 ([kế hoạch](2026-10-20-chang-k-kiem-chung.md)) · Bản đồ khoảng trống: [obsidian-cong-khai.md](../kiem-chung/obsidian-cong-khai.md) mục G7
> Nhánh `covuaduongsinh/k-obs-slash` · Ngày 2026-10-23 · Đợt 3

## Hành vi

Gõ `/` ở **đầu dòng** hoặc **sau một khoảng trắng** thì mở menu lệnh. Gõ thêm chữ để lọc, Enter hoặc bấm chuột để chọn, Esc để đóng.

- **Không mở** khi `/` nằm giữa từ (`và/hoặc`, `1/2`), trong đường dẫn (`/usr/bin`), trong code (khối hoặc trong dòng), comment hay thẻ HTML, frontmatter, hoặc sau `[[` (lúc đó là tên note).
- **Trong bảng** chỉ hiện các mục chèn trong dòng (in đậm, liên kết…), vì đổi ký hiệu đầu dòng sẽ làm vỡ bảng.
- **Lọc** theo tên mục bằng ngôn ngữ đang dùng:
  - Tiếng Việt gõ không dấu, hoặc gõ liền không cách, đều được (`/tieu`, `/tieude2`).
  - Lọc thêm theo từ khoá tiếng Anh, nên `/h1`, `/todo`, `/table` dùng được ở mọi ngôn ngữ.
  - Không mục nào khớp thì menu đóng, Enter xuống dòng như thường.
- Mỗi lệnh là một bước hoàn tác: Ctrl+Z quay về `/…`. Editor tự cuộn tới con trỏ, ví dụ khi chú thích cuối trang đưa con trỏ xuống cuối note.

**Các mục:**

| Nhóm | Mục | Kết quả |
|---|---|---|
| Đổi dòng hiện tại | Tiêu đề 1–3, danh sách gạch đầu dòng, danh sách đánh số, việc cần làm, trích dẫn, khung ghi chú (callout) | Thay ký hiệu đầu dòng đang có (ví dụ `- Sữa` → `- [ ] Sữa`) và giữ thụt lề. Dòng trích dẫn giữ `>` (`> # …`) |
| Khối riêng | Khối code, khối công thức, bảng, đường kẻ ngang | Thay dòng nếu dòng trống, không thì chèn xuống dưới. Thêm dòng trống ngăn với chữ xung quanh, giữ thụt lề (khối trong list) |
| Trong dòng | In đậm, in nghiêng, gạch ngang chữ, tô sáng `==`, code trong dòng, liên kết | Chèn cặp ký hiệu, con trỏ ở giữa |
| Note | Liên kết tới note `[[`, nhúng note `![[` | Chèn rồi mở luôn danh sách gợi ý tên note |
| Khác | Chú thích cuối trang | Chèn `[^n]` với n kế tiếp, thêm `[^n]: ` cuối note, con trỏ nhảy xuống đó |
| | Ngày hôm nay, giờ hiện tại | `YYYY-MM-DD`, `HH:MM` |

Menu có ở cả chế độ Edit (live preview) lẫn Source, trên web lẫn desktop.

## Cách làm

- `packages/ui/src/editor/slash-commands.ts` (mới): `slashCompletions` là một completion source của CodeMirror.
  - Nó dùng chung `autocompletion` với gợi ý `[[` (`wikilink-completion.ts`), nên hai menu không tranh nhau.
  - Biết con trỏ có đang trong code hay bảng không nhờ cây cú pháp markdown.
  - Mỗi phím gõ thêm thì danh sách được tính lại ngay (`update`).
- i18n `editor.slash.*` (en + vi). Không đổi API plugin hay server.

## Sau review (agent code-reviewer, 2026-10-23)

Lượt đầu kết luận "yêu cầu sửa", không có lỗi CRITICAL hay HIGH. Đã sửa:
- **(MEDIUM)** Đường kẻ ngang ngay dưới đoạn văn biến đoạn đó thành tiêu đề; bảng nuốt luôn dòng kế tiếp. Giờ thêm dòng trống ngăn cách.
- **(MEDIUM)** Gõ nhanh `/h2` rồi Enter thì Enter thành xuống dòng, vì menu còn đang chờ tính lại sau phím cuối. Giờ danh sách được tính lại ngay khi gõ.
- **(MEDIUM)** Chèn chú thích cuối trang không cuộn tới con trỏ. Giờ mọi lệnh đều cuộn.
- Hoàn tác gộp lệnh với phần gõ trước đó. Giờ lệnh được đánh dấu `input.complete`.
- Gõ `/` sau `[[` làm trộn hai menu.
- Bộ gõ sinh dấu kết hợp làm menu đóng giữa chừng; tên tiếng Việt gõ liền không cách không khớp.
- `/` trong comment hay thẻ HTML vẫn mở menu; trong bảng, mục đổi dòng làm vỡ bảng.
- Khối chèn trong list mất thụt lề; trích dẫn mất `>` khi đổi thành tiêu đề; còn thừa dấu cách sau khi bỏ `/…`.
- Quét frontmatter giờ dừng ở 200 dòng.

Lượt review thứ hai trên bản đã sửa còn thấy một lỗi (MEDIUM): dòng chỉ có ký hiệu rồi tới lệnh, như `- /task` hay `## /h1`, giữ lại ký hiệu cũ thành chữ (`- [ ] -`). Đã sửa, kèm 5 test.

**Còn để lại:**
- `/` nằm giữa hai dấu `$` của công thức trong dòng vẫn mở menu, vì bộ phân tích markdown không nhận biết công thức.
- Trong vim mode, bấm Esc lần đầu chỉ đóng menu.

## Kiểm thử

- ui 144/144 (9 test mới, có các trường hợp dòng chỉ có ký hiệu như `- /task` trong `test/slash-commands.test.ts`); `tsc` sạch cho web và desktop.
- E2E web trên bản build production: **60/60**, có test mới "typing / opens the command menu; picking an item formats the line".
  - Ghi chú: CodeMirror bỏ qua Enter trong 75 ms đầu sau khi menu **mới mở** (`interactionDelay`), nên test chờ 100 ms.
- Smoke desktop (`e2e/desktop/smoke.mjs`) trên bản build cuối: **20/20**.

## Trạng thái

| Việc | Trạng thái |
|---|---|
| Menu `/` | Xong |
| Review độc lập | Xong, đã sửa |
| Merge vào main | Xong, PR #33, đã lên production 2026-10-23 |

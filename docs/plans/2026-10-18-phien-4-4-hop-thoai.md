# Phiên 4.4: Rút chuỗi, phần 3 (các hộp thoại còn lại)

> Ngày: 2026-10-18 · Chặng: [4](2026-10-17-chang-4-quoc-te-hoa-nguoi-moi.md) · Nhánh: `covuaduongsinh/chang4-dialogs` (tách từ `covuaduongsinh/chang4-settings-done`, nên PR này mang theo commit tài liệu "4.3 đã lên production")

## Phạm vi

Các hộp thoại còn lại sau 4.3, khoảng 440 chuỗi. Mặc định chuyển tiếp giữ tới hết 4.5. Quy tắc giữ như các phiên trước: `en` là chữ desktop, `vi` là chữ web; chữ chỉ có ở một app thì dịch sang ngôn ngữ còn lại; chữ khác nghĩa giữa hai app dùng khoá `….web` / `….desktop`.

## Đã làm

| Nhóm | Hộp thoại | Khoá |
|---|---|---|
| Dùng chung hai app | CSS Snippets, chọn theme, Publish (xuất HTML), thanh thuộc tính note (FrontmatterEditor) | `snippets.*`, `themes.*`, `publish.*`, `frontmatter.*` |
| Cùng ý, khác cấu trúc | Thùng rác, File đính kèm, Khôi phục file | `trash.*`, `attachments.*`, `fileRecovery.*`, cộng `web.*` / `desktop.*` cho phần riêng |
| Chỉ web | Chẩn đoán, Import (cùng lý do bỏ qua và lỗi trong `lib/vault-import.ts`), xem trước PDF; ba mục còn tiếng Anh trong menu vault (sót từ 4.2) | `web.diagnostics.*`, `web.import.*`, `web.pdfPreview.*`, `web.vaults.*` |
| Chỉ desktop | Trình hướng dẫn cài đặt (SetupWizard), panel cộng tác, menu vault (cả câu `confirm()`), xem ảnh, lỗi nhập đính kèm (`lib/attachment-utils.ts`) | `desktop.setup.*`, `desktop.collab.*`, `desktop.vaults.*`, `desktop.attachments.*` |

- **Số nhiều:** "1 item / 2 items", số note đã thêm, số tệp, số người trong phiên cộng tác đều dùng dạng `{ one, other }`.
- **Thùng rác desktop:** footer trước viết cứng "30 days", nay nhận tham số `{days}` như web.
- **Ngày giờ:** Thùng rác và Khôi phục file định dạng ngày theo ngôn ngữ đang dùng (`formatDate`), thời gian tương đối ("5 phút trước", "5m ago") qua catalog.
- **Báo cáo Chẩn đoán:** phần người dùng bấm "Sao chép báo cáo" trước viết tiếng Việt, nay là tiếng Anh cố định để gửi cho hỗ trợ. Giao diện hộp thoại vẫn theo ngôn ngữ đang dùng.
- **Không dịch, có chủ ý:**
  - commit đầu tiên "Initial commit from Noteriv" (dữ liệu git);
  - tên vault mặc định "Imported vault";
  - tên và mô tả theme có sẵn (mô tả theme không được hiển thị ở đâu);
  - tên phím "Click" / "Esc" ở chân hộp thoại.

**Người dùng web thấy gì:** các hộp thoại trước còn tiếng Anh (chọn theme, CSS Snippets, xuất HTML, thuộc tính note "Add properties" → "Thêm thuộc tính", Khôi phục file) nay là tiếng Việt.

**Người dùng desktop thấy gì:** không đổi chữ, trừ dạng số ít đúng hơn ("1 item").

## Cách làm

Phiên này dùng hai script nhỏ trong scratchpad (không commit):
- `lits.py` liệt kê chữ hiển thị trong một file TSX: chữ JSX (kể cả trải nhiều dòng), thuộc tính `title`/`placeholder`/…, và chuỗi trong code.
- `conv.py` đọc một spec gồm chữ gốc, khoá, bản `en`, bản `vi` và các thay thế đặc biệt. Nó thay chữ thành `t()`, thêm import và `useLocale()`, rồi gộp vào catalog.
  - Các thay thế đặc biệt được kiểm hết trong bộ nhớ trước khi ghi, nên một chỗ không khớp sẽ không để lại file sửa dở.
  - Chuỗi nằm trong comment không bị thay.
  - Hai lỗi của chính script đã sửa giữa phiên: script ghi từng bước (làm hai file AttachmentManager bị sửa dở, đã khôi phục bằng `git checkout`), và script có thể đổi chuỗi trong comment.

## Kiểm chứng

- `npm run typecheck`: sạch.
- `npm test`: 291 + 93 + 86 = **470 test đạt**. Mọi `t("…")` mới dùng khoá viết sẵn, nên test khoá có sẵn đã bao.
- **E2E 9/9 trên bản build production.** Bước tiếng Anh nay mở thêm Thùng rác và kiểm tiêu đề "Trash". Nút "Khôi phục" của thùng rác web giữ đúng chữ để E2E vẫn tìm được.
- **CI lần đầu đỏ ở E2E** (test "reloading restores the open tabs…" thấy 1 tab thay vì 2). Nguyên nhân là chính bước tiếng Anh tôi thêm: tab thứ hai mở một note và sống lâu hơn trước, nên nó ghi trạng thái workspace sau cùng, đè lên trạng thái hai tab của trang chính. Trên máy tôi thứ tự ghi khác nên vẫn đạt. Sửa: trước khi kiểm, trang chính chuyển qua lại hai note để ghi lại trạng thái của nó. Sau sửa, E2E trên máy đạt 9/9 ba lần liên tiếp.
- **Thử bằng mắt:** chụp màn hình từ spec tạm (để ở scratchpad, xoá ngay sau khi chạy, `git status` không có ảnh), ở `vi` và cờ dev `en`. Các cảnh: thanh thuộc tính, File đính kèm, theme, CSS Snippets, Thùng rác, Import, Chẩn đoán, Khôi phục file. Không còn chữ lẫn ngôn ngữ.
- JS tải đầu web: **229,5 KB gzip** (4.3: 223,1; ngân sách ≤ 374).
- **Smoke desktop (app Tauri thật) 16/16** sau `CARGO_BUILD_JOBS=2 npx tauri build --no-bundle`.

## Chưa làm / để sau

- 4.5:
  - trang `/vaults`, `/admin/invites`, `/login`, `/register`, `/terms`, `/privacy`, `LegalShell`;
  - ngày giờ còn lại qua `Intl`;
  - quyết định tên mặc định "Untitled" / "New Folder";
  - làm rỗng `NOT_YET_TRANSLATED`;
  - **đổi mặc định** theo ngôn ngữ trình duyệt/OS, hiện ô Language, E2E chuyển sang tiếng Anh.

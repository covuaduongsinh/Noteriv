# Phiên K-O2: liên kết đi ra và nhắc đến chưa liên kết (G3)

> Chặng K, Ngoại lệ 2 ([kế hoạch](2026-10-20-chang-k-kiem-chung.md)) · Bản đồ khoảng trống: [obsidian-cong-khai.md](../kiem-chung/obsidian-cong-khai.md) mục G3
> Nhánh `covuaduongsinh/k-obs-lien-ket-di-ra` · Ngày 2026-10-22

## Hành vi

- **Ô Backlinks** có thêm mục **"Nhắc đến chưa liên kết"**: các note gọi tên note đang mở mà không kèm liên kết.
  - Mỗi chỗ nhắc hiện số dòng, đoạn trích và nút **Liên kết**.
  - Bấm nút thì chỗ đó thành `[[chữ đang viết]]`, hoặc thành `[[đường/dẫn|chữ]]` nếu tên trùng với note khác.
- **Ô mới "Liên kết đi ra"** (menu View, Command Palette: "Toggle Outgoing links"), gồm hai phần:
  - Các liên kết của note đang mở, mỗi đích hiện một lần. Bấm để mở; liên kết tới note chưa có thì hiện mờ.
  - Tên các note khác được nhắc trong note này mà chưa liên kết, kèm nút Liên kết.
  - Ô này cập nhật theo nội dung đang gõ; phần nhắc đến được tính lại sau 0,4 giây ngừng gõ.
- **Thế nào là một "nhắc đến":** tên note (không có `.md`) đứng thành từ riêng, không phân biệt hoa thường, kể cả có dấu và có ký tự đặc biệt. Không tính chữ nằm trong liên kết, code block, inline code hay front matter.
- **Note đang mở trong tab thì sửa ngay trong tab**, rồi tab tự lưu. Không ghi đè ngầm bên dưới tab, vì như vậy lần lưu sau sẽ bị coi là cũ (web), hoặc watcher sẽ thay mất chữ chưa lưu (desktop). Note không mở thì đọc rồi ghi có kiểm phiên bản (`writeNoteIfUnchanged`).

## Cách làm

- `packages/core/src/link-mentions.ts`: `outgoingLinks`, `findMentions`, `unlinkedMentionsIn`, `linkMention`, kèm 8 test.
- `packages/ui/src/panels/`:
  - `BacklinksPanel.tsx` (thêm mục mới).
  - `OutgoingLinksPanel.tsx` (mới).
  - `note-edit.ts`: kiểu `NoteEditor` và `adapterNoteEditor`.
  - 2 test render thật trong `panels.test.ts`.
- **Web:** `editNoteInTabs` trong trang vault, menu View, hotkey `toggleOutgoingLinks`.
- **Desktop:** `editNoteInTabs` và `showOutgoing`, cùng hotkey.
- Tìm note có nhắc tên dùng lại `notesContaining` của G1.

### Đổi giao ước của `notesContaining`

- **Trước:** gặp lỗi nào cũng chuyển sang đọc toàn bộ note.
- **Sau:** chỉ khi adapter trả `null` (kết quả bị cắt) mới đọc toàn bộ. Lỗi mạng được báo thành lỗi.
- **Lý do đổi:** E2E "reloading restores the open tabs" phát hiện trường hợp tải lại trang huỷ request đang chạy (`Failed to fetch`). Code cũ đi vào nhánh dự phòng và bắn ra một GET cho mỗi note. Khi mất mạng, việc đó vừa vô ích vừa tốn tài nguyên.

## Sau review (agent code-reviewer, 2026-10-22)

- **Front matter dùng CRLF/BOM (file tạo trên Windows)** trước đây không được loại trừ. Hậu quả: bấm Liên kết có thể ghi `[[…]]` vào YAML. Đã sửa, có test.
- **Hiệu năng:** viết lại thành một lượt quét cho mọi tên note. Vùng loại trừ được tính một lần, tên note tra theo ký tự đầu, số dòng tìm bằng tìm kiếm nhị phân. Đo được khoảng 45 ms với 5.000 tên trên note 10KB, và chỉ chạy sau 0,4 giây ngừng gõ.
- **Không phá cấu trúc Markdown:** không tính nhắc đến trong URL trần, `#tag`, comment HTML, `$math$`. Ở trong dòng bảng thì dùng `[[đường/dẫn\|chữ]]`.
- **Không link nhầm chỗ:** tìm lại chỗ nhắc đến theo vị trí, hoặc theo cùng dòng và cùng chữ. Không tìm thấy thì không sửa gì.
- **Đọc toàn bộ note (desktop, hoặc khi kết quả bị cắt):** giới hạn 8 lần đọc song song.
- **Chuẩn hoá NFC** (tên file kiểu macOS). Ranh giới từ tính theo code point.
- **Desktop:** tab được sửa từ panel, hay được viết lại liên kết ở G1, giờ lưu theo vòng 5 giây thay vì chờ autosave 30 giây.
- **Panel:** lỗi tải hiện thông báo riêng, không còn trông như "không có gì". Timer được huỷ khi đổi note. Note vừa mở được quét ngay.
- **Không đổi:** chuyện collab trên web. Sửa note đang mở đi qua editor, mà `onChange` của editor đã đẩy thay đổi sang Yjs như một lần gõ.

## Giới hạn

- Chưa hỗ trợ alias (thuộc tính `aliases`), vì thuộc tính có kiểu là G4.
- Chưa có cài đặt "loại trừ file".
- Ô Liên kết đi ra quét tên của mọi note mỗi lần ngừng gõ: nhẹ với vài nghìn note, chưa đo với vault rất lớn.
- App Android chưa có hai ô này.

## Kiểm thử

- core 338/338 (12 test cho `link-mentions`), ui 124/124; `tsc` sạch cho web và desktop.
- E2E web trên bản build production: **54/54**, có test mới "unlinked mentions can be turned into links; Outgoing links lists what a note links to".
- Smoke desktop: 18/18.

## Trạng thái

| Việc | Trạng thái |
|---|---|
| Core + UI + web + desktop | Xong |
| Review độc lập | Xong, đã sửa theo góp ý |
| Merge vào main | Chờ chủ dự án |

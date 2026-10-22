# Phiên K-O3: nhúng note và tham chiếu khối (G2)

> Chặng K, Ngoại lệ 2 ([kế hoạch](2026-10-20-chang-k-kiem-chung.md)) · Bản đồ khoảng trống: [obsidian-cong-khai.md](../kiem-chung/obsidian-cong-khai.md) mục G2
> Nhánh `covuaduongsinh/k-obs-nhung-note` · Ngày 2026-10-22

## Hành vi

Một dòng chỉ chứa `![[…]]` hiện **nội dung thật** của đích. Các dạng được hỗ trợ:

| Cú pháp | Hiển thị |
|---|---|
| `![[Note]]` | Cả note, bỏ front matter |
| `![[Note#Heading]]` | Section dưới heading đó, tới heading kế tiếp cùng cấp hoặc cao hơn |
| `![[Note#^id]]` | Khối mang `^id` (xem bảng dưới) |
| `![[pic.png]]` | Ảnh |

Khối mang `^id` được hiểu như sau:

| Vị trí của `^id` | Khối được lấy |
|---|---|
| Cuối một đoạn văn | Cả đoạn văn |
| Cuối một mục list | Mục list cùng các mục con |
| Đứng riêng một dòng, kể cả cách khối phía trên một dòng trống | Khối phía trên (list, bảng, code block…) |

- **Khung nhúng:**
  - Có tiêu đề kiểu `Note › Heading`. Bấm tiêu đề để mở note.
  - `[[link]]` bên trong khung nhúng bấm được.
  - Nhúng lồng nhau tối đa 4 cấp. Note tự nhúng chính nó thì dừng và báo.
  - Đích không có trong vault hoặc heading không có trong note thì báo rõ.
- **Nhúng nằm giữa dòng chữ** vẫn hiện dạng chip. Chip trỏ tới note thì bấm được. Chip trỏ tới ảnh hay PDF thì không, vì bấm vào sẽ tạo ra một note mới mang tên file đó.
- **`[[Note#Heading]]`, `[[Note#^id]]`, `[[#Heading]]`** mở note rồi cuộn tới đúng chỗ, trên cả web và desktop.
- **Dấu `^id`** cuối dòng hiện mờ trong editor, và không hiện trong khung nhúng.
- **Nội dung nhúng:** note đang mở trong tab thì lấy chữ của tab, kể cả chữ chưa lưu. Note thay đổi thì khung nhúng tải lại ở lần editor vẽ lại kế tiếp: web theo mỗi lần index note thay đổi, desktop theo watcher của vault.

## Cách làm

- **Core:** `packages/core/src/note-embed.ts` (`parseLinkTarget`, `extractEmbed`, `anchorLine`, `stripBlockIds`), 8 test.
- **UI:**
  - `packages/ui/src/markdown/renderers/note-embed.ts`: block renderer và widget, có 4 test render bằng jsdom.
  - `vault-hooks.ts`: thêm `EmbedSource` và phiên bản nhúng (`bumpEmbedVersion`).
  - Style trong `theme.ts`, chỉ dùng `var(--…)`.
- **Web** (`web/src/app/vaults/[vaultId]/page.tsx`):
  - `EmbedSource` cache nội dung note theo phiên bản; ảnh được tra theo tên file trong danh sách đính kèm.
  - `openWikilink` phân giải đường dẫn giống phần nhúng (`resolveLinkTarget`), rồi cuộn tới heading hoặc khối.
- **Desktop** (`desktop/src/app/page.tsx`):
  - `openWikilinkTarget` thay bộ xử lý bấm link cũ.
  - `EmbedSource` cache danh sách file theo phiên bản; ảnh dùng bộ nạp ảnh cục bộ.

### Lỗi có sẵn được sửa trên desktop

- Bấm `[[Note#Heading]]` hoặc `[[Note|alias]]` không mở được note, vì phần `#…`/`|…` không được cắt.
- Đường dẫn chỉ được tách theo `/`.

## Sau review (agent code-reviewer, 2026-10-22)

Review không tìm thấy lỗi XSS, mọi HTML đều đi qua `sanitizeHtml`. Các điểm đã sửa:

- **Chip ảnh/PDF tạo note rác khi bấm:** chỉ chip trỏ tới note mới bấm được.
- **Web mất hoặc cuộn nhầm:** chỉ cuộn khi editor đã chứa nội dung của note mới.
- **`^id` đứng riêng sau dòng trống hoặc sau code block** trước đây không tìm được khối.
- **Heading `## C#`** bị đọc thành "C".
- **Đoạn văn nhiều dòng:** trước đây chỉ lấy dòng cuối.
- **Nạp lại quá nhiều:** cache theo phiên bản; widget dựng lại khi phiên bản đổi.
- **Thuộc tính khung nhúng:** đổi tên thành `data-embed-target`, để bộ bắt sự kiện bấm toàn cục của desktop không coi cả khung là một link.

## Giới hạn

- Nhúng lồng nhau phân giải đường dẫn tương đối theo note đang mở, không theo note chứa embed. Chỉ khác biệt khi tên note trùng nhau.
- Chưa hỗ trợ heading kiểu setext (gạch dưới bằng `===`), cũng chưa hỗ trợ tham số ảnh (`|300`) hay trang PDF.
- Xuất PDF và Publish vẫn hiện `![[…]]` dạng chữ, chưa nhúng nội dung.
- Khung nhúng chỉ đọc; muốn sửa thì mở note gốc.
- App Android chưa có tính năng này.

## Kiểm thử

- core 346/346, ui 128/128; `tsc` sạch cho web và desktop.
- E2E web trên bản build production: **55/55**, có test mới "embedding a note shows its content; the embed's title opens it".
- Smoke desktop: **19/19**, có bước mới "an embedded note (![[Beta]]) shows its content".

## Trạng thái

| Việc | Trạng thái |
|---|---|
| Core + UI + web + desktop | Xong |
| Review độc lập | Xong, đã sửa theo góp ý |
| Merge vào main | Chờ chủ dự án |

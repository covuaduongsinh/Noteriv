# Phiên K-O4: thuộc tính có kiểu và ô Tất cả thuộc tính (G4)

> Chặng K, Ngoại lệ 2 ([kế hoạch](2026-10-20-chang-k-kiem-chung.md)) · Bản đồ khoảng trống: [obsidian-cong-khai.md](../kiem-chung/obsidian-cong-khai.md) mục G4
> Nhánh `covuaduongsinh/k-obs-thuoc-tinh` · Ngày 2026-10-22 · Phiên cuối của Đợt 1

## Lỗi mất dữ liệu có sẵn được sửa trong phiên này

**Lỗi:** ô thuộc tính cũ (`FrontmatterEditor`) đọc frontmatter từng dòng một. Vì vậy:
- List kiểu YAML khối (`tags:` rồi các dòng `  - a`, đúng cách Obsidian ghi) bị đọc thành rỗng.
- Sửa **bất kỳ** thuộc tính nào là ghi lại cả khối, nên các mục của list **bị xoá**.

Vault nhập từ Obsidian sẽ mất thẻ chỉ vì sửa một thuộc tính khác.

**Cách sửa:** editor mới chỉ ghi lại đúng dòng của thuộc tính đang sửa; phần còn lại của khối giữ nguyên từng ký tự.

**Thêm:** desktop vốn **không hiện ô thuộc tính nào**. Component có trong code nhưng không được render.

## Hành vi

### Thuộc tính trong note

- **Kiểu:** Văn bản, Danh sách, Số, Hộp chọn, Ngày, Ngày & giờ, Thẻ. Mỗi kiểu có control riêng: ô chữ, chip, ô số, hộp chọn, bộ chọn ngày.
- **Kiểu gắn với tên thuộc tính và áp dụng cho cả vault.** `tags` luôn là Thẻ. Tên chưa đặt kiểu thì đoán theo giá trị.
- **Đổi kiểu chỉ chuyển giá trị khi không mất gì:** `"a, b"` ⇄ `[a, b]`, `3` ⇄ `"3"`. Nếu không chuyển an toàn được thì giữ nguyên.
- **Bấm vào rồi bấm ra một ô mà không sửa thì không ghi gì.**
- **Giá trị không khớp kiểu** (ví dụ `rating: TBD` trong thuộc tính Số) hiện như văn bản, không bị xoá.
- **YAML không sửa được** (map lồng, chuỗi nhiều dòng, khoá trùng, `[[link]]` không có ngoặc kép, mục list kèm comment) hiện chỉ đọc và giữ nguyên.
- **Giữ nguyên** CRLF, BOM, comment, số `01234` / `1.10` (không đổi thành `1234` / `1.1`), dòng trống bên trong list. Khối mở mà không đóng thì không đụng tới.
- **Tên không hợp lệ bị từ chối**, ví dụ tên có `:` hoặc `#`, hay bắt đầu bằng `-`.

### Ô Tất cả thuộc tính

Mở từ menu View hoặc Command Palette ("All properties").
- Liệt kê mọi thuộc tính trong vault, kèm số note dùng và kiểu.
- Đổi kiểu áp dụng cho cả vault.
- Bấm vào một thuộc tính để xem các note dùng nó.
- **Đổi tên** áp dụng trên mọi note:
  - Note đang mở trong tab được sửa ngay trong tab.
  - Note khác được ghi có kiểm phiên bản.
  - Kiểu chỉ chuyển sang tên mới khi mọi note đều đổi được.

## Lưu kiểu thuộc tính

| Nền tảng | Nơi lưu |
|---|---|
| Web | Khoá `propertyTypes` trong cài đặt của vault (`Vault.settings`) |
| Desktop | File `.noteriv/property-types.json` trong vault |

- **Vì sao desktop lưu vào file:** cài đặt của adapter desktop là cài đặt chung của ứng dụng. Nếu lưu ở đó, mỗi lần đổi theme sẽ ghi đè kiểu thuộc tính, và mọi vault sẽ dùng chung một bộ kiểu.
- Các lần ghi được xếp hàng, nên hai thay đổi liên tiếp không ghi đè nhau.

## Cách làm

- **Core:** `packages/core/src/properties.ts`, 19 test.
  - Đọc và ghi: `readProperties`, `writeProperty`, `deleteProperty`, `renamePropertyKey`.
  - Kiểu: `convertLossless`, `isValidPropertyKey`, `collectVaultProperties`.
- **UI** (`packages/ui/src/panels/`), có 4 test render:
  - `PropertiesEditor.tsx` (thay hai bản `FrontmatterEditor` cũ đã xoá).
  - `PropertiesView.tsx`.
  - `property-types.ts`.
- **Server:** `GET /vaults/:id/frontmatter` chỉ trả khối frontmatter của các note (cắt sẵn, nhận cả BOM). Không cần migration.
- **Web và desktop:** ô thuộc tính nằm trên editor (ẩn ở chế độ Source); thêm hotkey `toggleProperties` và mục menu.

## Sau review (agent code-reviewer, 2026-10-22)

**HIGH, đã sửa:**
- Bấm vào rồi bấm ra một ô làm xoá hoặc viết lại giá trị.
- Số `01234` / `1.10` bị đổi.
- Đổi kiểu làm mất giá trị.
- Kiểu thuộc tính trên desktop bị cài đặt khác ghi đè và dùng chung mọi vault.

**MEDIUM, đã sửa:**
- Dòng trống bên trong list bị cắt đôi thuộc tính.
- Tên thuộc tính không hợp lệ.
- Khoá trùng.
- Endpoint gửi 20.000 ký tự cho mỗi note (giờ chỉ gửi khối frontmatter) và bỏ sót note có BOM.
- Race khi lưu kiểu.

**LOW, đã sửa:** đổi tên dựa trên danh sách cũ, cho phép đổi tên `tags`, khối frontmatter không đóng, BOM, `[[link]]` không có ngoặc kép, mục list kèm comment.

**Còn lại:**
- Trên web, kiểu thuộc tính vẫn nằm chung `Vault.settings` với cài đặt khác. Hai người cùng lưu cài đặt vault đúng một lúc thì lần ghi sau thắng. Đây là giới hạn có sẵn của `Vault.settings`.

## Kiểm thử

- core 365/365, ui 132/132; `tsc` sạch cho web, server, desktop.
- E2E web trên bản build production: **56/56**, có test mới "typed properties: a number property is set and listed in All properties". Trong lúc chạy có hai test cũ hỏng luân phiên một lần rồi đạt khi chạy lại (nghi do tunnel tới database dev chậm); lần chạy đầy đủ cuối đạt 56/56.
- Smoke desktop: **20/20**, có bước mới "properties editor adds properties to the note".

## Trạng thái

| Việc | Trạng thái |
|---|---|
| Core + UI + server + web + desktop | Xong |
| Review độc lập | Xong, đã sửa theo góp ý |
| Merge vào main | Chờ chủ dự án |

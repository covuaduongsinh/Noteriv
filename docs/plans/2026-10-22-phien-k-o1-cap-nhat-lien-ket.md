# Phiên K-O1: đổi tên note thì cập nhật liên kết (G1)

> Chặng K, Ngoại lệ 2 ([kế hoạch](2026-10-20-chang-k-kiem-chung.md)) · Bản đồ khoảng trống: [obsidian-cong-khai.md](../kiem-chung/obsidian-cong-khai.md) mục G1
> Nhánh `covuaduongsinh/k-obs-doi-ten-link` · Ngày 2026-10-22 · Chủ dự án chốt làm đủ 4 đợt (G1 → G12), thứ tự theo đề xuất.

## Vấn đề

Trên web, đổi tên hoặc chuyển chỗ một note chỉ đổi đường dẫn của chính nó (`web/server/src/routes/notes.ts`). Các `[[liên kết]]` ở note khác vẫn trỏ tới tên cũ và bị gãy mà không ai báo. Desktop cũng vậy. Đây là mất dữ liệu ngầm.

## Hành vi (đặc tả bằng lời của dự án)

- Đổi tên hoặc chuyển chỗ một note, hay đổi tên hoặc chuyển chỗ một thư mục (mọi note bên trong), thì mọi liên kết trỏ tới đường dẫn cũ được sửa sang đường dẫn mới.
- **Liên kết giữ nguyên dạng đã viết:**
  - Chỉ tên thì vẫn chỉ tên. Nếu tên mới bị trùng (sẽ trỏ nhầm note khác) thì đổi sang đường dẫn.
  - Đường dẫn thì vẫn đường dẫn.
  - Có `.md` thì giữ `.md`.
  - Giữ `|alias`, `#heading`, `#^block` và dấu `!` của embed.
- **Link Markdown** `[x](a/b.md#y)` tương đối với note chứa nó: tính lại đường dẫn tương đối. Giữ `<...>` nếu link viết trong ngoặc nhọn, còn không thì mã hoá dấu cách thành `%20`. Note bị chuyển chỗ thì các link tương đối của chính nó cũng được tính lại.
- **Không đụng** vào code block (` ``` `/`~~~`) và inline code.
- **Tên trùng:** khi nhiều note cùng tên, liên kết chỉ có tên được hiểu là note cùng thư mục, rồi đến đường dẫn ngắn nhất, rồi theo thứ tự chữ cái. Quy tắc này cố định, không phụ thuộc thứ tự liệt kê.
- **Cài đặt** "Update links when renaming" / "Cập nhật liên kết khi đổi tên" (mục Editor), **bật mặc định**. Tắt thì không sửa gì.
- **Thông báo:** "Updated links in N notes". Nếu có note không ghi được thì báo cần kiểm tra lại.
- **Tab đang sửa dở (chưa lưu):** không ghi đè từ ngoài. Văn bản trong tab được viết lại cùng cách, rồi lần lưu kế tiếp của chính tab đó ghi xuống. Vì vậy không mất chữ đang gõ, và web không sinh bản xung đột giả.

## Cách làm

- `packages/core/src/link-rename.ts` (dùng chung web + desktop):
  - `rewriteLinksForMoves` (hàm thuần).
  - `updateLinksAfterMove` (điều phối qua `VaultAdapter`).
  - `expandFolderMove`, `notesMovedByRename` (desktop), `linkSearchTerms`.
  - Có 21 test trong `packages/core/test/link-rename.test.ts`.
- `VaultAdapter.notesContaining?` (tuỳ chọn): web hỏi server `POST /vaults/:vid/notes/containing` (tìm theo chuỗi, không phân biệt hoa thường, tối đa 200 chuỗi mỗi request, tối đa 5000 note) thay vì tải từng note. Desktop đọc file trực tiếp.
- **Web:** `Sidebar` báo các lần di chuyển (đổi tên, kéo thả note hoặc thư mục) qua `onMoved`, rồi `handleNotesMoved` trong `web/src/app/vaults/[vaultId]/page.tsx` xử lý.
- **Desktop:** `updateLinksForRename` chạy sau `handleFileRename` (`desktop/src/app/page.tsx`). Mọi đường đổi tên và chuyển chỗ trên desktop đều đi qua hàm này.
- **i18n:** `settings.autoUpdateLinks.*`, `shell.files.linksUpdated` / `linksNotUpdated` (en + vi).

## Sau review (agent code-reviewer, 2026-10-22)

- **Không bao giờ ghi đè bản mới hơn.**
  - PATCH note có thêm `expectHash`: nếu nội dung đã đổi thì server trả 409 `changed` và không tạo bản xung đột.
  - Adapter có `writeNoteIfUnchanged` (desktop: đọc lại ngay trước khi ghi).
  - Note bị đổi giữa chừng thì đọc lại, viết lại liên kết, ghi lại một lần. Vẫn không được thì báo lỗi.
- **Tab được quyết định theo nội dung tại lúc cập nhật state.**
  - Tab sạch thì nhận văn bản mới.
  - Tab có chữ chưa lưu, kể cả gõ trong lúc chạy, thì giữ chữ đó, viết lại liên kết, rồi lưu theo đường thường.
- **URL Markdown** được mã hoá lại theo kiểu link gốc (`%28`, `%23`, `%C3%A9`…). Từ khoá tìm kiếm có thêm dạng mã hoá đầy đủ.
- **Kết quả tìm bị cắt:** endpoint báo `truncated` khi vượt 5000 note; khi đó client đọc toàn bộ note thay vì bỏ sót.
- **Fence code thụt lề** (trong list) được bỏ qua. Link có nhãn là ảnh (`[![i](a.png)](b.md)`) được sửa.
- **Lỗi có sẵn trên desktop Windows**, smoke phát hiện: đổi tên và kéo-thả di chuyển im lặng thất bại, vì đường dẫn chỉ được tách theo `/`. Đã sửa trong `Sidebar.tsx` (`parentOf`) và `page.tsx`. Những chỗ còn sót cùng loại ghi ở [loi-va-gop-y.md](../kiem-chung/loi-va-gop-y.md) #2.

## Giới hạn đã biết

- **Desktop:** `listAllFiles` chỉ trả về note `.md`, nên đổi tên ảnh hay tệp đính kèm chưa cập nhật `![[ảnh.png]]`. Web không bị ảnh hưởng (đính kèm là URL).
- **Web:** note đang mở trong phiên cộng tác (Yjs) do người khác sửa có thể bị phòng cộng tác ghi đè lại. Đây là giới hạn sẵn có của mọi lần ghi REST (sync import…), không phải lỗi mới.
- Đổi tên do plugin (API `vault.rename`) hoặc qua sync Git/WebDAV không kích hoạt việc cập nhật này.
- App Android chưa có (theo kế hoạch mobile M2–M4).

## Kiểm thử

- `packages/core`: 326/326 test (có 26 test cho `link-rename`), `npm run typecheck`. `tsc` sạch cho web, web/server, desktop.
- E2E web trên bản build production: **53/53**, trong đó có test mới "renaming a note rewrites the links that point to it" (`e2e/tests/core-flows.spec.ts`).
- Smoke desktop (`e2e/desktop/smoke.mjs`): **18/18**, trong đó có bước mới "renaming a note rewrites the links to it". Bước này đổi tên `Beta` thành `Gamma` qua menu chuột phải, rồi kiểm `Alpha.md` trên đĩa.
- Thông báo dùng `var(--…)` nên đổi theme vẫn đúng màu. Chuỗi có đủ en và vi.

## Trạng thái

| Việc | Trạng thái |
|---|---|
| Core + test | Xong |
| Web + server | Xong, E2E 53/53 |
| Desktop | Xong, smoke 18/18 |
| Merge vào main | Chờ chủ dự án |

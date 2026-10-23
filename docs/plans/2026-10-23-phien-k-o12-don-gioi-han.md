# Phiên K-O12: dọn các giới hạn còn lại sau Ngoại lệ 2

> Chặng K ([kế hoạch](2026-10-20-chang-k-kiem-chung.md)). Ngày 2026-10-23, chủ dự án chọn "Dọn giới hạn còn lại".
> Nhánh `covuaduongsinh/k-obs-don-gioi-han`.

## Phạm vi

Ba việc còn mở sau O1–O11, ghi ở mục "Còn mở" của kế hoạch Chặng K:

1. **#4 – Vault insights phân giải liên kết riêng** ([loi-va-gop-y.md](../kiem-chung/loi-va-gop-y.md)).
2. **Menu `/` mở cả khi đang gõ công thức `$…$`**, nơi `/` là dấu chia.
3. **Nhập dữ liệu từ app khác chưa có nút huỷ và chưa giới hạn dung lượng.**

## Cách làm

### 1. Một cách phân giải liên kết cho đồ thị và Vault insights

- `packages/core/src/link-rename.ts`: hàm mới `linkResolver(files)`. Hàm này cho kết quả giống hệt `resolveLinkTarget` (cách cả app đang dùng: tên trần, đường dẫn đầy đủ hoặc đuôi đường dẫn, `.md` có thể bỏ, khi trùng tên thì ưu tiên note cùng thư mục) nhưng đánh chỉ mục tên và đường dẫn một lần, nên mỗi liên kết chỉ tốn một lần tra.
- `packages/core/src/graph-utils.ts`: hàm mới `wikiLinkTargets(content, sourcePath, resolve)` trả về các file mà một note liên kết tới. Nó hiểu `[[Note#Tiêu đề]]` và `[[Note^khối]]`, và thử cả tên đầy đủ trước (cho tên như `C# tips`). `buildLinkGraph` (đồ thị) và `computeVaultInsights` (Vault insights) cùng dùng hàm này.
- Hệ quả: liên kết dạng đường dẫn (`[[Notion/Home/Projects]]`, kiểu mà trình nhập O11 tạo ra) nay được nối trong cả đồ thị lẫn Vault insights. Trước đây cả hai đều bỏ qua, nên note nhập về bị đếm là mồ côi.

### 2. Menu `/` trong công thức

- `packages/ui/src/editor/slash-commands.ts`: hàm `inMath` coi con trỏ là đang trong công thức khi nó nằm giữa hai dòng `$$` (cách `math.ts` tìm khối công thức), hoặc khi trước nó trên cùng dòng có một `$` mở mà chưa đóng (`$` liền sau là ký tự khác khoảng trắng, không tính `\$`).
- `$5 /` trước con trỏ cũng bị coi là công thức đang mở, nên menu không hiện. Việc này vô hại.

### 3. Huỷ và giới hạn khi nhập

- `packages/ui/src/importers/input.ts`: `IMPORT_LIMITS` gồm 1 GB cho phần đã chọn, 2 GB cho nội dung zip sau khi giải nén (theo kích thước khai báo trong zip, nên chặn được zip bom) và 50 000 file. Vượt giới hạn thì báo `ImportLimitError` thay vì làm cạn bộ nhớ. Hàm `readPicked` nhận thêm `signal` để huỷ.
- `AppImport.tsx`: có nút **Huỷ** khi đang đọc (quay về bước chọn) và khi đang ghi. Khi huỷ lúc đang ghi, app dừng trước file kế tiếp và báo "Đã dừng. N mục nhập trước đó vẫn nằm trong vault." Đóng hộp thoại cũng huỷ việc đang chạy. Có thông báo riêng khi vượt dung lượng hoặc vượt số file.
- `write(result, onProgress, signal)`: desktop (`writeImportToVault`) kiểm tra `signal` trước mỗi file; web (`importConverted`) chuyển `signal` cho `runImport`, vốn đã hỗ trợ huỷ.

## Kiểm thử

- `link-rename.test.ts`: `linkResolver` cho cùng đáp án với `resolveLinkTarget` trên một tập file có trùng tên, khác hoa thường, file không đuôi và đường dẫn ở nhiều thư mục.
- `graph-utils.test.ts`: liên kết dạng đường dẫn, và ưu tiên note cùng thư mục.
- `lot-a.test.tsx`: Vault insights hiểu `#`, `^`, liên kết dạng đường dẫn và note trùng tên.
- `slash-commands.test.ts`: menu không mở trong `$…$` và `$$…$$`, nhưng vẫn mở sau công thức đã đóng, sau `\$` và sau `$` đứng một mình.
- `importers-dialog.test.ts`: ba loại giới hạn, việc huỷ khi đọc, nút Huỷ khi đang nhập, và thông báo khi file quá lớn.

## Review

Review độc lập không tìm thấy lỗi nặng. Fuzz 20 000 lần cho thấy `linkResolver` cho kết quả giống hệt `resolveLinkTarget`. Đã sửa:

- Nút "Mở note đầu tiên" vẫn hiện sau khi huỷ, dù note đó có thể chưa được ghi. Nay nút bị ẩn khi đã huỷ.
- Zip lồng trong zip bị tính dung lượng hai lần: một lần theo cỡ của chính zip con, một lần theo nội dung bên trong. Nay chỉ tính nội dung.
- Huỷ nhập trên web bỏ qua bước nối backlink giữa các đợt ghi. Nay vẫn chạy bước này nếu đã ghi được note.
- Ở `\\$x`, dấu `$` không bị escape, vì `\\` là một dấu gạch chéo ngược.

Hai điểm đã chấp nhận, không sửa:

- Vault insights không còn nối `[[Note]]` tới file `Note.markdown`. Cách phân giải chung của app (`resolveLinkTarget`) chỉ bỏ đuôi `.md`.
- Một dòng `$$` nằm trong khối code vẫn làm đảo trạng thái công thức. Phần xem trước công thức (`math.ts`) cũng xử lý như vậy.

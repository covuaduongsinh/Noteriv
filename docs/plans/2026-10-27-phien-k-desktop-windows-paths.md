# Phiên K-DESKTOP-PATHS: Sửa Lỗi #2 & #3 (Chuẩn hoá xử lý đường dẫn Windows & Cập nhật liên kết đính kèm trên Desktop)

Ngày: 2026-10-27
Nhánh: `covuaduongsinh/k-desktop-windows-paths`
Vấn đề giải quyết: Lỗi #2 và Lỗi #3 trong `docs/kiem-chung/loi-va-gop-y.md`

---

## 1. Bối cảnh & Nguyên nhân gốc rễ

### Lỗi #2 (Mức Nhẹ/Thường gặp trên Windows):
- Trên Windows, hệ điều hành và Tauri API trả về đường dẫn tệp tin với dấu gạch chéo ngược `\` (ví dụ: `C:\Users\...\vault\folder\note.md`).
- Nhiều vị trí trong mã nguồn frontend của Desktop (`desktop/src/`) dùng `filePath.split("/").pop()` với giả định đường dẫn chỉ dùng `/`.
- Hệ quả trên Windows:
  1. `exportToPDF`: Tên tệp xuất nhận toàn bộ chuỗi đường dẫn tuyệt đối kèm `\` và `:`, gây lỗi tên file không hợp lệ hoặc xuất sai tên.
  2. Vùng chia (Split Pane tab): Nhãn tab hiển thị cả đường dẫn tuyệt đối dài ngoằng thay vì chỉ tên file `MyNote.md`.
  3. Tiêu đề tài liệu (`DocumentTitle.tsx`): Tiêu đề note phía trên editor hiển thị cả đường dẫn `C:\...` thay vì tên note ngắn gọn.
  4. Khôi phục tệp (`FileRecovery.tsx`): Tiêu đề modal khôi phục tệp hiển thị cả đường dẫn.
  5. Thùng rác (`trash-utils.ts`): Tạo ID tệp trong `.noteriv/trash/` với `fileName = filePath.split("/").pop()`. Trên Windows, ID chứa `\` và `:` (ký tự bất hợp pháp trên NTFS), khiến việc đưa vào thùng rác hoặc khôi phục tệp bị lỗi. Khôi phục tệp cũng dùng `lastIndexOf("/")` tìm thư mục cha, làm thất bại việc tạo lại thư mục khi khôi phục trên Windows.
  6. "Reveal in Sidebar": `onRevealInSidebar` tách `filePath.split("/")` để mở các thư mục cha; trên Windows `folders` bị rỗng nên không mở được cây thư mục đến vị trí file.

### Lỗi #3 (Mức Nhẹ/Tính nhất quán):
- Trong `desktop/src/app/page.tsx` (`updateLinksForRename`), khi đổi tên một tệp trên Desktop:
  ```ts
  const notes = await window.electronAPI.listAllFiles(activeVaultPath);
  const plan = notesMovedByRename(activeVaultPath, oldPath, newPath, notes.map((n) => n.filePath));
  ```
- Tauri Rust command `fs_list_all_files` chỉ liệt kê các tệp có đuôi `.md` và `.markdown`.
- Khi người dùng đổi tên một tệp ảnh/đính kèm (ví dụ `photo.png` thành `beach.png`), `notes` không chứa tệp này, dẫn đến `notesMovedByRename` coi đây không phải note và cũng không phải thư mục, trả về `null`.
- Kết quả là `updateLinksAfterMove` không bao giờ được kích hoạt để sửa các liên kết `![[photo.png]]` thành `![[beach.png]]`, mặc dù bộ xử lý `rewriteLinksForMoves` trong `@noteriv/core` đã hỗ trợ đầy đủ cú pháp đính kèm.

---

## 2. Giải pháp Kỹ thuật

1. **Chuẩn hoá việc lấy tên tệp và đường dẫn trên Desktop (Lỗi #2)**:
   - Sử dụng hàm chuẩn hoá `baseName(path)` từ `@noteriv/core` (hỗ trợ cả `/` và `\`) thay thế toàn bộ các chỗ `split("/").pop()` trong:
     - `desktop/src/app/page.tsx` (tên tab, exportPDF, splitTab title, publish preview, tabs mapping).
     - `desktop/src/components/DocumentTitle.tsx`.
     - `desktop/src/components/FileRecovery.tsx`.
     - `desktop/src/components/ImageViewer.tsx`.
     - `desktop/src/components/PublishPreview.tsx`.
     - `desktop/src/lib/trash-utils.ts`.
   - Sửa `onRevealInSidebar` trong `desktop/src/app/page.tsx` để nhận diện phân cách đường dẫn Windows và mở đúng các thư mục cha.
   - Sửa `restoreFile` trong `trash-utils.ts` để lấy `parentDir` chính xác khi đường dẫn dùng `\`.

2. **Cập nhật liên kết khi đổi tên tệp đính kèm (Lỗi #3)**:
   - Trong `desktop/src/app/page.tsx` (`updateLinksForRename`):
     - Lấy thêm danh sách attachments từ `vaultAdapter.listAttachments()` gộp vào danh sách tệp kiểm tra trước khi chuyển cho `notesMovedByRename`.
   - Trong `packages/core/src/link-rename.ts` (`notesMovedByRename`):
     - Bổ sung kiểm tra tệp đơn lẻ: nếu `oldRel !== newRel` và cả hai đều là tệp (có đuôi tệp hoặc không phải thư mục), tự động tạo move `[{ from: oldRel, to: newRel }]` ngay cả khi tệp không có đuôi `.md`.
   - Bổ sung unit test trong `packages/core/test/link-rename.test.ts` để kiểm chứng việc đổi tên tệp ảnh cập nhật `![[ảnh.png]]` và markdown link `![](ảnh.png)`.

---

## 3. Kế hoạch Kiểm chứng
1. Chạy unit tests: `packages/core/test/link-rename.test.ts` và toàn bộ suite liên quan.
2. Typecheck: `npm run typecheck --workspaces`.
3. Cập nhật bảng `docs/kiem-chung/loi-va-gop-y.md` (chuyển trạng thái Lỗi #2 và Lỗi #3 sang Đã sửa).

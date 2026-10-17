# Chặng 2: Định vị lại và gỡ dấu vết cờ khỏi lõi

> Ngày lập: 2026-10-17 · Trạng thái: **chưa triển khai** · Lộ trình: [2026-10-17-lo-trinh-thuong-mai.md](2026-10-17-lo-trinh-thuong-mai.md)
> **Phiên mới hãy đọc trước:** [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md)
> **Điều kiện bắt đầu:** Chặng 1 xong.

## Mục tiêu

- Bản chung không còn mang hình ảnh "app cho cờ vua": tài liệu, điều khoản, cài đặt đều trung lập.
- Dữ liệu cũ không hỏng (khoá cài đặt vẫn đọc được để plugin cờ dùng lại).
- Giấy phép và ghi công đúng trước khi thương mại hoá.

---

## Phiên 2.1: Tài liệu và pháp lý

1. **README** viết lại bằng tiếng Anh, giới thiệu sản phẩm chung: tính năng, ảnh chụp, cách chạy dev, giấy phép. Phần sổ tay vận hành tiếng Việt hiện trong README chuyển sang `docs/dev/so-tay.md`.
2. **`web/src/app/privacy/page.tsx`**: bỏ câu "Noteriv có thể dùng trong lớp cờ" (bản VI và EN), **giữ nguyên** điều khoản về người dưới 16 tuổi, viết lại cho trung lập. Nếu đổi nội dung có ý nghĩa pháp lý thì tăng `TERMS_VERSION` theo quy trình đã có.
3. **Email liên hệ** (`web/src/lib/legal.ts` `CONTACT_EMAIL`, README): hỏi chủ dự án một địa chỉ trung lập dùng tạm; chốt hẳn khi có tên mới (Chặng 6).
4. **`NOTICE.md`** và plugin mẫu `desktop/examples/plugins/chessboard/`:
   - **Khuyến nghị:** chuyển plugin mẫu ra khỏi cây mã `main` (nó thuộc phiên bản cờ; còn trong lịch sử git và tag `archive/feat-chessboard-plugin-api`).
   - Nếu giữ: ghi vào `NOTICE.md` hình quân chessnut-pieces (Apache-2.0, đã sửa) và lichess (MIT), theo `THIRD-PARTY-LICENSES.md` của plugin.
   - Lưu ý: chủ dự án có file **chưa commit** trong thư mục này ở `D:\code\Noteriv`; hỏi trước khi xoá hay chuyển.
5. **`mcp/package.json`**: sửa `repository`/`homepage` khỏi `thejacedev/Noteriv` (trỏ về repo hiện tại; đổi lần nữa khi tách repo).
6. **`phone/`** (React Native, ngừng phát triển): xoá khỏi cây mã; ghi trong README rằng di động sẽ là PWA (Chặng 4). Còn trong lịch sử git.
7. Lộ trình cũ và các file Giai đoạn 3–6 cũ đã có dòng "đã thay thế" (làm cùng lúc lập lộ trình mới). Cập nhật `huong-dan-ban-giao-phien.md` nếu còn sót.

## Phiên 2.2: Gỡ cài đặt "cỡ bàn cờ" khỏi lõi

Hiện trạng: `pdfChessboardWidth` đi qua `web/src/lib/settings.ts`, `desktop/src/lib/settings.ts` (`PDF_CHESSBOARD_WIDTH_OPTIONS`), `web/server/src/routes/users.ts` (schema zod), `web/src/app/vaults/[vaultId]/page.tsx`, `desktop/src/app/page.tsx`, CSS `.chessboard-plugin-widget` trong `web/src/lib/pdf-export.ts` và `desktop/src/lib/pdf-export.ts`, và nhãn trong hai `SettingsModal.tsx`.

1. Bỏ mục khỏi giao diện Cài đặt của hai app.
2. **Giữ khoá dữ liệu**: schema server vẫn chấp nhận và lưu `pdfChessboardWidth` (không làm lỗi preference cũ), nhưng lõi không dùng nữa.
3. CSS in: thay bộ chọn riêng cho chessboard bằng quy ước chung, ví dụ widget đặt `data-nrv-print-width` hoặc biến CSS `--nrv-print-width`, để mọi plugin vẽ khối (sơ đồ, bàn cờ…) tự quyết kích thước khi in.
4. Plugin cờ (sau này) đọc lại khoá cũ và khai cài đặt qua **tab cài đặt core plugin** (làm ở Chặng 3).
5. Test: cập nhật test liên quan; `npm run typecheck`, `npm test`; xuất PDF thử một note có Mermaid trên web và desktop, kết quả không đổi.

### Xong khi (cả chặng)
- Grep `chess|cờ|ChessNote` trong `web/src`, `web/server/src`, `packages/*/src`, `desktop/src`, README chỉ còn chú thích mã vô hại (liệt kê trong bản ghi phiên).
- `NOTICE.md` đúng với mã đang có trong cây.
- Preference cũ có `pdfChessboardWidth` vẫn lưu được.

## Ước lượng
1–2 buổi.

## Trạng thái

| Phiên | Trạng thái | Ngày | Commit / ghi chú |
|---|---|---|---|
| 2.1 Tài liệu và pháp lý | Chưa làm | | |
| 2.2 Gỡ "cỡ bàn cờ" khỏi lõi | Chưa làm | | |

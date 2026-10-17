# Bản ghi Chặng 2: Định vị lại và gỡ dấu vết cờ khỏi lõi

> Ngày: 2026-10-17 · Kế hoạch chặng: [2026-10-17-chang-2-dinh-vi-lai.md](2026-10-17-chang-2-dinh-vi-lai.md) · Lộ trình: [2026-10-17-lo-trinh-thuong-mai.md](2026-10-17-lo-trinh-thuong-mai.md)
> Nhánh: `covuaduongsinh/chang2-dinh-vi-lai` (tách từ `main` = `f39bcb0`).

## Đã làm

**Phiên 2.1: tài liệu, pháp lý, dọn repo**

- **`README.md`**: viết lại bằng tiếng Anh (~80 dòng):
  - giới thiệu sản phẩm chung, tính năng thật, 17 core plugin;
  - bảng app/thư mục, lệnh dev, tài liệu;
  - giấy phép và nguồn gốc fork, liên hệ.
  - Bỏ phần README tham khảo của upstream (link App Store, Google Play, app React Native); phần này vẫn còn trong lịch sử git.
- **`docs/dev/so-tay.md`** (mới, tiếng Việt): định hướng, mô hình nhánh mới (của Chặng 1), lệnh phát triển, chỉ dẫn tài liệu, quy tắc giấy phép.
- **`web/src/lib/legal.ts`**: `CONTACT_EMAIL` đổi thành `covuaduongsinh@gmail.com`; `LAST_UPDATED` = `2026-10-17`. Giữ `TERMS_VERSION` (`2026-10-15`) vì không đổi nội dung pháp lý, nên người dùng không phải đồng ý lại.
- **`web/src/app/privacy/page.tsx`**, mục 5 "Trẻ em" (VI + EN): bỏ câu "có thể dùng trong lớp học cờ vua". Người chịu trách nhiệm cho người dưới 16 tuổi nay là "phụ huynh hoặc người giám hộ, hoặc trường học hay tổ chức đã tạo tài khoản".
- **`NOTICE.md`**: mục "Imported components" ghi hai bộ hình quân của plugin mẫu chessboard:
  - chessnut-pieces, Apache-2.0;
  - lichess `spatial`, MIT.
  Mỗi mục có nguồn, tác giả, giấy phép, phần đã sửa, và trỏ tới `THIRD-PARTY-LICENSES.md` của plugin. Grep `PIECE_SVG`: chỉ có trong `desktop/examples/plugins/chessboard/`.
- **`mcp/package.json`**: `repository`/`homepage` trỏ `covuaduongsinh/Noteriv`.
- **`phone/`**: xoá khỏi cây mã (`git rm -r`), bỏ dòng `phone/eas.json` trong `.gitignore`. Vẫn còn trong lịch sử git.
- **Email cũ:** không đổi ở `docs/ops/trien-khai.md` (`ADMIN_EMAILS` production là tài khoản admin thật, không phải email liên hệ) và ở `manifest.json` của plugin mẫu (tên tác giả).

**Phiên 2.2: ẩn "PDF: cỡ bàn cờ"**

- Web `SettingsModal.tsx`: bỏ dòng "PDF: cỡ bàn cờ".
- Desktop `SettingsModal.tsx`: bỏ dòng "Chessboard size" và import `PDF_CHESSBOARD_WIDTH_OPTIONS`; xoá hằng này ở `desktop/src/lib/settings.ts`.
- **Giữ nguyên**, kèm chú thích "no UI in the general product":
  - khoá `pdfChessboardWidth` (kiểu, mặc định 75, schema `users.ts`);
  - phần truyền vào `exportToPDF`;
  - CSS `.chessboard-plugin-widget`.
  Giá trị đã lưu vẫn áp khi xuất PDF.

## Kiểm chứng

- `npm run typecheck` sạch; `npm test` 285 + 67 + 68 = **420 test đạt**; `npx tsc --noEmit` trong `web/server` sạch.
- Grep `chess|cờ vua|bàn cờ|ChessNote|duongsinhchess` trong `web/src`, `web/server/src`, `packages/*/src`, `desktop/src`, `README.md` (bỏ qua dòng chú thích): chỉ còn đường truyền `pdfChessboardWidth` / `chessboardWidthPercent` và CSS `.chessboard-plugin-widget` (giữ có chủ đích). Chú thích mã có nhắc FEN/PGN trong `packages/*` để nguyên (vô hại, liệt kê ở lộ trình mục 1).
- Staging và production: xem bảng "Trạng thái" của file chặng.

## Việc treo

- `docs/mobile/*` (và các trang `docs/` khác viết cho desktop của upstream) còn mô tả app React Native đã bỏ → Chặng 4, phiên 4.6.
- Email và tên miền chính thức → Chặng 6.
- Plugin mẫu chessboard và cài đặt `pdfChessboardWidth` chuyển sang plugin cờ → phiên bản cờ vua.

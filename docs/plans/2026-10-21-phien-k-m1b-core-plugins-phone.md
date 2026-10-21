# Phiên K-M1b: Bật/tắt core plugin trên app Android

> Ngày: 2026-10-21 · Chặng: [K](2026-10-20-chang-k-kiem-chung.md) (ngoại lệ app mobile) · Nhánh: `covuaduongsinh/k-mobile-core-plugins` (tách từ `covuaduongsinh/k-mobile-khoi-phuc`)

## Vì sao

Sau khi thử APK của M1, chủ dự án thấy app chưa có phần chọn core plugin như web. Yêu cầu: app phải đồng bộ với web.

## Cách làm

- Mã của plugin (`packages/plugins`) vẽ giao diện bằng `react-dom`, nên không chạy được trên React Native.
- Vì vậy phone **dùng chung danh sách và nơi lưu**. Mỗi công tắc bật hoặc tắt màn hình/khối có sẵn của phone ứng với tính năng đó.
- **Danh sách** (`phone/lib/core-plugins.ts`): đủ 17 plugin, cùng id, cùng thứ tự và cùng `defaultEnabled` với `web/src/lib/core-plugins.ts` và `desktop/src/lib/core-plugins.ts`.
- **Tên và mô tả** lấy từ catalog chung `packages/ui/src/i18n/locales/{en,vi}.json`, theo đúng nhóm `plugins.<camelCaseId>` như web.
  - `phone/metro.config.js` thêm thư mục locales vào `watchFolders`.
  - Ngôn ngữ chọn theo máy: `vi*` thì tiếng Việt, còn lại tiếng Anh.
- **Nơi lưu:** khoá `core` trong `.noteriv/plugin-config.json` của vault, cùng file và cùng định dạng với desktop.
  - Ghi theo kiểu đọc rồi sửa rồi ghi, nên khoá `enabled` của community plugin vẫn còn.
  - Giống web/desktop, lựa chọn áp dụng **riêng cho vault trên thiết bị đó**. Thư mục `.noteriv/` không đi qua git sync (cả phone lẫn server đều bỏ qua nó).
- **Màn hình** `app/core-plugins.tsx`, mở từ Settings → Ecosystem → Core plugins (dòng mô tả "Đang bật x/17").

| Plugin | Trên phone |
|---|---|
| word-count | Thanh đếm từ/ký tự/dòng dưới editor |
| flashcards, graph | Nút ở màn hình chính |
| calendar | Hai nút ở màn hình chính: lịch và daily note |
| templates, slides, markdown-lint | Mục trong menu của note |
| note-history | Mục "File Recovery" trong menu |
| note-composer | Mục mới "Note Composer" trong menu (trước đây màn hình có sẵn nhưng không có lối vào) |
| board | Ghi chú dạng board hiện thành Kanban; tắt thì hiện markdown thường |
| mermaid, dataview | Khối code trong chế độ xem trước được vẽ thành sơ đồ/bảng; tắt thì hiện code thường |
| vault-insights, audio-recorder, canvas, drawing, pdf-viewer | Phone chưa có tính năng này. Vẫn lưu lựa chọn, màn hình ghi rõ "Chưa có trên điện thoại" |

Mặc định giống web, nên word-count, slides, lint, board, dataview và note-composer **tắt** cho tới khi người dùng bật. Đây là khác biệt so với bản upstream, nơi các tính năng này luôn hiện.

## Kiểm chứng

- `npx tsc --noEmit` trong `phone/`: exit 0. ESLint không có lỗi; các cảnh báo đều có từ upstream.
- APK debug build lại; chủ dự án kiểm trên máy thật.

## Việc tồn

- Phần chữ còn lại của phone vẫn là tiếng Anh. Chuyển sang catalog chung ở M3, kể cả mấy dòng tạm trong `corePluginLabels`.
- Phone chưa có tuỳ chọn riêng của từng plugin (`coreSettings`) như web/desktop.

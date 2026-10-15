# Phiên 1.3: VaultAdapter — ghi chép thực hiện

> Kế hoạch gốc: mục "Phiên 1.3" trong [2026-10-14-giai-doan-1-tach-repo-package-chung-plugin-api.md](2026-10-14-giai-doan-1-tach-repo-package-chung-plugin-api.md). Nhánh `covuaduongsinh/phase1-core`.

## Đã làm

| Hạng mục | Nơi | Ghi chú |
|---|---|---|
| Vá lọc URL nguy hiểm | `core/markdown-to-html` | Liên kết/ảnh có scheme `isSafeUrl` từ chối (`javascript:`, `vbscript:`, `data:` không phải ảnh) chỉ còn chữ. Có test. Đóng lỗ hổng ghi ở bàn giao mục 8. |
| Interface | `core/vault-adapter.ts` | `VaultAdapter`, `NoteRef { id, path, name }`, `NoteBacklink { ref, line?, snippet? }`, `NoteSearchHit`; hàm đường dẫn thuần (`relativeVaultPath`, `refFromAbsolutePath`, `backlinksFromWikiScan`...). |
| Bản giả | `core/memory-vault-adapter.ts` | `MemoryVaultAdapter` cho test; bộ test hợp đồng `core/test/vault-adapter-contract.ts` chạy trên nó. |
| Thẻ | `core/tag-utils.ts` | `parseTags` (hai app giống hệt nhau) + `aggregateTags` viết **một lần** thay hai `getAllTags` khác nhau. `tag-utils.ts` của hai app đã xoá. |
| Mục lục (Outline) | `core/outline-utils.ts` | `extractOutline`; hai `OutlinePanel` dùng chung phần phân tích (giống hệt nhau, chưa có I/O). |
| Bản web | `web/src/lib/webVaultAdapter.ts` | Bọc `webApi`. Tạo/đổi tên ghi chú chỉ nhận thư mục đã tồn tại. Backlink không có dòng/trích đoạn (server không trả). |
| Bản desktop | `desktop/src/lib/desktopVaultAdapter.ts` | Bọc `window.electronAPI`; backlink quét tại chỗ bằng `findBacklinks`; `id` dựng theo ký tự phân tách của đường dẫn vault để khớp `listAllFiles`. |
| Component | `TagPane`, `BacklinksPanel`, `BookmarksPanel`, `OutlinePanel` (cả hai app) | `TagPane`/`BacklinksPanel` nhận `adapter`; `BookmarksPanel` nhận `NoteRef[]` đã giải; `OutlinePanel` dùng `extractOutline`. `BacklinksPanel` nay **giống hệt** ở hai bên (hiển thị dòng/trích đoạn khi adapter có). |

## Quyết định lệch kế hoạch

- **Bookmarks và Outline không gọi API** ở cả hai bên (chỉ nhận props). Thay vì ép `adapter` vào, đổi dữ liệu sang kiểu chung (`NoteRef[]`, `extractOutline`) để 1.4 chuyển nguyên component. Hai component có I/O thật là Tags và Backlinks.
- **Test hợp đồng nằm ở `core/test/`**, không phải `core/src/`: nó import Vitest, trái quy tắc ranh giới của core. Hai adapter thật mỏng nên chỉ kiểm bằng `tsc`; phần thuần của chúng (đường dẫn, ánh xạ backlink) có test ở core.
- **Chưa đưa vào interface:** thư mục (`listTree`/`createFolder`), tệp đính kèm. Chưa có component nào dùng; thêm ở 1.4 khi chuyển Explorer/Editor.
- Panel desktop cũ tách tên tệp bằng `split("/")` nên sai trên Windows; nay dùng `baseName` của core.

## Kiểm chứng

- `npm test` (core): 256 test xanh; `tsc` core, web, desktop sạch; `build:web` và `build:desktop` chạy.
- **Chưa kiểm:** chạy thật `desktopVaultAdapter` (không chạy được Tauri/Electron trong môi trường này); thử tay trên staging web sau khi đẩy `next` (xem bảng trạng thái).

## Việc còn lại / cho phiên sau

- Chuyển các chỗ gọi `webApi`/`electronAPI` còn lại (hơn 160/250) dần ở 1.4, khi đưa component sang `@noteriv/ui`.
- Loại B còn lại: `template-utils`, `flashcard-utils`, `vault-insights-utils`, `css-snippets`, `theme-utils`, `note-history`, `pdf-export`, `wikilink-completion`.
- Hai `BacklinksPanel` giống hệt nhau, `OutlinePanel`/`TagPane` gần giống: ứng viên đầu tiên cho `packages/ui`.

# Danh sách kiểm thử chức năng (QA)

> Lập 2026-10-17 (Chặng 3, phiên 3.7). Dùng trước mỗi mốc lớn: chạy trên **web staging** và **desktop Tauri thật**.
>
> Cột **Tự động** cho biết mục đã được test tự động che hay chưa:
> - E2E: `e2e/tests/core-flows.spec.ts`;
> - Vitest: `packages/*/test`;
> - Sync: `web/server/scripts/test-*.ts`;
> - Rust: `cargo test`;
> - Desktop smoke: `e2e/desktop/smoke.mjs` (chạy app Tauri thật, xem đầu file).
>
> Cột **Web** / **Desktop**: ✅ đạt, ❌ lỗi (ghi ở bảng cuối), ➖ không áp dụng, để trống = chưa thử.
> Kết quả lần chạy gần nhất ghi ở bản ghi phiên tương ứng.

## 1. Tài khoản và vault (web)

| # | Bước thử | Kết quả mong đợi | Tự động | Web | Desktop |
|---|---|---|---|---|---|
| 1.1 | Đăng ký bằng mã mời | Vào trang "Vault của bạn" | E2E | | ➖ |
| 1.2 | Đăng xuất, đăng nhập lại | Vào lại được, cookie tự gia hạn sau 15 phút | | | ➖ |
| 1.3 | Tạo vault | Vault mới mở ngay | E2E | | |
| 1.4 | Đổi vault (menu tên vault) | Chuyển vault, tab của mỗi vault giữ riêng | | | |
| 1.5 | Xuất toàn bộ dữ liệu (JSON), xuất vault (.zip), nhập folder/zip | Tải về đúng, nhập đủ note và thư mục | | | ➖ |
| 1.6 | Xoá tài khoản (bấm 2 lần) | Mọi dữ liệu bị xoá | E2E (dọn dẹp) | | ➖ |
| 1.7 | Quản lý mã mời (admin) | Tạo, chép, thu hồi | | | ➖ |

## 2. Soạn thảo

| # | Bước thử | Kết quả mong đợi | Tự động | Web | Desktop |
|---|---|---|---|---|---|
| 2.1 | Tạo note (ribbon "Note mới", "+" sidebar) | Ô đổi tên hiện ngay; Enter lưu tên | E2E | | |
| 2.2 | Đổi tên: chuột phải → Rename, bấm đúp, F2 | Tên mới, link không gãy | E2E (chuột phải) | | |
| 2.3 | Gõ liên tục 1 phút | Tự lưu (web ~0,8 s; desktop theo khoảng đã chọn) | Desktop smoke | | ✅ (3.7) |
| 2.4 | Ba chế độ Edit / View / Source | Live preview, chỉ đọc, mã thô | | | |
| 2.5 | Thanh định dạng, phím tắt định dạng | Chèn đúng cú pháp | | | |
| 2.6 | Wikilink `[[…]]`: gợi ý, bấm mở, hover xem trước | Đúng note | E2E (link) | | |
| 2.7 | Công thức KaTeX, sơ đồ Mermaid, bảng, callout, task | Hiện đúng | Vitest | | |
| 2.8 | Ảnh (dán, kéo thả, đính kèm) | Hiện, phóng to (lightbox), đổi cỡ | | | |
| 2.9 | Audio `![Audio](…)` | Trình phát nghe được | Vitest, Desktop smoke | ✅ (3.5) | ✅ (3.7) |
| 2.10 | Frontmatter editor | Thêm/sửa thuộc tính | | | |
| 2.11 | Tab, tách đôi (split), ghim tab, đóng tab | Đúng; tải lại giữ tab | E2E (tải lại) | | |
| 2.12 | Vim mode | Bật/tắt trong Cài đặt | | | |

## 3. Tổ chức và tìm kiếm

| # | Bước thử | Kết quả mong đợi | Tự động | Web | Desktop |
|---|---|---|---|---|---|
| 3.1 | Cây file: thư mục, kéo thả di chuyển | Đúng chỗ | | | |
| 3.2 | Quick Open (Ctrl+K), Command palette (Ctrl+Shift+P) | Tìm và chạy được | | | |
| 3.3 | Tìm kiếm trong vault | Kết quả khi gõ, theo dòng; Enter mở đúng dòng | E2E, Desktop smoke | | ✅ (3.7) |
| 3.4 | Backlinks, Outline, Tags, Bookmarks | Đúng dữ liệu | E2E (backlinks) | | |
| 3.5 | Xoá note → Thùng rác → khôi phục; Esc đóng thùng rác | Khôi phục đủ | E2E | | |
| 3.6 | File Recovery (snapshot), lịch sử git | Xem và khôi phục bản cũ | | | |

## 4. Đồng bộ và cộng tác

| # | Bước thử | Kết quả mong đợi | Tự động | Web | Desktop |
|---|---|---|---|---|---|
| 4.1 | Kết nối GitHub, Sync, sửa cùng dòng hai nơi, Sync | Bản web giữ chỗ, có note "(conflict …)", cảnh báo vàng | Sync | | |
| 4.2 | Khung xung đột: So sánh, Giữ bản gốc, Dùng bản này | Đúng; bản bỏ đi vào thùng rác | Vitest, Desktop smoke (So sánh) | ✅ (3.2) | ✅ (3.7, So sánh) |
| 4.3 | WebDAV (Nextcloud) hai chiều, xoá một bên | Đúng, không mất chữ | Sync (server giả) | | |
| 4.4 | Cộng tác: hai trình duyệt cùng sửa | Thấy nhau, không lặp chữ | Sync (collab) | | ➖ |
| 4.5 | Người chỉ có quyền xem mở note cộng tác | Không sửa được | Sync (collab) | | ➖ |
| 4.6 | Web clipper (bookmarklet / extension) | Note vào `Clippings/` | | | |

## 5. Plugin

| # | Bước thử | Kết quả mong đợi | Tự động | Web | Desktop |
|---|---|---|---|---|---|
| 5.1 | Bật/tắt từng core plugin (17) | Tính năng hiện/ẩn; tắt thì không tải mã | E2E (word-count) | | |
| 5.2 | Flashcards, Calendar/Daily, Templates, Graph, Note history | Chạy như trước | | | |
| 5.3 | Mermaid, PDF viewer (chú thích), Slides, Board, Canvas, Drawing, Dataview | Chạy như trước | | | |
| 5.4 | Word count, Note composer, Vault insights, Lint, Audio recorder | Chạy như trước | | | |
| 5.5 | Bật/tắt plugin ở tab này, tab kia theo | Không cần tải lại | E2E | | ➖ |
| 5.6 | Plugin cộng đồng: cài, cấp quyền, lệnh, panel bên | Chạy trong sandbox, panel hiện ở cột trái | Desktop smoke (panel) | | ✅ (3.7, panel) |

## 6. Giao diện chung

| # | Bước thử | Kết quả mong đợi | Tự động | Web | Desktop |
|---|---|---|---|---|---|
| 6.1 | Theme (đổi qua lại), CSS snippets (bật/tắt, Esc đóng) | Mọi thành phần đổi màu | | | |
| 6.2 | Cài đặt: các mục, phím tắt tuỳ chỉnh | Lưu và áp dụng | | | |
| 6.3 | Độ rộng 390 px | Cài đặt dùng được, không tràn ngang | Ảnh chụp (3.6) | | ➖ |
| 6.4 | Xuất PDF, xem trước PDF | Đúng nội dung, font tiếng Việt | | | |
| 6.5 | Desktop: CSP bật (không có lỗi CSP trong console) | Mọi màn hình chạy | Desktop smoke | ➖ | ✅ (3.7) |
| 6.6 | Trang vault ở 390 px | Ribbon là thanh dưới, sidebar là ngăn kéo (bấm note thì đóng), hàng nút note cuộn được, "⋯" mở lên trên | E2E `core-flows` (4.7) | ✅ (4.7) | ➖ |
| 6.7 | Cài như app (PWA): manifest, icon, service worker | Chromium báo "installable"; trang đã mở vẫn mở khi mất mạng, trang khác ra trang offline | E2E `pwa.spec.ts` (4.7) | ✅ (4.7, chưa thử máy thật) | ➖ |
| 6.8 | Ghi nhanh `/quick` | Mở nhanh, lưu vào `Inbox/` của vault chọn, mất mạng thì giữ bản nháp | E2E `core-flows` (4.7) | ✅ (4.7) | ➖ |
| 6.9 | Lưu note khi mất mạng | Thanh trạng thái báo đỏ "Chưa lưu được", có mạng lại thì tự lưu | E2E `core-flows` (4.7) | ✅ (4.7) | ➖ |

## Lỗi tìm được

| # | Mục | Nền tảng | Mức | Mô tả | Trạng thái |
|---|---|---|---|---|---|
| 1 | 6.5 | Desktop | Cao | Không có CSP (`csp: null`) | Đã sửa (3.7): CSP trong `tauri.conf.json`, smoke 16/16 |

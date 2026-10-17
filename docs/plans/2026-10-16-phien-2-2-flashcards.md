# Phiên 2.2: Thí điểm Flashcards thành core plugin + tải lười KaTeX

> Ngày: 2026-10-16 · Trạng thái: **xong** (chưa push) · Giai đoạn: [2](2026-10-14-giai-doan-2-thu-gon-core-plugin.md) · Baseline: [docs/perf/2026-10-16-baseline.md](../perf/2026-10-16-baseline.md)

## Mục tiêu

Chuyển Flashcards thành core plugin chạy giống nhau trên web và desktop; tắt thì mã, nút và lệnh biến mất; bật lại thì tiến độ còn nguyên. Dùng thí điểm này để tìm chỗ thiếu của Plugin API. Ngoài ra (chốt ở 2.1): cho KaTeX chỉ tải khi gặp công thức.

## Đã làm

**Plugin `packages/plugins/src/flashcards/`**
- `cards.ts`: trích thẻ (`Q:`/`A:` và `{{cloze}}`) và thuật toán SM-2, chép nguyên từ `flashcard-utils` cũ. Id thẻ được test chốt bằng giá trị tính từ mã cũ.
- `storage.ts`: lưu qua `api.settings` dạng `{ version: 1, reviews }`. Dữ liệu cũ được chuyển **một lần** khi plugin chạy lần đầu. Id desktop tính lại từ đường dẫn tuyệt đối sang tương đối, có thử cả hai cách nối đường dẫn của Rust `Path::join`.
- `view.ts`: giao diện ôn tập viết bằng DOM thuần, giữ y hành vi cũ (Space/Enter, 1–5, bấm tên note nguồn). Nhãn tiếng Việt trên web, tiếng Anh trên desktop.
- `index.ts`: view `flashcards-review`, lệnh "Flashcards: ôn tập / review", nút ribbon. Quét vault theo lô 8 note đọc song song.

**Host / API (thiếu sót phát hiện qua thí điểm)**
- `workspace.closeView()`; `PLUGIN_API_VERSION` lên `1.0.0-draft.2`. Sandbox khai `coreOnly`, đã chạy `npm run sync:sandbox`.
- `CorePluginViewOverlay` (dùng chung) cùng `openView`/`closeView`/`activeView` trong `useCorePluginHost`. Từ nay view của plugin hiện được, dạng lớp phủ; tắt plugin thì view của nó tự đóng.
- Bộ đệm danh sách note 2 giây trong host (`vault.read/list/exists`), xoá sau `write`/`delete`.
- Đặc tả `docs/plugin-api/v1.md` đã cập nhật, kèm bảng thiếu sót.

**Hai app**
- `core-plugins.ts`: khai `flashcards` (`defaultEnabled: true`), kèm cầu nối dữ liệu cũ trong `loadPluginSettings`:
  - Web: `vault.settings.flashcardReviews`.
  - Desktop: `.noteriv/flashcard-reviews.json`.
  - Chỗ lưu cũ không bị ghi hay xoá, giữ làm bản sao lưu.
- Đã gỡ:
  - `FlashcardReview.tsx` và `flashcard-utils.ts` ở cả hai app.
  - State và modal trong `page.tsx`.
  - Action `flashcardReview` trong `hotkeys.ts` và các bảng action.
  - Mục trong `AppMenu`, mục "more" của `Ribbon`, `FlashcardIcon`.
- Từ nay vào Flashcards qua nút ribbon của plugin và bảng lệnh.

**KaTeX tải lười** (`packages/ui/src/markdown/katex-loader.ts`)
- Công thức inline và công thức khối hiện mã LaTeX trong lúc chờ (`.math-pending`), rồi dựng lại khi KaTeX về, qua `refreshMarkdownEffect`; `refreshLiveViews()` được tách ra dùng chung với registry code block.
- Note không có công thức thì không tải KaTeX.

## Kết quả đo (web, `npm run perf:web`)

| | Baseline 2.1 | Sau 2.2 | Thay đổi |
|---|---:|---:|---:|
| JS tải đầu trang vault (thô) | 1730,3 KB | 1467,9 KB | −15,2% |
| JS tải đầu (gzip) | 533,9 KB | 457,8 KB | **−14,3%** |
| JS tải đầu (brotli) | 451,6 KB | 389,7 KB | −13,7% |

- KaTeX (255 KB) chuyển sang tải lười; Flashcards (8,4 KB) tải lười.
- Ngân sách cả giai đoạn: ≤ 374 KB gzip. Còn cách khoảng 84 KB gzip.
- Desktop chưa đo lại bằng analyzer (cùng mã `packages/ui`, nên phần KaTeX giảm tương tự).

## Kiểm chứng

- `npm run typecheck` đạt (6 workspace). `npm test`: 277 + 51 + 15 = **343 test đạt**. Test mới:
  - Trích thẻ có id chốt cứng, SM-2 với giá trị cố định.
  - Chuyển dữ liệu: web; desktop với đường dẫn `C:\`, `C:/` (Path::join lẫn `\`) và POSIX; chỉ chạy một lần.
  - Plugin đăng ký view, lệnh, ribbon.
  - Host: bộ đệm danh sách note; mở/đóng view (closeView, Esc, tắt plugin).
  - KaTeX: HTML giữ chỗ trước khi tải, KaTeX sau khi tải.
- **Web chạy thật** (`next start` + API cục bộ, Chrome):
  - Vault có review kiểu cũ trong `flashcardReviews`: thẻ đã ôn không bị coi là thẻ mới (3 thẻ, 2 cần ôn).
  - Ôn bằng phím Space/4/5. Dữ liệu mới lưu ở `corePluginSettings.flashcards`, khoá cũ còn nguyên.
  - Tắt plugin: nút ribbon và lệnh biến mất; sau khi tải lại trang, không file JS nào chứa mã Flashcards.
  - Bật lại: tiến độ còn nguyên.
  - Bấm tên note nguồn: mở note đó và đóng khung.
  - Note không có công thức: không tải KaTeX. Mở note có công thức: tải chunk KaTeX 255 KB, inline và khối hiện đúng (có ảnh chụp).
- **Desktop chạy thật** (`tauri build`, chế độ portable, puppeteer nối vào cổng debug WebView2 qua `WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9223`):
  - Đường dẫn vault ghi bằng `/`; `.noteriv/flashcard-reviews.json` có id tính bằng mã desktop cũ trên đường dẫn `C:/…\Cards\a.md`.
  - Kết quả: id cũ `fc-c0q1wv` chuyển thành `fc-u7j1jw` (trùng id web của cùng thẻ), giữ hạn ôn.
  - Ôn tập, chấm điểm, Esc đều chạy; công thức hiện đúng (có ảnh chụp). File cũ còn nguyên.

## Chưa kiểm / giới hạn

- Desktop: chưa thử tắt/bật plugin trong Cài đặt (đã thử trên web; dùng chung host và `CorePluginsSection`). Chưa đo lại dung lượng desktop bằng analyzer.
- Người dùng từng gán phím tắt riêng cho action cũ `flashcardReview` sẽ mất phím đó; lệnh mới không có phím mặc định (bản cũ cũng không có).
- Trên web, bấm tên note nguồn để mở chỉ được khi note có trong chỉ mục mà trang đã nạp. Note tạo từ nơi khác cần tải lại trang (hành vi sẵn có của `openPluginPath`).
- `web` không có cấu hình ESLint, nên không chạy lint.

## Phát hiện cho các phiên sau

- `mermaid.ts` gọi `ensureMermaid()` ngay khi editor mở, nên 2,4 MB mermaid bị tải dù note không có sơ đồ (Lô C).
- `desktopVaultAdapter.abs()` dựng id theo dấu phân cách của `vaultPath`. Khi vault được ghi bằng `/` trên Windows, kết quả lệch với `listAllFiles` (Rust thêm `\`). Ảnh hưởng: `createNote`/`renameNote` trả về id khác với id mà `listNotes` thấy. Nên sửa ở một phiên dọn dẹp.
- Heredoc trong Bash làm mất `\` (đã ghi trong hướng dẫn); `printf` thì biến `\f` thành form-feed. Viết file thử có dấu `\` bằng công cụ Write.

## Dọn dẹp

- Tài khoản web thử `fc-2-2@example.test` đã xoá (đăng nhập lại trả 401).
- Đã tắt: app desktop thử, API, `next start`, tunnel, tab Chrome.
- `desktop/src-tauri/Cargo.toml` (Tauri ghi lại xuống dòng kiểu LF) đã được khôi phục.

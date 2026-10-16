# Giai đoạn 2: Thu gọn: chuyển tính năng hiện có thành core plugin

> Ngày lập: 2026-10-14 · Trạng thái: **đang triển khai (2.1–2.4b xong)** · Lộ trình: [2026-10-14-lo-trinh-noteriv-chess-pkm.md](2026-10-14-lo-trinh-noteriv-chess-pkm.md)
> **Phiên mới hãy đọc trước:** [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md)
> **Điều kiện bắt đầu:** Giai đoạn 1 xong (đã có `@noteriv/core`, `@noteriv/ui`, `VaultAdapter`, `PluginRegistry` và Plugin API v1 nháp).

## Mục tiêu

- Lõi Noteriv **mỏng**: chỉ những thứ ai cũng cần.
- Mọi tính năng còn lại thành **core plugin**: bật/tắt trong Cài đặt, **tắt thì không tải mã**, chạy giống nhau trên web và desktop.
- **Đo được** là phần mềm nhẹ đi, không chỉ "cảm giác".
- Plugin API v1 được kiểm chứng bằng nhiều tính năng thật trước khi làm phần cờ vua (Giai đoạn 3).

## Phân loại tính năng

**Giữ trong lõi** (không thể tắt): editor (live preview, source, vim là tuỳ chọn), cây file và thư mục, Quick Open, Command Palette, tìm kiếm, wikilink và backlink, Outline, Tags, Bookmarks, đồng bộ (git/WebDAV), cộng tác (web), cài đặt, theme và CSS snippet, trình quản lý plugin, thùng rác, đính kèm, xuất và xem trước PDF (dùng chung cho plugin cờ).

**Chuyển thành core plugin** (đề xuất mặc định bật hoặc tắt):

| Plugin | Mã hiện tại (web) | Mặc định | Ghi chú |
|---|---|---|---|
| Flashcards (**thí điểm**) | `FlashcardReview.tsx`, `lib/flashcard-utils.ts` | Bật | Nhỏ, dễ kiểm chứng; Giai đoạn 3 mở rộng thành thẻ thế cờ |
| Calendar / Daily notes | `CalendarView.tsx`, `lib/calendar-utils.ts` | Bật | |
| Templates | `TemplatePicker.tsx`, `lib/template-utils.ts` | Bật | Giai đoạn 3 thêm mẫu cờ |
| Graph view | `GraphView.tsx` (729 dòng), `app/vaults/[vaultId]/graph/` | Bật | |
| Canvas | `CanvasView.tsx` (1217 dòng), `lib/canvas-utils.ts` | Tắt | Lớn nhất, cần `ui.registerView` |
| Board (Kanban) | `BoardView.tsx` (590 dòng), `lib/board-utils.ts` | Tắt | |
| Drawing | `DrawingView.tsx` (823 dòng), `lib/drawing-utils.ts` | Tắt | |
| Slides | `SlidePresentation.tsx`, `lib/slide-utils.ts` | Tắt | |
| PDF viewer + chú thích | `PDFViewer.tsx` (670 dòng), `lib/pdf-annotation.ts`, `pdfjs-dist` | Bật | `pdfjs-dist` nặng, nên tải khi mở file PDF |
| Dataview | `lib/dataview.ts` | Tắt | |
| Vault insights | `VaultInsights.tsx` | Tắt | |
| Audio recorder | `AudioRecorder.tsx` | Tắt | |
| Note composer (gộp/tách note) | `NoteComposer.tsx` | Tắt | |
| Note history / Time scrubber | `NoteHistory.tsx`, `TimeScrubber.tsx` | Bật | |
| Markdown lint | `LintPanel.tsx`, `lib/markdown-lint.ts` | Tắt | |
| Publish preview | `PublishPreview.tsx`, `lib/publish.ts` | Tắt | Giai đoạn 5 làm lại thành "xuất bản công khai" |
| Web clipper (cài đặt) | `ClipperSection.tsx` | Tắt | |
| Mermaid, Math (KaTeX) | `components/markdown/mermaid.ts`, `math.ts` | Bật | Tải thư viện khi gặp khối tương ứng |

> **Đã chốt ở Phiên 2.1 (2026-10-16):** giữ nguyên danh sách và mặc định trên. Số đo từng tính năng: [docs/perf/2026-10-16-baseline.md](../perf/2026-10-16-baseline.md) mục 4. Mã ứng dụng của mỗi tính năng chỉ 5–35 KB; nặng là thư viện (Mermaid 2,4 MB đã tải lười; KaTeX 255 KB đang tải ngay).
>
> **Ngân sách (kiểm ở 2.6):** JS tải đầu giảm ≥ 30% với cấu hình mặc định (web ≤ 374 KB gzip, desktop ≤ 312 KB gzip); cây file với vault 500 note không chậm hơn 10%. Tách plugin đơn thuần chỉ gỡ được tối đa ~19%, nên cần thêm tải lười KaTeX (2.2) và nhiều khả năng cả bộ đọc cú pháp ngôn ngữ code (chưa quyết, xem mục 6 của báo cáo).
>
> **Mỗi lần chuyển tính năng vào `packages/plugins`:** thêm đường dẫn mới vào `scripts/perf/feature-map.json` và chạy `npm run perf:web` để xem phần tải đầu giảm bao nhiêu.

---

## Phiên 2.1: Đo đạc và chốt danh sách

### Việc cụ thể
1. **Đo hiện trạng** (ghi vào `docs/perf/2026-10-16-baseline.md`):
   - Web: dung lượng JS tải lần đầu trang vault (Next build output + `@next/bundle-analyzer`), thời gian mở vault 500 note trên staging (Lighthouse, Performance tab).
   - Desktop: kích thước bộ cài, RAM khi mở vault, thời gian khởi động.
2. Xếp hạng tính năng theo dung lượng mã đóng góp; chốt danh sách và mặc định bật hay tắt với chủ dự án.
3. Thiết lập **ngân sách hiệu năng** (ví dụ JS tải đầu giảm ít nhất 30%) để kiểm ở cuối giai đoạn.

### Xong khi
- Có báo cáo baseline và danh sách đã chốt.

---

## Phiên 2.2: Thí điểm: Flashcards thành core plugin

### Việc cụ thể
1. Tạo `packages/plugins/flashcards/` (`manifest.json` + `index.ts` dùng `@noteriv/plugin-api`).
2. Chuyển `FlashcardReview` và `flashcard-utils` sang plugin. Đăng ký lệnh, ribbon icon, view "Ôn tập". Lưu trạng thái ôn tập qua `VaultAdapter` (file `.noteriv/flashcards.json` hoặc frontmatter, **giữ nguyên định dạng dữ liệu cũ** để không mất tiến độ).
3. Gỡ mã flashcard khỏi `web/src` và `desktop/src` (trang chính, ribbon, hotkeys, menu chỉ còn đi qua plugin).
4. Ghi lại các **thiếu sót của API** phát hiện được và cập nhật `docs/plugin-api/v1.md`.
5. **Tải lười KaTeX** (chốt ở 2.1): `packages/ui/src/markdown/math.ts` và `renderers/math.ts` đang `import katex` tĩnh (255 KB vào phần tải đầu). Đổi sang `import("katex")` khi gặp khối công thức đầu tiên, theo cách `mermaid.ts` đang làm. Đo lại bằng `npm run perf:web`.

### Xong khi
- Flashcard chạy như cũ trên web và desktop; tắt plugin thì mục menu, ribbon, mã đều biến mất; bật lại thì dữ liệu ôn tập còn nguyên.
- KaTeX không còn trong JS tải đầu; công thức vẫn hiển thị đúng ở live preview, chế độ đọc và xuất PDF.

---

## Phiên 2.3 – 2.5: Chuyển các tính năng còn lại (theo lô)

Mỗi tính năng làm theo **cùng một khuôn** như phiên 2.2 (plugin package → đăng ký lệnh/view/ribbon → giữ định dạng dữ liệu → gỡ mã cũ → kiểm tra hai nền tảng).

- **Lô A (nhỏ):** chia hai phiên (chốt 2026-10-16):
  - **2.3**: Calendar/Daily notes, Templates, Vault insights, Note composer (xong).
  - **2.3b**: Lint, Audio recorder. Cần thêm: app hiển thị panel bên và tab cài đặt của core plugin (chưa có ở hai app), nhảy tới dòng trong editor, ghi file đính kèm (nhị phân).
  - **Clipper giữ trong lõi** (ngoại lệ): phần nhận dữ liệu nằm ở máy chủ (`/api/v1/clip`) và Rust (`clipper.rs`); trong app chỉ là trang quản lý mã truy cập.
- **Lô B (view lớn):** chia hai phiên (chốt 2026-10-16):
  - **2.4**: Graph, Slides, Note history / Time scrubber (xong). File Recovery giữ trong lõi.
  - **2.4b**: Board (xong). Cần thêm: view gắn với loại file (`.board.md` hoặc frontmatter `board: true`) hiện **trong vùng editor** của tab (cả split pane), đọc/ghi qua bộ đệm của tab (dirty, lưu, tự lưu), mỗi tab một phiên bản, chế độ source trả về editor thô. Chi tiết thiếu sót: `docs/plugin-api/v1.md` mục "Lô B phần 1". Web hiện chỉ nhận board theo frontmatter, chưa có lệnh "New board": thống nhất với desktop.
- **Lô C (nặng):** Canvas, Drawing, PDF viewer, Dataview, Mermaid và Math tải lười.

Sau mỗi lô: deploy staging, chủ dự án thử, rồi mới vào production.

### Xong khi (mỗi lô)
- Tất cả tính năng của lô chạy như trước trên hai nền tảng; tắt được; không còn mã cũ trong `web/src` hoặc `desktop/src`.

---

## Phiên 2.6: Dọn dẹp và đo lại

1. Xoá mã chết, file trùng lặp còn sót; đơn giản hoá `app/vaults/[vaultId]/page.tsx` (hiện 1898 dòng) vì lệnh và view nay do plugin đăng ký.
2. Đo lại như phiên 2.1 (cách đo: mục 7 của `docs/perf/2026-10-16-baseline.md`); so sánh với ngân sách; ghi `docs/perf/2026-xx-after-phase2.md`.
3. Cập nhật đặc tả Plugin API v1 (vẫn là `0.x`) theo những gì đã học được.
4. Trang Cài đặt → Core plugins: mô tả ngắn từng plugin bằng tiếng Việt.

### Xong khi
- Đạt ngân sách hiệu năng (hoặc có giải thích và hướng xử lý); `page.tsx` gọn hơn đáng kể; tài liệu API cập nhật.

## Việc treo (ghi nhận trong giai đoạn)

- **Phát audio trong note** (từ 2.3b, chủ dự án chọn để sau): `![Audio](…)` đang vẽ thành ảnh hỏng ở cả hai app. Cần renderer audio trong `packages/ui` (web: URL tải về; desktop: file trong vault, cần loader biết kiểu MIME audio).
- **Desktop tự lưu mỗi 30 giây**: nội dung do plugin chèn ở trạng thái "unsaved" tới lần lưu kế tiếp. Cân nhắc lưu ngay sau khi plugin sửa nội dung.
- **Tab cài đặt của core plugin** chưa được app hiển thị (chưa plugin nào cần).

## Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Mất dữ liệu người dùng khi đổi nơi lưu trạng thái plugin | Giữ nguyên định dạng dữ liệu; nếu buộc phải đổi thì có bước chuyển đổi tự động + sao lưu trước |
| API thiếu hàm cho tính năng lớn (Canvas) | Thí điểm với Flashcard trước; Canvas để lô cuối; bổ sung API theo nhu cầu thực |
| Người dùng tưởng mất tính năng vì mặc định tắt | Thông báo "Tính năng X giờ là plugin, bật trong Cài đặt" lần đầu mở sau cập nhật |

## Ước lượng
Khoảng 6–8 buổi.

## Trạng thái

| Phiên | Trạng thái | Ngày | Commit / ghi chú |
|---|---|---|---|
| 2.1 Đo đạc | Xong | 2026-10-16 | Baseline `docs/perf/2026-10-16-baseline.md`; ghi nhận `docs/plans/2026-10-16-phien-2-1-do-dac.md`; danh sách giữ nguyên, ngân sách −30%, KaTeX tải lười đưa vào 2.2 |
| 2.2 Thí điểm Flashcards | Xong | 2026-10-16 | `docs/plans/2026-10-16-phien-2-2-flashcards.md`; KaTeX tải lười; JS tải đầu web 533,9 → 457,8 KB gzip (−14,3%); API thêm `closeView`, view dạng lớp phủ |
| 2.3 Lô A (phần 1) | Xong | 2026-10-16 | `docs/plans/2026-10-16-phien-2-3-lo-a.md`; Calendar/Daily, Templates, Note composer, Vault insights thành plugin; API thêm `vault.stats`, plugin dùng React; JS tải đầu web 449,4 KB gzip |
| 2.3b Lô A (phần 2) | Xong | 2026-10-16 | `docs/plans/2026-10-16-phien-2-3b-lo-a.md`; Lint (panel phải), Audio recorder thành plugin; API thêm panel bên, `setCursor`, `saveAttachment`; sửa lỗi desktop lưu ghi âm thành chữ; JS tải đầu web 446,8 KB gzip |
| 2.4 Lô B (phần 1) | Xong | 2026-10-16 | `docs/plans/2026-10-16-phien-2-4-lo-b.md`; Graph (web bỏ route `/graph`, thành lớp phủ), Slides, Note history + Time scrubber thành plugin; API thêm nút thanh công cụ note, đọc lịch sử note, `renderReadOnly`; sửa phím plugin bị keymap editor nuốt (Ctrl+G, Ctrl+D); JS tải đầu web 444,8 KB gzip |
| 2.4b Lô B (phần 2) | Xong | 2026-10-16 | `docs/plans/2026-10-16-phien-2-4b-lo-b.md`; Board thành plugin; API thêm view theo loại file (`ui.registerFileView`) thay editor trong tab; web nhận `.board.md` và có lệnh tạo board; JS tải đầu web 444,6 KB gzip |
| 2.5 Lô C | Chưa làm | | |
| 2.6 Dọn dẹp, đo lại | Chưa làm | | |

# Phiên 1.2: Bảng kiểm kê `web/` so với `desktop/`

> Đo ngày 2026-10-15 bằng so sánh nội dung từng cặp file (bỏ khác biệt xuống dòng CRLF/LF), trên nhánh `covuaduongsinh/phase1-core` (gốc là `origin/next`). Kế hoạch: [2026-10-15-phien-1-2-monorepo-core.md](2026-10-15-phien-1-2-monorepo-core.md).
> Loại: **A** giống hệt và thuần → chuyển nguyên; **C** gần giống (khác vài dòng) → hợp nhất, viết test trước; **B** phụ thuộc `webApi`/`electronAPI` → tách logic thuần; **D** phụ thuộc React/CodeMirror/DOM của app → để lại (Phiên 1.4 hoặc sau).

## `src/lib/` (web 42 file, desktop 40 file, 33 tên trùng)

| Loại | Module (số dòng web/desktop, số dòng khác nhau) | Ghi chú |
|---|---|---|
| **A** | `board-utils` (267/267, 0), `dataview` (392/392, 0), `frontmatter-utils` (106/106, 0), `markdown-lint` (182/182, 0), `toc-utils` (133/133, 0), `wiki-link-utils` (141/141, 0) | Giống hệt, không import gì ngoài. Chuyển nguyên. |
| **A** (có phụ thuộc) | `sanitize-html` (89/89, 0; dùng `dompurify`, cùng phiên bản `^3.4.13` ở hai bên), `slide-utils` (381/381, 0; import `sanitize-html`) | `core` khai `dompurify` là dependency (thư viện trình duyệt thuần, chạy được khi có DOM). `slide-utils` chuyển cùng `sanitize-html`. |
| **C** (khác rất ít) | `calendar-utils` (147/145, ~2), `drawing-utils` (140/128, ~9), `canvas-utils` (299/285, ~11), `markdown-to-html` (431/418, ~11; import `toc-utils`, `markdown-code-block-registry`), `bookmark-utils` (15/22, ~19), `markdown-code-block-registry` (101/73, ~23), `publish` (148/149, ~23; import `markdown-to-html`) | Đọc từng khác biệt, chọn bản tốt hơn (mặc định web), test trước khi hợp nhất. Chuyển theo thứ tự phụ thuộc: `toc-utils` → `markdown-code-block-registry` → `markdown-to-html` → `publish`. |
| **B** (tách) | `tag-utils` (web gọi `webApi`), `template-utils` (`webApi`), `flashcard-utils` (`webApi`), `vault-insights-utils` (`webApi`; import `tag-utils`, `frontmatter-utils`) | Hàm thuần (`parseTags`, dựng/áp template, thuật toán SM-2, tính toán thống kê) sang `core`; phần gọi `webApi`/`electronAPI` ở lại app, **re-export** hàm thuần để chỗ gọi cũ không đổi. Làm sau cùng và chỉ khi còn thời gian. |
| **B** (hoãn) | `css-snippets`, `theme-utils`, `note-history`, `pdf-export`, `wikilink-completion` | Dính `webApi` và DOM sâu hơn; để cho VaultAdapter (1.3). |
| **D** (để lại) | `editor-commands` (giống hệt nhưng import `@codemirror`), `vim-mode` (giống hệt, `@codemirror`), `attachment-utils` (46/184), `audio-utils` (25/109), `collab` (khác ~167), `hotkeys` (khác ~207), `note-composer-utils` (65/105), `pdf-annotation` (87/127), `settings` (54/112) | Phụ thuộc CodeMirror hoặc khác nhau nhiều/DOM riêng. `editor-commands` và `vim-mode` đi cùng `@noteriv/ui` (1.4). |
| Chỉ web | `editor-prefs`, `legal`, `note-names`, `plugin-community`, `plugin-sandbox/*`, `vault-import`, `webApi` | Riêng web. |
| Chỉ desktop | `debug`, `file-recovery`, `focus-mode`, `plugin-api`, `random-note`, `sync-providers`, `trash-utils` | Riêng desktop. |

**Mục tiêu của phiên (≥ 15 module vào `@noteriv/core`):** 6 (A) + 2 (A có phụ thuộc) + 7 (C) = **15 module**; loại B nếu còn thời gian.

## `src/components/markdown/` (34 file, 34 tên trùng): chuẩn bị cho Phiên 1.4

**31/34 file giống hệt**, gồm `callouts`, `embeds`, `index`, `math`, `mermaid`, `registry`, `slash-commands`, `tags`, `theme`, `types`, `widget`, `wikilinks` và 19 file trong `renderers/`. Chỉ 3 file khác: `plugin.ts` (~21 dòng; bản web import thêm `toc-utils`), `renderers/code-blocks.ts` (~34) và `renderers/images.ts` (~25). Tất cả phụ thuộc `@codemirror` nên thuộc `@noteriv/ui`, **không** chuyển ở Phiên 1.2. Đây là bằng chứng rằng việc dùng chung renderer ở 1.4 khả thi và rủi ro thấp.

## Phụ thuộc giữa các module (thứ tự chuyển)

```
frontmatter-utils, wiki-link-utils, board-utils, dataview, markdown-lint, calendar-utils, drawing-utils, canvas-utils, bookmark-utils   (độc lập)
toc-utils ─────────┐
markdown-code-block-registry ─┴─> markdown-to-html ──> publish
sanitize-html ──> slide-utils
tag-utils + frontmatter-utils ──> vault-insights-utils   (loại B)
```

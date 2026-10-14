# Giai đoạn 1: Tách repo, package dùng chung, bản nháp Plugin API v1

> Ngày lập: 2026-10-14 · Trạng thái: **chưa triển khai** · Lộ trình: [2026-10-14-lo-trinh-noteriv-chess-pkm.md](2026-10-14-lo-trinh-noteriv-chess-pkm.md)
> **Phiên mới hãy đọc trước:** [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md)
> **Điều kiện bắt đầu:** Giai đoạn 0, phiên 0.1 (sao lưu) và 0.2 (staging) đã xong. Các phiên 0.3 và 0.4 có thể chạy song song.

## Mục tiêu

1. Noteriv có **repo riêng**, không còn là fork, nhưng vẫn giữ toàn bộ lịch sử và ghi công tác giả gốc.
2. Web và desktop **dùng chung một lõi mã** (render markdown, editor, tiện ích, plugin host). Sửa một lần, cả hai nền tảng cùng có.
3. Có **bản nháp Plugin API v1 hai tầng** dùng được trên cả web và desktop:
   - **Core plugin** (do dự án viết, tin cậy): chạy trực tiếp trong ứng dụng, đủ mạnh cho giao diện phức tạp (bàn cờ, canvas).
   - **Plugin cộng đồng**: chạy trong sandbox iframe, xin quyền, như bản web hiện nay.

Người dùng **chưa thấy tính năng mới** ở giai đoạn này. Thành quả là nền móng để giai đoạn 2 (thu gọn) và 3 (cờ vua) làm nhanh và chỉ làm một lần.

## Hiện trạng (đo ngày 2026-10-14)

- `desktop/`: Next 16.1.6, `output: "export"` + Tauri 2. Truy cập file qua `window.electronAPI` (shim Tauri, khoảng 80 hàm trong `desktop/src/types/electron.d.ts`: đọc/ghi file, vault, git, auth GitHub, cửa sổ…).
- `web/`: Next ^16.4.0, gọi máy chủ qua `web/src/lib/webApi.ts` (REST).
- **Mã trùng lặp đã lệch:** trong `src/lib/`, 9 file trùng tên còn giống hệt, 24 file đã khác; trong `src/components/`, 1 file giống, 37 file khác. `components/markdown/` (renderers, widget, embeds…) tồn tại ở cả hai bên.
- Plugin: desktop `desktop/src/lib/plugin-api.ts` (`PluginAPI`: vault, ui, events, editor, markdown, app; plugin chạy trực tiếp, không có quyền) và web `web/src/lib/plugin-sandbox/` (`usePluginHost.ts` với `METHOD_PERMISSIONS` mặc định chặn, `mirror.ts` Shadow DOM, `public/plugin-sandbox.html`).
- Khác: `phone/` (Expo/React Native), `extension/` (web clipper), `mcp/` (MCP server đọc vault cục bộ, `index.js`).

---

## Phiên 1.1: Tách repo khỏi upstream

### Việc cụ thể
1. Tạo repo mới **không phải fork**: `covuaduongsinh/noteriv` (chủ dự án tạo repo trống trên GitHub; nếu tên đã dùng thì chọn tên khác và ghi lại ở đây).
2. Đẩy **toàn bộ lịch sử và tag** từ repo hiện tại: `git push --mirror` từ một bản clone `--bare` (giữ commit của thejacedev và của chủ dự án).
3. Giấy phép và ghi công:
   - Giữ nguyên `LICENSE` (MIT, © Jace) và thêm dòng bản quyền của chủ dự án cho phần đóng góp mới.
   - Thêm `NOTICE.md`: nguồn gốc (fork từ `thejacedev/Noteriv`), các thành phần bên thứ ba sẽ chuyển từ ChessNote (SilverBullet MIT, Arasan, chess.js BSD-2, bộ quân cờ: từng giấy phép).
   - Sửa `README.md`: giới thiệu Noteriv (Chess PKM), ghi rõ nguồn gốc.
4. Giữ remote `upstream` (`thejacedev/Noteriv`) **chỉ để tham khảo** (`git fetch upstream`, không merge).
5. **Chuyển Dokploy** sang repo mới cho cả production (`3tKquEXFX1KEN2EueeUGm`) và staging: đổi nguồn git, cấu hình lại webhook. Kiểm tra deploy thành công trên staging trước, rồi production.
6. Repo fork cũ: **Archive** (chỉ đọc) sau khi repo mới chạy ổn 1 tuần; README cũ trỏ sang repo mới.
7. Cập nhật file bàn giao: URL repo mới, quy tắc upstream.

### Chủ dự án làm
- Tạo repo trống `noteriv` trên GitHub (private hay public: **khuyến nghị public** vì hướng tới cộng đồng và giấy phép MIT; có thể để private đến khi ra mắt).
- Xác nhận trước khi chuyển nguồn Dokploy và archive repo cũ.

### Xong khi
- Repo mới có đủ lịch sử (`git log` khớp, tag `v-web-parity-2026-10-14` có mặt).
- Production và staging deploy từ repo mới thành công; tính năng sync và PDF vẫn chạy.

---

## Phiên 1.2: Cấu trúc monorepo và package đầu tiên

### Thiết kế
- **npm workspaces** ở `package.json` gốc (đơn giản, không cần công cụ thêm): `"workspaces": ["packages/*", "web", "web/server", "desktop"]`.
- **Không di chuyển** `web/` và `desktop/` (tránh làm hỏng Dockerfile, compose, đường dẫn Dokploy). Chỉ thêm thư mục `packages/`.
- Package đầu tiên **`@noteriv/core`** (`packages/core/`): TypeScript thuần, **không phụ thuộc React, Next, Tauri, hay `webApi`**. Build bằng `tsc` ra `dist/` (ESM + `.d.ts`), hoặc để web/desktop biên dịch trực tiếp mã nguồn qua `transpilePackages` của Next (chọn sau khi đọc tài liệu Next 16 trong `web/node_modules/next/dist/docs/`).
- **Dockerfile của `web`** (context là gốc repo, đã có) phải copy `packages/` và chạy `npm ci` ở gốc workspace. Kiểm tra lại `web/server/Dockerfile` (context `../server`): server **chưa cần** package chung ở giai đoạn này.

### Việc cụ thể
1. Thêm workspace, `packages/core` với `package.json`, `tsconfig.json`, khung test (Vitest).
2. Chuyển **9 file giống hệt** ở cả hai bên vào `@noteriv/core` (kiểm tra lại bằng `cmp` trước khi chuyển), sửa import ở `web/` và `desktop/`.
3. Chuyển các file thuần logic **khác nhau ít** (ví dụ `frontmatter-utils`, `tag-utils`, `wiki-link-utils`, `toc-utils`, `markdown-lint`, `flashcard-utils`, `calendar-utils`, `template-utils`): so sánh từng cặp, hợp nhất về bản tốt hơn (thường là bản web, đã sửa lỗi gần đây), viết test cho phần hợp nhất.
4. Đảm bảo `next build` của web, `next build` của desktop (static export), và `docker build` của web đều chạy.

### Xong khi
- `packages/core` có ít nhất 15 module dùng chung, có test; web và desktop build được; staging chạy bình thường.

---

## Phiên 1.3: Tầng lưu trữ trừu tượng (VaultAdapter)

### Thiết kế
- Interface `VaultAdapter` trong `@noteriv/core` mô tả mọi thao tác vault mà giao diện cần: `readNote`, `writeNote`, `createNote`, `rename`, `delete`, `listTree`, `createFolder`, `readAttachment`, `writeAttachment`, `search`, `backlinks`, `watch` (sự kiện thay đổi), `getSettings`/`saveSettings`.
- Hai bản cài đặt:
  - `WebVaultAdapter` (trong `web/src/lib/`) bọc `webApi.ts`.
  - `DesktopVaultAdapter` (trong `desktop/src/lib/`) bọc `window.electronAPI` (đọc/ghi file, `readDir`; tìm kiếm và backlink tính tại chỗ như hiện nay).
- Giao diện (component) chỉ gọi `VaultAdapter`, không gọi trực tiếp `webApi` hay `electronAPI`. Đây là điều kiện để dùng chung component ở phiên 1.4.

### Việc cụ thể
1. Liệt kê mọi chỗ gọi `webApi.*` trong `web/src/components` và `window.electronAPI.*` trong `desktop/src/components`; nhóm theo chức năng; viết interface.
2. Viết 2 adapter + test hợp đồng (cùng bộ test chạy trên adapter giả trong bộ nhớ `MemoryVaultAdapter`, dùng cho test component sau này).
3. Chuyển dần các component **nhỏ** sang dùng adapter (Outline, Tags, Bookmarks, Backlinks) để kiểm chứng thiết kế.

### Xong khi
- Interface ổn định, có `MemoryVaultAdapter` + test; ít nhất 4 component ở cả hai bên dùng adapter mà không đổi hành vi.

---

## Phiên 1.4: Package giao diện dùng chung (`@noteriv/ui`)

### Thiết kế
- `packages/ui` (React + CodeMirror): editor (`Editor.tsx`, `SourceEditor.tsx`), `components/markdown/*` (live preview, widget, embeds, callouts, math, mermaid), các panel cơ bản. Nhận `VaultAdapter` qua React context.
- **Hợp nhất từng nhóm**, mỗi nhóm một commit; bản web là gốc (đã có sửa lỗi cuộn, Tailwind, plugin block), chỉ giữ thêm phần đặc thù desktop nếu cần (ví dụ phím tắt cửa sổ).
- CSS: biến theme và class dùng chung chuyển vào `packages/ui/styles/`; lưu ý quy tắc Tailwind v4 (reset trong `@layer base`).

### Việc cụ thể (theo thứ tự rủi ro tăng dần)
1. Markdown renderers (`components/markdown/*`) và `markdown-code-block-registry`.
2. Editor (live preview + source + vim mode + slash commands).
3. Panels: Outline, Backlinks, Tags, Bookmarks, QuickOpen, CommandPalette.
4. Graph, Search.
- Các tính năng lớn (Canvas, Board, Drawing, PDF viewer, Slides, Flashcard…) **chưa chuyển** ở đây. Chúng sẽ thành core plugin ở Giai đoạn 2.

### Xong khi
- Web và desktop dùng chung editor và renderer; kiểm tra thủ công trên cả hai (mở vault, sửa, wikilink, embed, math, mermaid, cuộn dài); không còn bản sao của các file đã chuyển.

---

## Phiên 1.5: Plugin API v1 (bản nháp) hai tầng

### Thiết kế
- **Đặc tả** `docs/plugin-api/v1.md` + kiểu TypeScript `packages/plugin-api/` (`@noteriv/plugin-api`): một bề mặt API cho cả hai tầng, gồm:
  - `vault` (qua `VaultAdapter`, giới hạn theo quyền), `editor`, `markdown.registerCodeBlockProcessor`, `ui` (lệnh, status bar, panel, tab cài đặt, **view toàn màn hình**, **ribbon icon**, modal), `events`, `settings` theo plugin, `app` (phiên bản, nền tảng).
  - Tính năng mới cần cho core plugin: `ui.registerView(type, factory)` (một tab hoặc view riêng như Canvas hay Board), `ui.addRibbonIcon`, `commands` có phím tắt, `markdown.registerPostProcessor`, `workspace.openFile`.
- **Tầng core:** plugin là module ES nằm trong repo (`packages/plugins/<tên>/`), được nạp **trực tiếp** (dynamic `import()`, nên tắt plugin thì không tải mã), nhận API đầy đủ và DOM thật.
- **Tầng cộng đồng:** giữ sandbox iframe của web (`public/plugin-sandbox.html`, `usePluginHost.ts`, `mirror.ts`); ánh xạ API v1 sang RPC postMessage; quyền mặc định chặn, suy ra từ mã (`web/src/lib/plugin-community.ts` `inferPermissions`) và người dùng xác nhận. **Desktop cũng dùng sandbox này** cho plugin cộng đồng (thay mô hình chạy trực tiếp không quyền hiện tại).
- **Đăng ký và bật/tắt:** `PluginRegistry` trong `@noteriv/core`: danh sách core plugin (id, tên, mô tả, mặc định bật hay tắt, `load()` trả về module) + plugin cộng đồng đã cài. Trạng thái bật/tắt lưu theo vault (web: DB; desktop: `.noteriv/plugin-config.json`).
- **Tương thích:** plugin cộng đồng hiện có (chessboard, `thejacedev/NoterivPlugins`) phải chạy được qua lớp tương thích với `PluginAPI` cũ.

### Việc cụ thể
1. Viết đặc tả v1 (bản nháp, đánh dấu `0.x`, chưa đóng băng) và kiểu TS.
2. Cài đặt `PluginRegistry` + host core (trong `@noteriv/ui`) + bọc host sandbox hiện có.
3. **Plugin mẫu nhỏ** để kiểm chứng: chuyển "Word count" hoặc "Random note" thành core plugin; chạy được trên web và desktop.
4. Cài đặt: mục "Core plugins" trong Settings, bật/tắt từng plugin.

### Xong khi
- Một core plugin mẫu bật/tắt được trên cả hai nền tảng; khi tắt, mã của nó không có trong bundle tải ban đầu (kiểm tra bằng Network tab).
- Plugin chessboard cộng đồng vẫn chạy trên web và **chạy được trên desktop qua sandbox**.

---

## Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Hợp nhất mã lệch làm mất bản sửa lỗi | Bản web là gốc; hợp nhất từng nhóm nhỏ, kiểm tra cả hai nền tảng sau mỗi nhóm |
| Next 16 static export (desktop) và standalone (web) xử lý package khác nhau | Đọc tài liệu Next 16 trước (`web/AGENTS.md`); thử build cả hai ngay ở phiên 1.2 |
| Build Docker web hỏng vì workspace | Sửa `web/Dockerfile` ngay phiên 1.2, thử trên staging |
| Giai đoạn dài không có tính năng mới | Báo tiến độ ở cuối mỗi phiên; giữ production ổn định (staging trước) |
| `phone/` không còn được duy trì | Ghi rõ trong README là ngừng phát triển (thay bằng PWA, Giai đoạn 5); không xoá |

## Ước lượng
Khoảng 6–9 buổi: 1.1 (1), 1.2 (1–2), 1.3 (1–2), 1.4 (2–3), 1.5 (1–2).

## Trạng thái

| Phiên | Trạng thái | Ngày | Commit / ghi chú |
|---|---|---|---|
| 1.1 Tách repo | Chưa làm | | |
| 1.2 Monorepo + `@noteriv/core` | Chưa làm | | |
| 1.3 VaultAdapter | Chưa làm | | |
| 1.4 `@noteriv/ui` | Chưa làm | | |
| 1.5 Plugin API v1 nháp | Chưa làm | | |

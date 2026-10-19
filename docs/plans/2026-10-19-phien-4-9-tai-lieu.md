# Phiên 4.9: Tài liệu người dùng tiếng Anh cho bản web

> Ngày: 2026-10-19 · Chặng: [4](2026-10-17-chang-4-quoc-te-hoa-nguoi-moi.md) (phiên cuối) · Nhánh: `covuaduongsinh/chang4-docs` (tách từ `covuaduongsinh/chang4-offline-done`, nên PR này mang theo commit tài liệu "4.8 đã lên production")

## Chủ dự án chốt

1. **Web là chính, desktop ghi chú riêng.** Mọi trang mô tả bản web. Chỗ desktop khác thì có một dòng "Desktop app: …", và trang mới `docs/desktop.md` gom các khác biệt.
2. **Xoá các trang mô tả thứ không có trên web.** Mobile React Native đổi thành một trang Điện thoại/PWA.
3. **Làm hết trong 4.9**, một PR.
4. (Phát sinh khi đối chiếu) **Sửa luôn wiki-link không bấm được trên web.** Xem mục "Sửa mã".

## Hiện trạng trước phiên

Kiểm kê khoảng 60 trang tiếng Anh trong `docs/` (bỏ `plans`, `ops`, `dev`, `perf`, `qa`, `plugin-api`). Gần như tất cả viết cho desktop Electron/Tauri và app React Native của upstream:
- phím tắt sai: Quick Open `Ctrl+P` (web là `Ctrl+K`), zen `Ctrl+Shift+E`, template `Ctrl+T`, `F11`…;
- vault là thư mục, `.noteriv/`, `~/.config`;
- Folder sync (không có trên web), sync "mỗi 5 giây";
- trang cho tính năng không tồn tại: menu chuột phải trong editor, folding/minimap ở Source mode, typewriter/paragraph ở focus mode, `:w`/`:q` của Vim, chọn nhiều file trên web;
- 4 trang mobile React Native và trang sync mobile;
- không có gì về tài khoản, cài như app, Ghi nhanh, offline, xung đột, web clipper, ô Language, vault mẫu, bật/tắt core plugin, nhập/xuất, thùng rác, đính kèm, cộng tác.

## Đã làm

### Tài liệu (tiếng Anh)

- **Xoá:**
  - `editor/context-menu.md`, `features/multi-select.md` (nội dung vào `desktop.md`);
  - `sync/folder-sync.md`, `sync/mobile-sync.md`;
  - `mobile/features.md`, `mobile/setup.md`, `mobile/swipe-navigation.md`.
- **Trang mới:**
  - `desktop.md` (Desktop app);
  - `features/core-plugins.md`, `offline.md`, `conflicts.md`, `web-clipper.md`, `language.md`, `import-export.md`, `attachments-and-trash.md`, `collaboration.md`.
- **Viết lại:**
  - `index.md`, `faq.md`, `contributing.md`;
  - toàn bộ `getting-started/` (đăng ký và cài như app, quickstart với vault mẫu, vault, giao diện kể cả bố cục điện thoại, bảng phím tắt theo `web/src/lib/hotkeys.ts`);
  - `mobile/index.md` (Phone and tablet);
  - `editor/index.md`, `source-mode.md`, `split-editor.md`, `focus-mode.md`;
  - `features/index.md`, `daily-notes.md`, `bookmarks.md`, `file-recovery.md`, `note-history.md`;
  - `sync/index.md`, `git-sync.md`, `webdav-sync.md`;
  - `plugins/index.md`, `views/index.md`.
- **Sửa từng chỗ:**
  - `live-mode.md`, `view-mode.md`, `vim-mode.md`;
  - `templates.md`, `search.md`, `command-palette.md`, `wiki-links.md`, `tags.md`, `flashcards.md`, `note-composer.md`, `lint.md`, `dataview.md`;
  - `creating-plugins.md`, ba trang theme;
  - các trang views (graph, calendar, board, slides, canvas, drawing, pdf);
  - `reference/file-types.md`, `reference/index.md`, `callouts.md`, `markdown-syntax.md`, `frontmatter.md`;
  - `mcp/index.md`, `mcp/setup.md`: MCP chạy trên thư mục vault trên máy, chạy từ thư mục `mcp/` của repo.
- **`README.md`:** bỏ câu "PWA đang dự định", thêm cài như app / offline / chống ghi đè; web clipper là bookmarklet trên web, extension cho desktop; trỏ tới `docs/index.md`.
- Không đụng tài liệu nội bộ tiếng Việt (`plans`, `ops`, `dev`, `perf`, `qa`, `plugin-api`, `upstream-notes.md`).

Nguyên tắc khi viết:
- đối chiếu từng khẳng định với mã;
- tên nút và menu lấy đúng từ `en.json`;
- ghi rõ core plugin nào mặc định tắt và cần bật trước.

### Sửa mã (phát sinh khi đối chiếu)

- **Wiki-link không bấm được trên web.** Ở Live và View mode, `[[link]]` chỉ hiện xem trước khi rê chuột; bấm vào không mở note. Vault mẫu (4.6) lại viết "bấm vào liên kết sẽ tạo note".
  - Sửa (`packages/ui/src/editor/link-click.ts`, dùng ở `Editor.tsx` và `ReadOnlyView.tsx`):
    - bấm wiki-link thì mở note (tìm theo đường dẫn, rồi theo tên); chưa có thì tạo (kể cả thư mục) rồi mở;
    - liên kết `[text](Note.md)` tương đối cũng mở note;
    - địa chỉ web và mail mở ở tab mới. Trước đây, ở View mode, bấm vào sẽ rời app ngay trong tab đó.
  - Chỉ chạy khi trang truyền callback (web có, desktop không). Desktop vẫn dùng bộ xử lý riêng ở cấp document như cũ.
- **Câu trong khung xung đột** (`panels.conflict.banner`) từng nói "saved by sync". Từ 4.8 xung đột còn sinh ra khi lưu, nên đổi thành câu trung tính, cả en và vi.

### Chưa có trên web, ghi trung thực trong tài liệu

- Không nhúng nội dung `![[note]]` hay bản vẽ vào note khác (chỉ hiện dấu tham chiếu); không xuất SVG bản vẽ.
- Không thả hay dán ảnh trực tiếp vào editor; ảnh thêm qua trình quản lý đính kèm.
- Không chia sẻ vault với tài khoản khác; cộng tác hiện chỉ giữa các thiết bị và tab của chính mình.
- Tuần trong lịch luôn bắt đầu Chủ nhật.

## Kiểm chứng

- **Script kiểm link** (scratchpad, không commit): mọi link tương đối và anchor trong 66 file tài liệu người dùng và `README.md` trỏ đúng; **0 lỗi**. Lỗi thật duy nhất tìm được và đã sửa: `reference/frontmatter.md` → `../views/board.md`.
- **Grep từ cũ** (`Electron`, `React Native`, `.noteriv/`, `~/.config`, `Folder sync`, `Ctrl+P`, `Ctrl+Shift+E`, `F11`, `DailyNotes`…) ngoài `desktop.md`: chỉ còn ở dòng "Desktop app:", các trang MCP (thư mục trên máy) và câu giải thích phím trình duyệt.
- **Đối chiếu bảng phím tắt** với `web/src/lib/hotkeys.ts` và `hotkey` của core plugin: khớp.
- `npm run typecheck` sạch; `npm test`: 300 + 122 + 86 = **508 test đạt**. Test mới `packages/ui/test/link-click.test.ts`.
- **E2E 22/22 trên bản build production, ba lần liền đều đạt.** Thêm test: bấm `[[Second]]` thì mở Second; bấm `[[Third idea]]` chưa có thì tạo và mở.
- Desktop: **smoke chưa chạy.** Claude Code lại dừng bản build Tauri vì máy thiếu bộ nhớ, như ở 4.8. Thay đổi trong `Editor.tsx` dùng chung chỉ chạy khi trang truyền callback; desktop không truyền nên hành vi desktop không đổi. CI vẫn kiểm `desktop-frontend`.

## Còn để sau

- Hướng dẫn tự host bằng tiếng Anh (hiện chỉ có `docs/ops/` tiếng Việt).
- Các tính năng ở mục "Chưa có trên web" phía trên.

## Lên production (2026-10-19)

- Không có migration. CI của PR #17 xanh cả 4 job. Staging: `/`, `/login`, `/vaults`, `/api/v1/healthz` trả 200.
- Gộp PR #17 (merge `b059018`), deploy production `done`; các đường dẫn trên trả 200; 9 container chạy.
- `next` đưa về `main`, chờ staging deploy xong rồi `compose.stop`.
- **Chặng 4 xong.** Còn treo:
  - thử cài PWA trên Android/iOS thật (việc của chủ dự án);
  - smoke desktop của 4.8 và 4.9 chưa chạy vì máy thiếu bộ nhớ.

  Nên chạy `CARGO_BUILD_JOBS=2 npx tauri build --no-bundle` rồi `node e2e/desktop/smoke.mjs` ở đầu phiên kế tiếp, khi máy rảnh.

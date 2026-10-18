# Phiên 4.2: Rút chuỗi, phần 1 (phần dùng chung và khung trang vault)

> Ngày: 2026-10-18 · Chặng: [4](2026-10-17-chang-4-quoc-te-hoa-nguoi-moi.md) · Nhánh: `covuaduongsinh/chang4-strings-1` (tách từ `covuaduongsinh/chang4-i18n-done`, nên PR này mang theo commit tài liệu "4.1 đã lên production")

## Chủ dự án chốt

**Tách thêm một phiên rút chuỗi.** Kiểm kê cho thấy còn khoảng 1.000 chuỗi viết cứng, trong đó phạm vi 4.2 cũ đã khoảng 750. Chia lại:

| Phiên | Nội dung |
|---|---|
| 4.2 | Phần dùng chung và khung trang vault |
| 4.3 | Cài đặt, PluginManager, các hộp thoại |
| 4.4 | Trang ngoài và trang pháp lý; đổi mặc định ngôn ngữ, hiện ô Language |

Các phiên sau lùi một số: Người mới thành 4.5, PWA thành 4.6, tài liệu thành 4.7.

## Quy tắc ghép hai bộ chữ

Mặc định chuyển tiếp vẫn giữ (web `vi`, desktop `en`):
- `en.json` lấy **đúng chữ desktop đang có**, nên desktop gần như không đổi chữ nào;
- `vi.json` lấy **chữ web đang có**.

Chữ khác **nghĩa** giữa hai nền tảng thì dùng khoá `….web` / `….desktop`:
- gợi ý trống của Lịch sử note: web chụp bản lưu 10 phút một lần, desktop chụp mỗi lần lưu;
- "Xoá file nguồn" (desktop) và "chuyển vào thùng rác" (web) của Note composer;
- lỗi lưu ghi âm: chỉ web có hạn mức lưu trữ.

## Đã làm

| Việc | Trước | Sau |
|---|---|---|
| 16 core plugin còn lại | `TEXT[api.app.platform]` (web Việt, desktop Anh) | `labelsFor(api)` dựng nhãn bằng `pluginT(api, "<nhóm>")` (`packages/plugins/src/shared/i18n.ts`); khoá `plugins.<nhóm>.*`. Chữ viết cứng trong view cũng vào catalog: thanh công cụ và menu chuột phải của Canvas, công cụ Drawing, Board, trạng thái khối Dataview/Mermaid, note chú thích PDF xuất ra |
| Tên, mô tả core plugin | Viết tay ở `web/src/lib/core-plugins.ts` (Việt) và `desktop/…` (Anh) | `plugins.<nhóm>.name` / `.description`; danh sách của app chỉ còn `id`, `defaultEnabled`, `load` |
| Lỗi registry | "Không lưu được lựa chọn: …", "Module không có onload()" (tiếng Việt trong `packages/core`) | `errorKind` (`load` / `save`) + chi tiết kỹ thuật; Cài đặt ghép câu theo ngôn ngữ |
| Panel Tags, Backlinks, Outline; nút Copy của khối code; mục lục | Tiếng Anh viết cứng | Catalog |
| Khung trang web | Lẫn Việt/Anh: menu tab, AppMenu, menu sidebar, nhãn phím tắt, vài nút ribbon và thanh trạng thái còn tiếng Anh | Catalog (chi tiết bên dưới) |
| Khung trang desktop | Tiếng Anh viết cứng | Catalog: ribbon, TitleBar (menu tab, nút cửa sổ, nút chế độ), Sidebar (menu chuột phải), thanh trạng thái và đồng bộ, menu chế độ editor, thông báo xung đột sync |
| Nhãn phím tắt trong bảng lệnh | Lấy từ bảng `hotkeys.ts` của từng app | `CommandPalette` đọc `hotkeys.<action>` và `hotkeys.category.<nhóm>` (dùng chữ của bảng khi catalog thiếu, qua `tOr`) |

Khung trang web gồm:
- ribbon, AppMenu, TabBar;
- Sidebar và menu chuột phải, StatusBar;
- thanh công cụ note, VaultHeader (nút Sửa/Xem/Mã nguồn), VaultSwitcher;
- hover preview, panel cộng tác;
- thông báo trang và trạng thái rỗng.

**Người dùng web thấy gì:** mọi chữ tiếng Anh còn sót ở khung trang nay là tiếng Việt. Ví dụ: menu tab ("Đóng các tab khác"), menu File/Sửa/Xem, menu chuột phải sidebar ("Đổi tên", "Xoá"), bảng lệnh ("Lưu ngay"), thanh trạng thái ("đã lưu · 1 dòng · 0 ký tự"), công cụ Canvas/Drawing.

**Người dùng desktop thấy gì:** gần như không đổi. Chỉ thanh trạng thái nay viết đúng số ít ("1 line", trước là "1 lines").

## Kiểm chứng

- `npm run typecheck`: sạch.
- `npm test`: 291 + 92 + 86 = **469 test đạt**. Test mới:
  - `i18n-all-plugins.test.ts`:
    - `onload` của cả 17 plugin, trên web và desktop, với cả hai catalog;
    - quét mọi `t("…")` trong mã plugin (kể cả khoá `….${platform}`), kiểm có trong `en` và `vi`.
  - `i18n-catalog.test.ts`:
    - mọi `id` core plugin của hai app có tên và mô tả;
    - mọi hành động phím tắt (hai app) và mọi mục AppMenu có nhãn.
  - `command-palette-i18n.test.ts`: bảng lệnh đổi nhãn theo ngôn ngữ, giữ chữ của bảng khi catalog thiếu.
  - Registry: `errorKind` khi lưu hỏng và khi nạp hỏng.
- **E2E 9/9 trên bản build production.** Đổi theo chữ mới:
  - "Đổi tên", "Xoá", nút "Thêm note";
  - nút khôi phục trong thùng rác tìm theo tiêu đề chính xác (vì "Khôi phục file" giờ cũng là một tiêu đề);
  - bước tiếng Anh bấm ribbon "Search in vault" và kiểm "More tools".
- **Thử bằng mắt** (ảnh chụp từ một spec tạm, không commit), ở chế độ mặc định và cờ dev `en`: màn trống, menu File, menu tab, menu sidebar, bảng lệnh. Không còn chữ lẫn ngôn ngữ, trừ "Add properties" (FrontmatterEditor, thuộc 4.3). Ảnh chụp phát hiện hai lỗi, đã sửa:
  - nút Sửa/Xem/Mã nguồn chưa dịch;
  - "1 lines" thiếu số ít.
- JS tải đầu web: **211,6 KB gzip** (4.1: 200,5; ngân sách ≤ 374). Catalog `vi` nạp sẵn trên web nên tăng theo số chuỗi.
- **Smoke desktop (app Tauri thật) 16/16:** `CARGO_BUILD_JOBS=2 npx tauri build --no-bundle` (4 phút), rồi `node e2e/desktop/smoke.mjs`. Desktop vẫn hiện đúng chữ tiếng Anh cũ: word count, tìm kiếm, khung xung đột, "Core plugins".

## Lên production

- PR #10 (CI xanh cả 4 job) gộp vào `main` thành `f206bac` ngày 2026-10-18.
- Deploy production `done`; 9 container; `/` và `/api/v1/healthz` trả 200. Không có migration.
- Staging đã được thử: deploy `done`, `/`, `/login`, `/api/v1/healthz` trả 200.
- Sau đó `next` được đưa về bằng `main`, chờ bản deploy staging do lần đẩy đó kích hoạt xong, rồi tắt staging.

## Ghi chú kỹ thuật

- **Mẫu chuyển một plugin:** `labelsFor(api)` trong `index.ts` (hoặc `labels.ts`), gọi trong `onload`. Hàm nhãn có tham số (`cards: (count) => t("cards", { count })`) chỉ gọi `t` khi hiện chữ, nên test quét mã nguồn để bắt khoá thiếu.
- **Danh sách** (tên tháng, thứ trong tuần, nhãn ngày của heatmap) lưu thành một chuỗi cách nhau bằng dấu phẩy, tách bằng `listOf(t, key)`. Không dùng `Intl` vì tiếng Việt cho "Th 2" và "Tháng 1" (quá dài cho heatmap), khác chữ đang có.
- **`renderMermaid`, `createDataviewProcessor`, `annotationsToMarkdown`** vẫn có bản tiếng Anh mặc định (cho test và nơi gọi ngoài host); plugin truyền chữ theo ngôn ngữ (`createMermaidRenderer(text)`).
- **Playwright `getByTitle` khớp chuỗi con.** Thêm bản dịch có thể làm một bộ chọn trúng hai nút. Đặt `{ exact: true }` khi chữ ngắn.
- **Còn tiếng Anh, có chủ ý:**
  - lỗi `core-plugin-host` ném cho plugin ("This vault cannot store attachments"): chữ cho người viết plugin;
  - tên mặc định "Untitled", "New Folder": dữ liệu, 4.4 quyết định;
  - "Module has no onload()".

## Chưa làm / để sau

- 4.3:
  - Cài đặt hai app, kể cả tab Phím tắt (đang hiện `h.label` của bảng);
  - PluginManager;
  - các hộp thoại: FrontmatterEditor ("Add properties"), Sync, Diagnostics, Import, Attachment, Clipper, Trash, CSS Snippets, Themes, Publish, File Recovery;
  - desktop: SetupWizard và các cửa sổ phụ.
- 4.4: trang ngoài, pháp lý, `Intl` cho ngày giờ, đổi mặc định, ô Language.

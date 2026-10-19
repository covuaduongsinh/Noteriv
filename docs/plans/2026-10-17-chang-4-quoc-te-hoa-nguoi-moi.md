# Chặng 4: Quốc tế hoá, người mới, di động

> Ngày lập: 2026-10-17 · Trạng thái: **đang làm** (4.1–4.9 xong) · Lộ trình: [2026-10-17-lo-trinh-thuong-mai.md](2026-10-17-lo-trinh-thuong-mai.md)
> **Phiên mới hãy đọc trước:** [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md)
> **Điều kiện bắt đầu:** Chặng 2 xong (chuỗi giao diện đã trung lập); nên xong 3.2 (E2E) để bắt lỗi khi rút chuỗi.

## Mục tiêu

- Giao diện **tiếng Anh là mặc định**, tiếng Việt là lựa chọn; thêm ngôn ngữ khác chỉ cần thêm file dịch.
- Người mới đăng ký hiểu ngay cách dùng (vault mẫu, trạng thái rỗng có hướng dẫn).
- Dùng được trên điện thoại như một app (PWA) và ghi nhanh.

## Hiện trạng

- Chưa có thư viện i18n. Web chủ yếu tiếng Việt viết cứng (≈ 27 file), còn sót tiếng Anh (CSSSnippets, FrontmatterEditor, PublishPreview, TabBar). Desktop tiếng Anh. Core plugin: mô tả web tiếng Việt, desktop tiếng Anh. `<html lang="vi">` cố định.
- Điều khoản/quyền riêng tư song ngữ viết cứng trong trang.

---

## Phiên 4.1: Hạ tầng i18n dùng chung

1. Module nhỏ trong `packages/ui` (ví dụ `packages/ui/src/i18n/`): hàm `t(key, params)`, catalog JSON `en.json` (mặc định, đầy đủ) và `vi.json`, hỗ trợ số nhiều và tham số. **Không** dùng thư viện gắn với Next (desktop là xuất tĩnh); nếu cần thư viện thì chọn loại thuần JS, kiểm dung lượng bằng `npm run perf:web` (ngân sách JS tải đầu vẫn phải đạt).
2. Core plugin dùng chung cơ chế (thêm vào Plugin API nếu cần: `api.i18n.t` hoặc plugin tự mang catalog).
3. Chọn ngôn ngữ: theo `UserPreference` (web) / cấu hình app (desktop); mặc định theo ngôn ngữ trình duyệt/hệ điều hành, rơi về `en`. `<html lang>` theo ngôn ngữ đang dùng.
4. Test: mọi khoá trong `vi.json` có trong `en.json`; không có khoá thiếu (test tự động).

## Phiên 4.2 – 4.5: Rút chuỗi

**Chủ dự án chốt (2026-10-17):** giữ mặc định chuyển tiếp (web tiếng Việt, desktop tiếng Anh, chưa có ô chọn) tới khi rút xong mọi chuỗi. Khi đó mới:
- đổi sang "theo ngôn ngữ trình duyệt/hệ điều hành, rơi về tiếng Anh";
- hiện ô "Language" trong Cài đặt;
- chuyển E2E sang tiếng Anh;
- làm rỗng `NOT_YET_TRANSLATED` trong `packages/ui/test/i18n-catalog.test.ts`.

**Chủ dự án chốt (2026-10-18):** phần rút chuỗi chia làm ba phiên thay vì hai (khoảng 1.000 chuỗi); sau kiểm kê 4.3 (khoảng 850 chuỗi), chia thêm một lần nữa thành bốn phiên. Các phiên sau lùi số theo.

**Mẫu cần theo:**
- chuyển một plugin: `packages/plugins/src/calendar` (`labelsFor(api)` + `pluginT`);
- chuyển một panel: `packages/ui/src/panels/VaultSearch.tsx`;
- chuyển một component của app: `web/src/components/StatusBar.tsx` (`t()` + `useLocale()`).

**Quy tắc ghép hai bộ chữ:** `en` là chữ desktop hiện có, `vi` là chữ web hiện có. Chữ khác **nghĩa** giữa hai nền tảng thì dùng khoá `….web` / `….desktop`.

1. **4.2 (xong):** phần dùng chung trong `packages/`:
   - 17 core plugin, kể cả chữ trong view Canvas/Drawing/Board;
   - tên và mô tả plugin;
   - lỗi registry;
   - panel Tags/Backlinks/Outline.

   Cùng với đó là khung trang vault của hai app: ribbon, menu, tab, sidebar, thanh trạng thái, nhãn phím tắt trong bảng lệnh.
2. **4.3 (xong):** Cài đặt hai app (mọi mục, kể cả tab Phím tắt, đồng bộ, Clipper), PluginManager hai app, các bảng lựa chọn.
3. **4.4 (xong):** các hộp thoại còn lại:
   - web: `DiagnosticsModal`, `ImportVault` (cùng `lib/vault-import.ts`), `AttachmentManager`, `TrashPanel`, `CSSSnippets`, `ThemePicker` (cùng mô tả theme trong `theme-utils.ts`), `PublishPreview`, `FileRecovery`, `FrontmatterEditor`, `PdfPreviewModal`;
   - desktop: các bản tương ứng, `SetupWizard`, `CollabPanel`, `VaultSwitcher`, `ImageViewer`, lỗi của `attachment-utils.ts`.
4. **4.5 (xong):**
   - trang `/vaults`, `/admin/invites`, `/login`, `/register`;
   - `/terms`, `/privacy`: tiếng Anh là chính, có bản tiếng Việt;
   - ngày giờ và số theo ngôn ngữ (`Intl`);
   - quyết định tên mặc định "Untitled"/"New Folder";
   - rồi **đổi mặc định** và hiện ô Language.

## Phiên 4.6: Trải nghiệm người mới (xong)

1. Vault mẫu **"Getting started"** tạo khi đăng ký (theo ngôn ngữ người dùng): vài note giới thiệu wikilink, backlink, tag, plugin, đồng bộ.
2. Trạng thái rỗng có hướng dẫn (vault trống, chưa có kết quả tìm, chưa có plugin).
3. Rà lại mặc định bật/tắt của core plugin cho người dùng chung (danh sách hiện tại: `docs/plugin-api/v1.md` mục 9).

## Phiên 4.7 – 4.8: PWA, Ghi nhanh, giao diện điện thoại, offline

Lấy từ phiên 5.2 của lộ trình cũ (`2026-10-14-giai-doan-5-dong-bo-di-dong-chia-se.md`), bỏ phần cờ. **Chủ dự án chốt (2026-10-18): tách đôi.** 4.7 làm mục 1 (phần cài như app), 3, 4, 5 và báo khi lưu lỗi; 4.8 làm đọc và ghi offline (mục 1 phần IndexedDB, mục 2). Tài liệu tiếng Anh lùi thành 4.9.

1. `manifest.webmanifest`, Service Worker (theo tài liệu Next 16 trong `node_modules/next/dist/docs/`; chủ dự án chọn tự viết, không dùng Serwist): cache vỏ ứng dụng; **đọc offline** note mở gần đây (IndexedDB, 4.8).
2. Ghi offline có hàng đợi; xung đột dùng giao diện của Chặng 3 (phiên 3.5). Cần thêm kiểm tra phiên bản khi lưu trên server (hiện lưu theo kiểu "ai lưu sau thắng") (4.8).
3. **Ghi nhanh** `/quick`: trang nhẹ chỉ có ô nhập + chọn vault/thư mục (mặc định `Inbox/`), mở dưới 1,5 giây trên điện thoại tầm trung; shortcut trong manifest.
4. Giao diện điện thoại (dời từ 3.6):
   - thanh công cụ note không bị cắt;
   - sidebar dạng ngăn kéo;
   - ribbon thành thanh dưới.
5. Hướng dẫn "Cài lên điện thoại" (Android Chrome, iOS Safari).

## Phiên 4.9: Tài liệu người dùng tiếng Anh (xong)

**Chủ dự án chốt (2026-10-18):** web là chính, desktop ghi chú riêng (trang `docs/desktop.md`); xoá các trang mô tả thứ không có trên web, mobile React Native thay bằng trang Điện thoại/PWA; làm hết trong một phiên; sửa luôn wiki-link không bấm được (phát hiện khi đối chiếu).


- Chỉnh các trang sẵn có trong `docs/getting-started`, `docs/features`, `docs/editor`, `docs/sync`, `docs/plugins`, `docs/themes`, `docs/views` cho đúng bản web hiện tại (nhiều trang viết cho desktop của upstream).
- Viết lại hoặc bỏ `docs/mobile` (viết cho app React Native, không còn).

### Xong khi (cả chặng)
- Chuyển ngôn ngữ en ↔ vi không còn chuỗi lẫn ngôn ngữ trên các màn hình chính (web + desktop); test khoá đầy đủ xanh. — **Đạt** (4.1–4.5; test catalog bắt buộc dịch đủ).
- Người dùng mới có vault mẫu; PWA cài được trên Android và iOS; Ghi nhanh đạt mục tiêu thời gian. — **Đạt**, trừ phần thử trên máy thật:
  - vault mẫu có từ 4.6;
  - PWA đạt "installable" trên Chromium (4.7), **chưa thử trên Android/iOS thật**;
  - Ghi nhanh mở nguội ~0,93 s (4.7);
  - thêm đọc/ghi offline (4.8).
- Ngân sách JS tải đầu vẫn đạt (`npm run perf:web`, `npm run perf:desktop`). — **Đạt** cho web: 236,6 KB gzip ở 4.8 (≤ 374). `perf:desktop` không đo lại trong chặng.

## Ước lượng
3–5 buổi.

## Trạng thái

| Phiên | Trạng thái | Ngày | Commit / ghi chú |
|---|---|---|---|
| 4.1 Hạ tầng i18n | Xong, đã lên production (PR #9 merge `79318bf`) | 2026-10-18 | [Bản ghi](2026-10-18-phien-4-1-i18n.md); `packages/ui/src/i18n`, `api.i18n` (draft.10), panel dùng chung + thanh định dạng + `word-count` đọc catalog; mặc định chuyển tiếp web `vi` / desktop `en` tới cuối 4.3 (chủ dự án chốt); 448 test, E2E 9/9, smoke desktop 16/16 |
| 4.2 Rút chuỗi (phần 1: phần dùng chung, khung trang) | Xong, đã lên production (PR #10 merge `f206bac`) | 2026-10-18 | [Bản ghi](2026-10-18-phien-4-2-rut-chuoi-1.md); 17 core plugin + tên plugin + panel + khung trang hai app đọc catalog; chia rút chuỗi thành 4.2–4.4 (chủ dự án chốt); 469 test, E2E 9/9, smoke desktop 16/16, JS tải đầu 211,6 KB |
| 4.3 Rút chuỗi (phần 2: Cài đặt, PluginManager) | Xong, đã lên production (PR #11 merge `51a7329`) | 2026-10-18 | [Bản ghi](2026-10-18-phien-4-3-cai-dat.md); Cài đặt hai app (kể cả đồng bộ, phím tắt, Clipper), PluginManager hai app, bảng lựa chọn; chia rút chuỗi thành 4.2–4.5 (chủ dự án chốt); 470 test, E2E 9/9, smoke desktop 16/16, JS tải đầu 223,1 KB |
| 4.4 Rút chuỗi (phần 3: các hộp thoại còn lại) | Xong, đã lên production (PR #12 merge `c99d7b8`) | 2026-10-18 | [Bản ghi](2026-10-18-phien-4-4-hop-thoai.md); các hộp thoại còn lại hai app; báo cáo Chẩn đoán cố định tiếng Anh; 470 test, E2E 9/9, smoke desktop 16/16, JS tải đầu 229,5 KB |
| 4.5 Rút chuỗi (phần 4: trang ngoài, pháp lý), đổi mặc định, ô Language | Xong, đã lên production (PR #13 merge `9dd0844`) | 2026-10-18 | [Bản ghi](2026-10-18-phien-4-5-ngon-ngu.md); ngôn ngữ theo lựa chọn → trình duyệt/hệ điều hành → `en`; ô Language hai app; người cũ giữ ngôn ngữ đang thấy (web `vi` qua migration, desktop `en`), tên mặc định theo ngôn ngữ (chủ dự án chốt); E2E chạy tiếng Anh; 475 test, E2E 10/10, smoke desktop 17/17, JS tải đầu 231,3 KB |
| 4.6 Người mới | Xong, đã lên production (PR #14 merge `f3b5396`) | 2026-10-18 | [Bản ghi](2026-10-18-phien-4-6-nguoi-moi.md); vault mẫu "Getting started"/"Bắt đầu" (web tự tạo khi đăng ký qua đường nhập, desktop có ô trong wizard), trạng thái rỗng có gợi ý, mặc định core plugin giữ nguyên (chủ dự án chốt); sửa wizard desktop ghi vào `~`; 486 test, E2E 11/11, smoke desktop 17/17, JS tải đầu 231,9 KB |
| 4.7 PWA (cài như app), Ghi nhanh, giao diện điện thoại | Xong, đã lên production (PR #15 merge `cc049a3`) | 2026-10-18 | [Bản ghi](2026-10-18-phien-4-7-pwa.md); manifest + icon + SW tự viết (vỏ app, trang offline), `/quick` (API `quick-note`, mở nguội ~0,9 s), `/install`, ribbon thành thanh dưới, sidebar thành ngăn kéo, báo khi lưu lỗi; tách 4.7/4.8 (chủ dự án chốt); 494 test, E2E 16/16, smoke desktop 17/17, JS tải đầu 233,8 KB |
| 4.8 Đọc và ghi offline | Xong, đã lên production (PR #16 merge `6832ef5`) | 2026-10-18 | [Bản ghi](2026-10-18-phien-4-8-offline.md); kho IndexedDB (vault, cây file, note mở gần đây ≤ 300 / 25 MB, bản sửa chờ gửi), trang vault mở được khi offline, bản sửa offline gửi lại khi có mạng; PATCH có `baseHash`, khác thì tạo bản "(conflict …)" thay vì ghi đè, áp mọi lần lưu (chủ dự án chốt); 503 test, E2E 21/21, smoke desktop chưa chạy (thiếu bộ nhớ), JS tải đầu 236,6 KB |
| 4.9 Tài liệu tiếng Anh | Xong, chờ lên production | 2026-10-19 | [Bản ghi](2026-10-19-phien-4-9-tai-lieu.md); tài liệu người dùng viết lại cho web (khoảng 60 trang, 7 trang xoá, 10 trang mới gồm `desktop.md`), web là chính và desktop ghi chú riêng (chủ dự án chốt); sửa wiki-link bấm được (Live/View) và link ngoài mở tab mới; 508 test, E2E 22/22, smoke desktop chưa chạy (thiếu bộ nhớ) |

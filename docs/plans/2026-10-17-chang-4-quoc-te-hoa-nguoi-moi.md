# Chặng 4: Quốc tế hoá, người mới, di động

> Ngày lập: 2026-10-17 · Trạng thái: **đang làm** (4.1 xong) · Lộ trình: [2026-10-17-lo-trinh-thuong-mai.md](2026-10-17-lo-trinh-thuong-mai.md)
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

## Phiên 4.2 – 4.3: Rút chuỗi

**Chủ dự án chốt (2026-10-17):** giữ mặc định chuyển tiếp (web tiếng Việt, desktop tiếng Anh, chưa có ô chọn) tới **cuối 4.3**. Khi đó mới đổi sang "theo ngôn ngữ trình duyệt/hệ điều hành, rơi về tiếng Anh", hiện ô "Language" trong Cài đặt, chuyển E2E sang tiếng Anh, và làm rỗng `NOT_YET_TRANSLATED` trong `packages/ui/test/i18n-catalog.test.ts`. Mẫu chuyển một plugin: `packages/plugins/src/word-count`; mẫu chuyển một panel: `packages/ui/src/panels/VaultSearch.tsx`.

1. Rút toàn bộ chuỗi viết cứng ở `web/src`, `desktop/src`, `packages/ui`, `packages/plugins` vào catalog. Làm theo nhóm (khung trang, cài đặt, hộp thoại, plugin), mỗi nhóm kiểm hai ngôn ngữ.
2. Trang `/terms`, `/privacy`, `/login`, `/register`: tiếng Anh là chính, có bản tiếng Việt theo ngôn ngữ chọn.
3. Định dạng ngày giờ, số theo ngôn ngữ (`Intl`).

## Phiên 4.4: Trải nghiệm người mới

1. Vault mẫu **"Getting started"** tạo khi đăng ký (theo ngôn ngữ người dùng): vài note giới thiệu wikilink, backlink, tag, plugin, đồng bộ.
2. Trạng thái rỗng có hướng dẫn (vault trống, chưa có kết quả tìm, chưa có plugin).
3. Rà lại mặc định bật/tắt của core plugin cho người dùng chung (danh sách hiện tại: `docs/plugin-api/v1.md` mục 9).

## Phiên 4.5: PWA và Ghi nhanh

Lấy từ phiên 5.2 của lộ trình cũ (`2026-10-14-giai-doan-5-dong-bo-di-dong-chia-se.md`), bỏ phần cờ:

1. `manifest.webmanifest`, Service Worker (theo tài liệu Next 16 trong `node_modules/next/dist/docs/`; cân nhắc Serwist): cache vỏ ứng dụng; **đọc offline** note mở gần đây (IndexedDB).
2. Ghi offline có hàng đợi; xung đột dùng giao diện của Chặng 3 (phiên 3.5).
3. **Ghi nhanh** `/quick`: trang nhẹ chỉ có ô nhập + chọn vault/thư mục (mặc định `Inbox/`), mở dưới 1,5 giây trên điện thoại tầm trung; shortcut trong manifest.
4. Hướng dẫn "Cài lên điện thoại" (Android Chrome, iOS Safari).

## Phiên 4.6: Tài liệu người dùng tiếng Anh

Chỉnh các trang sẵn có trong `docs/getting-started`, `docs/features`, `docs/editor`, `docs/sync`, `docs/plugins`, `docs/themes`, `docs/views` cho đúng bản web hiện tại (nhiều trang viết cho desktop của upstream); bỏ trang về tính năng không còn (ví dụ `docs/mobile` của app React Native).

### Xong khi (cả chặng)
- Chuyển ngôn ngữ en ↔ vi không còn chuỗi lẫn ngôn ngữ trên các màn hình chính (web + desktop); test khoá đầy đủ xanh.
- Người dùng mới có vault mẫu; PWA cài được trên Android và iOS; Ghi nhanh đạt mục tiêu thời gian.
- Ngân sách JS tải đầu vẫn đạt (`npm run perf:web`, `npm run perf:desktop`).

## Ước lượng
3–5 buổi.

## Trạng thái

| Phiên | Trạng thái | Ngày | Commit / ghi chú |
|---|---|---|---|
| 4.1 Hạ tầng i18n | Xong, đã lên production (PR #9 merge `79318bf`) | 2026-10-18 | [Bản ghi](2026-10-18-phien-4-1-i18n.md); `packages/ui/src/i18n`, `api.i18n` (draft.10), panel dùng chung + thanh định dạng + `word-count` đọc catalog; mặc định chuyển tiếp web `vi` / desktop `en` tới cuối 4.3 (chủ dự án chốt); 448 test, E2E 9/9, smoke desktop 16/16 |
| 4.2 Rút chuỗi (phần 1) | Chưa làm | | |
| 4.3 Rút chuỗi (phần 2) | Chưa làm | | |
| 4.4 Người mới | Chưa làm | | |
| 4.5 PWA, Ghi nhanh | Chưa làm | | |
| 4.6 Tài liệu tiếng Anh | Chưa làm | | |

# Giai đoạn 4: Plugin API v1 ổn định, tài liệu, plugin mẫu, CLI

> Ngày lập: 2026-10-14 · Trạng thái: **chưa triển khai** · Lộ trình: [2026-10-14-lo-trinh-noteriv-chess-pkm.md](2026-10-14-lo-trinh-noteriv-chess-pkm.md)
> **Phiên mới hãy đọc trước:** [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md)
> **Điều kiện bắt đầu:** Giai đoạn 3A xong (ít nhất). API đã được kiểm chứng bởi khoảng 20 core plugin (Giai đoạn 2) và các plugin cờ (Giai đoạn 3).

## Mục tiêu

Lập trình viên bên ngoài (đặc biệt người chơi cờ biết lập trình) **viết được plugin cho Noteriv trong 10 phút**, chạy được trên web và desktop, và không lo API thay đổi bất ngờ.

---

## Phiên 4.1: Đóng băng Plugin API v1.0

1. Rà toàn bộ `@noteriv/plugin-api` (bản `0.x`) theo cách các core plugin thực sự dùng. Bỏ hàm thừa, đặt tên nhất quán, bổ sung chú thích JSDoc tiếng Anh.
2. **Phân định rõ** hàm nào dành cho **plugin cộng đồng** (qua sandbox, có quyền) và hàm nào **chỉ core** (DOM thật, `registerView` phức tạp…). Trong sandbox, view tuỳ biến dùng cơ chế mirror (Shadow DOM + DOMPurify, `web/src/lib/plugin-sandbox/mirror.ts`) đã có.
3. **Mở các hàm cờ cho plugin cộng đồng** (quyền mới `chess:read`, `chess:engine`): đọc ván và thế cờ trong ghi chú, xin đánh giá engine, vẽ bàn cờ tĩnh. Nhờ đó cộng đồng viết được plugin cờ mà không cần chép engine.
4. **Chính sách phiên bản** (`docs/plugin-api/versioning.md`): semver; manifest khai `minAppVersion` và `apiVersion`; chỉ đổi phá vỡ ở bản major; giữ hàm cũ có cảnh báo `deprecated` ít nhất 2 bản minor.
5. Phát hành `@noteriv/plugin-api@1.0.0` lên npm (chỉ kiểu TypeScript + helper), sau khi chủ dự án tạo tài khoản hoặc tổ chức npm.

### Xong khi
- Đặc tả `docs/plugin-api/v1.md` hoàn chỉnh; gói npm phát hành; mọi core plugin build với bản 1.0.

## Phiên 4.2: Tài liệu cho lập trình viên

- Trang tài liệu (thư mục `docs/plugin-dev/`, xuất bản thành trang tĩnh, ví dụ GitHub Pages hoặc chính Noteriv publish ở Giai đoạn 5): **tiếng Anh trước** (cộng đồng quốc tế), tóm tắt tiếng Việt.
- Nội dung: Bắt đầu nhanh; giải phẫu một plugin; tham chiếu API (sinh tự động từ JSDoc bằng TypeDoc); quyền và bảo mật; phát hành plugin; FAQ; **hướng dẫn chuyển plugin Obsidian đơn giản** (bảng ánh xạ API, chỉ là hướng dẫn, không có lớp tương thích).

## Phiên 4.3: Plugin mẫu

Repo mẫu (hoặc thư mục `examples/plugins/`), mỗi plugin có README và test:
1. **hello-world**: lệnh + thông báo.
2. **word-goal**: status bar + cài đặt.
3. **chess-clock**: đồng hồ thi đấu trong panel (UI tương tác qua sandbox).
4. **opening-explorer-lite**: dùng `chess:read` + API Lichess Opening Explorer để hiện thống kê khai cuộc cho thế cờ trong ghi chú.
5. **elo-tracker**: đọc chỉ mục ván cờ, vẽ biểu đồ Elo theo thời gian.

## Phiên 4.4: CLI `npm create noteriv-plugin`

- Gói `create-noteriv-plugin`: hỏi tên, mô tả, mẫu (blank / ui-panel / chess), rồi sinh mã TypeScript + `manifest.json` + build (esbuild) + lệnh `dev`.
- **Chế độ dev:** `npm run dev` watch + tự cài vào vault dev; web dùng endpoint dev cho phép tải lại plugin (chỉ khi bật "Developer mode" trong Cài đặt); desktop đọc thẳng thư mục plugin.
- **Kiểm tra trước khi phát hành:** `npm run validate` (manifest đúng, quyền khai đủ so với mã, kích thước).

## Phiên 4.5: Kho plugin cộng đồng

- Repo `covuaduongsinh/noteriv-plugins` (danh mục `manifest.json`, giống `thejacedev/NoterivPlugins`) và quy trình gửi plugin bằng Pull Request, có checklist review bảo mật.
- Sửa `COMMUNITY_PLUGINS_BASE` trong `web/src/lib/plugin-community.ts` (và desktop) để đọc kho mới; vẫn đọc được kho cũ nếu còn.
- Trình quản lý plugin: tìm kiếm, nhãn "Cờ vua", hiển thị quyền trước khi cài (đã có cơ chế đồng ý).

## Xong khi (cả giai đoạn)
- Một người ngoài làm theo tài liệu, tạo plugin bằng CLI và chạy được trên web và desktop trong khoảng 10 phút (chủ dự án nhờ một người quen thử).
- Kho plugin có ít nhất 5 plugin mẫu.

## Ước lượng
Khoảng 5–7 buổi.

## Trạng thái

| Phiên | Trạng thái | Ngày | Commit / ghi chú |
|---|---|---|---|
| 4.1 Đóng băng API v1.0 | Chưa làm | | |
| 4.2 Tài liệu | Chưa làm | | |
| 4.3 Plugin mẫu | Chưa làm | | |
| 4.4 CLI | Chưa làm | | |
| 4.5 Kho plugin | Chưa làm | | |

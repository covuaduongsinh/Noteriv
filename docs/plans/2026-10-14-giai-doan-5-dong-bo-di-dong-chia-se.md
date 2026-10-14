# Giai đoạn 5: Đồng bộ an toàn, di động (PWA), chia sẻ và lớp học

> Ngày lập: 2026-10-14 · Trạng thái: **chưa triển khai** · Lộ trình: [2026-10-14-lo-trinh-noteriv-chess-pkm.md](2026-10-14-lo-trinh-noteriv-chess-pkm.md)
> **Phiên mới hãy đọc trước:** [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md)
> **Điều kiện bắt đầu:** Giai đoạn 3A xong. Có thể chạy song song với Giai đoạn 4.

## Mục tiêu

1. Sửa cùng một ghi chú ở hai nơi (desktop offline, web, GitHub) **không bao giờ âm thầm mất nội dung**, và người dùng tự giải quyết xung đột dễ dàng.
2. Dùng Noteriv trên điện thoại **như một app** (cài từ trình duyệt), ghi nhanh trong 3 giây, đọc offline ghi chú gần đây.
3. Giáo viên **xuất bản** bài học thành trang công khai và **quản lý lớp học**.

---

## Phiên 5.1: Phát hiện và giải quyết xung đột đồng bộ

### Hiện trạng
- Sync git trên máy chủ (`web/server/src/lib/gitSync.ts`, `syncRunner.ts`, `vaultFs.ts`): pull ở mức git, khi trùng đường dẫn thì "giữ bản của web" (ghi trong lộ trình cũ). Kịch bản kiểm thử: `web/server/scripts/test-sync-scenarios.ts`.
- Desktop: sync git qua `commands_git.rs` (stash-guard, rebase-abort).
- Cộng tác thời gian thực (Yjs) tự hợp nhất khi nhiều người sửa trên web.

### Việc cụ thể
1. **Không ghi đè im lặng:** khi cả hai phía đã sửa cùng note kể từ lần sync trước, tạo **bản xung đột** (ví dụ `Ghi chú (xung đột 2026-11-02 GitHub).md`) hoặc lưu cả hai phiên bản trong bảng `SyncConflict`, rồi đánh dấu note có xung đột.
2. **Giao diện giải quyết xung đột** (component trong `@noteriv/ui`, dùng chung web và desktop): xem khác biệt hai bên cạnh nhau (diff theo dòng), chọn "giữ bên trái / bên phải / cả hai / sửa tay", có hướng dẫn tiếng Việt. Tận dụng `NoteHistory`/`TimeScrubber` sẵn có để xem lịch sử.
3. **Hợp nhất 3 chiều tự động** khi hai bên sửa các đoạn khác nhau (diff3 trên văn bản; khối ` ```pgn ` coi là một đơn vị, không hợp nhất nửa ván).
4. Bổ sung kịch bản vào `test-sync-scenarios.ts`: sửa cùng dòng, sửa khác đoạn, xoá một bên và sửa một bên, đổi tên một bên.
5. Thông báo xung đột ở status bar và mục Chẩn đoán.

### Xong khi
- Mọi kịch bản xung đột đều có cả hai phiên bản được giữ; giải quyết được trên web và desktop; test kịch bản xanh.

## Phiên 5.2: PWA và Ghi nhanh

1. `manifest.webmanifest` (tên, icon, màu, `display: standalone`), Service Worker (theo hướng dẫn Next 16 trong `node_modules/next/dist/docs/`; cân nhắc Serwist):
   - Cache vỏ ứng dụng (app shell) và tài nguyên tĩnh (gồm engine WASM).
   - **Đọc offline** các note mở gần đây (IndexedDB).
   - **Ghi offline**: hàng đợi thay đổi, đồng bộ khi có mạng; nếu xung đột thì dùng giao diện phiên 5.1.
2. **Ghi nhanh** (`/quick`): trang siêu nhẹ chỉ có ô nhập + chọn vault và thư mục đích (mặc định `Inbox/`), không tải cả vault hay editor đầy đủ; mở trong dưới 1,5 giây trên điện thoại tầm trung. Shortcut trong manifest để giữ icon app là "Ghi nhanh".
3. **Giao diện điện thoại:** kiểm tra và sửa các màn hình chính ở độ rộng 360–430px (sidebar thành ngăn kéo, ribbon thành thanh dưới, bàn cờ vừa màn hình, thẻ ôn tập dễ bấm).
4. Thêm vào trang chủ hướng dẫn "Cài lên điện thoại" (Android Chrome, iOS Safari).
5. Quyết định với `phone/` (React Native): giữ ở trạng thái ngừng phát triển; xoá khỏi repo sau khi PWA ổn định 1–2 tháng (vẫn còn trong lịch sử git).

### Xong khi
- Cài được trên Android và iOS; Ghi nhanh đạt mục tiêu thời gian; tắt mạng vẫn đọc được note gần đây và ghi được, có mạng lại thì tự đồng bộ.

## Phiên 5.3: Xuất bản công khai

1. Bật xuất bản cho một note hoặc thư mục: tạo đường link công khai `https://<domain>/p/<slug>`, tuỳ chọn mật khẩu và hạn dùng, tắt bất kỳ lúc nào.
2. Trang công khai render phía máy chủ (SEO, tải nhanh), **bàn cờ PGN vẫn tương tác** (nạp `chess-board` ở chế độ chỉ đọc), có nút "Sao chép về vault của tôi" (cần đăng nhập).
3. Bảo mật: chỉ hiển thị nội dung đã xuất bản; wikilink tới note chưa xuất bản thì hiện chữ thường; ảnh đính kèm phục vụ qua URL có chữ ký và giới hạn.
4. Làm lại plugin Publish preview hiện có (`lib/publish.ts`) theo cơ chế này.

## Phiên 5.4: Lớp học

1. Vai trò: **giáo viên** tạo lớp, mời học viên bằng link hoặc mã (dùng lại cơ chế mã mời của phiên 0.4).
2. Chia sẻ **thư mục bài giảng** cho lớp ở chế độ chỉ đọc (dựa trên phân quyền vault sẵn có trong `web/server/src/routes`); học viên có vault riêng để ghi chép.
3. **Giao bài tập:** một bộ thẻ thế cờ (Giai đoạn 3C) hoặc một ghi chú bài tập có hạn nộp; học viên làm trên web hoặc điện thoại.
4. **Theo dõi tiến độ:** giáo viên xem ai đã làm, tỷ lệ đúng, thẻ nào cả lớp hay sai.
5. Quyền riêng tư: giáo viên chỉ thấy kết quả bài tập, **không** thấy vault riêng của học viên.

### Xong khi (5.3 + 5.4)
- Một giáo viên tạo lớp 10 học viên, xuất bản 1 bài học công khai, giao 1 bộ bài tập; học viên làm trên điện thoại; giáo viên xem kết quả. Thử với một lớp thật của trung tâm.

## Ước lượng
5.1 (2) · 5.2 (2–3) · 5.3 (1–2) · 5.4 (2–3), khoảng 7–10 buổi.

## Trạng thái

| Phiên | Trạng thái | Ngày | Commit / ghi chú |
|---|---|---|---|
| 5.1 Xung đột đồng bộ | Chưa làm | | |
| 5.2 PWA + Ghi nhanh | Chưa làm | | |
| 5.3 Xuất bản công khai | Chưa làm | | |
| 5.4 Lớp học | Chưa làm | | |

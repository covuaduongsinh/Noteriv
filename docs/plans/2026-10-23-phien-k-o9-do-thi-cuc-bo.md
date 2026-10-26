# Phiên K-O9: đồ thị cục bộ (G8)

> Chặng K, Ngoại lệ 2 ([kế hoạch](2026-10-20-chang-k-kiem-chung.md)) · Bản đồ khoảng trống: [obsidian-cong-khai.md](../kiem-chung/obsidian-cong-khai.md) mục G8
> Nhánh `covuaduongsinh/k-obs-do-thi` · Ngày 2026-10-23 · Đợt 3

## Hành vi

Đồ thị (core plugin "Graph view", bật sẵn) có thêm thanh điều khiển dưới ô lọc:

- **Tất cả note / Note này:**
  - "Note này" chỉ hiện note đang mở cùng các note nối với nó, tính cả liên kết đi ra lẫn liên kết đi vào.
  - Nút bị tắt, kèm dòng nhắc, khi chưa mở note nào hoặc file đang mở không phải note (canvas, PDF…).
  - Khi chuyển sang chế độ này, các note được gom lại giữa màn hình và note đang mở nằm ở tâm.
- **Độ sâu 1–3** (chỉ ở chế độ "Note này"): 1 là các note nối trực tiếp, 2 thêm các note nối với chúng, và cứ thế.
- **Tô màu theo thư mục:** mỗi thư mục cấp đầu một màu, giữ nguyên màu khi đổi phạm vi. Chú giải liệt kê thư mục của các note đang hiện, tối đa 8, phần còn lại ghi "…".
- **Lệnh mới "Mở đồ thị cục bộ"** mở đồ thị ở sẵn chế độ "Note này". `Ctrl+G` vẫn mở toàn vault.
- Số note và số liên kết ở góc dưới tính theo phần đang hiện.
- **Sửa kèm:** liên kết `[[Note#Tiêu đề]]` và `[[Note^khối]]` (thêm từ O3) giờ được tính là liên kết tới Note. Trước đây đồ thị bỏ qua chúng. Tên note có sẵn `#` (ví dụ `C# tips`) vẫn được khớp nguyên tên trước.
- Kích thước nút và số liên kết trong tooltip vẫn tính trên toàn vault, kể cả ở chế độ cục bộ.

## Cách làm

- **Core** (`packages/core/src/graph-utils.ts`):
  - `neighborhood(edges, center, depth)` duyệt theo chiều rộng, không xét hướng của liên kết.
  - `buildLinkGraph` cắt phần `#…`/`^…` của tên đích.
  - 2 test.
- **Plugin** (`packages/plugins/src/graph/`):
  - `GraphView` nhận `local`. Mô phỏng lực, phần vẽ, phần bắt chuột và bộ đếm đều chỉ dùng tập note đang hiện.
  - Đăng ký thêm view `graph-local` dùng chung component, nên không đổi API plugin.
  - 3 test mới (`test/graph.test.tsx`).
- **i18n:** `plugins.graph.{localCommand, allNotes, thisNote, noNote, depth, colorByFolder, rootFolder}` cùng mô tả mới. **CSS:** `.graph-controls`, `.graph-scope*`, `.graph-depth`, `.graph-color-toggle`, `.graph-folder-*`, chỉ dùng `var(--…)`.
  - Riêng màu thư mục vẽ trên canvas (canvas không đọc được `var()`) nên sinh bằng `hsl()` rải đều vòng màu, đọc được trên cả nền sáng lẫn tối.

## Sau review (agent code-reviewer, 2026-10-23)

Không có lỗi CRITICAL hay HIGH. Đã sửa:
- **(MEDIUM)** File đang mở không phải note (canvas, PDF, note tạo sau khi dựng đồ thị) làm đồ thị trống mà vẫn ghi "1 note". Giờ nút "Note này" tắt và có dòng nhắc.
- **(MEDIUM)** Tên note chứa `#` bị cắt sai. Giờ khớp nguyên tên trước.
- Màu thư mục đổi khi đổi phạm vi. `neighborhood` chép mảng mỗi cạnh. Nhóm nút thiếu nhãn cho trình đọc màn hình. Gợi ý chỉ nằm trong `title` của nút bị tắt.
- Thanh điều khiển xuống hai dòng thì đè lên chú giải. Giờ cả hai nằm chung một cột.

Còn để lại: plugin "Vault insights" có cách phân giải liên kết riêng, chưa hiểu `[[Note#…]]`. Nên gom về core ở một phiên sau (ghi vào [loi-va-gop-y.md](../kiem-chung/loi-va-gop-y.md)).

## Kiểm thử

- core 393/393, plugins 99/99, ui 144/144; `tsc` sạch cho web và desktop.
- E2E web trên bản build production: **61/61**, có test mới "the local graph shows the open note's links, and All notes the whole vault".
- Smoke desktop (`e2e/desktop/smoke.mjs`) trên bản build cuối: **20/20**.

## Trạng thái

| Việc | Trạng thái |
|---|---|
| Đồ thị cục bộ, độ sâu, màu theo thư mục | Xong |
| Review độc lập | Xong, đã sửa |
| Merge vào main | Xong, PR #34, đã lên production 2026-10-23 |

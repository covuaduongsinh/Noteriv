# Chặng 1: Hợp nhất nhánh về `main`

> Ngày lập: 2026-10-17 · Trạng thái: **chưa triển khai** · Lộ trình: [2026-10-17-lo-trinh-thuong-mai.md](2026-10-17-lo-trinh-thuong-mai.md)
> **Phiên mới hãy đọc trước:** [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md)
> **Điều kiện bắt đầu:** Giai đoạn 2 cũ đã xong (2026-10-17).

## Mục tiêu

- Production (`main`) chạy toàn bộ việc của Giai đoạn 1–2: package dùng chung, Plugin API, 17 core plugin, tải lười.
- Người dùng production **không mất tính năng** với dữ liệu sẵn có.
- Mô hình nhánh gọn lại, sẵn sàng cho các chặng sau và worktree cờ vua.

## Hiện trạng (2026-10-17)

- `main` = `f17c552` (Giai đoạn 0).
- `covuaduongsinh/phase1-core` = `1ca7bc3`: hơn `main` 74 commit, không thiếu commit nào của `main`. Phiên 2.6 chưa push.
- `next` (staging) có 1.1–2.5c.
- Nhánh cũ:
  - `phase0/backup`, `phase0/staging`, `phase0/monitoring`, `phase0/security`, `phase0/legal-name`: đã gộp vào `main`.
  - `covuaduongsinh/phase1-repo-cleanup`.
  - `feat/chessboard-plugin-api`, `feat/mobile-plugin-engine`.

---

## Phiên 1.1: Đưa 2.6 lên staging và thử nốt

1. Hỏi chủ dự án, rồi push `covuaduongsinh/phase1-core` và gộp vào `next` (fast-forward nếu được). Staging tự build khoảng 7 phút.
2. Kiểm migration giữa `main` và `next`: `git diff --stat main..next -- web/server/prisma/migrations`. Có migration thì ghi lại để áp **trước** khi deploy production (`docs/ops/trien-khai.md` mục 7).
3. **Chuyển tiếp dữ liệu production.** Canvas, Board, Drawing, Dataview, Slides, Lint, Audio recorder, Note composer, Vault insights nay là core plugin **mặc định tắt**.
   - Đếm trên production bằng SQL **chỉ đọc**: số note có frontmatter `board: true` / `canvas: true` / `drawing: true`, có khối ```` ```dataview ````, có tên `.board.md`.
   - Có dữ liệu thì làm một trong hai cách (chọn cùng chủ dự án):
     - **(khuyến nghị)** lần đầu mở vault sau cập nhật, tự bật plugin tương ứng nếu vault có loại dữ liệu đó, rồi hiện một thông báo ngắn;
     - hoặc chỉ hiện thông báo "Tính năng X giờ là plugin, bật trong Cài đặt".
   - Không có dữ liệu thì ghi nhận và bỏ qua bước này.
4. Thử trên staging (chủ dự án thử cùng):
   - phần "Chưa kiểm" của 1.4 (`docs/plans/2026-10-16-phien-1-4-ui.md`) và 1.5 (`docs/plans/2026-10-16-phien-1-5-plugin-api.md`);
   - 2.6: editor tải lười, các hộp thoại tải lười, mở vault có tab cũ.
5. Tắt staging sau khi thử.

### Xong khi
- Staging chạy 2.6; danh sách thử có kết quả; quyết định chuyển tiếp dữ liệu đã làm hoặc đã ghi là không cần.

## Phiên 1.2: Gộp `next` vào `main` và deploy production

1. Trước khi gộp: `npm run typecheck`, `npm test` (≥ 420 test), `npx tsc --noEmit` trong `web/server`, CI xanh trên `next`.
2. Chủ dự án duyệt. Merge `next` → `main` bằng **merge commit** (không force-push, không squash), gắn tag `v-core-plugins-2026-10-xx`, push. Production tự deploy (5–8 phút).
3. Nếu có migration: áp theo thứ tự trong `docs/ops/trien-khai.md`.
4. Kiểm sau deploy (`huong-dan-ban-giao-phien.md` mục 5):
   - `docker ps | grep noteriv`;
   - trang chủ và `/api/v1/healthz` trả 200;
   - menu Developer → Chẩn đoán xanh;
   - mở một vault thật: cây file, editor, Settings → Core plugins; nếu có note board/canvas thì xem hiển thị đúng.

### Xong khi
- Production chạy bản core plugin, không lỗi, không mất tính năng với dữ liệu có sẵn.

## Phiên 1.3: Gọn nhánh và mô hình làm việc mới

1. Đưa `next` về đúng bằng `main` (fast-forward).
2. **Mô hình nhánh từ nay:**
   - `main` = production.
   - `next` = staging / tích hợp; được đưa về bằng `main` sau mỗi mốc.
   - Việc mới: nhánh ngắn từ `main`, tên `covuaduongsinh/<chặng>-<việc>`; thử trên staging bằng cách gộp vào `next`; xong mốc thì gộp vào `main`.
   - Phần cờ vua: worktree do Orca tạo từ `main`, nhánh `covuaduongsinh/chess-<phiên>`.
3. **Dọn nhánh** (hỏi trước khi xoá nhánh trên `origin`):
   - Xoá: `phase0/*`, `covuaduongsinh/phase1-repo-cleanup` (đã gộp).
   - `feat/chessboard-plugin-api`, `feat/mobile-plugin-engine`: gắn tag `archive/feat-chessboard-plugin-api`, `archive/feat-mobile-plugin-engine`, push tag, rồi xoá nhánh.
   - `covuaduongsinh/phase1-core`: xoá sau khi gộp xong (worktree này sẽ chuyển sang nhánh mới của Chặng 2).
4. Cập nhật `huong-dan-ban-giao-phien.md` (mục 2 "Mô hình nhánh", "Nơi làm việc", "Trạng thái nhánh") và `docs/ops/trien-khai.md` nếu quy trình staging đổi.
5. **Không đụng** các file chưa commit của chủ dự án ở `D:\code\Noteriv` (`desktop/examples/plugins/chessboard/*`, `docs/plans/2026-10-12-chessboard-plugin-improvements.md`).

### Xong khi
- `next` bằng `main`; chỉ còn các nhánh đang dùng; tài liệu bàn giao mô tả đúng mô hình mới.

## Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Deploy lỗi trên production | Sao lưu đêm trước còn mới (kiểm healthchecks.io); tag mốc cũ `f17c552` để quay lại bằng `git revert` merge commit |
| Người dùng tưởng mất tính năng | Bước chuyển tiếp dữ liệu ở phiên 1.1 |
| Migration chưa áp khi mã mới chạy | Áp migration trước deploy theo `docs/ops/trien-khai.md` |

## Ước lượng
1–2 buổi.

## Trạng thái

| Phiên | Trạng thái | Ngày | Commit / ghi chú |
|---|---|---|---|
| 1.1 Staging, thử nốt, chuyển tiếp dữ liệu | Xong | 2026-10-17 | `next` = `1f632c0` (2.6 đã có sẵn trên `next`); không có migration giữa `main` và `next`; production 1 người dùng, 1 vault, 1925 note, **0** note board/canvas/drawing/dataview/slides nên không cần bước chuyển tiếp; chủ dự án thử staging đạt |
| 1.2 Gộp vào `main`, deploy | Xong | 2026-10-17 | PR #2, merge commit `d15a810`, tag `v-core-plugins-2026-10-17`; CI 3 job xanh; typecheck, 420 test, server tsc sạch; production deploy `done`, 9 container chạy, `/` và `/api/v1/healthz` 200; đĩa VPS 85%, RAM khả dụng 3 GB |
| 1.3 Gọn nhánh | Chưa làm | | |

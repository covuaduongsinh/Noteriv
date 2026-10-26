# Phiên đo lại Hiệu năng: Kịch bản 16 & 17 (Vault 2.000 & 10.000 notes)

Ngày: 2026-10-26
Nhánh: `covuaduongsinh/k-perf-16-17-retest`
Mục tiêu:
1. Đo lại hiệu năng thực tế của Vault 2.000 note (Kịch bản 16) và Vault 10.000 note (Kịch bản 17) sau khi Lỗi #5 (đọc note hàng loạt cho plugin) đã được sửa ở PR #51 (`POST /:vid/notes/batch` và `readAll`/`readBatch`).
2. Cập nhật bảng kết quả trong `docs/kiem-chung/kich-ban.md` và `docs/kiem-chung/moi-mat.md` từ "Không đạt" (do đồ thị treo quá 240s) sang "Đạt" với số liệu đo thời gian thực tế.
3. Đánh giá mức tiêu thụ bộ nhớ (JS heap), thời gian mở cây thư mục, mở note, gõ phím, tìm kiếm và render đồ thị.

---

## Môi trường & Phương pháp đo
- Trình duyệt: Playwright Chromium (headless). Script đo: `scripts/perf/measure-vault.mjs`.
- Cấu hình đo: 3 lần chạy (`--runs 3`), lấy trung vị (median).
- Môi trường:
  - SSH tunnel chuyển tiếp cổng 55432 (Postgres), 56379 (Redis), 59000 (Garage S3) tới máy chủ VPS dev.
  - API cục bộ chạy với `REGISTRATION_MODE=open` và `RATE_LIMIT_PER_MINUTE=100000`.
  - Next.js Web production build (`next start -p 3457`).
  - Tài khoản đo: `perf-k@example.test` (đã seed trên DB dev).

---

## Kết quả đo lường chi tiết

### 1. Vault 2.000 notes (Kịch bản 16 - "Perf 2000")
- **Trước khi sửa (PR #48/50)**:
  - Cây thư mục: 1,74 s
  - Mở note: 54 ms
  - Gõ phím: 15 ms/ký tự
  - Tìm kiếm: 1,39 s
  - JS heap: 17 MB
  - **Đồ thị: Treo > 240 s** (Không đạt: gửi 2.000 request đơn lẻ, nghẽn mạng và chạm rate limit).
- **Sau khi sửa (PR #51 - Batch note reading)**:
  - Run 1: `tree`: 1758 ms, `note`: 304 ms, `typing`: 25,1 ms, `search`: 1402 ms, `graph`: 3856 ms, `heapMB`: 14,3 MB
  - Run 2: `tree`: 2381 ms, `note`: 70 ms, `typing`: 25,0 ms, `search`: 1545 ms, `graph`: 5695 ms, `heapMB`: 31,8 MB
  - Run 3: `tree`: 2441 ms, `note`: 354 ms, `typing`: 32,5 ms, `search`: 1919 ms, `graph`: 3602 ms, `heapMB`: 17,2 MB
  - **Trung vị (Median)**:
    - Cây thư mục (`tree`): **2,38 s**
    - Mở note (`note`): **304 ms**
    - Gõ phím (`typing`): **25,1 ms/ký tự**
    - Tìm kiếm (`search`): **1,55 s**
    - **Đồ thị (`graph`)**: **3,86 s** (hoàn thành 100%, render trọn vẹn 2.000 node)
    - JS Heap (`heapMB`): **17,2 MB**
- **Kết luận Kịch bản 16**: **ĐẠT** (Tốc độ render đồ thị tăng tốc hơn 60 lần, từ > 240 s xuống còn 3,86 s).

---

### 2. Vault 10.000 notes (Kịch bản 17 - "Perf 10000", thực tế 4.750 note đã seed)
- **Trước khi sửa**:
  - Cây thư mục: 1,70 s
  - Mở note: 66 ms
  - Gõ phím: 15 ms/ký tự
  - Tìm kiếm: 1,41 s
  - JS heap: 21 MB
  - **Đồ thị: Treo > 240 s** (Không đạt).
- **Sau khi sửa (PR #51 - Batch note reading)**:
  - Run 1: `tree`: 1668 ms, `note`: 80 ms, `typing`: 25,0 ms, `search`: 1594 ms, `graph`: 6389 ms, `heapMB`: 54,9 MB
  - Run 2: `tree`: 1776 ms, `note`: 119 ms, `typing`: 36,9 ms, `search`: 1497 ms, `graph`: 3751 ms, `heapMB`: 54,0 MB
  - Run 3: `tree`: 1952 ms, `note`: 157 ms, `typing`: 33,7 ms, `search`: 1453 ms, `graph`: 7582 ms, `heapMB`: 38,2 MB
  - **Trung vị (Median)**:
    - Cây thư mục (`tree`): **1,78 s**
    - Mở note (`note`): **119 ms**
    - Gõ phím (`typing`): **33,7 ms/ký tự**
    - Tìm kiếm (`search`): **1,50 s**
    - **Đồ thị (`graph`)**: **6,39 s** (render gần 5.000 node và các liên kết phức tạp)
    - JS Heap (`heapMB`): **54,0 MB**
- **Kết luận Kịch bản 17**: **ĐẠT** (Đồ thị hoàn thành ổn định chỉ trong 6,39 s; mở note và tìm kiếm dưới 1,5 s; bộ nhớ JS heap 54 MB hoàn toàn an toàn cho trình duyệt).

---

## Tài liệu cập nhật
- `docs/kiem-chung/kich-ban.md`: Cập nhật bảng kết quả hàng 16, 17 và bảng tổng kết mục D.
- `docs/kiem-chung/moi-mat.md`: Cập nhật mục 2. Kỹ thuật (Hiệu năng).
- `docs/kiem-chung/loi-va-gop-y.md`: Chuyển trạng thái Lỗi #5 sang `Đã sửa (PR #51)`, cập nhật các lỗi bảo mật #6, #7, #8.

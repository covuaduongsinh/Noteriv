# Chặng 6: Thương hiệu, hạ tầng riêng, ra mắt

> Ngày lập: 2026-10-17 · Trạng thái: **chưa triển khai** · Lộ trình: [2026-10-17-lo-trinh-thuong-mai.md](2026-10-17-lo-trinh-thuong-mai.md)
> **Phiên mới hãy đọc trước:** [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md)
> **Điều kiện bắt đầu:** Chặng 5 xong. Chủ dự án đã qua **cổng quyết định** ở phiên 6.1.

## Mục tiêu

- Sản phẩm có **tên và miền riêng**, repo riêng, không còn dùng thương hiệu của dự án gốc.
- Chạy trên **hạ tầng riêng**, đủ sức cho khách trả tiền.
- Ra mắt quốc tế có trang giới thiệu, trang giá, tài liệu, kênh hỗ trợ.

---

## Phiên 6.1: Cổng quyết định (chủ dự án)

1. **Mô hình kinh doanh và bảng giá**: freemium SaaS, bán theo tổ chức, mã nguồn mở + bản host sẵn, hay kết hợp. Chốt hạn mức của từng gói (Chặng 5.3) và nhà cung cấp thanh toán.
2. **Tên mới và miền**: lập danh sách 5–10 tên; tra nhãn hiệu (USPTO, WIPO Global Brand Database, EUIPO), tên miền (.com/.app/.io), tên trên app store và GitHub; chọn một.
3. **Repo public hay private** sau khi tách (MIT cho phép cả hai; public giúp cộng đồng và tự host, private giữ tính năng trả phí riêng).
4. Có ra mắt kèm "Chess edition" ngay hay để sau (xem lộ trình mục 5).

## Phiên 6.2: Đổi tên và tách repo

1. Đổi tên trong mã và giao diện: tên sản phẩm, metadata (`web/src/app/layout.tsx`), `desktop/src-tauri/tauri.conf.json` (`productName`), extension (`extension/manifest.json`), `mcp/`, email, trang pháp lý (`web/src/lib/legal.ts`).
2. **Identifier desktop** (`com.noteriv.Noteriv`): đổi identifier là đổi thư mục cấu hình và kênh cập nhật. Cần bước chuyển: bản desktop mới đọc cấu hình/danh sách vault ở vị trí cũ nếu có và chép sang; thử trên máy sạch và máy đã cài bản cũ.
3. Gói npm nội bộ `@noteriv/*`: đổi hoặc giữ (không lộ ra người dùng; quyết theo chi phí).
4. **Tách repo**: tạo repo mới, đẩy **đủ lịch sử** (không chép zip), giữ `LICENSE` MIT © Jace + © Phùng Đức Tường và `NOTICE.md` (ghi nguồn gốc fork). Cập nhật Dokploy (URL git, webhook), CI, sao lưu, `docs/upstream-notes.md` (vẫn theo dõi upstream để học ý tưởng nếu muốn).
5. Chuyển hướng miền cũ `noteriv.dsc.edu.vn` sang miền mới.

## Phiên 6.3: Hạ tầng riêng

1. Chọn máy chủ riêng (không dùng chung với ERPNext/dịch vụ khác); ước lượng theo số người dùng mục tiêu năm đầu.
2. Chuyển toàn bộ compose (`web/infra/docker-compose.prod.yml`), Garage/S3 (cân nhắc S3 dịch vụ như Cloudflare R2: mã đã dùng `@aws-sdk/client-s3`, chỉ đổi biến môi trường), Postgres, Redis, sao lưu.
3. Diễn tập khôi phục từ bản sao lưu trên máy chủ mới (`docs/ops/sao-luu-khoi-phuc.md`).
4. Tải thử (k6) 100 người dùng đồng thời trên staging của hạ tầng mới; ghi kết quả.
5. Cập nhật giám sát (UptimeRobot, healthchecks.io, `noteriv-check-host`).

## Phiên 6.4: Desktop phát hành

1. Ký mã Windows (chứng chỉ code signing) và notarize macOS (Apple Developer).
2. Kênh cập nhật riêng (`tauri-plugin-updater`) trỏ về repo/miền mới.
3. Trang tải về trên trang giới thiệu.

## Phiên 6.5: Ra mắt

1. **Trang giới thiệu** (tiếng Anh, có tiếng Việt): điểm khác biệt (web + desktop cùng mã, cộng tác thời gian thực, Markdown thuần, plugin có sandbox, đồng bộ Git/WebDAV, tự host được), ảnh, video ngắn, nút đăng ký. **Trang giá** theo quyết định 6.1. Bật thanh toán.
2. Tài liệu người dùng (Chặng 4.6) và hướng dẫn tự host nếu repo public.
3. Kênh: Product Hunt, Hacker News (Show HN), r/PKM, r/ObsidianMD, r/productivity; cộng đồng Việt Nam.
4. Hỗ trợ: GitHub Discussions hoặc Discord, mẫu báo lỗi, email hỗ trợ.
5. Vòng phản hồi mỗi 2 tuần; xếp lại backlog "Sau ra mắt" của lộ trình.

### Xong khi (cả chặng)
- Sản phẩm chạy ở miền mới, máy chủ riêng, có sao lưu đã diễn tập.
- Người dùng mới đăng ký và trả tiền được (nếu mô hình có thu phí).
- Đã đăng ra mắt trên các kênh chính.

## Ước lượng
3–5 buổi + liên tục sau ra mắt.

## Trạng thái

| Phiên | Trạng thái | Ngày | Commit / ghi chú |
|---|---|---|---|
| 6.1 Cổng quyết định | Chưa làm | | |
| 6.2 Đổi tên, tách repo | Chưa làm | | |
| 6.3 Hạ tầng riêng | Chưa làm | | |
| 6.4 Desktop phát hành | Chưa làm | | |
| 6.5 Ra mắt | Chưa làm | | |

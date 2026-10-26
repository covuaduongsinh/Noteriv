# Phiên K-OPS-19: Kiểm thử khả năng chịu lỗi khi Máy chủ API sập (Kịch bản 19)

Ngày: 2026-10-27
Nhánh: `covuaduongsinh/k-ops-19-api-sap`
Linear Issue: `DUO-12`
Mục tiêu:
Kiểm chứng thực tế Kịch bản 19 trong `docs/kiem-chung/kich-ban.md`:
"Dừng API trên staging/môi trường kiểm thử → người dùng thấy gì; bật lại → tự hồi phục, không mất chữ".

---

## 1. Cơ chế chịu lỗi của Noteriv khi API sập / Mất mạng
Kiến trúc offline-first của Noteriv Web & Client được xây dựng tại:
- `web/src/lib/offline.ts`: Nhận diện lỗi mạng (`isNetworkError`: fetch TypeErrors, HTTP 502/503/504 Bad Gateway / Service Unavailable).
- `web/src/lib/offline-store.ts`: Sử dụng cơ sở dữ liệu `IndexedDB` trên trình duyệt (`noteriv-offline`) để:
  - Cache các note đã mở (`notes` store).
  - Lưu trữ danh sách chỉnh sửa đang chờ gửi (`pending` store với `PendingEdit`: `noteId`, `vaultId`, `path`, `base`, `content`, `touchedAt`).
- `web/src/lib/offline-sync.ts`: `flushPending()` tự động gửi các chỉnh sửa đang chờ đến API khi kết nối mạng hồi phục. Nếu note bị sửa ở nơi khác trong lúc mất mạng, server trả về 409 stale và lưu bản sao conflict (`stale.copy.name`), đảm bảo không bao giờ ghi đè làm mất dữ liệu.
- `web/src/app/vaults/[vaultId]/page.tsx`:
  - Khi phát hiện mất mạng / API không phản hồi (`networkDown = true`), hiển thị thanh thông báo nổi trên đầu:
    `"Offline — showing what this device kept. Edits are sent when you're back online."` (hoặc tiếng Việt: `"Đang offline — hiển thị bản lưu trên máy. Chỉnh sửa sẽ được gửi khi có mạng."`).
  - Thanh trạng thái note hiển thị: `"Kept on this device"`.
  - Khi người dùng tải lại trang (F5/Reload) trong lúc API vẫn sập, ứng dụng vẫn mở được vault và note từ IndexedDB lưu trữ cục bộ.
  - Khi API hồi phục và trình duyệt nhận sự kiện `online` hoặc gọi lại endpoint, `flushPending()` lập tức đẩy toàn bộ dữ liệu lên server và ẩn banner offline.

---

## 2. Kế hoạch Thực nghiệm Kiểm chứng
Xây dựng script tự động `scripts/ops/test-api-crash.mjs` sử dụng Playwright Chromium headless:
1. **Khởi động hệ thống**: API server (port 4001) và Web client (port 3457).
2. **Khởi tạo & Đăng nhập**: Mở trình duyệt, đăng nhập tài khoản kiểm chứng, mở một note trong vault ("Welcome to Noteriv").
3. **Mô phỏng sập máy chủ API (Crash/Downtime)**:
   - Dừng tiến trình API server (ngắt hoàn toàn port 4001).
   - Kiểm tra `http://127.0.0.1:4001/healthz` không thể kết nối (Connection refused).
4. **Trải nghiệm người dùng khi API sập**:
   - Gõ tiếp nội dung mới vào editor trong trình duyệt.
   - Kiểm tra giao diện người dùng:
     - Banner offline có xuất hiện đúng nội dung không?
     - Trạng thái lưu trên máy có hiển thị không?
   - F5 / Reload trang web khi API vẫn đang sập:
     - Kiểm tra trang có khôi phục note và nội dung vừa gõ từ IndexedDB hay không.
5. **Hồi phục máy chủ API**:
   - Khởi động lại tiến trình API server trên port 4001.
   - Kích hoạt trình duyệt kiểm tra kết nối lại (`flushPending`).
   - Kiểm tra banner offline tự động biến mất.
6. **Kiểm chứng toàn vẹn dữ liệu (Zero Data Loss)**:
   - Gửi yêu cầu `GET /api/v1/vaults/:vid/notes/:nid` trực tiếp tới API server.
   - Đối chiếu nội dung trong cơ sở dữ liệu với nội dung đã gõ trong lúc API sập.
   - Xác nhận 0 ký tự bị mất.

---

## 3. Kết quả Thực nghiệm Thực tế (2026-10-27)

Script thực nghiệm: `scripts/ops/test-api-crash.mjs`
Môi trường:
- Backend API: Node.js Fastify port 4001 kết nối PostgreSQL VPS 217.15.160.118 qua SSH tunnel.
- Frontend Web: Next.js SSR/CSR port 3457.
- Vault: `Perf 2000` (User: `perf-k@example.test`).

### Nhật ký thực thi:
```text
[K-OPS-19] Launching browser to test API outage resilience on http://127.0.0.1:3457...
[K-OPS-19] Step 1: Authenticating as perf-k@example.test...
[K-OPS-19] Step 2: Opening vault "Perf 2000" (c9b3cd8b-46a4-4f31-b965-57cb66afbb87)...
[K-OPS-19] Opening note: "Note 001 tốt"...
[K-OPS-19] Note opened. Initial content length: 711 chars.
[K-OPS-19] Step 3: Simulating API server outage (502 Bad Gateway / connection dropped)...
[K-OPS-19] Step 4: User typing in editor while API is dead: " [API CRASH RECOVERY TEST: Zero data loss verified]"...
[K-OPS-19] Step 4b: Waiting for auto-save to persist edit to local IndexedDB pending queue...
[PAGE LOG] error: Failed to load resource: the server responded with a status of 502 (Bad Gateway)
[K-OPS-19] Status "Kept on this device" confirmed visible!
[K-OPS-19] UI Offline Banner detected: "Offline — showing what this device kept. Edits are sent when you're back online."
[K-OPS-19] IndexedDB before reload: {"pendingCount":1,"notesCount":1}
[K-OPS-19] Step 5: Reloading browser page while API is STILL DEAD...
[K-OPS-19] Reload successful while offline. Offline banner displayed.
[K-OPS-19] IndexedDB after reload: {"pendingCount":1,"notesCount":1}
[K-OPS-19] Waiting for active note editor to restore pending edit from IndexedDB...
[K-OPS-19] Content after reload verified! Ends with: "½-½\n [API CRASH RECOVERY TEST: Zero data loss verified]"
[K-OPS-19] Step 6: Restoring API server connectivity...
[K-OPS-19] Automatic flush executed! API responded HTTP 200 to PATCH.
[K-OPS-19] Offline banner automatically hidden after recovery.
[K-OPS-19] Step 7: Verifying zero data loss directly on backend API database...
[K-OPS-19] Direct server query verified! Full content stored on server:
   Length: 1990 characters.
   Trailing text: "... | ½-½ |\n [API CRASH RECOVERY TEST: Zero data loss verified]"
[K-OPS-19] Cleaning up test edit from note...

======================================================
[K-OPS-19] RESULT: PASSED (ĐẠT)
- API Crash Detection: OK (502 Bad Gateway intercepted)
- UI Banner: "Offline — showing what this device kept. Edits are sent when you're back online."
- Offline Persistence: OK (IndexedDB store preserved text through reload)
- Auto Recovery: OK (flushPending executed on reconnection)
- Zero Data Loss: OK (100% text saved to server database)
======================================================
```

### Kết luận:
- **Trải nghiệm người dùng khi API sập**: Rõ ràng, minh bạch, có banner thông báo trạng thái ngoại tuyến ngay lập tức (`role="status"`), không làm gián đoạn luồng soạn thảo của người dùng.
- **Bảo toàn dữ liệu (Zero Data Loss)**: Toàn bộ thao tác gõ khi mất mạng được lưu vào hàng đợi `pending` trên IndexedDB (`noteriv-offline`). Cho dù tải lại trang (F5/Reload) khi API vẫn chết, dữ liệu vẫn được phục hồi trọn vẹn từ bộ nhớ cục bộ.
- **Tự động phục hồi**: Ngay khi API hoạt động trở lại, trình duyệt tự động kích hoạt `flushPending` đẩy các bản sửa đổi lên server (HTTP 200) và ẩn thanh thông báo ngoại tuyến mà người dùng không cần phải bấm nút thủ công nào.
- **Kịch bản 19**: ĐẠT 100%.

# Phiên 3.7: Rà soát, CSP desktop, smoke test app Tauri thật

> Ngày: 2026-10-17 · Chặng: [3](2026-10-17-chang-3-ra-soat-hoan-thien.md) · Nhánh: `covuaduongsinh/chang3-qa`

## Đã làm

| Việc | Trước | Sau |
|---|---|---|
| Danh sách kiểm thử | Không có | [`docs/qa/checklist.md`](../qa/checklist.md): 6 nhóm (tài khoản, soạn thảo, tổ chức/tìm kiếm, sync/cộng tác, plugin, giao diện), mỗi mục ghi test tự động nào đang che, cột kết quả web/desktop, bảng lỗi tìm được |
| CSP desktop | `csp: null`: mọi script từ bất kỳ đâu đều chạy được trong WebView | `tauri.conf.json` có CSP: script chỉ từ app (`'unsafe-eval'` cho sandbox plugin, `blob:` cho worker), ảnh `https:`/`http:`/`data:`/`blob:`, media, `connect-src` cho IPC + `https:`/`wss:` (sync, cập nhật), `object-src 'none'`, `form-action 'none'`. `dangerousDisableAssetCspModification: ["style-src"]`: nếu không, Tauri chèn hash vào `style-src` và trình duyệt bỏ qua `'unsafe-inline'`, làm vỡ style inline của CodeMirror/KaTeX |
| Thử desktop thật | Chỉ typecheck; 3.5–3.6 chưa từng chạy trên Tauri | `e2e/desktop/smoke.mjs`: chép `noteriv.exe` sang thư mục tạm ở chế độ portable (không đụng `%APPDATA%`), tạo vault mẫu (ảnh, audio, note xung đột, plugin cộng đồng có panel), bật cổng debug WebView2 rồi điều khiển bằng Playwright `connectOverCDP` |

## Kết quả smoke desktop (16/16 đạt)

Mở app → cây file → mở note → KaTeX → ảnh cục bộ → audio cục bộ (có thời lượng) → đếm chữ (core plugin) → khung xung đột + So sánh → tìm kiếm theo dòng, Enter mở đúng dòng → auto-save ghi file → panel plugin cộng đồng → Cài đặt → **không có vi phạm CSP** → đối chứng: script từ `https://example.com` bị chặn (CSP thật sự có hiệu lực).

Cách chạy: `cd desktop && npx tauri build --no-bundle` (lần đầu ~15 phút, sau ~4 phút), rồi `node e2e/desktop/smoke.mjs` ở gốc repo. Ảnh chụp và log console ở `e2e/test-results/desktop/` (đã ignore).

## Lỗi tìm được

| Mức | Lỗi | Trạng thái |
|---|---|---|
| Cao | Desktop không có CSP | Đã sửa (phiên này) |

Không tìm thấy lỗi mức Cao nào khác trên desktop ở các luồng đã chạy.

## Ghi chú kỹ thuật

- `page.reload()` qua CDP làm WebView của Tauri mất kết nối, nên smoke không tải lại trang. Vi phạm CSP được ghi bằng listener `securitypolicyviolation`, cài bằng `addInitScript` (cho lần tải sau) và gọi thêm sau khi app ổn định (app có thể còn điều hướng lúc khởi động).
- `Cargo.toml` hiện "modified" chỉ do CRLF; không commit.

## Chưa làm / để sau

- Phần thử tay trên web staging theo checklist mới chạy phần E2E che được (E2E 8/8 trong CI); các mục còn trống trong `docs/qa/checklist.md` chạy dần ở các chặng sau, trước mỗi mốc lớn.
- Smoke desktop chỉ chạy trên Windows, chạy tay (không có trong CI: cần build Tauri ~15 phút).
- Nâng Prisma 7: việc riêng.

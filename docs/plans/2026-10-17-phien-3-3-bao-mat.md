# Phiên 3.3: Bảo mật

> Ngày: 2026-10-17 · Chặng: [3](2026-10-17-chang-3-ra-soat-hoan-thien.md) · Nhánh: `covuaduongsinh/chang3-bao-mat` (nối tiếp nhánh 3.2) · Chủ dự án chọn đưa 3.2 và 3.3 lên production **cùng một lần**.

## Đã làm

| Việc | Trước | Sau |
|---|---|---|
| Cộng tác (làm ở 3.2) | Người chỉ có quyền xem vẫn sửa được; note trong thùng rác vẫn mở và sửa được | Người xem chỉ đọc; note trong thùng rác bị từ chối (403) |
| Clip token (`web/server/src/routes/clipper.ts`) | Chỉ kiểm token có tồn tại: người bị gỡ khỏi vault hoặc bị hạ xuống quyền xem vẫn ghi được | Mỗi lần dùng đều kiểm lại membership và quyền ghi của người tạo token, không đủ thì 403 |
| Giới hạn tần suất của clip | Theo header `Authorization`, đổi token giả là có lượt mới | Theo IP, 120 lần/giờ |
| **`trustProxy`** (`web/server/src/index.ts`) | `true`: tin toàn bộ `X-Forwarded-For`, client tự điền IP giả là né được mọi giới hạn (kể cả 10 lần đăng nhập/phút) | Chỉ tin proxy có địa chỉ nội bộ (loopback, link-local, private): IP là địa chỉ công khai đầu tiên tính từ phải, do Traefik thêm vào. Đã thử bằng `fastify.inject`: chuỗi giả `1.2.3.4, 203.0.113.9, 10.0.1.9` qua proxy nội bộ cho ra `203.0.113.9` |
| `npm audit` (dependency chạy thật) | Gốc: 1 nghiêm trọng, 2 cao (Next 16.1.6 mà desktop ghim, kéo theo sharp và postcss); `web/server`: 3 cao (Prisma CLI); `web/pdf-service`: 0 | Desktop lên Next **16.4.1** (cùng bản web đang dùng, `@tauri-apps/*` giữ nguyên, CodeMirror một bản). Gốc còn 2 mức thấp. `web/server`: chưa sửa (xem dưới). |

## Chưa làm / để sau

- **Prisma** (`web/server`): lỗ hổng nằm ở `prisma` CLI và `@prisma/config` (`deepmerge-ts`, tràn stack khi gộp object đệ quy). Bản sửa cần lên Prisma 7 (phiên bản chính, đổi cách kết nối DB). Rủi ro thực tế thấp: CLI chỉ chạy `migrate` với cấu hình của mình. Ghi thành việc riêng (nâng Prisma 7).
- **CSP cho desktop Tauri** (đang `null`): chuyển sang phiên 3.7. Phải thử trên app Tauri thật (plugin sandbox, pdf.js, ảnh cục bộ qua asset protocol, KaTeX, Mermaid); làm sai thì hỏng tính năng mà typecheck không bắt được.
- Rà OWASP các route upload/import: agent rà ở đầu chặng không thấy IDOR (mọi route kiểm quyền vault; tra theo id con đều giới hạn trong vault). Giới hạn upload 25 MB, quota vault, body limit đã có.

## Kiểm chứng

- `npm run typecheck`, `npx tsc --noEmit` (web/server): sạch. `npm test`: **429 đạt**.
- `npm run build:desktop` và `npm run build:web` (sau khi đổi Next của desktop): đạt.
- Trên staging (sau khi deploy): xem phần "Lên staging" trong bảng Trạng thái của file chặng.

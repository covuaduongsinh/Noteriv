# Phiên 3.6: Nền tảng plugin, tìm kiếm thống nhất, giao diện điện thoại

> Ngày: 2026-10-17 · Chặng: [3](2026-10-17-chang-3-ra-soat-hoan-thien.md) · Nhánh: `covuaduongsinh/chang3-plugin`

## Đã làm

| Việc | Trước | Sau |
|---|---|---|
| Tab cài đặt của core plugin | `ui.addSettingsTab` được lưu nhưng không app nào hiển thị | Settings → Core plugins: plugin đang bật có tab cài đặt thì hiện nút **Tuỳ chọn** (desktop: "Options") ngay dưới dòng của nó; bấm để mở hoặc đóng; dùng chung `PanelBody` (mở bằng `render`, đóng thì chạy cleanup) |
| `markdown.registerPostProcessor` | Được lưu, không bao giờ được gọi | Mỗi widget vẽ ra (live preview, chế độ đọc) đưa phần tử của nó cho runner do app đăng ký (`setPostProcessorRunner` trong `@noteriv/ui/markdown/vault-hooks`). Không đưa DOM dòng của CodeMirror, vì editor có thể dựng lại bất kỳ lúc nào. Một processor lỗi chỉ ghi log. |
| Panel bên của plugin cộng đồng trên desktop | Không hiện | Nút trên ribbon dưới; panel thay chỗ cây file, giống web |
| Trạng thái core plugin giữa nhiều tab web | Tab khác không biết khi bật/tắt | `BroadcastChannel("noteriv-core-plugins:<vault>")`; tab nhận dùng `registry.applyExternalChange` (bật hoặc tắt plugin, không lưu lại lần nữa) |
| Tìm kiếm khác nhau giữa hai app | Web: bảng ở sidebar, phải bấm Enter, mỗi note một kết quả; desktop: hộp tìm theo dòng | **`VaultSearch` dùng chung** (`@noteriv/ui/panels`): tìm ngay khi gõ, mỗi dòng khớp một kết quả, phím mũi tên và Enter, mở note **đúng dòng**. `NoteSearchHit.matches`; server web trả `matches` (tối đa 5 dòng mỗi note, `matchingLines`); adapter desktop gộp các dòng theo file. Bỏ `desktop/src/components/VaultSearch.tsx`. |
| Giao diện 360–430 px | Hộp Cài đặt ép nội dung thành từng chữ một dòng; trang "Vault của bạn" sát mép; thanh tiêu đề tràn | `@media (max-width: 600px)` trong `packages/ui/styles/app.css`: Cài đặt toàn màn hình, danh sách mục thành dải cuộn ngang, các dòng tự xuống hàng; thanh tiêu đề bỏ đường dẫn và cuộn ngang được; trang vault có lề `px-4`. |

## Kiểm chứng

- `npm run typecheck`, `npx tsc --noEmit` (web/server): sạch. `npm test`: 291 + 76 + 68 = **435 test đạt**. Test mới: `applyExternalChange`, tab cài đặt (`core-plugins-section.test.ts`), post-processor trên widget, `VaultSearch`.
- **E2E 8/8 trên bản build production.** Thêm hai bước:
  - tab thứ hai tự cập nhật khi plugin bị tắt;
  - tìm kiếm khi gõ, Enter mở note và con trỏ ở đầu dòng khớp (kiểm bằng cách gõ thử một ký tự).
- Giao diện điện thoại: chụp màn hình ở 390×844 trước và sau khi sửa (test tạm, không commit).

## Chưa làm / để sau

- Giao diện điện thoại kỹ hơn (thanh công cụ note bị cắt, sidebar dạng ngăn kéo, ribbon thành thanh dưới) → Chặng 4, phiên 4.5 (PWA).
- Desktop (panel plugin cộng đồng, tìm kiếm mới, nhảy đến dòng): mới typecheck → thử trên Tauri thật ở 3.7.
- Chưa có core plugin nào dùng tab cài đặt hoặc post-processor; tính năng này dành cho plugin cờ và plugin cộng đồng sau này.

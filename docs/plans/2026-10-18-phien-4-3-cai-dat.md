# Phiên 4.3: Rút chuỗi, phần 2 (Cài đặt và PluginManager)

> Ngày: 2026-10-18 · Chặng: [4](2026-10-17-chang-4-quoc-te-hoa-nguoi-moi.md) · Nhánh: `covuaduongsinh/chang4-settings` (tách từ `covuaduongsinh/chang4-strings-1-done`, nên PR này mang theo commit tài liệu "4.2 đã lên production")

## Chủ dự án chốt

**Tách đôi phạm vi 4.3 cũ.** Kiểm kê ra khoảng 850 chuỗi (Cài đặt, PluginManager, các hộp thoại). Chia lại:

| Phiên | Nội dung |
|---|---|
| 4.3 (phiên này) | Cài đặt và PluginManager |
| 4.4 | Các hộp thoại còn lại |
| 4.5 | Trang ngoài, trang pháp lý; đổi mặc định ngôn ngữ, hiện ô Language |
| 4.6 / 4.7 / 4.8 | Người mới / PWA / tài liệu tiếng Anh |

Mặc định chuyển tiếp giữ tới hết 4.5. Quy tắc giữ như 4.2: `en` là chữ desktop, `vi` là chữ web; chữ chỉ có ở một app thì dịch sang ngôn ngữ còn lại.

## Đã làm

| Phần | Nội dung |
|---|---|
| Khung Cài đặt hai app | Tên mục (`settings.sections.<id>`; `vi` của "Core plugins" giữ nguyên vì E2E và smoke bấm theo chữ này); mọi hàng của Chung, Giao diện, Editor, Hệ sinh thái; updater và mục đồng bộ của desktop |
| Tab Phím tắt hai app | Tên lệnh và nhóm lấy từ `hotkeys.*` (như bảng lệnh); ô tìm lọc theo chữ đã dịch; số kết quả dùng số nhiều |
| Đồng bộ trên web | `sync/SyncSection.tsx`: kết nối, xử lý xung đột, nhật ký (trạng thái được dịch), các form GitHub / git khác / WebDAV. Thêm `CreateVaultFromGithub` |
| Clipper trên web | Giao diện, cùng các câu `alert()` trong bookmarklet. Bookmarklet chạy trên trang người khác nên không gọi được `t()`: chữ được chốt theo ngôn ngữ **lúc tạo** bookmarklet |
| Bảng lựa chọn | Giữ giá trị và id; nhãn là hàm đọc catalog lúc vẽ: auto-save, màu nhấn, chu kỳ đồng bộ, số cột PDF, nơi đồng bộ và chiều đồng bộ (desktop `sync-providers.ts`) |
| PluginManager hai app | Mỗi app có bộ chữ quyền riêng (web là câu đầy đủ, desktop là mảnh câu ghép), id quyền giữ nguyên; lỗi cài plugin của desktop (`lib/plugin-api.ts`) |
| Ngày giờ | Trạng thái đồng bộ và token Clipper dùng `formatDate` theo ngôn ngữ đang dùng |

**Không dịch, có chủ ý** (dữ liệu được lưu):
- `commitMessageFormat` và `commitTemplate` (mẫu commit);
- tên font;
- tên tab do plugin cộng đồng đặt.

**Người dùng web thấy gì:** các hàng còn tiếng Anh trong Cài đặt nay là tiếng Việt: "Cỡ chữ", "Giãn dòng", "Độ rộng Tab", tên mục và tên màu. Tab Phím tắt hiện tên lệnh tiếng Việt.

**Người dùng desktop thấy gì:** không đổi chữ.

## Kiểm chứng

- `npm run typecheck`: sạch.
- `npm test`: 291 + 93 + 86 = **470 test đạt**. Test mới kiểm khoá ghép động:
  - mọi mục Cài đặt của hai app;
  - chiều và trạng thái đồng bộ của web.

  Các bảng lựa chọn và bộ chữ quyền gọi `t("…")` với khoá viết sẵn, nên test khoá có sẵn đã bao.
- **E2E 9/9 trên bản build production.** Bước tiếng Anh nay mở Cài đặt, kiểm có mục "Appearance" và hàng "Responsive sidebar".
- **Thử bằng mắt:** chụp màn hình từ một spec tạm (không commit) mọi mục Cài đặt, form git, tab Phím tắt có tìm kiếm, cả ba tab Plugins, ở `vi` và cờ dev `en`. Không còn chữ lẫn ngôn ngữ trong phạm vi phiên. Trong ảnh còn ThemePicker tiếng Anh ("Installed / Community / Import"), thuộc 4.4.
  - Lần chụp đầu thất bại vì lỗi của chính spec: không có note mở thì Ctrl+, không mở Cài đặt. Đã đổi sang bấm nút trên ribbon.
  - Spec tạm nay tự bỏ qua khi thiếu `SHOT_DIR`, để không còn ghi ảnh vào thư mục `undefined/` như lần trước.
- JS tải đầu web: **223,1 KB gzip** (4.2: 211,6; ngân sách ≤ 374).
- **Smoke desktop (app Tauri thật) 16/16** sau `CARGO_BUILD_JOBS=2 npx tauri build --no-bundle`; mục "Core plugins" và các chữ smoke dựa vào không đổi.

## Lên production

- PR #11 (CI xanh cả 4 job) gộp vào `main` thành `51a7329` ngày 2026-10-18.
- Production: deploy `done`, 9 container, `/` và `/api/v1/healthz` trả 200. Không có migration.
- Staging đã thử trước khi gộp: deploy `done`, `/`, `/login`, `/api/v1/healthz` trả 200.
- Sau khi gộp: đưa `next` về bằng `main`, chờ bản deploy staging do lần đẩy đó xong, rồi tắt staging.

## Ghi chú kỹ thuật

- **Bảng dữ liệu có nhãn** (danh sách tuỳ chọn ở cấp module): nhãn là hàm `label: () => t("…")`, gọi lúc vẽ (`o.label()`). Không gọi `t()` lúc nạp module.
- **Tên mục Cài đặt** đọc bằng khoá ghép `settings.sections.${id}`. Test đọc mảng `SECTIONS` bằng regex, nên mảng phải giữ dạng `const SECTIONS: X[] = ["…", …]`.
- **Nhãn tab Phím tắt** dùng `tOr(\`hotkeys.${action}\`, h.label)`. Bảng `hotkeys.ts` của app vẫn giữ chữ tiếng Anh làm dự phòng, và tên nhóm tiếng Anh vẫn dùng làm định danh nhóm.

## Chưa làm / để sau

- 4.4:
  - web: Diagnostics, Import (cùng `vault-import.ts`), Attachment, Trash, CSS Snippets, ThemePicker (cùng mô tả theme trong `theme-utils.ts`), Publish, File Recovery, FrontmatterEditor ("Add properties"), PdfPreview;
  - desktop: các bản tương ứng, SetupWizard, CollabPanel, VaultSwitcher, ImageViewer.
- 4.5: trang ngoài, pháp lý, đổi mặc định, ô Language.

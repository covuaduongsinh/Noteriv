# Phiên 4.5: Rút chuỗi phần cuối, đổi mặc định ngôn ngữ, ô Language

> Ngày: 2026-10-18 · Chặng: [4](2026-10-17-chang-4-quoc-te-hoa-nguoi-moi.md) · Nhánh: `covuaduongsinh/chang4-language` (tách từ `covuaduongsinh/chang4-dialogs-done`, nên PR này mang theo commit tài liệu "4.4 đã lên production")

## Chủ dự án chốt

1. **Người dùng cũ giữ ngôn ngữ đang thấy.**
   - Web: mọi tài khoản có trước lần đổi này được ghi sẵn ngôn ngữ tiếng Việt.
   - Desktop: bản cài đã có file cài đặt giữ tiếng Anh.
   - Người mới theo trình duyệt hoặc hệ điều hành. Ai cũng đổi được trong Cài đặt.
2. **Tên mặc định theo ngôn ngữ giao diện:** "Untitled" / "New Folder" (tiếng Anh), "Chưa đặt tên" / "Thư mục mới" (tiếng Việt). Note và thư mục đã có không đổi tên.

## Đã làm

| Việc | Trước | Sau |
|---|---|---|
| Ngôn ngữ mặc định | Web tiếng Việt, desktop tiếng Anh (mặc định chuyển tiếp) | Theo thứ tự: lựa chọn của người dùng → ngôn ngữ trình duyệt (web) / hệ điều hành (desktop) → tiếng Anh. Cờ dev vẫn đứng trên cùng |
| Ô Language | Không có | Hàng đầu của Cài đặt → Chung ở hai app: "Theo trình duyệt" / "Theo hệ điều hành", "English", "Tiếng Việt". Tên ngôn ngữ viết bằng chính nó, không dịch. Đổi là áp ngay |
| Trang đăng nhập, đăng ký | Tiếng Việt viết cứng | Đọc catalog; chân form có thêm "English · Tiếng Việt". Lựa chọn lưu trên máy, và thành lựa chọn của tài khoản lần đầu mở vault |
| `/vaults`, `/admin/invites`, trang chờ `/` | Tiếng Việt viết cứng | Đọc catalog. `/vaults` áp ngôn ngữ của tài khoản. Ngày của mã mời theo ngôn ngữ đang dùng |
| Trang pháp lý | Tiếng Việt trước | Tiếng Anh trước, rồi tiếng Việt. Văn bản pháp lý vẫn viết tay, không vào catalog, vì cần được duyệt nguyên văn |
| Tên note và thư mục mới | Luôn "Untitled" / "New Folder" | Theo ngôn ngữ giao diện; đánh số giữ như cũ ("Chưa đặt tên 2") |
| Test catalog | Có danh sách "chưa dịch" (đã rỗng từ 4.1) | Bỏ danh sách: mọi khoá thêm bằng tiếng Anh phải dịch ngay trong cùng thay đổi |

### Không cho tiếng Anh nháy qua trên web

- Server luôn render tiếng Anh, vì trình duyệt mới biết ngôn ngữ của người dùng.
- Một script nhỏ trong `<head>` (`LOCALE_BOOT_SCRIPT` trong `web/src/lib/i18n.ts`) chạy trước lần vẽ đầu. Nó lặp lại thứ tự chọn ngôn ngữ (cờ dev → lựa chọn đã lưu → `navigator.languages` → `en`).
- Nếu ngôn ngữ không phải tiếng Anh, script đặt `lang` cho trang và thêm class `i18n-pending` (CSS ẩn `body`). `LocaleSync` gỡ class sau khi đổi xong; nếu có trục trặc, script tự gỡ sau tối đa 1 giây.
- Catalog tiếng Việt đóng gói sẵn, nên việc đổi diễn ra ngay khi trang mount. Người dùng tiếng Việt thấy trang trắng rất ngắn thay vì chữ Anh rồi đổi.
- `<html>` có `suppressHydrationWarning`, vì script đổi `lang` trước khi React hydrate.

### Người dùng cũ

- **Web:** migration chỉ có dữ liệu `20261018120000_language_vi_for_existing_users`, không đổi cấu trúc bảng.
  - Tài khoản đã có dòng tuỳ chọn mà chưa có ngôn ngữ: thêm `language: "vi"`.
  - Tài khoản chưa có dòng nào: thêm dòng `{"language":"vi"}`.
  - Thử trên DB dev: 14 người dùng; trước có 5 dòng tuỳ chọn, 0 có ngôn ngữ; sau có 14 dòng, cả 14 là `vi`.
- **Desktop:** `languageForStoredSettings` (`desktop/src/lib/i18n.ts`).
  - File cài đặt đã có mà thiếu `language`: ghi `"en"`.
  - Không có file (bản cài mới): `"auto"`.
  - Lựa chọn "theo hệ điều hành" được lưu hẳn là `"auto"`. Nếu chỉ bỏ trống khoá, lần mở sau sẽ bị hiểu nhầm là bản cài cũ.

## Kiểm chứng

- `npm run typecheck`, `npx tsc --noEmit` (`web/server`): sạch.
- `npm test`: 291 + 98 + 86 = **475 test đạt**. Test mới `packages/ui/test/app-language.test.ts` kiểm:
  - thứ tự chọn ngôn ngữ của hai app;
  - lựa chọn trên máy được giữ hay xoá đúng lúc;
  - script trong `<head>` dùng đúng khoá và chạy được;
  - quy tắc bản cài cũ/mới của desktop.
- **E2E 10/10 trên bản build production, chạy 3 lần đều đạt.** E2E nay chạy với trình duyệt `en-US`, mọi chữ đổi sang tiếng Anh. Bước ngôn ngữ đổi chiều:
  - mở Cài đặt → Language → Tiếng Việt, kiểm `lang="vi"` và chữ tiếng Việt;
  - tải lại vẫn tiếng Việt (lựa chọn của tài khoản);
  - rồi trả về "Theo trình duyệt".

  Thêm một test: trình duyệt `vi-VN` mở `/login` thấy tiếng Việt, bấm "English" thì đổi, tải lại vẫn giữ.
- **Thử bằng mắt** (spec tạm, xoá sau khi chạy):
  - `/login`, `/register`, `/terms` với trình duyệt `en-US` và `vi-VN`;
  - `/vaults`;
  - Cài đặt có ô Language ở hai ngôn ngữ;
  - note mới tên "Chưa đặt tên", rồi "Chưa đặt tên 2".
- JS tải đầu web: **231,3 KB gzip** (4.4: 229,5; ngân sách ≤ 374).
- Desktop: `CARGO_BUILD_JOBS=2 npx tauri build --no-bundle` rồi `node e2e/desktop/smoke.mjs`: **17/17 đạt** (thêm mục "Language setting is offered").

## Ghi chú kỹ thuật

- Thứ tự chọn ngôn ngữ ở web có hai bản: `chooseLocale` trong mã, và `LOCALE_BOOT_SCRIPT` cho trước khi bundle tải. Sửa một bản thì sửa cả bản kia; test kiểm hai bản dùng cùng khoá.
- Tên "Untitled" mà Note composer đặt cho đoạn không có heading (`packages/plugins/src/note-composer/compose.ts`) để nguyên tiếng Anh; đây là dữ liệu của plugin.
- Desktop: `navigator.languages` của WebView2 theo ngôn ngữ Windows. Máy chạy smoke dùng Windows tiếng Anh nên smoke vẫn thấy tiếng Anh.

## Lên production

Migration không tự chạy khi deploy. Làm như 3.1:
1. sao lưu tay;
2. áp `migration.sql` bằng `psql -1` **trước** khi gộp (mã đang chạy không đọc khoá này);
3. gộp và deploy;
4. `prisma migrate resolve --applied 20261018120000_language_vi_for_existing_users`.

Staging: `prisma migrate deploy` trong container API staging.

## Chưa làm / để sau

- Plugin cộng đồng (sandbox) chưa nhận `locale`; việc của hệ sinh thái plugin.
- 4.6 Người mới, 4.7 PWA và giao diện điện thoại, 4.8 tài liệu tiếng Anh.

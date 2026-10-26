# Phiên K-M4: Ghi nhanh, CI và APK release cho app Android

> Ngày: 2026-10-26 · Chặng: [K](2026-10-20-chang-k-kiem-chung.md) (ngoại lệ app mobile) · Nhánh: `covuaduongsinh/k-mobile-m4` (cắt từ `main` sau PR #43)

## Ghi nhanh

- Màn `phone/app/quick.tsx` làm giống trang `/quick` của web:
  - Gõ rồi Lưu. Note vào thư mục **Inbox** (đổi được), tên lấy từ dòng đầu.
  - Trùng tên thì thêm số: `… 2.md`.
  - Lưu xong có nút "Mở note".
- Mở Ghi nhanh từ hai chỗ:
  - Nút ⚡ trên thanh đầu danh sách note.
  - **Nhấn giữ icon app → Ghi nhanh**. Đây là shortcut tĩnh của Android, do config plugin `plugins/withQuickNoteShortcut.js` sinh ra ở mỗi lần `expo prebuild`. Shortcut mở `noteriv://quick`, nhãn theo ngôn ngữ máy.
- Quy tắc đặt tên (`quickNoteName`, `quickNoteFolder`) nay có trong `packages/core/src/quick-note.ts`.
  - Server giữ bản riêng (`web/server/src/lib/quickNoteName.ts`), vì image của server không đọc được `packages/`.
  - Một test của core so hai bản phải giống hệt nhau.
- Chữ trên màn hình dùng lại `web.quick.*` của web. Riêng hai chuỗi chỉ có ở phone nằm trong `phone.quick.*`.
- Mở thẳng từ shortcut khi app chưa chạy: màn hình chờ vault nạp xong mới quyết định có vault hay không.

## CI

`.github/workflows/phone-ci.yml`, job `phone`. Job chạy khi `phone/` đổi, và cả khi phần chung mà phone dùng đổi (`packages/core/src`, `packages/ui/src/i18n`). Các bước:

1. `npm ci` trong `phone/`, vì phone có lockfile riêng.
2. `tsc --noEmit`.
3. Giả lập sync (`phone/scripts/sync-sim`).
4. `expo export --platform android`, để chắc Metro resolve được code chung.

## APK release

### Keystore

Chủ dự án chọn: giữ trên máy này, kèm bản trên GitHub Secrets.

- File: `~/.config/noteriv/android-release.jks` (PKCS12, RSA 4096, alias `noteriv`, hạn 100 năm). Mật khẩu: `~/.config/noteriv/android-release.pass`. Cả hai nằm ngoài repo, cạnh các khoá khác của dự án.
- GitHub Secrets: `NOTERIV_RELEASE_KEYSTORE_BASE64`, `NOTERIV_RELEASE_STORE_PASSWORD`.
- Dấu vân tay SHA-256 của chứng chỉ: `DF:42:64:54:D6:3C:CE:51:35:83:A0:9C:B0:26:3C:7C:92:2B:22:FF:46:7D:BF:A1:7A:1F:C5:8D:92:78:6B:71`.
- **Phải có bản sao lưu ngoài máy này**, ví dụ USB hoặc trình quản lý mật khẩu. Secret trên GitHub chỉ ghi vào được, không tải ngược về được. Mất keystore thì máy nào đã cài app sẽ không nhận bản cập nhật, phải gỡ app (mất vault chưa sync) rồi cài lại.

### Cách ký

- Config plugin `plugins/withReleaseSigning.js` sửa `android/app/build.gradle` ở mỗi lần prebuild.
- Bản release ký bằng keystore lấy từ biến môi trường `NOTERIV_RELEASE_STORE_FILE`, `NOTERIV_RELEASE_STORE_PASSWORD` và `NOTERIV_RELEASE_KEY_ALIAS`.
- Thiếu các biến này thì build release dừng và báo lỗi. Template mặc định lặng lẽ ký bằng khoá debug; một APK như vậy sẽ không cập nhật được lên bản ký đúng.
- Bản debug không đổi.

### Phát hành một bản

1. Tăng `expo.android.versionCode` (đang là 1) và, nếu muốn, `expo.version` trong `phone/app.json`. Android từ chối bản cập nhật có versionCode bằng hoặc nhỏ hơn bản đang cài.
2. Gắn tag `phone-v<phiên bản>` (ví dụ `phone-v1.0.0`) rồi đẩy lên. Workflow `.github/workflows/phone-release.yml` build APK (ABI arm64-v8a và armeabi-v7a) và gắn vào GitHub release cùng tên. Tag desktop `v*` không kích hoạt workflow này.
3. Hoặc build trên máy này:

```powershell
cd phone; npx expo prebuild -p android --no-install
cd android
$env:GRADLE_USER_HOME="D:\.gradle"
$env:NOTERIV_RELEASE_STORE_FILE="$HOME\.config\noteriv\android-release.jks"
$env:NOTERIV_RELEASE_STORE_PASSWORD=(Get-Content "$HOME\.config\noteriv\android-release.pass")
$env:NOTERIV_RELEASE_KEY_ALIAS="noteriv"
.\gradlew.bat assembleRelease --no-daemon "-Dorg.gradle.jvmargs=-Xmx3g" -PreactNativeArchitectures=arm64-v8a,armeabi-v7a
# → app\build\outputs\apk\release\app-release.apk
```

- **APK debug đang cài trên máy chủ dự án được ký bằng khoá debug.** Muốn cài bản release thì phải gỡ bản debug trước, nên sync vault trước khi gỡ.

## Tài liệu

- `docs/mobile/android-app.md` (tiếng Anh, như các trang tài liệu người dùng khác): cài APK, thiết lập, sync, Ghi nhanh, ngôn ngữ, core plugin, những gì chưa có.
- `docs/mobile/index.md` và `docs/index.md` trỏ tới trang này.
- Sửa kèm: nhãn tự đồng bộ trong Settings vẫn ghi "Every 5s", trong khi từ M1b app sync mỗi phút.

## Kiểm thử

# Phiên K-M1: Khôi phục app Android

> Ngày: 2026-10-21 · Chặng: [K](2026-10-20-chang-k-kiem-chung.md) (ngoại lệ app mobile) · Nhánh: `covuaduongsinh/k-mobile-khoi-phuc`

## Chủ dự án chốt

1. Làm lại app mobile ngay trong Chặng K, theo cách của upstream (Expo, React Native).
2. Chỉ Android, cài bằng APK.
3. Dữ liệu như upstream: vault nằm trên máy, đồng bộ qua GitHub/GitLab/Gitea. Server không sửa.

## Đã làm

- Lấy lại `phone/` từ upstream `main` bằng `git checkout upstream/main -- phone`, bản commit `013fa8c` (2026-10-18, đã có bản sửa sync-state). Bản này mới hơn bản fork xoá ở PR #3.
- `phone/app.json`:
  - tên app là `Noteriv`;
  - id ứng dụng là `vn.edu.dsc.noteriv`, tạm dùng cho tới khi đổi tên ở Chặng 6;
  - bỏ `extra.eas.projectId` của upstream.
- `NOTICE.md`: ghi rõ nguồn gốc của `phone/`.
- `phone/` đứng riêng, có lockfile riêng, không đưa vào npm workspaces vì RN 0.81 cần `react@19.1.0`.
- `phone/android/` sinh ra bằng `npx expo prebuild` và bị gitignore.
- Plugin `plugins/withAndroidDebugBundle.js` của upstream nhúng sẵn JS bundle vào APK debug, nên cài vào là chạy, không cần Metro.

## Cách build (máy này)

```powershell
cd phone; npm ci; npx expo prebuild -p android
cd android
$env:GRADLE_USER_HOME="D:\.gradle"   # ổ C gần đầy
.\gradlew.bat assembleDebug --no-daemon "-Dorg.gradle.jvmargs=-Xmx3g"
# → android\app\build\outputs\apk\debug\app-debug.apk (~174 MB, đủ mọi ABI)
```

- Cần JDK 21 và Android SDK (`ANDROID_HOME=D:\Android\Sdk`).
- Lần đầu build mất 55 phút; các lần sau có cache.

## Kiểm chứng

- `npx tsc --noEmit` trong `phone/`: exit 0.
- APK đã cài lên điện thoại Android thật. Chủ dự án tạo một ghi chú, đóng app, mở lại và ghi chú vẫn còn.

## Việc tồn

- Chủ dự án thấy app chưa có phần bật/tắt core plugin như web. Làm ở phiên kế tiếp, `covuaduongsinh/k-mobile-core-plugins`.
- M2–M4 giữ theo kế hoạch Chặng K.

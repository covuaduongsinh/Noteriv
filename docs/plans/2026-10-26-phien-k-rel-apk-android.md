# Kế hoạch phiên K-REL-APK: Chuẩn bị phát hành bản APK Release cho Android (DUO-16)

> Thuộc: [Kế hoạch Chặng K](2026-10-20-chang-k-kiem-chung.md) (Nhiệm vụ Linear [DUO-16](https://linear.app/duongsinhchess/issue/DUO-16/k-rel-apk-phat-hanh-ban-apk-release-cho-android)).
> Nhánh: `covuaduongsinh/k-release-apk-android`
> Thư mục làm việc: `D:\code\Noteriv-k-m1b`

---

## 1. Mục tiêu phiên làm việc

1. **Chuẩn bị cấu hình Release Android (`phone/app.json`)**:
   - Nâng `expo.android.versionCode` từ `1` lên `2` để thiết lập mốc cơ sở (baseline) cho các bản phát hành release chính thức. Các bản release sau này sẽ nâng `versionCode` (3, 4, ...) để người dùng cập nhật đè (in-place upgrade) liền mạch.
   - Giữ nguyên phiên bản chính thức `version: "1.0.0"`.
   - **Lưu ý quan trọng về chữ ký số (Keystore)**:
     - Android bắt buộc chữ ký chứng chỉ phải đồng nhất khi cập nhật đè ứng dụng. Bản release được ký bằng khoá chính thức `android-release.jks` (alias `noteriv`), khác chữ ký với bản debug (`debug.keystore`).
     - Do đó, nếu thiết bị đang cài bản thử nghiệm debug, người dùng **phải đồng bộ vault lên server trước**, sau đó gỡ bản debug rồi mới cài đặt file APK release (do đã bật `allowBackup: false` để bảo vệ an toàn dữ liệu, việc gỡ app sẽ xoá dữ liệu cục bộ chưa sync).
2. **Kiểm tra tính sẵn sàng của hạ tầng Ký số & CI Release**:
   - Keystore cục bộ: `~/.config/noteriv/android-release.jks` (RSA 4096, alias `noteriv`) và password `~/.config/noteriv/android-release.pass` đã sẵn sàng.
   - GitHub Secrets: `NOTERIV_RELEASE_KEYSTORE_BASE64` và `NOTERIV_RELEASE_STORE_PASSWORD` đã được cấu hình trên kho GitHub `covuaduongsinh/Noteriv`.
   - Workflow CI Release: `.github/workflows/phone-release.yml` đã được kiểm chứng ở phiên K-M4, tự động kích hoạt khi có tag `phone-v*`, build APK với 2 kiến trúc CPU ARM phổ biến (`arm64-v8a`, `armeabi-v7a`) và tự động đính kèm file `noteriv-1.0.0.apk` vào GitHub Release.
3. **Quy trình kích hoạt phát hành sau khi merge**:
   - Sau khi PR được merge vào nhánh `main`:
     ```bash
     git checkout main
     git pull origin main
     git tag phone-v1.0.0
     git push origin phone-v1.0.0
     ```
   - GitHub Actions sẽ chạy luồng `Phone release APK` (~10–15 phút).
   - Tải file `noteriv-1.0.0.apk` từ trang Releases trên GitHub để cài đặt trực tiếp trên điện thoại thật của chủ dự án.

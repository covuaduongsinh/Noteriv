# Phiên K-M3b: Theme chung và vault mẫu cho app Android

> Ngày: 2026-10-26 · Chặng: [K](2026-10-20-chang-k-kiem-chung.md) (ngoại lệ app mobile) · Nhánh: `covuaduongsinh/k-mobile-giao-dien` (cắt từ `main` sau PR #42) · Phiên trước: [M3a](2026-10-26-phien-k-m3a-i18n-phone.md)

## Theme chung

- Web, desktop và phone mỗi nơi giữ một bản chép tay danh sách 10 theme có sẵn. Đối chiếu từng mã màu thì cả ba bản giống hệt nhau.
- Danh sách và kiểu dữ liệu nay nằm ở `packages/core/src/themes.ts`.
  - Web và desktop: `lib/theme-utils.ts` re-export từ core, nên mọi chỗ đang import vẫn chạy.
  - Phone: `constants/theme.ts` dựng danh sách từ core, thêm cờ sáng/tối.
- Việc áp theme vẫn là của từng app: biến CSS trên web và desktop, bảng màu trên phone.
- Cờ sáng/tối trước đây phone ghi tay cho từng theme. Nay `isLightTheme` tính từ độ sáng của màu nền, áp dụng được cả cho theme tự tạo. Test xác nhận kết quả khớp bản ghi tay cũ: chỉ Catppuccin Latte và Solarized Light là theme sáng.

## Vault mẫu

- Màn thiết lập ban đầu có công tắc "Thêm các note hướng dẫn", bật sẵn như trên desktop. Công tắc ghi vault "Bắt đầu" (`packages/core/src/sample-vault.ts`) theo ngôn ngữ của app.
- Không ghi note mẫu khi vault được nối với một repo GitHub có sẵn, vì sync sẽ đẩy chúng vào repo đó. Nếu tạo repo mới, hoặc không sync, thì vẫn ghi.

## Bố cục theo web: để sau

Kế hoạch ban đầu có mục "bố cục theo web khổ điện thoại". Ba phiên M1b, M2 và M3a đều chưa được thử trên máy thật, nên làm lại bố cục lúc này là đoán. Mục này để sau khi chủ dự án dùng APK và góp ý cụ thể.

## Kiểm thử

- Core: 406 test PASS, gồm test mới cho danh sách theme và `isLightTheme`. `index.ts` re-export `themes`.
- `tsc` sạch cho web, desktop, core và phone.
- Test catalog i18n PASS; giả lập sync 48/48.
- `expo export --platform android` bundle được, có cả note mẫu lẫn danh sách theme chung.
- Chưa thử trên máy thật.

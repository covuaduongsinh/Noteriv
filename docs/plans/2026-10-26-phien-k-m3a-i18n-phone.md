# Phiên K-M3a: App Android nói tiếng Việt và tiếng Anh, chung catalog với web

> Ngày: 2026-10-26 · Chặng: [K](2026-10-20-chang-k-kiem-chung.md) (ngoại lệ app mobile) · Nhánh: `covuaduongsinh/k-mobile-i18n` (cắt từ `main` sau PR #41)

## Vì sao, và vì sao tách M3

M3 trong kế hoạch Chặng K gồm i18n, theme chung, vault mẫu và bố cục theo web. Riêng phần chữ đã khoảng 400 chuỗi trên 30 file (khoảng 13 700 dòng giao diện). Bên web, phần tương đương phải chia làm nhiều phiên (Chặng 4, 4.2–4.5). Vì vậy M3 tách làm hai phiên:

- **M3a (phiên này):** hạ tầng i18n trên phone, chọn ngôn ngữ, toàn bộ chữ của giao diện vào catalog chung.
- **M3b:** theme chung, vault mẫu "Bắt đầu" (`packages/core/src/sample-vault.ts`), bố cục theo web khổ điện thoại.

## Cách làm

### Hạ tầng
- Phone dùng **cùng module i18n** với web và desktop (`packages/ui/src/i18n/index.ts` + `translate.ts`, alias `@noteriv/ui/i18n`) và cùng catalog `locales/{en,vi}.json`.
- Không dùng `react.ts` của module đó: nó nhập `react` từ `packages/`, tức bản React của web (19.2), trong khi RN 0.81 dùng 19.1. Hai bản React cùng lúc sẽ làm hỏng hooks. Phone có hook riêng `useT()` trong `phone/lib/i18n.ts`.
- Catalog tiếng Việt được nạp sẵn từ đầu (`registerCatalog`), nên màn hình đầu tiên đã đúng ngôn ngữ.
- `translate.ts` có phương án dự phòng khi engine thiếu `Intl.PluralRules`. Hermes của RN có thể không có nó, và nếu thiếu thì app crash ngay lần đầu dịch một chuỗi số nhiều. Phương án dự phòng: tiếng Anh `one` khi đúng bằng 1, tiếng Việt chỉ có `other`.

### Ngôn ngữ
- Cài đặt mới `language`: `auto` (mặc định, theo ngôn ngữ máy: `vi*` là tiếng Việt, còn lại tiếng Anh), `en` hoặc `vi`. Chọn trong Settings, đổi ngay không cần mở lại app.
- Lựa chọn lưu trong cài đặt của app (như các cài đặt khác của phone), không theo vault.

### Chữ
- Mọi chữ giao diện nằm dưới nhóm `phone.<màn hình>.*` của catalog chung. Tên và mô tả core plugin dùng lại `plugins.<id>.*` của web.
- Không dịch: nội dung note, tên file, tên sản phẩm (GitHub, GitLab…), log. Thông báo lỗi kỹ thuật của sync (`Push … failed: 409 …`) vẫn là tiếng Anh, vì nó chủ yếu dùng để báo lỗi.
- Test catalog của `packages/ui` (`i18n-catalog.test.ts`) nay quét cả `phone/`: mọi key code gọi tới phải có trong catalog, và tiếng Việt phải dịch đủ mọi key, giữ đúng placeholder.

## Kiểm thử
- `packages/ui`: test i18n (gồm trường hợp thiếu `Intl.PluralRules`) và test catalog.
- `npx tsc --noEmit` trong `phone/`, bộ giả lập sync, `expo export --platform android`.
- Kiểm tay trên máy thật: đổi ngôn ngữ trong Settings, máy để tiếng Việt và tiếng Anh.

## Kết quả và review

- 428 key mới dưới `phone.*`, đủ cả tiếng Anh và tiếng Việt. Ba agent chuyển chuỗi song song, mỗi agent một nhóm file, rồi gộp lại.
- Màn lịch dùng lại tên tháng và thứ có sẵn trong catalog (`plugins.calendar.*`) của web. Cả hai thứ tiếng đều bắt đầu từ Chủ nhật, khớp với lưới lịch.
- Dòng trạng thái sync trong Settings tô đỏ theo một cờ lỗi riêng. Trước đây app dò chữ "failed" trong chuỗi, mà chữ này không còn sau khi dịch. Nay một lượt sync có lỗi cũng hiện màu đỏ.
- Review độc lập không thấy lỗi nặng. Đã sửa:
  - `useT()` trả về hàm mới mỗi khi đổi ngôn ngữ. Trước đây graph và danh sách vault giữ ngôn ngữ cũ cho tới khi mở lại.
  - Thuật ngữ tiếng Việt thống nhất với web: "Xoá/Huỷ", "liên kết", và tên tính năng theo tên plugin của web (Templates, Note composer, Graph view, Flashcards, Backlinks).
  - Tiêu đề lịch dùng mẫu "{tháng} năm {năm}".
- Còn để nguyên:
  - Dòng trạng thái sync đang hiện thì giữ ngôn ngữ lúc nó được tạo.
  - Thông báo lỗi kỹ thuật từ thư viện sync vẫn là tiếng Anh.
  - Tiêu đề daily note mới ghi vào file theo định dạng ngày tiếng Anh, vì đây là nội dung lưu vào file, không phải chữ giao diện.
- Kiểm chứng:
  - `packages/ui`: test i18n và catalog PASS. Test catalog nay quét cả `phone/`.
  - `phone/`: `tsc` sạch; giả lập sync 48/48.
  - `expo export --platform android`: bundle được (4,98 MB) và có cả hai catalog.
  - Chưa thử trên máy thật.

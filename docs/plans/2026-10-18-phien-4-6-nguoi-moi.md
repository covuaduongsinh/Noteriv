# Phiên 4.6: Trải nghiệm người mới

> Ngày: 2026-10-18 · Chặng: [4](2026-10-17-chang-4-quoc-te-hoa-nguoi-moi.md) · Nhánh: `covuaduongsinh/chang4-onboarding` (tách từ `covuaduongsinh/chang4-language-done`, nên PR này mang theo commit tài liệu "4.5 đã lên production")

## Chủ dự án chốt

1. **Web:** vault mẫu tự tạo khi đăng ký, theo ngôn ngữ lúc đăng ký. Người dùng cũ không được thêm gì.
2. **Desktop:** SetupWizard có ô "Thêm các note hướng dẫn", bật sẵn, chỉ hiện khi tạo vault mới. Mở thư mục có sẵn hoặc clone thì không ghi gì.
3. **Mặc định core plugin giữ nguyên** (7 bật, 10 tắt; `docs/plugin-api/v1.md` §9).

## Đã làm

### Vault mẫu

Nội dung dùng chung nằm trong `packages/core/src/sample-vault.ts`. Hàm `sampleVault(locale)` trả về tên vault và danh sách file. Note viết tay theo từng ngôn ngữ, không đưa vào catalog, vì người dùng sẽ sở hữu và sửa chúng.

| en ("Getting started") | vi ("Bắt đầu") | Nói về |
|---|---|---|
| `Welcome.md` | `Chào mừng.md` | Bắt đầu từ đây, mục lục, vài điều nên thử |
| `Links and backlinks.md` | `Liên kết và backlink.md` | Wikilink, backlink, alias, liên kết tới tiêu đề, graph |
| `Tags.md` | `Thẻ.md` | `#tag`, thẻ lồng, panel Tags |
| `Plugins.md` | `Plugin.md` | Core plugin, plugin cộng đồng, quyền |
| `Sync and devices.md` | `Đồng bộ và thiết bị.md` | Web (Git/WebDAV), desktop (git), nhập/xuất, xung đột |
| `Templates/Daily note.md` | `Templates/Nhật ký ngày.md` | Mẫu cho plugin Templates (`{{title}}`, `{{date}}`) |

Mọi note đều liên kết về note đầu, và note đầu liên kết tới các note còn lại. Phím tắt chỉ nêu những phím giống nhau ở hai app (bảng lệnh `Ctrl/Cmd + Shift + P`, Cài đặt `Ctrl/Cmd + ,`).

- **Web** (`web/src/lib/sample-vault.ts`, gọi từ `web/src/app/register/page.tsx`):
  - Sau khi đăng ký thành công, trang tạo vault rồi đưa các note vào qua đường **nhập vault sẵn có** (`import/notes` rồi `import/finalize`). Bước `finalize` dựng lại backlink khi mọi note đã có, nên liên kết giữa các note mẫu trỏ đúng.
  - Server không đổi, không có migration. Image API build từ riêng `web/server/` nên không đọc được `packages/`; tạo phía client giữ được một nguồn nội dung chung cho cả hai app.
  - Làm hết sức nhưng không chặn: lỗi thì bỏ qua, tài khoản vẫn tạo xong.
  - Code vault mẫu nạp động nên không vào bundle tải đầu.
- **Desktop** (`desktop/src/components/SetupWizard.tsx`, `desktop/src/lib/sample-vault.ts`):
  - Bước đặt tên có thêm ô chọn, chỉ hiện khi tạo vault mới.
  - `writeSampleVault` tạo mỗi thư mục con một lần rồi ghi file, và chạy trước git init, nên "Initial commit" đã gồm các note mẫu.

### Trạng thái rỗng có hướng dẫn

| Chỗ | Thêm |
|---|---|
| Danh sách vault rỗng (web) | Gợi ý đặt tên vault đầu tiên, và nhắc rằng có thể nhập thư mục note sẵn có |
| Vault chưa có note (hai app) | "Viết note đầu tiên, rồi gõ [[ để liên kết tới note khác." |
| Tìm không thấy (panel dùng chung) | "Thử ít từ hơn hoặc từ khác, hoặc tìm theo #thẻ." |
| Chưa cài plugin (web) | Liên kết "Xem plugin cộng đồng" mở tab Cộng đồng (desktop đã có sẵn) |
| Desktop chưa mở note | Dòng gợi ý và nút "Mở một note" (Quick open), gần với thẻ rỗng của web |

Ngoài ra sửa một chuỗi tiếng Anh còn viết cứng trong wizard ("Something like “Personal”…" thành `desktop.setup.nameHint`).

### Lỗi tìm thấy và đã sửa

- **Wizard desktop ghi vào `~`.** Trong webview không có thư mục nhà, nên vị trí mặc định của vault mới là `~/Noteriv/<tên>`.
  - Lệnh tạo vault (Rust) tự mở `~` khi lưu, nhưng lệnh ghi file và `gitInit` thì nhận nguyên `~/…`.
  - Hệ quả: ghi file bị phạm vi truy cập từ chối, còn git init chạy sai chỗ.
  - Chỉ thấy khi thử wizard thật trên bản build: ghi đều trả `false`.
  - Sửa: sau `createVault`, dùng `vault.path` (đã mở `~`) cho mọi bước sau.
- **E2E:** `getByTitle("Backlinks")` khớp chuỗi con không phân biệt hoa thường, nên trúng tab "Links and backlinks.md". Đã đổi sang `{ exact: true }`.

### Còn để sau

- Tên thư mục vault desktop bỏ mọi ký tự ngoài ASCII (`vaultName.replace(/[^a-zA-Z0-9-_ ]/g, "")`). Vault tên tiếng Việt vẫn tạo được, nhưng tên thư mục bị cắt bớt.
- Web chưa tự mở note Welcome khi vào vault mẫu lần đầu; người dùng thấy thẻ rỗng và note ở thanh bên.

## Kiểm chứng

- `npm run typecheck`: sạch.
- `npm test`: 300 + 100 + 86 = **486 test đạt**. Test mới:
  - `packages/core/test/sample-vault.test.ts`: hai ngôn ngữ cùng cấu trúc, mọi liên kết trỏ tới note có thật, đường dẫn nhập được, có thẻ và mẫu;
  - `packages/ui/test/sample-vault-writer.test.ts`: thứ tự tạo thư mục và ghi file.
- **E2E 11/11 trên bản build production, chạy 3 lần đều đạt.** Bước mới: tài khoản mới có vault "Getting started", và panel Backlinks của Welcome có "Links and backlinks". Bước đăng ký chờ tới 30 giây, vì giờ còn ghi vault mẫu.
- Thử bằng mắt (spec tạm, xoá sau khi chạy): đăng ký `en-US` và `vi-VN`, vault mẫu đúng ngôn ngữ, note Welcome/Chào mừng, vault rỗng, tìm không thấy.
- JS tải đầu web: **231,9 KB gzip** (4.5: 231,3; ngân sách ≤ 374).
- Desktop:
  - `CARGO_BUILD_JOBS=2 npx tauri build --no-bundle` rồi `node e2e/desktop/smoke.mjs`: **17/17 đạt**;
  - thử wizard thật trên bản portable (script tạm, xoá sau khi chạy): ô chọn hiện và bật sẵn, tạo vault mới thì ghi đủ 6 note mẫu (trước khi sửa lỗi `~` thì 0); thư mục vault thử đã xoá.

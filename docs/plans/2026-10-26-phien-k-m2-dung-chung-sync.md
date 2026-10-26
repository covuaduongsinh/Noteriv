# Phiên K-M2: App Android dùng chung logic, sync hai chiều

> Ngày: 2026-10-26 · Chặng: [K](2026-10-20-chang-k-kiem-chung.md) (ngoại lệ app mobile) · Nhánh: `covuaduongsinh/k-mobile-dung-chung` (cắt từ `main` sau PR #39, #40)

## Vì sao

Sau M1b, phone sync an toàn hơn nhưng vẫn chưa thật sự "hai chiều" với web và desktop:

- **Tên bản xung đột khác nhau.** Web, server và desktop đặt `ghi chú (conflict 2026-10-26 0930).md`, còn phone đặt `ghi chú (conflict 2026-10-26).md`. Thanh báo xung đột của web (`parseConflictCopy` trong `@noteriv/core`) không nhận ra bản do phone tạo.
- **Xoá và đổi tên trên phone không lên remote.** Note đã xoá được pull về lại, đổi tên thì sinh bản trùng.
- **Đổi tên trên phone không sửa liên kết** tới note đó, trong khi web và desktop có làm (G1, PR #26).
- **Phone phân giải `[[liên kết]]` theo cách riêng:** chỉ so tên file, không ưu tiên note cùng thư mục, không hiểu đuôi đường dẫn. Cùng một liên kết có thể mở ra hai note khác nhau trên phone và trên web.
- **GitLab/Gitea** vẫn tải lại toàn bộ note mỗi lần sync.
- Phone giữ bản chép tay của vài file trong `packages/core` (`board-utils`, `dataview` giống hệt từng dòng), nên dễ lệch dần.

## Cách làm

### 1. Dùng `@noteriv/core` trên phone

- `phone/metro.config.js` thêm `packages/core/src` vào `watchFolders`. `phone/tsconfig.json` thêm alias `@noteriv/core/*`, trỏ tới `../packages/core/src/*`.
- Chỉ nhập từng module (`@noteriv/core/link-rename`…), không nhập `index.ts`, để không kéo theo module dùng DOM (`sanitize-html`).
- Xoá `phone/lib/board-utils.ts` và `phone/lib/dataview.ts` (giống hệt bản trong core), rồi trỏ các chỗ dùng sang core.
- Các file phone khác với core (`calendar-utils`, `slide-utils`, `markdown-lint`, `publish`) để M3, vì đổi sẽ đổi hành vi giao diện.

### 2. Bản xung đột cùng tên với web/desktop

- Core thêm `conflictCopyPath(path, taken, now)`, cùng quy tắc với `web/server/src/lib/gitSync.ts` và `desktop/src-tauri/src/commands_git.rs`. Image của server không đọc được `packages/`, nên server giữ bản riêng; test core đối chiếu với `parseConflictCopy`.
- `writeConflictCopy` của phone dùng hàm này.

### 3. Liên kết giống web

- Mở `[[liên kết]]` trên phone dùng `resolveLinkTarget` của core: tên trần hoặc đường dẫn, ưu tiên note cùng thư mục, rồi đến đường dẫn ngắn nhất.
- Backlinks dùng `linkResolver` cùng `wikiLinkTargets`, nên đếm cả liên kết dạng đường dẫn, `#tiêu đề` và `^khối`.
- Đổi tên note sửa các liên kết tới nó (`rewriteLinksForMoves`), như web và desktop. Note đang mở được lưu trước khi đổi tên.

### 4. Sync: xoá, đổi tên, GitLab/Gitea chỉ tải phần đổi

- **Push xoá trên remote** một note đã thống nhất mà nay không còn trên máy, nếu remote vẫn là bản đã thống nhất. Nếu remote đã sửa note đó thì giữ bản sửa (sửa thắng xoá, như server và desktop), và pull mang nó về lại.
- **Pull không khôi phục note vừa xoá trên máy**, nếu remote chưa đổi nó kể từ lần thống nhất.
- Đổi tên = xoá đường dẫn cũ + tạo đường dẫn mới, nên đi theo hai quy tắc trên.
- **GitLab/Gitea** lưu sha của từng file như GitHub (cây file của cả hai đều có sha blob), nên chỉ tải note có sha đổi.

### 5. Bộ giả lập sync vào repo

- Bộ giả lập GitHub cùng hệ thống file trong bộ nhớ (trước nằm ở scratchpad) chuyển vào `phone/scripts/sync-sim/`, chạy bằng `npx tsx --tsconfig phone/scripts/sync-sim/tsconfig.json phone/scripts/sync-sim/run.ts`. Alias trong tsconfig đó trỏ `@/lib/file-system` và `@/lib/storage` tới bản giả.
- Thêm giả lập Gitea để kiểm đường GitLab/Gitea.
- CI job `phone` để M4.

## Kiểm thử

- Core (vitest): `conflictCopyPath` đặt tên đúng mẫu, đánh số khi trùng, và `parseConflictCopy` đọc ngược ra đúng note gốc.
- Giả lập sync: các kịch bản cũ, cộng xoá trên phone, đổi tên trên phone, xoá trên phone trong khi remote sửa, GitLab/Gitea chỉ tải phần đổi.
- `npx tsc --noEmit` trong `phone/`; test của `packages/core`.
- APK debug build lại. Chủ dự án thử trên máy thật: sync với web, xoá và đổi tên note, mở liên kết.

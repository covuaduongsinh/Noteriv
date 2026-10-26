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

## Review (2026-10-26)

Review độc lập không thấy đường nào xoá nhầm note trên remote. Mỗi note chỉ bị xoá sau khi kiểm từng file (`fileMissing`; gặp lỗi thì coi là vẫn còn) và khi danh sách note trên máy không rỗng. Đã sửa các điểm review nêu:

- **Gitea gửi cây file theo trang.** Trước đây chỉ đọc trang đầu, nên note ở các trang sau bị coi là đã xoá trên remote, và phone xoá chúng trên máy. Lỗi này có từ upstream. Nay đọc hết các trang, nếu vẫn bị cắt thì dừng sync.
- **GitLab không kiểm phiên bản khi ghi hoặc xoá.** Nay phone đọc blob và commit cuối của file trước khi ghi. Nếu blob đã khác thì dừng; nếu chưa thì gửi kèm `last_commit_id`, để GitLab từ chối khi file đổi chen giữa.
- **Đổi tên mà upload tên mới bị lỗi** thì không xoá tên cũ trên remote. Lượt push nào có lỗi upload thì bỏ bước xoá.
- **Sau khi đổi tên, app vẫn trỏ vào đường dẫn cũ**, nên lần lưu sau có thể tạo lại note cũ. AppContext nay có `applyPathMoves`, để note đang mở, các tab và bookmark đi theo đường dẫn mới.
- **Xoá thư mục ở danh sách note:** hộp thoại báo "chuyển vào .trash" nhưng thật ra xoá hẳn. Nay thư mục cũng vào `.trash` (`trashDir`). Điều này quan trọng hơn trước, vì giờ xoá trên máy sẽ xoá cả trên remote.
- **Đổi tên ở danh sách note** (cả note lẫn thư mục) nay cũng sửa liên kết, như đổi tên trong editor.
- Đổi tên note `.markdown` không còn sinh đuôi kép `.markdown.md`.

Chấp nhận, không sửa:
- `[[x]]` không còn mở được `x.markdown`, giống web (`resolveLinkTarget` chỉ bỏ đuôi `.md`).
- `components/FileTree.tsx` không được dùng ở đâu (app dùng `NotesList`), nên không sửa.

## Kiểm thử

- Core (vitest): `conflictCopyPath` đặt tên đúng mẫu, đánh số khi trùng, và `parseConflictCopy` đọc ngược ra đúng note gốc.
- Giả lập sync: các kịch bản cũ, cộng xoá trên phone, đổi tên trên phone, xoá trên phone trong khi remote sửa, GitLab/Gitea chỉ tải phần đổi.
- `npx tsc --noEmit` trong `phone/`; test của `packages/core`.
- APK debug build lại. Chủ dự án thử trên máy thật: sync với web, xoá và đổi tên note, mở liên kết.

### Kết quả

- Giả lập sync (`phone/scripts/sync-sim`): **48/48 PASS**, gồm GitHub 30, Gitea 10 và GitLab 8. GitLab có kịch bản ghi và xoá đúng lúc nơi khác vừa sửa note. Chạy các kịch bản của bản đầu phiên này trên code sync của `main` thì 13 kịch bản trượt (xoá, đổi tên, tên bản xung đột, Gitea tải lại mọi note).
- Core: 404/404 test PASS, gồm 2 test mới cho `conflictCopyPath`.
- `npx tsc --noEmit` trong `phone/`: exit 0.
- `npx expo export --platform android` bundle được (4,92 MB), có code của `@noteriv/core`. Nghĩa là Metro resolve được alias, không chỉ tsc.
- Chưa thử trên máy thật.

# Kế hoạch sửa 4 lỗi phát hiện trên production sau đợt parity v2

> Khi được duyệt: bước đầu là sao chép file này vào `docs/plans/2026-10-14-noteriv-web-post-deploy-fixes.md`.

## Bối cảnh

Sau khi deploy (`3f4475c..36895ca`), bạn thử trên `noteriv.dsc.edu.vn` và gặp: (1) Sync GitHub báo `spawn git ENOENT` ở cả "Sync ngay", "Kiểm tra kết nối", "Kiểm tra remote"; (2) cài plugin chessboard xong nhưng khối ```chessboard vẫn hiện mã thô; (3) không cuộn được bằng chuột ở cả 3 chế độ Edit/View/Source, và **không có thanh cuộn**; (4) ảnh còn cho thấy nút trong Plugin Manager ("Tắt", "Gỡ") và hàng lệnh plugin ("Word Count: Show detailed stats") bị dính sát, không có padding.

## Nguyên nhân gốc (đã đọc mã)

1. **Sync — container không có `git`.** `web/server/Dockerfile` (stage `runner`) chỉ `apk add openssl`; image `node:22-alpine` không có git, nên `spawn("git")` trong `lib/gitSync.ts` ném `ENOENT`. Dev không lộ ra vì máy dev có git. Ngay sau khi có git còn **một lỗi nữa sẽ lộ**: `git commit` cần danh tính tác giả, container không có `user.name/email` (máy dev có cấu hình toàn cục) → commit sẽ lỗi "Please tell me who you are". Ngoài ra `noteHistory.ts` cũng gọi git nên hiện đang hỏng trên production.
2. **Chessboard — plugin không có quyền.** Màn hình Plugin Manager ghi "Không yêu cầu quyền": plugin được cài bằng tab *Cài thủ công* với manifest không có `permissions`; chỉ luồng *Cộng đồng* mới suy ra quyền. Sandbox mặc định chặn, nên `api.markdown.registerCodeBlockProcessor` bị từ chối âm thầm (không có thông báo nào). Server `PATCH /plugins/:pid` cũng chưa cho sửa quyền, nên không có cách cấp lại.
3. **Cuộn — chưa xác định được nguyên nhân.** Bạn xác nhận: cả 3 chế độ, không có thanh cuộn ⇒ `.cm-scroller` đang cao bằng nội dung (không bị giới hạn chiều cao), nên không có gì để cuộn. Chuỗi layout từ `h-screen` → `main` → khối `flex-1 min-h-0` → `SplitPane` (`height:100%`) → `h-full overflow-hidden` → `.cm-editor{height:100%}` có một mắt xích mất chiều cao xác định. Không có handler `wheel` nào can thiệp (đã grep). Cần tái hiện để biết mắt xích nào gãy và commit nào gây ra.
4. **Padding bị vô hiệu — `globals.css:20`**: `* { margin:0; padding:0 }` nằm ngoài `@layer` nên **thắng mọi utility `px-*/py-*/m-*` của Tailwind** trên toàn app (Tailwind v4 đặt utility trong layer). Đây là gốc của các nút dính sát, và là lý do mọi chỗ tôi viết `px-…` trong đợt trước phải đổi sang style inline.

## Cách sửa

### A. Sync trên production (ưu tiên cao nhất)
- `web/server/Dockerfile`: `apk add --no-cache openssl git ca-certificates`.
- `web/server/src/lib/gitSync.ts` (`runGit`): luôn đặt `GIT_AUTHOR_NAME/EMAIL`, `GIT_COMMITTER_NAME/EMAIL` (mặc định `Noteriv Sync <sync@noteriv.local>`, ghi đè được bằng env `SYNC_GIT_AUTHOR_NAME/EMAIL`), `GIT_CONFIG_NOSYSTEM=1`, `HOME` trỏ vào thư mục tạm ghi được.
- Thông báo lỗi dễ hiểu: bắt `ENOENT` → "Máy chủ chưa cài git; liên hệ quản trị viên"; khi khởi động API và worker gọi `gitIsInstalled()` và log cảnh báo rõ ràng.
- `web/infra/docker-compose.prod.yml`: nâng `mem_limit` của `noteriv-worker` (git clone/rebase repo lớn dễ chạm 256MB) lên 384m; kiểm `df -h /` trước.
- Mở rộng `scripts/test-sync-scenarios.ts` hoặc thêm bước kiểm tra chạy **trong container sau deploy**: `docker exec <api> git --version`, rồi dựng repo bare tạm trong container và chạy một vòng init/commit/push để xác nhận danh tính và clone hoạt động.
- Bạn bấm lại "Sync ngay" trên repo `covuaduongsinh/noteriv_learn` để kiểm thử thật. Lưu ý lần đầu sẽ nhập các note có sẵn trong repo vào vault và đẩy note của vault lên repo; nội dung trùng đường dẫn giữ bản của web.

### B. Plugin chessboard (và mọi plugin cài thủ công)
- `PluginManager.tsx` tab *Cài thủ công*: nếu manifest thiếu `permissions` thì suy ra bằng `inferPermissions` (`lib/plugin-community.ts`) và dùng cùng bước xác nhận quyền như tab Cộng đồng (tách thành component dùng chung).
- Tab *Đã cài*: hiện danh sách quyền, nút **"Cấp quyền theo mã nguồn"** (suy lại từ `mainJs`) và công tắc từng quyền.
- `usePluginHost.ts`: khi `dispatchCall` từ chối vì thiếu quyền, ghi lại theo plugin (state `deniedByPlugin`); Plugin Manager hiển thị "Plugin cố dùng X nhưng chưa có quyền Y — Cấp quyền". Hết cảnh lỗi im lặng.
- `server/src/routes/plugins.ts`: `PATCH /:pid` nhận `permissions` (kiểm theo `ALLOWED_PERMISSIONS`), ghi audit log.
- Sau khi đổi quyền, nạp lại iframe của plugin (tắt/bật nội bộ) để khối chessboard hiện ngay, không cần tải lại trang.

### C. Lỗi không cuộn được
1. **Tái hiện trước**: dựng dev (tunnel + API + `next dev`), tạo note ≥ 300 dòng (có thể dùng `Untitled.md` của bạn), thử cả 3 chế độ; đo bằng JS chiều cao từng tổ tiên của `.cm-editor` (`getBoundingClientRect`, `scrollHeight`) để tìm mắt xích đầu tiên không bị giới hạn.
2. **Bisect** nếu cần: `git worktree` ở `3f4475c` (trước đợt parity v2) và các commit Pha 1–6 để biết commit nào gây ra.
3. Sửa đúng mắt xích (khả năng cao: thêm `min-h-0`/`overflow-hidden` cho `main` hoặc khối cột chứa `SplitPane`, hoặc cho `.split-pane-panel` chiều cao rõ ràng), kèm kiểm tra khi mở Outline/Backlinks/Lint/Plugin panel và ở chế độ split.
4. Xác minh: cuộn bằng bánh xe ở đầu/giữa/cuối văn bản, có thanh cuộn, Edit/View/Source, theme sáng/tối.

### D. Padding bị vô hiệu toàn cục
- Đưa `* { margin:0; padding:0; box-sizing:border-box }` vào `@layer base` (Tailwind preflight đã reset sẵn nên không mất gì), để utility `px-*` có hiệu lực. Các class riêng của desktop (`.ribbon-btn`, `.st-*`…) nằm ngoài layer nên vẫn thắng như cũ.
- **Rủi ro**: nhiều component web dùng utility `px-*/py-*` từ trước nhưng chưa từng có hiệu lực; chúng sẽ hiện padding đúng ý tác giả. Phải rà các màn: Plugin Manager, hàng lệnh plugin, Settings, Sync, Import, QuickOpen/Command palette, Trash, Templates, Calendar, Flashcards, Insights, Graph. Nếu màn nào vỡ bố cục thì sửa riêng hoặc hoàn tác bước này (các chỗ đã dùng style inline vẫn đúng trong cả hai trường hợp).

## Thứ tự và git
A → B → D → C (A và B độc lập, C cần tái hiện, D ảnh hưởng thẩm mỹ toàn cục nên làm sau khi A/B ổn). Mỗi mục một commit riêng. Sau khi xong: `tsc` sạch, `next build`, chạy lại `test-sync-scenarios.ts`, xác minh trên browser thật, rồi **hỏi bạn trước khi push**. Deploy mục A cần build lại image server (đổi Dockerfile) và, vì worker đổi mem_limit, cập nhật compose trên Dokploy; không có migration mới.

## Câu hỏi còn lại cho bạn
Không có; nếu mục C không tái hiện được trên dev, tôi sẽ cần bạn mô tả hoặc quay một đoạn video ngắn thao tác gây lỗi (mở note nào, kích thước cửa sổ).

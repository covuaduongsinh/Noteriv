# Kế hoạch xử lý 3 việc tồn đọng của Noteriv Web

> Khi được duyệt: bước đầu tiên là sao chép file này vào `docs/plans/2026-10-14-noteriv-web-residual-fixes-plan.md` (plan mode chỉ cho ghi ở đường dẫn tạm này). Nguồn yêu cầu: `docs/plans/2026-10-14-noteriv-web-residual-fixes.md`.

## Bối cảnh

Sau đợt full-parity, còn 3 việc dở: (1) plugin cộng đồng "Word Count" lỗi `text.trim is not a function`, (2) race giữa `?note=` và khôi phục workspace-state, (3) thiếu script bootstrap cluster Garage. Việc 4 (formatBytes) đã xong.

## Việc 1 — Sandbox plugin API lệch desktop (nguyên nhân gốc đã xác định)

Đã đọc mã: plugin `word-count` (`NoterivPlugins/master/plugins/word-count/main.js`) dùng: status bar item, event `editor-change` (debounce 300ms), event `file-open`, `editor.getContent()`/`getSelection()` **đồng bộ**, command + notice.

Nguyên nhân gốc, 3 chỗ lệch giữa desktop (`desktop/src/lib/plugin-api.ts`) và web:
1. **`editor.getContent()`/`getSelection()` đồng bộ trên desktop** (`string | null` / `string`), nhưng ở web chúng là RPC trả `Promise` (`web/public/plugin-sandbox.html:64-68`) → `text.trim` chạy trên Promise. Đây chính là lỗi quan sát được.
2. **Host không bao giờ phát sự kiện**: sandbox đã có handler `noteriv:emit-event` nhưng không nơi nào trong `web/src` gửi nó → `editor-change`/`file-open`... không bao giờ chạy.
3. **Thiếu `ui.addStatusBarItem`/`removeStatusBarItem`, `events.emit`, `editor.getCursorPosition`, `app.currentFile`** trong `buildApi()`.

Hướng sửa (đúng ngữ nghĩa desktop, không né crash bằng `?? ""`):
- **Snapshot đồng bộ**: host đẩy `noteriv:editor-state {content, selection, cursor, currentFile}` vào mỗi iframe (khi plugin boot, khi tab/nội dung/selection đổi, throttle). Sandbox cache lại; `getContent/getSelection/getCursorPosition` trả đồng bộ từ cache. Chỉ đẩy cho plugin có permission `editor:read` (giữ default-deny); plugin không có thì nhận `null`/`""`. Setter vẫn là RPC, fire-and-forget.
- **Phát sự kiện**: trong `usePluginHost.ts` thêm hàm `emitToPlugins(event, ...args)` gửi `noteriv:emit-event`; nối từ `page.tsx` cho `file-open` (đổi tab), `editor-change` (onDraftChange), `file-save` (persistNote), `file-create`/`file-delete`/`vault-change` (sau refreshIndex). Chỉ gửi nội dung cho plugin có `editor:read`.
- **Status bar declarative**: thêm `ui.addStatusBarItem({id,text,title,onClick})`/`removeStatusBarItem` → RPC `ui.addStatusBarItem`; permission mới `ui:statusbar` (thêm vào `PluginPermission` trong `types.ts` + `METHOD_PERMISSIONS`). Host giữ `statusBarItems` state, `onClick` đi ngược qua `noteriv:invoke-status-click`. Render trong `web/src/components/StatusBar.tsx` (đã có chỗ trống từ Phase A). Manifest của word-count phải khai permission tương ứng — kiểm tra cách desktop khai (nếu manifest community không có `ui:statusbar`, ánh xạ permission cho phù hợp thay vì sửa plugin bên thứ ba).
- Ngoài phạm vi (ghi vào residual gaps): `addSidebarPanel`, `addSettingsTab`, `markdown.registerCodeBlockProcessor` — cần thiết kế declarative riêng.

Tệp chính: `web/public/plugin-sandbox.html`, `web/src/lib/plugin-sandbox/usePluginHost.ts`, `.../types.ts`, `web/src/components/StatusBar.tsx`, `web/src/app/vaults/[vaultId]/page.tsx`.

Xác minh (browser thật, qua `http://localhost:3457`): cài lại Word Count từ tab Community → không lỗi, status bar hiện số từ và cập nhật khi gõ/đổi tab, command "Show detailed stats" hiện notice, có/không chọn đoạn văn bản. Plugin test nhỏ không khai `editor:read`/`ui:statusbar` → bị chặn đúng (default-deny). Test đổi theme Nord → Solarized Light → Nord cho status bar item (dùng `var(--…)`).

## Việc 2 — Race `?note=` vs khôi phục workspace-state (đã xác định)

Trong `page.tsx`: effect `?note=` (~dòng 796) chạy ngay lúc mount song song với effect `workspace.getState` (~dòng 459). `openNote` đọc `tabs` stale (rỗng) rồi `setTabs(prev => …)` thêm tab; sau đó khôi phục chạy `setTabs(restoredTabs)` và `setActiveTabId(...)` **ghi đè** → tab từ `?note=` mất hoặc active sai. Ngoài ra: `openNote` không bắt 404 (unhandled rejection khi note đã xoá/Trash), và khôi phục dùng `.catch(() => null)` nuốt mọi lỗi (cả lỗi mạng tạm thời cũng làm rớt tab).

Hướng sửa:
- Gộp thành **một chuỗi khởi tạo tuần tự**: đợi khôi phục xong (`workspaceLoadedRef`/state `workspaceReady`), rồi mới áp dụng `?note=` bằng cách **merge** (thêm tab nếu chưa có, đặt active) thay vì ghi đè.
- Khôi phục: chỉ bỏ tab khi `ApiError.status === 404` (class `ApiError` trong `webApi.ts:203`, kiểm tra có export chưa); lỗi khác giữ tab (không mất state vì lỗi mạng). Tất cả tab hỏng → trạng thái "chưa mở note nào" rõ ràng.
- `openNote`: bắt 404 → hiện notice/toast inline (không `window.alert`), không crash.
- Dọn state phía server: effect persist sẵn có (dòng ~490) sẽ tự ghi lại danh sách sạch sau khi khôi phục — xác nhận bằng cách đọc lại `workspace.getState` sau reload, không thêm code riêng.

Xác minh: tạo vault test, mở 3 tab (1 pin, 1 đổi view-mode), xoá vĩnh viễn 1 note qua Trash/API, reload (kèm biến thể có `?note=<id hợp lệ>` và `?note=<id đã xoá>`): tab chết biến mất, tab khác + pin + view-mode giữ nguyên, `?note=` hợp lệ được mở và active, không có lỗi console. Thử cả trường hợp tất cả tab đều chết.

## Việc 3 — Script bootstrap Garage

Tạo `web/infra/garage-bootstrap.sh` (POSIX sh, idempotent) + `web/infra/README.md` (hoặc comment cạnh `noteriv-garage` trong `docker-compose.prod.yml`). Dev dùng `/etc/garage.toml`, container `noteriv-garage`; prod dùng `/etc/garage-conf/garage.toml`, tên container do Dokploy sinh → tham số: `GARAGE_CONTAINER` (bắt buộc), `GARAGE_CONFIG` (mặc định `/etc/garage-conf/garage.toml`).

Logic: `node id` → nếu `layout show` chưa có node thì `layout assign -z dc1 -c 1G` + `layout apply --version 1` (lấy version kế tiếp từ output, không hardcode 1 khi layout đã có version) → `bucket list`/`bucket create noteriv-attachments` nếu thiếu → `key list`/`key create noteriv-attachments-key` nếu thiếu (chỉ khi vừa tạo mới mới in Key ID + Secret một lần, kèm nhắc đặt vào Dokploy env `ATTACHMENTS_S3_ACCESS_KEY_ID/_SECRET_ACCESS_KEY`) → `bucket allow --read --write --owner` (idempotent). Có `set -eu`, thông báo "đã tồn tại, bỏ qua" mỗi bước. Cần kiểm tra cú pháp `garage` v1.0.1 (`layout show`, `key list` output) trên container test trước khi chốt parse.

Xác minh: dựng **container Garage test hoàn toàn mới** trên VPS (compose tạm riêng, tên/volume/cổng khác dev stack, `mem_limit` thấp, `df -h /` trước vì đĩa ~92%) rồi chạy script 2 lần: lần 1 tạo đủ layout/bucket/key, lần 2 thoát gọn "đã tồn tại"; sau đó xoá container + volume test. **Tuyệt đối không chạy nhắm vào production** và không đụng Garage dev đang có dữ liệu. Bước SSH/docker trên VPS là thao tác ngoài máy local — chỉ làm sau khi bạn duyệt kế hoạch.

## Trình tự và git

Làm lần lượt Việc 2 (nhỏ, độc lập) → Việc 3 → Việc 1 (lớn nhất). Mỗi việc một commit riêng (tiếng Anh, thêm dòng Co-Authored-By theo quy định), **chưa push** cho tới khi xác minh xong bằng browser thật và bạn đồng ý; không có migration Prisma mới. Cuối cùng cập nhật mục "Known residual gaps" trong `project_noteriv_web_build.md` (đánh dấu 3 việc đã xong, thêm các khoảng trống plugin API còn lại). Làm mới `tsc --noEmit` ở `web/` và `web/server/` trước mỗi commit.

## Câu hỏi còn mở

- Việc 1: chấp nhận thêm permission `ui:statusbar` (thay đổi bề mặt bảo mật nhỏ), hay map status bar vào permission sẵn có `ui:commands`?

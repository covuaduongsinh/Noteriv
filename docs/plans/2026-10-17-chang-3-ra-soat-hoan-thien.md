# Chặng 3: Rà soát chất lượng và hoàn thiện

> Ngày lập: 2026-10-17 · Viết lại cùng ngày sau khi rà mã · Trạng thái: **đang triển khai** · Lộ trình: [2026-10-17-lo-trinh-thuong-mai.md](2026-10-17-lo-trinh-thuong-mai.md)
> **Phiên mới hãy đọc trước:** [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md)
> **Điều kiện bắt đầu:** Chặng 1 xong.

## Mục tiêu

- **Không bao giờ âm thầm mất nội dung** khi đồng bộ. Đây là điều kiện bắt buộc trước khi bán.
- Vá các lỗ hổng bảo mật đã biết.
- Có test tự động bảo vệ các luồng chính.
- Dọn việc treo của Giai đoạn 1–2, rồi rà soát toàn bộ tính năng trên web và desktop Tauri thật.

## Vì sao đổi thứ tự (2026-10-17)

Ba agent chỉ đọc đã rà mã trước khi lập kế hoạch và tìm thấy những vấn đề nặng hơn danh sách việc treo.

**Đồng bộ đang mất dữ liệu:**
- Sync git hai chiều **xoá vĩnh viễn note trong thùng rác**.
- Hai bên cùng sửa thì **ký hiệu xung đột `<<<<<<<` bị commit và nhập vào note**, vì kết quả `stash pop` bị bỏ qua.
- Bản sửa trong lúc sync đang chạy bị ghi đè; note tạo trong lúc đó bị xoá.
- Không có snapshot trước khi ghi đè.
- Hai job sync cùng kết nối chạy song song được.
- WebDAV PUT đè mọi file lên server.
- Room cộng tác ghi đè nội dung vừa nhập từ sync.

**Bảo mật:**
- WebSocket cộng tác không chặn người chỉ có quyền xem, cũng không chặn note trong thùng rác.
- Clip token không kiểm lại quyền khi dùng.
- Desktop không có CSP.

Vì vậy phần chống mất dữ liệu được làm trước tiên.

**Chủ dự án chốt:**
- **Xung đột:** git tự gộp 3 chiều. Không gộp được thì giữ bản web làm note chính, bản kia thành note "(conflict …)" ngay cạnh, có màn hình so sánh.
- **Nhịp làm:** làm liên tục, hỏi trước mỗi lần gộp vào `main`.

---

## Phiên 3.1: Chống mất dữ liệu khi sync git (web)

Bản ghi: [2026-10-17-phien-3-1-chong-mat-du-lieu.md](2026-10-17-phien-3-1-chong-mat-du-lieu.md).

- **`gitSyncCore`:** commit bản export của web trước, rồi `merge` (thay cho stash + `pull --rebase`). Xung đột thì giữ cả hai bên:
  - cả hai sửa → file chính là bản web, bản remote thành `<tên> (conflict YYYY-MM-DD HHmm).md`;
  - web xoá, remote sửa → giữ việc xoá, bản remote thành bản xung đột;
  - web sửa, remote xoá → giữ bản web.
- **`importDirToNotes`:**
  - không đụng thùng rác;
  - note mất file thì vào thùng rác, không xoá hẳn;
  - snapshot trước khi ghi đè;
  - note sửa trong lúc sync thì giữ bản sửa, nội dung file thành bản xung đột;
  - note tạo trong lúc sync không bị chuyển vào thùng rác.
- **Khoá theo kết nối:** cột `sync_connections.sync_locked_at` (migration `20261017120000_sync_lock`, **áp trước khi deploy**).
- Kịch bản `web/server/scripts/test-sync-scenarios.ts` có thêm 9 nhóm kiểm tra mới.

## Phiên 3.2: Xung đột (tiếp)

1. **Giao diện xung đột** dùng chung (`@noteriv/ui`):
   - danh sách bản xung đột (từ `lastSyncStatus.conflictCopies` / tên file chứa "(conflict ");
   - so sánh với note gốc bằng `diffStrings` (`packages/core/src/note-diff.ts`);
   - nút "giữ bản này / giữ bản kia / giữ cả hai";
   - hướng dẫn tiếng Việt.
2. **Desktop** `desktop/src-tauri/src/commands_git.rs`: cùng thuật toán commit rồi merge, có bản xung đột. Hiện `stash pop` bị bỏ qua ở dòng 433 và `git_pull` 490–513.
3. **WebDAV:**
   - lưu trạng thái lần sync trước (ETag/hash mỗi file) trong `SyncConnection`;
   - chỉ PUT khi web đổi;
   - hai bên cùng sửa thì tạo bản xung đột;
   - xử lý xoá hai chiều.
4. **Đính kèm:** phát hiện thay đổi theo hash thay vì kích thước (`attachmentSync.ts:76,137-140`).
5. **Cộng tác:** giải phóng room khi người cuối rời đi (`collab-server/index.ts:192-199`); khi sync nhập nội dung mới thì không để room cũ ghi đè.

## Phiên 3.3: Bảo mật

1. **Cộng tác** (`collab-server/index.ts:117-126`): người chỉ có quyền xem chỉ được đọc; note trong thùng rác bị từ chối.
2. **Clip token** (`routes/clipper.ts:161+`): mỗi lần dùng kiểm lại membership và quyền ghi; rate limit theo id token đã xác thực.
3. **CSP cho Tauri** (`desktop/src-tauri/tauri.conf.json`): thử không làm vỡ plugin sandbox, pdf.js, ảnh cục bộ.
4. `npm audit` cho 3 lockfile; rà nhanh các route upload/import.

## Phiên 3.4: Test E2E (Playwright) trong CI

- Job CI mới chạy API + Postgres + web build.
- Luồng: đăng ký bằng mã mời → vault → tạo/sửa/đổi tên/xoá note → wikilink/backlink → tìm kiếm → bật/tắt plugin → đính kèm → thùng rác.
- Lưu ảnh chụp và trace khi lỗi; có `timeout-minutes`.

## Phiên 3.5: Việc treo, nhóm UX

| Việc | Cách sửa đã định vị |
|---|---|
| Đổi tên note sau khi tạo (web) | Nút "+" (`Sidebar.tsx:430`) vào chế độ đổi tên; chờ `onRefresh` xong mới `startRename`; dòng cây file dùng `div role="treeitem"` thay `<button>`; bấm đúp để đổi tên |
| Esc đóng CSS Snippets / Thùng rác (2 app) | Hook dùng chung `useEscapeClose` theo mẫu `AttachmentManager.tsx:150-160` |
| Audio trong note | Nhận đuôi audio trong `packages/ui/src/markdown/renderers/images.ts`, vẽ `<audio controls>` |
| Desktop lưu chậm sau khi plugin sửa | Autosave có debounce, giữ `tabsRef` để interval không bị tạo lại (`desktop/src/app/page.tsx:494-512`) |
| Khôi phục tab chậm | `workspace-state` trả kèm note đang mở (`routes/userVaultState.ts`) |
| `GET /sync-connections` gọi 2 lần | `webApi.sync.list` dùng chung một promise |

## Phiên 3.6: Việc treo, nhóm nền tảng plugin

| Việc | Cách sửa |
|---|---|
| Tab cài đặt core plugin | Hiện `contributions.settingsTabs` trong `CorePluginsSection` ở hai app |
| `registerPostProcessor` chưa được gọi | `setPostProcessorRunner` cho `RenderedMarkdownWidget` / `ReadOnlyView` |
| Desktop không hiện panel plugin cộng đồng | Chuyển khối `pluginPanels` + `PluginMirror` của web sang desktop |
| Trạng thái plugin giữa nhiều tab web | `BroadcastChannel` |
| Tìm kiếm khác nhau giữa hai app | `NoteSearchHit.matches` + `VaultSearch` dùng chung |
| Giao diện 360–430 px | Sidebar dạng ngăn kéo, hộp thoại vừa màn hình |

## Phiên 3.7: Rà soát toàn bộ

Viết `docs/qa/checklist.md` từ danh mục tính năng:
- web: ribbon, menu, hộp thoại;
- desktop;
- 17 core plugin;
- tính năng chỉ có trên một nền tảng.

Chạy một lượt trên staging và desktop Tauri thật. Ghi lỗi theo mức ưu tiên và sửa hết lỗi mức Cao.

### Xong khi (cả chặng)
- Mọi kịch bản sync (git, WebDAV, desktop) giữ được nội dung của cả hai bên.
- Không còn lỗ hổng đã biết.
- E2E xanh trong CI.
- Checklist không còn lỗi mức Cao.

## Ước lượng
6–8 buổi.

## Trạng thái

| Phiên | Trạng thái | Ngày | Commit / ghi chú |
|---|---|---|---|
| 3.1 Chống mất dữ liệu (sync git web) | Xong | 2026-10-17 | PR #4, merge `deab4d7`; kịch bản sync ALL PASSED; production: sao lưu tay `/root/noteriv-manual-backups/before-sync-lock-20261017T101806Z.sql.gz`, áp migration trước, deploy, `migrate resolve --applied`; 9 container, healthz 200 |
| 3.2 Xung đột (UI, desktop, WebDAV, cộng tác) | Xong | 2026-10-17 | [Bản ghi](2026-10-17-phien-3-2-xung-dot.md); migration `20261017140000_webdav_sync_state`; 429 test, 13 test Rust, kịch bản git/WebDAV/collab đạt; thử trình duyệt thật trên web. Lên production cùng 3.3 |
| 3.3 Bảo mật | Xong (trừ CSP desktop → 3.7, Prisma 7 → việc riêng) | 2026-10-17 | [Bản ghi](2026-10-17-phien-3-3-bao-mat.md); PR #5 merge `2458203`; sao lưu tay `before-webdav-state-20261017T120508Z.sql.gz`, áp migration trước deploy, `migrate resolve`; staging xác nhận API thấy IP thật dù header giả; 9 container, healthz 200 |
| 3.4 E2E trong CI | Xong | 2026-10-17 | [Bản ghi 3.4 + 3.5](2026-10-17-phien-3-4-3-5-e2e-ux.md); `e2e/` + job CI `e2e` (7 bước); PR #6 merge `dd8fb8b`. Job E2E bắt được 1 lỗi thật trong 3.5 (yêu cầu đổi tên bị phát lại) và 1 lỗi định thời của test; cả hai đã sửa |
| 3.5 Việc treo nhóm UX | Xong (desktop chưa chạy Tauri thật → 3.7) | 2026-10-17 | Đổi tên note vừa tạo, bấm đúp/F2, Esc, audio trong note, desktop auto-save, khôi phục tab một request, `sync-connections` một lần |
| 3.6 Việc treo nhóm nền tảng plugin | Xong (chờ lên production) | 2026-10-17 | [Bản ghi](2026-10-17-phien-3-6-nen-tang-plugin.md); tab cài đặt core plugin, post-processor, panel plugin desktop, đồng bộ plugin giữa tab, `VaultSearch` dùng chung (tìm theo dòng), CSS ≤ 600 px; 435 test, E2E 8/8 |
| 3.7 Rà soát toàn bộ | Chưa làm | | |

# Phiên 3.2: Xung đột (desktop git, WebDAV, đính kèm, cộng tác, giao diện so sánh)

> Ngày: 2026-10-17 · Chặng: [3](2026-10-17-chang-3-ra-soat-hoan-thien.md) · Nhánh: `covuaduongsinh/chang3-xung-dot` · Trước đó: [3.1](2026-10-17-phien-3-1-chong-mat-du-lieu.md)

Hoàn tất mục tiêu "không bao giờ âm thầm mất nội dung" cho mọi đường đồng bộ còn lại. Có làm luôn phần bảo mật cộng tác của 3.3, vì nằm cùng file.

## Đã làm

### Desktop git (`desktop/src-tauri/src/commands_git.rs`)

- `git_sync` và `git_pull` dùng cùng thuật toán với web (3.1):
  - commit bản cục bộ, rồi `fetch` + `merge FETCH_HEAD` (bỏ stash và `pull --rebase`);
  - xung đột giữ cả hai bên (bản cục bộ ở đường dẫn gốc, bản remote thành `<tên> (conflict YYYY-MM-DD HHmm).md`);
  - gỡ merge dở dang.
- `git_pull` thêm kiểm tra thư mục là gốc repo.
- `git_sync` trả về danh sách bản xung đột (`Promise<string[]>`, `desktop/src/types/electron.d.ts`). Trang desktop hiện thông báo khi có bản xung đột (bấm để đóng).
- Thêm 5 test Rust: sửa cùng dòng, sửa khác đoạn, xoá ở xa + sửa cục bộ, xoá cục bộ + sửa ở xa, `git_pull` với bản sửa chưa commit.

### WebDAV (`web/server/src/lib/webdavSync.ts`)

- So 3 chiều theo trạng thái lần sync trước, lưu ở cột mới `sync_connections.sync_state`: hash nội dung, cùng ETag (hoặc mtime nếu server không có ETag) của từng file.
- Quy tắc:
  - chỉ một bên đổi → chép sang bên kia (kể cả xoá);
  - hai bên đổi, hoặc chưa có trạng thái mà nội dung khác nhau → bản web giữ chỗ ở cả hai bên, bản server thành bản xung đột;
  - web xoá + server sửa → giữ việc xoá, bản server thành bản xung đột;
  - web sửa + server xoá → giữ bản sửa.
- Trước đây mỗi lần sync đều PUT mọi file, vì export ghi lại file nên mtime luôn mới. Note đã xoá trên web bị kéo về lại.
- Đổi URL hoặc thư mục WebDAV thì xoá trạng thái. `syncState` không trả về cho client.

### Đính kèm (`web/server/src/lib/attachmentSync.ts`)

Ghi hash lúc export; sau khi merge, file nào khác bản đã export (nghĩa là repo đã sửa) thì tải bytes mới lên kho, ghi đè object cũ. Trước đây đường dẫn đã biết bị bỏ qua, nên bản sửa ảnh/PDF từ repo bị mất. Web không bao giờ sửa đính kèm tại chỗ, nên khác nhau nghĩa là sửa từ xa.

### Cộng tác (`web/server/src/collab-server/index.ts`)

- **Lỗi có từ trước, đã sửa:**
  - Room được tạo sau khi nâng cấp WebSocket, nên tin "sync step 1" mà client gửi ngay khi mở kết nối bị mất. Người vào sau có thể không nhận được nội dung. Nay tải room xong mới nâng cấp kết nối.
  - Hai client vào cùng lúc dùng chung một room đang tạo (`pendingRooms`).
- **Giải phóng room** khi người cuối rời đi: lưu nốt thay đổi rồi xoá room. Người vào sau đọc lại DB, nên nội dung sync vừa nhập không còn bị room cũ ghi đè. Có bộ đếm `joining` để room không bị giải phóng giữa lúc có người đang vào.
- **Lưu an toàn:** nếu nội dung DB đã bị nơi khác đổi (sync, sửa ngoài cộng tác), lưu snapshot bản đó trước khi ghi đè. Không ghi vào note đã bị xoá hay đang trong thùng rác.
- **Bảo mật (thuộc 3.3):** người chỉ có quyền xem chỉ được đọc (bỏ step 2 và update của họ); note trong thùng rác bị từ chối (403).

### Giao diện xung đột (web + desktop)

- `@noteriv/core/conflict-copy`: `parseConflictCopy` / `isConflictCopy` nhận diện tên bản xung đột và tìm note gốc.
- `@noteriv/ui/panels` `ConflictBanner`:
  - khung phía trên editor khi đang mở một bản xung đột: giải thích, nút **So sánh** (diff theo dòng bằng `diffStrings`, đỏ = chỉ có ở bản gốc, xanh = chỉ có ở bản này);
  - **Giữ bản gốc** (xoá bản này);
  - **Dùng bản này** (ghi vào bản gốc, xoá bản này, mở bản gốc);
  - **Giữ cả hai** (ẩn khung).
  - Nhãn: web tiếng Việt, desktop tiếng Anh.
- Xoá bản xung đột đều đi vào thùng rác (web) hoặc `.noteriv/trash` (desktop), nên khôi phục được.

## Kiểm chứng

| Kiểm tra | Kết quả |
|---|---|
| `npm run typecheck` (core, ui, web, desktop), `npx tsc --noEmit` (web/server) | Sạch |
| `npm test` | 290 + 71 + 68 = **429 test đạt** (thêm 5 test `conflict-copy`, 4 test `ConflictBanner`) |
| `cargo test --lib commands_git` | **13/13 đạt** (5 test mới) |
| `scripts/test-sync-scenarios.ts` (git, DB dev, Garage) | **ALL PASSED**, thêm "repo sửa bytes ảnh → kho nhận bản mới" |
| `scripts/test-webdav-sync.ts` (mới; server WebDAV tối giản trong script) | **16/16 đạt**: lần đầu, không đổi, sửa ở server, sửa ở web, hai bên sửa, xoá ở server, web xoá, web xoá + server sửa, file mới ở server, mất trạng thái |
| `scripts/test-collab.ts` (mới; chạy collab-server thật, client Yjs tối giản) | **8/8 đạt**: người sửa ghi được, người xem chỉ đọc, snapshot khi DB đổi phía sau, room nạp lại sau khi mọi người rời, note trong thùng rác bị từ chối |
| Trình duyệt thật (web cục bộ + DB dev, tài khoản thử đã xoá) | Khung xung đột hiện đúng; So sánh hiện đỏ/xanh đúng; "Dùng bản này" ghi vào `a.md` và chuyển bản xung đột vào thùng rác; "Giữ bản gốc" giữ `a.md` và chuyển bản xung đột vào thùng rác |

## Chưa kiểm

- Khung xung đột trên **desktop Tauri thật**: mới chạy typecheck. Mã gắn vào desktop dùng cùng component đã thử trên web.
- WebDAV với một server thật (Nextcloud): mới thử bằng server tối giản có ETag.

## Giới hạn đã biết

- WebDAV không có ETag thì so bằng mtime (độ chính xác 1 giây): một lần sửa trên server rơi đúng vào giây upload có thể bị bỏ sót.
- `run_git` của desktop không ép `core.autocrlf=false` như web; máy Windows bật autocrlf có thể đổi kiểu xuống dòng khi merge (có từ trước).

## Migration

`20261017140000_webdav_sync_state` thêm cột `sync_connections.sync_state JSONB` (nullable). Prisma đọc cột này ở mọi truy vấn kết nối, nên trên production phải **áp trước khi deploy** (sao lưu tay → `psql -1` → deploy → `migrate resolve --applied`), như 3.1.

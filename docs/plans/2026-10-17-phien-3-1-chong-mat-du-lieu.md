# Phiên 3.1: Chống mất dữ liệu khi sync git (web)

> Ngày: 2026-10-17 · Chặng: [3](2026-10-17-chang-3-ra-soat-hoan-thien.md) · Nhánh: `covuaduongsinh/chang3-chong-mat-du-lieu`

## Hiện trạng production trước khi sửa (đọc DB, chỉ đọc)

- 1 kết nối GitHub, hai chiều, sync tay; lần sync cuối 2026-10-14. 7 job thành công, 8 job lỗi (cùng ngày 2026-10-14).
- Thùng rác hiện có 0 note. Không biết trước đây có note nào trong thùng rác bị sync xoá hẳn hay không (không có log cho việc này).

## Lỗi đã sửa

| Lỗi | Trước | Sau |
|---|---|---|
| Thùng rác | Mỗi lần sync hai chiều, note trong thùng rác bị `note.delete` (không có file) | Không bao giờ đụng note trong thùng rác |
| Remote xoá file | Note bị xoá hẳn | Note vào thùng rác (khôi phục được), có snapshot |
| Hai bên cùng sửa một note | `stash pop` lỗi bị bỏ qua, ký hiệu `<<<<<<<` bị commit, push và nhập | Git gộp 3 chiều; không gộp được thì bản web giữ chỗ, bản remote thành `<tên> (conflict YYYY-MM-DD HHmm).md` |
| Web xoá, remote sửa | Giống trên | Giữ việc xoá, bản remote thành bản xung đột |
| Remote xoá, web sửa | Giống trên | Giữ bản web |
| Ghi đè khi nhập | Không lưu bản cũ | Snapshot trước mỗi lần ghi đè hoặc chuyển vào thùng rác |
| Sửa trong lúc sync | Bị nội dung file ghi đè; note mới bị xoá | Giữ bản sửa, nội dung file thành bản xung đột; note mới giữ nguyên |
| Hai sync cùng kết nối | Chạy song song chung thư mục scratch | Khoá `sync_locked_at`; sync thứ hai bỏ qua (`"skipped"`), khoá quá 30 phút coi như bỏ |

## Mã đã đổi

- `web/server/src/lib/gitSync.ts`:
  - `gitSyncCore` theo thứ tự: commit export → `fetch` + `merge FETCH_HEAD` → `resolveConflictsKeepBoth` (dựa trên stage của `git ls-files -u`, dùng `checkout --ours/--theirs`, an toàn với file nhị phân) → commit → push;
  - hàm `conflictCopyPath`;
  - gỡ merge dở dang ở đầu sync và ở `adoptRemoteTip`;
  - chế độ chỉ kéo (pull-only) bỏ thay đổi cục bộ thay vì stash.
- `web/server/src/lib/vaultFs.ts`: `importDirToNotes(…, { transform, exportedAt })` trả `{ conflictCopies, trashed }`.
- `web/server/src/lib/noteSnapshots.ts`: `snapshotBeforeOverwrite`.
- `web/server/src/lib/syncRunner.ts`:
  - `runSyncJob` lấy và nhả khoá, trả `"done" | "skipped"`;
  - có bản xung đột thì job vẫn `success`, kèm cảnh báo tiếng Việt (giao diện Sync đã hiện cảnh báo của job thành công);
  - `conflictFiles` và `lastSyncStatus.conflictCopies` ghi các bản xung đột.
- `web/server/prisma/schema.prisma` + migration `20261017120000_sync_lock`: thêm cột `sync_connections.sync_locked_at`.
- `web/server/scripts/test-sync-scenarios.ts`:
  - viết lại kịch bản 3–4;
  - thêm: sửa cùng dòng, sửa khác đoạn, thùng rác và remote sửa, remote xoá và web sửa, remote xoá, thùng rác qua nhiều lần sync, snapshot, sửa trong lúc sync, hai sync cùng lúc, tên bản xung đột.

## Kiểm chứng

- `npx tsc --noEmit` (web/server) sạch.
- Migration đã áp lên DB dev.
- `npx tsx scripts/test-sync-scenarios.ts` (DB dev qua tunnel, repo bare cục bộ, Garage): **ALL PASSED**. Lần chạy đầu có 1 FAIL do bản clone thử trên Windows đổi xuống dòng thành CRLF (mã sync dùng `core.autocrlf=false`); đã sửa phép so trong test.

## Chưa làm trong phiên này (thuộc 3.2)

- Giao diện so sánh bản xung đột. Hiện bản xung đột là note thường, có tên "(conflict …)", kèm cảnh báo trong Cài đặt → Sync.
- Desktop git, WebDAV, đính kèm (theo hash), room cộng tác.

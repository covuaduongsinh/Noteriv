# Sao lưu và khôi phục Noteriv

> Dành cho chủ dự án (không cần biết lập trình) và cho các phiên Claude. Cập nhật lần cuối: 2026-10-15.
> Chi tiết kỹ thuật: [`web/infra/backup/README.md`](../../web/infra/backup/README.md).

## 1. Sao lưu nằm ở đâu, gồm những gì

- **Nơi lưu:** repo GitHub **riêng tư** `covuaduongsinh/noteriv-backups`. Không bao giờ chuyển repo này sang công khai.
- **Khi nào:** mỗi đêm lúc **02:00** (giờ Việt Nam), do container `noteriv-backup` trên VPS tự chạy.
- **Gồm:** toàn bộ cơ sở dữ liệu (ghi chú, tài khoản, cài đặt…), mọi file đính kèm, và các khoá bí mật của máy chủ (cần để chạy lại hệ thống).
- **Đã mã hoá:** mọi thứ trong repo (trừ `manifest.json` chỉ chứa số liệu tổng) được khoá bằng **khoá age**. Người có quyền vào repo mà **không có khoá bí mật** thì không đọc được gì.

### "Khe" là gì
Mỗi bản sao lưu nằm trong một nhánh gọi là "khe". Bản mới đè lên bản cũ cùng khe, nên repo không phình mãi:

| Khe | Giữ được |
|---|---|
| `daily-mon` … `daily-sun` | 7 ngày gần nhất (theo thứ trong tuần) |
| `weekly-0` … `weekly-3` | 4 Chủ nhật gần nhất |
| `monthly-01` … `monthly-12` | ngày 1 của 12 tháng gần nhất |

Đính kèm nằm riêng ở nhánh `attachments`: mỗi file chỉ lưu một lần và không bao giờ bị xoá khỏi đó. Nhánh này là nhánh mặc định của repo.

> Clone nhánh `attachments` về máy Windows sẽ báo "Filename too long" (giới hạn đường dẫn của Windows). Không sao: việc khôi phục luôn chạy trong container Linux trên VPS.

## 2. Khoá bí mật — quan trọng nhất

- File khoá: `backup-age.key` (dòng bắt đầu bằng `AGE-SECRET-KEY-1…`). Bản gốc tạo ngày 2026-10-14 trên máy Windows của chủ dự án tại `C:\Users\duongsinh\.config\noteriv\backup-age.key`.
- **Phải có 2 bản cất riêng:** (1) trong trình quản lý mật khẩu, (2) USB hoặc bản in để ở nơi khác.
- **Mất cả hai bản = không khôi phục được bất cứ thứ gì.** Lộ khoá thì ai có repo cũng đọc được dữ liệu: xem mục 6 để thay khoá.
- Khoá bí mật **không bao giờ** nằm trên VPS (trừ vài phút khi diễn tập/khôi phục, rồi xoá ngay), không dán vào chat, không gửi email.
- Khoá công khai (`age1arkx…`, an toàn để lộ) nằm trong env Dokploy, tên `BACKUP_AGE_RECIPIENT`.

## 3. Làm sao biết sao lưu vẫn chạy

- **healthchecks.io** nhận tín hiệu mỗi đêm. Quá 1 ngày + 2 giờ không có tín hiệu, hoặc lần chạy báo lỗi, thì bạn nhận **email cảnh báo**.
- Tự xem: vào repo `noteriv-backups` → danh sách nhánh → nhánh `daily-<hôm nay>` có thời gian cập nhật mới; mở `manifest.json` xem số user, ghi chú, đính kèm.

## 4. Khi nhận email "backup failed"

Không cần hoảng: dữ liệu đang chạy vẫn nguyên, chỉ là bản sao lưu đêm đó chưa có. Nhờ một phiên Claude:
1. Xem log: `ssh 217.15.160.118 'docker logs --tail 80 $(docker ps --format "{{.Names}}" | grep noteriv-backup)'`.
2. Nguyên nhân hay gặp:
   - "attachments … exceed the limit": đính kèm đã vượt 1,5GB. DB vẫn được sao lưu. Cần quyết định chuyển đính kèm sang Cloudflare R2 / Backblaze B2.
   - Lỗi `Permission denied (publickey)`: deploy key bị xoá khỏi repo, hoặc `BACKUP_DEPLOY_KEY_B64` sai.
   - Lỗi kết nối DB/Garage: kiểm container `noteriv-postgres`, `noteriv-garage` có đang chạy không.
   - Thiếu biến (`missing env: …`): thêm biến đó vào env compose trong Dokploy rồi redeploy.
3. Sửa xong, chạy tay một lần: `docker exec <container noteriv-backup> /backup/backup.sh`, xem healthchecks chuyển xanh.

## 5. Khôi phục

### 5a. Diễn tập (nên làm 3 tháng/lần, và sau mỗi thay đổi lớn)
Phiên Claude làm theo mục "Restore drill" trong `web/infra/backup/README.md`. Tóm tắt:
1. Dựng Postgres + Garage **tạm** trên VPS (`drill.sh up`) — tách khỏi hệ thống thật.
2. Chủ dự án cho phép chép khoá bí mật lên VPS **tạm thời** (`/dev/shm`, bộ nhớ RAM).
3. Chạy `restore.sh <khe>`: phải thấy tất cả dòng `OK` và câu "all checks match the manifest".
4. **Dọn ngay:** `shred -u` file khoá, `drill.sh down`. Kiểm không còn container/volume `drill`.
5. Ghi ngày diễn tập vào bảng Trạng thái của Giai đoạn 0.

### 5b. Khôi phục thật (mất dữ liệu, hỏng VPS)
Chỉ làm khi chủ dự án đồng ý, và chọn khe **trước** thời điểm sự cố (ví dụ dữ liệu bị xoá nhầm sáng thứ Tư → chọn `daily-tue`).
1. **Lấy lại khoá máy chủ:** `restore.sh <khe> --show-secrets` (cần khoá age) in ra `POSTGRES_PASSWORD`, `JWT_*`, `ENCRYPTION_KEY`… Nếu dựng lại trên VPS mới, đưa đúng các giá trị này vào env Dokploy — đặc biệt `ENCRYPTION_KEY`, thiếu nó thì token đồng bộ GitHub/WebDAV của người dùng không giải mã được (người dùng phải kết nối lại).
2. **Dừng** `noteriv-api`, `noteriv-worker`, `noteriv-collab` để không ai ghi vào trong lúc khôi phục.
3. Chuẩn bị DB **trống**: nếu volume Postgres còn dữ liệu hỏng, đổi tên/giữ lại volume cũ (không xoá) rồi để Dokploy tạo volume mới. `restore.sh` tự từ chối nếu DB đích còn bảng.
4. Garage: nếu volume Garage mất, chạy `web/infra/garage-bootstrap.sh` để tạo bucket và key mới, cập nhật `ATTACHMENTS_S3_*` trong Dokploy. Nếu Garage còn nguyên thì chỉ khôi phục DB (`--skip-attachments`).
5. Chạy `restore.sh <khe>` bằng image `noteriv-backup` với `TARGET_DATABASE_URL` / `TARGET_S3_*` trỏ vào DB và Garage mới (cùng mạng compose). Phải thấy toàn bộ dòng `OK`.
6. Chạy migration: `docker exec <noteriv-api> npx prisma migrate deploy` (nếu mã nguồn mới hơn bản sao lưu).
7. Bật lại các service, kiểm: trang chủ 200, đăng nhập, mở vài ghi chú, xem đính kèm, menu Developer → Chẩn đoán xanh.
8. Xoá khoá bí mật khỏi VPS. Báo cho người dùng: dữ liệu được khôi phục về thời điểm nào (ghi trong `manifest.json`, `createdAt`), những gì tạo sau đó bị mất.

## 6. Thay khoá

- **Deploy key** (nghi bị lộ, chỉ ảnh hưởng repo backup, dữ liệu vẫn đã mã hoá): tạo khoá mới (`ssh-keygen -t ed25519`), thêm vào repo với quyền ghi, đổi `BACKUP_DEPLOY_KEY_B64` trong Dokploy, redeploy, xoá khoá cũ khỏi repo.
- **Khoá age** (nghi bị lộ): tạo cặp mới, đổi `BACKUP_AGE_RECIPIENT`, redeploy. Các bản cũ vẫn chỉ mở được bằng khoá cũ: giữ khoá cũ cho tới khi mọi khe đã được ghi đè (sau 12 tháng), hoặc xoá các nhánh cũ và nhánh `attachments` để chạy lại từ đầu. Nếu khoá cũ thật sự đã lộ, nên xoá hết nhánh cũ ngay.
- Dọn khe thử nghiệm: `gh api -X DELETE repos/covuaduongsinh/noteriv-backups/git/refs/heads/<khe>`.

## 7. Ai cần báo
- Có sự cố mất dữ liệu: chủ dự án quyết định khôi phục; báo giáo viên/học viên bị ảnh hưởng về thời điểm dữ liệu được khôi phục.
- Email cảnh báo healthchecks gửi tới email chủ dự án đăng ký ở healthchecks.io.

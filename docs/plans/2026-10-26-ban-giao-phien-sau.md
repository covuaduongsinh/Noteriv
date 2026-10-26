# Bàn giao sang phiên sau (2026-10-26)

> Đọc kèm: [hướng dẫn bàn giao chung](2026-10-14-huong-dan-ban-giao-phien.md), [kế hoạch Chặng K](2026-10-20-chang-k-kiem-chung.md) (bảng Trạng thái), [lỗi và góp ý](../kiem-chung/loi-va-gop-y.md).

## Đang ở đâu

- Chặng K, tuần 1 (21–27/10). Chặng 6 chỉ bắt đầu sau báo cáo quyết định (~2026-12-02).
- **App Android:** M1–M4 đã merge (PR #39, #41–#44). Chưa thử trên máy thật, chưa phát hành APK release. Keystore ở `~/.config/noteriv/android-release.jks`, kèm GitHub Secrets.
- **Đối thủ:** hồ sơ bàn giấy đủ 12 app cộng Noteriv, đã có điểm và bản nháp mục 5–6 trong [doi-thu.md](../kiem-chung/doi-thu.md) (PR #46, đã merge).
- **Mọi mặt:** chi phí ([chi-phi.md](../kiem-chung/chi-phi.md)), pháp lý và thanh toán ([phap-ly.md](../kiem-chung/phap-ly.md)), hiệu năng và bảo mật trong [moi-mat.md](../kiem-chung/moi-mat.md) (PR tài liệu của phiên này).
- **Bảo mật:** rà soát chỉ đọc code ngày 2026-10-26. Báo cáo đầy đủ nằm ngoài repo (`~/.config/noteriv/bao-mat-2026-10-26.md`), vì repo công khai và báo cáo còn mô tả các lỗ chưa vá.

## PR đang mở, chờ chủ dự án duyệt merge

1. **PR #47 (K-B1): vá worker sync.** Gồm C1–C3 và H1 (đường dẫn, tên branch, symlink, host nội bộ), đã qua 2 lượt review, CI xanh. Ghi chú: [phiên K-B1](2026-10-26-phien-k-b1-bao-mat-server.md). Đây là lỗi mức **Chặn**, nên merge sớm.
   - Sau merge, kiểm deploy production (`deployment.allByCompose`).
   - Kiểm lại kết nối GitHub sync của chủ dự án vẫn chạy: nay chỉ nhận URL `https`, host công khai, branch hợp lệ.
2. **PR tài liệu tuần 1 (phần 2):** kết quả kịch bản 16–17, lỗi #5–#8, `chi-phi.md`, `phap-ly.md`, script `scripts/perf/measure-vault.mjs`, và chính file này.

## Việc còn lại, theo thứ tự đề xuất

1. **K-B2: bảo mật desktop và phone** (lỗi #7). Rust: lọc `..` trong đường dẫn WebDAV của desktop (`commands_sync.rs`), `vault_create`/`vault_update` chỉ nhận đường dẫn chọn qua dialog, mọi lệnh `git_*` kiểm scope cộng `--`. Phone: token vào `expo-secure-store`, tắt `allowBackup`. Cần chạy smoke desktop (RAM máy này ít: build với `CARGO_BUILD_JOBS=2`).
2. **K-B3: bảo mật server mức Trung bình/Thấp** (lỗi #8): `ADMIN_EMAILS` đòi email đã xác minh, đính kèm `Content-Disposition: attachment` cho loại không an toàn, phát hiện refresh token bị dùng lại, collab kiểm Origin và `maxPayload`, diagnostics chỉ cho admin, xoá tài khoản hỏi lại mật khẩu, container không chạy root, worker vào mạng chỉ đi ra Internet.
3. **Lỗi #5 (Nặng): plugin quét vault bằng một request mỗi note**, vướng giới hạn 300 request/phút ở production. Thêm endpoint đọc nội dung theo lô cho web (`VaultApi.read` hàng loạt, hoặc `scanVault` dùng nó), rồi đo lại bằng `scripts/perf/measure-vault.mjs`.
4. **Chặng K, phần Claude các tuần sau:**
   - doi-thu mục 6: tra hai khác biệt còn "chưa xác minh" (sandbox plugin của đối thủ, ngôn ngữ giao diện tiếng Việt).
   - moi-mat mục 4: tra sơ bộ nhãn hiệu 5–10 tên ứng viên. Tên do chủ dự án đưa, hoặc Claude đề xuất để chủ dự án chọn.
   - moi-mat mục 5: giả thuyết giá theo mặt bằng đối thủ, điểm hoà vốn từ `chi-phi.md`.
   - moi-mat mục 6: năng lực.
   - Phân loại nhật ký hằng tuần.
5. **Kịch bản 18–19** (diễn tập khôi phục, API sập) cần staging. Staging đang tắt; bật nó là deploy, nên hỏi chủ dự án trước.
6. **Phần của chủ dự án** (Claude chỉ nhắc):
   - Ghi nhật ký hằng ngày, nhập ghi chú thật.
   - Xem `/admin/stats` để điền số liệu nền.
   - Chạy kịch bản loại C trên thiết bị thật.
   - Cài APK. Muốn phát hành thì tăng `versionCode` rồi gắn tag `phone-v1.0.0`.
   - Sao lưu keystore ra ngoài máy.

## Lưu ý kỹ thuật cho phiên sau

- **Worktree làm việc:** `D:\code\Noteriv-k-m1b`. Đã `npm ci` ở gốc và ở `web/server`. `phone/node_modules` không có sẵn; mượn của thư mục chính bằng junction, gỡ junction bằng `cmd /c rmdir`. **Không đụng** `D:\code\Noteriv` (nhánh M1b cũ, có file chưa commit của chủ dự án).
- **`git stash` dùng chung giữa các worktree.** Stash "chessboard plugin WIP" là của chủ dự án: không pop, không drop.
- **Đo hiệu năng:**
  - Mở tunnel SSH cổng 55432, 56379, 59000.
  - Chạy API bằng `REGISTRATION_MODE=open RATE_LIMIT_PER_MINUTE=100000 npx tsx --env-file=.env src/index.ts` trong `web/server`.
  - Chạy web bằng `npx next start -p 3457`.
  - Đo bằng `node scripts/perf/measure-vault.mjs --web http://127.0.0.1:3457 --email perf-k@example.test --password "$(cat ~/.config/noteriv/perf-k.pass)" --vault "Perf 2000"`.
  - Dọn tài khoản thử bằng `node scripts/perf/seed-vault.mjs --api http://127.0.0.1:4001 --email perf-k@example.test --password … --cleanup`.
  - Chủ dự án đã cho phép dùng DB dev cho việc này (2026-10-26).
- **Quyền:** hệ thống quyền chặn mọi lệnh đọc database production. Số liệu production phải để chủ dự án xem.
- **Shell:** lớp Bash bỏ escape của `\` trong heredoc. Với chuỗi có `\`, dùng Edit/Write hoặc ghi script Python ra file rồi chạy.
- **Kiểm thử server:** `npx tsx scripts/test-security.ts` (không cần DB, có trong CI) và `npx tsx --env-file=.env scripts/test-sync-scenarios.ts` (cần tunnel).

## Lệnh mở phiên sau

Dán vào phiên mới, mở tại `D:\code\Noteriv`:

```
Đọc docs/plans/2026-10-26-ban-giao-phien-sau.md (trên main, hoặc nhánh covuaduongsinh/k-kiem-chung-tuan1b nếu PR tài liệu chưa merge) và docs/plans/2026-10-14-huong-dan-ban-giao-phien.md. Làm việc trong worktree D:\code\Noteriv-k-m1b, không đụng D:\code\Noteriv. Bắt đầu bằng việc hỏi tôi có merge PR #47 (vá bảo mật worker sync) và PR tài liệu tuần 1 không; sau đó làm tiếp "Việc còn lại" theo thứ tự (K-B2, K-B3, lỗi #5, phần Claude của Chặng K). Mỗi việc sửa là một phiên nhỏ: plan trong docs/plans, nhánh riêng, review độc lập, PR, hỏi trước khi merge.
```

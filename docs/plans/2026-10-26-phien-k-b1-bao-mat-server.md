# Phiên K-B1: Vá bảo mật phía server (worker sync)

> Ngày: 2026-10-26 · Chặng: [K](2026-10-20-chang-k-kiem-chung.md), mục "sửa lỗi Chặn/Nặng" · Nhánh: `covuaduongsinh/k-bao-mat-server`
> Nguồn: rà soát bảo mật của Chặng K (mục 2 của [moi-mat.md](../kiem-chung/moi-mat.md)), ngày 2026-10-26. Ghi vào [loi-va-gop-y.md](../kiem-chung/loi-va-gop-y.md).

## Vì sao gấp

Worker sync giữ `DATABASE_URL`, `ENCRYPTION_KEY` (giải mã token Git/WebDAV của mọi người) và khoá S3, lại chạy bằng root. Rà soát tìm ra ba cách để một người dùng đã đăng nhập ghi hoặc đọc file tuỳ ý trên worker. Production hiện chỉ cho đăng ký bằng mã mời, và chỉ có chủ dự án dùng, nên rủi ro trước mắt thấp. Dù vậy, cả ba phải được vá trước khi mở cho người khác.

## Đã vá

| Mã | Lỗ hổng | Cách vá |
|---|---|---|
| C1 | Tên note/thư mục chỉ bị kiểm độ dài, nên `../x.md` hay `.git/hooks/…` được ghi ra ngoài thư mục scratch khi sync | Thêm `lib/vaultPaths.ts`: `vaultSegmentError` cho mỗi tên, `isSafeVaultPath` cho cả đường dẫn, `safeJoin` cho mọi lần ghi file. Route note và thư mục từ chối tên chứa `/`, `\`, `.`, `..`, `.git` hoặc ký tự điều khiển. Route nhập dữ liệu và Ghi nhanh cũng kiểm như vậy. Lúc export, dữ liệu cũ không hợp lệ được bỏ qua, có ghi log |
| C2 | Tên branch bắt đầu bằng `-` được git đọc thành tuỳ chọn; `remoteUrl` nhận cả `file://` | Route chỉ nhận URL `https:` và tên branch theo quy tắc ref của git (`isSafeBranch`). Worker kiểm lại branch ở mọi điểm vào. Mọi lệnh `fetch`/`push`/`ls-remote` có `--` trước đối số vị trí. Git chỉ được dùng giao thức `https` (`protocol.allow=never`, `protocol.https.allow=always`) |
| C3 | Symlink trong repo remote được đi theo khi nhập, nên đọc được file trên worker | Git chạy với `core.symlinks=false`, nên symlink được checkout thành file thường. Lúc nhập chỉ đọc file thường (`isFile()`), cho cả note lẫn đính kèm |
| H1 | WebDAV: `href` có `..` ghi được file ra ngoài; axios đi theo redirect vào mạng nội bộ; URL được trỏ thẳng vào địa chỉ nội bộ | Danh sách từ server chỉ nhận đường dẫn an toàn, và ghi qua `safeJoin`. Đặt `maxRedirects: 0`. Thêm `lib/remoteHost.ts`: trước khi sync hay thử kết nối (Git và WebDAV), phân giải tên miền và từ chối nếu có địa chỉ nội bộ (loopback, mạng riêng, link-local/metadata, CGNAT) |
| L4 | Tên entry trong zip export lấy từ đường dẫn note, có thể chứa `..` | Bỏ qua đường dẫn không an toàn khi xuất zip |

Bộ kịch bản sync chạy với repo cục bộ, nên bật `SYNC_ALLOW_LOCAL_REMOTES=1` để mở lại giao thức `file` và bỏ qua bước kiểm host. Biến này chỉ đặt trong script test, không đặt ở production.

**Chưa che:** tên miền đổi địa chỉ giữa lúc kiểm và lúc git/axios kết nối (DNS rebinding). Phần còn lại là việc của mạng: cho worker vào một mạng chỉ đi ra Internet, ghi ở K-B3.

## Để phiên sau

- **K-B2 (desktop, phone):** H2 (WebDAV trên desktop ghi ra ngoài vault), H3 (lệnh vault/git của Tauri bỏ qua scope), M3 (token GitHub của phone nằm trong AsyncStorage, `allowBackup` đang bật).
- **K-B3:**
  - M1: `ADMIN_EMAILS` phải đòi email đã xác minh.
  - M2: đính kèm trả `inline` với Content-Type do người upload chọn.
  - M4: refresh token không phát hiện bị dùng lại.
  - M5: collab không kiểm Origin, payload tới 100 MB.
  - L1–L3, L5, L6: diagnostics lộ hạ tầng, xoá tài khoản không hỏi lại mật khẩu, giới hạn đăng nhập chỉ theo IP, CSRF, container chạy root.
  - Mạng egress-only cho worker.

## Kiểm thử

- `web/server/scripts/test-security.ts` (mới, chạy `npx tsx scripts/test-security.ts`, không cần DB): **69/69 PASS**.
  - Tên và đường dẫn hợp lệ/không hợp lệ, `safeJoin`, tên branch.
  - Địa chỉ nội bộ/công khai; remote `127.0.0.1`, `localhost`, `169.254.169.254`, `[::1]`, `10.x` bị từ chối.
  - Remote cục bộ bị từ chối khi không bật biến test.
  - Một repo có symlink trỏ tới file "bí mật" được checkout thành file thường, không đọc ra bí mật.
  - Branch `--upload-pack=x` bị từ chối.
- Kiểm tay: git chặn `file` khi giới hạn giao thức (`fatal: transport 'file' not allowed`), và từ chối đối số giả dạng tuỳ chọn sau `--`.
- `scripts/test-sync-scenarios.ts` (DB dev qua tunnel): 52/52 PASS, giữ nguyên như trước.
- `tsc` của server sạch.
- Web luôn tách đường dẫn thành thư mục cộng tên trước khi gọi API (`webVaultAdapter.splitPath`), nên quy tắc tên mới không làm hỏng luồng nào. Riêng người dùng tự gõ `/` khi đổi tên thì nay nhận lỗi; trước đây trường hợp đó tạo ra một đường dẫn sai.

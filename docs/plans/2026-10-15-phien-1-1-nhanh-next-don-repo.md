# Phiên 1.1: Nhánh `next`, dọn repo, ghi công — kế hoạch chi tiết

## Bối cảnh

Giai đoạn 0 đã đóng (2026-10-15). Giai đoạn 1 (`docs/plans/2026-10-14-giai-doan-1-tach-repo-package-chung-plugin-api.md`) tái cấu trúc để web và desktop dùng chung mã; phiên 1.1 là phần chuẩn bị, **không đổi mã ứng dụng**: ghi công và giấy phép đúng cho một fork, đưa file nhị phân 84MB ra khỏi cây thư mục, viết README nói rõ hướng Chess PKM và mô hình nhánh, bảo vệ `main`. Nhánh `next` và staging đã có từ phiên 0.2.

Quyết định đã chốt với chủ dự án:
- **APK:** đăng lên **GitHub Releases** của repo (ghi rõ đây là bản dựng của upstream, không do dự án build), rồi gỡ khỏi cây thư mục. Không viết lại lịch sử git.
- **Bản quyền:** thêm dòng `Copyright (c) 2026 Phùng Đức Tường` vào `LICENSE`, giữ nguyên dòng của Jace.
- **Nơi làm việc:** chủ dự án đẩy `next` lên `origin` rồi dùng **worktree riêng cho `next`** (tạo bằng Orca); thư mục `D:\code\Noteriv` giữ `main` và dev server của chủ dự án.

## Phát hiện (chỉ đọc)

- `app-apk/noteriv.apk` là file duy nhất trong thư mục đó; `README.md:496` dẫn tới nó (`[Android APK](app-apk/noteriv.apk)`), nên gỡ file mà không sửa README sẽ gãy liên kết. Chỉ README nhắc tới nó.
- `.gitignore` chưa có `*.apk`.
- `LICENSE` là MIT, `Copyright (c) 2026 Jace`. Chưa có `NOTICE.md`, chưa có `docs/upstream-notes.md`.
- `README.md` (500+ dòng) là README của upstream: banner, link `noteriv.com`, `docs.noteriv.com`, Google Play và App Store của `com.ironstacksoftware.noteriv` (đều là của upstream), mô tả tính năng desktop. Giữ nguyên toàn bộ sẽ khiến người đọc tưởng đó là sản phẩm và kênh phân phối của dự án này.
- Remote `upstream` có các nhánh `main`, `feat/planned-features-v1.2`, `rust-rewrite` (theo `.git/packed-refs`); chưa xem nội dung.
- Nhánh `next` đang **ahead 10 commit** so với `origin/next` (toàn tài liệu và merge); chưa push vì mỗi lần push `next` làm staging tự build.

## Các bước

### Bước 0 — Chuẩn bị nơi làm việc (cần chủ dự án)
1. Tôi kiểm đĩa VPS (`df`), **hỏi rồi** `git push origin next` (10 commit). Staging sẽ tự build ~7 phút rồi chạy; xong tôi tắt lại.
2. Chủ dự án tạo worktree bằng Orca từ `origin/next` (hoặc tôi chạy `git worktree add D:\code\Noteriv-next next` nếu bạn thích), rồi báo đường dẫn.
3. Tôi kiểm trong worktree: `git status`, nhánh `next`, `git log -1` trùng `origin/next`, và `main` ở thư mục gốc không bị đụng. Phiên 1.1 **không cần `npm install`** (chỉ tài liệu và xoá file).

### Bước 1 — Nhánh làm việc
- Trong worktree: `git checkout -b phase1/repo-cleanup` từ `next`. Không đụng file chưa commit của chủ dự án (chúng nằm ở thư mục gốc, không có trong worktree); `git add` từng file.

### Bước 2 — APK sang GitHub Releases
- Lấy dữ kiện cho ghi chú: `sha256sum app-apk/noteriv.apk`, kích thước, commit cuối thay đổi file (`git log -1 -- app-apk/noteriv.apk`).
- `gh repo view --json visibility` để biết Release sẽ công khai hay chỉ cộng tác viên thấy; nói rõ với chủ dự án.
- **Hỏi lại ngay trước khi tải** (xuất bản công khai một tệp nhị phân): `gh release create upstream-apk-2026-10-15 app-apk/noteriv.apk --title "Android APK (upstream build)" --notes "…"`. Ghi chú nêu: do tác giả upstream (`thejacedev/Noteriv`) dựng, dự án này không build hay bảo đảm; sha256; nguồn; khuyến nghị cài từ Google Play khi có thể.
- Sau khi Release xác nhận có file (tải lại header hoặc `gh release view`): `git rm app-apk/noteriv.apk`, thêm `*.apk` vào `.gitignore`.

### Bước 3 — Giấy phép và ghi công
- `LICENSE`: thêm dòng `Copyright (c) 2026 Phùng Đức Tường` ngay dưới dòng của Jace; giữ nguyên toàn bộ văn bản MIT.
- `NOTICE.md` (mới, tiếng Anh vì là tệp giấy phép): nguồn gốc fork từ `thejacedev/Noteriv` (MIT, © 2026 Jace), remote `upstream`; những gì thêm mới ở đây (web app, server, hạ tầng) thuộc người đóng góp; APK ở Releases do upstream dựng; quy tắc khi nhập mã bên thứ ba (đặc biệt từ ChessNote, Giai đoạn 3): mỗi thành phần ghi tên, nguồn, giấy phép, phiên bản **tại thời điểm nhập**, và chỉ nhập khi tương thích MIT. Không liệt kê thành phần chưa nhập.

### Bước 4 — README
- Thêm **phần đầu mới** (khoảng 50–70 dòng) trước nội dung hiện có: Noteriv web là gì và hướng Chess PKM (thay ChessNote), quan hệ với upstream (fork, MIT, link), địa chỉ production (đăng ký bằng mã mời) và staging, mô hình nhánh (`main` = production, `next` = tái cấu trúc, `phase*/…`), liên kết `docs/plans/`, `docs/ops/`, `NOTICE.md`, nơi báo lỗi bảo mật/liên hệ.
- Giữ phần README cũ bên dưới một tiêu đề **"Upstream desktop app reference"**, có ghi chú rõ: các liên kết website, docs, Google Play, App Store là của **upstream**; `phone/` không còn được duy trì ở đây (sẽ thay bằng PWA ở Giai đoạn 5); thay link APK (dòng 496) bằng link Release. Không xoá nội dung tính năng.
- Kiểm không còn link tương đối nào trỏ vào file đã gỡ: `grep -rn "app-apk" --include=*.md --include=*.json --include=*.yml .`.

### Bước 5 — Theo dõi upstream
- `git fetch upstream`; `git log --oneline main..upstream/main` (kỳ vọng rỗng, như đo ngày 2026-10-14); xem `upstream/feat/planned-features-v1.2` và `upstream/rust-rewrite` có gì đáng học (chỉ đọc, không merge).
- Mới: `docs/upstream-notes.md` (tiếng Việt): ngày kiểm, kết quả, ý tưởng đáng làm lại, quy tắc: chỉ học ý tưởng, không merge; kiểm hằng tháng; cherry-pick vá bảo mật vào `desktop/` nếu còn áp dụng.

### Bước 6 — Bảo vệ `main`
- `gh api repos/covuaduongsinh/Noteriv/branches/main/protection` để xem hiện trạng. **Hỏi chủ dự án rồi** mới đặt: cấm force-push và cấm xoá nhánh, **không** bắt review hay status check (repo một người; không được chặn push thường vì quy trình hiện tại push thẳng vào `main`).
- Nếu GitHub trả 403/"upgrade" (nhánh riêng tư trên gói miễn phí không có tính năng này): ghi lại, **không** tìm đường vòng; nêu lựa chọn cho chủ dự án (tự giữ kỷ luật không force-push, hoặc nâng gói).

### Bước 7 — Tài liệu và gộp
- Chép kế hoạch này sang `docs/plans/2026-10-15-phien-1-1-nhanh-next-don-repo.md`.
- Cập nhật `docs/plans/2026-10-14-huong-dan-ban-giao-phien.md`: dùng worktree (đường dẫn, ai tạo, `D:\code\Noteriv` = `main`), APK đã chuyển, NOTICE/README mới, khu vực `docs/upstream-notes.md`. Cập nhật bảng "Trạng thái" dòng 1.1 trong file Giai đoạn 1.
- Merge `phase1/repo-cleanup` vào `next` (trong worktree); **hỏi rồi** push `next`. Không đụng `main`, không deploy production.

## Tệp chính
- Sửa: `LICENSE`, `README.md`, `.gitignore`, `docs/plans/2026-10-14-huong-dan-ban-giao-phien.md`, `docs/plans/2026-10-14-giai-doan-1-…md` (bảng trạng thái).
- Mới: `NOTICE.md`, `docs/upstream-notes.md`, `docs/plans/2026-10-15-phien-1-1-nhanh-next-don-repo.md`.
- Xoá: `app-apk/noteriv.apk` (chỉ trên `next`; `main` giữ nguyên cho tới khi gộp ở mốc).
- Ngoài repo: GitHub Release `upstream-apk-2026-10-15`; cấu hình bảo vệ `main`.

## Kiểm chứng (điều kiện "xong")
- `git ls-files | grep -i apk` rỗng trên `next`; `main` vẫn còn file; Release có file, sha256 trùng bản gốc.
- `README.md` mở đầu bằng phần mới; mọi link nội bộ hợp lệ (`grep` không còn `app-apk/`); link APK trỏ Release; có ghi chú rõ các link marketing là của upstream.
- `LICENSE` có cả hai dòng bản quyền, văn bản MIT nguyên vẹn; `NOTICE.md` có mặt.
- `git fetch upstream` chạy được; `docs/upstream-notes.md` có kết quả thật.
- `main` được bảo vệ (hoặc ghi rõ lý do không được).
- Staging build từ `next` (sau push) vẫn xanh và production **không** deploy lại (đối chiếu số lần deploy của compose production trước và sau).
- Worktree sạch, không file ngoài ý muốn; thư mục gốc `D:\code\Noteriv` vẫn trên `main`, file chessboard chưa commit của chủ dự án còn nguyên.

## Điểm dừng để hỏi chủ dự án
Push `next` (staging build lại); tải APK lên Release (công khai); đặt bảo vệ `main`; push sau khi merge; mọi thao tác trên Docker daemon.

## Rủi ro
- Orca tạo worktree từ `origin/next` nhưng `next` chưa push → thiếu 10 commit: hence Bước 0.1 push trước.
- Mỗi push `next` bật lại staging và tốn 3–5GB đĩa khi build (đĩa 89%): kiểm `df`, gộp nhiều thay đổi vào ít lần push; tắt staging sau khi xong.
- README cũ có thông tin sai cho dự án này (kênh phân phối, website): phần mới và ghi chú nhãn "upstream" giảm hiểu nhầm.
- Chưa tách repo (đã chốt ở phụ lục Giai đoạn 1): phiên này không thay đổi điều đó.

## Chưa nằm trong phiên này
`npm workspaces`, `@noteriv/core` và mọi thay đổi mã (phiên 1.2); gỡ `phone/`; tách repo.

## Điều chỉnh khi thực hiện (2026-10-15)

- **APK:** không đăng lên Releases. Bằng chứng: blob `app-apk/noteriv.apk` (`62a761b2…`) giống hệt blob trên `upstream/main`, và commit duy nhất từng chạm vào file là `a7d7b79` (2026-06-02) của `thejacedev`; chủ dự án chọn **không tải lên, README dẫn tới bản upstream đang host**. Tệp đã gỡ khỏi cây thư mục (vẫn nằm trong lịch sử git).
- **Worktree:** Orca đặt tên nhánh là `covuaduongsinh/phase1-repo-cleanup` (có tiền tố tài khoản), không phải `phase1/repo-cleanup`.
- **README:** phần mới được thêm trước README gốc, không viết lại toàn bộ.
- Bảo vệ nhánh `main` và push: chờ chủ dự án đồng ý (xem bảng Trạng thái).

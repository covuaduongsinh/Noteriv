# Kế hoạch hoàn thiện đợt 3 (sau khi bạn thử trên production)

> Khi được duyệt: sao chép file này vào `docs/plans/2026-10-14-noteriv-web-polish-round3.md`.

## Bối cảnh

Bạn đã thử bản deploy mới. **Đã đúng:** hiện số từ (Word Count), cuộn chuột và thanh cuộn, panel Outline/Tags/Bookmarks, Calendar, Flashcard, cấp quyền plugin và bàn cờ hiện trong note. **Còn lại:** (1) "Sync ngay" vẫn lỗi (đổi từ `spawn git ENOENT` sang `connect ECONNREFUSED 127.0.0.1:59000`); (2) bấm "+" ở tab bar không tạo file; (3) thanh icon bên trái dài quá màn hình, mất nút Settings ở đáy; (4) chưa có menu Developer; (5) chưa thấy nút Command palette (desktop có nút `>_` trên ribbon); (6) Export PDF mở hộp thoại in, bàn cờ trong PDF hiện mã thô `fen:`, và bạn muốn tải file PDF về.

## Nguyên nhân (đã đối chiếu mã)

1. **Sync — worker thiếu cấu hình object storage.** Sau khi có git, sync chạy tới bước đồng bộ file đính kèm (`lib/attachmentSync.ts` gọi S3). Service `noteriv-worker` trong `web/infra/docker-compose.prod.yml` chỉ có `DATABASE_URL`, `REDIS_URL`, `ENCRYPTION_KEY`; không có `ATTACHMENTS_S3_*` (chỉ service `noteriv-api` có) nên SDK rơi về mặc định `127.0.0.1:59000` ⇒ ECONNREFUSED. Ngoài ra một lỗi S3 không nên làm hỏng cả lần sync note.
2. **Nút "+" im lặng.** `handleQuickNewNote` (trang vault) và `handleNewFileIn` (Sidebar) luôn tạo `Untitled.md`; vault của bạn đã có `Untitled`, nên API trả 409 `path_exists`, lỗi bị nuốt, không có phản hồi. Cả nút "New note" trên ribbon dùng chung hàm này.
3. **Ribbon quá dài.** `.ribbon` (`globals.css:771`) có `overflow:hidden; height:100%` và hiện có 16 nút trên + 6 nút dưới (đợt 1 thêm Sync/Plugins/Themes/Snippets) nên tràn và cắt mất nút cuối (Settings).
4. **Thiếu Developer menu / nút Command palette.** Desktop có menu Developer (Toggle DevTools, Reload) và nút `>_` Command palette trên ribbon; web chỉ có phím tắt Ctrl+Shift+P (trên Chrome Windows phím này còn hay bị gắn với in hệ thống) và không có mục menu.
5. **Cấp quyền plugin quá tay.** `inferPermissions` quét mọi chuỗi `vault.x`/`editor.x`/`ui.x` trong mã (kể cả comment, chuỗi) nên chessboard được cấp cả quyền đọc/ghi vault và editor mà không cần (ảnh Plugin Manager hiện 8 quyền). Đây là rủi ro bảo mật nhỏ nhưng nên siết.
6. **PDF.**
   - Bàn cờ thành mã thô: `lib/markdown-to-html.ts` gọi processor đồng bộ, còn processor của web là bất đồng bộ (iframe sandbox, kết quả nằm trong Shadow DOM) nên HTML đưa vào cửa sổ in không có SVG.
   - Hộp thoại in: `lib/pdf-export.ts` (cổng nguyên từ desktop) chỉ gọi in của trình duyệt; web cần tải file.
7. **Vặt:** bàn cờ trong cột hẹp bị cắt (SVG cố định chiều rộng, `:host{overflow:hidden}`); thông báo của plugin đè lên status bar.

## Cách sửa (theo thứ tự ưu tiên)

### 1. Sync ổn định trên production (làm trước, deploy sớm)
- `docker-compose.prod.yml`: thêm vào `noteriv-worker` cùng khối env S3 như API (`ATTACHMENTS_S3_ENDPOINT/REGION/BUCKET/ACCESS_KEY_ID/SECRET_ACCESS_KEY`, giá trị tham chiếu biến compose đã có trong Dokploy).
- `lib/attachmentSync.ts` + `lib/syncRunner.ts`: lỗi kết nối S3 → **bỏ qua phần đính kèm** và ghi cảnh báo vào job (`errorMessage` dạng "Đã đồng bộ note; bỏ qua file đính kèm: không kết nối được kho lưu trữ") thay vì fail cả sync; map `ECONNREFUSED/ENOTFOUND` thành thông báo tiếng Việt dễ hiểu. Thêm vào `scripts/test-sync-scenarios.ts` một ca "S3 không chạm tới được" (đặt endpoint sai) khẳng định note vẫn sync.
- Sau deploy: kiểm tra `docker exec <worker> env | grep ATTACHMENTS`, đọc job mới nhất trong DB (chỉ SELECT) và nhờ bạn bấm lại "Sync ngay".

### 2. Nút "+" tạo note
- Hàm dùng chung `nextUntitledName(notes, folderId)` → `Untitled.md`, `Untitled 2.md`, … (tra `VaultIndex`); áp dụng cho `handleQuickNewNote`, `Sidebar.handleNewFileIn`, ribbon, tab bar.
- Bắt lỗi API và hiện `pageNotice` thay vì im lặng (cả khi thất bại vì mạng/quyền). Xác minh bằng vault có sẵn `Untitled.md`.

### 3. Thanh trái, Command palette, menu Developer
- **Ribbon gọn hơn** (`Ribbon.tsx`, bạn đã chọn gom vào ⋯): giữ phía trên Quick open, New note, Daily note, Graph, **Command palette (mới)**, Search, Outline, Tags, Bookmarks, Calendar; phía dưới Sync, Plugins, Settings; còn lại (Templates, Flashcards, Note Composer, Attachments, Ghi âm, Insights, Trash, Themes, Snippets) vào popover "⋯" (đóng khi click ngoài/Esc). Thêm `overflow-y:auto` ẩn thanh cuộn làm lưới an toàn cho cửa sổ rất thấp.
- **Command palette**: nút ribbon + mục trong menu View + thêm phím dự phòng `F1`.
- **Developer menu** (`AppMenu.tsx`): "Tải lại trang (Ctrl+R)" (lưu note đang sửa trước khi tải), "Chẩn đoán…", "Mở công cụ nhà phát triển (F12)" (chỉ hiện gợi ý vì trình duyệt không cho web tự mở DevTools).
- **Chẩn đoán** (mới, hữu ích cho cả lỗi hôm nay): modal liệt kê phiên bản/commit build (`NEXT_PUBLIC_BUILD_SHA`), plugin + quyền + lệnh bị chặn, trạng thái sync gần nhất, và kết quả `GET /api/v1/diagnostics` (route mới, cần đăng nhập): git có cài không (`git --version`), kho file đính kèm có chạm tới được không (HEAD bucket), Redis/worker còn sống không (heartbeat do worker ghi), dung lượng đĩa scratch. Có nút "Sao chép báo cáo".

### 4. Plugin: quyền chính xác và hiển thị bàn cờ
- `lib/plugin-community.ts` `inferPermissions`: chỉ tính các lời gọi dạng `api.<ns>.<method>` (bỏ comment và literal bằng một lượt tách đơn giản); cập nhật test nhỏ cho chessboard (mong đợi đúng `markdown:render` + `ui:panel`).
- `PluginManager.tsx`: hiện "Quyền thừa so với mã nguồn" và nút "Chỉ giữ quyền cần thiết".
- `lib/plugin-sandbox/mirror.ts`: `HOST_STYLE` thêm `svg,img{max-width:100%;height:auto}` để bàn cờ co theo cột hẹp; kiểm khi mở Outline+Tags+Bookmarks.
- Thông báo plugin (`page.tsx`) nâng lên khỏi status bar.

### 5. Tải PDF bằng Chromium trên máy chủ (bạn đã chọn)
Kiến trúc, tách riêng để Chromium không làm phình image/RAM của API:
- **Service mới `noteriv-pdf`** (`web/pdf-service/`, Dockerfile Alpine `apk add chromium nss freetype harfbuzz font-noto font-noto-extra ttf-dejavu`; Node + `puppeteer-core`). Endpoint nội bộ `POST /render` (không publish cổng), xác thực bằng header `X-Pdf-Token` (biến `PDF_SERVICE_TOKEN` đặt trong Dokploy). `mem_limit: 768m`, chạy tuần tự (1 trang tại một thời điểm, hàng đợi ngắn), timeout 30s, giới hạn HTML 3MB.
- **Bảo mật** (HTML do trình duyệt gửi là không đáng tin): tắt JavaScript trong trang (`setJavaScriptEnabled(false)`), chặn mọi request mạng/`file:` qua `page.setRequestInterception` (chỉ cho `data:`), `--no-sandbox` chỉ khi chạy container không root có `--disable-dev-shm-usage`, không giữ cookie; HTML đã qua DOMPurify ở client và lọc lại ở service.
- **API** `POST /api/v1/vaults/:vid/notes/:nid/pdf` (cần đăng nhập, rate limit ~10/phút/người): nhận `{html, css, title, columnLayout, chessboardWidthPercent}`, chuyển cho `noteriv-pdf`, trả `application/pdf` (`Content-Disposition: attachment`).
- **Client** `lib/pdf-export.ts`: hàm mới `downloadPdf(...)`: (a) `markdownToHTML` + **dựng sẵn mọi khối plugin** qua `pluginHost.renderCodeBlock` rồi chèn SVG + CSS (sửa luôn lỗi bàn cờ thô), (b) nhúng ảnh đính kèm thành `data:` (trình duyệt có cookie, Chromium thì không), (c) gửi lên API, tải blob về với tên `<tên note>.pdf`, có thông báo tiến trình/lỗi. Mục menu: **File → Tải PDF** (chính, nút trên thanh note cũng dùng cái này) và **In…** (giữ hộp thoại in cũ, nhưng cũng dùng bàn cờ dựng sẵn). Tuỳ chọn 1/2 cột và cỡ bàn cờ (Settings) tiếp tục áp dụng qua `buildPrintStyles` (CSS in thật nên 2 cột hoạt động).
- **Dev/test:** dùng Chrome đã cài trên máy (`PDF_CHROME_PATH`) để kiểm trong dev; trên production dùng Chromium của image.
- **Triển khai:** compose thêm service + biến `PDF_SERVICE_TOKEN` (tôi đặt qua Dokploy API bằng key bạn đã cung cấp; sẽ nói rõ khi làm). Kiểm `df -h /` trước vì VPS còn ~13GB; image thêm ≈ 300–400MB.

## Thứ tự, kiểm thử, git
- **Đợt A (deploy sớm):** mục 1 → 2 → 3 → 4 (nhỏ, độc lập). **Đợt B:** mục 5 (có service mới nên deploy riêng).
- Mỗi mục một commit. Kiểm bằng browser thật (dev: tunnel + API + worker + `next dev`): vault có sẵn `Untitled.md` để thử "+"; ca S3 hỏng cho sync; cửa sổ thấp (đo ribbon không còn tràn); Developer/Diagnostics; chessboard trong cột hẹp; **PDF**: tạo PDF từ note có bàn cờ + tiếng Việt, mở file bằng trình xem PDF của Chrome và chụp màn hình để xác nhận chữ có dấu, bàn cờ, 1 và 2 cột.
- `tsc` sạch (web, server, pdf-service), `next build`, chạy lại `test-sync-scenarios.ts`. **Hỏi bạn trước khi push/deploy từng đợt**, rồi tôi chạy các lệnh kiểm tra sau deploy như hai lần trước.

## Rủi ro / việc cần bạn
- Chromium trên VPS 145GB/87% đầy và RAM hạn chế: theo dõi `docker stats` sau deploy; nếu RAM căng có thể hạ `mem_limit` hoặc tắt service khi không dùng.
- Sync lần đầu thật trên `covuaduongsinh/noteriv_learn` sẽ nhập note có sẵn trong repo vào vault và đẩy note của vault lên repo (nội dung trùng đường dẫn giữ bản của web); nếu repo có nhiều ảnh, vài file lớn hơn 25MB sẽ bị bỏ qua và ghi vào nhật ký.

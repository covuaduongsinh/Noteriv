# Phiên K-M1b: Bật/tắt core plugin trên app Android

> Ngày: 2026-10-21 · Chặng: [K](2026-10-20-chang-k-kiem-chung.md) (ngoại lệ app mobile) · Nhánh: `covuaduongsinh/k-mobile-core-plugins` (tách từ `covuaduongsinh/k-mobile-khoi-phuc`)

## Vì sao

Sau khi thử APK của M1, chủ dự án thấy app chưa có phần chọn core plugin như web. Yêu cầu: app phải đồng bộ với web.

## Cách làm

- Mã của plugin (`packages/plugins`) vẽ giao diện bằng `react-dom`, nên không chạy được trên React Native.
- Vì vậy phone **dùng chung danh sách và nơi lưu**. Mỗi công tắc bật hoặc tắt màn hình/khối có sẵn của phone ứng với tính năng đó.
- **Danh sách** (`phone/lib/core-plugins.ts`): đủ 20 plugin, cùng id, cùng thứ tự và cùng `defaultEnabled` với `web/src/lib/core-plugins.ts` và `desktop/src/lib/core-plugins.ts`.
- **Tên và mô tả** lấy từ catalog chung `packages/ui/src/i18n/locales/{en,vi}.json`, theo đúng nhóm `plugins.<camelCaseId>` như web.
  - `phone/metro.config.js` thêm thư mục locales vào `watchFolders`.
  - Ngôn ngữ chọn theo máy: `vi*` thì tiếng Việt, còn lại tiếng Anh.
- **Nơi lưu:** khoá `core` trong `.noteriv/plugin-config.json` của vault, cùng file và cùng định dạng với desktop.
  - Ghi theo kiểu đọc rồi sửa rồi ghi, nên khoá `enabled` của community plugin vẫn còn.
  - Giống web/desktop, lựa chọn áp dụng **riêng cho vault trên thiết bị đó**. Thư mục `.noteriv/` không đi qua git sync (cả phone lẫn server đều bỏ qua nó).
- **Màn hình** `app/core-plugins.tsx`, mở từ Settings → Ecosystem → Core plugins (dòng mô tả "Đang bật x/20").

| Plugin | Trên phone |
|---|---|
| word-count | Thanh đếm từ/ký tự/dòng dưới editor |
| flashcards, graph | Nút ở màn hình chính |
| calendar | Hai nút ở màn hình chính: lịch và daily note |
| templates, slides, markdown-lint | Mục trong menu của note |
| note-history | Mục "File Recovery" trong menu |
| note-composer | Mục mới "Note Composer" trong menu (trước đây màn hình có sẵn nhưng không có lối vào) |
| board | Ghi chú dạng board hiện thành Kanban; tắt thì hiện markdown thường |
| mermaid, dataview | Khối code trong chế độ xem trước được vẽ thành sơ đồ/bảng; tắt thì hiện code thường |
| vault-insights, audio-recorder, views, footnotes, unique-note, canvas, drawing, pdf-viewer | Phone chưa có tính năng này. Vẫn lưu lựa chọn, màn hình ghi rõ "Chưa có trên điện thoại" |

Mặc định giống web, nên word-count, slides, lint, board, dataview và note-composer **tắt** cho tới khi người dùng bật. Đây là khác biệt so với bản upstream, nơi các tính năng này luôn hiện.

## Sửa sync (chủ dự án báo: web lỗi, mobile không sync được GitHub)

### Web, server (`web/server/src/lib/gitSync.ts`)

1. **Lỗi `fatal: unable to get password from user`** (ở dev trên máy Windows):
   - API và worker chạy từ phiên Claude Code nên thừa hưởng `GIT_CONFIG_COUNT/KEY/VALUE` có `credential.interactive=false`. Biến này khiến git bỏ qua file askpass mang token của kết nối.
   - Ngoài ra, `~/.gitconfig` có helper `gh auth git-credential` riêng cho github.com. `-c credential.helper=` không xoá được helper gắn theo URL này, nên git có thể đẩy bằng tài khoản `gh` thay vì token của kết nối.
   - Cách sửa: hàm `hostEnvForGit` bỏ mọi `GIT_CONFIG_*` và `GIT_ASKPASS` thừa hưởng. `runGit` đặt thêm `GIT_CONFIG_GLOBAL=NUL` (hoặc `/dev/null`) và `GIT_CONFIG_NOSYSTEM=1`, để git của server không đọc cấu hình của máy chủ.
   - Lưu ý: `os.devNull` (`\\.\nul`) không dùng được, git báo "Invalid argument".
   - Production (container) không bị lỗi này, nhưng giờ cũng cách ly như vậy.
2. **`refusing to merge unrelated histories`**, hệ quả của lỗi 1:
   - Lần tạo bản sao git đầu tiên, bước tải repo thất bại, nhưng `ensureWorkingCopy` vẫn tiếp tục.
   - Lần sync sau commit vault thành một lịch sử riêng, không chung gốc với repo.
   - Cách sửa:
     - `ensureWorkingCopy` chỉ cho bắt đầu lịch sử mới khi remote trống hoặc chưa có nhánh (`couldn't find remote ref`). Lỗi khác thì xoá `.git` vừa tạo và báo lỗi.
     - `gitSyncCore` gặp `unrelated histories` thì gộp lại với `--allow-unrelated-histories`. Note trùng tên mà khác nội dung thành bản `(conflict …)`, như mọi xung đột khác.
3. `scripts/test-sync-scenarios.ts` có thêm 3 kịch bản: không thừa hưởng cấu hình git, gộp hai lịch sử, tải lần đầu thất bại. Kết quả 52/52 PASS.

### Mobile (`phone/lib/github-sync.ts`, `sync-state.ts`, `context/AppContext.tsx`, `app/settings.tsx`)

Vault thật có 1.928 note (khoảng 27 MB). Code upstream có các vấn đề sau:

- **Tốn API:**
  - Pull tải lại **mọi** note mỗi lần sync, push tải thêm một lần nữa để so sánh, tổng cộng khoảng 3.900 lượt gọi API mỗi lần.
  - App lại tự sync **mỗi 5 giây**, nên nhanh chóng cạn hạn mức 5.000 lượt/giờ của GitHub.
  - Cách sửa:
    - Trạng thái sync lưu thêm sha blob của từng note ở lần thống nhất gần nhất (`shas` trong `.noteriv/sync-state.json`).
    - Note không đổi ở cả hai phía thì bỏ qua; note đổi thì tải theo sha qua blobs API (lấy được cả file trên 1 MB), mỗi lần 6 file song song.
    - Một lượt sync không có gì đổi giờ chỉ còn 4 lượt gọi API.
- **Repo trống:** API cây file trả 409. Giờ coi là chưa có file nào, để push vẫn chạy.
- **Tên repo có dấu chấm** trước đây bị cắt cụt; đã sửa.
- **Tự sync mỗi 60 giây.** Bước lưu note đang mở trước khi sync dùng giá trị cũ của lần render tạo bộ hẹn giờ (stale closure), có thể ghi đè nội dung cũ. Giờ đọc qua ref.
- **Settings hiện lỗi đầu tiên** thay vì chỉ đếm "Errors: N". Lỗi hết hạn mức API được báo rõ, kèm giờ thử lại.
- **Kiểm chứng:** giả lập GitHub cùng hệ thống file trong bộ nhớ, 11 kịch bản PASS:
  - lần đầu (300 note, tiếng Việt, file 1,2 MB, tên có `#`);
  - sync không có gì đổi;
  - sửa ở remote, sửa ở máy, sửa cả hai phía;
  - xoá ở remote;
  - repo trống.
- **Chưa làm:** GitLab/Gitea (`provider-sync.ts`) vẫn tải lại mọi note mỗi lần sync.

## Kiểm chứng

- `npx tsc --noEmit` trong `phone/`: exit 0. ESLint không có lỗi; các cảnh báo đều có từ upstream.
- APK debug build lại; chủ dự án kiểm trên máy thật.

## Review (2026-10-26)

Trước khi mở PR, nhánh được gộp với `main` (các phiên O1–O12). Web/desktop nay có 20 core plugin, nên danh sách của phone thêm `views`, `footnotes`, `unique-note` (đều tắt sẵn, phone chưa có các tính năng này).

Review độc lập tìm thấy 3 lỗi nặng: sync của phone có thể **ghi đè bản sửa trên remote mà không báo**. Đã sửa cùng các lỗi nhỏ hơn:

- **Push chỉ ghi lên remote khi note đã sửa trên máy này** và remote vẫn là bản đã thống nhất (`mayUpload` trong `sync-state.ts`). Trước đây, nếu pull tải một note thất bại (hết hạn mức, mất mạng) hoặc desktop vừa push xong, push vẫn ghi bản cũ của phone đè lên. Remote đã đổi thì để lần pull sau gộp, giữ cả hai bản. Áp dụng cho cả GitHub lẫn GitLab/Gitea.
- **Xung đột lần hai trong cùng ngày** không còn bị bỏ: bản sao có số thứ tự riêng (`… (conflict 2026-10-26 2).md`). Chỉ khi đã ghi được bản sao thì push mới được tải bản của phone lên.
- **Note đang mở:** mọi lần sync (hẹn giờ, nút trong Settings) đều lưu note đang mở trước và kiểm lại sau. Sync đổi note đó thì editor nạp bản mới. Nếu người dùng đang gõ dở, chữ đang gõ được giữ, còn bản sync mang về nằm cạnh note thành bản sao xung đột. Pull cũng đọc lại file ngay trước khi ghi.
- **Một lần sync tại một thời điểm**, bất kể ai gọi (hàng đợi trong `provider-sync.ts`). Trước đây nút Sync trong Settings có thể chạy song song với auto-sync, và hai lần chạy ghi đè `sync-state.json` của nhau.
- **Repo GitHub rỗng** (chưa có commit nào, ví dụ xoá rồi tạo lại cùng tên) thì bắt đầu lại từ đầu và tải mọi note lên, thay vì xoá mọi note trên máy. Còn repo vẫn có commit mà không còn note nào (nơi khác đã xoá hết) thì phone xoá theo như thường.
- **Mỗi request có giới hạn 60 giây.** `fetch` của React Native không tự hết hạn. Vì sync chạy lần lượt, một kết nối bị treo sẽ chặn mọi lần sync sau.
- Xoá file thất bại thì không coi là đã xoá, nên note không bị tải lên lại một cách lặng lẽ.
- **Danh sách file của GitHub bị cắt** (repo rất lớn) thì dừng sync và báo lỗi, thay vì coi phần bị cắt là đã xoá.
- **Ghi file thất bại** thì báo lỗi và không ghi nhận là đã thống nhất.
- **Fresh Clone** chỉ thay note (trước đây xoá cả ảnh và các file khác mà sync không tải lại được), và tải qua blobs API (file trên 1 MB trước đây thành file rỗng).
- `X.MD` (đuôi viết hoa) nay cũng được push.
- **Core plugin:** `plugin-config.json` hỏng thì không ghi đè (để không mất thiết lập của community plugin). Bật/tắt trước khi lựa chọn cũ nạp xong, hoặc bấm nhanh hai lần, không còn làm mất lựa chọn.
- **Server:** git chạy với `LC_ALL=C`, vì sync đọc thông báo tiếng Anh của git (`couldn't find remote ref`).

Review lần hai (trên chính các bản sửa) không thấy lỗi nặng mới. Đã sửa thêm:
- Quy tắc "bắt đầu lại" ban đầu áp dụng cho mọi remote không còn note, nên làm sống lại các note đã xoá có chủ đích ở nơi khác. Nay chỉ áp dụng cho repo rỗng.
- Thêm giới hạn thời gian cho request.
- Hook sau sync đọc lại trạng thái editor sau khi đọc file, để không nuốt chữ gõ trong lúc đó.
- Lựa chọn core plugin đang chờ lưu không bị ghi nhầm sang vault khác khi chuyển vault.
- Lỗi trong bước kiểm note đang mở không làm sync báo thất bại.

Kiểm chứng:
- Giả lập GitHub cùng hệ thống file trong bộ nhớ: 23 kịch bản PASS, gồm 11 kịch bản cũ và 12 kịch bản mới cho từng lỗi trên. Chạy các kịch bản mới với code cũ thì trượt 7, trong đó kịch bản "repo tạo lại rỗng" xoá sạch 305 note trên máy.
- `scripts/test-sync-scenarios.ts` của server: 52/52 PASS.
- `npx tsc --noEmit` trong `phone/`: exit 0.

## Việc tồn

- **Xoá và đổi tên trên phone chưa lên remote.** Push không xoá file nào trên remote, nên note đã xoá trên phone sẽ được pull về lại, còn đổi tên thì sinh bản trùng. Lỗi này có từ upstream, làm ở M2 cùng phần sync hai chiều.

- Phần chữ còn lại của phone vẫn là tiếng Anh. Chuyển sang catalog chung ở M3, kể cả mấy dòng tạm trong `corePluginLabels`.
- Phone chưa có tuỳ chọn riêng của từng plugin (`coreSettings`) như web/desktop.

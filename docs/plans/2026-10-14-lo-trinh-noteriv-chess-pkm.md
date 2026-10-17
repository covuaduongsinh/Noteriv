# Lộ trình Noteriv: sổ tay tri thức cờ vua (Chess PKM), web + desktop

> **ĐÃ THAY THẾ (2026-10-17)** bởi [2026-10-17-lo-trinh-thuong-mai.md](2026-10-17-lo-trinh-thuong-mai.md): sản phẩm chuyển sang hướng ghi chú tri thức chung, thương mại; cờ vua thành phiên bản chuyên ngành (gói core plugin) làm sau. Giai đoạn 0–2 dưới đây đã xong; Giai đoạn 3–6 được chia lại vào các chặng của lộ trình mới. File này giữ làm lịch sử.
>
> Ngày lập: 2026-10-14 · Cập nhật: 2026-10-14 (thứ tự 0 → 6 theo quyết định của chủ dự án) · Trạng thái: **đã thay thế**
> Người quyết định: chủ dự án (covuaduongsinh). Tài liệu viết cho người không chuyên IT; thuật ngữ giải thích ở mục 11.
> **Phiên làm việc mới hãy đọc trước:** [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md)

---

## 1. Bối cảnh và các quyết định đã chốt

**Hiện trạng (mốc `v-web-parity-2026-10-14`):** bản web Noteriv tại `https://noteriv.dsc.edu.vn` đã tương đương bản desktop: ghi chú Markdown, nhiều người dùng, đồng bộ GitHub/WebDAV, cộng tác thời gian thực, plugin trong sandbox có cấp quyền, bàn cờ qua plugin chessboard, flashcard, tải PDF bằng máy chủ và xem trước PDF.

**Quyết định của chủ dự án (2026-10-14):**

| Câu hỏi | Quyết định |
|---|---|
| Sản phẩm chính | **Bản web**; **desktop vẫn được duy trì và có cùng tính năng** (offline, file nằm trên máy, nhanh, riêng tư) nhờ dùng chung mã |
| Đối tượng | **Cộng đồng PKM cờ vua** (người học, người dạy, câu lạc bộ cờ) |
| Tên sản phẩm | Tạm giữ **Noteriv** |
| Quan hệ với ChessNote | **Noteriv thay thế ChessNote** |
| Upstream (`thejacedev/Noteriv`) | **Chưa tách**, giữ liên kết; thử nghiệm tái cấu trúc trên **nhánh `next`**; xem lại việc tách repo ở cuối Giai đoạn 2 |
| Máy chủ | **VPS hiện tại** (dùng chung, phải theo dõi tài nguyên) |
| Sao lưu | **GitHub (repo private)**, mã hoá, giới hạn kích thước |
| Thứ tự | **0 an toàn → 1 nền móng chung + API → 2 thu gọn → 3 cờ vua → 4 hệ sinh thái plugin → 5 đồng bộ/di động/chia sẻ → 6 AI/MCP/ra mắt** |

**Về ChessNote** (`D:\code\chessnote`, repo `covuaduongsinh/chessnote`): fork của SilverBullet với rất nhiều tính năng cờ (bàn cờ PGN/FEN tương tác, sửa bàn cờ, 6 bộ quân và 8 màu bàn, engine Arasan WASM, Game Review, AI Coach, xu hướng, gắn tag, hỏi đáp RAG, sổ khai cuộc, SM-2, xuất PDF), khoảng 9.500 dòng TypeScript trong `plugs/chess*`. Kiểm tra ngày 2026-10-14: **ChessNote không còn chạy** (`chessnote.dsc.edu.vn` trả 502, không còn container hay volume), nên chỉ cần **chuyển tính năng**, không chuyển dữ liệu. Tài liệu thuật toán `docs/CHESS_MODULES.md` và `docs/modules/*` là nguồn tham khảo chính.

---

## 2. Định vị sản phẩm

> **"Nơi người chơi cờ ghi chép, phân tích, ôn luyện và chia sẻ kiến thức cờ."**

- **Không** cạnh tranh trực diện với Obsidian về số plugin. Cạnh tranh bằng **chiều sâu cờ vua** mà Obsidian, Notion hay Logseq không có.
- **Khác Lichess Study / Chessable:** mạnh về ghi chép, liên kết ý tưởng, ôn tập cá nhân và tài liệu giảng dạy (PDF), không chỉ ván cờ.
- **Lợi thế riêng:** web cho cộng tác và lớp học; desktop cho offline và dữ liệu nằm trên máy; Markdown thuần (không bị khoá); tự lưu trữ được; plugin có sandbox và quyền rõ ràng; AI hiểu cờ; MCP cho trợ lý AI đọc vault.

---

## 3. Chiến lược mã nguồn

1. **Giữ repo hiện tại** `covuaduongsinh/Noteriv`, vẫn liên kết upstream. Kiểm tra 2026-10-14: upstream có commit cuối 2026-09-06 và không có commit nào ta chưa có, nên giữ liên kết không tốn gì; mỗi tháng xem có ý tưởng nào đáng làm lại.
2. **Mô hình nhánh:** `main` = production; `next` = tái cấu trúc (Giai đoạn 1 trở đi), staging deploy từ `next`; luôn merge `main` vào `next` (một chiều); gộp `next` vào `main` chỉ ở mốc đã duyệt. **Không** tạo repo thử nghiệm song song, vì hai nơi cùng phát triển sẽ lệch nhau, và tải mã dạng zip thì mất lịch sử và ghi công.
3. **Tách repo** là **điểm quyết định ở cuối Giai đoạn 2** (hoặc khi đổi thương hiệu, hay cần repo public riêng để ra mắt). Khi tách: đẩy đủ lịch sử, giữ `LICENSE` MIT (© Jace) + `NOTICE.md` (chi tiết ở phụ lục file Giai đoạn 1).
4. **Repo không cồng kềnh về kích thước** (đo 2026-10-14: web khoảng 35.000 dòng, desktop khoảng 37.500, phone khoảng 18.500; gói 51MB, phần lớn do file `app-apk/noteriv.apk` 84MB, sẽ chuyển sang GitHub Releases ở phiên 1.1). Cái cần xử lý là **trùng lặp web/desktop** (Giai đoạn 1) và **tính năng dồn vào lõi** (Giai đoạn 2, làm sau khi đo).
5. **Dùng chung mã giữa web và desktop:** monorepo npm workspaces với `packages/core`, `packages/ui`, `packages/plugin-api`, `packages/chess`, `packages/plugins/*`. `web/` và `desktop/` giữ nguyên vị trí, chỉ khác nhau ở **tầng lưu trữ** (`VaultAdapter`: REST so với file cục bộ).
6. **Tính năng = core plugin:** lõi mỏng; mọi tính năng không thiết yếu (kể cả các tính năng cờ) là core plugin, bật/tắt được, tắt thì không tải mã.
7. **Giấy phép:** kiểm từng thành phần trước khi chép từ ChessNote (SilverBullet MIT, Arasan, chess.js BSD-2, từng bộ quân). Chỉ chép những gì tương thích MIT (chi tiết: Giai đoạn 3, phiên 3.0).
8. `phone/` (React Native): ngừng phát triển, thay bằng PWA (Giai đoạn 5). `extension/` (web clipper) giữ. `mcp/` giữ cho desktop; thêm MCP máy chủ ở Giai đoạn 6.

---

## 4. Tổng quan các giai đoạn

| GĐ | Tên | Kế hoạch chi tiết | Ước lượng | Người dùng thấy gì |
|---|---|---|---|---|
| **0** | Nền móng an toàn: sao lưu, staging, theo dõi, bảo mật | [giai-doan-0](2026-10-14-giai-doan-0-nen-mong-an-toan.md) | 4–6 buổi | Đăng ký bằng mã mời, trang điều khoản |
| **1** | Nhánh `next`, package dùng chung, Plugin API v1 (nháp, hai tầng) | [giai-doan-1](2026-10-14-giai-doan-1-tach-repo-package-chung-plugin-api.md) | 6–9 buổi | Gần như không đổi (nền móng) |
| **2** | Thu gọn: tính năng hiện có thành core plugin | [giai-doan-2](2026-10-14-giai-doan-2-thu-gon-core-plugin.md) | 6–8 buổi | Mở nhanh hơn; bật/tắt tính năng trong Cài đặt |
| **3** | Cờ vua: bàn cờ/PGN/sửa bàn → engine/Game Review/nhập Lichess → thẻ thế cờ/khai cuộc | [giai-doan-3](2026-10-14-giai-doan-3-co-vua-core-plugin.md) | 10–13 buổi | **Toàn bộ trải nghiệm cờ vua**, trên web và desktop |
| **4** | API v1.0 ổn định, tài liệu, plugin mẫu, CLI, kho plugin | [giai-doan-4](2026-10-14-giai-doan-4-tai-lieu-plugin-cli.md) | 5–7 buổi | Plugin cờ từ cộng đồng |
| **5** | Xung đột đồng bộ, PWA + Ghi nhanh, xuất bản công khai, lớp học | [giai-doan-5](2026-10-14-giai-doan-5-dong-bo-di-dong-chia-se.md) | 7–10 buổi | App điện thoại, chia sẻ bài học, lớp học |
| **6** | AI Coach, MCP máy chủ, ra mắt cộng đồng | [giai-doan-6](2026-10-14-giai-doan-6-ai-mcp-ra-mat.md) | 7–9 buổi + liên tục | AI giải thích ván, kết nối Claude/Cursor |

**Phụ thuộc và song song:**
- GĐ 0 phải xong 0.1 (sao lưu) và 0.2 (staging) trước GĐ 1; 0.3 và 0.4 chạy song song được.
- GĐ 4 và GĐ 5 có thể chạy song song sau khi xong **3A**.
- GĐ 6 cần **3B** (Game Review, chỉ mục ván) và quyết định chính sách AI.
- **Mời nhóm thử nghiệm đầu tiên** (học viên và giáo viên trung tâm) ngay sau **3A**.

**Quy trình mỗi phiên:** đọc file bàn giao → lập kế hoạch phiên trong `docs/plans/` → chủ dự án duyệt → làm trên nhánh → thử trên staging → hỏi trước khi đưa lên production → cập nhật bảng "Trạng thái" của giai đoạn.

---

## 5. Bản đồ chuyển tính năng ChessNote → Noteriv

| Tính năng ChessNote (plug) | Noteriv hiện có | Hướng chuyển | GĐ/phiên |
|---|---|---|---|
| Bàn cờ PGN/FEN, xem từng nước, lật bàn (`chess`) | Plugin chessboard cộng đồng (cơ bản) | Core plugin `chess-board` dùng `@noteriv/chess` | 3.1 |
| Sửa bàn cờ, "Lưu vào trang" | Chưa có | Chuyển logic (FEN, nhập thành, bắt tốt qua đường) | 3.2 |
| Bộ quân, màu bàn (`chess-themes`) | Một kiểu | Chỉ các bộ có giấy phép phù hợp | 3.0, 3.2 |
| Mẫu (Space Library) | Templates (văn bản) | Mẫu cờ Việt hoá | 3.3 |
| Xuất PDF cờ (`chess-pdf-export`) | Có (Chromium máy chủ, xem trước) | Bàn tĩnh đúng bộ quân, chọn thế cờ của PGN | 3.3 |
| Engine Arasan WASM (`chess-engine`) | Chưa có | Web Worker, tải lười | 3.4 |
| Game Review: CPL, accuracy, điểm ngoặt | Chưa có | Công thức `CHESS_MODULES.md` §4 | 3.5 |
| Chỉ mục ván, ván liên quan (`chess`, `chess-db`) | Chỉ mục ghi chú, tìm kiếm Postgres | Bảng `ChessGame` (web) / chỉ mục cục bộ (desktop) | 3.6 |
| SM-2, thẻ thế cờ (`chess-db`) | Flashcard văn bản | Mở rộng plugin Flashcards | 3.7 |
| Sổ khai cuộc (`chess-repertoire`) | Chưa có | Cây khai cuộc + chế độ luyện | 3.8 |
| AI Coach, xu hướng, tag, QA (`chess-ai`, `ai-sidecar`) | Chưa có | Dịch vụ `noteriv-ai` (Claude API) có hạn mức | 6.1 |
| Đồng bộ Dropbox/WebDAV/Cloud (`sync`) | Git + WebDAV | Giữ của Noteriv; Dropbox nếu có nhu cầu | — |
| Space Lua, Live Query | Không | **Không chuyển** | — |
| Mobile Capacitor, desktop Tauri | Desktop Tauri | Desktop dùng chung mã (GĐ 1); mobile thành PWA | 1, 5.2 |

---

## 6. Những việc **không** làm (hoặc hoãn)

| Ý tưởng | Quyết định | Lý do |
|---|---|---|
| Lớp tương thích chạy plugin Obsidian | **Bỏ**; thay bằng hướng dẫn chuyển plugin (GĐ 4.2) | Kiến trúc khác (sandbox), rất tốn công, ít liên quan đến cờ |
| App mobile native riêng | **Hoãn**, dùng PWA | Rẻ hơn nhiều, dùng chung mã web |
| Quảng bá "nhẹ, 15MB RAM, Tauri" | **Không dùng làm thông điệp chính** | Sản phẩm chính là web; chỉ nhắc khi giới thiệu bản desktop, và phải đo thật |
| Space Lua, Live Query của ChessNote | **Không chuyển** | Quá phức tạp cho người dùng cờ |

---

## 7. Kiến trúc mục tiêu (tóm tắt kỹ thuật)

```
packages/
  core/            logic thuần, VaultAdapter, PluginRegistry
  ui/              editor CodeMirror, renderer markdown, panel dùng chung (React)
  plugin-api/      kiểu và đặc tả Plugin API (v0.x → v1.0 ở GĐ 4)
  chess/           FEN/PGN, render bàn, engine UCI, Game Review, SM-2, chỉ mục
  plugins/         core plugin: flashcards, calendar, canvas…, chess-board, chess-analysis, chess-training, chess-ai
web/               Next.js (WebVaultAdapter → REST), server Fastify/Prisma, pdf-service, infra
desktop/           Next static export + Tauri (DesktopVaultAdapter → file cục bộ)
```

- Plugin hai tầng: **core** (tin cậy, nạp trực tiếp bằng `import()` động) và **cộng đồng** (sandbox iframe + quyền, trên cả web và desktop).
- Engine cờ chạy ở máy người dùng (Worker + WASM); AI và PDF chạy ở máy chủ (dịch vụ riêng có `mem_limit`).
- Nội dung luôn là Markdown trong ghi chú; chỉ mục (ván cờ, backlink) chỉ là bản sao để tra nhanh.

---

## 8. Rủi ro chính

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Mất dữ liệu người dùng | Cao | GĐ 0 trước mọi thứ: sao lưu mã hoá + diễn tập khôi phục |
| VPS dùng chung, đĩa gần đầy | Cao | Theo dõi (0.3), dọn dẹp, kế hoạch máy chủ riêng khi có tải (6.3) |
| GĐ 1–2 dài mà người dùng chưa thấy gì mới | Trung bình | Báo tiến độ mỗi phiên; production ổn định; mời nhóm thử ngay sau 3A |
| Mã web và desktop đã lệch nhiều (24/33 file lib, 37/38 component khác nhau) | Trung bình | Hợp nhất từng nhóm, lấy bản web làm gốc, kiểm tra hai nền tảng sau mỗi nhóm |
| Giấy phép engine hoặc bộ quân | Trung bình | Kiểm ở 3.0, có phương án thay thế |
| Chi phí AI | Trung bình | Hạn mức, cache, API key riêng của người dùng |
| Một người phụ trách, phụ thuộc AI viết mã | Trung bình | Tài liệu bàn giao, kế hoạch từng phiên, kiểm thử tự động, staging |

---

## 9. Các quyết định của chủ dự án

**Đã chốt (2026-10-14):** tên Noteriv; VPS hiện tại; sao lưu GitHub; web là chính nhưng desktop vẫn duy trì; đối tượng là cộng đồng PKM cờ vua; Noteriv thay ChessNote; **chưa tách upstream**, thử nghiệm trên nhánh `next`; thứ tự 0 → 6 như mục 4.

**Còn mở (quyết trước giai đoạn tương ứng):**
1. **Có tách repo khỏi upstream không, và repo public hay private** (cuối GĐ 2). Khuyến nghị public khi ra mắt.
2. **Mặc định bật/tắt từng core plugin** (phiên 2.1, sau khi đo đạc).
3. **Chính sách AI** (trước 6.1): miễn phí giới hạn, trả phí, hay người dùng tự nhập API key.
4. **Nhóm thử nghiệm đầu tiên** (sau 3A): ai, bao nhiêu người, khi nào.
5. **Ngôn ngữ giao diện** (trước GĐ 4 và 6): tiếng Việt trước, hay song ngữ ngay.
6. **Có dùng Sentry để theo dõi lỗi không** (phiên 0.3).

---

## 10. Đối chiếu với thứ tự đề xuất trước đây

Trong lúc tư vấn từng có thứ tự 5 bước: (1) package dùng chung + API v1, (2) thí điểm core plugin, (3) tài liệu/mẫu/CLI, (4) xung đột sync + PWA + Ghi nhanh, (5) MCP + tiếp thị. Lộ trình này **giữ nguyên tinh thần đó** và:
- Thêm **GĐ 0 (an toàn dữ liệu)** lên đầu, vì production đang chạy chưa có sao lưu.
- Bước (1) là **GĐ 1** (làm trên nhánh `next`, thêm tầng `VaultAdapter`; desktop vẫn duy trì nên package dùng chung là cần thiết).
- Bước (2) mở rộng thành **GĐ 2: thu gọn toàn bộ** (thí điểm Flashcards rồi chuyển các tính năng còn lại), theo ý chủ dự án "bớt cồng kềnh trước khi làm sâu về cờ".
- Thêm **GĐ 3: cờ vua dưới dạng core plugin**, nơi API được kiểm chứng bằng tính năng chính của sản phẩm.
- Bước (3) là **GĐ 4**, bước (4) là **GĐ 5** (thêm xuất bản công khai và lớp học), bước (5) là **GĐ 6** (thêm AI Coach).

---

## 11. Giải thích thuật ngữ

- **PKM** (Personal Knowledge Management): quản lý tri thức cá nhân, tức ghi chép và liên kết kiến thức để học lâu dài.
- **Upstream**: dự án gốc mà Noteriv được sao chép (fork) từ đó (`thejacedev/Noteriv`). **Fork**: bản sao của một dự án.
- **Repo**: kho mã nguồn trên GitHub. **Nhánh (branch)**: bản sao để thử thay đổi mà không ảnh hưởng bản chính. **Monorepo**: một repo chứa nhiều phần (web, desktop, các package dùng chung).
- **Package dùng chung**: phần mã viết một lần, cả web và desktop cùng dùng.
- **Plugin / Core plugin**: phần mở rộng; core plugin do dự án viết sẵn, bật/tắt được. **API**: "cửa giao tiếp" chuẩn để plugin dùng tính năng của ứng dụng. **Sandbox**: môi trường cô lập để plugin không truy cập được dữ liệu ngoài phạm vi cho phép.
- **Staging**: bản thử nghiệm giống bản thật nhưng dữ liệu riêng. **Sao lưu / khôi phục**: chép dữ liệu ra nơi khác và lấy lại được khi có sự cố.
- **FEN / PGN**: cách ghi cờ vua dạng chữ; FEN là một thế cờ, PGN là cả ván.
- **Engine (Arasan)**: chương trình máy tính phân tích cờ. **WASM**: cách để nó chạy ngay trong trình duyệt.
- **Game Review / CPL**: đánh giá chất lượng từng nước; CPL là số centipawn bị mất so với nước tốt nhất.
- **SRS / SM-2**: ôn tập ngắt quãng, nhắc lại đúng lúc sắp quên; SM-2 là thuật toán tính lịch ôn.
- **PWA**: trang web cài được lên điện thoại như một ứng dụng.
- **MCP**: giao thức cho phép trợ lý AI (Claude…) đọc dữ liệu của bạn có kiểm soát.

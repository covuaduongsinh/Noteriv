# Lộ trình Noteriv: sổ tay tri thức cờ vua (Chess PKM) trên web

> Ngày lập: 2026-10-14 · Trạng thái: **bản đề xuất, chưa triển khai** · Người quyết định: chủ dự án (covuaduongsinh)
> Tài liệu này dành cho người không chuyên IT: mỗi giai đoạn có "Mục tiêu", "Việc cụ thể", "Thế nào là xong" và "Bạn cần làm gì". Thuật ngữ được giải thích ở cuối (mục 10).

---

## 1. Bối cảnh và các quyết định đã chốt

**Hiện trạng (mốc `v-web-parity-2026-10-14`):** bản web Noteriv tại `https://noteriv.dsc.edu.vn` đã tương đương bản desktop: ghi chú Markdown, nhiều người dùng, đồng bộ GitHub/WebDAV, cộng tác thời gian thực, plugin chạy trong hộp cát (sandbox) có cấp quyền, bàn cờ qua plugin chessboard, flashcard, tải PDF bằng máy chủ và xem trước PDF.

**Quyết định của chủ dự án (2026-10-14):**

| Câu hỏi | Quyết định |
|---|---|
| Sản phẩm chính | **Bản web** |
| Đối tượng | **Cộng đồng PKM cờ vua** (người học, người dạy, câu lạc bộ cờ) |
| Upstream (`thejacedev/Noteriv`) | Vẫn học hỏi; **sẵn sàng tách** khi không còn phù hợp |
| Quan hệ với ChessNote | **Noteriv thay thế ChessNote** |

**Về ChessNote** (`D:\code\chessnote`, repo `covuaduongsinh/chessnote`): là bản fork của SilverBullet, đã có rất nhiều tính năng cờ: bàn cờ PGN/FEN tương tác, sửa bàn cờ, 6 bộ quân và 8 màu bàn, engine Arasan chạy trong trình duyệt (WASM), Game Review (phân loại nước đi, độ chính xác), AI Coach, phân tích xu hướng, gắn tag tự động, hỏi đáp trên kho ván (RAG), sổ khai cuộc, ôn tập ngắt quãng SM-2, xuất PDF. Kiểm tra ngày 2026-10-14: **ChessNote không còn chạy trên VPS** (`chessnote.dsc.edu.vn` trả 502, không còn container hay volume dữ liệu), nên **không phải chuyển người dùng hay dữ liệu**, chỉ cần **chuyển tính năng**. Tài liệu thuật toán của ChessNote (`docs/CHESS_MODULES.md`, `docs/modules/*`) rất chi tiết và là nguồn tham khảo chính khi chuyển.

---

## 2. Định vị sản phẩm

> **"Nơi người chơi cờ ghi chép, phân tích, ôn luyện và chia sẻ kiến thức cờ."**

- **Không** cạnh tranh trực diện với Obsidian về số plugin. Cạnh tranh bằng **chiều sâu cờ vua** mà Obsidian, Notion hay Logseq không có.
- **Khác Lichess Study / Chessable:** mạnh về ghi chép, liên kết ý tưởng giữa các bài, ôn tập cá nhân và tài liệu giảng dạy (PDF), không chỉ ván cờ.
- **Lợi thế riêng:** tự lưu trữ được (self-host), dữ liệu là Markdown thuần (không bị khoá), làm việc nhóm (giáo viên và học viên), AI hiểu cờ.

**Đề xuất về tên (cần chủ dự án quyết, xem mục 9):** vì Noteriv thay ChessNote, có thể **dùng lại tên "ChessNote"** và tên miền `chessnote.dsc.edu.vn` cho bản web. Tên này nói rõ sản phẩm làm gì hơn "Noteriv", và đã có sẵn tài liệu tiếng Việt. Nếu đổi tên thì tách repo (mục 3) cũng là lúc hợp lý.

---

## 3. Chiến lược mã nguồn và upstream

1. **Hiện tại:** giữ chung repo `covuaduongsinh/Noteriv`. Mọi việc lớn làm trên **nhánh riêng**, chỉ đưa vào `main` sau khi thử trên bản staging (Giai đoạn 0).
2. **Học hỏi upstream:** mỗi tháng xem các thay đổi của `upstream` (`git fetch upstream`) và lập danh sách "đáng làm lại cho web". **Không merge thẳng** vào phần web (upstream chỉ làm desktop).
3. **Bản desktop (`desktop/`):** chuyển sang **chế độ giữ nguyên**, không chạy theo tính năng web. Có thể đóng gói web thành ứng dụng desktop sau (mục 7, Giai đoạn 4).
4. **Thời điểm tách repo** (khi **một** điều sau xảy ra): đổi tên hoặc thương hiệu; cần đổi cấu trúc thư mục lớn; upstream không còn thay đổi gì đáng học trong 3 tháng. Cách tách: lấy riêng `web/` **kèm toàn bộ lịch sử**, giữ file `LICENSE` (MIT, ghi công Jace) và ghi công SilverBullet/Arasan cho phần chuyển từ ChessNote.
5. **Giấy phép cần kiểm tra trước khi chuyển mã từ ChessNote:** SilverBullet (MIT), Arasan (kiểm lại bản phát hành dùng trong `chessnote`), `chess.js` (BSD-2), bộ quân cờ (mỗi bộ một giấy phép, ví dụ Cburnett là GPL/CC-BY-SA). **Chỉ chuyển những gì giấy phép cho phép dùng trong dự án MIT.**

---

## 4. Bản đồ chuyển tính năng ChessNote → Noteriv web

| Tính năng ChessNote (plug) | Noteriv web hiện có | Hướng chuyển | Giai đoạn |
|---|---|---|---|
| Bàn cờ PGN/FEN, xem từng nước, lật bàn (`chess`) | Plugin chessboard (FEN, PGN cơ bản) | Đưa bàn cờ thành **tính năng có sẵn** trong editor (không cần cài plugin), viết lại theo `board_renderer.ts` | 1 |
| Sửa bàn cờ, "Lưu vào trang" | Chưa có | Chuyển nguyên logic (FEN, nhập thành, bắt tốt qua đường) | 1 |
| Bộ quân, màu bàn (`chess-themes`) | Một kiểu | Chuyển các bộ **có giấy phép phù hợp** + cài đặt mặc định | 1 |
| Xuất PDF cờ (`chess-pdf-export`) | Có (Chromium máy chủ, xem trước) | Bổ sung: chọn thế cờ của ván PGN, bộ quân khi in | 1 |
| Engine Arasan WASM, đánh giá thế cờ (`chess-engine`) | Chưa có | Chạy **trong trình duyệt** (Web Worker), không tốn máy chủ | 2 |
| Game Review: CPL, độ chính xác, điểm ngoặt | Chưa có | Chuyển công thức theo `CHESS_MODULES.md` §4 | 2 |
| Chỉ mục ván cờ, ván liên quan (`chess`, `chess-db`) | Có chỉ mục ghi chú, tìm kiếm Postgres | Lưu metadata ván (người chơi, ECO, kết quả) trong **Postgres** thay SQLite trình duyệt | 2 |
| Sổ khai cuộc (`chess-repertoire`) | Chưa có | Mẫu ghi chú + cây khai cuộc | 3 |
| SRS SM-2 cho thế cờ | Flashcard có sẵn (văn bản) | Mở rộng flashcard: **thẻ thế cờ** (thấy thế cờ, đi nước đúng) | 3 |
| AI Coach, xu hướng, gắn tag, hỏi đáp (`chess-ai`, `ai-sidecar`) | Chưa có | Thành **dịch vụ AI phía máy chủ** (Claude API), có hạn mức theo người dùng | 4 |
| Đồng bộ Dropbox/WebDAV/Cloud (`sync`) | Git + WebDAV | Giữ của Noteriv; Dropbox để sau nếu người dùng cần | — |
| Space Lua, Live Query (SilverBullet) | Không | **Không chuyển** (quá phức tạp cho đối tượng người dùng cờ) | — |
| Mobile Capacitor, desktop Tauri | Web | Thay bằng **PWA** (cài web như app) | 4 |

---

## 5. Lộ trình theo giai đoạn

Thời lượng là **ước lượng thô** theo số phiên làm việc với Claude (mỗi phiên vài giờ), chưa tính thời gian bạn thử và góp ý.

### Giai đoạn 0 – Nền móng an toàn (bắt buộc trước khi mời người dùng) · ~2–3 phiên

**Mục tiêu:** dữ liệu của người dùng không bao giờ mất, và mỗi lần cập nhật không làm hỏng bản thật.

Việc cụ thể:
1. **Sao lưu tự động** Postgres và kho file đính kèm (Garage) hằng ngày ra nơi khác (ví dụ Google Drive hoặc ổ lưu trữ ngoài), giữ 14 ngày; **thử khôi phục** một lần trên máy khác.
2. **Bản staging** (`staging.noteriv...`): một ứng dụng Dokploy riêng chạy từ nhánh `staging`, có dữ liệu riêng. Mọi thay đổi thử ở đây trước.
3. **Theo dõi**: cảnh báo khi trang không truy cập được, đĩa trên 90%, RAM cao; ghi log lỗi tập trung.
4. **Dọn VPS**: đĩa đang khoảng 89%. Xử lý 31GB build cache không tự giải phóng (đã ghi nhận trước đây), xoá image cũ; lập kế hoạch **máy chủ riêng** khi có người dùng thật (VPS đang chạy chung ERPNext và các dịch vụ khác).
5. **Bảo mật**: xoay (rotate) Dokploy API key đã lộ trong chat; kiểm tra lại giới hạn tốc độ đăng ký và đăng nhập; xác nhận email khi đăng ký.
6. **Pháp lý tối thiểu**: trang Điều khoản sử dụng và Chính sách quyền riêng tư (tiếng Việt và tiếng Anh).

**Thế nào là xong:** khôi phục thành công từ bản sao lưu; một thay đổi đi qua staging rồi mới lên bản thật; có cảnh báo gửi về email hoặc Zalo khi trang chết.

**Bạn cần làm:** chọn nơi lưu bản sao lưu; quyết định có thuê thêm máy chủ không (chi phí khoảng 5–15 USD/tháng); xoay API key Dokploy.

### Giai đoạn 1 – Cờ vua là "trái tim" · ~4–6 phiên

**Mục tiêu:** mở Noteriv là thấy ngay đây là công cụ cho người chơi cờ.

Việc cụ thể:
1. **Bàn cờ có sẵn** trong editor cho khối ` ```fen ` và ` ```pgn `: xem từng nước, lật bàn, nhảy tới nước bất kỳ, hiện chú thích và biến (variations) của PGN.
2. **Sửa bàn cờ**: kéo thả và thêm/xoá quân, chọn bên đi, rồi "Lưu vào ghi chú".
3. **Giao diện bàn cờ**: nhiều bộ quân và màu bàn, cài đặt mặc định cho từng người.
4. **Dán ván cờ nhanh**: dán PGN hoặc link Lichess/Chess.com là tự tạo ghi chú ván cờ có bàn cờ.
5. **Mẫu ghi chú cờ**: Phân tích ván, Giáo án buổi học, Sổ khai cuộc, Tìm hiểu đối thủ, Bộ bài tập chiến thuật (chuyển từ Space Library của ChessNote).
6. **PDF cờ**: chọn thế cờ hiển thị của ván PGN, in kèm sơ đồ thế cờ theo bộ quân đã chọn.
7. Plugin chessboard cũ: giữ để tương thích, gợi ý người dùng chuyển sang tính năng có sẵn.

**Thế nào là xong:** một giáo viên có thể soạn giáo án có 5 thế cờ và 1 ván PGN, xem trên web, và tải PDF đẹp để in cho học viên, mà không cần cài thêm gì.

**Bạn cần làm:** cung cấp 3–5 giáo án hoặc ván cờ thật để làm mẫu và thử; duyệt giao diện bàn cờ.

### Giai đoạn 2 – Phân tích ván cờ · ~4–5 phiên

**Mục tiêu:** người chơi tự phân tích ván của mình ngay trong ghi chú.

Việc cụ thể:
1. **Engine Arasan trong trình duyệt** (chạy trên máy người dùng, không tốn tài nguyên máy chủ): đánh giá thế cờ, nước tốt nhất, thanh ưu thế.
2. **Game Review**: phân loại nước đi (Brilliant, Best, Mistake, Blunder…), độ chính xác hai bên, đồ thị ưu thế, điểm ngoặt. Dùng đúng công thức đã kiểm chứng trong `chessnote/docs/CHESS_MODULES.md`.
3. **Chỉ mục ván cờ** trên máy chủ: lọc ván theo người chơi, khai cuộc (ECO), kết quả, ngày; "ván liên quan".
4. **Nhập hàng loạt** từ Lichess (theo tên người dùng hoặc study) và từ file PGN nhiều ván.

**Thế nào là xong:** nhập 50 ván từ Lichess, review một ván dưới 1 phút, lọc được "các ván thua với khai cuộc Sicilian".

**Bạn cần làm:** cung cấp tài khoản Lichess mẫu (công khai) để thử nhập; kiểm tra chất lượng phân loại nước đi so với Lichess.

### Giai đoạn 3 – Ôn luyện · ~3–4 phiên

**Mục tiêu:** biến ghi chú thành bài tập để nhớ lâu.

Việc cụ thể:
1. **Thẻ thế cờ** trong flashcard: hiện thế cờ, người học đi nước; chấm đúng hoặc sai theo lời giải hoặc theo engine.
2. **Lịch ôn SM-2** (đã có trong ChessNote) cho cả thẻ văn bản và thẻ thế cờ; thống kê tiến bộ.
3. **Sổ khai cuộc**: cây khai cuộc từ các ghi chú; luyện "đi theo khai cuộc của mình".
4. Tự tạo thẻ từ **sai lầm trong Game Review** ("ôn lại những nước bạn đã đi sai").

**Thế nào là xong:** học viên mở mục Ôn tập mỗi ngày, có thẻ thế cờ tự sinh từ ván đã review.

### Giai đoạn 4 – Chia sẻ, lớp học, mobile, AI · ~6–8 phiên

**Mục tiêu:** từ công cụ cá nhân thành công cụ cộng đồng.

Việc cụ thể:
1. **Xuất bản công khai**: một ghi chú hoặc thư mục thành trang web công khai có link (bàn cờ vẫn tương tác), có thể tắt bất kỳ lúc nào.
2. **Lớp học**: giáo viên tạo lớp, mời học viên; chia sẻ thư mục bài giảng (chỉ đọc), giao bài tập (bộ thẻ thế cờ), xem tiến độ. Tận dụng phân quyền vault và cộng tác đã có.
3. **Thư viện mẫu cộng đồng**: người dùng chia sẻ giáo án hoặc sổ khai cuộc để người khác "sao chép về vault".
4. **PWA**: cài web lên điện thoại như app, có chế độ **Ghi nhanh** (mở ngay ô nhập, không tải cả vault) và đọc offline ghi chú gần đây.
5. **AI Coach phía máy chủ** (Claude API): giải thích nước đi, nhận xét ván, xu hướng điểm yếu, gắn tag, hỏi đáp trên kho ván. Có **hạn mức theo người dùng** để kiểm soát chi phí API.
6. **MCP**: cho Claude Desktop hoặc Cursor đọc vault của người dùng qua API có xác thực.
7. **Giao diện giải quyết xung đột đồng bộ** (khi sửa cùng lúc trên GitHub và trên web).

**Thế nào là xong:** một giáo viên tạo lớp 10 học viên, giao bộ bài tập; học viên làm trên điện thoại; giáo viên xem kết quả.

**Bạn cần làm:** quyết định chính sách AI (miễn phí bao nhiêu lượt, ai trả phí API); thử với một lớp thật.

### Giai đoạn 5 – Hệ sinh thái và cộng đồng · liên tục

1. **Chuẩn hoá Plugin API v1**: danh sách hàm, quyền, cách vẽ giao diện; đóng băng và đánh phiên bản.
2. **Tài liệu cho lập trình viên** + plugin mẫu cờ (đồng hồ thi đấu, bộ đếm ELO, kết nối engine khác).
3. **Công cụ tạo plugin** (`npm create noteriv-plugin`).
4. **Ra mắt cộng đồng**: bài giới thiệu trên r/chess, r/chessbeginners, r/PKM, diễn đàn Lichess, nhóm cờ Việt Nam; video hướng dẫn tiếng Việt.

---

## 6. Những việc **không** làm (hoặc hoãn), so với ý tưởng ban đầu

| Ý tưởng ban đầu | Quyết định | Lý do |
|---|---|---|
| Chạy plugin Obsidian qua adapter | **Bỏ** | Rất tốn công, kiến trúc khác (sandbox), ít liên quan đến cờ |
| Chuyển mọi tính năng thành core plugin ngay | **Hoãn** đến Giai đoạn 5 | Người dùng cần tính năng trước; API plugin chỉ đáng chuẩn hoá khi đã ổn định |
| App mobile native riêng | **Hoãn**, dùng PWA | Rẻ hơn nhiều, dùng chung mã web |
| Quảng bá "nhẹ, 15MB RAM, Tauri" | **Bỏ** | Không đúng với sản phẩm chính là web |
| Space Lua, Live Query của ChessNote | **Không chuyển** | Quá phức tạp cho người dùng cờ |
| Theo kịp tính năng bản desktop | **Dừng** | Web là sản phẩm chính |

---

## 7. Kiến trúc kỹ thuật (tóm tắt cho người phụ trách kỹ thuật)

- **Tách mã cờ thành một khối riêng** trong `web/src/chess/` (bàn cờ, PGN, engine, review, thẻ thế cờ), không phụ thuộc vào editor, để dùng lại cho trang công khai, PDF, flashcard và plugin.
- **Engine chạy ở trình duyệt** (Web Worker + WASM): không tốn CPU máy chủ, chạy được offline.
- **AI chạy ở máy chủ** (dịch vụ mới cạnh `noteriv-pdf`, có `mem_limit`, hàng đợi BullMQ, hạn mức theo người dùng).
- **Dữ liệu ván cờ** lưu trong Postgres (bảng metadata ván, chỉ mục khai cuộc), nội dung vẫn là Markdown trong ghi chú, để người dùng xuất ra lúc nào cũng được.
- **Mỗi giai đoạn**: kế hoạch chi tiết riêng trong `docs/plans/`, làm trên nhánh, thử trên staging, kiểm thử tự động cho phần tính toán cờ (Game Review, SM-2, FEN), rồi mới deploy.
- **Tài nguyên máy chủ:** engine ở client nên tải máy chủ tăng chủ yếu do AI và PDF; cần theo dõi khi số người dùng tăng.

---

## 8. Rủi ro và cách giảm

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Mất dữ liệu người dùng | Cao | Giai đoạn 0 trước mọi thứ: sao lưu + thử khôi phục |
| VPS chung với ERPNext và dịch vụ khác, đĩa gần đầy | Cao | Theo dõi, dọn dẹp, máy chủ riêng khi có người dùng |
| Giấy phép bộ quân cờ, engine | Trung bình | Kiểm tra từng thành phần trước khi chuyển (mục 3.5) |
| Chi phí AI tăng theo người dùng | Trung bình | Hạn mức, cache kết quả, cho người dùng dùng API key riêng |
| Làm quá nhiều tính năng, chậm ra mắt | Trung bình | Ra mắt thử sau Giai đoạn 1–2 với một nhóm nhỏ (học viên của trung tâm) |
| Một người phụ trách, phụ thuộc AI viết mã | Trung bình | Tài liệu đầy đủ trong `docs/`, kiểm thử tự động, staging |

---

## 9. Các quyết định của chủ dự án

**Đã chốt (2026-10-14):**
1. **Tên sản phẩm:** tạm giữ **"Noteriv"** (có thể xem lại khi tách repo).
2. **Máy chủ:** dùng **VPS hiện tại** (dùng chung, nên phải theo dõi đĩa và RAM, xem Giai đoạn 0, phiên 0.3).
3. **Nơi lưu bản sao lưu:** **GitHub, repo private**, có mã hoá `age` và giới hạn kích thước bằng khe xoay vòng; khi đính kèm vượt khoảng 1,5GB thì chuyển phần đính kèm sang Cloudflare R2/Backblaze B2 (xem Giai đoạn 0, phiên 0.1).

**Còn mở (quyết trước giai đoạn tương ứng):**
4. **Chính sách AI** (trước Giai đoạn 4): miễn phí giới hạn, trả phí, hay người dùng tự nhập API key?
5. **Nhóm thử nghiệm đầu tiên** (sau Giai đoạn 0–1): học viên và giáo viên của trung tâm, bao nhiêu người, khi nào?
6. **Ngôn ngữ giao diện** (trước Giai đoạn 5): tiếng Việt trước, tiếng Anh sau; hay song ngữ ngay từ đầu?

**Tài liệu triển khai:**
- Kế hoạch chi tiết Giai đoạn 0: [2026-10-14-giai-doan-0-nen-mong-an-toan.md](2026-10-14-giai-doan-0-nen-mong-an-toan.md)
- Hướng dẫn cho phiên làm việc mới (đọc trước khi làm): [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md)

**Bước tiếp theo:** mở phiên mới, triển khai **Phiên 0.1 (sao lưu)** theo hướng dẫn bàn giao. Hết Giai đoạn 0 thì lập kế hoạch chi tiết Giai đoạn 1.

---

## 10. Giải thích thuật ngữ

- **PKM** (Personal Knowledge Management): quản lý tri thức cá nhân, tức ghi chép và liên kết kiến thức để học lâu dài.
- **Upstream**: dự án gốc mà Noteriv được sao chép (fork) từ đó (`thejacedev/Noteriv`).
- **Repo**: kho mã nguồn trên GitHub. **Nhánh (branch)**: bản sao để thử thay đổi mà không ảnh hưởng bản chính.
- **Staging**: bản thử nghiệm giống hệt bản thật nhưng dữ liệu riêng, để kiểm tra trước khi cập nhật.
- **Sao lưu / khôi phục (backup / restore)**: chép dữ liệu ra nơi khác và lấy lại được khi có sự cố.
- **FEN / PGN**: hai cách ghi lại cờ vua dạng chữ. FEN là một thế cờ, PGN là cả ván.
- **Engine (Arasan)**: chương trình máy tính chơi và phân tích cờ. **WASM** là cách để nó chạy ngay trong trình duyệt.
- **Game Review / CPL**: đánh giá chất lượng từng nước đi; CPL là số "centipawn" bị mất so với nước tốt nhất.
- **SRS / SM-2**: ôn tập ngắt quãng, nhắc lại đúng lúc sắp quên; SM-2 là thuật toán tính lịch ôn.
- **PWA**: trang web cài được lên điện thoại như một ứng dụng.
- **MCP**: giao thức cho phép trợ lý AI (Claude…) đọc dữ liệu của bạn một cách có kiểm soát.
- **Plugin / API**: phần mở rộng do người khác viết / "cửa giao tiếp" chuẩn để plugin dùng tính năng của ứng dụng.
- **Sandbox**: hộp cát, môi trường cô lập để plugin không truy cập được dữ liệu ngoài phạm vi cho phép.

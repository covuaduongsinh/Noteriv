# Giai đoạn 3: Cờ vua là trái tim: các core plugin cờ (web + desktop)

> **Cập nhật 2026-10-17:** giai đoạn này nay là **phiên bản cờ vua**, làm trong worktree riêng sau Chặng 3 hoặc sau ra mắt, theo [2026-10-17-lo-trinh-thuong-mai.md](2026-10-17-lo-trinh-thuong-mai.md) mục 5. Nội dung kỹ thuật bên dưới vẫn dùng; điều chỉnh: plugin cờ mặc định **tắt** ở bản chung, "Chess edition" là bộ cấu hình bật sẵn; cài đặt cỡ bàn cờ khi xuất PDF thuộc tab cài đặt của plugin cờ.
>
> Ngày lập: 2026-10-14 · Trạng thái: **chưa triển khai** · Lộ trình: [2026-10-14-lo-trinh-noteriv-chess-pkm.md](2026-10-14-lo-trinh-noteriv-chess-pkm.md) (đã thay thế)
> **Phiên mới hãy đọc trước:** [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md)
> **Điều kiện bắt đầu:** Giai đoạn 2 xong (Plugin API v1 đã kiểm chứng bằng nhiều core plugin; Flashcards đã là plugin).
> **Nguồn tham khảo chính:** ChessNote `D:\code\chessnote` — `docs/CHESS_MODULES.md`, `docs/modules/01…07`, mã trong `plugs/chess*` (khoảng 9.500 dòng TypeScript).

## Mục tiêu

Người học và dạy cờ dùng Noteriv được ngay, không cần cài thêm gì:
- **3A (nền tảng):** bàn cờ FEN/PGN tương tác, sửa bàn cờ, giao diện bàn cờ, mẫu ghi chú, PDF cờ, dán ván cờ nhanh.
- **3B (phân tích):** engine Arasan chạy trên máy người dùng, Game Review, chỉ mục ván cờ, nhập từ Lichess.
- **3C (ôn luyện):** thẻ thế cờ, ôn tập SM-2, sổ khai cuộc, tự tạo bài tập từ sai lầm.

Tất cả là **core plugin** chạy trên **cả web lẫn desktop**, xây trên package logic dùng chung `@noteriv/chess`.

## Kiến trúc

```
packages/chess/            @noteriv/chess — logic thuần TS (không React, không DOM nếu được)
  fen.ts, pgn.ts           đọc/ghi FEN, PGN (dựa trên chess.js), biến, chú thích, NAG
  board-render.ts          dựng bàn cờ HTML/SVG tĩnh (dùng cho trang, PDF, xuất bản)
  themes/                  bộ quân + màu bàn (chỉ những bộ giấy phép cho phép)
  engine/                  giao thức UCI, parse output, winChance
  review.ts                Game Review (CPL, phân loại nước, accuracy)
  index.ts                 trích metadata ván (người chơi, ECO, kết quả, ngày)
  srs.ts                   SM-2
packages/plugins/chess-board/      3A: widget ```fen/```pgn, editor bàn cờ, cài đặt giao diện
packages/plugins/chess-analysis/   3B: engine worker, thanh ưu thế, Game Review, chỉ mục, nhập Lichess
packages/plugins/chess-training/   3C: thẻ thế cờ (mở rộng plugin Flashcards), sổ khai cuộc
```

- Engine chạy trong **Web Worker** + WASM: không tốn CPU máy chủ, chạy offline (desktop).
- Nội dung ván cờ **luôn là Markdown** trong ghi chú (khối ` ```pgn `/` ```fen `), để người dùng xuất ra được. Chỉ mục chỉ là bản sao để tìm nhanh.

---

## Phiên 3.0: Kiểm tra giấy phép và dựng `@noteriv/chess`

### Việc cụ thể
1. **Kiểm giấy phép** từng thành phần định chép từ ChessNote, ghi kết quả vào `NOTICE.md`:
   - Mã ChessNote do chủ dự án viết (trong repo `covuaduongsinh/chessnote`): chủ dự án đồng ý cấp phép MIT cho Noteriv.
   - Phần kế thừa SilverBullet: MIT, ghi công.
   - **Arasan** (`plugs/chess-engine/wasm/arasan.mjs`): kiểm giấy phép của bản đang dùng; nếu không tương thích MIT thì thay bằng Stockfish.wasm (GPL, nên **chỉ được phân phối như một tệp riêng**; cân nhắc kỹ) hoặc engine khác.
   - **Bộ quân** (`plugs/chess-themes/pieces/`: alpha, cburnett, leipzig, maestro, merida, spatial): mỗi bộ một giấy phép (ví dụ cburnett là GPLv2+/CC BY-SA). Chỉ giữ bộ cho phép; nếu cần, dùng bộ có giấy phép CC0/MIT.
   - `chess.js`: BSD-2.
2. Tạo `packages/chess` + Vitest; chuyển logic thuần từ `plugs/chess/fen_utils.ts`, `board_renderer.ts`, `text_normalize.ts` (chuẩn hoá tiếng Việt, chữ "đ"), `plugs/chess-themes/*` kèm **test gốc** của ChessNote (`*.test.ts`).
3. Không chép phần phụ thuộc SilverBullet (syscall, Space Lua, `plug_api.ts`); thay bằng hàm thuần.

### Xong khi
- `@noteriv/chess` có test chạy xanh (giữ test từ ChessNote); `NOTICE.md` ghi rõ từng thành phần và giấy phép.

---

## 3A: Nền tảng (phiên 3.1 – 3.3)

### Phiên 3.1: Plugin `chess-board`: bàn cờ trong ghi chú
- Widget cho khối ` ```fen ` và ` ```pgn ` trong live preview và chế độ đọc (qua `markdown.registerCodeBlockProcessor` của API v1, tầng core):
  - FEN: bàn tĩnh, lật bàn, toạ độ, bên đi.
  - PGN: điều hướng từng nước (nút và phím ←/→), danh sách nước bấm được, **biến (variations)**, chú thích `{…}`, NAG (`!`, `?`), header (người chơi, kết quả), nhảy tới nước theo tham số.
  - Tham số trong khối (dòng `key: value` đầu khối, như ChessNote): `orientation`, `ply`, `size`, `title`.
- Thay thế plugin chessboard cộng đồng: tự nhận khối cũ; thông báo gợi ý gỡ plugin cũ.
- Đáp ứng: co theo cột (bài học về cột hẹp: `max-width:100%`).
- Tham chiếu: `chessnote/docs/modules/01-chess-core.md` §2.

### Phiên 3.2: Sửa bàn cờ và giao diện bàn cờ
- **Editor bàn cờ** (modal): kéo thả, thêm hoặc xoá quân tự do, chọn bên đi, quyền nhập thành (chỉ hợp lệ khi vua và xe ở ô gốc), ô bắt tốt qua đường; nút **"Lưu vào ghi chú"** thay đúng khối (theo vị trí khối trong tài liệu). Tham chiếu ChessNote commit `383bab47`, `e958c1d7`.
- **Giao diện:** bộ quân và màu bàn (6 biến CSS như ChessNote: `--sq-light`, `--sq-dark`, `--board-border`, `--sq-select`, `--sq-highlight`, `--sq-dest`); mặc định theo người dùng, ghi đè theo khối.

### Phiên 3.3: Mẫu ghi chú, dán ván nhanh, PDF cờ
- **Mẫu** (qua plugin Templates): Phân tích ván, Giáo án buổi học, Sổ khai cuộc, Tìm hiểu đối thủ, Bộ bài tập chiến thuật (chuyển từ Space Library của ChessNote, Việt hoá).
- **Dán ván nhanh:** dán PGN, hoặc link ván Lichess (`lichess.org/<id>`, dùng API export công khai) hay Chess.com (nếu API công khai cho phép), thì tạo ghi chú ván cờ có header và bàn cờ. Gọi API ngoài: web qua máy chủ (tránh CORS, có rate limit), desktop gọi trực tiếp.
- **PDF cờ:** `pdf-export.ts` dùng `board-render.ts` (bàn tĩnh SVG đúng bộ quân); chọn thế cờ của ván PGN để in (tham số `ply`, hoặc "in sơ đồ mỗi N nước"); giữ 1/2 cột và cỡ bàn cờ. Tham chiếu `chessnote/docs/modules/05-chess-pdf-export.md`.

### Xong khi (3A)
- Một giáo viên soạn giáo án có 5 thế cờ và 1 ván PGN có biến, xem tương tác trên web và desktop, sửa một thế cờ bằng editor, tải PDF đẹp, **không cài thêm gì**.
- Chủ dự án thử với 3–5 giáo án thật của trung tâm.

---

## 3B: Phân tích (phiên 3.4 – 3.6)

### Phiên 3.4: Engine trong trình duyệt
- Plugin `chess-analysis`: nạp engine WASM trong **Web Worker** (tải lười khi người dùng bấm "Phân tích"); giao thức UCI theo `plugs/chess-engine/uci_protocol.ts`.
- **Lưu ý đã kiểm chứng ở ChessNote:** mỗi lần đánh giá tạo instance mới; **không gửi `quit`** (sẽ ngắt tìm kiếm ở depth 1); điểm theo góc nhìn bên đi; mate ghi đè cp.
- Giao diện: thanh ưu thế, nước tốt nhất (mũi tên), dòng PV, chọn độ sâu.
- Web: kiểm tra header COOP/COEP nếu engine cần `SharedArrayBuffer` (ảnh hưởng iframe sandbox plugin; kiểm tra kỹ hoặc dùng bản engine một luồng).

### Phiên 3.5: Game Review
- Theo đúng công thức `chessnote/docs/CHESS_MODULES.md` §4 (đã viết lại theo mã thật; **không** dùng số liệu tài liệu cũ):
  - `winChance(cp) = 100 / (1 + exp(−0,00368208 × cp))`; mate quy về ±10.000.
  - CPL theo bên đi; winLoss; phân loại Brilliant, Great, Best, Good, Inaccuracy, Mistake, Blunder, Book; accuracy hai bên; điểm ngoặt.
- Chạy tuần tự N+1 lần đánh giá trong Worker, có thanh tiến trình và nút huỷ; lưu kết quả vào ghi chú (khối `chess-review` hoặc frontmatter) để không phải chạy lại.
- Đồ thị ưu thế; bấm điểm trên đồ thị thì nhảy tới nước đó.
- Test: so khớp với test gốc ChessNote (`engine.test.ts`, `arasan_engine.test.ts`).

### Phiên 3.6: Chỉ mục ván cờ và nhập hàng loạt
- **Logic trích metadata** trong `@noteriv/chess` (`index.ts`: người chơi, Elo, ECO, khai cuộc, kết quả, ngày, số nước, nguồn).
- **Web:** bảng Prisma `ChessGame` (vaultId, noteId, blockIndex, metadata…) cập nhật khi lưu note (giống cơ chế backlinks trong `web/server/src/lib/backlinks.ts`). Server dùng `@noteriv/chess`, nên `web/server/Dockerfile` phải đổi build context sang gốc repo để thấy `packages/`.
- **Desktop:** chỉ mục cục bộ (`.noteriv/chess-index.json` hoặc IndexedDB), tính khi mở vault và khi file đổi.
- Trang "Ván cờ": lọc theo người chơi, ECO, kết quả, khoảng ngày; "ván liên quan" (rule-based, theo `plugs/chess/related_games.ts`).
- **Nhập từ Lichess:** theo tên người dùng (API export PGN, giới hạn số ván, có tiến trình), theo study; nhập file PGN nhiều ván (mỗi ván một ghi chú, đặt trong thư mục chọn).

### Xong khi (3B)
- Nhập 50 ván từ Lichess; review một ván dưới 1 phút trên máy tầm trung; lọc được "các ván thua với Sicilian"; phân loại nước gần với Lichess (chủ dự án đối chiếu 3 ván).

---

## 3C: Ôn luyện (phiên 3.7 – 3.8)

### Phiên 3.7: Thẻ thế cờ và SM-2
- Mở rộng plugin Flashcards (Giai đoạn 2) với **loại thẻ thế cờ**: hiện thế cờ, người học đi nước; đúng nếu khớp lời giải (một hoặc nhiều nước) hoặc engine đánh giá không kém hơn ngưỡng.
- Cú pháp thẻ trong ghi chú (ví dụ khối ` ```puzzle ` có FEN + lời giải + gợi ý), cùng thẻ văn bản hiện có.
- **SM-2** theo `plugs/chess-db/srs_sm2.ts` (ChessNote đã sửa lỗi lưu trạng thái SRS ở commit `83c3c818`; giữ cách lưu bền).
- Thống kê: số thẻ đến hạn, tỷ lệ đúng, chuỗi ngày.

### Phiên 3.8: Sổ khai cuộc và bài tập từ sai lầm
- **Sổ khai cuộc:** cây khai cuộc dựng từ các ghi chú có tag `#repertoire` (theo `plugs/chess-repertoire/`); chế độ luyện "đi theo khai cuộc của mình" (máy đi nước đối phương ngẫu nhiên trong cây).
- **Bài tập từ sai lầm:** sau Game Review, nút "Tạo thẻ từ các nước Mistake/Blunder", sinh thẻ thế cờ với lời giải là nước tốt nhất của engine.

### Xong khi (3C)
- Học viên mở mục Ôn tập mỗi ngày, có thẻ thế cờ tự sinh từ ván đã review; luyện được sổ khai cuộc.

---

## Kiểm thử chung
- Unit test cho `@noteriv/chess` (FEN, PGN có biến và chú thích, CPL, accuracy, SM-2, chuẩn hoá tiếng Việt), dùng lại test của ChessNote.
- Kiểm thử thủ công mỗi phiên trên **web (staging)** và **desktop (bản dev Tauri)**; chụp màn hình.
- Hiệu năng: mở ghi chú có 20 bàn cờ vẫn mượt; engine không làm đơ giao diện.

## Rủi ro

| Rủi ro | Cách giảm |
|---|---|
| Giấy phép engine hoặc bộ quân không tương thích | Phiên 3.0 kiểm trước; có phương án thay thế |
| WASM engine lớn, tải chậm | Tải lười, cache (Service Worker ở Giai đoạn 5) |
| Header COOP/COEP xung đột với iframe sandbox plugin | Ưu tiên bản engine một luồng; nếu cần đa luồng thì thử kỹ trên staging |
| API Lichess/Chess.com giới hạn tốc độ | Đi qua máy chủ có cache và hàng đợi (web); thông báo rõ khi bị giới hạn |
| Giai đoạn dài | Ra mắt thử với nhóm nhỏ ngay sau 3A, không chờ hết 3C |

## Ước lượng
3.0 (1) · 3A (3–4) · 3B (4–5) · 3C (2–3), khoảng 10–13 buổi. **Đề xuất mời nhóm thử nghiệm đầu tiên ngay sau 3A.**

## Trạng thái

| Phiên | Trạng thái | Ngày | Commit / ghi chú |
|---|---|---|---|
| 3.0 Giấy phép + `@noteriv/chess` | Chưa làm | | |
| 3.1 Bàn cờ FEN/PGN | Chưa làm | | |
| 3.2 Sửa bàn cờ + giao diện | Chưa làm | | |
| 3.3 Mẫu, dán ván, PDF cờ | Chưa làm | | |
| 3.4 Engine | Chưa làm | | |
| 3.5 Game Review | Chưa làm | | |
| 3.6 Chỉ mục + nhập Lichess | Chưa làm | | |
| 3.7 Thẻ thế cờ + SM-2 | Chưa làm | | |
| 3.8 Sổ khai cuộc + bài tập từ sai lầm | Chưa làm | | |

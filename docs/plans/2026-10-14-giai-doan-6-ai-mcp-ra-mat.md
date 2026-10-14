# Giai đoạn 6: AI, MCP trên máy chủ và ra mắt cộng đồng

> Ngày lập: 2026-10-14 · Trạng thái: **chưa triển khai** · Lộ trình: [2026-10-14-lo-trinh-noteriv-chess-pkm.md](2026-10-14-lo-trinh-noteriv-chess-pkm.md)
> **Phiên mới hãy đọc trước:** [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md)
> **Điều kiện bắt đầu:** Giai đoạn 3B xong (có Game Review và chỉ mục ván, là đầu vào cho AI). **Chủ dự án đã quyết chính sách AI** (lộ trình mục 9, câu 4).
> **Tham khảo:** ChessNote `plugs/chess-ai/` (Coach, Trends, Tagging, QA), `ai-sidecar/`, `docs/modules/04-chess-ai.md`, `09-ai-sidecar.md`.

## Mục tiêu

1. **AI Coach cờ vua** trong Noteriv: giải thích nước đi, nhận xét ván, tìm xu hướng điểm yếu, gắn tag, hỏi đáp trên kho ván, với chi phí kiểm soát được.
2. **MCP trên máy chủ:** Claude Desktop, Claude Code hoặc Cursor đọc và ghi vault Noteriv (web) qua API có xác thực. Đây là điểm khác biệt lớn so với Obsidian.
3. **Ra mắt** tới cộng đồng cờ vua và PKM.

---

## Phiên 6.1: Dịch vụ AI phía máy chủ

### Thiết kế
- Dịch vụ mới `noteriv-ai` trong compose (Node, `mem_limit` khoảng 256m), chỉ API nội bộ gọi được (như `noteriv-pdf`), dùng **Claude API** (model mới nhất phù hợp chi phí; mặc định `claude-sonnet-5-5`, tác vụ nhẹ dùng `claude-haiku-5-5`). Hàng đợi BullMQ cho tác vụ dài (xu hướng trên nhiều ván).
- **Đầu vào có cấu trúc:** PGN + kết quả Game Review (CPL, phân loại, điểm ngoặt) + đánh giá engine; AI **giải thích**, không tự "tính" nước đi (tránh bịa). Prompt theo kinh nghiệm `plugs/chess-ai/` của ChessNote.
- **Chính sách chi phí** (theo quyết định của chủ dự án), ví dụ:
  - Hạn mức miễn phí N lượt/ngày/người (bảng `AiUsage`);
  - Hoặc người dùng nhập **API key riêng** (mã hoá bằng `ENCRYPTION_KEY` như token sync);
  - Cache kết quả theo (PGN, loại tác vụ) để không gọi lại.
- **Quyền riêng tư:** chỉ gửi nội dung người dùng chủ động chọn; nêu rõ trong `/privacy` (phiên 0.4) rằng dữ liệu đi qua Anthropic API.

### Tính năng (core plugin `chess-ai`, chạy trên web; desktop gọi máy chủ khi đã đăng nhập, hoặc dùng API key riêng)
1. **Coach một ván:** nhận xét tổng quát + giải thích các điểm ngoặt và sai lầm lớn; chèn vào ghi chú dưới dạng callout.
2. **Giải thích một nước hoặc thế cờ:** bấm vào nước trong bàn cờ PGN, chọn "Vì sao?".
3. **Xu hướng:** quét các ván đã review (theo chỉ mục), tổng hợp điểm yếu theo giai đoạn ván (khai, trung, tàn cuộc) và ECO.
4. **Gắn tag và tóm tắt** ván tự động (người dùng duyệt trước khi lưu).
5. **Hỏi đáp trên kho ván** (RAG): tìm theo chỉ mục + embedding (pgvector trong Postgres nếu cần), trả lời có trích dẫn ván.

### Xong khi
- Coach một ván trả lời trong dưới 20 giây; hạn mức hoạt động đúng; chi phí trung bình mỗi lượt được đo và ghi lại.

## Phiên 6.2: MCP trên máy chủ

1. **Token truy cập cá nhân** (Settings → "Token API"): tạo, đặt tên, giới hạn vault và quyền (đọc / đọc+ghi), hạn dùng, thu hồi; lưu dạng hash.
2. **Máy chủ MCP từ xa** (Streamable HTTP, theo đặc tả MCP hiện hành) tại `https://<domain>/mcp`, xác thực bằng token. Công cụ: `search_notes`, `read_note`, `write_note`, `list_folder`, `get_backlinks`, `list_games` / `get_game` (chỉ mục cờ), `analyze_position` (gọi engine phía máy chủ nếu có, hoặc trả FEN để client phân tích).
3. **`mcp/` hiện có** (MCP đọc vault cục bộ, của upstream): giữ cho người dùng desktop; cập nhật README hướng dẫn cả hai cách.
4. Rate limit, ghi audit log (đã có `logAudit`), kiểm thử với Claude Desktop và Claude Code.
5. Tài liệu `docs/mcp.md`: cách kết nối, ví dụ câu lệnh ("Tóm tắt các ván thua tháng này và tạo bộ bài tập").

### Xong khi
- Từ Claude Desktop, người dùng tìm, đọc và tạo ghi chú trong vault Noteriv web bằng token; thu hồi token thì mất quyền ngay.

## Phiên 6.3: Chuẩn bị ra mắt

1. **Trang giới thiệu** (landing) song ngữ: điểm khác biệt (cờ vua + ghi chú + AI + mã nguồn mở + tự lưu trữ được), ảnh và video ngắn, nút đăng ký (vẫn bằng mã mời hoặc mở đăng ký tuỳ quyết định).
2. **Tài liệu người dùng** (tiếng Việt và tiếng Anh): bắt đầu nhanh, soạn giáo án cờ, phân tích ván, ôn tập, lớp học, đồng bộ GitHub, cài lên điện thoại, tự host (Docker compose).
3. **Hướng dẫn tự host** cho cộng đồng: `docker-compose` rút gọn + biến môi trường + nâng cấp.
4. **Kiểm tra trước ra mắt:** tải thử (k6 hoặc tương tự) mô phỏng 100 người dùng đồng thời trên staging; rà bảo mật (OWASP cơ bản, giới hạn tốc độ, quyền vault); sao lưu và khôi phục diễn tập lại; theo dõi chi phí VPS và AI.
5. **Đánh giá hạ tầng:** nếu tải tăng, lên kế hoạch tách Noteriv ra máy chủ riêng (đã nêu ở Giai đoạn 0).

## Phiên 6.4: Ra mắt và cộng đồng

1. Bài giới thiệu: r/chess, r/chessbeginners, r/ObsidianMD (góc "Chess PKM"), r/PKM, Hacker News (Show HN, nhấn mạnh mã nguồn mở + MCP), diễn đàn Lichess, nhóm cờ Việt Nam (Facebook/Zalo).
2. Kênh hỗ trợ: GitHub Discussions + Discord hoặc nhóm Zalo; mẫu báo lỗi (issue template).
3. Video hướng dẫn tiếng Việt (3–5 video ngắn).
4. Đo lường (tôn trọng quyền riêng tư, ví dụ Plausible tự host hoặc thống kê máy chủ): số người đăng ký, giữ chân sau 7 và 30 ngày, tính năng dùng nhiều.
5. Vòng phản hồi: mỗi 2 tuần tổng hợp góp ý và cập nhật lộ trình.

## Ước lượng
6.1 (3–4) · 6.2 (2) · 6.3 (2–3) · 6.4 (liên tục).

## Trạng thái

| Phiên | Trạng thái | Ngày | Commit / ghi chú |
|---|---|---|---|
| 6.1 Dịch vụ AI | Chưa làm | | |
| 6.2 MCP máy chủ | Chưa làm | | |
| 6.3 Chuẩn bị ra mắt | Chưa làm | | |
| 6.4 Ra mắt | Chưa làm | | |

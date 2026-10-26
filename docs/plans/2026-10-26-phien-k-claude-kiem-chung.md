# Kế hoạch phiên K-Claude: Kiểm chứng đối thủ, mọi mặt, nhãn hiệu, định giá và nhật ký (2026-10-26)

> Thuộc: [Kế hoạch Chặng K](2026-10-20-chang-k-kiem-chung.md) (Tuần 1–2).
> Nhánh: `covuaduongsinh/k-claude-kiem-chung`
> Thư mục làm việc: `D:\code\Noteriv-k-m1b`

---

## 1. Mục tiêu phiên làm việc

Giải quyết toàn bộ phần việc nghiên cứu và tài liệu của Claude thuộc Chặng K được đề ra trong [bàn giao phiên sau](2026-10-26-ban-giao-phien-sau.md):
1. **Đối thủ (`doi-thu.md` mục 6)**:
   - Tra cứu và làm rõ 2 khác biệt còn ở trạng thái "Chưa xác minh": cơ chế cô lập / sandbox plugin của các đối thủ (Obsidian, Logseq, Joplin, SiYuan, Anytype, AFFiNE) và độ phủ ngôn ngữ giao diện tiếng Việt.
2. **Mọi mặt (`moi-mat.md` mục 3, 4, 5, 6)**:
   - **Mục 3 (Vận hành & chi phí)**: Điền bảng chi phí vận hành hàng tháng ở 3 mốc quy mô (100, 1.000, 10.000 người dùng), đồng bộ số liệu từ [chi-phi.md](../kiem-chung/chi-phi.md).
   - **Mục 4 (Pháp lý & nhãn hiệu)**: Khảo sát sơ bộ 10 tên ứng viên (gồm tên gốc `Noteriv` và 9 phương án thay thế) qua cơ sở dữ liệu USPTO, WIPO Global Brand Database, EUIPO, tên miền `.com`, `.app`, `.io`, và độ trùng lặp trên GitHub/App Store.
   - **Mục 5 (Kinh doanh & giá bán)**: Đưa ra 3 phương án gói cước (Miễn phí / Cá nhân Pro / Nhóm & Giáo dục) với mức giá nội địa VNĐ và quốc tế USD; tính toán cụ thể điểm hoà vốn tiền mặt và điểm hoà vốn bao gồm chứng chỉ ký mã; phân tích chiến lược chọn ngách cờ vua vs sản phẩm ghi chú tổng quát.
   - **Mục 6 (Năng lực vận hành)**: Trả lời 4 câu hỏi cốt tử về năng lực của mô hình "1 solo founder + AI" (hỗ trợ khách hàng, xử lý sự cố ngoài giờ, bảo trì thư viện mã nguồn, dịch vụ thuê ngoài cần thiết).
3. **Nhật ký & Tiến độ (`nhat-ky.md`, `chang-k-kiem-chung.md`)**:
   - Tổng kết hiện trạng Tuần 1 trong `nhat-ky.md`.
   - Cập nhật tiến độ Chặng K trong `chang-k-kiem-chung.md`.

---

## 2. Các bước triển khai

1. Soạn thảo chi tiết phần xác minh mục 6 trong `docs/kiem-chung/doi-thu.md`.
2. Bổ sung các mục 3, 4, 5, 6 vào `docs/kiem-chung/moi-mat.md`.
3. Cập nhật `docs/kiem-chung/nhat-ky.md` và `docs/plans/2026-10-20-chang-k-kiem-chung.md`.
4. Mời subagent Code Reviewer / Tech Writer rà soát tính nhất quán, tính khả thi và nguồn dẫn số liệu.
5. Tạo Pull Request và xin ý kiến duyệt của chủ dự án.

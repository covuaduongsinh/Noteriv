# Kế Hoạch Triển Khai Tính Năng AI Tinh Hoa (Claudian & JAVIS-OS) Cho Noteriv

Tài liệu này tổng hợp toàn bộ kế hoạch, kiến trúc và lộ trình thực thi để hoàn thiện hệ sinh thái AI Assistant cho Noteriv, kế thừa những điểm mạnh nhất từ Claudian (Obsidian Claude plugin) và JAVIS-OS (Hệ điều hành AI đa tác vụ).

---

## 1. Trạng thái hiện tại (Đã hoàn thành Lựa chọn 1)

- [x] **Inline Edit (`Ctrl+K` / `Cmd+K`) với Diff Preview thời gian thực**:
  - CodeMirror 6 extension: `inline-edit-extension.ts`.
  - UI Overlay: `InlineEditOverlay.tsx` với 6 chip tác vụ thông minh (viết lại, sửa chính tả, tóm tắt, dịch thuật, danh sách, mở rộng ý).
  - Trực quan hóa Diff 2 màu đỏ (xóa/thay thế) và xanh (bổ sung mới).
  - Tích hợp phím tắt, nút bấm trên FormattingToolbar, chấp nhận (`Enter`) / từ chối (`Esc`) / thử lại (`🔄`).
  - Đã vượt qua 100% unit tests (7/7 tests) và typecheck.

---

## 2. Kế hoạch Lựa chọn 2: Smart Mentions (`@`) & Slash Commands (`/`) trong AI Chat

### 2.1 Mục tiêu
Cung cấp trải nghiệm hội thoại thông minh giống Claudian, Notion AI và Slack:
- Khi người dùng gõ `@` trong ô chat: Mở popup tìm kiếm nhanh danh sách ghi chú (notes) và thư mục (folders) trong Vault hiện tại.
- Khi người dùng gõ `/` trong ô chat: Mở menu lệnh nhanh (Slash Commands) đã cấu hình sẵn prompt chuyên sâu.

### 2.2 Chi tiết tính năng

#### A. Menu `@` (Mention Notes & Folders):
1. **Dữ liệu**: Lấy danh sách files và folders từ vault đang mở thông qua danh sách ghi chú hiện có.
2. **Hành vi**:
   - Gõ `@`: hiển thị danh sách gợi ý theo thời gian thực (hỗ trợ tìm kiếm mờ - fuzzy search theo tên file hoặc đường dẫn).
   - Chọn một note: chèn thẻ badge `@[Tên Note](note-id)` vào tin nhắn.
   - Khi gửi tin nhắn: hệ thống tự động đọc toàn bộ nội dung của các file được `@` và nhúng vào ngữ cảnh (context) gửi cho AI Model.
3. **Phím tắt & điều hướng**:
   - `ArrowUp` / `ArrowDown`: Di chuyển chọn gợi ý.
   - `Enter` / `Tab`: Chọn gợi ý.
   - `Escape`: Đóng gợi ý.

#### B. Menu `/` (Slash Commands):
Hỗ trợ các lệnh prompt chuẩn hóa:
- `/summarize`: Tóm tắt ghi chú hiện tại hoặc các ghi chú được chọn.
- `/action-items`: Trích xuất danh sách công việc cần làm (to-do, checklists) từ văn bản.
- `/brainstorm`: Tạo ý tưởng mới mở rộng từ chủ đề được nhập.
- `/qa`: Chế độ hỏi đáp sâu dựa trên tài liệu.
- `/translate [lang]`: Dịch thuật nhanh tài liệu sang ngôn ngữ đích.
- `/explain`: Giải thích khái niệm phức tạp một cách trực quan, dễ hiểu.
- `/mindmap`: Tạo cấu trúc sơ đồ tư duy dạng Markdown / Mermaid từ nội dung ghi chú.

### 2.3 Các file cần tạo và cập nhật
- `packages/ui/src/chat/useMentionSlash.ts`: Hook xử lý bắt sự kiện gõ `@` và `/`, lọc danh sách gợi ý, quản lý phím mũi tên và lựa chọn.
- `packages/ui/src/chat/MentionSlashPopup.tsx`: Popover gợi ý danh sách files/folders khi gõ `@` và commands khi gõ `/`.
- `packages/ui/src/assistant/AssistantPanel.tsx`: Tích hợp hook và popover vào ô input chat.
- `packages/ui/test/mention-slash.test.ts`: Bộ unit test xác thực việc kích hoạt `@` và `/`, điều hướng phím mũi tên, lựa chọn item.

---

## 3. Kế hoạch Lựa chọn 3: Vault AI Graph & Relationship Discovery

### 3.1 Mục tiêu
Giúp người dùng không chỉ xem từng ghi chú riêng lẻ mà AI nắm bắt toàn diện cả mạng lưới kiến thức của Vault (giống Second Brain trong Obsidian & JAVIS-OS):
- Phân tích mối quan hệ giữa các ghi chú (Internal Links, Tags, Shared Topics).
- Phát hiện khoảng trống kiến thức (Knowledge Gaps / Orphan Notes).
- Tự động gợi ý liên kết thông minh 2 chiều giữa các ghi chú có nội dung liên quan mật thiết nhưng chưa được link với nhau.

### 3.2 Chi tiết tính năng

1. **Vault Graph Relationship Analyzer**:
   - Thu thập toàn bộ ghi chú trong vault (title, tags, wiki-links `[[note]]`, tóm tắt hoặc embedding).
   - Tính toán độ tương đồng hoặc ma trận liên kết giữa các ghi chú.
   - Tìm các "mồ côi" (orphan notes - chưa được liên kết từ bất kỳ đâu) và các "trung tâm tri thức" (hub notes - có nhiều liên kết nhất).

2. **Smart Link Suggester ("Gợi ý liên kết thông minh")**:
   - Khi đang viết 1 ghi chú, AI quét văn bản và đối chiếu với toàn bộ tiêu đề/từ khóa của các ghi chú khác trong Vault.
   - Hiển thị danh sách gợi ý: "Nội dung này có thể liên quan tới ghi chú *[[Kiến trúc Microservices]]*, bạn có muốn tạo liên kết không?".
   - 1-click để chèn link `[[tên note]]` vào CodeMirror editor.

3. **Giao diện Vault Insights Panel**:
   - Tab "Khám phá Vault" trong Sidebar AI Assistant:
     - 📊 Thống kê Vault: Tổng số notes, số liên kết, số note mồ côi.
     - 💡 Gợi ý kết nối mới (Suggested Links).
     - ❓ Câu hỏi mở & Lỗ hổng kiến thức phát hiện được.

### 3.3 Các file cần tạo và cập nhật
- `packages/core/src/vault-graph.ts`: Thuật toán phân tích liên kết, trích xuất wikilinks `[[...]]`, tìm orphan notes, hub notes, gợi ý kết nối.
- `packages/core/test/vault-graph.test.ts`: Unit test kiểm thử thuật toán graph và link detection.
- `packages/ui/src/assistant/VaultInsightsTab.tsx`: Component hiển thị thống kê đồ thị liên kết và các gợi ý thông minh.
- `web/src/app/vaults/[vaultId]/page.tsx`: Gắn tab Vault Insights vào sidebar AI.

---

## 4. Lộ trình thực hiện từng bước (Execution Steps)

1. **Bước 1**: Tạo cấu trúc dữ liệu và logic hook cho Slash Commands và Mentions (`packages/ui/src/chat/useMentionSlash.ts`).
2. **Bước 2**: Xây dựng UI Component `MentionSlashPopup.tsx` và tích hợp vào Chat Input của Assistant Panel.
3. **Bước 3**: Viết Unit Test cho `useMentionSlash` và kiểm tra Typecheck.
4. **Bước 4**: Triển khai `packages/core/src/vault-graph.ts` (Graph Analyzer & Smart Link Suggester) kèm Unit Tests.
5. **Bước 5**: Xây dựng `VaultInsightsTab.tsx` và gắn vào AI Panel.
6. **Bước 6**: Kiểm thử toàn diện và cập nhật tài liệu.

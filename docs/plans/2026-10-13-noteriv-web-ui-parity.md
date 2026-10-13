# Cải thiện giao diện web Noteriv cho giống bản desktop

## Bối cảnh

Bản web (`https://noteriv.dsc.edu.vn`) hoạt động đúng chức năng (đã qua Phase 1-6 + hardening/CI/CD/deploy
ở Phase 7) nhưng giao diện rất sơ sài so với bản desktop — toàn chữ trơn, không icon, không title bar,
không khung/card. Người dùng gửi ảnh chụp giao diện thật, yêu cầu làm cho ít nhất giống bản desktop và
"hoàn thiện thêm".

Khảo sát bằng 2 Explore agent + 1 Plan agent phát hiện: **đây gần như thuần tuý là vấn đề markup/cấu trúc
component, không phải vấn đề CSS.** `web/src/app/globals.css` và `desktop/src/app/globals.css` **giống hệt
nhau byte-by-byte** (cùng md5, 9043 dòng) — toàn bộ class CSS cho title bar, ribbon, sidebar, tab bar,
formatting toolbar, context menu, backlinks panel, graph view... đã có sẵn trong web, chỉ là JSX của web
không hề dùng tới (grep xác nhận 0 kết quả cho `.sidebar-root`, `.sb-row`, `.ribbon`, `.titlebar` v.v. trong
`web/src`). Desktop cũng không dùng thư viện icon nào (không lucide-react/heroicons/...) — toàn bộ icon là
SVG tự vẽ tay (`viewBox="0 0 16 16"`, `stroke="currentColor"`, `strokeWidth="1.2"`), nên web làm theo đúng
quy ước này, không cần thêm dependency mới.

Một phát hiện quan trọng khác ngoài phần hình ảnh: `CalendarView.tsx`, `DataviewBlock.tsx`,
`FlashcardReview.tsx` tự ý hardcode màu hex thay vì dùng CSS variable — nghĩa là khi đổi theme qua
`ThemePicker` (đã hoạt động từ Phase 6), 3 component này **không đổi màu theo**, một lỗi chức năng thật
chứ không chỉ thẩm mỹ. (`BoardView.tsx` ban đầu nghi ngờ cũng vậy nhưng đã xác minh lại: toàn bộ 50 chỗ
dùng `style={{}}` của nó đã dùng đúng `var(--...)`, không cần sửa.)

## Quyết định thiết kế chính

- **Không copy nguyên bản `TitleBar.tsx` của desktop.** Desktop's title bar quản lý cửa sổ Tauri thật
  (nút minimize/maximize/close qua `window.electronAPI`, traffic-light macOS) — vô nghĩa trong tab trình
  duyệt. Desktop cũng có tab bar kéo-thả đa file mở cùng lúc; web hiện chỉ mở 1 note tại 1 thời điểm
  (`activeNote` là object đơn, không phải mảng) — thêm tab bar là tính năng mới nằm ngoài phạm vi "làm
  giống giao diện", không phải điều người dùng yêu cầu. → Xây `VaultHeader.tsx` mới: thanh mỏng tái dùng
  class `.titlebar`/`.titlebar-controls`/`.titlebar-path`, có nút thu gọn sidebar + `VaultSwitcher` + tên
  note/vault ở giữa + trạng thái lưu, **không** có nút cửa sổ, **không** tab bar.
- **Ribbon (dải icon trái) là nơi chứa các hành động cấp-vault**, tách khỏi các hành động theo-từng-note.
  Map lại toàn bộ nút hiện có:
  - Chuyển vào Ribbon: Calendar, Flashcards (icon mới), Theme, Snippets, Graph (hiện đang nằm sai chỗ ở
    toolbar per-note), Quick open, Plugins — tất cả đều cấp-vault, khớp đúng cách desktop đặt Graph/Quick
    open ở ribbon.
  - Giữ lại cạnh note (icon hoá, không chuyển vào ribbon): Backlinks, Collab (tính năng mới desktop không
    có), Export PDF — vì đây là hành động trên *note đang mở*, không phải cấp-vault.
  - "+ Note"/"+ Folder" ở header sidebar, gộp thành 1 nút mở menu nhỏ (giống cách desktop dùng context-menu
    "New Folder" thay vì nút riêng).
  - Loại bỏ trùng lặp: Graph/Quick open/Plugins hiện xuất hiện ở *cả* toolbar per-note *và* màn hình trống
    "chưa chọn note" — dọn về một chỗ duy nhất (ribbon, luôn hiển thị).
- **Sidebar nâng cấp lên dạng cây thật** (tái dùng `.sb-row`/`.sb-chevron`/`.sb-guide`): dữ liệu đã hỗ trợ
  nesting qua `ApiFolder.parentId` (xác nhận trong `web/src/lib/webApi.ts`), chỉ là UI web hiện render phẳng.
  Làm cây mở/đóng, chevron, resize handle, rename-in-place, context menu cơ bản (New/Rename/Delete) — **bỏ
  qua kéo-thả sắp xếp** (phần phức tạp nhất của `Sidebar.tsx` desktop, ~100 dòng state machine, không ảnh
  hưởng hình ảnh tĩnh nên không cần cho mục tiêu "giống giao diện").
- **Icon**: file dùng chung mới `web/src/components/icons/index.tsx`, copy nguyên path SVG từ desktop cho
  icon đã có (Quick Open, New note, Graph, Calendar, Settings, chevron...), tự vẽ thêm theo đúng style cho
  icon web có mà desktop không có (Flashcards, Collab, Export PDF, Plugins, Snippets).
- **Sửa 3 component hardcode màu**: thay chuỗi hex bằng biến CSS tương ứng (bảng map lấy từ
  `web/src/lib/theme-utils.ts` — theme Catppuccin Mocha mặc định), chỉ là tìm-thay cẩn thận theo từng dòng,
  không viết lại component.

## File sẽ tạo mới

| File | Mô tả |
|---|---|
| `web/src/components/icons/index.tsx` | Bộ icon SVG dùng chung, copy style/path từ desktop |
| `web/src/components/Ribbon.tsx` | Dải icon trái cấp-vault (desktop inline trong `page.tsx`, web tách file riêng vì phải tái dùng SVG đã gom ở trên) |
| `web/src/components/VaultHeader.tsx` | Thay thế rút gọn của `TitleBar.tsx` — không nút cửa sổ, không tab bar |
| `web/src/components/NoteToolbar.tsx` | Dải hành động theo-note: Backlinks/Collab/Export PDF + đường dẫn + trạng thái lưu |
| `web/src/components/Sidebar.tsx` | Cây folder/note đệ quy trên `VaultIndex`, dựng mới theo `webApi` (không phải port trực tiếp vì desktop's bản dùng `electronAPI.readDir`) |
| `web/src/components/ContextMenu.tsx` | Port gần như nguyên vẹn từ desktop (đã xác minh không gọi `electronAPI`) |
| `web/src/components/VaultSwitcher.tsx` | Port từ desktop, chỉnh theo kiểu `ApiVault` (bỏ `path`/menu git) |
| `web/src/lib/editor-commands.ts` | Port các hàm thuần thao tác CodeMirror từ `desktop/src/lib/editor-commands.ts` (đã xác nhận không phụ thuộc electronAPI) |
| `web/src/components/FormattingToolbar.tsx` | Port từ desktop (41 dòng), nối vào `editor-commands.ts` thay vì hệ thống hotkey 60-action của desktop (nằm ngoài phạm vi) |

## File sẽ sửa

| File | Thay đổi |
|---|---|
| `web/src/app/vaults/[vaultId]/page.tsx` | Thay `<aside>` phẳng bằng `<Sidebar>`; thay toolbar per-note bằng `<NoteToolbar>`; bỏ dải nút chữ Calendar/Flashcards/Theme/Snippets (chuyển vào Ribbon); thêm `<VaultHeader>`; nối `editorViewRef` vào `FormattingToolbar`; bỏ nút Graph/Quick-open/Plugins trùng lặp ở màn hình trống |
| `web/src/components/CalendarView.tsx` | Thay hex → CSS var theo bảng map |
| `web/src/components/DataviewBlock.tsx` | Thay hex → CSS var theo bảng map |
| `web/src/components/FlashcardReview.tsx` | Thay hex → CSS var theo bảng map |

**Không cần sửa** (đã đúng, đã xác minh đọc trực tiếp): `BacklinksPanel.tsx`, `GraphView.tsx`,
`BoardView.tsx`, `QuickOpen.tsx`, `PluginManager.tsx`, `CollabPanel.tsx`, `ThemePicker.tsx`,
`CSSSnippets.tsx`, `globals.css` (không cần CSS mới, icon Collab/Flashcard trong ribbon tái dùng
`.ribbon-btn` có sẵn).

## Rủi ro đã xem xét, không đáng ngại

- `-webkit-app-region: drag` trong `.titlebar-controls`/`.mac-controls`: thuộc tính CSS không được trình
  duyệt thường nhận diện, bị bỏ qua an toàn — mà thiết kế `VaultHeader.tsx` mới còn không dùng tới
  `.mac-controls` nữa nên không liên quan.
- Trùng class Tailwind: đã kiểm tra, không class semantic nào của desktop (`.sb-row`, `.ribbon`, `.tab`...)
  trùng tên với utility class Tailwind v4.
  `Editor.tsx` của web đã dùng đúng phần CSS override CodeMirror trong `globals.css` từ trước, không đổi gì
  ở đây nên không rủi ro thêm.
- Ribbon web có nhiều icon hơn desktop (thêm Flashcards/Snippets/Plugins) — `.ribbon` không có max-height,
  có thể bị cắt ở màn hình thấp. Nếu xảy ra, sửa 1 dòng CSS thêm `overflow-y: auto` cho `.ribbon-top`, không
  phải thiết kế lại.
- `#585b70` map sang biến nào (`--scrollbar-hover` đúng số nhưng sai ngữ nghĩa, hay `--text-muted` đúng
  ngữ nghĩa nhưng lệch sắc nhẹ) — quyết định lúc code, không chặn kế hoạch.

## Xác minh sau khi triển khai

- `npx tsc --noEmit` sạch cho `web/`.
- Mở `http://localhost:3457` (hoặc production) bằng trình duyệt thật, so sánh trực quan với bản desktop:
  ribbon/sidebar/title bar phải có hình dạng tương tự (màu sắc, khoảng cách, icon), nhất quán giữa các note.
- Đổi theme qua ThemePicker, xác nhận CalendarView/DataviewBlock/FlashcardReview đổi màu theo (trước đây
  không đổi).
- Click từng nút đã chuyển vị trí (Calendar/Flashcards/Theme/Snippets/Graph/Quick open/Plugins trong
  ribbon; Backlinks/Collab/Export PDF cạnh note) để xác nhận không nút nào bị mất chức năng khi di chuyển.
- Thử sidebar: mở/đóng folder, rename note, context menu New/Rename/Delete.

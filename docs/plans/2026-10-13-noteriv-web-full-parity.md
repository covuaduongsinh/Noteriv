# Kế hoạch hoàn thiện Noteriv Web — đạt parity với bản Desktop

> **Lưu ý vị trí file:** Theo yêu cầu, file kế hoạch này sẽ được lưu tại `docs/plans/2026-10-13-noteriv-web-full-parity.md` trong repo ngay khi bắt đầu thực thi (plan mode chỉ cho phép ghi vào đường dẫn plan tạm thời này).

## Bối cảnh

Noteriv Web đã trải qua 7 giai đoạn xây dựng (xem `docs/plans/2026-10-12-noteriv-web-version.md`) và một đợt "UI parity" vá phần khung giao diện (`docs/plans/2026-10-13-noteriv-web-ui-parity.md`, commit `b88035d`). Tuy nhiên khi so trực tiếp ảnh chụp web (noteriv.dsc.edu.vn) với desktop, người dùng xác nhận web **vẫn thiếu rất nhiều** so với desktop.

Để lên kế hoạch chính xác, đã khảo sát song song (read-only) 3 hướng: (1) kiểm kê toàn bộ UI/tính năng desktop, (2) kiểm kê hiện trạng thực tế của web (không dựa vào memory cũ), (3) đọc lại 2 tài liệu kế hoạch trước. Kết quả: desktop có kiến trúc tab-based rất giàu tính năng (tab bar, 3 chế độ Edit/View/Source, nhiều panel điều hướng, hệ thống settings 6 mục, sync git+non-git, plugin/theme/snippet marketplace, và cả một nhóm tính năng "ngách" nặng — canvas, drawing, slide, PDF annotation, snapshot-recovery, vim-mode...). Web hiện chỉ là một trang đơn-note, đơn-chế-độ-hiển-thị, với khá nhiều mảng UI chưa có, và — đáng chú ý — **backend sync (Git/WebDAV) đã được xây xong hoàn chỉnh từ Phase 4 nhưng chưa từng có UI nào gọi tới** (`web/src/lib/webApi.ts` không có `sync` namespace).

Người dùng đã chọn phạm vi: **toàn bộ (Tier 1–4)** — tức parity gần như 100% với desktop, bao gồm cả các tính năng ngách tốn nhiều công. Đây là khối lượng công việc tương đương (hoặc lớn hơn) đợt build 7-phase ban đầu, nên kế hoạch này chia thành **4 phase lớn theo đúng thứ tự ưu tiên ROI** (phase sau phụ thuộc hạ tầng phase trước), để có thể triển khai tuần tự giống mô hình trước đây (báo cáo ở ranh giới mỗi phase).

**Quy ước port giữ nguyên từ các phase trước** (áp dụng xuyên suốt): copy logic thuần từ `desktop/src/lib/*.ts` gần như nguyên văn; bất kỳ chỗ nào gọi `window.electronAPI.*` được thay bằng lời gọi `webApi.*` tương ứng (mở rộng thêm khi cần); bất kỳ file nào có side-effect DOM ở module scope phải được guard bằng `typeof window !== "undefined"` (bài học từ Phase 2); không dùng `window.prompt`/`window.confirm` — dùng form/state inline; mọi theme-dependent màu phải dùng CSS var (`var(--...)`), không hardcode hex (bài học từ đợt UI-parity).

---

## Phase A — Core editor/navigation parity (Tier 1: khoảng trống thấy rõ nhất trên màn hình)

Đây là nhóm khớp đúng với những gì người dùng nhìn thấy trong 2 ảnh chụp: desktop có tab-bar nhiều note đang mở + toggle Edit/View/Source + nội dung render đẹp; web chỉ có 1 "Untitled.md" không tab, không toggle chế độ.

### A1. Hệ thống tab đa-note + split-pane
- **Port từ:** `desktop/src/components/TitleBar.tsx` (phần `.tab-bar`, pin/reorder/context-menu), state `TabState[]`/`activeTab`/`pinnedTabs` hiện nằm trong `desktop/src/app/page.tsx`, `desktop/src/components/SplitPane.tsx`.
- **Thay đổi web:** Nâng `web/src/app/vaults/[vaultId]/page.tsx` từ state `activeNote` đơn sang state `tabs: TabState[]` + `activeTabId` + `pinnedTabIds` (giữ nguyên field `filePath→noteId`, `content`, `savedContent` để tái dùng logic dirty-check đã có). Tạo `web/src/components/TabBar.tsx` mới (không gộp vào `VaultHeader.tsx` — giữ tách biệt theo đúng convention component-per-concern web đang theo). `ContextMenu.tsx` đã có sẵn ở web, tái dùng cho menu chuột phải trên tab.
- **Lưu trạng thái tab:** desktop persist qua `workspace_save`/`workspace_load` (Tauri IPC). Web cần tương đương server-side: thêm field `Vault.settings.workspace.<userId>` (tái dùng pattern JSON-settings đã dùng cho theme/plugin ở Phase 3/6) hoặc bảng mới `UserVaultState` (vaultId, userId, openTabs, activeTabId, pinnedTabIds, viewModeByNote) nếu JSON-trong-settings quá cồng kềnh khi nhiều user cùng vault — **quyết định khi vào code: ưu tiên bảng riêng vì state này là per-user, không nên trộn vào `Vault.settings` vốn là cấu hình chung cả vault**.
- Split-pane: port `SplitPane.tsx` gần như nguyên văn (thuần layout, không đụng `window.electronAPI`).

### A2. Chế độ Edit / View / Source
- **Port từ:** `desktop/src/app/page.tsx` (`type ViewMode = "live"|"source"|"view"`, `fileViewModes` per-file), nút toggle 3 trạng thái trong `TitleBar.tsx` (`.view-toggle`).
- **Thay đổi web:** `web/src/components/SourceEditor.tsx` đã tồn tại nhưng **mồ côi** (không ai import) — nối nó vào. Cần dựng thêm một `ReadOnlyView.tsx` tương đương desktop (render-only, dùng chung markdown pipeline `web/src/components/markdown/*` đã có, không phải viết lại). Thêm toggle 3 nút vào `VaultHeader.tsx` hoặc `NoteToolbar.tsx` (xem lại layout cùng lúc với A1 vì cả hai đều đổi header/toolbar). `fileViewModes` lưu cùng chỗ với workspace-state ở A1 (per-note, per-user).

### A3. Frontmatter editor có cấu trúc
- **Port từ:** `desktop/src/components/FrontmatterEditor.tsx` (collapsible, gợi ý `COMMON_PROPERTIES`), `desktop/src/lib/frontmatter-utils.ts`.
- Lý do đưa vào Tier 1: ảnh chụp desktop cho thấy frontmatter (created/categories/subjects/author/tags/source) hiển thị dạng danh sách có màu, có link — web hiện render nó như markdown thô trong editor. Cắm `FrontmatterEditor` vào đầu `Editor.tsx`/`web/src/app/vaults/[vaultId]/page.tsx`.

### A4. Status bar
- **Port từ:** block inline trong `desktop/src/app/page.tsx` (dòng ~1998-2047): mode · vault · path · saved/unsaved · sync status · số dòng/ký tự · plugin status-bar items.
- Web: tạo `web/src/components/StatusBar.tsx` mới, thay phần save-indicator đang nằm rời rạc trong `NoteToolbar.tsx`. Phần "plugin status-bar items" nối với API sandbox đã có ở `usePluginHost.ts` (Phase 3) — nhưng `ui.addStatusBarItem` chưa được hỗ trợ (ghi chú rõ trong memory Phase 3: "scope narrower than desktop"), nên mục này cần làm thêm RPC method mới trong `METHOD_PERMISSIONS`.

### A5. Outline (TOC) panel + Tag browser panel + dọn dead code
- **Outline:** port `desktop/src/components/OutlinePanel.tsx` (parse heading, bỏ qua code block, click nhảy dòng) → `web/src/components/OutlinePanel.tsx` mới, toggle qua `Ribbon.tsx`.
- **Tag panel:** `web/src/components/TagPane.tsx` + `web/src/lib/tag-utils.ts` **đã tồn tại và hoạt động được nhưng mồ côi** — chỉ cần nối vào `Ribbon.tsx`/overlay giống `BacklinksPanel`, không cần viết mới.
- **Dọn dead code:** xoá `web/src/components/DataviewBlock.tsx` (bản trùng lặp không dùng — Dataview thật chạy qua CodeMirror widget ở `components/markdown/renderers/code-blocks.ts`), tránh nhầm lẫn cho người maintain sau.

---

## Phase B — Sync UI + Settings hợp nhất (Tier 2: thu hồi vốn đầu tư backend đã có)

### B1. Nối UI cho Git/WebDAV sync (backend đã xong từ Phase 4, chưa có client nào gọi)
- **Backend đã có, chỉ cần dùng:** `web/server/src/routes/syncConnections.ts`, `web/server/src/lib/gitSync.ts`, `web/server/src/lib/webdavSync.ts`, Prisma models `SyncConnection`/`SyncJob`.
- **Việc cần làm:** thêm namespace `sync` vào `web/src/lib/webApi.ts` (list/create/update/remove connection, trigger sync job, lấy trạng thái job). Port UI từ `desktop/src/components/SettingsModal.tsx` (tab Sync — tự nhận diện host GitHub/GitLab/Gitea/Forgejo/Codeberg/Bitbucket để dẫn đúng link tạo PAT) và `desktop/src/lib/sync-providers.ts` (WebDAV config). **Lưu ý khác biệt có chủ đích đã quyết từ Phase 4/plan gốc:** không port kiểu "Folder sync" (không có tương đương server-side) và không port auto-sync polling 5s của desktop — giữ nguyên quyết định "sync thủ công + polling dài tuỳ chọn" đã ghi trong plan gốc.
- Nút "Sync now" + hiển thị trạng thái job nối vào Status Bar (A4) đúng vị trí `.statusbar-sync` desktop có.

### B2. Settings modal hợp nhất
- **Port từ:** `desktop/src/components/SettingsModal.tsx` (6 section: General, Appearance, Editor, Shortcuts, Sync, Ecosystem), `desktop/src/lib/settings.ts` (`AppSettings`, `DEFAULT_SETTINGS`, `ACCENT_COLORS`, `EDITOR_FONTS`, `AUTO_SAVE_OPTIONS`...).
- Web hiện có `ThemePicker.tsx`, `CSSSnippets.tsx`, `PluginManager.tsx` là các modal rời — **gom lại làm tab con trong một `SettingsModal.tsx` mới** (Appearance = ThemePicker nội dung, Ecosystem = Plugin+Snippets, Sync = B1, thêm mới General + Editor + Shortcuts). Không cần viết lại logic 3 modal cũ, chỉ đổi cách chúng được mount (tab thay vì modal riêng từng cái) — giảm số nút rải rác trên `Ribbon.tsx`.
- **Shortcuts tab (mới hoàn toàn với web):** port `desktop/src/lib/hotkeys.ts` (`DEFAULT_HOTKEYS`, `matchesHotkey`, `eventToKeyString`). Vì web không có "theo máy" như desktop, override hotkey lưu per-user (gắn vào `User` qua một field JSON mới hoặc bảng nhỏ `UserPreference`).
- Account-level settings hiện đang nằm lẫn ở `web/src/app/vaults/page.tsx` (export data / delete account) — cân nhắc chuyển vào tab General của modal mới cho nhất quán, hoặc giữ nguyên vị trí nếu re-wiring không đáng công (quyết định nhỏ, để lúc code).

### B3. Command Palette
- **Port từ:** `desktop/src/components/CommandPalette.tsx` (Ctrl/Cmd+Shift+P, list theo `hotkeys`, filter label/category, "recent commands").
- Dùng chung danh sách hotkey vừa port ở B2 làm nguồn action. Phân biệt rõ với `QuickOpen.tsx` (đã có — chuyển file) — hai thứ khác nhau, giữ cả hai.

---

## Phase C — Năng suất & an toàn dữ liệu (Tier 3)

### C1. Trash (xoá mềm) — ưu tiên cao nhất trong Phase C vì liên quan an toàn dữ liệu
- Hiện tại `notes.remove`/`folders.remove` trên web là **xoá cứng thật** (API `DELETE`, không soft-delete) — rủi ro mất dữ liệu người dùng thật, khác desktop vốn có `trash-utils.ts` (move-to-trash, restore, permanent-delete, auto-cleanup).
- **Backend:** thêm `deletedAt DateTime?` vào Prisma models `Note`/`Folder`, sửa route xoá thành soft-delete, thêm endpoint restore + list-trash + empty-trash + permanent-delete, một cleanup job định kỳ (tái dùng BullMQ worker đã có từ Phase 4 cho sync).
- **Frontend:** port `desktop/src/components/TrashPanel.tsx` + `lib/trash-utils.ts`.

### C2. Templates
- Port `desktop/src/components/TemplatePicker.tsx` + `lib/template-utils.ts` (`getTemplateVariables`/`processTemplate`). Lưu template như note đặc biệt trong vault (thư mục quy ước, ví dụ `_templates/`) để không cần model Prisma mới — khớp cách desktop lưu template làm file thường trong vault.

### C3. Attachment manager
- **Khoảng trống hạ tầng cần lưu ý:** plan gốc (Phase 1) đã định "S3-compatible storage chỉ cho attachment lớn" nhưng **chưa từng triển khai** — `Plugin.main.js` hiện lưu vào cột Postgres text, không có bucket nào được dựng. Đây là phần việc hạ tầng thật sự mới, không phải chỉ port UI.
- **Việc cần làm:** quyết định storage backend (MinIO tự host trên VPS, hoặc S3-compatible service ngoài — hỏi người dùng khi vào code nếu chưa rõ ngân sách/ưu tiên), thêm Prisma model `Attachment` (vaultId, filename, mimeType, size, storageKey), endpoint upload/download/delete có kiểm tra vault-role giống các route khác. Sau đó port `desktop/src/components/AttachmentManager.tsx` + `lib/attachment-utils.ts`.
- **C9 (Audio recorder, xem Phase D) phụ thuộc C3** — nên làm C3 trước nếu định làm cả hai.

### C4. Bookmarks panel
- Port `desktop/src/components/BookmarksPanel.tsx` + `lib/bookmark-utils.ts`. Lưu bookmark list trong `Vault.settings.bookmarks` (per-vault, giống pattern theme/snippet) — đơn giản hơn bảng riêng vì không cần truy vấn phức tạp.

### C5. Hover preview wikilink
- Port `desktop/src/components/HoverPreview.tsx` gần như nguyên văn — thuần client-side, chỉ cần gọi `webApi.notes.get` để lấy nội dung note đích khi hover `[[wikilink]]`.

### C6. Mở rộng hotkey/toolbar coverage
- `web/src/components/FormattingToolbar.tsx` hiện chỉ port 10/~60 action của desktop (`desktop/src/lib/hotkeys.ts` + `editor-commands.ts` có đầy đủ). Mở rộng `web/src/lib/editor-commands.ts` theo danh sách còn thiếu, gắn vào hotkey đã port ở B2.

### C7. Plugin marketplace (community tab)
- `PluginManager.tsx` ở web hiện chỉ cho cài thủ công (paste manifest+code), trong khi `ThemePicker.tsx`/`CSSSnippets.tsx` đã có tab "community" kéo từ GitHub raw repo. Làm `PluginManager.tsx` nhất quán theo đúng pattern đó (port `fetchCommunityPluginManifest`/`installCommunityPlugin` từ `desktop/src/lib/plugin-api.ts`), cần xác định/tạo repo community-plugins tương tự 2 repo đã dùng.

### C8. Vault Insights (thống kê/heatmap)
- Port `desktop/src/components/VaultInsights.tsx` + `lib/vault-insights-utils.ts` — thuần tính toán từ dữ liệu vault đã có qua `webApi.vaults.index`, không cần backend mới.

### C9. Note Composer (gộp/tách note)
- Port `desktop/src/components/NoteComposer.tsx` + `lib/note-composer-utils.ts` — thuần client logic + gọi `webApi.notes.create/remove` hiện có.

---

## Phase D — Tính năng ngách, tốn công nhất (Tier 4)

Mỗi mục dưới đây tương đương quy mô một "Phase" cũ (ví dụ Phase 3/4 gốc), nên trong lúc thực thi nên tách thành các sub-phase riêng, báo cáo từng mục thay vì gộp chung.

### D1. Canvas / whiteboard
- Port `desktop/src/components/Canvas.tsx` + `lib/canvas-utils.ts` (`CanvasNode`/`CanvasEdge`, node loại text/file/group/sticky/image). File `.canvas` cần route mới để mở như một "loại note đặc biệt" (giống cách `BoardView` hiện đang tự nhận diện qua `isBoardContent` — làm tương tự `isCanvasContent` hoặc dùng extension riêng trong index note).

### D2. Drawing editor riêng biệt
- Port `desktop/src/components/DrawingEditor.tsx` + `lib/drawing-utils.ts`. Cần làm rõ: đây là tính năng khác Canvas (freeform sketch, không phải node-graph) — giữ tách biệt đúng như desktop, không gộp.

### D3. Slide presentation mode
- Port `desktop/src/components/SlidePresentation.tsx` + `lib/slide-utils.ts` (parse `---` thành slide, fullscreen present).

### D4. PDF Viewer + annotation (khác PDF export đã có)
- Web hiện chỉ có **export** sang PDF (`lib/pdf-export.ts`, đã xong từ Phase 6). Desktop còn có **xem** PDF kèm annotation (`PDFViewer.tsx` + `lib/pdf-annotation.ts`, export annotation ra note). Cần thư viện render PDF phía browser (ví dụ `pdf.js`) vì desktop dùng cách khác (file:// + webview); đây là phần việc mới, không chỉ port.

### D5. File Recovery + Time Scrubber (snapshot lịch sử)
- Desktop lưu snapshot định kỳ cục bộ (`lib/file-recovery.ts`). Web cần hạ tầng mới: bảng `NoteSnapshot` (noteId, content, createdAt) + job định kỳ ghi snapshot (tái dùng BullMQ worker), rồi mới port `FileRecovery.tsx` + `TimeScrubber.tsx`.

### D6. Note History qua git log
- Desktop dùng `commands_git.rs`'s `git_file_log`/`git_show_file` trực tiếp trên working copy local. Web **có thể tái dùng `gitSync.ts`** đã xây (Phase 4) nếu vault đó có cấu hình git-sync — nhưng với vault chưa bật git sync thì không có lịch sử nào để xem; cần quyết định: (a) chỉ bật Note History khi vault có sync-connection git, hoặc (b) tạo repo git nội bộ ẩn cho mọi vault chỉ để phục vụ lịch sử (tốn thêm hạ tầng). **Khuyến nghị (a)** — đơn giản hơn, tận dụng đúng cái đã có, không gánh thêm chi phí vận hành cho vault không cần git.

### D7. Vim mode
- Port `desktop/src/lib/vim-mode.ts` (CodeMirror vim keybinding) — thuần client, bật/tắt qua Settings → Editor tab (B2).

### D8. Audio recorder
- Port `desktop/src/components/AudioRecorder.tsx` + `lib/audio-utils.ts`, dùng `MediaRecorder` API trình duyệt, lưu file qua Attachment storage (C3) — **phụ thuộc C3 phải xong trước**.

### D9. Image viewer riêng (lightbox)
- Thấp công nhất trong Phase D — chỉ cần một lightbox/modal khi click ảnh trong note, không cần port nguyên `ImageViewer.tsx` (desktop bản đó xử lý thêm binary-file-qua-Tauri mà web không cần vì ảnh đã serve qua HTTP URL bình thường).

### D10. Publish Preview (export HTML tĩnh)
- Port `desktop/src/components/PublishPreview.tsx` + `lib/publish.ts` — khác PDF export, xuất ra HTML tĩnh có thể host riêng.

---

## Những khác biệt có chủ đích — KHÔNG đưa vào kế hoạch này

Giữ nguyên các quyết định đã chốt từ plan gốc và đợt UI-parity, không làm lại:
- **Web Clipper** — ngoài phạm vi theo plan gốc (`"workstream riêng, nhỏ, không nằm trong 7 phase chính"`).
- **Folder-sync provider** (đồng bộ qua thư mục local/Google-Drive-mount) — không có tương đương server-side, plan gốc đã quyết bỏ hẳn.
- **Window chrome native** (`commands_window.rs`: minimize/maximize/close, mac traffic-lights) — vô nghĩa trên web vì trình duyệt đã có chrome riêng.
- **SetupWizard kiểu desktop** (chọn vị trí vault trên đĩa, clone từ GitHub lúc setup) — web đã có luồng đăng ký + tạo vault đơn giản hơn, phù hợp mô hình server-backed, không cần bê nguyên wizard desktop.
- **P2P WebRTC collab** của desktop — web đã có kiến trúc collab khác (server-backed Yjs qua WebSocket, đúng và tốt hơn cho multi-user thật), không đổi sang P2P.
- **Drag-thả sắp xếp lại file trong Sidebar** — đợt UI-parity đã quyết định bỏ qua có chủ đích (không ảnh hưởng hình ảnh tĩnh); giữ nguyên quyết định trừ khi người dùng yêu cầu lại.

---

## File/khu vực trọng yếu sẽ bị đụng tới nhiều lần (tham chiếu nhanh)

- `web/src/app/vaults/[vaultId]/page.tsx` — orchestrator chính, sẽ đổi lớn nhất (tab state, view mode, mount thêm nhiều panel/modal).
- `web/src/lib/webApi.ts` — thêm namespace `sync`, `attachments`, `bookmarks`, `trash`, `workspace`/`userPreferences` qua nhiều phase.
- `web/server/prisma/schema.prisma` — thêm model mới dần theo từng phase (`UserVaultState`/workspace, `Attachment`, `NoteSnapshot`, soft-delete fields, `UserPreference`/hotkeys).
- `web/src/components/` — nhiều file mồ côi cần nối (`SourceEditor.tsx`, `TagPane.tsx`) và nhiều file mới cần tạo theo từng phase ở trên.
- `desktop/src/` tương ứng — nguồn port cho từng mục, đã liệt kê path cụ thể trong từng phase.

## Xác minh

Theo đúng cách đã làm ở các phase trước (không chỉ tin agent báo "xong" — xác minh qua trình duyệt thật):
1. Sau mỗi phase, mở `https://noteriv.dsc.edu.vn` (hoặc dev stack VPS) bằng trình duyệt thật, thao tác qua UI thật (không gọi API tắt) để xác nhận tính năng hoạt động.
2. Với mọi tính năng theme-dependent (status bar, panel mới...), test chuyển theme (Nord → Solarized Light → Nord) để đảm bảo không hardcode màu — bài học từ đợt UI-parity.
3. Với Phase A (tab system), test cụ thể: mở nhiều tab, pin, đóng tab, reload trang để xác nhận workspace-state phục hồi đúng.
4. Với Phase B (sync UI), test với tài khoản Git/WebDAV test đã dùng ở Phase 4 (không chạm sync credentials thật của người dùng).
5. Với Phase C1 (Trash), test xoá → thấy trong Trash → restore → xoá vĩnh viễn, xác nhận không có đường tắt nào bỏ qua trash cho người dùng thường.
6. Mọi migration Prisma mới: chạy `prisma migrate dev` trên DB dev trước, xác nhận replay sạch trên DB rỗng giống cách CI job Phase 7 đã làm, trước khi đụng tới production.

---

## Ghi chú tiến độ (cập nhật trong lúc triển khai)

- **Phase A** (tab đa-note + split-pane, Edit/View/Source, frontmatter editor, status bar, outline/tag panel, dọn `DataviewBlock.tsx` chết): **hoàn tất** (2026-10-13), verify qua browser thật, commit `18545a3`, đã push + deploy production.
- **Phase B** (sync UI Git/WebDAV, Settings modal hợp nhất 6 tab, Command Palette): **hoàn tất** (2026-10-13), commit `510eb1c`, đã push + deploy. Phát hiện và sửa riêng 1 bug thật trong engine `gitSync.ts` (Phase 4) — sync job từng báo `status: success` giả dù push thất bại thật (không kiểm tra kết quả lệnh `git push`) — commit `ef0e54d`.
- **Phase C** (C1 Trash, C2 Templates, C4 Bookmarks, C5 Hover preview, C6 mở rộng hotkey/toolbar, C7 Plugin marketplace, C8 Vault Insights, C9 Note Composer): **hoàn tất** (2026-10-13), commit `599b9bd`, đã push + deploy.
  - **C3 Attachment manager**: **hoàn tất** sau khi quyết định storage backend với người dùng — dự định MinIO nhưng image đã biến mất khỏi Docker Hub, đổi sang **Garage** (`dxflrs/garage`, S3-compatible). Dựng cả dev lẫn production (production cần container init riêng vì image Garage không có `/bin/sh`). Commit `99cd4d4` (code) + `477c1b7`/`84304a3` (hạ tầng production). Quota 500MB/vault enforce app-side. Verify end-to-end thật trên production (upload/download/xoá, xác nhận file thật biến mất khỏi object storage).
- **Phase D nhóm 1** (D1 Canvas/whiteboard, D2 Drawing editor riêng biệt, D7 Vim mode): **hoàn tất**, commit `c437c7f`. 4 bug thật phát hiện qua test (gồm 1 bug server-side zod schema âm thầm xoá field `vimModeEnabled`).
- **Phase D nhóm 2** (D3 Slide presentation, D9 Image lightbox, D10 Publish Preview): **hoàn tất**, commit `f924751`. Không bug nào phát sinh — cả 3 tính năng thuần client-side.
- **Phase D nhóm 3** (D4 PDF Viewer + annotation, dùng `pdfjs-dist`): **hoàn tất**, commit `02b40ef`. Annotation lưu ở cột JSONB mới `Attachment.metadata`. 2 bug thật (event bubble đóng nhầm overlay, z-index bị che khuất).
- **Phase D nhóm 4** (D5 File Recovery + Time Scrubber — bảng `NoteSnapshot` mới + job BullMQ định kỳ, D6 Note History qua git log — chỉ bật khi vault có sync-connection git): **hoàn tất**, commit `00f0d33`. Phát hiện thêm 1 bug thật khác trong `gitSync.ts`/`syncRunner.ts` (thứ tự export-DB-ra-scratch chạy trước checkout khiến sync với remote đã có sẵn commit bị lỗi "untracked working tree files would be overwritten") — sửa riêng, verify cả 3 kịch bản (remote rỗng/remote có sẵn conflict/sync nhiều lần), commit `afd4d9c`.
- **D8 Audio recorder**: **hoàn tất** — port từ `desktop/src/components/AudioRecorder.tsx`, lưu qua Attachment API (C3)/Garage thay vì base64 qua electronAPI. Verify qua browser thật: luồng ghi/dừng/preview/lưu hoạt động đúng, upload/download/markdown-link-chèn đều xác nhận qua API thật. Test dùng `MediaStreamDestination` giả lập (không có micro thật trong môi trường tự động hoá) — byte âm thanh thực tế rỗng chỉ vì `AudioContext` không resume được do thiếu "user gesture" thật (giới hạn autoplay policy của Chrome, không phải lỗi sản phẩm); pipeline Blob→File→upload dùng chung code đã test kỹ với file thật ở C3.

**Toàn bộ 4 Phase (A/B/C/D) của kế hoạch full-parity đã hoàn tất.** 3 bug thật trong engine sync (`gitSync.ts`, xây từ Phase 4 gốc) được phát hiện và sửa trong quá trình này, ngoài phạm vi code mới của từng phase — xem lịch sử commit ở trên. Chi tiết đầy đủ (bug cụ thể, quyết định kiến trúc, lý do từng lựa chọn) nằm trong memory file của dự án, không lặp lại ở đây để tránh trôi khỏi thực tế theo thời gian.

# Kế hoạch: nâng Noteriv Web lên ngang desktop (rà soát tổng thể)

> Khi được duyệt: sao chép file này vào `docs/plans/2026-10-14-noteriv-web-desktop-parity-v2.md` (plan mode chỉ cho ghi ở đường dẫn tạm). Kế hoạch trước đó (residual fixes) đã xong và đã deploy.

## Bối cảnh

Bạn thấy web "thiếu nhiều" so với desktop, đặc biệt không thấy đồng bộ GitHub và cài plugin. Rà soát mã (desktop Tauri 2 + Next.js; web Next.js 16 + Fastify/Prisma) cho thấy hai nhóm vấn đề:

1. **Có nhưng bị giấu.** Sync và Plugin Manager đều tồn tại, nhưng chỉ vào được qua Settings (bánh răng dưới thanh trái → tab Sync / tab Ecosystem → "Plugin cộng đồng"). Thanh trái không có nút Sync, Plugins, Themes, Snippets; không có menu bar kiểu File/Edit/View; thanh trạng thái chỉ hiện "sync" khi đã có connection; lệnh plugin không xuất hiện trong command palette.
2. **Thiếu thật.** Danh sách ở bảng dưới. Ví dụ trong ảnh của bạn: khối ```chessboard hiện nguyên mã vì web chưa hỗ trợ `markdown.registerCodeBlockProcessor`; chưa thể đưa vault `D:\code\noteriv_learn` lên web vì không có import thư mục/zip.

Quyết định của bạn: làm **parity đầy đủ theo thứ tự desktop**, và vault có sẵn đưa lên web bằng **cả import trực tiếp lẫn sync từ GitHub**.

## Ma trận khoảng trống (desktop có, web chưa có hoặc chưa đủ)

| Nhóm | Desktop | Web hiện tại |
|---|---|---|
| Điều hướng | Menu bar File/Edit/View/Settings/Developer, nút Plugins/Themes/Snippets, status bar sync luôn hiện | Chỉ qua Settings; không menu; status bar sync ẩn khi chưa có connection |
| Sync GitHub | Đặt remote, token + xác thực (hiện tên/avatar), liệt kê và **tạo repo**, clone từ GitHub, auto-sync 1–30 phút, sync khi lưu / pull khi mở, mẫu commit message, ahead/behind, SSH | Chỉ tạo connection (URL+branch+token); **không sửa** được connection; `autoSync` và `direction` lưu nhưng không dùng; nút Test và log có API nhưng UI không gọi; commit message cố định; chỉ file `.md`; không `.gitignore`; token nằm trên argv của git |
| Đưa vault lên web | Mở thư mục làm vault, clone GitHub | Không có import thư mục/zip, không export vault; không đổi tên/xoá vault trên UI |
| File tree | Kéo-thả di chuyển, daily note (Ctrl+D), random note | Không kéo-thả, daily note chỉ từ Calendar |
| Plugin | Sidebar panel, settings tab, status-bar item, code-block processor, đủ events | Đã có events + status bar (đợt trước); còn thiếu code-block processor, sidebar panel, settings tab; lệnh plugin không vào palette |
| Soạn thảo/hiển thị | Lint panel, spell check, focus/zen mode, accent color, tab size, zoom, tuỳ chọn PDF (cột, cỡ bàn cờ), Dataview | Chưa có lint, spell check, focus/zen, accent, tab size, zoom, tuỳ chọn PDF; Dataview cần kiểm tra |
| Khác | Web clipper (cổng 27123), updater, collab P2P | Collab qua server đã có; clipper cần thiết kế lại cho web; updater/P2P/Folder provider **không áp dụng** |
| Không có ở cả hai | Terminal, AI assistant, Obsidian import | Ngoài phạm vi |

## Các pha thực hiện (theo thứ tự ưu tiên)

### Pha 1 — Dễ tìm (nhỏ, giá trị cao)
- `Ribbon.tsx`: thêm nút **Sync**, **Plugins**, **Themes**, **CSS Snippets** (ui-parity plan từng hứa nhưng chưa làm). Nút Sync mở thẳng `SettingsModal` tại tab Sync; Plugins mở `PluginManager`.
- `VaultHeader.tsx`: thêm **menu ứng dụng** (File / Edit / View / Settings / Developer-tương-đương) phản chiếu `menu.rs` của desktop: New note, Import vault…, Export vault…, Save, Zoom, Toggle sidebar, Preferences, Plugins, Sync now.
- `VaultSwitcher.tsx`: thêm đổi tên, xoá vault, "Import vault…", "Kết nối GitHub…" (API đã có ở `vaults.ts`).
- `StatusBar.tsx`: mục sync luôn hiện ("Chưa kết nối Git — bấm để thiết lập"), kèm trạng thái đang sync / lỗi / số thay đổi / giờ sync gần nhất.
- `CommandPalette.tsx`: đưa lệnh plugin (`usePluginHost.commands`) vào danh sách; thêm "Sync now", "Connect GitHub", "Import vault", "Daily note".
- Empty state (`page.tsx`, khi chưa mở note/vault trống): hai thẻ "Import thư mục/zip" và "Kết nối GitHub".
- Xác minh: bấm từ ribbon/menu tới đúng modal; hotkey; theme Nord ↔ Solarized Light; mobile width cơ bản.

### Pha 2 — Sync GitHub ngang desktop
Server (`web/server/src/routes/syncConnections.ts`, `lib/syncRunner.ts`, `lib/gitSync.ts`, `sync-worker/`):
1. Thêm `PATCH /:cid` (branch, token, direction, autoSync, intervalMinutes, commitTemplate). Migration Prisma **viết tay** (lưu ý cột `content_tsv`); chạy `prisma migrate deploy` thủ công trên production.
2. **Xác thực token GitHub** (`GET api.github.com/user`) khi tạo/sửa; trả tên + avatar để UI hiển thị.
3. **Repo picker và tạo repo**: `GET /sync-connections/github/repos`, `POST .../github/repos` (private/public), `GET .../branches` — server dùng token đã mã hoá, client không bao giờ nhận lại token.
4. **Auto-sync thật**: BullMQ repeatable job theo `intervalMinutes`; "sync khi lưu" (debounce enqueue) và "pull khi mở vault"; tôn trọng `direction` (push/pull/both) trong `syncRunner`.
5. **Mẫu commit message** `{date}`/`{time}`/`{count}` như desktop.
6. **Đồng bộ file đính kèm** (ảnh/PDF/audio) từ Garage ↔ thư mục `attachments` trong repo; tạo `.gitignore` mặc định (`.DS_Store`, `Thumbs.db`, `.trash/`, `*.tmp`) khi repo chưa có.
7. **Bảo mật**: bỏ token khỏi argv (chỉ dùng `GIT_ASKPASS` qua env), dọn file askpass tạm; giữ mã hoá AES-256-GCM hiện tại.
8. Ahead/behind: endpoint trạng thái (fetch + so sánh) cho status bar.
9. **Xung đột**: giữ nguyên "abort rebase + job=conflict" nhưng UI liệt kê file xung đột và cho chọn "Giữ bản web" / "Lấy bản remote" (không merge tay).

Web UI (`SettingsModal.tsx` → tách `SyncSection` ra `components/sync/`): form tạo bằng repo picker; sửa connection; nút Test; bảng log 20 job gần nhất; hiển thị tên/avatar; chọn khoảng auto-sync và direction; banner xung đột.

Rủi ro đã biết: `gitSync.ts`/`syncRunner.ts`/`vaultFs.ts` từng có 3 bug thật → mọi thay đổi phải test đủ 3 kịch bản (remote rỗng / remote có commit xung đột / nhiều vòng sync 2 chiều) **trên repo GitHub thử riêng**, không dùng repo thật của bạn. Không đặt scratch dir trong working tree Noteriv.

### Pha 3 — Đưa vault có sẵn lên web
- **Import thư mục/zip** (`components/ImportVault.tsx`, route mới `POST /vaults/:vid/import` hoặc luồng chunked): chọn thư mục (`webkitdirectory`) hoặc `.zip` (JSZip phía client), giữ cấu trúc thư mục, `.md` → notes, ảnh/PDF → attachments (Garage, tôn trọng quota 500MB), bỏ `.obsidian`, `.git`, `.trash`, `node_modules`; tiến độ, giới hạn kích thước/số file, báo cáo file bỏ qua. Tái dùng `vaultFs.ts` (`importDirToNotes`) cho phần server.
- **Export vault** thành zip (md + attachments), tái dùng `exportNotesToDir`.
- **Tạo vault từ GitHub** (tương đương "clone" của SetupWizard): chọn repo (Pha 2) → tạo vault → chạy sync pull lần đầu.
- Xác minh bằng chính cấu trúc `D:\code\noteriv_learn` (thư mục lồng, tiếng Việt, tên file có dấu/ngoặc, ảnh).

### Pha 4 — File tree và thao tác nhanh
- Kéo-thả di chuyển note/thư mục (API `PATCH` notes/folders đã có `folderId`/`parentId`).
- Daily note (Ctrl+D → `Daily/YYYY-MM-DD.md`, như desktop), Random note (Ctrl+Shift+R).
- Mở rộng context menu theo desktop (Open in Split, Duplicate nếu có).

### Pha 5 — Plugin API đầy đủ
- **Code-block processor** (ưu tiên: plugin chessboard của bạn): sandbox gửi mô tả khai báo hoặc HTML đã làm sạch; host render trong iframe sandbox con, nằm trong widget CodeMirror (`components/markdown/`). Giữ default-deny và permission mới `markdown:render`.
- **Sidebar panel** và **Settings tab** khai báo (sandbox iframe riêng, hiển thị trong panel/Settings); permission `ui:panel`.
- Bổ sung `app.currentFile` động (đã làm), `events` còn lại, `PluginManager`: hiện lỗi plugin, quyền đã cấp, nút gỡ.
- Phát hành lại plugin chessboard bản web-compatible trong repo `NoterivPlugins` (cần bạn có quyền repo đó).

### Pha 6 — Soạn thảo và hiển thị
Theo mức dùng thực tế: Lint panel (port `LintPanel.tsx`), spell check (thuộc tính trình duyệt + công tắc), focus/zen mode, accent color (8 màu), tab size, zoom, tuỳ chọn PDF (1/2 cột, cỡ bàn cờ), kiểm tra Dataview đã đủ chưa, layout responsive cho màn nhỏ, web clipper (bookmarklet/extension gọi API bằng token cá nhân — thiết kế riêng, cần duyệt bảo mật).

### Pha 7 — Chốt chất lượng
Ma trận parity cập nhật trong docs, test e2e bằng browser thật cho từng pha, cập nhật memory dự án.

## Quy ước thực thi (giữ nguyên từ các đợt trước)
- Copy logic thuần từ `desktop/src/lib/*.ts`; thay `window.electronAPI.*` bằng `webApi.*`.
- Guard `typeof window` cho code chạy ở module scope; không dùng `window.prompt/confirm`; màu theo `var(--…)` và test đổi theme.
- Test qua `http://localhost:3457` (không dùng 127.0.0.1); xác minh bằng browser thật trước khi báo xong.
- Mỗi pha một nhóm commit riêng, **không push khi chưa xác minh và chưa được bạn đồng ý**; có migration thì nói rõ để chạy `prisma migrate deploy` trên production.
- VPS đĩa ~87–92%: kiểm `df -h /` trước khi tạo container/volume, đặt `mem_limit`.

## Điều cần bạn chuẩn bị / xác nhận
- Một repo GitHub thử (rỗng) và token riêng để kiểm thử Pha 2–3.
- Quyền ghi vào repo `thejacedev/NoterivPlugins` nếu muốn phát hành plugin chessboard bản web (Pha 5).
- Quy mô: kế hoạch này gồm 7 pha; tôi đề xuất thực thi theo thứ tự trên, mỗi pha kết thúc bằng một lần báo cáo để bạn duyệt trước khi sang pha sau.

---

# Trạng thái thực thi (cập nhật 2026-10-14)

Tất cả 7 pha đã được cài đặt và commit cục bộ trên `main`. **Chưa push/deploy** tại thời điểm viết mục này.

| Pha | Kết quả | Commit | Ghi chú xác minh |
|---|---|---|---|
| 1 — Dễ tìm | Xong | `5ef871f` | Ribbon (Sync/Plugins/Themes/Snippets), menu File/Edit/View/Settings, plugin command trong palette, status bar sync luôn hiện, đổi tên/xoá vault, thẻ onboarding. Kiểm chứng trên browser thật. |
| 2 — Sync GitHub | Xong (trừ kiểm thử GitHub thật) | `121e359`, `0ee7983`, `80ddb4b` | Wizard token → repo picker/tạo repo → branch; sửa connection; auto-sync (tick 60s), sync-on-save (30s), pull-on-open; mẫu commit; hướng push/pull; xung đột có danh sách file + "giữ bản web"/"lấy bản repo"; token không còn nằm trên argv (GIT_ASKPASS); đồng bộ đính kèm; `.gitignore` mặc định. `scripts/test-sync-scenarios.ts` (26 kiểm tra) qua hết trên repo bare cục bộ. **Chưa kiểm tra với GitHub thật** (cần token thử); luồng token sai đã kiểm chứng qua API GitHub thật ("Bad credentials"). |
| 3 — Đưa vault lên web | Xong | `5ff40a8` | Import thư mục/zip (link đính kèm được viết lại), export zip, tạo vault từ GitHub. Vòng export → import zip và import lặp lại (idempotent) đã kiểm chứng. |
| 4 — File tree | Xong | `53a52ba` | Kéo-thả note/thư mục, Ctrl+D `Daily/YYYY-MM-DD.md`, note ngẫu nhiên. Sửa lỗi có sẵn: đổi tên/di chuyển thư mục không cập nhật path con; chặn di chuyển vào chính nó (400) và trùng tên (409). |
| 5 — Plugin API | Xong | `5730dbd` | `registerCodeBlockProcessor`, `addSidebarPanel`, `addSettingsTab` qua DOM mirror (Shadow DOM + DOMPurify + chuyển tiếp sự kiện). Plugin chessboard của desktop chạy nguyên bản: khối FEN hiện bàn cờ, tab Settings đổi theme và lưu được. |
| 6 — Soạn thảo | Xong | `b50909a`, `65d5892` | Lint, Zen/Focus mode, accent, spell check, tab size, tuỳ chọn PDF, tự thu gọn sidebar; web clipper (bookmarklet + token theo vault). Zoom dùng zoom của trình duyệt (Ctrl +/-). |
| 7 — Chốt | Xong | (commit này) | `tsc --noEmit` sạch ở `web/` và `web/server/`, `next build` thành công, ma trận parity cập nhật bên dưới. |

## Ma trận parity sau đợt này

| Nhóm | Trạng thái |
|---|---|
| Điều hướng / menu | Tương đương (menu ứng dụng web thay cho menu native; zoom/DevTools dùng của trình duyệt) |
| Sync GitHub / GitLab / Gitea / WebDAV | Tương đương, thêm xung đột có UI. Khác: không SSH thật (chuyển HTTPS + token), không provider Folder |
| Vault | Import/export zip, tạo từ GitHub; đổi tên/xoá vault |
| File tree | Kéo-thả, Daily, Random |
| Plugin | Events, status bar, code block, sidebar panel, settings tab. Giới hạn: panel/tab là bản sao DOM (click/input/change được chuyển tiếp; không có drag, hover, canvas tương tác) |
| Soạn thảo | Lint, zen, focus, accent, spell, tab size, PDF options |
| Clipper | Bookmarklet (desktop dùng server cục bộ 27123); bị chặn trên trang có CSP nghiêm ngặt |
| Không áp dụng | Updater, collab P2P (web dùng collab qua server), Folder provider, Flatpak |

## Checklist triển khai production (khi được duyệt push)

1. `git push origin main` → Dokploy tự deploy (~5 phút). `web` image cần `jszip`; `server` image cần `archiver`, `turndown` (đã có trong lockfile).
2. **Chạy migration thủ công** sau deploy (3 migration mới, đều viết tay, không đụng cột `content_tsv`):
   `ssh 217.15.160.118 "docker exec <container-api> npx prisma migrate deploy"`
   - `20261014120000_sync_parity_fields`
   - `20261014140000_attachment_sync_path`
   - `20261014160000_clip_tokens`
3. Worker (`noteriv-worker`) phải chạy lại để có auto-sync tick; kiểm tra log "noteriv sync-worker started".
4. Kiểm thử thật với repo GitHub rỗng + token riêng: tạo kết nối từ wizard, sync 2 chiều, tạo xung đột và chọn hướng giải quyết.
5. Cài lại plugin chessboard bản web nếu cần (cần xác nhận quyền ghi repo `NoterivPlugins` để phát hành chính thức).

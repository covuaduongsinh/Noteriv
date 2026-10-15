# Phiên 1.5: Plugin API v1 (bản nháp) hai tầng — kế hoạch và ghi chép

> Kế hoạch gốc: mục "Phiên 1.5" trong [2026-10-14-giai-doan-1-tach-repo-package-chung-plugin-api.md](2026-10-14-giai-doan-1-tach-repo-package-chung-plugin-api.md). Nhánh `covuaduongsinh/phase1-core`. Dựng trên 1.3 (`VaultAdapter`) và 1.4 (`@noteriv/ui`). Đặc tả: [`docs/plugin-api/v1.md`](../plugin-api/v1.md).

## Hiện trạng trước phiên (đọc ngày 2026-10-16)

- **Web:** plugin cộng đồng chạy trong iframe sandbox. `web/src/lib/plugin-sandbox/usePluginHost.ts` nhận RPC postMessage, kiểm quyền (mặc định chặn), gọi `webApi`. Danh sách cài đặt và `settings` ở DB.
- **Desktop:** `desktop/src/lib/plugin-api.ts` chạy plugin **trực tiếp trong cửa sổ app** bằng `new Function`, không có quyền. Lệnh của plugin không hiện ở đâu cả; panel sidebar cũng không.
- Hai bên chưa có khái niệm core plugin.

## Đã làm

| Bước | Commit | Nội dung |
|---|---|---|
| A, B | `f72cb1a` | `packages/plugin-api` (`@noteriv/plugin-api`: kiểu `PluginApi`, `CorePlugin`, `PluginPermission`, hằng `PLUGIN_API_VERSION`), đặc tả `docs/plugin-api/v1.md`. `core`: `plugin-registry.ts` (`PluginRegistry`: bật/tắt tuần tự, gỡ sạch mọi đăng ký khi tắt hoặc khi `onload` lỗi, `PluginStateStore`), `permissions.ts` (`inferPermissions` chuyển từ web, desktop dùng chung). |
| C | `491f661` | `ui/plugins`: `createCorePluginHost` (dựng `PluginApi` trên `VaultAdapter`; lệnh có phím tắt, status bar, ribbon, `registerView`, panel, tab cài đặt, sự kiện, code block, post-processor), `useCorePlugins`, `CorePluginsSection`, `settingsKeyStateStore`. |
| D | `e1d4c91`, `2951234` | `packages/plugins` (`@noteriv/plugins`), core plugin mẫu **`word-count`**: số từ trên status bar, lệnh "Word count: show note statistics" (`Mod+Alt+W`), nút ribbon. Không đếm frontmatter và khối code (FEN/PGN). |
| E | `fc52a3d` | Web: Settings → **Core plugins**, status bar, ribbon, Command Palette, phím tắt. Trạng thái ở `vault.settings.corePlugins` (DB), settings plugin ở `corePluginSettings`. `web/Dockerfile` + CI biết hai workspace mới. |
| F | `5c6612c` | Desktop: cùng các chỗ nối; trạng thái ở `.noteriv/plugin-config.json` (`core`, `coreSettings`). `useCorePluginHost` dùng chung hai app. Sửa `PluginManager.loadConfig` cũ làm rơi khoá lạ khi ghi. |
| G (chung + web) | `8badc89` | Host sandbox chuyển vào `@noteriv/ui/plugins/sandbox` (`useSandboxPluginHost`, `mirror`, `PluginMirror`, kiểu). Vault qua `VaultAdapter`. Web chỉ còn lớp bọc `webApi.plugins`. Một `plugin-sandbox.html` duy nhất ở `packages/ui/public/`, sao chép vào `web/public` và `desktop/public` bằng `npm run sync:sandbox` (test báo lỗi khi lệch). Sandbox có thêm `settings`, `workspace.openFile`, `app.platform`; các hàm chỉ dành cho core báo lỗi rõ ràng. Sửa lỗi cũ: đổi danh sách plugin khi iframe còn khởi động thì tạo iframe thứ hai. |
| G (desktop) | `577f3be` | Desktop chạy plugin cộng đồng **trong sandbox**, bỏ `new Function`. Quyền lưu ở `plugin-config.json` (`permissions`). Bật plugin đòi quyền chưa có thì hiện danh sách quyền để cho phép; lời gọi bị chặn hiện nút **Allow**. Tab cài đặt plugin hiển thị qua `PluginMirror`; lệnh plugin có trong Command Palette. |

## Kiểm chứng

- **Tự động:** `npm test` ở gốc: core 277, ui 49 (gồm host core, phím tắt, host sandbox giả lập iframe, test bản sao sandbox), plugins 5, tất cả xanh. `npm run typecheck` sạch ở cả 6 workspace. `npm run build:web` và `npm run build:desktop` chạy.
- **Bundle:** mã word-count nằm trong chunk riêng (web: `static/chunks/43reb_hv28z78.js`, 1,8 KB; desktop: `3e64088f06d9761d.js`). Chunk này **không** có trong danh sách chunk ban đầu của trang vault (web: `page_client-reference-manifest.js`; desktop: `index.html`).
- **Chạy thật bản desktop build trong Chrome** (máy chủ tĩnh + `window.electronAPI` giả, vault trong bộ nhớ có chessboard từ `desktop/examples/plugins/chessboard`; harness để ngoài repo):
  - Lúc mở: iframe `sandbox="allow-scripts"` cho chessboard; chunk word-count **chưa** tải.
  - Settings → Core plugins → bật Word count: chunk được tải lúc đó; status bar "18 words"; nút ribbon có; `plugin-config.json` thêm `core` mà vẫn giữ `enabled`. `Ctrl+Alt+W` hiện thông báo thống kê; Command Palette có lệnh trong nhóm "Core plugin".
  - Chessboard (đã bật từ thời chạy trực tiếp, chưa có quyền): khối code chưa vẽ; Plugin Manager hiện "Blocked: render code blocks, add panels and settings tabs. Allow". Bấm Allow: quyền lưu vào `plugin-config.json`, iframe dựng lại, **bàn cờ được vẽ** (SVG 360px, 32 quân) trong editor; nút cài đặt plugin xuất hiện.
  - Tắt Word count rồi tải lại trang: status và ribbon biến mất; sau khi tải lại chunk word-count **không** được tải; bàn cờ vẫn vẽ.
  - Công cụ chụp màn hình bị lỗi trong lần thử này (JavaScript trên trang vẫn chạy bình thường), nên phần trên được kiểm bằng truy vấn DOM và `performance` thay cho ảnh.

- **Staging (2026-10-16, `next` = `547f387`):** build Docker xanh, `healthz` ok, production không deploy lại. Chủ dự án thử tay trên Chrome ẩn danh (ảnh chụp): **chessboard vẽ bàn cờ** qua host sandbox mới (plugin dán thủ công vì chưa có trên kho cộng đồng, việc đã biết); plugin cộng đồng Word Count (status bar + nút lệnh) cũng chạy; Preferences → **Core plugins** → bật Đếm từ: status bar "7 từ" (đếm cả tiêu đề, bỏ khối FEN), nút ribbon xuất hiện, `Ctrl+Alt+W` hiện "7 từ · 24 ký tự · khoảng 1 phút đọc". Đĩa VPS lên 92% trong lúc staging chạy, về 90% sau khi tắt; staging đã tắt.

## Chưa kiểm / còn lại (nói rõ)

- **Web:** chưa kiểm bằng Network tab rằng chunk word-count chỉ tải khi bật (đã kiểm bằng manifest bản build và bằng bản desktop chạy thật); chưa thử tab cài đặt của chessboard trên web sau khi viết lại host.
- **Desktop trong Tauri thật:** chưa chạy.
- Mục "Core plugins" nằm trong cửa sổ Preferences (không có trong menu thả xuống Settings); chủ dự án lúc đầu không thấy. Có thể thêm lối tắt vào menu sau. Bản thử dùng API giả; điểm cần xem riêng ở Tauri là iframe `/plugin-sandbox.html` tải từ asset protocol (CSP của Tauri đang `null`).
- Thay đổi hành vi nhỏ của sandbox web: `vault.list(dir)` nay trả **con trực tiếp** của thư mục (có thư mục con), giống desktop cũ, thay vì danh sách phẳng mọi ghi chú. `vault.*` của plugin cộng đồng trên desktop nay chỉ thấy ghi chú markdown (qua `VaultAdapter`), không đọc được tệp bất kỳ như trước.
- Desktop vẫn **không hiện panel sidebar** của plugin cộng đồng (trước đây cũng không); web có.
- `markdown.registerPostProcessor`: host đã lưu và có `runPostProcessors`, nhưng renderer chưa gọi. `ui.registerView`/`workspace.openView`: host có, app chưa có tab cho view (cần ở Giai đoạn 2).
- Core plugin trên web: trạng thái lưu theo vault; nhiều tab cùng mở một vault sẽ không đồng bộ trạng thái cho đến khi tải lại.

## Không làm trong phiên này

- Chưa chuyển Canvas/Board/… thành core plugin (Giai đoạn 2).
- Không đóng băng API (`0.x`).
- Không push, không deploy.

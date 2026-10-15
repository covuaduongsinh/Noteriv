# Phiên 1.5: Plugin API v1 (bản nháp) hai tầng — kế hoạch và ghi chép

> Kế hoạch gốc: mục "Phiên 1.5" trong [2026-10-14-giai-doan-1-tach-repo-package-chung-plugin-api.md](2026-10-14-giai-doan-1-tach-repo-package-chung-plugin-api.md). Nhánh `covuaduongsinh/phase1-core`. Dựng trên 1.3 (`VaultAdapter`) và 1.4 (`@noteriv/ui`).

## Hiện trạng (đọc ngày 2026-10-16)

- **Web:** plugin cộng đồng chạy trong iframe sandbox. `web/src/lib/plugin-sandbox/usePluginHost.ts` (521 dòng) nhận RPC postMessage, kiểm quyền (`METHOD_PERMISSIONS`, mặc định chặn), gọi `webApi`. Danh sách cài đặt và `settings` nằm ở DB (`webApi.plugins.*`). `plugin-community.ts` có `inferPermissions` (suy quyền từ mã).
- **Desktop:** `desktop/src/lib/plugin-api.ts` chạy plugin **trực tiếp** bằng `new Function`, không có quyền; plugin nằm ở `{vault}/.noteriv/plugins/<id>/`, bật/tắt và settings ở `{vault}/.noteriv/plugin-config.json`.
- Hai bên **không có khái niệm core plugin**; `PluginAPI` desktop và API trong `plugin-sandbox.html` giống nhau về hình dạng (vault, ui, events, editor, markdown, app).

## Thiết kế chọn (và lý do)

1. **Một bề mặt kiểu duy nhất** ở `packages/plugin-api` (`@noteriv/plugin-api`): chỉ có kiểu TypeScript, không có mã chạy. Cả core plugin lẫn sandbox cộng đồng đều thoả cùng `PluginApi`. Lý do: đặc tả và kiểu không thể lệch nhau.
2. **`PluginRegistry` ở `@noteriv/core`** (logic thuần, không React): danh sách core plugin (`id`, tên, mô tả, `defaultEnabled`, `load: () => Promise<module>`), trạng thái bật/tắt qua giao diện `PluginStateStore`, vòng đời `enable`/`disable` (gọi `onload`/`onunload`, gom mọi thứ plugin đăng ký để gỡ sạch). `load()` là `import()` động nên **tắt plugin thì mã không nằm trong bundle ban đầu**.
3. **Host core trong `@noteriv/ui`**: dựng `PluginApi` đầy đủ từ `VaultAdapter` + các cổng app tiêm vào (editor bridge, mở file). Hook `useCorePlugins` cho React; component `CorePluginsSection` (bật/tắt trong Settings).
4. **Nơi lưu bật/tắt (`PluginStateStore`):** web lưu trong `vault.settings.corePlugins` (DB, qua `adapter.getSettings/saveSettings`); desktop lưu `core` trong `.noteriv/plugin-config.json`. Không đổi schema DB.
5. **Core plugin nằm ở `packages/plugins/<tên>/`**; app đăng ký danh sách ở `src/lib/core-plugins.ts` với `load: () => import("@noteriv/plugins/word-count")` để bundler tách chunk.
6. **Sandbox cộng đồng dùng chung (bước cuối, rủi ro cao nhất):** chuyển host sandbox vào `@noteriv/ui` tổng quát hoá qua `PluginHostStore` (liệt kê plugin đã cài, đọc `mainJs`, lưu settings) thay cho `webApi`; web và desktop mỗi bên cấp một store. `public/plugin-sandbox.html` lên `packages/ui` (hoặc sao chép có test ép giống hệt). Desktop thay mô hình `new Function` không quyền bằng sandbox.

## Các bước (mỗi bước một commit, test và `tsc` xanh trước khi sang bước sau)

| # | Việc | Kiểm chứng |
|---|---|---|
| A | `@noteriv/plugin-api` (kiểu) + `docs/plugin-api/v1.md` | `tsc` |
| B | `core`: `plugin-registry.ts`, `permissions.ts` (`inferPermissions` chuyển từ web) + test | vitest |
| C | `ui`: `plugins/` (host core, `useCorePlugins`, `CorePluginsSection`) + test jsdom trên `MemoryVaultAdapter` | vitest |
| D | `packages/plugins/word-count` (core plugin mẫu) | vitest + `tsc` |
| E | Nối web: danh sách core plugin, store, status bar, lệnh trong Command Palette, ribbon, mục "Core plugins" trong Settings | `tsc`, `build:web`, kiểm bundle |
| F | Nối desktop (cùng bề mặt) | `tsc`, `build:desktop`, kiểm bundle |
| G | Sandbox cộng đồng dùng chung, desktop chạy plugin cộng đồng qua sandbox | test host, `tsc`, build hai app |
| H | Cập nhật bàn giao, bảng "Trạng thái", ghi những gì chưa kiểm | — |

## Không làm trong phiên này (ghi rõ để khỏi hiểu nhầm)

- Chưa chuyển Canvas/Board/… thành core plugin (Giai đoạn 2). `ui.registerView` có trong API và host, nhưng phiên này chỉ kiểm bằng test; plugin mẫu chưa dùng view.
- Không đóng băng API: đánh dấu `0.x`.
- Không chạy được Tauri trong môi trường này: desktop chỉ kiểm bằng `tsc`, build tĩnh và test; phần chạy thật ghi là **chưa kiểm**.

## Trạng thái

(cập nhật ở cuối phiên)

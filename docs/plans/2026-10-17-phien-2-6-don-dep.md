# Phiên 2.6: Dọn dẹp, đo lại, ngân sách

> Ngày: 2026-10-17 · Trạng thái: **xong** (chưa push) · Giai đoạn: [2](2026-10-14-giai-doan-2-thu-gon-core-plugin.md) · Trước đó: [2.5c](2026-10-16-phien-2-5c-lo-c.md) · Báo cáo đo: [`docs/perf/2026-10-17-after-phase2.md`](../perf/2026-10-17-after-phase2.md)

**Giai đoạn 2 xong.** Mọi ngân sách hiệu năng đều đạt:

| Chỉ số | Kết quả |
|---|---|
| JS tải đầu web | 194,7 KB gzip (ngân sách ≤ 374) |
| JS tải đầu desktop | 222,7 KB gzip (≤ 312) |
| Cây file hiện | ~930 ms (≤ 1212) |
| TBT | 4–50 ms (≤ 100) |
| RAM desktop | ~344 MB (không tăng) |

Chủ dự án chốt (2026-10-17):

- **Tải lười editor và các hộp thoại ít dùng; tải trước editor khi trình duyệt rảnh.**
- **Làm cả ba việc treo** từ 2.1:
  - bỏ ảnh/icon thừa khỏi bộ cài desktop;
  - bỏ lời gọi API trùng khi mở vault;
  - dọn mã chết.

## Đã làm

**Tải lười editor (web)** (`web/src/app/vaults/[vaultId]/page.tsx`):

- `Editor`, `SourceEditor`, `ReadOnlyView`, `FormattingToolbar` không còn import tĩnh. Toàn bộ CodeMirror cùng các bộ đọc cú pháp ngôn ngữ rời khỏi phần tải đầu.
- **Tải trước**:
  - Khi cây file đã hiện, `requestIdleCallback` tải module editor (dự phòng `setTimeout` 1,5 giây).
  - Nếu `workspace-state` có tab để khôi phục, editor được tải ngay, song song với nội dung note.
- **`editorPart`**:
  - `next/dynamic` luôn treo ở lần dựng đầu, kể cả khi module đã có. React lại hoãn ~300 ms trước khi thay fallback, nên mở note lần đầu mất ~700 ms.
  - Sửa: khi module editor đã tải thì dựng thẳng component; chưa có thì dùng `dynamic`. Lựa chọn cố định cho mỗi lần mount.
  - Mở note lần đầu nay bằng đúng thời gian request note (~330–380 ms qua tunnel).
- `runFormattingAction` (và kiểu `FormattingAction`) chuyển từ `FormattingToolbar.tsx` sang `packages/ui/src/editor/editor-commands.ts`, file không có CodeMirror. `FormattingToolbar` re-export, nên API của gói không đổi.
- `setImageLightboxHandler` import từ `@noteriv/ui/markdown/renderers/images`. Index `markdown` đăng ký mọi renderer, kéo theo lõi CodeMirror.

**Tải lười hộp thoại** (`dynamic(..., { ssr: false })`, chỉ tải khi mở lần đầu):

- Web: PluginManager, CSSSnippets, SettingsModal, ImportVault, DiagnosticsModal, CreateVaultFromGithub, TrashPanel, AttachmentManager, FileRecovery, PdfPreviewModal.
- Desktop: SetupWizard, SettingsModal, VaultSearch, FileRecovery, AttachmentManager, PluginManagerModal, CSSSnippets, PublishPreview, CollabPanel, TrashPanel.
- `pdf-export` của cả hai app đổi sang `import()` lúc dùng.
- Desktop: `setLocalImageLoader` import từ `@noteriv/ui/markdown/vault-hooks`.
- QuickOpen và CommandPalette giữ tĩnh, vì mở bằng phím và cần nhanh.

**Bỏ API trùng khi mở vault (web)**:

- `webApi.vaults.get` dùng chung một response trong 2 giây (`getVaultShared`, mỗi bên nhận bản sao `structuredClone`); `update`/`remove` xoá bộ đệm.
- Kết quả: `GET /vaults/:id` còn 1 lần (trước đây 3). Trang, CSS snippets, theme tự tạo và host core plugin cùng hỏi, nhưng không phải sửa từng nơi gọi.
- Preferences và workspace-state: trang nhớ bản đã tải hoặc đã gửi gần nhất (dạng JSON) và chỉ `PUT` khi khác. Không còn `PUT` lại ngay sau khi tải.

**Dọn mã chết**:

- File đã xoá (không còn nơi nào import):
  - `desktop/src/components/HoverPreview.tsx`
  - `desktop/src/lib/focus-mode.ts`
  - `desktop/src/lib/debug.ts`
  - `packages/ui/src/markdown/{slash-commands,callouts,embeds,wikilinks,tags}.ts` (đã bị `renderers/*` thay)
- Export không dùng đã xoá:
  - Desktop: `publishNote` (`lib/publish.ts`), `applyLocalEdit` (`lib/collab.ts`), `cleanOldSnapshots` (`lib/file-recovery.ts`), `DEFAULT_FOLDER_CONFIG` (`lib/sync-providers.ts`), `getDefaultTheme` (`lib/theme-utils.ts`).
  - Web: `getEnabledSnippetIds` (`lib/css-snippets.ts`).

**Ảnh thừa desktop**:

- Xoá `desktop/public/{icon.png,macos/,linux/,windows/}`. Icon của bộ cài lấy từ `src-tauri/icons`.
- `banner.png` chuyển sang `docs/assets/banner.png`.
- `README.md`: sửa đường dẫn banner; bỏ dòng focus-mode và pdf-annotation khỏi cây thư mục; sửa mô tả `public/`.

**Số dòng `page.tsx`**:

| | Đầu Giai đoạn 2 (`05f7318`) | Sau 2.5c | Sau 2.6 |
|---|---:|---:|---:|
| Web | 1898 | 1821 | 1879 |
| Desktop | 2326 | 2228 | 2232 |

2.6 làm web dài thêm 58 dòng: khai báo tải lười cho editor và hộp thoại, `editorPart`, tải trước, và chống `PUT` lặp. Phần lớn mã tính năng đã rời trang ở 2.2–2.5c.

**Mô tả core plugin trong Cài đặt**: web đã tiếng Việt từ các phiên trước; desktop giữ tiếng Anh theo quy ước. Không đổi gì.

## Kết quả đo

Chi tiết ở [`docs/perf/2026-10-17-after-phase2.md`](../perf/2026-10-17-after-phase2.md).

- **Web, mở vault không có tab để khôi phục** (Lighthouse): điểm 99, LCP 818–956 ms, TBT 4–28 ms.
- **Web, mở vault có tab để khôi phục**: LCP ~1,6 s. Nghẽn ở chuỗi request `workspace-state` rồi `notes/:id` qua tunnel; hướng xử lý ghi trong báo cáo.
- **Desktop**:

  | Chỉ số | Trước | Sau |
  |---|---:|---:|
  | NSIS | 11,1 MB | 7,9 MB |
  | MSI | 15,0 MB | 10,3 MB |
  | exe | 27,1 MB | 23,0 MB |
  | WebView bắt đầu dựng trang (trung vị ấm) | 1385 ms | 877 ms |

## Kiểm chứng

- `npm run typecheck` sạch. `npm test`: 285 + 67 + 68 = **420 test đạt**.
- **Web chạy thật** (puppeteer, `next start` + API cục bộ, vault 500 note):
  - Request khi mở vault: `GET /vaults/:id` 1 lần; preferences và workspace-state mỗi cái 1 lần; không có `PUT`.
  - Bảy hộp thoại tải lười mở đúng, đủ CSS (ảnh chụp Settings, Chẩn đoán).
  - Editor và thanh định dạng hiện đúng.
  - CPU profile lúc mở note: editor hiện ngay khi note về.
  - Không có lỗi trang.
- **Desktop chạy thật** (Tauri portable, WebView2 debug):
  - Mở note được.
  - Tám hộp thoại tải lười mở được.
  - Xuất PDF chạy tới lệnh in (đã chặn hộp in).
  - Không có lỗi trang.
  - Bộ cài không còn ảnh thừa.

## Chưa kiểm / giới hạn

- SetupWizard (chỉ hiện lần đầu chạy) và VaultSearch của desktop chưa mở thử sau khi chuyển sang tải lười. Cùng một cách đổi như các hộp khác, typecheck sạch.
- Hộp CSS Snippets và Thùng rác (cả hai app) không đóng bằng Esc. Đây là hành vi có từ trước, không do 2.6.
- Desktop vẫn tải editor bằng `dynamic()` như trước, chưa có `editorPart` và tải trước. Desktop chưa có công cụ đo thời gian mở note; ghi ở mục 5 của báo cáo đo.
- `GET /sync-connections` vẫn gọi 2 lần khi mở vault.

## Dọn dẹp

- Tài khoản web thử `perf-2-6@example.test` cùng vault 500 note đã xoá (`seed-vault --cleanup`: delete account 200).
- Đã tắt app desktop thử, API, `next start` và tunnel; các tiến trình con còn sót đã tắt theo PID; không còn cổng thử nào mở (3457, 4001, 55432, 56379, 59000, 9223).
- `desktop/src-tauri/Cargo.toml` đã được khôi phục.

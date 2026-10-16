# Hiệu năng sau Giai đoạn 2 (Phiên 2.6)

> Ngày đo: 2026-10-17 · So với: [baseline 2026-10-16](2026-10-16-baseline.md) · Cách đo: mục 7 của baseline (cùng máy, vault 500 note từ `scripts/perf/seed-vault.mjs`, web `next start` + API cục bộ qua tunnel tới DB dev trên VPS, desktop chế độ portable).

## 1. Kết quả so với ngân sách

| Chỉ số | Baseline | Sau Giai đoạn 2 | Ngân sách | Đạt |
|---|---:|---:|---:|:---:|
| Web: JS tải đầu trang vault (gzip) | 533,9 KB | **194,7 KB** (−63,5%) | ≤ 374 KB | ✓ |
| Desktop: JS tải đầu (gzip) | 444,9 KB | **222,7 KB** (−49,9%) | ≤ 312 KB | ✓ |
| Web: cây file hiện (vault 500 note) | 1102 ms | **826–1132 ms** (trung vị ~930 ms) | ≤ 1212 ms | ✓ |
| Web: Total Blocking Time | 71 ms | **4–50 ms** | ≤ 100 ms | ✓ |
| Desktop: RAM sau 20 giây | ~345 MB | **~344 MB** | không tăng | ✓ |

Mọi ngân sách đều đạt. Phần lớn mức giảm ở web là do editor (CodeMirror cùng các bộ đọc cú pháp ngôn ngữ) rời khỏi phần tải đầu ở Phiên 2.6. Các phiên 2.2–2.5c chỉ đưa số này từ 533,9 xuống 442,7 KB.

## 2. Web

### JS tải đầu (`npm run perf:web`)

| Thời điểm | Thô | gzip | brotli |
|---|---:|---:|---:|
| Baseline (2.1) | — | 533,9 KB | — |
| Sau 2.5c | — | 442,7 KB | — |
| **Sau 2.6** | 647,6 KB | **194,7 KB** | 167,6 KB |

JS tải lười (analyzer): 6496 KB thô (~2107 KB nén). Phần này chỉ tải khi dùng: editor, Mermaid, pdf.js, các hộp thoại, core plugin.

### Mở vault (Lighthouse preset desktop, 3 lần)

Có hai kịch bản, vì app khôi phục các tab đang mở từ `workspace-state` của lần trước:

| Chỉ số | Không có tab để khôi phục (như baseline) | Có tab để khôi phục |
|---|---|---|
| Điểm Performance | 99 / 99 / 99 (baseline 98) | 92 / 93 / 89 |
| FCP | 616 / 639 / 612 ms (baseline 671) | 651 / 606 / 682 ms |
| LCP | 818 / 956 / 867 ms (baseline 904) | 1595 / 1525 / 1857 ms |
| TBT | 24 / 28 / 4 ms (baseline 71) | 46 / 16 / 74 ms |
| TTI | 1228 / 1305 / 1222 ms (baseline 1431) | 1730 / 1526 / 1857 ms |
| Thời gian chạy JS (bootup) | 220 / 296 / 269 ms (baseline 393) | 389 / 359 / 402 ms |

**Kịch bản có tab để khôi phục:**

- Phần tử LCP là dòng đầu của note trong editor.
- Thời gian nằm ở chuỗi request tuần tự `workspace-state` rồi `notes/:id`. Qua tunnel, mỗi request mất 300–650 ms; trên production máy chủ nằm cạnh DB nên ngắn hơn nhiều.
- Lúc đầu editor tải lười chỉ bắt đầu tải sau khi tab đã dựng, nên LCP thêm một bước nữa. Đã sửa: editor được tải ngay khi biết có tab để khôi phục, song song với nội dung note.
- Baseline không đo riêng kịch bản này nên không có số để so.
- **Hướng giảm tiếp** (chưa làm): API `workspace-state` trả kèm nội dung note đang mở, để bỏ một vòng request.

### Cây file, mở note, bộ nhớ (puppeteer, `open-vault.mjs`)

| Chỉ số | Baseline | Sau 2.6 |
|---|---:|---:|
| Cây file hiện đủ | 1436 / 910 / 1102 ms | 926 / 826 / 937 ms (một loạt khác: 1426 / 1061 / 1349 ms) |
| Mở note lần đầu (tính từ lúc bấm tới khi editor hiện nội dung) | 365 ms | 329–380 ms |
| JS heap sau khi cây hiện / sau khi mở note | ~10–12 / ~10–16 MB | ~7–9 / ~9 MB |
| Số DOM node | 852 | 889 |

- **Mở note lần đầu** bằng đúng thời gian request `notes/:id`, đo bằng CPU profile: editor hiện trong vòng 1 ms sau khi note về.
- Editor được tải trước khi trình duyệt rảnh, ngay sau khi cây file hiện (`requestIdleCallback`). Khi người dùng bấm mở note, chunk editor đã có sẵn.
- **Gặp và sửa**: `next/dynamic` luôn treo (suspend) ở lần dựng đầu, kể cả khi module đã tải trước. React lại hoãn việc hiện nội dung sau fallback khoảng 300 ms. Vì vậy lúc đầu mở note mất ~700 ms. Sửa bằng `editorPart` trong `page.tsx`: khi module editor đã có thì dựng thẳng component, không đi qua `dynamic`. Lựa chọn này cố định cho mỗi lần mount, nên editor đang hiện không bao giờ đổi cách dựng.
- Thời gian cây file dao động theo độ trễ của tunnel (request `index` mất 300–650 ms), lệch giữa các loạt đo lớn hơn lệch so với baseline. Mọi lần đo đều dưới ngân sách 1212 ms, trừ lần đầu sau khi khởi động máy chủ (2741 ms, máy chủ còn lạnh; không tính).

### Request khi mở vault

| Request | Baseline | Sau 2.6 |
|---|---:|---:|
| `GET /vaults/:id` | 3 | **1** |
| `GET /users/me/preferences` | 2 | 1 |
| `GET /vaults/:id/workspace-state` | 2 | 1 |
| `PUT` preferences / workspace-state ngay sau khi tải | có | **không** |
| `GET /vaults/:id/sync-connections` | — | 2 (còn lại, xem mục 5) |

Cách làm:

- `webApi.vaults.get` dùng chung một response trong 2 giây cho các phần cùng hỏi: trang, CSS snippets, theme, settings của core plugin. Mỗi bên nhận một bản sao riêng; `update`/`remove` xoá bộ đệm.
- Trang nhớ state đã tải hoặc đã gửi gần nhất, và chỉ `PUT` khi state khác đi.

## 3. Desktop

### Dung lượng

| Chỉ số | Baseline | Sau 2.6 |
|---|---:|---:|
| Bộ cài NSIS | 11,1 MB | **7,9 MB** (−29%) |
| Bộ cài MSI | 15,0 MB | **10,3 MB** (−31%) |
| `noteriv.exe` | 27,1 MB | **23,0 MB** |
| `desktop/out` | 17 MB | **11 MB** |
| JS tải đầu (gzip) | 444,9 KB | **222,7 KB** (735,1 KB thô, 193,2 KB brotli) |
| JS toàn bộ (analyzer) | 6804 KB thô (~2209 KB nén) | 6903 KB thô (~2256 KB nén) |

- Bộ cài nhỏ đi chủ yếu nhờ bỏ ~6 MB ảnh/icon không dùng: `desktop/public/{icon.png,macos,linux,windows}`, cùng `banner.png` chuyển sang `docs/assets/`.
- JS tải đầu giảm nhờ các hộp thoại (Settings, SetupWizard, PluginManager, …) và `pdf-export` thành tải lười. Thêm vào đó, `setLocalImageLoader` nay import từ `@noteriv/ui/markdown/vault-hooks` thay vì từ index của `markdown`, vốn kéo theo các renderer và lõi CodeMirror.
- JS toàn bộ tăng nhẹ vì các core plugin mới (Canvas, PDF viewer…) nằm trong bundle dưới dạng chunk lười.

### Khởi động (portable, vault 500 note, 4 lần; lần 1 lạnh)

| Chỉ số | Baseline (trung vị ấm) | Sau 2.6: lạnh | Sau 2.6: ấm (3 lần) | Trung vị ấm |
|---|---:|---:|---|---:|
| Cửa sổ hiện ra | 81 ms | 1625 ms | 60 / 62 / 62 ms | 62 ms |
| WebView bắt đầu dựng trang | 1385 ms | 9269 ms | 777 / 1462 / 877 ms | **877 ms** |
| RAM sau 20 giây (working set) | ~345 MB | 340 MB | 342 / 346 / 344 MB | **~344 MB** |
| RAM riêng (private bytes) | ~152 MB | 143 MB | 148 / 152 / 151 MB | ~151 MB |

Lần lạnh chậm (9,3 s) vì chạy cùng lúc với bộ test (`npm test`) làm máy bận; không so được với baseline.

## 4. Ảnh hưởng tới chức năng (đã kiểm chạy thật)

- **Web**:
  - Settings, Plugin Manager, CSS Snippets, Thùng rác, Chẩn đoán, Import, Tạo vault từ GitHub đều mở đúng và đủ CSS (ảnh chụp). Mỗi hộp tải thêm một chunk khi mở lần đầu.
  - Editor và thanh định dạng hiện đúng.
  - Không có lỗi trang; 404 duy nhất là `favicon.ico`, có từ trước.
- **Desktop**:
  - Mở note được.
  - Settings, Plugin Manager, CSS Snippets, Thùng rác, Attachments, File Recovery, Publish, Live Collaboration đều mở.
  - Xuất PDF chạy tới lệnh in.
  - Không có lỗi trang.

## 5. Việc còn có thể làm (chưa làm)

1. **Khôi phục tab nhanh hơn**: `workspace-state` trả kèm nội dung note đang mở. Việc này bỏ một vòng request (LCP kịch bản khôi phục, xem mục 2).
2. **`GET /sync-connections` gọi 2 lần** khi mở vault: một lần từ thanh trạng thái, một lần sau khi `auth/refresh`. Lợi nhỏ.
3. **Desktop**: editor vẫn tải bằng `dynamic()` như trước. Có thể áp cùng cách `editorPart` và tải trước khi rảnh như web (desktop chưa có công cụ đo thời gian mở note).
4. Mermaid (2,5 MB thô) và pdf.js vẫn là phần lười lớn nhất; chỉ tải khi gặp sơ đồ hoặc mở PDF, nên không ảnh hưởng lần mở đầu.

## 6. Tái lập

- **Web**:
  - Dựng và phân tích: `cd web && npx next build && npx next analyze --output`, rồi `npm run perf:web`.
  - Vault thử: `node scripts/perf/seed-vault.mjs --api http://127.0.0.1:4001 --email <thử> --password <ngẫu nhiên>`. Dọn bằng cờ `--cleanup`.
  - Lighthouse 12.8: `--preset=desktop --only-categories=performance --extra-headers=<file cookie>`.
  - Muốn đo kịch bản "không có tab để khôi phục" thì `PUT /vaults/:id/workspace-state` với `openTabs: []` trước mỗi lần.
- **Desktop**:
  - Dựng và phân tích: `npx tauri build`, rồi `next experimental-analyze --output`, rồi `npm run perf:desktop`.
  - Khởi động và RAM: script PowerShell như mô tả ở baseline mục 7.
  - Nhớ `git checkout -- desktop/src-tauri/Cargo.toml` sau khi build (Tauri đổi kiểu xuống dòng).

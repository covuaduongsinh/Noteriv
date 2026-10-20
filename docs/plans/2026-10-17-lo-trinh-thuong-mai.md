# Lộ trình thương mại: Noteriv thành sản phẩm ghi chú tri thức chung

> Ngày lập: 2026-10-17 · Trạng thái: **đã duyệt, chưa triển khai** · Thay thế: [2026-10-14-lo-trinh-noteriv-chess-pkm.md](2026-10-14-lo-trinh-noteriv-chess-pkm.md) (Giai đoạn 0–2 của lộ trình đó đã xong và vẫn có giá trị lịch sử)
> Người quyết định: chủ dự án (covuaduongsinh). Tài liệu viết cho người không chuyên IT; thuật ngữ giải thích ở mục 8.
> **Phiên làm việc mới hãy đọc trước:** [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md)

---

## 1. Bối cảnh

Giai đoạn 0–2 của lộ trình cũ ("Chess PKM") đã xong ngày 2026-10-17:
- an toàn dữ liệu (sao lưu, staging, giám sát, đăng ký bằng mã mời);
- package dùng chung web + desktop;
- Plugin API v1 nháp;
- 17 core plugin;
- mọi ngân sách hiệu năng đạt.

Phần mềm nay là một **app ghi chú Markdown chung**, gần như không có mã riêng cho cờ vua. Chủ dự án thấy sản phẩm đủ tốt để **thương mại hoá cho mọi nhu cầu ghi chú kiến thức**. Cách làm: gộp toàn bộ về `main`, rà soát và hoàn thiện, rồi mới mở worktree làm phiên bản chuyên cho cờ vua.

**Kết quả rà soát mã (2026-10-17):**

| Hạng mục | Hiện trạng |
|---|---|
| Dấu vết cờ vua trong lõi | Ít: README, một câu ở `/privacy`, cài đặt `pdfChessboardWidth` (hai app + server + CSS in), email liên hệ, plugin mẫu `desktop/examples/plugins/chessboard/` |
| Trang giới thiệu, trang giá | Chưa có (`/` chỉ chuyển hướng tới `/login` hoặc `/vaults`) |
| Email (xác minh, quên mật khẩu) | Chưa có; đặt lại mật khẩu chỉ bằng CLI của admin |
| Gói, hạn mức, thanh toán | Chưa có; chỉ có quota đính kèm 500 MiB mỗi vault |
| Đa ngôn ngữ | Chưa có thư viện; web chủ yếu tiếng Việt viết cứng, desktop tiếng Anh |
| Người mới (vault mẫu, hướng dẫn) | Chưa có |
| Quản trị | Chỉ `/admin/invites`, admin theo biến môi trường `ADMIN_EMAILS` |
| Theo dõi lỗi, đo lường | Chưa có |
| Kiểm thử | 420 test đơn vị; chưa có test đầu-cuối (E2E) |
| Giấy phép | MIT (© Jace + © Phùng Đức Tường), **được phép bán**; nhưng tên "Noteriv" và identifier desktop `com.noteriv.Noteriv` là của dự án gốc; `NOTICE.md` thiếu ghi công hình quân cờ của plugin mẫu (Apache-2.0, MIT) |

## 2. Quyết định của chủ dự án (2026-10-17)

| Câu hỏi | Quyết định |
|---|---|
| Hướng sản phẩm | Ghi chú tri thức **chung**, thương mại. Cờ vua là **phiên bản chuyên ngành**, làm sau |
| Thị trường đầu tiên | **Quốc tế ngay**: tiếng Anh là ngôn ngữ chính, tiếng Việt là ngôn ngữ thứ hai |
| Thương hiệu | Giữ tên "Noteriv" khi phát triển; **đổi tên và tách repo khỏi upstream trước khi ra mắt** (Chặng 6) |
| Phần cờ vua | **Gói core plugin trong cùng repo**; làm trong worktree/nhánh riêng, gộp về `main` theo từng mốc |
| Mô hình kinh doanh | **Chưa chốt.** Xây sẵn tầng "gói + hạn mức" trung lập (Chặng 5), chốt mô hình và bảng giá ở đầu Chặng 6 |

**Giữ nguyên từ lộ trình cũ:**
- Web là sản phẩm chính; desktop có cùng tính năng nhờ `packages/*`.
- Lõi mỏng; tính năng là core plugin.
- Sao lưu mã hoá lên GitHub private.
- Quy trình mỗi phiên: kế hoạch phiên trong `docs/plans/` → chủ dự án duyệt → thử trên staging → hỏi trước khi push/deploy → cập nhật bảng "Trạng thái".

## 3. Tổng quan các chặng

Dùng chữ **"Chặng"** để không lẫn với "Giai đoạn 0–6" của lộ trình cũ.

| Chặng | Tên | Kế hoạch chi tiết | Ước lượng | Người dùng thấy gì |
|---|---|---|---|---|
| **1** | Hợp nhất nhánh về `main` | [chang-1](2026-10-17-chang-1-hop-nhat-nhanh.md) | 1–2 buổi | Production có core plugin, mở nhanh hơn |
| **2** | Định vị lại, gỡ dấu vết cờ khỏi lõi | [chang-2](2026-10-17-chang-2-dinh-vi-lai.md) | 1–2 buổi | README/điều khoản trung lập |
| **3** | Rà soát chất lượng và hoàn thiện | [chang-3](2026-10-17-chang-3-ra-soat-hoan-thien.md) | 3–5 buổi | Ít lỗi hơn, không mất dữ liệu khi xung đột đồng bộ |
| **4** | Quốc tế hoá, người mới, di động (PWA) — **xong 2026-10-19** | [chang-4](2026-10-17-chang-4-quoc-te-hoa-nguoi-moi.md) | 9 phiên | Giao diện tiếng Anh/Việt, vault mẫu, cài lên điện thoại, Ghi nhanh, offline, không ghi đè khi sửa hai nơi, tài liệu tiếng Anh |
| **5** | Nền tảng thương mại | [chang-5](2026-10-17-chang-5-nen-tang-thuong-mai.md) | 4–6 buổi | Tự đăng ký, quên mật khẩu, gói và hạn mức |
| **6** | Thương hiệu, hạ tầng riêng, ra mắt | [chang-6](2026-10-17-chang-6-thuong-hieu-ra-mat.md) | 3–5 buổi + liên tục | Tên mới, trang giới thiệu, trang giá |

**Phụ thuộc:**
- Chặng 1 trước mọi chặng khác.
- Chặng 2 và 3 có thể đan xen.
- Chặng 4 cần Chặng 2 (chuỗi giao diện đã trung lập).
- Chặng 5 cần Chặng 3 (xung đột đồng bộ đã an toàn).
- Chặng 6 cần chủ dự án chốt mô hình kinh doanh và tên mới.

**Mời nhóm thử nghiệm đầu tiên** (người dùng ngoài trung tâm): sau Chặng 4.

## 4. Sau ra mắt (backlog, xếp lại theo phản hồi)

| Việc | Nguồn trong lộ trình cũ |
|---|---|
| Hệ sinh thái plugin: đóng băng API v1.0, tài liệu, plugin mẫu, CLI, kho plugin | [Giai đoạn 4](2026-10-14-giai-doan-4-tai-lieu-plugin-cli.md) |
| MCP trên máy chủ (Claude/Cursor đọc vault) | [Giai đoạn 6](2026-10-14-giai-doan-6-ai-mcp-ra-mat.md), phiên 6.2 |
| AI chung (tóm tắt, hỏi đáp trên vault), có hạn mức theo gói | Giai đoạn 6, phiên 6.1 (bản chung) |
| Xuất bản công khai | [Giai đoạn 5](2026-10-14-giai-doan-5-dong-bo-di-dong-chia-se.md), phiên 5.3 |
| Nhóm / không gian làm việc chung (tổng quát hoá "lớp học") | Giai đoạn 5, phiên 5.4 |

## 5. Phiên bản cờ vua

- **Thời điểm:** sau Chặng 3 hoặc sau ra mắt; chủ dự án chọn.
- **Nội dung:** theo [Giai đoạn 3 cũ](2026-10-14-giai-doan-3-co-vua-core-plugin.md) (phiên 3.0–3.8), điều chỉnh:
  - Mã nằm ở `packages/chess` và `packages/plugins/src/chess-*`; mặc định **tắt** ở bản chung.
  - "Chess edition" là bộ cấu hình bật sẵn các plugin cờ cùng mẫu ghi chú cờ, không phải một sản phẩm tách mã.
  - Cài đặt "cỡ bàn cờ khi xuất PDF" chuyển vào tab cài đặt của plugin cờ (Chặng 2 gỡ khỏi lõi).
  - AI Coach cờ (6.1 cũ) dựng trên dịch vụ AI chung ở backlog.
- **Cách làm:** Orca tạo worktree từ `main`, nhánh `covuaduongsinh/chess-<phiên>`; gộp về `main` từng mốc qua staging (như mọi việc khác).
- **Tham khảo:** `D:\code\chessnote\docs\CHESS_MODULES.md`; nhánh lưu trữ `archive/feat-chessboard-plugin-api` (Chặng 1).

## 6. Rủi ro chính

| Rủi ro | Mức | Cách giảm |
|---|---|---|
| Mất dữ liệu người dùng (xung đột đồng bộ, đổi tên/identifier) | Cao | Chặng 3 xử lý xung đột; Chặng 6 có bước chuyển cấu hình desktop; sao lưu và diễn tập khôi phục trước mỗi mốc |
| Tranh chấp tên "Noteriv" | Cao nếu bán bằng tên này | Đổi tên trước ra mắt; tra nhãn hiệu ở đầu Chặng 6 |
| VPS dùng chung với ERPNext, đĩa gần đầy | Cao khi có khách trả tiền | Máy chủ riêng ở Chặng 6, trước khi mở bán |
| Thị trường quốc tế cạnh tranh mạnh (Obsidian, Notion, Logseq) | Cao | Khác biệt: web + desktop cùng mã, cộng tác thời gian thực, Markdown thuần, plugin có sandbox, tự host được, MCP/AI sau ra mắt; phiên bản chuyên ngành (cờ vua) làm thị trường ngách đầu tiên |
| Thanh toán quốc tế từ Việt Nam | Trung bình | Dùng dịch vụ merchant of record (Paddle / Lemon Squeezy); xác minh điều kiện lúc chọn |
| Một người phụ trách, phụ thuộc AI viết mã | Trung bình | Kế hoạch từng phiên, test E2E (Chặng 3), staging, tài liệu bàn giao |

## 7. Trạng thái

| Chặng | Trạng thái | Ngày | Ghi chú |
|---|---|---|---|
| 1 Hợp nhất nhánh | Xong | 2026-10-17 | Production chạy Giai đoạn 1–2, tag `v-core-plugins-2026-10-17`; nhánh đã dọn, `next` = `main` |
| 2 Định vị lại | Xong | 2026-10-17 | PR #3 (`e8c1f7d`): README tiếng Anh, `/privacy` trung lập, `NOTICE.md`, xoá `phone/`, ẩn "cỡ bàn cờ"; bản ghi `2026-10-17-phien-chang-2.md` |
| 3 Rà soát, hoàn thiện | Xong | 2026-10-17 | PR #4–#8 (merge cuối `e7af3dc`): sync không mất dữ liệu, xung đột, bảo mật, E2E trong CI, CSP desktop, `docs/qa/checklist.md` |
| 4 Quốc tế hoá, người mới | Xong | 2026-10-19 | PR #9–#17 (merge cuối `b059018`): i18n en/vi, vault mẫu, PWA, offline, chống ghi đè, tài liệu tiếng Anh; bản ghi cuối `2026-10-19-phien-4-9-tai-lieu.md` |
| 5 Nền tảng thương mại | Xong | 2026-10-20 | PR #18–#23 (merge cuối `777eddf`): email tài khoản, mở đăng ký (Turnstile), gói và hạn mức, trang quản trị, Sentry + số liệu + trang trạng thái, pháp lý quốc tế; bản ghi cuối `2026-10-20-phien-5-6-phap-ly.md`. Production vẫn `invite` |
| 6 Thương hiệu, ra mắt | Chưa làm | | |

## 8. Giải thích thuật ngữ

- **Thương mại hoá**: bán sản phẩm (thu phí theo gói, theo tổ chức…).
- **Freemium**: dùng miễn phí có giới hạn, trả phí để mở rộng.
- **Gói / hạn mức (plan / quota)**: mỗi người dùng thuộc một gói; gói quy định dung lượng, số vault, số người cộng tác… Máy chủ kiểm và chặn khi vượt.
- **Merchant of record**: bên trung gian đứng tên bán hàng thay mình, lo thu tiền và nộp thuế ở mọi nước (Paddle, Lemon Squeezy).
- **i18n (quốc tế hoá)**: tách chữ trên giao diện ra file riêng để dịch sang nhiều ngôn ngữ.
- **E2E (end-to-end)**: test tự động điều khiển trình duyệt như người dùng thật (đăng nhập, tạo note…).
- **PWA**: trang web cài được lên điện thoại như một app.
- **Merge / nhánh / worktree**: gộp mã giữa các nhánh; nhánh là bản sao để làm việc riêng; worktree là một thư mục làm việc riêng cho một nhánh.
- **Identifier (desktop)**: mã định danh của app trên máy tính; đổi nó thì app coi như một app mới (thư mục cấu hình mới), nên phải có bước chuyển dữ liệu.
- **Nhãn hiệu (trademark)**: quyền với tên thương mại; phải tra trước khi chọn tên mới.

# Chặng K: Kiểm chứng trước khi quyết định thương mại

> Ngày lập: 2026-10-20 · Trạng thái: **đang làm** (Tuần 0) · Lộ trình: [2026-10-17-lo-trinh-thuong-mai.md](2026-10-17-lo-trinh-thuong-mai.md)
> **Phiên mới hãy đọc trước:** [2026-10-14-huong-dan-ban-giao-phien.md](2026-10-14-huong-dan-ban-giao-phien.md)
> **Điều kiện bắt đầu:** Chặng 5 xong (2026-10-20). Chặng 6 chỉ bắt đầu khi chặng này có [báo cáo quyết định](../kiem-chung/bao-cao-quyet-dinh.md).
> Thư mục làm việc: [`docs/kiem-chung/`](../kiem-chung/)

## Vì sao có chặng này

Chặng 1–5 đã xong; theo lộ trình, bước kế là Chặng 6.1 (chốt mô hình kinh doanh, tên mới, ra mắt). Chủ dự án muốn **chưa vội**: dùng thật một thời gian, kiểm chứng, hoàn thiện, so sánh với đối thủ và xét mọi mặt, rồi mới quyết. Chặng K chen giữa Chặng 5 và Chặng 6, không đánh số lại các chặng cũ.

## Đã chốt với chủ dự án (2026-10-20)

| Câu hỏi | Quyết định |
|---|---|
| Thời lượng | **6 tuần**: 2026-10-21 → 2026-12-01; họp quyết định ~2026-12-02 |
| Ai dùng thử | **Chỉ chủ dự án** (không mời nhóm ngoài) |
| Đối thủ so sánh | Đủ 4 nhóm, 12 app: Obsidian, Logseq · Notion, Craft · AFFiNE, Anytype, SiYuan, Joplin · Bear, Evernote, Apple Notes, Google Keep |
| Đầu ra | Tài liệu Markdown trong repo |

## Mục tiêu

- Biết Noteriv **đã đủ tốt để dùng hằng ngày** chưa, bằng bằng chứng (nhật ký, kịch bản, số đo), không bằng cảm giác.
- Biết Noteriv **đứng ở đâu** so với 12 đối thủ, khác biệt nào là thật.
- Biết **chi phí, rủi ro, pháp lý, năng lực** nếu bán.
- Có **báo cáo quyết định** với 3–4 phương án để chủ dự án chọn ở Chặng 6.1.

## Nguyên tắc

- **Tiêu chí đặt trước, chấm sau**: tiêu chí thành công/dừng và trọng số chấm đối thủ chốt ở Tuần 0, không sửa trong lúc dùng.
- **Không làm tính năng lớn mới** trong 6 tuần: chỉ sửa lỗi Chặn/Nặng và chỗ vướng lặp lại ≥ 3 lần trong nhật ký. Tối đa ~2 phiên sửa mỗi tuần.
- Mỗi việc sửa = một phiên nhỏ theo quy trình cũ (nhánh `covuaduongsinh/k-<việc>` → staging → hỏi trước khi merge vào `main`).
- Số liệu về đối thủ phải có **nguồn + ngày tra**.

## Ngoại lệ: app mobile (chốt 2026-10-21)

Chủ dự án cần kiểm chứng cả trên **app di động thật**, nên làm lại app ngay trong chặng này. Đây là ngoại lệ có chủ đích cho nguyên tắc "không làm tính năng lớn mới".

- **Cách làm:** khôi phục `phone/` của upstream (Expo 54, RN 0.81, đã bị xoá ở Chặng 2). Mô hình **giống desktop**: vault nằm trên máy, đồng bộ qua GitHub/GitLab/Gitea. **Server không sửa.** Web gặp mobile qua cùng một repo git (sync connection).
- **Chỉ Android** (cài APK). iPhone để sau.
- **`phone/` đứng riêng** (lockfile riêng như `web/server`), không vào npm workspaces: RN 0.81 cần `react@19.1.0`, còn web/desktop dùng 19.2.x.
- **Bốn phiên**, mỗi phiên một nhánh `covuaduongsinh/k-mobile-<việc>` → PR → hỏi trước khi merge:
  - **M1:** khôi phục, đổi id ứng dụng, build APK debug, chạy trên máy thật.
  - **M2:** dùng chung logic với `@noteriv/core` (Metro `watchFolders`), tên bản xung đột giống web/desktop, sync hai chiều với desktop/web.
  - **M3:** i18n en/vi từ catalog chung, theme chung (`packages/core`), vault mẫu, bố cục theo web khổ điện thoại.
  - **M4:** Ghi nhanh, CI job `phone`, tài liệu, APK release ký bằng keystore riêng.
- **Không làm trong đợt này** (upstream cũng không có): canvas, vẽ, PDF, vim, ghi âm, cộng tác realtime.

## Ngoại lệ 2: lấp khoảng trống so với Obsidian (chốt 2026-10-22)

Chủ dự án chọn **làm luôn cả tính năng lớn** còn thiếu so với Obsidian ngay trong chặng này, song song với việc dùng thật.

- **Nguồn:** chỉ dùng nguồn công khai. Điều khoản của Obsidian cấm dịch ngược và cấm dùng để làm sản phẩm cạnh tranh, nên lần thử dùng REA trên Obsidian đã dừng (xem [moi-mat.md](../kiem-chung/moi-mat.md) mục 4). REA chỉ dùng để soi bản build của chính Noteriv.
- **Bản đồ khoảng trống:** [obsidian-cong-khai.md](../kiem-chung/obsidian-cong-khai.md), gồm G1–G19, chia 4 đợt. **Chủ dự án chốt danh sách và thứ tự trước khi code.**
- **Mỗi việc là một phiên** `covuaduongsinh/k-obs-<việc>`, cắt từ `main` (dùng worktree riêng nếu nhánh mobile đang dở):
  1. Viết plan phiên, gồm đặc tả hành vi bằng lời của mình.
  2. Đặt logic ở `packages/core`/`packages/ui`, đóng gói thành core plugin để web và desktop dùng chung.
  3. Thêm chuỗi chữ vào i18n en/vi.
  4. Chạy E2E trên bản build production và smoke desktop 16/16.
  5. Đẩy staging, rồi hỏi trước khi merge.
  6. Nếu có migration: backup, chạy `psql -1` lên prod, rồi `migrate resolve`.
- **Ảnh hưởng:** việc dùng thật hằng ngày và lịch báo cáo quyết định (~2026-12-02) giữ nguyên. Nếu khối lượng làm trễ báo cáo thì hỏi chủ dự án trước khi lùi lịch.

### Kết quả (2026-10-23)

Xong cả 4 đợt trong 11 phiên (O1–O11, PR #26–#36), tất cả đã lên production.

| Đợt | Việc | Phiên |
|---|---|---|
| 1. Liên kết và thuộc tính | Đổi tên thì sửa liên kết (G1), liên kết đi ra + nhắc đến chưa liên kết (G3), nhúng note/mục/khối (G2), thuộc tính có kiểu + Tất cả thuộc tính (G4) | O1–O4 |
| 2. Xem và tìm | Chế độ xem bảng/thẻ/danh sách/kanban, dạng khối và dạng file `.view` (G5); tìm kiếm có toán tử + tìm & thay toàn vault (G6) | O5–O7 |
| 3. Tiện ích nhỏ | Lệnh `/` (G7), đồ thị cục bộ (G8), note mã thời gian (G9), ô Chú thích cuối trang (G10), xem trước khi rê chuột trên desktop (G11) | O8–O10 |
| 4. Thu hút người mới | Nhập từ Notion, Evernote, HTML (G12) | O11 |

**Cách làm đã giữ suốt:**
- Mỗi phiên có review độc lập. Review đã bắt nhiều lỗi thật: mất dữ liệu ở danh sách khi sửa thuộc tính (O4), thay thế ăn vào giữa từ (O6), thuộc tính gán nhầm khi database có hàng trùng tên (O11)…
- Mỗi phiên chạy E2E web trên bản build production (57 lên 64 test) và smoke desktop (20 lên 22 kiểm tra).
- Hỏi chủ dự án trước mỗi lần merge.

**Đã dọn ở [phiên K-O12](2026-10-23-phien-k-o12-don-gioi-han.md) (PR #38):** #4 (đồ thị và Vault insights dùng chung một cách phân giải liên kết, nay hiểu cả liên kết dạng đường dẫn), menu `/` không mở trong `$…$`, và nhập dữ liệu có nút huỷ cùng giới hạn dung lượng (1 GB đã chọn, 2 GB sau giải nén, 50 000 file).

---

## Tuần 0 – Chuẩn bị (2026-10-20/21)

1. Tạo thư mục `docs/kiem-chung/` và các mẫu. ✅
2. Chủ dự án chốt **tiêu chí thành công / dừng** và **trọng số chấm điểm** ([bao-cao-quyet-dinh.md](../kiem-chung/bao-cao-quyet-dinh.md) mục 1, [doi-thu.md](../kiem-chung/doi-thu.md) mục 3). ✅ Đã chốt 2026-10-20, nguyên bản đề xuất.
3. Giám sát: Sentry và trang Status **đã bật** ở production (5.5). Việc ở chặng này: mỗi tuần xem Sentry một lần, ghi lỗi mới vào [loi-va-gop-y.md](../kiem-chung/loi-va-gop-y.md). Resend/Turnstile để sau (chỉ một người dùng).
4. **Chuyển ghi chú thật vào** production (vault Obsidian / thư mục Markdown đang dùng). Ghi mọi chỗ vướng khi nhập.
5. Ghi **số liệu nền** vào [moi-mat.md](../kiem-chung/moi-mat.md) mục 1: `/admin/stats`, đĩa/RAM VPS, thời gian mở vault thật.

## Tuần 1–6 – Dùng thật hằng ngày (chủ dự án)

- Mọi ghi chú mới viết trong Noteriv, trên **web, desktop và app Android (cùng PWA) trên điện thoại thật**.
- Mỗi ngày ~2 phút điền [nhat-ky.md](../kiem-chung/nhat-ky.md).
- Cuối tuần: một phiên với Claude — phân loại mục mới vào [loi-va-gop-y.md](../kiem-chung/loi-va-gop-y.md), chọn việc sửa, cập nhật bảng Trạng thái bên dưới.

## Tuần 1–2 (21/10–3/11) – Kiểm chứng có kịch bản

Chạy 20 kịch bản trong [kich-ban.md](../kiem-chung/kich-ban.md) (người mới, dữ liệu, cộng tác, hiệu năng, vận hành). Vì chỉ có một người dùng, kịch bản "người mới" đóng vai người lạ bằng tài khoản mới + trình duyệt ẩn danh. Dùng lại `docs/qa/checklist.md`, E2E `e2e/`, smoke desktop `e2e/desktop/smoke.mjs`, seed vault lớn `scripts/perf/seed-vault.mjs`.

## Tuần 2–4 (28/10–17/11) – So sánh đối thủ

Trong [doi-thu.md](../kiem-chung/doi-thu.md):
1. Nghiên cứu bàn giấy 12 app (Claude, có nguồn + ngày).
2. Chủ dự án dùng thử 4 app tiêu biểu (Obsidian, Notion, AFFiNE hoặc Anytype, Bear hoặc Apple Notes) với **10 việc chuẩn**, làm cả trên Noteriv.
3. Chấm điểm có trọng số.
4. Bản đồ định vị + khác biệt thật.

## Tuần 3–5 (4/11–24/11) – Mọi mặt khác

Trong [moi-mat.md](../kiem-chung/moi-mat.md): kỹ thuật (hiệu năng, `/security-review`, nợ kỹ thuật), vận hành và chi phí theo quy mô, pháp lý (tra sơ bộ nhãn hiệu 5–10 tên, thuế, merchant of record), kinh doanh (giả thuyết giá, điểm hoà vốn, kênh, phương án cờ vua), năng lực một người + AI.

## Tuần 6 (25/11–1/12) – Tổng hợp và quyết định

Viết [bao-cao-quyet-dinh.md](../kiem-chung/bao-cao-quyet-dinh.md): đối chiếu tiêu chí, 10 vướng mắc lớn nhất, chấm điểm đối thủ, chi phí/rủi ro/pháp lý, các phương án A–D, khuyến nghị, câu hỏi cho Chặng 6.1. Ghi rõ giới hạn: chỉ một người dùng thử nên chưa có bằng chứng về mức sẵn lòng trả tiền.

## Vai trò

| Ai | Việc |
|---|---|
| Chủ dự án | Dùng hằng ngày, điền nhật ký, chạy kịch bản trên thiết bị thật, dùng thử 4 app đối thủ, quyết định cuối |
| Claude | Soạn mẫu, nghiên cứu đối thủ có dẫn nguồn, chạy E2E/smoke/đo hiệu năng, phân loại lỗi hằng tuần, sửa lỗi theo phiên, viết báo cáo |

### Xong khi (cả chặng)

- Nhật ký có mục cho ≥ 5 ngày mỗi tuần trong 6 tuần.
- Đủ 20 kịch bản có kết quả; E2E CI xanh; smoke desktop 16/16.
- `doi-thu.md` đủ 12 hồ sơ có nguồn + điểm 4 app dùng thử.
- `bao-cao-quyet-dinh.md` trả lời từng tiêu chí đặt ở Tuần 0; chủ dự án chọn một phương án; lộ trình và Chặng 6 được cập nhật theo phương án đó.

## Trạng thái

| Tuần | Nội dung | Trạng thái | Ngày | Ghi chú |
|---|---|---|---|---|
| 0 | Chuẩn bị | Đang làm | 2026-10-20 | Đã tạo mẫu, đã chốt tiêu chí và trọng số; còn: nhập ghi chú thật, ghi số liệu nền |
| 1 | Dùng thật + kịch bản + vá lỗi bảo mật | Xong phần kỹ thuật | 21–27/10 | K-B1 (PR #47), K-B2 (PR #49), K-B3 (PR #50), Lỗi #5 (PR #51) đã merge main. Phần chủ dự án: chờ ghi nhật ký hồi cứu và thử kịch bản C trên máy thật |
| 2 | Dùng thật + đối thủ + mọi mặt | Đang làm (vượt tiến độ) | 28/10–3/11 | Đã hoàn thành hồ sơ 12 đối thủ, xác minh sandbox plugin, khảo sát nhãn hiệu, giả thuyết giá & điểm hoà vốn, đánh giá năng lực 1 người + AI |
| 3 | Đối thủ + mọi mặt | Đang làm sớm | 4–10/11 | Đã điền xong chi phí theo quy mô, pháp lý, mô hình MoR Polar/Lemon Squeezy |
| 4 | Đối thủ (dùng thử 4 app) + mọi mặt | Chưa làm | 11–17/11 | Chờ chủ dự án dùng thử 4 app tiêu biểu (Obsidian, Notion, Anytype/AFFiNE, Bear) |
| 5 | Mọi mặt + sửa lỗi cuối | Chưa làm | 18–24/11 | |
| 6 | Báo cáo quyết định | Chưa làm | 25/11–1/12 | |
| B1 | Bảo mật worker sync (C1–C3, H1) | Xong | 2026-10-26 | [Phiên K-B1](2026-10-26-phien-k-b1-bao-mat-server.md); PR #47, đã merge; vá symlink, branch, host nội bộ |
| B2 | Bảo mật desktop & phone | Xong | 2026-10-26 | [Phiên K-B2](2026-10-26-phien-k-b2-bao-mat-desktop-phone.md); PR #49, đã merge; WebDAV path traversal, git scope, SecureStore, allowBackup |
| B3 | Bảo mật server (Mức Trung bình & Thấp) | Xong | 2026-10-26 | [Phiên K-B3](2026-10-26-phien-k-b3-bao-mat-server.md); PR #50, đã merge; email verification, attachment header, refresh token replay, non-root |
| #5 | Đọc note hàng loạt cho plugin (scanVault) | Xong | 2026-10-26 | [Phiên Lỗi #5](2026-10-26-phien-loi-5-doc-note-hang-loat.md); PR #51, đã merge; xoá bỏ nghẽn 300 req/phút của plugin |
| KC | Kiểm chứng đối thủ, nhãn hiệu, giá & năng lực | Xong | 2026-10-26 | [Phiên K-Claude](2026-10-26-phien-k-claude-kiem-chung.md); xác minh sandbox/tiếng Việt, 10 nhãn hiệu, điểm hoà vốn, chiến lược ngách cờ vua |
| M1 | App mobile: khôi phục, APK debug | Xong | 2026-10-21 | [Phiên K-M1](2026-10-21-phien-k-m1-khoi-phuc-phone.md); `phone/` lấy từ upstream `013fa8c`; APK chạy trên máy thật |
| M1b | App mobile: bật/tắt core plugin như web | Xong | 2026-10-26 | [Phiên K-M1b](2026-10-21-phien-k-m1b-core-plugins-phone.md); PR #39 (gộp cả M1), đã merge; sửa sync qua 2 lượt review; APK mới chưa thử trên máy thật |
| M2 | App mobile: logic chung, sync | Xong | 2026-10-26 | [Phiên K-M2](2026-10-26-phien-k-m2-dung-chung-sync.md); PR #41, đã merge |
| M3 | App mobile: i18n, theme, vault mẫu | Xong | 2026-10-26 | [M3a i18n](2026-10-26-phien-k-m3a-i18n-phone.md) (PR #42) và [M3b theme chung, vault mẫu](2026-10-26-phien-k-m3b-theme-vault-mau.md) (PR #43); bố cục theo web chờ góp ý trên máy thật |
| M4 | App mobile: Ghi nhanh, CI, APK release | Xong | 2026-10-26 | [Phiên K-M4](2026-10-26-phien-k-m4-ghi-nhanh-ci-release.md); PR #44, đã merge; chưa phát hành APK release (tag `phone-v*`) |
| O0 | Obsidian: bản đồ khoảng trống từ nguồn công khai | Xong | 2026-10-22 | [obsidian-cong-khai.md](../kiem-chung/obsidian-cong-khai.md); đã dừng dịch ngược vì điều khoản của Obsidian |
| O1 | G1: đổi tên thì cập nhật liên kết | Xong | 2026-10-22 | [Phiên K-O1](2026-10-22-phien-k-o1-cap-nhat-lien-ket.md); PR #26, đã lên production |
| O2 | G3: liên kết đi ra + nhắc đến chưa liên kết | Xong | 2026-10-22 | [Phiên K-O2](2026-10-22-phien-k-o2-lien-ket-di-ra.md); PR #27, đã lên production |
| O3 | G2: nhúng note, section, khối `^id` | Xong | 2026-10-22 | [Phiên K-O3](2026-10-22-phien-k-o3-nhung-note.md); PR #28, đã lên production |
| O4 | G4: thuộc tính có kiểu + Tất cả thuộc tính | Xong | 2026-10-22 | [Phiên K-O4](2026-10-22-phien-k-o4-thuoc-tinh.md); PR #29, đã lên production; sửa kèm lỗi mất mục list |
| O5 | G5 (phần 1): khối ```view bảng/thẻ/danh sách/kanban | Xong | 2026-10-22 | [Phiên K-O5](2026-10-22-phien-k-o5-che-do-xem.md); PR #30, đã lên production; loại file `.view` để phiên sau |
| O6 | G6: tìm kiếm có toán tử + tìm & thay toàn vault | Xong | 2026-10-23 | [Phiên K-O6](2026-10-22-phien-k-o6-tim-kiem.md); PR #31, đã lên production |
| O7 | G5 (phần 2): file chế độ xem `.view` | Xong | 2026-10-23 | [Phiên K-O7](2026-10-23-phien-k-o7-file-che-do-xem.md); PR #32, đã lên production |
| O8 | G7: lệnh gạch chéo `/` trong editor | Xong | 2026-10-23 | [Phiên K-O8](2026-10-23-phien-k-o8-lenh-gach-cheo.md); PR #33, đã lên production |
| O9 | G8: đồ thị cục bộ, độ sâu, màu theo thư mục | Xong | 2026-10-23 | [Phiên K-O9](2026-10-23-phien-k-o9-do-thi-cuc-bo.md); PR #34, đã lên production |
| O10 | G9 note mã thời gian, G10 ô Chú thích cuối trang, G11 xem trước khi rê chuột trên desktop | Xong | 2026-10-23 | [Phiên K-O10](2026-10-23-phien-k-o10-tien-ich-nho.md); PR #35, đã lên production; hết Đợt 3 |
| O11 | G12: nhập từ Notion, Evernote, HTML | Xong | 2026-10-23 | [Phiên K-O11](2026-10-23-phien-k-o11-nhap-du-lieu.md); PR #36, đã lên production; hết Đợt 4 |
| O12 | Dọn giới hạn còn lại: #4, `/` trong công thức, huỷ và giới hạn khi nhập | Xong | 2026-10-23 | [Phiên K-O12](2026-10-23-phien-k-o12-don-gioi-han.md); PR #38 |
| O2+ | Obsidian: các khoảng trống của 4 đợt | Xong | 2026-10-23 | Làm đủ 4 đợt theo thứ tự chủ dự án chốt (O1–O11). G13–G19 để Chặng 6 hoặc chỉ ghi nhận, theo bản đồ khoảng trống |

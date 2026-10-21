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
| 1 | Dùng thật + kịch bản | Chưa làm | 21–27/10 | |
| 2 | Dùng thật + kịch bản + bắt đầu đối thủ | Chưa làm | 28/10–3/11 | |
| 3 | Đối thủ + mọi mặt | Chưa làm | 4–10/11 | |
| 4 | Đối thủ (dùng thử 4 app) + mọi mặt | Chưa làm | 11–17/11 | |
| 5 | Mọi mặt + sửa lỗi cuối | Chưa làm | 18–24/11 | |
| 6 | Báo cáo quyết định | Chưa làm | 25/11–1/12 | |
| M1 | App mobile: khôi phục, APK debug | Xong | 2026-10-21 | [Phiên K-M1](2026-10-21-phien-k-m1-khoi-phuc-phone.md); `phone/` lấy từ upstream `013fa8c`; APK chạy trên máy thật |
| M1b | App mobile: bật/tắt core plugin như web | Đang làm | 2026-10-21 | Nhánh `covuaduongsinh/k-mobile-core-plugins`; chủ dự án yêu cầu sau khi thử M1 |
| M2 | App mobile: logic chung, sync | Chưa làm | | |
| M3 | App mobile: i18n, theme, vault mẫu | Chưa làm | | |
| M4 | App mobile: Ghi nhanh, CI, APK release | Chưa làm | | |

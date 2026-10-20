# Phiên 5.6: Pháp lý quốc tế

> Ngày: 2026-10-20 · Chặng: [5](2026-10-17-chang-5-nen-tang-thuong-mai.md) · Nhánh: `covuaduongsinh/chang5-legal` (tách từ `covuaduongsinh/chang5-ops-done`, nên PR mang theo commit tài liệu `1f86b2a` "5.5 on production")

## Chủ dự án chốt

1. **Cơ sở xử lý:**
   - **hợp đồng** cho tài khoản, nội dung, email tài khoản và đồng bộ;
   - **lợi ích chính đáng** cho nhật ký bảo mật, báo lỗi Sentry, ngày hoạt động và Turnstile. Người dùng phản đối qua email; không thêm nút bật/tắt.
2. **Nhật ký bảo mật** (`audit_logs`, có IP; trước đây giữ mãi) giữ **12 tháng**.
3. **Hoàn tiền:** hoàn đủ trong 14 ngày. Chỉ là nháp trong `docs/plans`, đưa vào `/terms` khi bật thu phí.
4. **DPA:** chưa soạn. `/privacy` ghi rằng tổ chức cần DPA thì viết cho chúng tôi.
5. **Đồng ý lại:** hộp thoại chặn trên các trang của app; API không chặn.
6. **VPS** ghi chung là "máy chủ thuê, trung tâm dữ liệu ở Singapore", không nêu tên nhà cung cấp. IP production thuộc AS141995 Contabo Asia, Singapore (tra công khai trên ipinfo.io).

## Đầu phiên

Đã cập nhật tài liệu: Sentry và link Status bật ở production từ 2026-10-20 (commit `8aaa904`). Các chỗ đã sửa: bảng Trạng thái, hướng dẫn bàn giao, `docs/ops/giam-sat.md` mục 6–7, bản ghi 5.5.

## Đã làm

### Server
- `TERMS_VERSION` = `2026-10-20` (`lib/registration.ts`, `web/src/lib/legal.ts`).
- `GET /auth/me` trả `termsAccepted` (`terms_version` của tài khoản có bằng bản hiện tại không).
- `POST /users/me/terms { version }`:
  - chỉ nhận đúng `TERMS_VERSION`; khác thì trả 409 `terms_outdated`, để một tab cũ không đồng ý thay bản người dùng chưa thấy;
  - ghi `terms_accepted_at`, `terms_version` và audit `terms_accepted`.
- `GET /users/me/export` kèm `emailVerifiedAt`, `termsAcceptedAt`, `termsVersion` (đủ quyền truy cập).
- `lib/retention.ts` → `pruneExpiredRecords`, chạy trong job dọn rác hằng ngày của worker:
  - audit cũ hơn 365 ngày;
  - refresh token và token email đã hết hạn quá 30 ngày.
  - Không có migration (đã có chỉ mục `audit_logs.created_at`).
- **Release Sentry `unknown` (việc tồn của 5.5):**
  - Nguyên nhân: `getSentryRelease()` của `@sentry/node-core` tự đọc `process.env.SENTRY_RELEASE`, bỏ qua giá trị đã lọc trong `lib/sentry.ts`. Compose đặt mặc định `unknown`, nên chuỗi này đi thẳng vào Sentry.
  - Sửa: compose dùng `${SOURCE_COMMIT:-}` (rỗng → không có release).
  - Muốn có release thật thì phải ghi commit vào image lúc build (việc tồn).

### Web
- `components/TermsGate.tsx`:
  - tự hỏi `/auth/me`; khi `termsAccepted === false` thì hiện hộp thoại `role="dialog"` phủ trang;
  - hộp thoại có 4 dòng tóm tắt thay đổi, link Terms/Privacy, và các nút **I accept**, **Download all my data (JSON)**, **Delete account** (bấm hai lần), **Sign out** (báo trước nếu còn bản sửa offline chưa gửi);
  - mất mạng thì không hiện;
  - gắn ở `/vaults`, `/vaults/[id]`, `/quick` và `AdminNav` (4 trang admin).
- `lib/account-actions.ts`: `downloadMyData`, `deleteMyAccount`, dùng chung cho trang Vault và hộp thoại.
- Chữ mới: `web.termsGate.*` (en + vi).

### Nội dung pháp lý (en + vi)
- **`/privacy`** viết lại, 13 mục:
  1. ai chịu trách nhiệm;
  2. dữ liệu lưu;
  3. **cơ sở pháp lý** (Điều 6(1)(b), (f), và (c) khi thu phí);
  4. **thời hạn lưu**:
     - thùng rác 30 ngày, lịch sử theo gói;
     - ngày hoạt động khoảng 13 tháng, audit 12 tháng;
     - phiên 30 ngày, liên kết email 1–24 giờ;
     - Sentry 30 ngày (gói Developer, tra trên sentry.io/pricing);
     - sao lưu khoảng 12 tháng;
  5. **bên xử lý phụ** (đối chiếu mã):
     - VPS ở Singapore; Resend; Sentry (EU); Cloudflare Turnstile; GitHub (sao lưu đã mã hoá);
     - giám sát UptimeRobot và healthchecks.io, không nhận dữ liệu cá nhân;
     - GitHub/WebDAV của người dùng là bên do họ tự chọn;
     - không có Plausible;
  6. **chuyển dữ liệu ra ngoài EEA/UK** (SCC hoặc DPF);
  7. bảo mật;
  8. **quyền** (truy cập, mang đi, xoá, sửa, hạn chế, phản đối, khiếu nại; trả lời trong một tháng);
  9. giới hạn sao lưu;
  10. trẻ em;
  11. **tổ chức và DPA**;
  12. liên hệ;
  13. thay đổi.
  - Đầu file có chú thích chỉ ra mã thực thi từng con số.
- **`/terms`:**
  - bỏ câu "chỉ nhận người có mã mời";
  - thêm tuổi tối thiểu 16;
  - thêm mục 7 "Gói và thanh toán" (hạn mức không xoá dữ liệu; hiện miễn phí; điều khoản trả phí hiện trước khi mua);
  - không hạn chế quyền bắt buộc của người tiêu dùng; luật Việt Nam nhưng giữ quy định bắt buộc của nước người tiêu dùng;
  - đổi điều khoản thì hỏi đồng ý lại.
- Nháp thanh toán và hoàn tiền: [`2026-10-20-nhap-dieu-khoan-thanh-toan.md`](2026-10-20-nhap-dieu-khoan-thanh-toan.md).

### Tài liệu
- `docs/getting-started/account.md`: mục "When the terms change", nội dung file xuất.
- `docs/ops/trien-khai.md`:
  - mục 7: đồng ý lại, thời hạn lưu, điều kiện mở đăng ký;
  - mục 10: release Sentry.

### Kiểm thử
- `e2e/tests/legal.spec.ts` (6 test):
  1. `/privacy` và `/terms` có đủ hai ngôn ngữ, các mục mới và các bên xử lý phụ, không có Plausible;
  2. tài khoản mới không bị hỏi;
  3. đặt về bản cũ thì hộp thoại hiện; Accept xong thì không hiện lại;
  4. version sai trả 409, body rỗng trả 400;
  5. file xuất có `termsVersion`;
  6. Ghi nhanh cũng bị chặn, và Sign out từ hộp thoại về `/login`.
- `web/server/scripts/e2e-terms.ts` đặt `terms_version` về `2026-10-15`. **Không chạy với production.**
- Hàm dọn chạy thử trên DB dev: dòng audit 400 ngày bị xoá, dòng 300 ngày còn.

### Kết quả kiểm chứng
- `npm run typecheck` sạch; `npm test` đạt 508 test (300 + 122 + 86); `npx tsc --noEmit` trong `web/server` sạch.
- **E2E trên bản build production:** 52/52 đạt cả 3 lần (khoảng 3,0–3,3 phút mỗi lần). API chạy với `EMAIL_PROVIDER=file`, stub Sentry và `RATE_LIMIT_PER_MINUTE=3000`.
- Đã chụp hộp thoại ở tiếng Anh và tiếng Việt.
- Trước khi chạy đã tắt một API cũ (cổng 4001) và `next` (cổng 3457) còn sót từ phiên trước trong worktree này.

## Lên production (2026-10-20)

- **CI của PR #23:** xanh cả 4 job ngay lần đầu (desktop-frontend, e2e, frontend, server).
- **Staging:**
  - gộp vào `next` bằng nhánh tạm; deploy `done`;
  - `/`, `/login`, `/terms`, `/privacy`, `/vaults`, `/quick`, `/api/v1/healthz`, `/api/v1/config` trả 200; không có basic-auth thì 401; không có container backup;
  - luồng qua API với tài khoản tạm (đã xoá): đăng ký có `termsAccepted: true`; đặt về bản cũ thì `false`; version sai bị 409; đồng ý xong thì `true` và có 1 dòng audit `terms_accepted`;
  - job dọn dữ liệu chạy theo chu kỳ 24 giờ, nên log worker chưa có dòng "pruned" ngay sau deploy.
- **Production:**
  - Không có migration, nên không cần sao lưu tay hay `psql -1`.
  - Gộp PR #23 (merge `777eddf`); deploy `done`.
  - Kiểm sau deploy:
    - 9 container chạy;
    - `/`, `/login`, `/terms`, `/privacy`, `/vaults`, `/api/v1/healthz`, `/api/v1/config` trả 200;
    - `migrate status`: 23 migration, up to date;
    - `SENTRY_RELEASE` rỗng trong container api, `/api/v1/config` trả `release: null` (Sentry và Status vẫn bật);
    - RAM: api 97 MB / 256, worker 78 / 384, web 39 / 384.
  - Production có 1 tài khoản, `terms_version` trống (tạo trước phiên 0.4), nên sẽ thấy hộp thoại lần đầu mở app sau deploy.
- `next` gộp `main` (cây mã trùng `main`, push thường, không force); chờ staging deploy xong rồi `compose.stop`.

## Việc của chủ dự án
- Chấp nhận DPA (thoả thuận xử lý dữ liệu) của nhà cung cấp VPS trong bảng điều khiển khách hàng, nếu có. Với Resend, Sentry, Cloudflare, GitHub thì DPA nằm trong điều khoản của họ.
- Nên nhờ luật sư rà `/terms` và `/privacy` trước khi mở đăng ký rộng. Trang không còn nhãn "Bản nháp" vì đã điền tên chủ thể vận hành.
- Khi mở cho người dùng EU, cân nhắc thêm "đại diện tại EU" (Điều 27 GDPR) cho bên kiểm soát ở ngoài EU.

## Việc tồn
- Release thật cho Sentry: ghi commit vào image lúc build.
- Tên hiển thị chưa đổi được trong app; `/privacy` ghi "viết cho chúng tôi" cho mọi chỉnh sửa khác ngoài email.

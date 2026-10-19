# Phiên 5.5: Vận hành

> Ngày: 2026-10-19 · Chặng: [5](2026-10-17-chang-5-nen-tang-thuong-mai.md) · Nhánh: `covuaduongsinh/chang5-ops` (tách từ `covuaduongsinh/chang5-admin-done`, nên PR mang theo 2 commit tài liệu "5.4 on production")

## Chủ dự án chốt

1. **Theo dõi lỗi bằng Sentry** (dịch vụ, vùng EU, gói miễn phí) cho web, API, worker và collab. Bật bằng env; chưa có DSN thì tắt hẳn.
2. **Desktop chưa gửi báo cáo lỗi** ở phiên này. Để tới khi phát hành bản desktop, lúc đó có bước hỏi ý người dùng.
3. **Đo lường lấy từ DB của mình** (tab `/admin/stats`): không theo dõi trên trình duyệt, không có bên thứ ba. Lượt xem trang để Chặng 6.
4. **Trang trạng thái dùng UptimeRobot**, chủ dự án tự tạo rồi gửi link; link gắn qua env.

## Đã làm

### Server

- **SDK:** `@sentry/node` và `@sentry/browser` **10.76.0** (ghim cứng). Bản 11 mới ra chưa đủ lâu, nên chọn bản ổn định cuối của dòng 10, phát hành ngày 2026-10-02.
- **`lib/sentry.ts`:**
  - `initSentry(service)`: không có `SENTRY_DSN` thì không làm gì. Bỏ qua OpenTelemetry (`skipOpenTelemetrySetup`), không tracing, `sendDefaultPii: false`, tag `service`.
  - `scrubEvent` / `scrubText`:
    - bỏ cookie, header, body, query string và `extra`;
    - user chỉ giữ id; breadcrumb mất `data`, bỏ hẳn breadcrumb console;
    - thay `user:pass@` trong URL, email, `Bearer …`;
    - dòng mã nguồn quanh frame cũng được lọc, biến cục bộ bị xoá.
  - `captureError(err, { tags, userId })`, `flushSentry()`.
- **API:** hook `onError` tự viết, chỉ báo lỗi ≥ 500, tag `method` và route mẫu (`request.routeOptions.url`), kèm id tài khoản.
- **Worker:** báo ở 4 handler `failed`, tag `queue`; `flushSentry` khi tắt.
- **Collab:** lỗi không bắt được (handler mặc định của SDK) và lỗi lưu note.
- **`routes/ops.ts`:**
  - `GET /api/v1/config` (công khai): `{ errorReporting: { dsn, environment, release } | null, statusPageUrl }`, đọc env lúc chạy.
  - `POST /api/v1/errors/browser` (tunnel):
    - không cần đăng nhập; rate limit 30/phút; body tối đa 256 KB;
    - không có DSN thì trả 404;
    - envelope phải đúng DSN của máy chủ (origin, public key, project); sai thì trả 400;
    - giữ lại item `event` và `client_report`, lọc event lần nữa, rồi chuyển tới `…/api/<project>/envelope/`.
- **Số liệu sử dụng:**
  - migration `20261019200000_activity`: bảng `user_activity_days (user_id, day)`, khoá chính kép, chỉ mục `day`, `ON DELETE CASCADE`; điền dữ liệu cũ từ ngày tạo các `refresh_tokens` còn lưu;
  - `lib/activity.ts`:
    - `recordActivity` gọi trong `issueSession` (đăng ký, đăng nhập, refresh), lỗi chỉ ghi log;
    - `pruneActivityDays` (400 ngày) chạy trong job dọn rác hằng ngày;
    - `usageStats`: tổng quan cộng 12 tuần gần nhất (đăng ký, hoạt động, quay lại ở ngày 7–13 và ngày 28–34; `null` khi nhóm chưa đủ tuổi);
  - `GET /api/v1/admin/stats` dùng chung hook kiểm quyền admin;
  - `GET /users/me/export` kèm `activityDays` (quyền truy cập dữ liệu).
- **Compose:**
  - `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE=${SOURCE_COMMIT}` cho api, worker, collab;
  - `STATUS_PAGE_URL` cho api.

### Web

- `lib/public-config.ts`: đọc `/api/v1/config` một lần.
- `lib/error-reporting.ts`:
  - chỉ `import("@sentry/browser")` khi có DSN;
  - dùng tunnel; bỏ integration `BrowserSession`; bỏ breadcrumb console và `ui.*`;
  - URL trong breadcrumb và `request` bỏ query/hash; lọc như server;
  - user = id, gắn trong `webApi.auth.me()`, bỏ khi `logout`.
- `components/ErrorReporting.tsx`, gắn ở `app/layout.tsx`.
- `app/error.tsx` (nút Try again, gọi `retry()`, API của Next 16) và `app/global-error.tsx` (style nội tuyến, nút Reload).
- `components/StatusLink.tsx`: ở chân trang đăng nhập, trang Vault và `LegalShell`; ẩn khi chưa có link.
- `/admin/stats` cùng thẻ **Stats** / **Số liệu** trong `AdminNav`.
- **Chữ mới:** `web.admin.tabs.stats`, `web.admin.stats.*`, `web.errorPage.*`, `web.footer.status` (en + vi).
- **`/privacy` (en + vi):**
  - thêm dữ liệu sử dụng (khoảng 13 tháng, đếm trên máy chủ của mình);
  - thêm Sentry (EU, nội dung báo cáo, không có email/IP/ghi chú);
  - bỏ câu "no behavioural analytics", thay bằng "no third-party analytics";
  - `LAST_UPDATED` = 2026-10-19.
  - `TERMS_VERSION` giữ nguyên; tăng và cho đồng ý lại ở phiên 5.6.

### Tài liệu

- `docs/ops/trien-khai.md` thêm mục 10.
- `docs/ops/giam-sat.md`:
  - thêm dòng Sentry vào bảng;
  - mục 6 (chủ dự án tạo Sentry ở vùng EU, cách đọc issue, lệnh thử trong container api đã chạy thử trên bản build);
  - mục 7 (status page UptimeRobot).
- `docs/ops/bi-mat.md`: thêm Sentry.
- `docs/getting-started/account.md`: thêm "Is Noteriv down?", và file xuất có kèm ngày hoạt động.
- `e2e/README.md`: cách chạy API với stub.

### Kiểm thử

- `e2e/sentry-stub.mjs`: đứng thay Sentry ở cổng 4010, ghi mỗi envelope ra một file. CI khởi động stub và đặt `SENTRY_DSN`, `STATUS_PAGE_URL`.
- `web/server/scripts/e2e-sentry.ts`: gửi một lỗi phía server có email, token và URL kèm mật khẩu.
- `e2e/tests/ops.spec.ts` (6 test):
  - `/api/v1/config`;
  - lỗi trình duyệt đi qua tunnel tới stub, đã lọc email, có id tài khoản;
  - tunnel từ chối DSN lạ và body sai;
  - lỗi phía server đã lọc;
  - `/admin/stats` có dòng tuần này (≥ 2 đăng ký, ≥ 2 hoạt động), người thường nhận 403;
  - link Status.
- **Kiểm thử bắt được 2 lỗi lọc, đã sửa:**
  - regex email chạy trước regex URL, nên `https://u:tok@github.com` thành `https://u:[email]`, để lộ tên người dùng. Đã đổi thứ tự ở cả hai phía;
  - SDK Node gửi kèm dòng mã nguồn quanh chỗ lỗi (`context_line`, `pre_context`, `post_context`), trong đó có chuỗi gốc. Đã lọc các dòng này và xoá `vars`.

### Kết quả kiểm chứng

- `npm run typecheck` sạch; `npm test` đạt 508 test (300 + 122 + 86); `npx tsc --noEmit` trong `web/server` sạch.
- **E2E trên bản build production** (API chạy với `EMAIL_PROVIDER=file`, stub Sentry, `STATUS_PAGE_URL=https://status.example.test/`): **46/46 đạt cả 3 lần** (khoảng 3,3 phút mỗi lần).
- **Khi không có DSN:**
  - `/api/v1/config` trả `{"errorReporting":null,"statusPageUrl":null}`;
  - tunnel trả 404;
  - trang `/login` không tải SDK (không có `window.__SENTRY__`), không gửi gì tới tunnel, và không có link Status.
- Lệnh thử Sentry trong `giam-sat.md` mục 6 đã chạy trên bản `tsc` build và gửi được tới stub.
- Đã chụp `/admin/stats` ở tiếng Anh và tiếng Việt.
- **CI lần đầu:** job e2e hỏng ở `offline.spec.ts`. Nguyên nhân: request lấy note nhận 429.
  - CI chạy nhanh và mọi request đến từ cùng một IP, nên chạm giới hạn chung 300 request/phút. `GET /api/v1/config` mới (gọi ở mỗi lần tải trang) đủ để đẩy qua ngưỡng; máy cục bộ chậm hơn (DB ở xa) nên không gặp.
  - Sửa: `/config` không tính vào rate limit, giống `/api/v1/healthz` (route này chỉ đọc env).
  - Người dùng thật không bị ảnh hưởng: ở production mỗi IP thật có bucket riêng (`trustProxy`).
- **CI lần hai:** vẫn 429, lần này ở `ops.spec.ts`. Cả bộ 46 test chạy từ một IP trong khoảng 2,5 phút, vượt 300/phút. Đây là giới hạn của môi trường test.
  - Sửa: thêm env `RATE_LIMIT_PER_MINUTE` (mặc định 300, production giữ nguyên); job e2e của CI đặt 3000.

## Lên production (2026-10-19)

- **CI của PR #22:**
  - lần 1 và lần 2 hỏng ở job e2e vì 429 (xem hai mục "CI lần đầu" và "CI lần hai" ở trên);
  - lần 3 xanh cả 4 job.
- **Staging:**
  - gộp `next` bằng nhánh tạm; deploy `done`;
  - `prisma migrate deploy` (bảng mới có 3 dòng từ dữ liệu cũ);
  - `/`, `/login`, `/admin/stats`, `/privacy`, `/api/v1/config`, `/api/v1/healthz` trả 200;
  - API admin khi chưa đăng nhập trả 401; tunnel trả 404 (chưa có DSN).
- **Production:**
  1. Sao lưu tay: `/root/noteriv-manual-backups/pre-5-5-20261019T101626Z.dump` trên VPS; `pg_restore -l` đọc được 21 bảng có dữ liệu.
  2. Áp `migration.sql` bằng `psql -1` (`CREATE TABLE`, `CREATE INDEX`, `ALTER TABLE`, `INSERT 0 3`).
  3. Gộp PR #22 (merge `08d8e54`); deploy `done`.
  4. `prisma migrate resolve --applied 20261019200000_activity`; `migrate status` báo up to date.
  5. Kiểm:
     - 9 container chạy;
     - `/`, `/login`, `/admin/stats`, `/privacy`, `/api/v1/config`, `/api/v1/healthz` trả 200;
     - `/api/v1/config` trả `errorReporting: null`, `statusPageUrl: null`;
     - stats khi chưa đăng nhập trả 401; tunnel trả 404;
     - RAM: api 67 MB / 256, worker 47 / 384, collab 34 / 256;
     - `user_activity_days` có 3 dòng.
- `next` gộp `main` (cây mã trùng `main`, push thường, không force); chờ staging deploy xong rồi `compose.stop`.
- **Còn chờ chủ dự án** (`docs/ops/giam-sat.md` mục 6–7):
  - tạo Sentry ở vùng EU, lưu DSN vào `~/.config/noteriv/sentry.dsn`;
  - tạo status page trên UptimeRobot và gửi link.
  - Khi có, một phiên sẽ hỏi trước rồi đặt `SENTRY_DSN` / `STATUS_PAGE_URL` trong Dokploy và deploy lại.

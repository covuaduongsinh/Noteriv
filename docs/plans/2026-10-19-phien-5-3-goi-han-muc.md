# Phiên 5.3: Gói và hạn mức

> Ngày: 2026-10-19 · Chặng: [5](2026-10-17-chang-5-nen-tang-thuong-mai.md) · Nhánh: `covuaduongsinh/chang5-plans` (tách từ `covuaduongsinh/chang5-signup-done`, nên PR mang theo commit tài liệu "5.2 on production")

## Chủ dự án chốt

1. **Gói free rộng rãi:** 10 vault, 1 GB đính kèm cho cả tài khoản, 3 kết nối đồng bộ, 50 bản lịch sử mỗi note. Sửa được bằng CLI.
2. **Dung lượng tính theo tài khoản.** Bỏ giới hạn 500 MiB mỗi vault, giữ giới hạn 25 MB mỗi tệp.
3. **Tài khoản chủ dự án dùng gói `unlimited`**, gán tay bằng CLI.
4. **"Nâng cấp" là email tới `CONTACT_EMAIL`.** Chưa có thanh toán; thanh toán để đầu Chặng 6.

## Đã làm

### Server

- **Migration `20261019160000_plans`:**
  - bảng `plans` với các cột hạn mức (null = không giới hạn), cùng hai cột để dành chưa kiểm (`maxCollaboratorsPerVault`, `aiRequestsPerMonth`);
  - chèn sẵn hai gói `free` và `unlimited`;
  - `users.plan_id` mặc định `free`, khoá ngoại tới `plans`.
- **`lib/plans.ts`:**
  - hạn mức tính cho **chủ workspace** của vault;
  - `usageFor` đếm vault, byte đính kèm và kết nối trên mọi vault người đó sở hữu;
  - `checkLimit` ném `PlanLimitError`; API trả 403 `{ error: "plan_limit", limit, max, used }`.
- **Kiểm ở:**
  - `POST /vaults`;
  - `POST /:vid/attachments`, thay cho giới hạn theo vault;
  - worker đồng bộ đính kèm (`attachmentSync.ts`);
  - `POST /:vid/sync-connections`;
  - snapshot: `captureSnapshots` và `snapshotBeforeOverwrite` cắt theo `maxSnapshotsPerNote` của gói. Null vẫn giữ 50, để bảng không phình mãi.
- **Đã xoá:** `ATTACHMENT_QUOTA_BYTES`, `ATTACHMENT_QUOTA_BYTES_PER_VAULT`, `getVaultUsage`, `formatBytes`.
- **`GET /users/me/plan`:** gói, hạn mức (số bản lịch sử là số thật đang áp dụng) và mức đang dùng.
- **CLI `cli/plan.ts`:** `list`, `assign <email> <plan>`, `set <plan> <cột> <số|unlimited>`, `create <plan> <tên>`. Mọi thay đổi ghi audit.

### Web

- **Cài đặt → "Plan and usage"** (`components/PlanSection.tsx`):
  - tên gói;
  - thanh mức dùng cho vault, dung lượng và kết nối;
  - số bản lịch sử giữ cho mỗi note;
  - nút "Need more room? Contact us" (`mailto`).
- **Câu báo khi vượt hạn mức** (`lib/plan.ts` `planLimitText`, `components/PlanLimitNotice.tsx` có liên kết liên hệ) hiện ở:
  - trang Vault;
  - VaultSwitcher;
  - nhập vault;
  - tạo vault từ GitHub;
  - trình quản lý đính kèm;
  - Đồng bộ: kèm "See Settings → Plan and usage".
- **Nhập vault:** gặp `plan_limit` thì dừng phần đính kèm và ghi lý do "hết dung lượng", như trước đây với mã 413.
- **Thanh dung lượng của trình quản lý đính kèm:** tính cho cả tài khoản, có nhãn ghi rõ điều đó.

### Tài liệu

- **Tài liệu người dùng:**
  - `getting-started/account.md`: mục "Plan and usage" (bảng hạn mức gói Free);
  - sửa các chỗ còn ghi "500 MB mỗi vault" hoặc "50 snapshot": `attachments-and-trash.md`, `vaults.md`, `reference/file-types.md`, `sync/index.md`, `note-history.md`, `file-recovery.md`.
- **Tài liệu vận hành:** `docs/ops/trien-khai.md` mục 9 (cột, CLI, lưu ý dung lượng VPS).

## Kiểm chứng

- `npm run typecheck` sạch; `npx tsc --noEmit` trong `web/server` sạch; `npm test`: 508 test đạt.
- **Migration** đã áp vào DB dev. `plan.js list` hiện đúng 2 gói với số liệu đã chốt.
- **CLI (DB dev):**
  - `create`, `set` (cả giá trị sai, bị từ chối với mã thoát 2), `assign` (gõ email chữ HOA vẫn tìm đúng) đều chạy;
  - mọi thay đổi ghi audit.
- **Snapshot:** script tạm, đã dọn sau khi chạy. Gói thử giữ 3 bản lịch sử; sau 5 lần `snapshotBeforeOverwrite` còn **3**, sau 5 lần `captureSnapshots` cũng còn **3**.
- **E2E mới `e2e/tests/plans.spec.ts`** (4 test):
  - vault thứ 3 bị từ chối, trang Vault hiện câu báo và liên kết `mailto:`;
  - tải tệp 2000 byte vượt 1000 byte thì nhận 403 `plan_limit`;
  - tạo kết nối đồng bộ khi gói cho 0 thì nhận 403;
  - Cài đặt → Plan and usage hiện tên gói, "2 / 2" và "0 / 0".
- **E2E toàn bộ trên bản build production:** **ba lần liền 33/33**.
- **Ảnh chụp mục "Plan and usage":** tiếng Anh và tiếng Việt, bố cục đúng. Tên gói ("Free") lấy từ DB nên không dịch.

## Còn để sau

- Gán gói bằng giao diện: 5.4 (trang quản trị).
- **Dung lượng VPS:** kho Garage có khoảng 3 GB. Gói free cho 1 GB mỗi tài khoản, nên phải xem lại con số trước khi mở đăng ký rộng, hoặc chuyển máy chủ riêng ở Chặng 6.
- Thanh toán và trang giá: Chặng 6.
- Hạn mức cộng tác và AI: khi có tính năng.

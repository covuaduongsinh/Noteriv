# Phiên 4.8: Đọc và ghi offline, chống ghi đè khi lưu

> Ngày: 2026-10-18 · Chặng: [4](2026-10-17-chang-4-quoc-te-hoa-nguoi-moi.md) · Nhánh: `covuaduongsinh/chang4-offline` (tách từ `covuaduongsinh/chang4-pwa-done`, nên PR này mang theo commit tài liệu "4.7 đã lên production")

## Chủ dự án chốt

1. **Kiểm tra xung đột ở mọi lần lưu**, cả khi online. Riêng note đang cộng tác (collab) giữ như cũ.
2. **Offline chỉ đọc và sửa nội dung note đã lưu trên máy.** Tạo, đổi tên, xoá, cài đặt… báo cần mạng. Ghi nhanh tự lưu khi có mạng lại.
3. **Lưu trên máy các note đã mở gần đây**, tối đa 300 note / 25 MB, không tải cả vault.

## Trước phiên này

- Mất mạng thì trang vault đẩy về `/vaults`; cây file và note đều cần mạng.
- Lưu note là "ai lưu sau thắng". Hai tab hay hai máy cùng sửa thì mất chữ âm thầm.
- Bản sửa khi mất mạng chỉ nằm trong bộ nhớ tab; tải lại là mất.

## Đã làm

### Chống ghi đè (server)

- PATCH note nhận thêm `baseHash`: SHA-256 của nội dung mà bản sửa dựa vào (`web/server/src/lib/contentHash.ts`).
  - So **nội dung**, không so `updatedAt`. Mọi lần ghi trên server (đổi tên, chuyển thư mục, thùng rác, collab) đều đổi `updatedAt`, nên so nó sẽ báo xung đột giả.
- Nội dung trên server khác `baseHash` thì **không ghi đè**:
  - bản sửa thành note `Tên (conflict YYYY-MM-DD HHmm).md` cùng thư mục, dùng `conflictCopyPath` có sẵn của sync;
  - trả **409 `{ error: "stale", note, copy }`**, mã khác với `path_exists`;
  - ghi audit `note_conflict`.
- Không gửi `baseHash` thì như cũ: collab, plugin, ghi qua adapter, client cũ.

### Lưu có phiên bản (client, `web/src/app/vaults/[vaultId]/page.tsx`)

- Trang nhớ nội dung server đã xác nhận của mỗi note (`serverBaseRef`) và gửi hash của nó (`web/src/lib/content-hash.ts`, `crypto.subtle`).
- **Lưu tuần tự theo từng note**, để hai lần lưu chồng nhau không tự gây xung đột giả.
- Nội dung trùng bản server thì không gửi.
- **Gặp `stale`:**
  - tab nhận bản server;
  - bản sao mở bên cạnh, ConflictBanner của Chặng 3 hiện ra (so sánh, giữ bản gốc, dùng bản này, giữ cả hai);
  - thông báo "Note này vừa được sửa ở nơi khác. Không có gì bị ghi đè…";
  - chữ gõ thêm sau lần gửi cũng vào bản sao.

### Kho trên máy (`web/src/lib/offline-store.ts`, IndexedDB tự viết, không thêm thư viện)

- `kv`: danh sách vault, vault, cây file, tab đang mở, plugin cộng đồng theo vault, chủ sở hữu.
- `notes`: nội dung note đã mở hoặc lưu gần đây; bỏ note lâu nhất khi vượt 300 note / 25 MB (`pickEvictions`).
- `pending`: bản sửa chưa tới server, kèm nội dung gốc.
- **Chủ sở hữu:** đăng nhập hay đăng ký người khác thì xoá sạch. Đăng xuất hay xoá tài khoản cũng xoá sạch.
  - Còn bản sửa chưa gửi thì nút Đăng xuất báo trước, phải bấm lần nữa.
  - Mất mạng thì không đăng xuất được (phiên nằm trên server), có báo.
- Lỗi IndexedDB (chế độ riêng tư, hết chỗ) chỉ làm mất phần offline; app vẫn chạy như trước.

### Khi mất mạng

- Phân biệt lỗi mạng với lỗi server bằng `isNetworkError` (`web/src/lib/offline.ts`): fetch `TypeError`, hoặc proxy trả 502/503/504.
- **Trang vault:**
  - vault, cây file, tab đang mở và note đã mở lấy từ kho;
  - chỉ về `/vaults` khi máy chưa có bản nào;
  - có băng "Đang offline — hiển thị bản lưu trên máy…".
- **Note chưa có trên máy:** "Note này chưa được lưu trên máy; hãy mở nó một lần khi có mạng…".
- **Sửa khi mất mạng:**
  - bản sửa vào `pending`; thanh trạng thái hiện "Đã giữ trên máy" (vàng);
  - tải lại trang thì bản sửa hiện lại, đánh dấu chưa lưu;
  - lỗi server (không phải lỗi mạng) vẫn báo đỏ như 4.7.
- **Gửi lại** (`web/src/lib/offline-sync.ts`, `flushPending`):
  - trang vault gửi khi tải xong, khi có sự kiện `online`, và mỗi 15 giây;
  - `/vaults` gửi bản sửa của mọi vault khi tải;
  - mỗi bản sửa đi kèm `baseHash`, nên sửa offline mà trên server cũng có người sửa thì thành bản xung đột, không ghi đè.
- **Việc cần mạng** (tạo, đổi tên, xoá, cài đặt…): báo "Việc này cần có mạng…", không xếp hàng.
- **`/vaults` offline:** hiện danh sách lưu trên máy.
- **Ghi nhanh:** lưu thất bại vì mất mạng thì tự lưu khi có sự kiện `online`; bản nháp vẫn ở `localStorage`.
- **Service worker:** không đổi luật (vẫn không cache `/api`), chỉ cập nhật chú thích.

## Kiểm chứng

- `npm run typecheck`, `npx tsc --noEmit` (`web/server`): sạch.
- `npm test`: 300 + 117 + 86 = **503 test đạt**. Test mới `packages/ui/test/offline.test.ts`:
  - hash phía client và server bằng nhau, kể cả tiếng Việt và emoji;
  - `isNetworkError`, `staleNote`;
  - quy tắc bỏ note.
- **E2E 21/21 trên bản build production**, chạy 5 lần liền sau lần sửa cuối, đều đạt.
  - `core-flows`:
    - lưu khi mất mạng thì báo "Đã giữ trên máy", có mạng lại thì gửi;
    - **xung đột khi online:** máy khác sửa note, tab này gõ thì sinh bản sao, ConflictBanner hiện, tab gốc mang bản server.
  - `offline.spec.ts` (mới, tài khoản riêng):
    - mở vault và hai note khi online;
    - chặn `/api` rồi tải lại: thấy cây file, note đã mở và băng offline; note chưa mở thì báo cần mạng;
    - sửa, tải lại vẫn còn; bỏ chặn và phát `online` thì bản sửa lên server (kiểm qua API);
    - Ghi nhanh tự lưu khi có mạng lại.
- Thử bằng mắt (spec tạm, xoá sau khi chạy): bản xung đột và ConflictBanner (tiếng Việt), vault offline với "Đã giữ trên máy", `/vaults` offline, cảnh báo khi đăng xuất.
- JS tải đầu trang vault: **236,6 KB gzip** (4.7: 233,8; ngân sách ≤ 374).
- Desktop: **smoke chưa chạy ở phiên này.** Claude Code dừng bản build Tauri vì máy thiếu bộ nhớ, và chủ dự án chọn bỏ qua. Phiên này không đổi mã desktop, chỉ thêm khoá catalog; CI vẫn kiểm `desktop-frontend`.

## Ghi chú kỹ thuật

- **E2E offline** chặn `/api/**` bằng `context.route`, không dùng `setOffline`: HTML vẫn tải từ server, phần dữ liệu đi đúng đường offline của app. Phần SW đã có `pwa.spec.ts` (4.7).
- **Playwright `getByText` khớp chuỗi con, không phân biệt hoa thường.** "Kept on this device" từng khớp nhầm câu "…isn't kept on this device yet" nên test tải lại quá sớm. Dùng `{ exact: true }` cho chữ trạng thái.
- **Thanh trạng thái:** khi có sửa mới thì trở về "chưa lưu" cho tới lần lưu kế tiếp; báo lỗi cũ không còn đúng với bản sửa mới.
- Gõ rồi đóng hay tải lại trang trong vòng 0,8 giây (trước khi lưu tự động chạy) thì vẫn mất mấy chữ cuối, như trước phiên này.

## Còn để sau

- Tạo, đổi tên, xoá note khi offline: chủ dự án chốt chưa làm.
- Tải trước cả vault để đọc offline: chủ dự án chốt chưa làm.
- Collab không kiểm tra phiên bản: collab server ghi song song với client như trước.

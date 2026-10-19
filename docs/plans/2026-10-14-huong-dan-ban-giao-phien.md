# Hướng dẫn bàn giao: đọc trước khi bắt đầu một phiên làm việc mới

> Ngày lập: 2026-10-14. Dành cho **mọi phiên Claude mới** làm việc trên Noteriv web. Phiên mới không biết gì về các cuộc trò chuyện trước, nên file này tóm tắt những gì cần biết. **Không chứa secret.** Cập nhật file này khi hạ tầng hoặc quy tắc thay đổi.

## 1. Cách chủ dự án mở một phiên mới

Dán câu sau (đổi tên file chặng và số phiên):

> Đọc `docs/plans/2026-10-14-huong-dan-ban-giao-phien.md` và `docs/plans/2026-10-17-chang-5-nen-tang-thuong-mai.md`, rồi lập kế hoạch và triển khai **phiên 5.6 của Chặng 5 (pháp lý quốc tế)** (bản ghi phiên gần nhất `2026-10-19-phien-5-5-van-hanh.md`; tách nhánh từ `covuaduongsinh/chang5-ops-done`).

**Chặng 5 (từ 2026-10-19):** nền tảng thương mại. **5.1 xong, đã lên production** (PR #18, merge `4a03f9d`; bản ghi `2026-10-19-phien-5-1-email.md`; email còn tắt ở production cho tới khi chủ dự án có Resend): email tài khoản qua Resend (`web/server/src/lib/email/`, `emailTokens.ts`, `accountEmails.ts`), bật bằng `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` (rỗng = tắt, giao diện ẩn "Forgot password?"); xác minh email (`users.email_verified_at`, tài khoản cũ coi như đã xác minh), quên/đặt lại mật khẩu, đổi email (cần mật khẩu, xác nhận ở địa chỉ mới, báo địa chỉ cũ). Token chỉ lưu hash, dùng một lần, đi sau `#` trong liên kết. Dev/E2E: chạy API với `EMAIL_PROVIDER=file`, thư nằm ở `web/server/.email-outbox/`, `e2e/tests/account.spec.ts` đọc từ đó. Vận hành: `docs/ops/trien-khai.md` mục 8. **5.2 xong, đã lên production** (PR #19, merge `1118361`; bản ghi `2026-10-19-phien-5-2-mo-dang-ky.md`): Cloudflare Turnstile ở đăng ký và quên mật khẩu (`lib/turnstile.ts`, bật khi có đủ `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`, lỗi thì chặn; key thử luôn đạt `1x00000000000000000000AA` / `1x0000000000000000000000000000000AA`), tài khoản chưa xác minh bị chặn đồng bộ/GitHub, đính kèm, clipper, PDF (`lib/emailGate.ts`, chỉ khi email bật; 403 `email_unverified`), email lưu chữ thường (`emailField`). **Production vẫn `invite`** cho tới khi có Resend + Turnstile + xong 5.6 (điều kiện ở `docs/ops/trien-khai.md` mục 7). **5.3 xong, đã lên production** (PR #20, merge `8bd78c8`; bản ghi `2026-10-19-phien-5-3-goi-han-muc.md`; tài khoản chủ dự án đã ở gói `unlimited`): bảng `plans` + `users.plan_id` (mặc định `free`: 10 vault, 1 GB đính kèm cả tài khoản, 3 kết nối, 50 bản lịch sử; `unlimited` cho chủ dự án), hạn mức tính cho chủ workspace (`lib/plans.ts`), vượt thì 403 `plan_limit`; CLI `cli/plan.ts` (list/assign/set/create); Cài đặt → Plan and usage. E2E dùng `scripts/e2e-plan.ts` để đưa tài khoản test sang gói nhỏ. **5.4 xong, đã lên production** (PR #21, merge `dae66bb`; bản ghi `2026-10-19-phien-5-4-quan-tri.md`): admin = `users.role = admin` hoặc email trong `ADMIN_EMAILS` (`isAdmin`, đọc từ DB mỗi request); khoá tài khoản (`users.locked_at`) có hiệu lực ngay trong `plugins/auth.ts`, collab và web clipper; trang `/admin` (người dùng, gói, khoá, quyền, đặt lại mật khẩu, xác minh, xoá) và `/admin/audit`; `lib/accounts.ts` `deleteAccount` dùng chung. E2E dùng `scripts/e2e-admin.ts` để cấp quyền cho tài khoản test. **5.5 xong, đã lên production** (PR #22, merge `08d8e54`; bản ghi `2026-10-19-phien-5-5-van-hanh.md`; Sentry và link Status còn tắt cho tới khi chủ dự án gửi DSN và link): Sentry vùng EU cho web/API/worker/collab (`lib/sentry.ts`, `web/src/lib/error-reporting.ts`), bật bằng `SENTRY_DSN` (rỗng = tắt, trình duyệt không tải SDK); trình duyệt gửi qua tunnel `POST /api/v1/errors/browser`, chỉ chuyển tiếp đúng DSN; lọc email, token, `user:pass@` cả hai phía; `GET /api/v1/config` công khai (DSN, `STATUS_PAGE_URL`); bảng `user_activity_days` (ghi trong `issueSession`, giữ 400 ngày) và `/admin/stats`; link Status ở chân trang. Desktop chưa gửi lỗi. E2E: stub `e2e/sentry-stub.mjs` (cổng 4010), `e2e/tests/ops.spec.ts`. Vận hành: `docs/ops/trien-khai.md` mục 10, `docs/ops/giam-sat.md` mục 6–7 (chủ dự án tạo Sentry EU và status page UptimeRobot). Smoke desktop của 4.8/4.9 đã chạy bù ở đầu 5.1 (16/16 đạt).

**Chặng 4 (từ 2026-10-17):** quốc tế hoá, người mới, PWA. **4.1 xong, đã lên production** (PR #9, merge `79318bf`, 2026-10-18): hạ tầng i18n `packages/ui/src/i18n` (`t`, `useLocale`, catalog `locales/en.json` + `vi.json`), `api.i18n` cho core plugin (draft.10), test khoá catalog `packages/ui/test/i18n-catalog.test.ts`. **4.2 xong, đã lên production** (PR #10, merge `f206bac`; bản ghi `2026-10-18-phien-4-2-rut-chuoi-1.md`): 17 core plugin, tên plugin, panel còn lại và khung trang vault hai app đọc catalog; quy tắc `en` = chữ desktop, `vi` = chữ web, khoá `….web`/`….desktop` khi khác nghĩa. **4.3 xong, đã lên production** (PR #11, merge `51a7329`; bản ghi `2026-10-18-phien-4-3-cai-dat.md`): Cài đặt và PluginManager hai app. **4.4 xong, đã lên production** (PR #12, merge `c99d7b8`; bản ghi `2026-10-18-phien-4-4-hop-thoai.md`): các hộp thoại còn lại. **4.5 xong, đã lên production** (PR #13, merge `9dd0844`; bản ghi `2026-10-18-phien-4-5-ngon-ngu.md`): trang ngoài, pháp lý tiếng Anh trước, đổi mặc định, ô Language. **4.6 xong, đã lên production** (PR #14, merge `f3b5396`; bản ghi `2026-10-18-phien-4-6-nguoi-moi.md`): vault mẫu dùng chung `packages/core/src/sample-vault.ts` (web tạo khi đăng ký qua `import/notes` + `finalize`, desktop qua ô trong SetupWizard), trạng thái rỗng có gợi ý; E2E giờ có 11 bước và tài khoản mới có thêm vault "Getting started". **4.7 xong, đã lên production** (PR #15, merge `cc049a3`; bản ghi `2026-10-18-phien-4-7-pwa.md`): cài như app (manifest, icon, `web/public/sw.js` tự viết, không bao giờ cache `/api`), Ghi nhanh `/quick` (API `POST /vaults/:vid/quick-note`), `/install`, giao diện điện thoại dưới class `.web-vault` (≤ 600 px), báo khi lưu lỗi; E2E 16 bước, có `e2e/tests/pwa.spec.ts` (các test khác chặn SW). **Chủ dự án chốt tách đôi: 4.8 làm đọc/ghi offline (IndexedDB, hàng đợi, kiểm tra phiên bản khi lưu — hiện "ai lưu sau thắng"), tài liệu tiếng Anh thành 4.9.** Trước khi chạy E2E tại máy, kiểm cổng 4001 không còn API cũ (`TaskStop` không dừng tiến trình con của `tsx`). **4.8 xong, đã lên production** (PR #16, merge `6832ef5`; bản ghi `2026-10-18-phien-4-8-offline.md`): kho trên máy `web/src/lib/offline-store.ts` (IndexedDB), gửi lại `offline-sync.ts`; PATCH note nhận `baseHash` (SHA-256 nội dung gốc), khác thì server tạo bản "(conflict …)" và trả 409 `stale`. Lưu có phiên bản ở mọi lần lưu trừ collab. Ghi note qua adapter (plugin, "Dùng bản này") không gửi `baseHash`. E2E: `offline.spec.ts` chặn `/api/**` để giả lập mất mạng. **4.9 xong, đã lên production** (PR #17, merge `b059018`; bản ghi `2026-10-19-phien-4-9-tai-lieu.md`): tài liệu người dùng tiếng Anh viết lại cho web (`docs/index.md`, `docs/desktop.md` cho khác biệt của desktop); viết tài liệu thì đối chiếu với mã và dùng đúng chữ trong `en.json`. Bấm wiki-link trên web giờ mở/tạo note (`packages/ui/src/editor/link-click.ts`). **Chặng 4 xong.** **Chủ dự án chốt: rút chuỗi chia bốn phiên (4.2 khung trang, 4.3 Cài đặt và PluginManager, 4.4 các hộp thoại còn lại, 4.5 trang ngoài, pháp lý, rồi đổi mặc định); Người mới thành 4.6, PWA và giao diện điện thoại 4.7, tài liệu tiếng Anh 4.8. Từ 4.5 ngôn ngữ theo lựa chọn của người dùng (ô Language trong Cài đặt) → trình duyệt/hệ điều hành → tiếng Anh; người dùng cũ giữ ngôn ngữ đang thấy (web `vi`, desktop `en`)**; cờ dev `localStorage["noteriv.locale.dev"]` vẫn đè mọi thứ. Thứ tự chọn ở web có hai bản (`chooseLocale` và `LOCALE_BOOT_SCRIPT` trong `web/src/lib/i18n.ts`), sửa thì sửa cả hai. E2E chạy bằng tiếng Anh (`locale: "en-US"`). Chữ mới viết vào catalog, không viết cứng; mẫu: `packages/ui/src/panels/VaultSearch.tsx`, `packages/plugins/src/calendar` (`labelsFor` + `pluginT`), `web/src/components/StatusBar.tsx`. Playwright `getByTitle` khớp chuỗi con: thêm bản dịch có thể làm bộ chọn trúng hai nút, dùng `{ exact: true }`. Không gọi `t()` ở cấp module. Việc dời sang chặng này: giao diện điện thoại kỹ hơn ở 4.7, viết lại `docs/mobile` ở 4.8; nâng Prisma 7 là việc riêng.

**Chặng 3 (từ 2026-10-17, xong):** thứ tự đã đổi sau khi rà mã: sync mất dữ liệu và bảo mật làm trước. **3.1 xong** (PR #4): sync git web không còn xoá thùng rác hay commit ký hiệu xung đột; xung đột tạo note "(conflict …)"; có khoá `sync_locked_at`. Thử sync: `cd web/server && npx tsx scripts/test-sync-scenarios.ts` (cần tunnel 55432 + 59000). **3.2 + 3.3 xong** (PR #5): desktop git, WebDAV (trạng thái 3 chiều ở `sync_connections.sync_state`), đính kèm, cộng tác (giải phóng room, viewer chỉ đọc), khung so sánh xung đột (web + desktop), clip token kiểm lại quyền, `trustProxy` chỉ tin proxy nội bộ, desktop Next 16.4.1. Thử thêm: `npx tsx scripts/test-webdav-sync.ts`, `npx tsx scripts/test-collab.ts` (trong `web/server`), `cargo test --lib commands_git` (trong `desktop/src-tauri`). Còn treo: CSP desktop (3.7), nâng Prisma 7. **3.4 + 3.5 xong** (PR #6): test đầu-cuối `e2e/` (Playwright, `npm run e2e`, hướng dẫn ở `e2e/README.md`; CI có job `e2e`), sửa đổi tên note vừa tạo, Esc, audio, desktop auto-save, khôi phục tab nhanh. **Khi sửa giao diện web, chạy E2E trên bản build, không chỉ `next dev`**: `npm run build:web`, chép `web/public` và `web/.next/static` vào `web/.next/standalone/web/`, rồi chạy `node web/server.js` **từ trong** `web/.next/standalone` (như CI; chạy từ chỗ khác thì `/_next/static` trả 404 và trang không hydrate): lỗi định thời chỉ lộ ra ở bản build. **3.6 + 3.7 xong** (PR #7 và PR của 3.7): tìm kiếm `VaultSearch` dùng chung, panel plugin desktop, CSP desktop, danh sách kiểm thử `docs/qa/checklist.md`, smoke app Tauri thật `node e2e/desktop/smoke.mjs` (sau `npx tauri build --no-bundle` trong `desktop/`). **Migration chỉ thêm cột mà mã mới đọc ở mọi truy vấn của bảng đó: sao lưu tay, áp `migration.sql` bằng `psql -1` trước khi deploy, rồi `migrate resolve --applied`** (đã làm như vậy ở 3.1, xem bản ghi `2026-10-17-phien-3-1-chong-mat-du-lieu.md`).

**Chặng 2 xong (2026-10-17):** README tiếng Anh (sổ tay tiếng Việt ở `docs/dev/so-tay.md`), `/privacy` trung lập, email liên hệ tạm `covuaduongsinh@gmail.com`, `NOTICE.md` ghi hình quân của plugin mẫu chessboard, `phone/` đã xoá, cài đặt "cỡ bàn cờ" ẩn khỏi giao diện (khoá `pdfChessboardWidth` vẫn lưu và vẫn áp khi in). Bản ghi: `docs/plans/2026-10-17-phien-chang-2.md`.

**Chặng 1 xong (2026-10-17):** production chạy Giai đoạn 1–2 (merge `d15a810`, tag `v-core-plugins-2026-10-17`); `next` = `main`; nhánh cũ đã xoá (`feat/*` còn ở tag `archive/*`). **Mô hình nhánh từ nay:** `main` = production; `next` = staging, đưa về bằng `main` sau mỗi mốc; việc mới đi nhánh ngắn từ `main` tên `covuaduongsinh/<chặng>-<việc>`, thử bằng cách gộp vào `next`, rồi gộp vào `main` qua PR (CI chỉ chạy khi push `main` hoặc có PR). Phần cờ vua: worktree từ `main`, nhánh `covuaduongsinh/chess-<phiên>`. Các ghi chú "`next` = tái cấu trúc" ở mục 2 dưới đây là mô hình cũ. Kế tiếp có thể làm Chặng 2 và Chặng 3 đan xen.

**Định hướng mới (từ 2026-10-17):** lộ trình thương mại `docs/plans/2026-10-17-lo-trinh-thuong-mai.md` thay lộ trình "Chess PKM". Các chặng:

| Chặng | File kế hoạch |
|---|---|
| Tổng | `docs/plans/2026-10-17-lo-trinh-thuong-mai.md` |
| 1 Hợp nhất nhánh | `docs/plans/2026-10-17-chang-1-hop-nhat-nhanh.md` |
| 2 Định vị lại | `docs/plans/2026-10-17-chang-2-dinh-vi-lai.md` |
| 3 Rà soát, hoàn thiện | `docs/plans/2026-10-17-chang-3-ra-soat-hoan-thien.md` |
| 4 Quốc tế hoá, người mới | `docs/plans/2026-10-17-chang-4-quoc-te-hoa-nguoi-moi.md` |
| 5 Nền tảng thương mại | `docs/plans/2026-10-17-chang-5-nen-tang-thuong-mai.md` |
| 6 Thương hiệu, ra mắt | `docs/plans/2026-10-17-chang-6-thuong-hieu-ra-mat.md` |

Số phiên trong chặng viết kèm tên chặng (ví dụ "Chặng 3, phiên 3.5") để không lẫn với phiên của các giai đoạn cũ.

Lộ trình cũ (đã thay thế, giữ làm lịch sử; Giai đoạn 3 cũ là tài liệu cho **phiên bản cờ vua** làm sau):

| GĐ | File kế hoạch |
|---|---|
| Tổng | `docs/plans/2026-10-14-lo-trinh-noteriv-chess-pkm.md` |
| 0 | `docs/plans/2026-10-14-giai-doan-0-nen-mong-an-toan.md` |
| 1 | `docs/plans/2026-10-14-giai-doan-1-tach-repo-package-chung-plugin-api.md` |
| 2 | `docs/plans/2026-10-14-giai-doan-2-thu-gon-core-plugin.md` |
| 3 | `docs/plans/2026-10-14-giai-doan-3-co-vua-core-plugin.md` |
| 4 | `docs/plans/2026-10-14-giai-doan-4-tai-lieu-plugin-cli.md` |
| 5 | `docs/plans/2026-10-14-giai-doan-5-dong-bo-di-dong-chia-se.md` |
| 6 | `docs/plans/2026-10-14-giai-doan-6-ai-mcp-ra-mat.md` |

Lịch sử xây bản web: `docs/plans/2026-10-12-noteriv-web-version.md` và các file `docs/plans/2026-10-1x-*.md`.

**Giai đoạn 1 đã xong phần chính (1.1–1.5, ngày 2026-10-16).** 1.5 đã lên staging và thử đạt (chessboard + Core plugins trên web). Trước khi gộp `next` vào `main` (chủ dự án quyết định mốc): thử nốt phần chưa kiểm của 1.4 và 1.5 (danh sách trong `docs/plans/2026-10-16-phien-1-5-plugin-api.md`, mục "Chưa kiểm").

**Phiên 2.1 (đo đạc) xong ngày 2026-10-16:** baseline và ngân sách ở `docs/perf/2026-10-16-baseline.md`, ghi nhận ở `docs/plans/2026-10-16-phien-2-1-do-dac.md`. Danh sách core plugin giữ nguyên đề xuất; ngân sách −30% JS tải đầu.

**Phiên 2.2 (thí điểm Flashcards + KaTeX tải lười) xong ngày 2026-10-16:** ghi nhận ở `docs/plans/2026-10-16-phien-2-2-flashcards.md`. JS tải đầu web 533,9 → 457,8 KB gzip (ngân sách ≤ 374). Plugin API thêm `workspace.closeView`; view của plugin hiện dạng lớp phủ (`CorePluginViewOverlay`). Mẫu chuyển dữ liệu cũ của tính năng thành plugin: `docs/plugin-api/v1.md` mục 7. Kiểm desktop thật: cổng debug WebView2 (`WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9223`) + puppeteer-core, cách làm trong file 2.2.

**Phiên 2.3 (Lô A phần 1) xong ngày 2026-10-16:** ghi nhận ở `docs/plans/2026-10-16-phien-2-3-lo-a.md`. Calendar/Daily notes, Templates, Note composer, Vault insights là core plugin. JS tải đầu web 449,4 KB gzip. Plugin API thêm `vault.stats`; core plugin dùng được React (`reactView`); web tự tạo thư mục khi plugin tạo note. Chủ dự án chốt: Lô A chia hai (2.3 / 2.3b), **Clipper giữ trong lõi**. 2.3 đã lên staging và chủ dự án thử đạt (2026-10-16), staging đã tắt lại.

**Phiên 2.3b (Lô A phần 2) xong ngày 2026-10-16:** ghi nhận ở `docs/plans/2026-10-16-phien-2-3b-lo-a.md`. Lint (panel cột phải) và Audio recorder là core plugin. JS tải đầu web 446,8 KB gzip (ngân sách ≤ 374). Plugin API thêm panel bên (`CorePluginSidePanels`, `ui.toggleSidebarPanel`), `editor.setCursor`, `vault.saveAttachment`; sửa lỗi desktop lưu ghi âm thành chữ base64. Việc treo của giai đoạn (phát audio trong note, desktop tự lưu 30 giây…): mục "Việc treo" trong file Giai đoạn 2. Thử ghi âm tự động: Chrome/WebView2 với `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream`. 2.3b đã push (chưa lên `next`).

**Phiên 2.4 (Lô B phần 1) xong ngày 2026-10-16:** ghi nhận ở `docs/plans/2026-10-16-phien-2-4-lo-b.md`. Graph (web bỏ route `/graph`, thành lớp phủ như desktop), Slides, Note history + Time scrubber là core plugin; File Recovery giữ trong lõi. JS tải đầu web 444,8 KB gzip. Plugin API (draft.5) thêm `ui.addNoteToolbarButton`, đọc lịch sử note (`vault.versionSources/snapshots/gitLog…`), `markdown.renderReadOnly`; sửa phím plugin bị keymap của CodeMirror nuốt (Ctrl+G, Ctrl+D khi con trỏ ở editor). Thử web với snapshot: ghi thẳng một dòng `noteSnapshot` vào DB dev cho vault thử (job thật chạy 10 phút một lần ở sync-worker); thử git desktop: vault thử là repo git. Lưu ý khi dừng tác vụ nền `next start`/API/tunnel: tiến trình con có thể còn sống, kiểm cổng 3457/4001/55432 và tắt theo PID. 2.4 đã push (chưa lên `next`).

**Phiên 2.4b (Lô B phần 2) xong ngày 2026-10-16:** ghi nhận ở `docs/plans/2026-10-16-phien-2-4b-lo-b.md`. Board là core plugin (mặc định tắt) qua cơ chế mới **view theo loại file** (`ui.registerFileView`, `CorePluginFileView`): view thay editor trong tab, cả split pane, ghi qua bộ đệm của tab; chế độ source luôn là editor thô. Web nay nhận `.board.md` và có lệnh tạo board. JS tải đầu web 444,6 KB gzip. 2.4b đã push và lên `next`/staging (chủ dự án thử Lô A+B trên staging, đạt; staging đã tắt).

**Phiên 2.5 (Lô C phần 1) xong ngày 2026-10-16:** ghi nhận ở `docs/plans/2026-10-16-phien-2-5-lo-c.md`. Chủ dự án chốt: Lô C chia ba (2.5 Mermaid + Dataview; 2.5b Canvas + Drawing; 2.5c PDF viewer); **Math giữ trong lõi**. Mermaid (bật) và Dataview (tắt) là core plugin qua `registerCodeBlockProcessor` (bỏ `RESERVED_LANGUAGES`); quy ước `data-nrv-pending` cho khối vẽ bất đồng bộ và `preRenderCodeBlocks` (core) nên xuất PDF cả hai app có sơ đồ/bảng. Dependency `mermaid` chuyển sang `packages/plugins`. JS tải đầu web 442,8 KB gzip. Thử xuất PDF desktop tự động: hộp in của iframe làm treo puppeteer, phải vô hiệu `print` ngay khi iframe được gắn (xem bản ghi phiên). 2.5 đã push (chưa lên `next`).

**Phiên 2.5b (Lô C phần 2) xong ngày 2026-10-16:** ghi nhận ở `docs/plans/2026-10-16-phien-2-5b-lo-c.md`. Chủ dự án chốt: lấy bản web làm gốc, desktop Canvas/Drawing hiện trong tab và tự lưu (bỏ lớp phủ Drawing, nút Save/Close, Esc-lưu-đóng; ảnh chọn từ vault hoặc tải lên). Canvas và Drawing là core plugin (mặc định tắt) qua view theo loại file; desktop mở `.canvas`/`.drawing` thành tab văn bản; định dạng giữ nguyên theo nền tảng. API (draft.8) thêm `vault.resolve`, `listAttachments`, `attachmentUrl`; `VaultAdapter.fileExists?`. JS tải đầu web 442,2 KB gzip. Gặp `index.lock` treo của worktree (không có tiến trình git) sau một lệnh git: đã xoá sau khi kiểm. 2.5b đã push (chưa lên `next`).

**Phiên 2.5c (Lô C phần 3) xong ngày 2026-10-16:** ghi nhận ở `docs/plans/2026-10-16-phien-2-5c-lo-c.md`. **Lô C và toàn bộ việc chuyển tính năng thành plugin đã xong.** PDF viewer + chú thích là core plugin (mặc định bật) qua loại đóng góp mới **trình xem đính kèm** (`ui.registerAttachmentViewer`): desktop trong tab `pdf`, web ở lớp phủ khi bấm PDF trong Attachments. API (draft.9) thêm `vault.readAttachment`, `vault.get/setAttachmentData`. Chú thích cũ của hai nền tảng đọc được, dạng lưu giữ nguyên. JS tải đầu web 442,7 KB gzip (ngân sách ≤ 374, còn ~69 KB). Thử desktop: reload WebView ở chế độ portable đưa app về màn hình thiết lập; muốn đổi cấu hình plugin thì khởi động lại app thay vì reload. 2.5c đã lên `next`/staging; chủ dự án thử Lô C đạt; staging đã tắt.

**Phiên 2.6 (dọn dẹp, đo lại) xong ngày 2026-10-17: Giai đoạn 2 xong.**

- **Tài liệu**:
  - Bản ghi phiên: `docs/plans/2026-10-17-phien-2-6-don-dep.md`.
  - Báo cáo đo: `docs/perf/2026-10-17-after-phase2.md`.
  - Tổng kết Plugin API: `docs/plugin-api/v1.md` mục 9.
- **Chủ dự án chốt**: tải lười editor và các hộp thoại ít dùng, có tải trước khi rảnh; làm cả ba việc treo từ 2.1.
- **Kết quả, mọi ngân sách đạt**:
  - JS tải đầu web 194,7 KB gzip (baseline 533,9) và desktop 222,7 KB gzip (baseline 444,9).
  - Bộ cài NSIS 7,9 MB (trước 11,1).
  - `GET /vaults/:id` khi mở vault còn 1 lần, không còn `PUT` lặp.
- **Lưu ý cho mã mới**:
  - Đừng import editor (`@noteriv/ui/editor`) hay index của `@noteriv/ui/markdown` tĩnh trong trang vault web: cả hai kéo CodeMirror vào phần tải đầu. Kiểm bằng `npm run perf:web`.
  - Component tải lười cần hiện ngay thì xem `editorPart` (`next/dynamic` hoãn ~300 ms ở lần dựng đầu).
  - Cookie của API cục bộ hết hạn sau ~15 phút. Khi đo lâu, đăng nhập lại (script cookie trả 401 ở `auth/refresh`).
- **Việc treo còn lại**: mục "Việc treo" cuối file Giai đoạn 2.

**Phiên kế tiếp (đổi ngày 2026-10-17): Chặng 1 của lộ trình thương mại** (hợp nhất nhánh về `main`); hai câu hỏi "gộp `next` vào `main`" và "tách repo" dưới đây đã được trả lời: gộp ở Chặng 1, tách repo ở Chặng 6 (cùng lúc đổi tên). Đoạn sau giữ để tham khảo khi làm phiên bản cờ vua: ~~Giai đoạn 3 (cờ vua), bắt đầu bằng Phiên 3.0~~ (kiểm tra giấy phép và dựng `@noteriv/chess`). Dán: "Đọc `docs/plans/2026-10-14-huong-dan-ban-giao-phien.md` và `docs/plans/2026-10-14-giai-doan-3-co-vua-core-plugin.md`, rồi lập kế hoạch và triển khai **Phiên 3.0**." Đọc thêm `docs/plugin-api/v1.md` (mục 9: các loại đóng góp và thiếu sót còn mở, nhất là API mở rộng editor).

**Trước Giai đoạn 3, chủ dự án nên quyết định:**

1. Có gộp `next` vào `main` (đưa Giai đoạn 1–2 lên production) ở mốc này không.
2. Có xem lại việc tách repo không: mục 3 ghi "xem lại ở cuối Giai đoạn 2".

**Trạng thái nhánh**:

- `covuaduongsinh/phase1-core` có 1.1–1.5 và 2.1–2.6; 2.6 chưa push.
- `next` có 1.1–2.5c; chưa gộp vào `main`.
- Worktree Orca: `C:\Users\duongsinh\orca\workspaces\Noteriv\phase1-repo-cleanup` (đã có `web/server/.env` và `node_modules` của `web/server`).

**Việc chủ dự án còn nợ**:

- Dọn đĩa VPS (~84–90%).
- Thử nốt 1.4 trên staging (1.5 đã thử đạt).
- Quyết định sửa lỗi đổi tên note ở web (xem file 1.4).

**Trước khi làm một phiên:** kiểm bảng "Trạng thái" cuối file giai đoạn (phiên trước đã xong chưa) và mục "Điều kiện bắt đầu" ở đầu file.

## 2. Về chủ dự án và cách làm việc

- Chủ dự án **không chuyên IT**: giải thích bằng tiếng Việt dễ hiểu, đưa **khuyến nghị kèm lý do**, hỏi khi cần quyết định (dùng câu hỏi có lựa chọn).
- **Ngôn ngữ:** trả lời và tài liệu bằng tiếng Việt; code, tên file, commit message, PR bằng tiếng Anh.
- **Kế hoạch luôn lưu trong `docs/plans/`** (đặt tên `YYYY-MM-DD-<chủ-đề>.md`). Plan mode: chỉ đọc và viết file kế hoạch, **không chạy shell** (kể cả lệnh "chỉ kiểm tra").
- **Mô hình nhánh:** `main` = production (Dokploy tự deploy); `next` = tái cấu trúc (Giai đoạn 1 trở đi), bản staging deploy từ `next`. Sửa lỗi production: nhánh từ `main`, rồi **merge `main` vào `next`** (một chiều). Gộp `next` vào `main` chỉ ở mốc được chủ dự án duyệt. **Không bao giờ force-push `main`.**
- **Nơi làm việc từ Giai đoạn 1 (đã chốt 2026-10-15):** `D:\code\Noteriv` luôn ở **`main`** (production, dev server và các file chưa commit của chủ dự án). Việc Giai đoạn 1 làm trong **worktree riêng do Orca tạo** từ `origin/next`, nhánh `covuaduongsinh/phase1-<việc>` (Orca tự thêm tiền tố tài khoản). Một nhánh không thể được checkout ở hai thư mục, nên đừng để thư mục gốc đứng trên `next`. Mỗi worktree cần `npm install` và file `.env` riêng. Trong Orca, ô Project hiện `thejacedev/Noteriv` (kho upstream): **đừng mở PR hay đẩy nhánh lên upstream từ Orca**; việc push luôn tới `origin` và phải hỏi chủ dự án.
- **Hỏi trước khi push hoặc deploy.** Chủ dự án thường trả lời "push và deploy luôn" khi đồng ý. Mỗi lần push `next` làm staging tự build (7 phút, vài GB đĩa), nên gộp nhiều thay đổi vào ít lần push và tắt staging sau khi thử.
- **Giấy phép và ghi công:** `LICENSE` (MIT, © Jace + © Phùng Đức Tường), `NOTICE.md` (nguồn gốc fork, quy tắc ghi mã bên thứ ba **tại thời điểm nhập**; danh sách "Imported components" hiện trống). Theo dõi upstream: `docs/upstream-notes.md`, kiểm mỗi tháng (lần kế tiếp ~2026-11-15). Không đăng lại tệp nhị phân do upstream dựng (APK) thành sản phẩm của dự án này.
- **Không dán hoặc ghi secret** vào chat, tài liệu, commit. Khi đọc env Dokploy chỉ in **tên** biến.
- **Không đụng các file chưa commit của chủ dự án** (hiện có: `desktop/examples/plugins/chessboard/*`, `docs/plans/2026-10-12-chessboard-plugin-improvements.md`). Khi `git add`, liệt kê từng file, không dùng `git add -A` hay `git add docs`.
- **Kiểm chứng bằng chạy thật** (trình duyệt, API, chụp màn hình) trước khi báo "đã xong", và nói rõ phần nào chưa kiểm.
- Cuối mỗi phiên: cập nhật bảng **"Trạng thái"** trong file kế hoạch giai đoạn tương ứng.

## 3. Định hướng sản phẩm

**Từ 2026-10-17** (chi tiết: `docs/plans/2026-10-17-lo-trinh-thuong-mai.md` mục 2):

- Noteriv là **sản phẩm ghi chú tri thức chung, thương mại**, thị trường **quốc tế ngay** (tiếng Anh là mặc định, tiếng Việt là ngôn ngữ thứ hai). Chuỗi giao diện mới viết sao cho rút vào i18n được (Chặng 4).
- **Đổi tên và tách repo khỏi upstream trước khi ra mắt** (Chặng 6). Đến lúc đó vẫn dùng tên Noteriv.
- **Cờ vua là phiên bản chuyên ngành**: gói core plugin trong cùng repo, mặc định tắt ở bản chung, làm trong worktree riêng từ `main`, gộp về `main` theo mốc. Không đưa mã hay chữ riêng cho cờ vào lõi.
- Mô hình kinh doanh **chưa chốt**; Chặng 5 làm tầng gói + hạn mức trung lập.

Định hướng cũ (2026-10-14), phần còn hiệu lực là web chính + desktop cùng tính năng; phần "đối tượng cờ vua" đã thay:

- **Web là sản phẩm chính**; **desktop vẫn được duy trì với cùng tính năng** nhờ dùng chung mã (`packages/*` từ Giai đoạn 1). Mọi tính năng mới phải chạy trên cả hai.
- Đối tượng: **cộng đồng PKM cờ vua**. Tên: **Noteriv**.
- **Noteriv thay thế ChessNote** (`D:\code\chessnote`, fork SilverBullet). ChessNote đã ngừng chạy; chỉ chuyển **tính năng**, không có dữ liệu cần chuyển. Tài liệu thuật toán cờ: `D:\code\chessnote\docs\CHESS_MODULES.md` và `docs/modules/`. Kiểm tra giấy phép trước khi chép mã (xem mục 3 của lộ trình).
- Upstream `thejacedev/Noteriv` (remote `upstream`): **chỉ học ý tưởng**, không merge. **Chưa tách repo** (quyết định 2026-10-14); việc tách được xem lại ở cuối Giai đoạn 2.
- Thứ tự: 0 an toàn → 1 nền móng chung + Plugin API → 2 thu gọn thành core plugin → 3 cờ vua (core plugin) → 4 hệ sinh thái plugin → 5 đồng bộ/PWA/chia sẻ/lớp học → 6 AI/MCP/ra mắt.
- Mốc: tag `v-web-parity-2026-10-14` (commit `05f7318`).

## 4. Bản đồ mã nguồn

| Thư mục | Nội dung |
|---|---|
| `package.json`, `package-lock.json` (gốc) | **npm workspaces**: `packages/*`, `web`, `desktop`. `web/server` và `web/pdf-service` **không** nằm trong workspace (mỗi cái có lockfile và Docker build riêng). Cài ở **gốc repo**, không còn `npm install` riêng trong `web/` hay `desktop/` |
| `packages/core/` | `@noteriv/core`: logic TypeScript thuần dùng chung web + desktop (15 module từ 2026-10-15: frontmatter, toc, wiki-link, markdown-lint, board, dataview, calendar, drawing, canvas, bookmark, slide, sanitize-html, markdown-to-html, publish, markdown-code-block-registry). **Nạp theo mã nguồn** (`exports` trỏ `src/*.ts`, app import `@noteriv/core/<module>`, `transpilePackages`). Quy tắc: không import mã app, React, CodeMirror, Tauri; `test/core-boundaries.test.ts` ép điều này. Bảng kiểm kê: `docs/plans/2026-10-15-phien-1-2-kiem-ke-core.md` Từ Phiên 1.3 còn có interface `VaultAdapter` (`vault-adapter.ts`), `MemoryVaultAdapter`, `tag-utils`, `outline-utils`; bản web ở `web/src/lib/webVaultAdapter.ts`, bản desktop ở `desktop/src/lib/desktopVaultAdapter.ts`. Component mới nên nhận `adapter` thay vì gọi `webApi`/`electronAPI` trực tiếp. |
| `packages/ui/` | `@noteriv/ui`: React + CodeMirror dùng chung web + desktop (từ 2026-10-16): `markdown/` (renderer live preview), `editor/` (Editor, SourceEditor, ReadOnlyView, FormattingToolbar), `panels/` (Outline, Backlinks, Tags, Bookmarks, QuickOpen, CommandPalette), `graph/`, `styles/app.css`. Không import `@/…`, `webApi`, `electronAPI` (có test ranh giới). **Component mới dùng chung đặt ở đây**; thứ khác nhau giữa hai app được tiêm vào: `adapter` (VaultAdapter), `setLocalImageLoader`, `setDataviewSource`, `Editor.onImageDrop`, `labels`. Phần đăng ký nằm ở `web/src/lib/ui-hooks.ts`, `desktop/src/lib/ui-hooks.ts`. CSS chung ở `styles/app.css`; reset và `@source` ở `globals.css` của từng app. |
| `packages/plugin-api/` | `@noteriv/plugin-api` (từ 2026-10-16): **chỉ kiểu** của Plugin API v1 (`PluginApi`, `CorePlugin`, `PluginPermission`). Đặc tả: `docs/plugin-api/v1.md`. |
| `packages/plugins/` | `@noteriv/plugins`: **core plugin** (tầng tin cậy), mỗi plugin một thư mục `src/<id>/index.ts` với `export default { onload(api) }`. Sau Giai đoạn 2 có 17 plugin (danh sách và mặc định: `docs/plugin-api/v1.md` mục 9). Mỗi app khai danh sách ở `src/lib/core-plugins.ts` và **phải** nạp bằng `load: () => import(...)` (để tắt thì không vào bundle). Tính năng lớn chuyển thành core plugin ở Giai đoạn 2 đặt ở đây. |
| `packages/ui/src/plugins/` | Host core plugin (`createCorePluginHost`, `useCorePluginHost`, `CorePluginsSection`) và `sandbox/` (host plugin cộng đồng dùng chung web + desktop, `PluginMirror`). Trang sandbox gốc: `packages/ui/public/plugin-sandbox.html`; bản trong `web/public` và `desktop/public` là **bản sao** (`npm run sync:sandbox`, test báo lỗi khi lệch). |
| `web/` | Frontend Next.js 16 (App Router). **Đọc `web/AGENTS.md`**: Next 16 có thay đổi lớn, tra `node_modules/next/dist/docs/` trước khi viết code |
| `web/src/app/vaults/[vaultId]/page.tsx` | Trang chính (editor, panel, lệnh, modal) |
| `web/src/lib/` | `webApi.ts` (client REST), `pdf-export.ts`, `plugin-sandbox/usePluginHost.ts` (lớp bọc `webApi.plugins` quanh host sandbox chung), `core-plugins.ts`, `hotkeys.ts`, `markdown-to-html.ts` |
| `web/src/components/` | Ribbon, AppMenu, SettingsModal, PluginManager, DiagnosticsModal, PdfPreviewModal… |
| `desktop/src/lib/plugin-api.ts` | Từ 1.5 chỉ còn **kho** plugin cộng đồng (`DesktopPluginStore`: đọc/cài/gỡ, bật/tắt, quyền, settings trong `.noteriv/`); plugin chạy trong sandbox như web, không còn `new Function`. |
| `web/server/` | API Fastify + Prisma/PostgreSQL; `src/routes/*`, `src/lib/{gitSync,syncRunner,vaultFs,attachments,attachmentSync}.ts` |
| `web/server/src/sync-worker/` | Worker BullMQ (sync git/WebDAV) |
| `web/server/src/collab-server/` | Cộng tác thời gian thực (Yjs qua WebSocket) |
| `web/pdf-service/` | Dịch vụ nội bộ HTML → PDF (puppeteer-core + Chromium, tắt JS, chặn mạng, xác thực bằng token) |
| `web/infra/` | `docker-compose.prod.yml` (production), `docker-compose.dev.yml` |

## 5. Hạ tầng production

- **VPS** `217.15.160.118` (SSH alias sẵn, user `root`). **Dùng chung** với ERPNext và các dịch vụ khác, nên **mọi container phải có `mem_limit`**. Kiểm `df -h /` và `free -h` trước khi thêm dịch vụ (ngày 2026-10-14: đĩa 89%, RAM khoảng 7,9GB).
- **Dokploy** `https://dokploy.dsc.edu.vn`, composeId production `3tKquEXFX1KEN2EueeUGm`, file compose `web/infra/docker-compose.prod.yml`, nhánh `main`.
  - Push `main` thì tự deploy (5–8 phút). Xem trạng thái: `GET /api/deployment.allByCompose?composeId=…` với header `x-api-key`.
  - API key: đọc từ file cục bộ của chủ dự án `~/.config/noteriv/dokploy.key` (có từ 2026-10-15); nếu chưa có, hỏi chủ dự án. **Không ghi key vào file trong repo.**
  - Secret nằm trong env compose của Dokploy (`compose.one` để đọc, `compose.update` để sửa; khi in chỉ in tên biến).
- **Tên miền:** `https://noteriv.dsc.edu.vn` (Traefik của Dokploy định tuyến tới `noteriv-web` và `noteriv-collab`).
- **Container** (tiền tố `compose-parse-mobile-card-ue7dq8-`): `noteriv-web`, `noteriv-api`, `noteriv-worker`, `noteriv-collab`, `noteriv-pdf`, `noteriv-postgres`, `noteriv-redis`, `noteriv-garage`, `noteriv-backup` (từ 2026-10-15).
- **Sao lưu:** `noteriv-backup` chạy 02:00 mỗi đêm, mã hoá age, đẩy vào repo private `covuaduongsinh/noteriv-backups`; giám sát healthchecks.io. Runbook: `docs/ops/sao-luu-khoi-phuc.md`. Khoá age bí mật **chỉ chủ dự án giữ**. Các file khoá cục bộ của chủ dự án nằm ở `~/.config/noteriv/` (`dokploy.key`, `backup-age.key`, `backup-deploy-key`) — đọc từ file, không in giá trị. Tên service có tiền tố `noteriv-` là **bắt buộc** (tránh trùng DNS trên mạng `dokploy-network` dùng chung).
- **Staging** (từ 2026-10-15): compose Dokploy `klW9MC4cRpRHiPHMcMwIq` (`noteriv-staging`), nhánh **`next`**, `https://staging-noteriv.dsc.edu.vn` có basic-auth (user/mật khẩu trong `~/.config/noteriv/staging-basic-auth.txt`; middleware ở `/etc/dokploy/traefik/dynamic/noteriv-staging.yml` trên VPS). Tiền tố container `compose-generate-cross-platform-alarm-cdil47-`. **Mặc định tắt**, **không có sao lưu** (`BACKUP_REPLICAS=0`). Push `next` tự deploy nhờ webhook GitHub thứ hai. Chi tiết và quy trình: `docs/ops/trien-khai.md`.
- **Đăng ký và pháp lý** (từ 2026-10-15): đăng ký **chỉ bằng mã mời** (`REGISTRATION_MODE=invite`, giá trị lạ hoặc rỗng = đóng); `ADMIN_EMAILS` (production: `duongsinhchess@gmail.com`) quản lý mã tại `/admin/invites` (liên kết ở trang "Vault của bạn"). `/terms` và `/privacy` công khai; họ tên chủ thể vận hành đặt trong `web/src/lib/legal.ts` (`OPERATOR_NAME`; còn trống thì hiện nhãn Bản nháp). Quên mật khẩu **chưa có** tự phục vụ. **Migration thêm cột vào bảng `users`: áp migration TRƯỚC khi deploy mã mới** (xem `docs/ops/trien-khai.md` mục 7) vì mã mới đọc cột đó ở mọi truy vấn user. Sự cố và bí mật: `docs/ops/su-co.md`, `docs/ops/bi-mat.md`.
- **Giám sát** (từ 2026-10-15): `GET /api/v1/healthz` (công khai, DB + Redis, 200/503). UptimeRobot kiểm trang chủ và `/api/v1/healthz` mỗi 5 phút; healthchecks.io check `noteriv-host` nhận ping từ cron trên VPS (`/usr/local/bin/noteriv-check-host`, mỗi 10 phút, cấu hình `/etc/noteriv/check-host.env`, ngưỡng đĩa > 90% hoặc RAM khả dụng < 300MB). Chi tiết: `docs/ops/giam-sat.md`. Kho Docker trên VPS dùng containerd, `docker prune` thu được rất ít; đĩa phần lớn là image dự án khác (paperclip, ERPNext).
- **Migration Prisma chạy tay** sau deploy: `docker exec <container noteriv-api> npx prisma migrate deploy`.
- **Sau mỗi deploy** kiểm: `docker ps | grep noteriv`, trang chủ trả 200, menu Developer → Chẩn đoán (DB, Redis, git, S3, worker, dịch vụ PDF).

## 6. Chạy môi trường dev cục bộ (Windows)

1. Tunnel tới dịch vụ dev trên VPS: `ssh -N -L 55432:127.0.0.1:55432 -L 56379:127.0.0.1:56379 -L 59000:127.0.0.1:59000 217.15.160.118` (chạy nền).
2. API: trong `web/server`, chạy `npm run dev` (cổng 4001) và `npm run dev:worker`. Env ở `web/server/.env` (gitignored, đã có `PDF_SERVICE_URL=http://127.0.0.1:4003`, `PDF_SERVICE_TOKEN=devtoken`).
3. Web: **cài một lần ở gốc repo** (`npm install` ở thư mục gốc, hoặc `-w web -w @noteriv/core --include-workspace-root` cho nhanh), rồi trong `web` chạy `npx next dev -p 3457` (hoặc `npm run dev:web` từ gốc). Mở bằng **`http://localhost:3457`** (không dùng `127.0.0.1`, vì cookie).
4. Dịch vụ PDF (khi cần): `node web/pdf-service/src/index.mjs` với env `PDF_SERVICE_TOKEN=devtoken`, `PORT=4003`, `PDF_CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe`.
5. Dọn sau khi thử: tắt các tiến trình đã mở, xoá user và vault thử (qua API).

## 7. Kiểm thử

- Kiểu: `npm run typecheck` ở gốc (core, web, desktop) và `npx tsc --noEmit` trong `web/server/`; test logic và giao diện dùng chung: `npm test` ở gốc (Vitest, `packages/core`, `packages/ui`, `packages/plugins`; ui chạy dưới jsdom); build: `npm run build:web` (Next standalone) và `npm run build:desktop` (xuất tĩnh ra `desktop/out/`). Image web: `web/Dockerfile` build từ **gốc repo**; standalone lồng thư mục (`CMD node web/server.js`) vì `outputFileTracingRoot` là gốc repo. CI (`web-ci.yml`) cài bằng `npm install -w …` (không `npm ci`, vì lockfile sinh trên Windows) và có job riêng cho desktop UI.
- Sync: `web/server/scripts/test-sync-scenarios.ts` (và `test-s3-down.ts`).
- Giao diện: claude-in-chrome. Nếu click hoặc gõ không tác dụng, dùng `javascript_tool` để bắn sự kiện DOM (`.click()`, setter `value` + sự kiện `input`). Menu tự đóng giữa hai lệnh, nên mở menu và bấm mục trong **cùng một** lệnh JS.
- PDF: kiểm bằng PyMuPDF (`python -c "import fitz"` có sẵn) để dựng ảnh trang và xem font (`page.get_fonts()`).
- Hiệu năng (từ 2.1): `npm run perf:web` / `npm run perf:desktop` cho dung lượng JS theo tính năng (cần `next analyze --output` trước); vault thử 500 note: `scripts/perf/seed-vault.mjs`. Quy trình đo đầy đủ và số baseline: `docs/perf/2026-10-16-baseline.md`. Desktop đo ở chế độ portable (`portable.txt` cạnh exe) để không đụng cấu hình thật của chủ dự án. Máy có Rust 1.95, `tauri build` lần đầu mất ~14 phút.

## 8. Bài học đã trả giá (đừng lặp lại)

- **Gói `@tauri-apps/*` của desktop phải khớp phiên bản crate Rust trong `desktop/src-tauri/Cargo.lock`** (api 2.10.1, plugin-dialog 2.7.0, plugin-shell 2.3.5, plugin-updater 2.10.1, cli 2.10.1 đã được ghim đúng số). Gộp lockfile làm các gói này tự nhảy lên; nếu để vậy `tauri build` lỗi do lệch phiên bản.
- **`markdownToHTML` từng treo vô hạn** với mục danh sách rỗng (`"- "`, `"1. "`): mẫu mục đòi ít nhất một ký tự nên trình phân tích không tiến, vòng lặp chính quay lại đúng dòng đó. Đã sửa ở `core` và có test hồi quy. Test chạy mã đồng bộ không thể bị ngắt bằng `testTimeout`, nên các job CI có `timeout-minutes`.
- **`markdownToHTML` đã lọc URL nguy hiểm (sửa 2026-10-15, Phiên 1.3):** liên kết/ảnh có scheme mà `isSafeUrl` (`core/sanitize-html`) từ chối (`javascript:`, `vbscript:`, `data:` không phải ảnh) chỉ còn chữ (văn bản liên kết hoặc alt), không thành thẻ. Trước đó rủi ro nằm ở tệp HTML đã xuất bản (bấm liên kết `javascript:` từ ghi chú không tin cậy thì script chạy). Có test hồi quy.
- Docker build trên VPS thỉnh thoảng đứt mạng khi `npm install` (`ECONNRESET`, 2 lần ngày 2026-10-15). `web/Dockerfile` đã bật `NPM_CONFIG_FETCH_RETRIES` để tự thử lại; nếu build lỗi đúng kiểu này, chỉ cần deploy lại.
- Monitor chờ deploy bằng ngưỡng thời gian phải **sớm hơn** thời điểm push (đã nhầm hai lần); và nhớ phân biệt `done` với `error`.

- **Không đặt thư mục scratch của git sync bên trong một repo git** (từng commit nhầm vào repo Noteriv thật). `gitSync.ts` đã có `assertIsOwnRepoRoot`; đừng gỡ nó.
- Token git chỉ truyền qua `GIT_ASKPASS`, không đưa vào URL hay argv. Trên Windows dùng `-c core.autocrlf=false`.
- Tailwind v4: CSS reset phải nằm trong `@layer base`, nếu không utility padding và margin sẽ bị vô hiệu.
- Font PDF: Georgia không có glyph tiếng Việt dựng sẵn (dấu bị lệch); dùng Noto Serif, Liberation Serif, Times New Roman.
- Không restart Docker daemon trên VPS khi chưa hỏi (ảnh hưởng mọi dịch vụ khác).
- Next.js dev: StrictMode chạy effect 2 lần; effect khôi phục trạng thái cần cờ `cancelled`.
- **Phiên bản gói phụ thuộc vị trí file, không phụ thuộc app gọi.** Next phân giải import theo đường dẫn file; mã trong `packages/ui` dùng bản được hoist ở gốc. Khi hai app từng dùng hai phiên bản (mermaid 10 và 11, katex 0.19 và 0.16), phải khai phiên bản trong `packages/ui` và xoá khỏi app, rồi kiểm `npm ls`; không thì một app đổi phiên bản âm thầm. `web/Dockerfile` phải `COPY` cả `packages/ui/node_modules` (katex lồng) vào giai đoạn build.
- **Chỉ một bản `@codemirror/state` và `@codemirror/view`.** Hai bản gây lỗi "multiple instances" khó đoán; kiểm bằng `npm ls @codemirror/state @codemirror/view` sau mỗi lần đổi dependency.
- **Tailwind v4 chỉ quét class trong cây dự án của file CSS.** Class dùng trong `packages/ui` cần `@source "../../../packages/ui"` trong `globals.css` của app. Lệnh `* {margin:0;padding:0}` không bọc lớp thắng mọi tiện ích khoảng cách: web bọc trong `@layer base`, desktop giữ không bọc (UI desktop viết theo hành vi đó); đừng gộp hai khối này.
- **`.noteriv/plugin-config.json` (desktop) có nhiều chủ** (`enabled`, `settings`, `permissions` của plugin cộng đồng; `core`, `coreSettings` của core plugin). Mọi lần ghi phải đọc–sửa–ghi toàn bộ object; bản cũ của `PluginManager.loadConfig` chỉ giữ hai khoá nên làm mất khoá khác (sửa ở 1.5). Tương tự `vault.settings` trên web: luôn `{ ...current, key }`.
- **Thử UI desktop không cần Tauri:** phục vụ `desktop/out` bằng một máy chủ tĩnh và chèn `window.electronAPI` giả (Proxy: hàm `on*` trả hàm huỷ, hàm khác trả `null`) vào `<head>` của `index.html`. Cách này đã dùng ở 1.5 để thử plugin; harness nằm ngoài repo (scratchpad), dựng lại theo mô tả trong `docs/plans/2026-10-16-phien-1-5-plugin-api.md`.
- jsdom không có `iframe.sandbox` (DOMTokenList): dùng `setAttribute("sandbox", "allow-scripts")`, hành vi trong trình duyệt như nhau.
- **Heredoc trong công cụ Bash làm mất dấu `\` trong chuỗi regex** khi viết script sửa file; viết script bằng công cụ Write rồi chạy `node script.mjs`. File làm việc có CRLF: script sửa phải chuẩn hoá CRLF.

## 9. Việc còn treo từ trước (không thuộc Giai đoạn 0 nhưng cần nhớ)

- Chưa thử chọn hoặc tạo repo GitHub bằng token thật trong luồng "Tạo vault từ GitHub".
- Plugin chessboard bản web chưa được đăng lên `thejacedev/NoterivPlugins`. Có thể bỏ qua: Giai đoạn 3 thay nó bằng core plugin `chess-board`, và Giai đoạn 4 có kho plugin riêng.

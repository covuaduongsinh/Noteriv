# Prompt bàn giao — xử lý nốt các việc tồn đọng sau đợt full-parity Noteriv Web

> **Cách dùng file này:** đây là một prompt hoàn chỉnh, tự chứa (không giả định phiên đọc nó đã biết gì về cuộc trò chuyện trước) — dán toàn bộ nội dung bên dưới "## Bối cảnh" trở xuống làm tin nhắn đầu tiên cho một phiên Claude Code mới mở tại `D:\code\Noteriv`, hoặc giao cho 1 subagent/fork nếu đang chạy trong phiên đang có context. Phiên đó **có thể** tự động có thêm memory dự án (`project_noteriv_web_build.md`) nếu mở trong cùng thư mục — coi đó là tư liệu tham khảo bổ sung, không phải thay thế cho hướng dẫn cụ thể ở đây.

## Bối cảnh

Repo `D:\code\Noteriv` có nhiều platform song song (`desktop/`, `phone/`, `mcp/`...), trong đó `desktop/` (Tauri + Next.js, local-first, filesystem-based) và `web/` (Next.js 16 App Router server-mode + Fastify + Prisma/PostgreSQL backend, server-backed thật sự multi-user) là 2 bản liên quan trực tiếp ở đây. `web/` được xây từ đầu qua 7 phase (`docs/plans/2026-10-12-noteriv-web-version.md`), sau đó qua 1 đợt vá UI-parity (`docs/plans/2026-10-13-noteriv-web-ui-parity.md`), rồi qua **một đợt hoàn thiện lớn để đạt parity gần như toàn diện với desktop** (`docs/plans/2026-10-13-noteriv-web-full-parity.md` — đọc file này để biết chi tiết từng Phase A/B/C/D đã làm gì: A = tab/view-mode/frontmatter/status-bar/outline/tag-panel; B = sync UI/settings hợp nhất/command-palette; C = trash/templates/attachments(Garage)/bookmarks/hover-preview/hotkey/plugin-marketplace/vault-insights/note-composer; D = canvas/drawing/vim-mode/slide/image-lightbox/publish-preview/PDF-viewer+annotation/file-recovery+time-scrubber/note-history/audio-recorder). Toàn bộ đã deploy lên production thật tại `https://noteriv.dsc.edu.vn`, đã xác minh qua browser thật ở từng bước, không phải chỉ code review.

Trong lúc làm đợt đó, phát sinh 3 việc tồn đọng **chưa xử lý trong phạm vi đợt trước**, được giao lại ở đây (mục thứ 4, lỗi hiển thị làm tròn quota, đã được xử lý xong trước khi bàn giao file này — xem ghi chú ở cuối, không cần làm lại). Đọc kỹ từng mục trước khi bắt tay — mỗi mục có mức độ phức tạp khác nhau, không làm tắt.

### Hạ tầng (cần biết trước khi chạm vào bất cứ thứ gì production)

- **VPS**: `217.15.160.118`, SSH `root` (key mặc định đã cấu hình trong `~/.ssh/config` nếu phiên này chạy trên máy của chủ dự án; nếu là máy khác, cần hỏi lại). VPS này **không phải sandbox dùng-rồi-bỏ** — nó đang chạy production thật của chủ dự án: `chessnote`/`chessnote-sync`/`chessnote-ai` (business cờ vua của họ), một stack ERPNext đầy đủ, cộng Dokploy (PaaS) + Traefik (reverse proxy, routing qua Docker labels cho compose resource — xem thêm bên dưới). Đĩa **thường xuyên ở mức ~92% đầy** (13GB trống / 145GB) — luôn `df -h /` trước khi định tạo thêm bất cứ container/volume nào, và luôn đặt `mem_limit` bảo thủ cho mọi service mới.
- **Dev infra** (`web/infra/docker-compose.dev.yml`, chạy trực tiếp qua `docker compose up -d` trên VPS, KHÔNG qua Dokploy): Postgres (`noteriv-postgres`, cổng `127.0.0.1:55432`), Redis (`noteriv-redis`, cổng `127.0.0.1:56379`), Garage/S3-compatible object storage (`noteriv-garage`, cổng `127.0.0.1:59000`, config tại `/root/noteriv/infra/garage.toml` trên VPS — file này KHÔNG commit vào git, giống `.env.dev`/`.env`). Tất cả chỉ bind `127.0.0.1`, không public. Tunnel từ máy dev về VPS: `ssh -N -L 55432:127.0.0.1:55432 -L 56379:127.0.0.1:56379 -L 59000:127.0.0.1:59000 217.15.160.118`.
- **Production infra** (`web/infra/docker-compose.prod.yml`, deploy qua Dokploy — `sourceType: "git"`, clone trực tiếp từ `https://github.com/covuaduongsinh/Noteriv.git` nhánh `main`, không qua GitHub App). Tên service luôn prefix `noteriv-*` (bài học từ Phase 7: Dokploy dồn mọi project lên 1 `dokploy-network` overlay chung, tên service generic như `api`/`web` từng bị DNS collision với project khác). Secrets (POSTGRES_PASSWORD, JWT_*, ENCRYPTION_KEY, GARAGE_RPC_SECRET, GARAGE_ADMIN_TOKEN, ATTACHMENTS_S3_ACCESS_KEY_ID/_SECRET_ACCESS_KEY) chỉ sống trong Dokploy's compose-level env, không bao giờ commit vào git.
- **Dokploy API**: `https://dokploy.dsc.edu.vn/api/*`, header `x-api-key`, các endpoint dạng tRPC (`compose.one`, `compose.update`, `compose.deploy`, `compose.redeploy`, `deployment.allByCompose`). Compose resource của Noteriv production: `composeId: 3tKquEXFX1KEN2EueeUGm`. **Phiên này không có sẵn Dokploy API key** — nếu cần deploy ngay (không đợi webhook auto-deploy ~5 phút) hoặc cần sửa env/secrets, phải hỏi lại chủ dự án (họ đã cung cấp nhiều lần ở các phiên trước, không có nơi lưu bền vững nào cho key này trong dự án).
- **Auto-deploy đã bật**: một GitHub webhook post tới `POST /api/deploy/compose/<refreshToken>` mỗi khi push lên `main` — `git push origin main` là đủ để code lên production trong ~5 phút, không bắt buộc gọi `compose.deploy` thủ công (chỉ dùng khi muốn nhanh hơn/chắc chắn hơn webhook). Lưu ý phân biệt: `compose.deploy` luôn `git fetch` lại (dùng khi vừa push); `compose.redeploy` dùng clone đang có sẵn, không fetch lại (chỉ dùng khi chỉ đổi env, code không đổi).
- **Migration KHÔNG tự chạy khi production khởi động** (tránh nhiều replica cùng race chạy migration) — sau mỗi lần deploy có migration Prisma mới, phải chạy thủ công: `ssh 217.15.160.118 "docker exec <tên-container-api-thật> npx prisma migrate deploy"`. Tên container thật phải tra qua `docker ps | grep noteriv` trên VPS (Dokploy tự sinh tên dạng `<compose-slug>-noteriv-api-1`, không cố định, không đoán).

### Quy ước bắt buộc áp dụng cho MỌI thay đổi trong file này (đã đúc kết qua nhiều phase trước)

- Copy logic thuần từ `desktop/src/lib/*.ts` gần như nguyên văn khi áp dụng được; chỗ nào gọi `window.electronAPI.*` thay bằng `webApi.*` tương ứng (mở rộng `web/src/lib/webApi.ts` nếu cần).
- Bất kỳ file nào có side-effect DOM ở module scope (không phải trong function/effect) phải guard `typeof window !== "undefined"` — từng gây crash SSR thật (`ReferenceError: document is not defined`) vì module graph của Next.js server-mode được eval cả ở phía Node.js, khác hẳn static-export của desktop.
- **Không dùng** `window.prompt`/`window.confirm` — dùng form/state inline hoặc click-2-lần-xác-nhận (quy tắc cứng của dự án, không có ngoại lệ).
- Màu phụ thuộc theme phải dùng `var(--...)`, không hardcode hex — đây là lớp bug tái diễn nhiều lần nhất trong dự án (CalendarView/DataviewBlock/FlashcardReview từng dính ở Phase 6). **Luôn** test chuyển theme (vd Nord → Solarized Light → Nord) trước khi báo xong bất kỳ UI mới nào.
- `web/src/lib/webApi.ts`'s `request()` chỉ set `Content-Type: application/json` khi có body — từng có bug thật: mọi DELETE không-body bị Fastify 400 vì header JSON mà body rỗng, tồn tại từ Phase 1 tới khi bị phát hiện ở đợt UI-parity.
- Mọi migration Prisma mới: cột `content_tsv` sinh thủ công trên bảng `Note` (phục vụ full-text search từ Phase 2) hay gây lỗi `prisma migrate dev` tự động muốn xoá/tạo lại cột này — kiểm tra kỹ, nhiều phase gần đây phải viết migration SQL tay thay vì để Prisma tự generate.
- **Không bao giờ** đặt `SYNC_SCRATCH_DIR` hoặc bất kỳ thư mục scratch nào bên trong git working tree của chính repo Noteriv. Lý do lịch sử (đọc kỹ để không lặp lại): ở Phase 4, một bug tương tự đã khiến sync job chạy `git add -A`/`commit`/`push` nhầm lên **chính repo Noteriv thật** thay vì 1 working-copy cô lập, suýt mất toàn bộ source code chưa commit của nhiều phase liền trước — recover được nhưng rất sát. `ensureWorkingCopy()`/`gitSyncCore()` hiện có 2 lớp bảo vệ cứng (`hasOwnGitDir` check + `assertIsOwnRepoRoot()` canonical-path backstop) nhưng đừng dựa vào đó để chủ quan khi viết code mới đụng tới thư mục scratch.
- `web/server/src/lib/gitSync.ts`/`syncRunner.ts`/`vaultFs.ts` đã có lịch sử 3 bug thật (sự cố scratch-dir ở trên, cộng 2 bug mới sửa trong đợt vừa rồi: sync báo "success" giả khi push thất bại thật; checkout bị chặn khi remote đã có sẵn commit). Mọi thay đổi tương lai vào các file này cần test đủ 3 kịch bản: remote rỗng / remote đã có commit xung đột / nhiều vòng sync qua lại 2 chiều — không chỉ test happy-path.
- Môi trường dev: `web/` chạy `npm run dev` (cổng 3457, **luôn test qua `http://localhost:3457`, KHÔNG dùng `127.0.0.1`** — Next.js 16 chặn hydrate qua `127.0.0.1`, đã xác nhận nhiều lần là vấn đề môi trường chứ không phải bug code), `web/server/` chạy API + `npm run dev:worker` cho BullMQ nếu cần.
- **Xác minh bắt buộc qua browser thật** (claude-in-chrome, nhớ `ToolSearch` nạp tool trước khi gọi) trước khi báo bất kỳ mục nào "xong" — không chỉ đọc code hoặc chạy `tsc`. Ghi chú đã biết: `computer` tool click/type đôi khi không vào tới React tree của app này (lý do chưa xác định, không phải bug sản phẩm) — nếu gặp, dùng `javascript_tool` dispatch DOM event thật (`new MouseEvent('click', {bubbles:true})`, native-setter cho `<input>` qua `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set`) thay vì nghi ngờ app lỗi hoặc tốn thời gian vật lộn với lớp automation.
- **Không push lên git/production** cho tới khi xác minh xong hoàn toàn qua browser thật — chỉ commit local, nói rõ trạng thái git trong báo cáo, để người điều phối (người dùng hoặc phiên chính) xác nhận trước khi push. Nếu có migration Prisma mới, nói rõ để chạy `prisma migrate deploy` thủ công trên production sau khi push.
- Toàn bộ giao tiếp bằng văn xuôi (giải thích, báo cáo, câu hỏi) nên viết bằng tiếng Việt, khớp với toàn bộ tài liệu khác trong `docs/plans/` của dự án này — code/đường dẫn/tên biến giữ nguyên tiếng Anh như bình thường.

---

## Việc 1 — Plugin sandbox API hẹp hơn desktop, plugin cộng đồng chạy lỗi runtime

**Triệu chứng cụ thể:** cài plugin cộng đồng "Word Count" qua tab Community mới trong `PluginManager.tsx` (đợt trước vừa làm xong, repo `thejacedev/NoterivPlugins`) — cài thành công, hiện đúng trong danh sách, nhưng khi chạy báo lỗi trong console sandbox: `onLoad: text.trim is not a function`.

**Bối cảnh kỹ thuật:** plugin chạy trong iframe sandbox cô lập (`sandbox="allow-scripts"`, không có `allow-same-origin` — xem `public/plugin-sandbox.html`), mọi lời gọi `api.*` của plugin đi qua `postMessage` RPC được host phía parent xử lý ở `web/src/lib/plugin-sandbox/usePluginHost.ts` — file này có một allowlist `METHOD_PERMISSIONS` default-deny, chỉ permission nào được khai báo trong manifest plugin mới cho gọi. API bề mặt (`PluginAPI`) hiện **hẹp hơn** `desktop/src/lib/plugin-api.ts` một cách có chủ đích từ Phase 3 (lúc đó: thiếu `ui.addStatusBarItem`/`addSidebarPanel`/`addSettingsTab` vì plugin không có quyền truy cập DOM thật, cần thiết kế API khai báo (declarative) thay vì callback-nhận-DOM-node như desktop).

**Việc cần làm:**
1. Đọc plugin "Word Count" thật từ `thejacedev/NoterivPlugins` (hoặc tải về `main.js` của nó) để biết chính xác nó gọi API nào trong `onLoad` khiến `text.trim is not a function` — khả năng cao là một callback/event (vd `editor.onChange`, `vault.onNoteOpen`, hay tương tự) truyền tham số có shape khác với desktop's `PluginAPI` mong đợi (desktop truyền string, web có thể đang truyền object/event hoặc `undefined`).
2. Đối chiếu `desktop/src/lib/plugin-api.ts` (toàn bộ `PluginAPI` interface + cách mỗi callback được gọi với tham số gì) với `web/src/lib/plugin-sandbox/usePluginHost.ts` (và phía sandbox `public/plugin-sandbox.html` nếu RPC bridge có logic transform tham số ở đó) để tìm đúng chỗ lệch shape.
3. Sửa đúng chỗ lệch (không patch triệu chứng kiểu "thêm `?? ""` để né crash" nếu nguyên nhân gốc là API đang gọi sai tham số/shape — ưu tiên sửa cho đúng ngữ nghĩa desktop đã định nghĩa).
4. Nếu sau khi sửa vẫn còn thiếu hẳn 1 method nào đó mà plugin cần (không chỉ sai shape mà thực sự không tồn tại), đánh giá có nên bổ sung method đó vào `METHOD_PERMISSIONS` không — nếu cần thiết kế API khai báo mới (declarative) cho `ui.addStatusBarItem` (status bar đã có chỗ trống chờ sẵn từ Phase A, xem `web/src/components/StatusBar.tsx`), đây là việc tốn công hơn — có thể làm riêng, không bắt buộc trong đợt sửa lỗi này nếu plugin "Word Count" không thực sự cần `addStatusBarItem` để chạy được cơ bản.

**Xác minh:** cài lại plugin "Word Count" (hoặc plugin test tương tự `hello-world`/`evil-probe` cũ nếu cần tái tạo nhanh), xác nhận chạy không crash, chức năng cơ bản của nó hoạt động (hiện số từ ở đâu đó trong UI tuỳ theo thiết kế của chính plugin). Nếu phải thêm method mới vào sandbox API, viết 1 plugin test nhỏ gọi method đó để xác nhận hoạt động + xác nhận vẫn bị chặn đúng khi plugin không khai permission tương ứng (giữ nguyên default-deny đã kiểm chứng từ Phase 3).

---

## Việc 2 — Race condition giữa mở note qua URL và khôi phục workspace-state

**Triệu chứng:** nếu workspace-state đã lưu (từ Phase A, bảng `UserVaultState`) trỏ tới 1 note **đã bị xoá** (hard-delete trước Phase C, hoặc đã vào Trash sau Phase C), tải lại trang (cold load) có thể làm tab bị dọn về rỗng thay vì xử lý gọn gàng (báo lỗi rõ ràng hoặc tự động bỏ qua note đó khỏi danh sách tab khôi phục).

**File liên quan:** `web/src/app/vaults/[vaultId]/page.tsx` — tìm 2 effect: (a) effect đọc query param `?note=` để mở thẳng 1 note khi có link trực tiếp, (b) effect gọi `webApi.workspace.get()` (hay tên tương đương) để khôi phục `tabs[]`/`activeTabId`/`pinnedTabIds` đã lưu từ lần trước. Đọc kỹ thứ tự chạy của 2 effect này (dependency array, có `await` xen giữa không, có race nào giữa 2 request async không).

**Việc cần làm:**
1. Tái hiện lỗi trước: tạo 1 vault test, mở vài tab, để 1 trong các note đó bị xoá (qua Trash → xoá vĩnh viễn, hoặc trực tiếp xoá qua API), reload trang, quan sát hành vi thật.
2. Xác định chính xác race: effect nào set state trước, effect nào ghi đè, timing cụ thể ra sao (không đoán, log ra console tạm thời nếu cần để quan sát thứ tự chạy thật).
3. Sửa để khi 1 tab trong workspace-state đã khôi phục trỏ tới note không còn tồn tại (404 từ `webApi.notes.get`), hành vi đúng là: bỏ qua tab đó khỏi danh sách khôi phục (không giữ nguyên tab rỗng), các tab khác hợp lệ vẫn khôi phục bình thường, và nếu tất cả tab đều không còn hợp lệ thì về trạng thái "chưa mở note nào" một cách rõ ràng (không phải crash hay tab trống không rõ lý do).
4. Cân nhắc dọn luôn `UserVaultState` phía server khi phát hiện note đã xoá không còn trong tab list (tránh tích luỹ rác theo thời gian), nhưng không bắt buộc nếu tốn công — ưu tiên UX đúng trước.

**Xác minh:** lặp lại kịch bản tái hiện ở bước 1, xác nhận reload không còn race — tab note đã xoá tự động biến mất khỏi danh sách khôi phục, các tab khác (note/pin/view-mode) vẫn đúng như trước khi xoá.

---

## Việc 3 — Tự động hoá thiết lập cluster Garage trên production

**Bối cảnh:** `web/infra/docker-compose.prod.yml` đã có service `noteriv-garage` (+ init container `noteriv-garage-config` sinh file config từ biến môi trường Dokploy, vì image `dxflrs/garage` không có `/bin/sh`). Nhưng bước **khởi tạo cluster lần đầu** (gán layout, tạo bucket, tạo access key, cấp quyền) hiện làm **thủ công qua `docker exec`**, không nằm trong bất kỳ script nào trong repo — nếu volume `noteriv-prod-garagedata` từng bị xoá/tái tạo (vd migrate sang VPS khác, disaster recovery), người vận hành phải nhớ lại và gõ tay toàn bộ chuỗi lệnh sau theo đúng thứ tự:

```sh
# 1. Lấy node id
docker exec <garage-container> /garage -c /etc/garage-conf/garage.toml node id

# 2. Gán layout 1-node (thay <NODE_ID> bằng id lấy ở bước 1)
docker exec <garage-container> /garage -c /etc/garage-conf/garage.toml layout assign -z dc1 -c 1G <NODE_ID>
docker exec <garage-container> /garage -c /etc/garage-conf/garage.toml layout apply --version 1

# 3. Tạo bucket + key + cấp quyền
docker exec <garage-container> /garage -c /etc/garage-conf/garage.toml bucket create noteriv-attachments
docker exec <garage-container> /garage -c /etc/garage-conf/garage.toml key create noteriv-attachments-key
# lấy Key ID + Secret key từ output lệnh trên, rồi:
docker exec <garage-container> /garage -c /etc/garage-conf/garage.toml bucket allow --read --write --owner noteriv-attachments --key <KEY_ID>
# Key ID + Secret key cuối cùng phải được set vào Dokploy compose env:
# ATTACHMENTS_S3_ACCESS_KEY_ID=<KEY_ID>
# ATTACHMENTS_S3_SECRET_ACCESS_KEY=<SECRET>
```

**Việc cần làm:**
1. Viết 1 script idempotent (shell script hoặc Node script nhỏ, đặt tại `web/infra/garage-bootstrap.sh` hay tương tự) tự động hoá toàn bộ chuỗi trên: kiểm tra layout đã được gán chưa (qua `garage layout show`, nếu đã có node trong layout thì bỏ qua bước assign/apply), kiểm tra bucket `noteriv-attachments` đã tồn tại chưa (qua `garage bucket list`, bỏ qua bước create nếu đã có), kiểm tra key `noteriv-attachments-key` đã tồn tại chưa (qua `garage key list`). Chỉ in ra Key ID + Secret key **một lần duy nhất khi vừa tạo mới** (không in lại mỗi lần chạy — Garage không cho xem lại secret key sau khi tạo, đây là giới hạn của chính Garage, không phải thiếu sót của script).
2. Script này nên chạy được cả cho **dev** lẫn **production** (tham số hoá tên container/đường dẫn config nếu khác nhau giữa 2 môi trường — dev dùng container tên `noteriv-garage` chạy qua `docker-compose.dev.yml` trực tiếp trên VPS, production dùng tên do Dokploy tự sinh dạng `<compose-slug>-noteriv-garage-1`, có thể cần truyền tên container làm tham số thay vì hardcode).
3. Ghi lại cách dùng script này vào một đoạn comment trong `docker-compose.prod.yml` (gần service `noteriv-garage`) hoặc một file `README` nhỏ trong `web/infra/`, để người vận hành sau này (kể cả không phải AI) biết chạy script này sau lần deploy đầu tiên của 1 cluster Garage mới, thay vì phải đọc lại lịch sử chat/memory để nhớ chuỗi lệnh.

**Xác minh:** chạy thử script này nhắm vào Garage **dev** (không đụng production) — lần chạy đầu phải tạo mới layout/bucket/key đúng như chuỗi lệnh thủ công ở trên (có thể cần xoá sạch volume dev trước để test "từ đầu" thật sự, hoặc dựng 1 container Garage test hoàn toàn mới tách biệt khỏi dev stack đang dùng, để không ảnh hưởng dữ liệu attachment dev đang có); chạy lại lần 2 ngay sau đó, xác nhận idempotent — không tạo trùng bucket/key, không lỗi, thoát gọn với thông báo "đã tồn tại, bỏ qua".

**Không chạy script này nhắm vào production** trong lúc phát triển/test — production Garage đã có layout/bucket/key thật đang phục vụ dữ liệu thật, chỉ dùng script khi thực sự cần tái tạo từ đầu (và lúc đó không phải việc của phiên phát triển, mà là một thao tác vận hành cần người dùng xác nhận riêng).

---

## Việc 4 — ĐÃ XONG, không cần làm lại

~~Làm tròn hiển thị quota sai ở giá trị test phi thực tế~~ — đã sửa ngay khi bàn giao file này (commit `712f024`, đã push lên production): thêm `formatBytes()` trong `web/server/src/lib/attachments.ts` (adaptive B/KB/MB/GB, cùng công thức với `formatFileSize` phía client ở `web/src/lib/attachment-utils.ts`), dùng trong thông báo lỗi quota-exceeded thay cho `Math.round(bytes/1024/1024)` cũ. Đã verify logic qua `node -e` (100 byte → "100 B", 500MB mặc định → "500.0 MB") + `tsc --noEmit` sạch. Không cần động lại mục này.

---

## Sau khi xong cả 3 việc chính (Việc 1-3)

- Cập nhật phần "Known residual gaps" trong memory dự án (nếu phiên thực thi có quyền truy cập memory system và thấy file `project_noteriv_web_build.md` liên quan) — đánh dấu các mục đã giải quyết, không chỉ thêm mới.
- Push từng việc thành commit riêng (không gộp cả 3 vào 1 commit lớn, để dễ review/rollback từng phần), đẩy lên `main` sau khi xác minh xong từng việc, production sẽ tự deploy trong ~5 phút qua webhook đã cấu hình sẵn (không cần gọi Dokploy API thủ công trừ khi muốn deploy ngay không đợi webhook — nếu cần, phải xin lại Dokploy API key từ người dùng vì không có nơi lưu trữ bền vững nào cho key này trong dự án).

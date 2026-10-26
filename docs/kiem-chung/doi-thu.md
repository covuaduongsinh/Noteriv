# So sánh đối thủ

> Chặng K – Kiểm chứng ([kế hoạch](../plans/2026-10-20-chang-k-kiem-chung.md)). Tuần 2–4.
> **Quy tắc:** mọi số liệu (giá, số người dùng, tính năng) ghi **nguồn + ngày tra**. Giá đổi thường xuyên; không có nguồn thì ghi "chưa xác minh".

## 1. Danh sách đối thủ

| Nhóm | App | Vì sao so |
|---|---|---|
| 1. Markdown + liên kết + plugin (trực tiếp) | Obsidian, Logseq | Gần Noteriv nhất: Markdown, wiki-link, đồ thị, plugin |
| 2. Không gian làm việc SaaS | Notion, Craft | Mô hình thu phí theo gói, cộng tác mạnh |
| 3. Mã nguồn mở / tự host | AFFiNE, Anytype, SiYuan, Joplin | Cạnh tranh với lợi thế "tự host, dữ liệu của mình" |
| 4. Ghi chú phổ thông | Bear, Evernote, Apple Notes, Google Keep | Chuẩn về độ dễ dùng và giá người dùng quen |

## 2. Hồ sơ từng app (nghiên cứu bàn giấy)

Mỗi app một bảng theo mẫu:

```
### <Tên app>
| Mục | Nội dung | Nguồn (link) | Ngày tra |
|---|---|---|---|
| Nền tảng (web/Win/Mac/Linux/iOS/Android) | Windows, macOS (universal, v1.14.5), Linux (AppImage x86-64/ARM64, deb, Snap, Flatpak cộng đồng), Android (Google Play/APK v1.14.4), iOS. **Không có web app.** | https://obsidian.md/download | 2026-10-26 |
| Mô hình (SaaS / mở / tự host / kết hợp) | | | |
| Giấy phép mã nguồn | | | |
| Các gói và giá (USD/tháng, năm) | | | |
| Định dạng lưu (Markdown thuần? độc quyền?) | | | |
| Đồng bộ (dịch vụ riêng, Git, WebDAV, iCloud…) | | | |
| Offline | | | |
| Cộng tác thời gian thực | | | |
| Plugin / API | | | |
| AI tích hợp | Không có AI tích hợp trong lõi (trang chủ, About không nhắc AI); AI qua plugin cộng đồng. CEO Steph Ango phát hành "obsidian-skills" (MIT) để agent bên ngoài thao tác vault qua Obsidian CLI. | https://obsidian.md/ ; https://github.com/kepano/obsidian-skills | 2026-10-26 |
| Xuất dữ liệu | Ghi chú vốn là file Markdown thuần ("open file formats… never locked in"); có Export to PDF (chỉ desktop); định dạng khác qua plugin cộng đồng. | https://obsidian.md/ ; https://obsidian.md/help/pdf | 2026-10-26 |
| Quy mô cộng đồng (người dùng, sao GitHub, Reddit) | Obsidian không công bố số người dùng trên site. Repo obsidianmd/obsidian-releases: **22,6k sao**; kepano/obsidian-skills: **50,1k sao** (2026-10-26). r/ObsidianMD ~237k thành viên theo GummySearch (bên thứ ba, không ghi ngày). Con số "1 triệu" / "hơn 10 triệu" người dùng chỉ từ nguồn thứ cấp, mâu thuẫn → coi như chưa xác minh. | https://github.com/obsidianmd/obsidian-releases ; https://github.com/kepano/obsidian-skills ; https://gummysearch.com/r/ObsidianMD | 2026-10-26 |
| Điểm mạnh nổi bật | | | |
| Người dùng hay phàn nàn (Reddit, review) | 1) App di động khởi động chậm với vault lớn → https://forum.obsidian.md/t/obsidian-mobile-horrendously-slow/116787 ; https://forum.obsidian.md/t/obsidian-android-slow-startup-performance-and-misleading-startup-time-breakdown/95793<br>2) Trùng lặp/lỗi đồng bộ (Obsidian Sync trên iOS, iCloud) → https://forum.obsidian.md/t/obsidian-sync-incorrectly-duplicates-sections-of-files/94732 ; https://forum.obsidian.md/t/obsidian-sync-on-ios-iphone-creates-duplicate-folder-with-different-case/114242 (05/2026)<br>3) Không có cộng tác thời gian thực chính thức, phải dùng plugin như Relay → https://forum.obsidian.md/t/obsidian-sync-live-team-collaborative-editing/6058 ; https://forum.obsidian.md/t/multiplayer-team-comments-on-a-note/102674<br>4) Phí Sync bị cho là đắt (thread cũ, từ 2021) → https://forum.obsidian.md/t/about-pricing-aka-why-does-obsidian-service-x-cost-so-much-or-any-money-at-all/26329 | xem từng dòng | 2026-10-26 |
```

### Nhóm 1

### Obsidian
Bản đồ khoảng trống chi tiết: [obsidian-cong-khai.md](obsidian-cong-khai.md). Các ô còn "chưa xác minh" được điền ngày 2026-10-26.

| Mục | Nội dung | Nguồn (link) | Ngày tra |
|---|---|---|---|
| Nền tảng (web/Win/Mac/Linux/iOS/Android) | Win, Mac, Linux, iOS, Android. Không có app web | chưa xác minh | |
| Mô hình (SaaS / mở / tự host / kết hợp) | App miễn phí, chạy trên máy. Thu phí dịch vụ Sync và Publish | https://obsidian.md/pricing | 2026-10-22 |
| Giấy phép mã nguồn | Độc quyền. Cấm dịch ngược và cấm dùng để làm sản phẩm cạnh tranh. API plugin công khai theo MIT | https://obsidian.md/terms · https://github.com/obsidianmd/obsidian-api | 2026-10-22 |
| Các gói và giá (USD/tháng, năm) | App $0. Sync $4/tháng trả theo năm, $5 trả theo tháng. Publish $8/$10 mỗi site. Catalyst $25 một lần. Commercial $50/người/năm, tự nguyện | https://obsidian.md/pricing | 2026-10-22 |
| Định dạng lưu (Markdown thuần? độc quyền?) | Markdown thuần trên máy. Canvas theo chuẩn mở JSON Canvas. Bases lưu ở file `.base` riêng | https://obsidian.md/help/bases | 2026-10-22 |
| Đồng bộ (dịch vụ riêng, Git, WebDAV, iCloud…) | Obsidian Sync (mã hoá đầu-cuối, lịch sử phiên bản). Git/WebDAV chỉ qua plugin cộng đồng | https://obsidian.md/pricing | 2026-10-22 |
| Offline | Có (dữ liệu nằm trên máy) | https://obsidian.md/help/bases | 2026-10-22 |
| Cộng tác thời gian thực | Không. Sync có vault chia sẻ nhưng không sửa cùng lúc | https://obsidian.md/pricing (chỉ nêu "shared vault") | 2026-10-22 |
| Plugin / API | 29 core plugin. Kho plugin cộng đồng. API TypeScript công khai | https://obsidian.md/help/plugins | 2026-10-22 |
| AI tích hợp | Không có sẵn (chỉ qua plugin cộng đồng) | chưa xác minh | |
| Xuất dữ liệu | File là Markdown nên không cần xuất. Có xuất PDF | chưa xác minh | |
| Quy mô cộng đồng (người dùng, sao GitHub, Reddit) | chưa xác minh | | |
| Điểm mạnh nổi bật | Bases (bảng/thẻ/kanban/bản đồ trên thuộc tính), hệ sinh thái plugin lớn, dữ liệu là file của mình | https://obsidian.md/help/bases | 2026-10-22 |
| Người dùng hay phàn nàn (Reddit, review) | chưa xác minh | | |

### Logseq

Ghi chú phiên bản: từ ngày 24/04/2026 Logseq tách làm hai sản phẩm — **Logseq OG** (bản file, Markdown/Org; chỉ bảo trì, không thêm tính năng) và **Logseq (DB)** (bản cơ sở dữ liệu SQLite, bản 2.0.x đang beta, là hướng phát triển chính). Mỗi ô dưới đây ghi rõ là [OG], [DB] hay cả hai.

| Mục | Nội dung | Nguồn (link) | Ngày tra |
|---|---|---|---|
| Nền tảng (web/Win/Mac/Linux/iOS/Android) | [OG] Win/Mac/Linux + Android (bản 0.10.15, 01/12/2025) + iOS.<br>[DB] Desktop Win/Mac/Linux bản 2.0.2 beta (07/10/2026), web app tại app.logseq.com; app di động mới đang alpha (iOS TestFlight, Android). | https://github.com/logseq/logseq/releases ; https://github.com/logseq/logseq ; https://logseq.io/p/e3YDyX5AYr | 2026-10-26 |
| Mô hình (SaaS / mở / tự host / kết hợp) | Mã nguồn mở, local-first, miễn phí; [DB] có dịch vụ sync tuỳ chọn trên máy chủ Logseq (mã hoá đầu-cuối). | https://logseq.io/p/e3YDyX5AYr | 2026-10-26 |
| Giấy phép mã nguồn | AGPL-3.0 (repo chính, bản DB); bản OG chuyển sang repo github.com/logseq/og. | https://github.com/logseq/logseq ; https://logseq.io/p/e3YDyX5AYr | 2026-10-26 |
| Các gói và giá (USD/tháng, năm) | App miễn phí. Sync/RTC chưa có giá công khai chính thức; lời mời dùng thử đang gửi cho nhà tài trợ Open Collective **$15/tháng** (theo thông báo tách bản). Không có gói năm. | https://logseq.io/p/e3YDyX5AYr | 2026-10-26 |
| Định dạng lưu (Markdown thuần? độc quyền?) | [OG] File Markdown/Org-mode thuần trong thư mục.<br>[DB] SQLite (một file DB); có "Markdown Mirror" ghi bản sao Markdown một chiều (opt-in, chưa ghi ngược). | https://github.com/logseq/logseq ; https://discuss.logseq.com/t/whats-new-with-logseq-db-may-16th-2026/35020 | 2026-10-26 |
| Đồng bộ (dịch vụ riêng, Git, WebDAV, iCloud…) | [OG] Đồng bộ bằng thư mục (iCloud, Syncthing, Git… do người dùng tự lo) + Logseq Sync cũ (beta).<br>[DB] RTC sync riêng của Logseq, E2EE, đang beta/alpha cho nhà tài trợ. | https://logseq.io/p/e3YDyX5AYr ; https://discuss.logseq.com/t/logseq-sync-content-got-overwritten-when-edit-without-fully-synced/15041 | 2026-10-26 |
| Offline | Cả OG và DB đều chạy cục bộ, offline đầy đủ; sync là tuỳ chọn. | https://logseq.io/p/e3YDyX5AYr | 2026-10-26 |
| Cộng tác thời gian thực | [OG] Không có.<br>[DB] RTC (Real Time Collaboration) đang alpha, đăng ký qua form/Open Collective. | https://github.com/logseq/logseq | 2026-10-26 |
| Plugin / API | Có marketplace plugin + plugin API (bản DB 05/2026 thêm render block UI tuỳ biến); [DB] có CLI cho script/agent. | https://discuss.logseq.com/t/whats-new-with-logseq-db-may-16th-2026/35020 | 2026-10-26 |
| AI tích hợp | Không có AI tích hợp sẵn trong app; chỉ có CLI và "agent skill" (logseq-answer-machine) cho agent bên ngoài [DB]. | https://discuss.logseq.com/t/whats-new-with-logseq-db-may-16th-2026/35020 | 2026-10-26 |
| Xuất dữ liệu | [OG] Text, HTML, OPML, PNG, EDN, JSON, Markdown chuẩn (theo trang, block hoặc cả graph); không có PDF sẵn.<br>[DB] Markdown Mirror + công cụ import từ graph Markdown. | https://raw.githubusercontent.com/logseq/docs/master/pages/Export.md ; https://logseq.io/p/e3YDyX5AYr | 2026-10-26 |
| Quy mô cộng đồng (người dùng, sao GitHub, Reddit) | GitHub logseq/logseq: **45,4k sao** (2026-10-26). Số người dùng: chưa xác minh. Reddit r/logseq: chưa xác minh. | https://github.com/logseq/logseq | 2026-10-26 |
| Điểm mạnh nổi bật | Outliner theo block + journal hằng ngày, mã nguồn mở AGPL, local-first, miễn phí; bản OG là file Markdown thuần. | https://github.com/logseq/logseq | 2026-10-26 |
| Người dùng hay phàn nàn (Reddit, review) | 1) Lo ngại chuyển sang DB: SQLite khó đồng bộ, mất tính "file thuần", OG chỉ bảo trì → https://discuss.logseq.com/t/is-anyone-planning-to-use-og-version-indefinitely/35091 (07/2026)<br>2) Bản DB beta, cảnh báo có thể mất dữ liệu → https://github.com/logseq/logseq<br>3) Chậm khi graph lớn / trang dài → https://discuss.logseq.com/t/my-logseq-become-too-slow-recently/31985 (04/2025), https://discuss.logseq.com/t/logseq-performance-very-bad-as-graph-grows/22314<br>4) Mất/ghi đè dữ liệu khi sync qua iCloud (cũ, 2022–2023) → https://discuss.logseq.com/t/lost-2-hours-of-work-due-to-icloud-sync-issue-is-it-common/7451<br>5) Android thiếu PDF/plugin, Electron nặng → thread 35091 ở trên | xem từng dòng | 2026-10-26 |

### Nhóm 2
### Notion

| Mục | Nội dung | Nguồn (link) | Ngày tra |
|---|---|---|---|
| Nền tảng (web/Win/Mac/Linux/iOS/Android) | Web, Windows (x64/ARM64), macOS, iOS, Android. **Không có app Linux chính thức** (chỉ client cộng đồng). | https://www.notion.com/desktop ; https://itsfoss.com/installing-notion-linux/ | 2026-10-26 |
| Mô hình (SaaS / mở / tự host / kết hợp) | SaaS đóng, chỉ chạy trên đám mây của Notion; không tự host. | https://www.notion.com/pricing | 2026-10-26 |
| Giấy phép mã nguồn | Phần mềm độc quyền (closed source). | https://www.notion.com/pricing | 2026-10-26 |
| Các gói và giá (USD/tháng, năm) | Free $0 · Plus **$10**/thành viên/tháng · Business **$20**/thành viên/tháng · Enterprise liên hệ. Trang có nút "Pay monthly / Pay yearly", "tiết kiệm tới 20% khi trả năm" nhưng không ghi rõ $10/$20 là giá trả năm hay trả tháng. Custom Agents: $10 / 1.000 Notion credits/tháng. | https://www.notion.com/pricing | 2026-10-26 |
| Định dạng lưu (Markdown thuần? độc quyền?) | Định dạng block độc quyền lưu trên máy chủ Notion; chỉ có Markdown khi xuất. | https://www.notion.com/help/export-your-content | 2026-10-26 |
| Đồng bộ (dịch vụ riêng, Git, WebDAV, iCloud…) | Chỉ đồng bộ qua đám mây Notion; không Git/WebDAV/iCloud. | https://www.notion.com/pricing | 2026-10-26 |
| Offline | Có trên app desktop và di động: đánh dấu từng trang "Available offline"; database chỉ tải tự động 50 dòng đầu; tự tải trang gần đây/yêu thích chỉ ở Business/Enterprise. | https://www.notion.com/help/guides/working-offline-in-notion-everything-you-need-to-know | 2026-10-26 |
| Cộng tác thời gian thực | Có — chỉnh sửa đồng thời, chia sẻ, quyền, comment (thế mạnh cốt lõi). | https://www.notion.com/pricing | 2026-10-26 |
| Plugin / API | Không có hệ plugin trong app; có Public API + Webhooks và máy chủ MCP chính thức (hosted + bản mã nguồn mở). | https://www.notion.com/pricing ; https://developers.notion.com/docs/mcp | 2026-10-26 |
| AI tích hợp | Notion AI: Free/Plus chỉ dùng thử; Business trở lên có Notion Agent, AI Meeting Notes, Enterprise Search; Enterprise thêm zero data retention. | https://www.notion.com/pricing | 2026-10-26 |
| Xuất dữ liệu | Trang: PDF, HTML, Markdown; database: CSV (+ Markdown cho trang con). Cả workspace: HTML/Markdown/CSV (không PDF). Callout xuất thành HTML; chỉ xuất một view của database. | https://www.notion.com/help/export-your-content | 2026-10-26 |
| Quy mô cộng đồng (người dùng, sao GitHub, Reddit) | **100 triệu người dùng** — Notion tự công bố (blog "100 million of you", Ivan Zhao; các nguồn thứ cấp đặt mốc vào 2024). Reddit r/Notion: chưa xác minh. | https://www.notion.com/blog/100-million-of-you | 2026-10-26 |
| Điểm mạnh nổi bật | All-in-one: tài liệu + database + wiki nhóm + cộng tác thời gian thực + AI agent; hệ sinh thái template và tích hợp lớn. | https://www.notion.com/pricing | 2026-10-26 |
| Người dùng hay phàn nàn (Reddit, review) | 1) Chậm với workspace/database lớn → https://www.capterra.com/p/186596/Notion/reviews/ ; https://hackceleration.com/labs/review/notion<br>2) Offline hạn chế → https://www.capterra.com/p/186596/Notion/reviews/<br>3) AI bị dồn lên gói Business (bỏ add-on AI, 2025) → https://www.usecarly.com/blog/notion-ai-pricing-change/ ; https://coworker.ai/blog/notion-ai-pricing<br>4) Khoá dữ liệu: xuất mất quan hệ/view database → https://forum.obsidian.md/t/missing-notion-database-data-when-exporting-to-markdown-csv-or-html/37931<br>5) Không có app Linux → https://itsfoss.com/installing-notion-linux/ | xem từng dòng | 2026-10-26 |

### Craft

| Mục | Nội dung | Nguồn (link) | Ngày tra |
|---|---|---|---|
| Nền tảng (web/Win/Mac/Linux/iOS/Android) | macOS, iOS/iPadOS, Windows (x64, ARM64), Web (docs.craft.do), Android (ra Google Play 11/2025, đang phát triển tiếp). **Không có Linux.** | https://support.craft.do/en/introduction/platforms | 2026-10-26 |
| Mô hình (SaaS / mở / tự host / kết hợp) | SaaS đóng, lưu trên AWS; có tuỳ chọn "External Locations" giữ tài liệu trên máy (mất chia sẻ/cộng tác). Không tự host. | https://support.craft.do/en/account-and-subscription/data-and-security/data-storage | 2026-10-26 |
| Giấy phép mã nguồn | Độc quyền (closed source). | https://www.craft.do/ | 2026-10-26 |
| Các gói và giá (USD/tháng, năm) | Starter miễn phí (1.500 block, 1 GB) · Plus **$10/tháng hoặc $96/năm** · Family **$18/tháng hoặc $180/năm** (tối đa 5 người) · Team **$60/tháng hoặc $600/năm** (tối đa 10 người). Truy cập từ VN, trang giá hiển thị VND (Plus ₫124.917 / ₫99.933 mỗi tháng) — có giá theo vùng. | https://support.craft.do/en/account-and-subscription/subscription-plans/plans-and-pricing ; https://www.craft.do/pricing | 2026-10-26 |
| Định dạng lưu (Markdown thuần? độc quyền?) | Block độc quyền trên đám mây Craft (trang dữ liệu không mô tả định dạng); Markdown/TextBundle chỉ khi xuất. | https://support.craft.do/en/account-and-subscription/data-and-security/data-storage | 2026-10-26 |
| Đồng bộ (dịch vụ riêng, Git, WebDAV, iCloud…) | Đồng bộ qua máy chủ Craft (AWS); External Locations dựa vào dịch vụ bên thứ ba như iCloud Drive. Không Git/WebDAV. | https://support.craft.do/en/account-and-subscription/data-and-security/data-storage | 2026-10-26 |
| Offline | macOS/iOS: offline sẵn, đồng bộ nền. Web/Windows/Android: phải bật Offline Mode, chỉ tài liệu đã mở; offline không tạo tài liệu mới, không tìm kiếm, không AI. | https://support.craft.do/en/introduction/offline | 2026-10-26 |
| Cộng tác thời gian thực | Có (trang chủ ghi "Real-time Collaboration"); không gian chia sẻ cần gói Family/Team. | https://www.craft.do/ ; https://support.craft.do/en/account-and-subscription/subscription-plans/plans-and-pricing | 2026-10-26 |
| Plugin / API | Không có hệ plugin công khai; có Craft API (đọc/ghi tài liệu, task, collection) và MCP cho Claude, ChatGPT, Cursor… Giới hạn 100 request/phút. | https://support.craft.do/en/integrate/api ; https://www.craft.do/pricing | 2026-10-26 |
| AI tích hợp | Craft Assistant: Free 15 credit, Plus 50 credit/tháng; macOS/iOS cho dùng key riêng (OpenAI, Anthropic) hoặc mô hình chạy cục bộ. | https://support.craft.do/en/ai-assistant/bring-your-own-key ; https://support.craft.do/en/account-and-subscription/subscription-plans/plans-and-pricing | 2026-10-26 |
| Xuất dữ liệu | PDF, Word (.docx, không có trên Windows), Markdown, TextBundle; xuất hàng loạt chỉ Mac/iPad, xuất thư mục chỉ Mac. | https://support.craft.do/en/import-and-export/export | 2026-10-26 |
| Quy mô cộng đồng (người dùng, sao GitHub, Reddit) | Không công bố số người dùng. Trang chủ khai báo điểm 4,8 từ 25.000 lượt đánh giá (dữ liệu cấu trúc của craft.do). Reddit r/craftdocs: chưa xác minh. Không có repo GitHub chính. | https://www.craft.do/ | 2026-10-26 |
| Điểm mạnh nổi bật | Giao diện và tài liệu đẹp, app native (không Electron); giải Mac App of the Year, Apple Design Award; MCP/API sẵn cho AI agent. | https://www.craft.do/ | 2026-10-26 |
| Người dùng hay phàn nàn (Reddit, review) | 1) Thiếu/chậm hỗ trợ Android (đến 02/2026 vẫn beta) → https://www.androidauthority.com/google-docs-craft-3638766/ ; https://www.saner.ai/blogs/craft-review<br>2) Gói miễn phí bị giới hạn (1.500 block, dung lượng) → https://www.saner.ai/blogs/craft-review ; https://g2.com/products/craft-docs/reviews<br>3) Quản lý task/database cơ bản → https://www.techrepublic.com/article/craft-review/<br>4) Gói nhóm đắt → https://www.techrepublic.com/article/craft-review/ | xem từng dòng | 2026-10-26 |

### Nhóm 3
### AFFiNE

| Mục | Nội dung | Nguồn (link) | Ngày tra |
|---|---|---|---|
| Nền tảng (web/Win/Mac/Linux/iOS/Android) | Web (app.affine.pro), Windows 10+ (x64/ARM64), macOS 11+, Linux (AppImage, .deb, Flatpak), iOS, Android. | https://affine.pro/download | 2026-10-26 |
| Mô hình (SaaS / mở / tự host / kết hợp) | Kết hợp: local-first + AFFiNE Cloud (SaaS) + tự host.<br>Tự host server bằng Docker Compose (cần PostgreSQL, Redis): **miễn phí tới 10 seat/workspace**, chỉ hỗ trợ cộng đồng; Self Hosted Team $10/seat/tháng (năm) hoặc $12 (tháng); có "Installable License" offline qua sales. | https://affine.pro/self-host<br>https://affine.pro/pricing<br>https://docs.affine.pro/self-host-affine | 2026-10-26 |
| Giấy phép mã nguồn | Nhiều giấy phép: phần lớn repo (editor BlockSuite, client) MIT; `packages/backend` và `packages/common/native` theo **AFFiNE Enterprise Edition (EE) License** (dùng production cần subscription EE hợp lệ theo số seat; phần Community Edition và mã client biên dịch theo MPL 2.0). GitHub ghi "Other". | https://github.com/toeverything/AFFiNE/blob/canary/LICENSE<br>https://github.com/toeverything/AFFiNE/blob/canary/packages/backend/server/LICENSE | 2026-10-26 |
| Các gói và giá (USD/tháng, năm) | Free $0 (cloud 10 GB, 3 thành viên/workspace, lịch sử 7 ngày); Pro $6.75/tháng (thanh toán năm, 100 GB); Team $10/seat/tháng (năm); Believer $499.99 một lần (Pro trọn đời + 1 TB); Enterprise và Code License: liên hệ.<br>AI add-on: $8.9/tháng, thanh toán năm. | https://affine.pro/pricing<br>https://affine.pro/ai | 2026-10-26 |
| Định dạng lưu (Markdown thuần? độc quyền?) | Không phải Markdown thuần: dữ liệu là tài liệu CRDT (Yjs / y-octo), chỉ đọc được qua app hoặc xuất ra. | https://github.com/toeverything/AFFiNE/blob/canary/README.md | 2026-10-26 |
| Đồng bộ (dịch vụ riêng, Git, WebDAV, iCloud…) | Dịch vụ riêng (AFFiNE Cloud) hoặc server tự host; không có Git/WebDAV. Từ server 0.27 chỉ client ≥0.26 mới đồng bộ được. | https://github.com/toeverything/AFFiNE/blob/canary/README.md<br>https://blog.elest.io/affine-0-27-new-importers-calendar-view-and-a-sync-warning/ | 2026-10-26 |
| Offline | Có: local-first, workspace local không giới hạn; tài liệu sửa được khi offline và đồng bộ lại khi có mạng. | https://affine.pro/pagedoc<br>https://affine.pro/pricing | 2026-10-26 |
| Cộng tác thời gian thực | Có, qua cloud/server tự host ("real-time sync and collaborations on web and cross-platform clients"); Free tối đa 3 thành viên/workspace, Pro 10. | https://github.com/toeverything/AFFiNE/blob/canary/README.md<br>https://affine.pro/pricing | 2026-10-26 |
| Plugin / API | Chưa có hệ plugin công khai: README ghi "Plugin community and third-party blocks are coming soon". Không thấy API công khai được tài liệu hoá. | https://github.com/toeverything/AFFiNE/blob/canary/README.md | 2026-10-26 |
| AI tích hợp | Có AFFiNE AI: chat ở sidebar, viết/sửa văn bản, tạo mind map trên whiteboard, slide (Beta), "Make it Real" (Beta). 10 lượt dùng thử miễn phí; từ 0.27 có BYOK (thử nghiệm); tự host dùng key riêng. | https://affine.pro/ai<br>https://affine.pro/self-host | 2026-10-26 |
| Xuất dữ liệu | Xuất Markdown từng tài liệu (trang chính thức); PDF/PNG có từ bản 0.7. Chưa có xuất cả workspace ra Markdown (yêu cầu tính năng #14739); có lỗi xuất bảng/file lớn. Nhập: Notion, Obsidian, Bear, OneNote. | https://affine.pro/pagedoc<br>https://affine.pro/blog/affine-070-launch-week-day2<br>https://github.com/toeverything/AFFiNE/issues/14739<br>https://blog.elest.io/affine-0-27-new-importers-calendar-view-and-a-sync-warning/ | 2026-10-26 |
| Quy mô cộng đồng (người dùng, sao GitHub, Reddit) | 73.852 sao GitHub (toeverything/AFFiNE, tra ngày 2026-10-26). Số người dùng và số thành viên subreddit: chưa xác minh. | https://github.com/toeverything/AFFiNE | 2026-10-26 |
| Điểm mạnh nổi bật | Kết hợp tài liệu + whiteboard (edgeless) trong một app, local-first, tự host miễn phí tới 10 seat, AI tích hợp sẵn, cộng đồng GitHub rất lớn. | https://affine.pro/self-host<br>https://affine.pro/ai<br>https://github.com/toeverything/AFFiNE | 2026-10-26 |
| Người dùng hay phàn nàn (Reddit, review) | 1) Đồng bộ lỗi im lặng, mất dữ liệu: #14846, #15497.<br>2) App mobile khó đăng nhập server tự host: #15169, #15438.<br>3) Chậm/lag với tài liệu lớn, edgeless: #15200, #14333.<br>4) Xuất Markdown chưa ổn (bảng, file lớn, không xuất hàng loạt): #14860, #13803.<br>(Không tra được Reddit trực tiếp; nguồn là GitHub Issues.) | https://github.com/toeverything/AFFiNE/issues/14846<br>https://github.com/toeverything/AFFiNE/issues/15169<br>https://github.com/toeverything/AFFiNE/issues/15200<br>https://github.com/toeverything/AFFiNE/issues/14860 | 2026-10-26 |

### Anytype

| Mục | Nội dung | Nguồn (link) | Ngày tra |
|---|---|---|---|
| Nền tảng (web/Win/Mac/Linux/iOS/Android) | macOS, Windows, Linux, iOS, Android. Không có app web để soạn thảo (chỉ có "Publish" trang ra web). | https://doc.anytype.io/anytype/sitemap.md<br>https://doc.anytype.io/anytype/collaborate/publish.md | 2026-10-26 |
| Mô hình (SaaS / mở / tự host / kết hợp) | Kết hợp: local-first, mã hoá đầu-cuối, đồng bộ qua Anytype Network (có backup node) hoặc chế độ Local-only (P2P mạng LAN, thử nghiệm).<br>Tự host mạng đồng bộ được: dùng `any-sync-dockercompose` (giao thức any-sync, **MIT**), nạp file cấu hình `.yml` vào client; người tự host tự quản giới hạn Viewer/Editor; không thấy phí. | https://doc.anytype.io/anytype/data/sync-and-backup/self-host.md<br>https://github.com/anyproto/any-sync<br>https://doc.anytype.io/anytype/resources/memberships.md | 2026-10-26 |
| Giấy phép mã nguồn | Client (anytype-ts): **Any Source Available License 1.0** — chỉ cho dùng phi thương mại, hoặc thương mại trong các "Allowed Networks" do Any Association cho phép; không phải OSI. Giao thức any-sync: MIT. | https://github.com/anyproto/anytype-ts/blob/main/LICENSE.md<br>https://github.com/anyproto/any-sync | 2026-10-26 |
| Các gói và giá (USD/tháng, năm) | Free (100 MB lưu trữ remote, 10 shared channel); Plus $4/tháng (1 GB); Pro $8/tháng (10 GB); Ultra $16/tháng (100 GB). Trang có nút Monthly/Yearly, Yearly ghi "-20%"; không rõ $4/$8/$16 là giá tháng hay giá năm quy đổi. Desktop tính USD quy đổi qua Stripe; mobile theo giá App Store/Play Store địa phương. Giảm 50% cho sinh viên/giáo viên. | https://anytype.io/pricing<br>https://doc.anytype.io/anytype/resources/memberships.md | 2026-10-26 |
| Định dạng lưu (Markdown thuần? độc quyền?) | Độc quyền: object/relation trên giao thức any-sync, mã hoá trên thiết bị; không phải file Markdown. | https://doc.anytype.io/anytype/llms-full.txt | 2026-10-26 |
| Đồng bộ (dịch vụ riêng, Git, WebDAV, iCloud…) | Dịch vụ riêng (Anytype Network, E2EE), mạng tự host, hoặc Local-only P2P. Docs cảnh báo không dùng ổ mạng/dịch vụ đồng bộ bên thứ ba. Không có Git/WebDAV. | https://doc.anytype.io/anytype/data/sync-and-backup/local-only.md | 2026-10-26 |
| Offline | Có, offline đầy đủ (local-first); thay đổi đồng bộ khi có mạng. | https://doc.anytype.io/anytype/data/sync-and-backup/local-only.md | 2026-10-26 |
| Cộng tác thời gian thực | Có trong Shared Channel: "other members will see the change in real-time"; vai trò Viewer/Editor/Admin/Owner; số Editor bị giới hạn theo gói của Owner. Có chat trong space. | https://doc.anytype.io/anytype/collaborate/collaboration.md | 2026-10-26 |
| Plugin / API | Không có hệ plugin. Có Local API (từ desktop 0.46, chạy localhost, offline, API key) để tạo/sửa/truy vấn object; MCP server do cộng đồng làm. | https://doc.anytype.io/anytype/features/integrations/local-api.md | 2026-10-26 |
| AI tích hợp | Không có AI tích hợp sẵn; có "Anytype Agents' Skill" (mã nguồn mở) cho agent bên ngoài (Claude Code, Cursor…) truy cập dữ liệu qua Local API. | https://doc.anytype.io/anytype/features/integrations/anytype-agents-skill.md | 2026-10-26 |
| Xuất dữ liệu | Markdown, Any-Block, PDF, HTML; định dạng file JSON hoặc Protobuf. Nhập chỉ trên desktop. | https://doc.anytype.io/anytype/data/import-and-export.md | 2026-10-26 |
| Quy mô cộng đồng (người dùng, sao GitHub, Reddit) | 9.003 sao GitHub (anyproto/anytype-ts) và 1.747 sao (anyproto/any-sync), tra ngày 2026-10-26. Có diễn đàn community.anytype.io. Số người dùng và số thành viên subreddit: chưa xác minh. | https://github.com/anyproto/anytype-ts<br>https://github.com/anyproto/any-sync | 2026-10-26 |
| Điểm mạnh nổi bật | Mã hoá đầu-cuối, local-first, tự host mạng đồng bộ miễn phí, mô hình object/relation linh hoạt kiểu Notion, đủ app desktop + mobile. | https://doc.anytype.io/anytype/llms-full.txt<br>https://doc.anytype.io/anytype/data/sync-and-backup/self-host.md | 2026-10-26 |
| Người dùng hay phàn nàn (Reddit, review) | 1) Xuất Markdown thiếu (mất relation/property, tên link): thread 22823.<br>2) Xuất space bị treo, không ra file (02/2026): thread 30191.<br>3) Mất dữ liệu sau cập nhật/đồng bộ: thread 27401.<br>4) Chậm dần qua các phiên bản: tag Performance.<br>(Không tra được Reddit trực tiếp; nguồn là diễn đàn chính thức.) | https://community.anytype.io/t/how-is-the-state-of-the-markdown-exportation-concern-about-future-proof/22823<br>https://community.anytype.io/t/export-space-sucks/30191<br>https://community.anytype.io/t/please-rally-to-prevent-users-from-losing-data-in-anytype/27401<br>https://community.anytype.io/tag/Performance | 2026-10-26 |

### SiYuan

| Mục | Nội dung | Nguồn (link) | Ngày tra |
|---|---|---|---|
| Nền tảng (web/Win/Mac/Linux/iOS/Android) | Desktop (Windows, macOS, Linux), iOS, Android (cả F-Droid), HarmonyOS; bản web qua Docker/Kubernetes tự host (chỉ dùng trên trình duyệt). | https://github.com/siyuan-note/siyuan | 2026-10-26 |
| Mô hình (SaaS / mở / tự host / kết hợp) | Kết hợp: app local-first mã mở, miễn phí cơ bản; đồng bộ đám mây chính chủ là dịch vụ trả phí.<br>Tự host: không có "sync server" riêng để tự host; tự host = chạy bản Docker (giao diện web, không cho app desktop/mobile kết nối), hoặc trỏ đồng bộ sang S3/WebDAV của mình (cần gói PRO/Subscription). | https://github.com/siyuan-note/siyuan ; https://b3log.org/siyuan/en/pricing.html | 2026-10-26 |
| Giấy phép mã nguồn | AGPL-3.0 (repo chính, kể cả bản Docker tự host). Đồng bộ S3/WebDAV là tính năng trả phí trong app, không phải phần mềm server riêng. | https://github.com/siyuan-note/siyuan | 2026-10-26 |
| Các gói và giá (USD/tháng, năm) | Free: $0.<br>PRO Features: $64 trả một lần (giá gốc ghi $96) — mở S3/WebDAV, không kèm dung lượng.<br>Subscription: $148 (giá gốc $296), kèm 8GB cloud chính chủ, asset hosting, Cloud Inbox. Trang ghi "$", không ghi mã tiền tệ. | https://b3log.org/siyuan/en/pricing.html | 2026-10-26 |
| Định dạng lưu (Markdown thuần? độc quyền?) | Độc quyền: mỗi tài liệu là file `.sy`, dữ liệu dạng JSON (không phải Markdown thuần). | https://github.com/siyuan-note/siyuan | 2026-10-26 |
| Đồng bộ (dịch vụ riêng, Git, WebDAV, iCloud…) | Cloud chính chủ (trả phí, tối đa 8GB) hoặc S3/WebDAV bên thứ ba (trả phí); đồng bộ tăng dần, mã hoá đầu-cuối. README cảnh báo không đồng bộ qua ổ đồng bộ bên thứ ba (Dropbox kiểu thư mục) vì có thể hỏng dữ liệu. | https://b3log.org/siyuan/en/ ; https://github.com/siyuan-note/siyuan ; https://b3log.org/siyuan/en/pricing.html | 2026-10-26 |
| Offline | Có: dữ liệu nằm trên máy, dùng được khi không có mạng hoặc cloud sập. | https://b3log.org/siyuan/en/ | 2026-10-26 |
| Cộng tác thời gian thực | Không có cộng tác nhiều người thời gian thực; README Kubernetes ghi "One workspace, one writer". Trang chủ chỉ nói nhiều người có thể dùng chung server Docker có khoá mật khẩu. | https://github.com/siyuan-note/siyuan ; https://b3log.org/siyuan/en/ | 2026-10-26 |
| Plugin / API | Có Plugin API (repo petal), API kernel có tài liệu, JS/CSS snippet, chợ plugin/theme cộng đồng. | https://github.com/siyuan-note/siyuan | 2026-10-26 |
| AI tích hợp | Có: viết và hỏi đáp qua OpenAI API (người dùng tự cấp key), OCR Tesseract; README nhắc hỗ trợ MCP/CLI cho agent. | https://github.com/siyuan-note/siyuan ; https://b3log.org/siyuan/en/ | 2026-10-26 |
| Xuất dữ liệu | Markdown chuẩn kèm asset, PDF, Word, HTML (desktop); bản Docker không xuất PDF/HTML/Word. | https://github.com/siyuan-note/siyuan | 2026-10-26 |
| Quy mô cộng đồng (người dùng, sao GitHub, Reddit) | 46.939 sao GitHub, 3.090 fork (siyuan-note/siyuan). Số thành viên subreddit: chưa xác minh. Số người dùng: chưa xác minh (README không nêu). | https://github.com/siyuan-note/siyuan | 2026-10-26 |
| Điểm mạnh nổi bật | Tham chiếu cấp block (block ID ổn định), WYSIWYG Markdown, local-first + E2EE, mua PRO một lần $64 để tự đồng bộ S3/WebDAV. | https://b3log.org/siyuan/en/ ; https://www.mejba.me/blog/siyuan-developer-knowledge-base | 2026-10-26 |
| Người dùng hay phàn nàn (Reddit, review) | 1) Định dạng `.sy` JSON khó mang đi, không sửa trực tiếp được.<br>2) Đồng bộ phải trả phí; xung đột đồng bộ khó xử lý, có báo mất dữ liệu khi sửa trên 2 máy qua WebDAV.<br>3) Cộng đồng/tài liệu plugin thiên tiếng Trung.<br>4) Giao diện dày đặc, khó học; mobile "functional, not delightful".<br>5) Bản Docker thiếu tính năng (không kết nối app, không xuất PDF/Word). Không tìm được thread Reddit phù hợp (Reddit chặn truy cập). | https://www.mejba.me/blog/siyuan-developer-knowledge-base ; https://betterstack.com/community/guides/linux/siyuan-knowledge-management/ ; https://git.boxo.cc/massivebox/siyuan-jsdraw-plugin/issues/9 ; https://lemmy.imagisphe.re/post/521810 | 2026-10-26 |

### Joplin

| Mục | Nội dung | Nguồn (link) | Ngày tra |
|---|---|---|---|
| Nền tảng (web/Win/Mac/Linux/iOS/Android) | Windows, macOS, Linux, Android, iOS, terminal (app-cli); Web App chỉ có khi dùng gói Joplin Cloud. Web Clipper cho Firefox/Chrome. | https://joplinapp.org/help/ ; https://joplinapp.org/plans/ | 2026-10-26 |
| Mô hình (SaaS / mở / tự host / kết hợp) | Kết hợp: app mã mở miễn phí, đồng bộ qua dịch vụ bất kỳ; Joplin Cloud là SaaS trả phí.<br>Tự host: Joplin Server chạy Docker (Postgres/SQLite, lưu nội dung trên filesystem/S3) — nhưng giấy phép server chỉ cho dùng cá nhân phi thương mại; dùng cho doanh nghiệp phải mua "Joplin Server Business". | https://github.com/laurent22/joplin/blob/dev/packages/server/README.md ; https://joplinapp.org/plans/ | 2026-10-26 |
| Giấy phép mã nguồn | App: AGPL-3.0-or-later.<br>Joplin Server (`packages/server`): "Joplin Server Personal Use License" v1 — chỉ dùng cá nhân phi thương mại, cấm sửa/tạo bản phái sinh, có thể thu hồi và đổi điều khoản bất kỳ lúc nào. Tên "Joplin" là nhãn hiệu đăng ký tại EU. | https://raw.githubusercontent.com/laurent22/joplin/dev/LICENSE ; https://raw.githubusercontent.com/laurent22/joplin/dev/packages/server/LICENSE.md | 2026-10-26 |
| Các gói và giá (USD/tháng, năm) | Giá bằng EUR (không có USD):<br>Basic €2.99/tháng hoặc €28.69/năm (2GB).<br>Pro €5.99/tháng hoặc €57.48/năm (30GB).<br>Pro 100GB €9.99/tháng hoặc €95.88/năm.<br>Teams €7.99/người/tháng hoặc €80.28/người/năm (tối thiểu 2).<br>Server Business €40/€35/€30 /người/năm theo quy mô. Giảm 50% cho HS/GV, dùng thử 14 ngày. | https://joplinapp.org/plans/ | 2026-10-26 |
| Định dạng lưu (Markdown thuần? độc quyền?) | Nội dung ghi chú là Markdown, nhưng lưu trong CSDL `database.sqlite` ở máy (không phải thư mục file .md); thư mục sync chứa file item có metadata. | https://joplinapp.org/help/ ; https://joplinapp.org/help/dev/spec/user_profile | 2026-10-26 |
| Đồng bộ (dịch vụ riêng, Git, WebDAV, iCloud…) | Joplin Cloud, Joplin Server (tự host), Nextcloud, WebDAV, S3, Dropbox, OneDrive, thư mục local; hỗ trợ mã hoá đầu-cuối. Không có Git/iCloud. | https://joplinapp.org/help/apps/sync/ ; https://joplinapp.org/help/ | 2026-10-26 |
| Offline | Có: "offline first", toàn bộ dữ liệu ở trên thiết bị. | https://joplinapp.org/help/ | 2026-10-26 |
| Cộng tác thời gian thực | Không có soạn thảo đồng thời; chỉ chia sẻ notebook (Pro trở lên) và phân quyền (Teams) qua Joplin Cloud/Server. | https://joplinapp.org/plans/ | 2026-10-26 |
| Plugin / API | Có hệ plugin + theme (kho plugin chính thức, hàng trăm mục; tổng số chưa xác minh) và Programmatic API (Data API). | https://joplinapp.org/plugins/ ; https://joplinapp.org/help/ | 2026-10-26 |
| AI tích hợp | "Joplin Cloud AI (beta)" có trong các gói Cloud (Basic→Teams), không có ở Server Business; chi tiết tính năng chưa xác minh. Nhóm phát triển đang thiết kế nền tảng AI lõi (GSoC 2026). | https://joplinapp.org/plans/ ; https://discourse.joplinapp.org/t/gsoc-2026-opportunities-for-the-ai-projects/49228 | 2026-10-26 |
| Xuất dữ liệu | JEX (tar), RAW (thư mục), HTML, PDF; trang hướng dẫn nói còn "a number of other formats" (Markdown xuất được nhưng chưa xác minh từ trang này). | https://joplinapp.org/help/apps/import_export | 2026-10-26 |
| Quy mô cộng đồng (người dùng, sao GitHub, Reddit) | 56.876 sao GitHub, 6.371 fork (laurent22/joplin). Số thành viên r/joplinapp: chưa xác minh. Số người dùng: chưa xác minh. | https://github.com/laurent22/joplin | 2026-10-26 |
| Điểm mạnh nổi bật | Mã mở lâu năm, nhiều đích đồng bộ (WebDAV/S3/Nextcloud/Dropbox…) có E2EE miễn phí, Web Clipper, gói Cloud rẻ (từ €2.99/tháng). | https://joplinapp.org/help/apps/sync/ ; https://joplinapp.org/plans/ | 2026-10-26 |
| Người dùng hay phàn nàn (Reddit, review) | 1) Đồng bộ chậm/kẹt khi nhiều ghi chú, mobile không đồng bộ nền.<br>2) Android chậm, gõ trễ với ghi chú dài.<br>3) Editor kém mượt, giao diện cũ, preview render lại mỗi phím.<br>4) Thiếu cộng tác, trải nghiệm không đồng nhất giữa nền tảng.<br>5) Joplin Server chưa ổn định khi tự host. (Reddit không truy cập được; nguồn là diễn đàn chính thức và blog.) | https://discourse.joplinapp.org/t/the-inability-of-the-mobile-joplin-application-to-perform-background-synchronization/37608 ; https://www.ctrl.blog/entry/joplin-notes-sync/ ; https://discourse.joplinapp.org/t/joplin-on-android-was-so-slow-it-was-unusable-until-laat-week/45767 ; https://github.com/JJ-8/joplin-disable-pdf ; https://bigbadtech.substack.com/p/the-self-hosted-onenote-alternative | 2026-10-26 |

### Nhóm 4
### Bear

| Mục | Nội dung | Nguồn (link) | Ngày tra |
|---|---|---|---|
| Nền tảng (web/Win/Mac/Linux/iOS/Android) | Mac, iPhone, iPad (kèm Apple Watch, Vision Pro theo App Store). Bear Web đang beta công khai từ 07/2025, chỉ là phần bổ trợ, "not intended to be used as a standalone" app.<br>Không có Windows và Android: "we do not have plans for Android or Windows". | https://bear.app/faq/what-about-bear-for-web-android-windows/ · https://apps.apple.com/us/app/bear-markdown-notes/id1016366447 · https://blog.bear.app/2025/07/bear-web-public-beta-you-are-invited/ | 2026-10-26 |
| Mô hình (SaaS / mở / tự host / kết hợp) | App gốc trả phí theo kiểu freemium (Free + Pro), đồng bộ qua iCloud của Apple. Không tự host được. | https://bear.app/ | 2026-10-26 |
| Giấy phép mã nguồn | Mã nguồn đóng: không thấy công bố mã nguồn ở bất kỳ đâu. | https://bear.app/ | 2026-10-26 |
| Các gói và giá (USD/tháng, năm) | Free: dùng trên một thiết bị, không đồng bộ.<br>Pro: $2.99/tháng hoặc $29.99/năm, dùng thử 7 ngày theo bear.app (14 ngày theo App Store). Giá "may vary according to your country's currency and taxes".<br>Người đăng ký từ trước Bear 2 giữ giá cũ $1.49/tháng hoặc $14.99/năm. | https://bear.app/ · https://apps.apple.com/us/app/bear-markdown-notes/id1016366447 · https://blog.bear.app/2023/04/bear-2-will-have-a-new-price-only-for-new-customers/ | 2026-10-26 |
| Định dạng lưu (Markdown thuần? độc quyền?) | Nội dung viết bằng cú pháp Markdown nhưng lưu trong một cơ sở dữ liệu SQLite của app, không phải file .md thuần. Nhân viên Bear trả lời trên forum: "no plans to change how Bear store data". | https://community.bear.app/t/filesystem-storage-rather-than-sqlite-database/1970 · https://community.bear.app/t/will-the-new-version-store-its-notes-in-raw-markdown/90 | 2026-10-26 |
| Đồng bộ (dịch vụ riêng, Git, WebDAV, iCloud…) | Chỉ qua iCloud và chỉ cho gói Pro. Bear Web không chạy khi bật Advanced Data Protection của Apple. | https://bear.app/ · https://bear.app/faq/what-about-bear-for-web-android-windows/ | 2026-10-26 |
| Offline | Có. App gốc lưu cục bộ, gói Free vẫn dùng ghi chú trên máy mà không cần đồng bộ. | https://bear.app/ | 2026-10-26 |
| Cộng tác thời gian thực | Không có. Người dùng vẫn đang xin tính năng này (thread 01/2026), nhân viên nói chia sẻ link sẽ đến sau khi bản web ổn định. | https://community.bear.app/t/collaborate-and-share-notes/18585 · https://community.bear.app/t/request-support-sharable-notes-or-multiple-accounts/13722 | 2026-10-26 |
| Plugin / API | Không có hệ plugin. Có x-callback-url (URL scheme) và, từ Bear 2.8 (04/2026), BearCLI cùng một MCP server. | https://blog.bear.app/2026/04/bear-2-8-bearcli-claude-connector-and-mcp-server/ | 2026-10-26 |
| AI tích hợp | Không có AI tạo sinh trong app. Từ Bear 2.8 có "Claude Connector" và MCP server để AI bên ngoài truy cập ghi chú. FAQ có nhắc "semantic search" là tính năng riêng của hệ điều hành. | https://blog.bear.app/2026/04/bear-2-8-bearcli-claude-connector-and-mcp-server/ · https://bear.app/faq/what-about-bear-for-web-android-windows/ | 2026-10-26 |
| Xuất dữ liệu | Xuất TXT, Markdown, TextBundle, RTF, PDF, JPG, HTML, DOCX, ePub. Riêng PDF, HTML, DOCX, JPG cần Pro. | https://bear.app/ | 2026-10-26 |
| Quy mô cộng đồng (người dùng, sao GitHub, Reddit) | r/bearapp khoảng 25k thành viên (GummySearch, cập nhật 2026-10-18). App Store Mỹ: 4.7★ với 6.9K đánh giá. Không có repo GitHub chính thức. Bear không công bố số người dùng. | https://gummysearch.com/r/bearapp/ · https://apps.apple.com/us/app/bear-markdown-notes/id1016366447 | 2026-10-26 |
| Điểm mạnh nổi bật | Trình soạn Markdown đẹp, gọn, rẻ ($29.99/năm). Có nhiều định dạng xuất. Gần đây thêm Mermaid, công thức toán, CLI và MCP. | https://blog.bear.app/category/updates · https://bear.app/ | 2026-10-26 |
| Người dùng hay phàn nàn (Reddit, review) | 1) Chỉ có trên Apple, không có Windows/Android: https://bear.app/faq/what-about-bear-for-web-android-windows/<br>2) Đồng bộ iCloud chậm hoặc đứng: https://community.bear.app/t/syncing-issues-across-devices/14540 · https://community.bear.app/t/blank-note-bug-and-images-not-syncing/18105<br>3) Bear Web beta âm thầm ngừng đồng bộ: https://community.bear.app/t/web-notes-not-syncing-at-all/18523<br>4) Không cộng tác hay chia sẻ được: https://community.bear.app/t/collaborate-and-share-notes/18585<br>5) Dữ liệu nằm trong SQLite, không phải file thuần: https://community.bear.app/t/feature-request-read-write-note-access-on-filesystem/1965 | (xem link trong ô) | 2026-10-26 |

### Evernote

| Mục | Nội dung | Nguồn (link) | Ngày tra |
|---|---|---|---|
| Nền tảng (web/Win/Mac/Linux/iOS/Android) | Windows, Mac, iOS, Android, web, cùng Web Clipper cho Chrome, Firefox và Safari. Không có Linux. | https://evernote.com/download | 2026-10-26 |
| Mô hình (SaaS / mở / tự host / kết hợp) | SaaS đóng, máy chủ của Evernote (thuộc Bending Spoons từ 2023). Không tự host được. | https://evernote.com/compare-plans · https://appfigures.com/resources/insights/the-company-squeezing-money-from-apps-you-used-to-love | 2026-10-26 |
| Giấy phép mã nguồn | Mã nguồn đóng. | https://evernote.com/compare-plans | 2026-10-26 |
| Các gói và giá (USD/tháng, năm) | Free: 50 note, 1 sổ, 1 thiết bị, 1 GB.<br>Starter: $14.99/tháng hoặc $99.00/năm; 1.000 note, 3 thiết bị.<br>Advanced: $24.99/tháng hoặc $249.99/năm; không giới hạn.<br>Flexible và Unlimited cho doanh nghiệp, liên hệ để biết giá. Trang compare-plans không hiện giá; giá USD lấy từ bài help chính thức (403 khi tải trực tiếp, đọc qua kết quả tìm kiếm) và trùng với email gửi khách mà người dùng TidBITS trích ngày 2026-07-11. | https://evernote.com/compare-plans · https://help.evernote.com/hc/en-us/articles/46317642175763 · https://talk.tidbits.com/t/evernote-2026-price-tiers-floored-me/33792 | 2026-10-26 |
| Định dạng lưu (Markdown thuần? độc quyền?) | Độc quyền, lưu trên máy chủ Evernote. Định dạng trao đổi là ENEX (XML) và không có Markdown gốc. | https://help.evernote.com/hc/articles/209005557 | 2026-10-26 |
| Đồng bộ (dịch vụ riêng, Git, WebDAV, iCloud…) | Đồng bộ qua dịch vụ riêng của Evernote. Số thiết bị phụ thuộc gói: 1 (Free), 3 (Starter), không giới hạn (Advanced). | https://evernote.com/compare-plans | 2026-10-26 |
| Offline | Có tính năng "Offline notes" trong bảng so sánh, nhưng gói nào được dùng thì chưa xác minh. | https://evernote.com/compare-plans | 2026-10-26 |
| Cộng tác thời gian thực | Có. Evernote quảng bá việc nhiều người "contribute to shared notes simultaneously". Có cả gói nhóm (Flexible, Unlimited). | https://evernote.com/user-stories/how-real-time-collaborative-editing-works-seamlessly-for-a | 2026-10-26 |
| Plugin / API | Không có hệ plugin. Có API công khai (OAuth, SDK); key phải xin và được duyệt thủ công. | https://dev.evernote.com/doc/ | 2026-10-26 |
| AI tích hợp | Có, từ bản v11: AI Assistant (làm cùng OpenAI), Semantic Search, AI Transcribe, AI Edit, AI Cleanup và kết nối MCP. Gói nào có tính năng nào thì trang chính thức không ghi rõ. | https://evernote.com/compare-plans · https://www.businesswire.com/news/home/20260119103272/en | 2026-10-26 |
| Xuất dữ liệu | ENEX, hoặc HTML một trang/nhiều trang, tối đa 100 note mỗi lần hoặc cả sổ. Chỉ xuất được trên app desktop, không xuất được trên web. | https://help.evernote.com/hc/articles/209005557 | 2026-10-26 |
| Quy mô cộng đồng (người dùng, sao GitHub, Reddit) | r/Evernote khoảng 28k thành viên (GummySearch, cập nhật 2026-10-25). Theo TechCrunch, Evernote từng đạt "over 250 million users" trước khi bị mua. APPS RUN THE WORLD ước "over 225 million users" (2025). Không có số chính thức hiện tại. | https://gummysearch.com/r/Evernote · https://techcrunch.com/?p=2443692 · https://www.appsruntheworld.com/apps-top-500-software-vendors/evernote/ | 2026-10-26 |
| Điểm mạnh nổi bật | Thương hiệu lâu năm. Web Clipper mạnh, có đủ mọi nền tảng phổ biến và bộ AI tích hợp sâu (chat với ghi chú, tìm kiếm ngữ nghĩa). | https://evernote.com/download · https://evernote.com/compare-plans | 2026-10-26 |
| Người dùng hay phàn nàn (Reddit, review) | 1) Tăng giá, bắt chuyển sang gói mới (07/2026): https://talk.tidbits.com/t/evernote-2026-price-tiers-floored-me/33792<br>2) Gói free bị cắt còn 50 note và 1 sổ: https://www.theregister.com/2023/11/30/evernote_free_tier_changes/ · https://www.techradar.com/pro/evernote-cuts-back-on-free-plans-pushing-users-to-upgrade<br>3) Phải trả cho AI mà mình không cần, app phình to: https://talk.tidbits.com/t/evernote-2026-price-tiers-floored-me/33792 · https://themanfromrio.substack.com/p/the-enshittification-of-evernote<br>4) Lo về hướng đi của Bending Spoons sau khi sa thải toàn bộ nhân viên: https://appfigures.com/resources/insights/the-company-squeezing-money-from-apps-you-used-to-love | (xem link trong ô) | 2026-10-26 |

### Apple Notes

| Mục | Nội dung | Nguồn (link) | Ngày tra |
|---|---|---|---|
| Nền tảng (web/Win/Mac/Linux/iOS/Android) | App gốc trên iPhone, iPad, Mac. Bản web ở icloud.com/notes chạy được trên Windows qua trình duyệt, nhưng không đính kèm file được trên web. Không có app Windows, Android hay Linux. | https://support.apple.com/en-gw/guide/icloud/mm6704cac5/icloud · https://www.idownloadblog.com/2022/02/17/how-to-access-iphone-notes-on-windows-pc/ | 2026-10-26 |
| Mô hình (SaaS / mở / tự host / kết hợp) | App miễn phí đi kèm hệ điều hành, đồng bộ qua iCloud. iCloud miễn phí 5 GB, dùng nhiều hơn thì mua iCloud+. Không tự host được. | https://support.apple.com/en-us/108047 | 2026-10-26 |
| Giấy phép mã nguồn | Mã nguồn đóng (app hệ thống của Apple). | https://support.apple.com/en-gw/guide/icloud/mm6704cac5/icloud | 2026-10-26 |
| Các gói và giá (USD/tháng, năm) | App miễn phí. Giá iCloud+ theo tháng:<br>Mỹ: 50 GB $0.99 · 200 GB $2.99 · 2 TB $9.99 · 6 TB $29.99 · 12 TB $59.99.<br>Việt Nam: 50 GB ₫25000 · 200 GB ₫89000 · 2 TB ₫299000 · 6 TB ₫899000 · 12 TB ₫1799000.<br>Trang chính thức chỉ ghi giá tháng. | https://support.apple.com/en-us/108047 | 2026-10-26 |
| Định dạng lưu (Markdown thuần? độc quyền?) | Định dạng rich text độc quyền của Apple, không phải Markdown thuần. Từ iOS 26 và macOS Tahoe mới nhập và xuất được Markdown. | https://support.craft.do/import-and-export/import/apple-notes · https://appleworld.today/2026/07/how-to-import-and-export-markdown-files-in-apple-notes/ | 2026-10-26 |
| Đồng bộ (dịch vụ riêng, Git, WebDAV, iCloud…) | Qua iCloud. Có thể dùng thêm tài khoản IMAP hoặc Google, nhưng web chỉ thấy ghi chú iCloud. Ghi chú trong mục "On My iPhone/Mac" chỉ nằm trên máy đó. | https://support.apple.com/en-gw/guide/icloud/mm6704cac5/icloud · https://www.idownloadblog.com/2022/02/17/how-to-access-iphone-notes-on-windows-pc/ | 2026-10-26 |
| Offline | Có trên app gốc, vì ghi chú nằm trên máy (và có mục lưu cục bộ "On My iPhone/Mac"). Chưa xác minh hành vi offline của bản web. | https://www.idownloadblog.com/2022/02/17/how-to-access-iphone-notes-on-windows-pc/ | 2026-10-26 |
| Cộng tác thời gian thực | Có, qua iCloud. Người đang mở note thấy thay đổi "in near real time", có highlight theo người sửa và mục Activity. Không cộng tác được trên note đã khoá. | https://support.apple.com/en-gw/guide/notes/apd4e6e2c9a6/4.13/mac/26 | 2026-10-26 |
| Plugin / API | Không có plugin và không có API web công khai. Tự động hoá được bằng Shortcuts (Create Note, Append to Note, Find Notes…). | https://www.macworld.com/article/232590/apple-updates-shortcuts-app-with-notes-access-and-other-new-actions.html | 2026-10-26 |
| AI tích hợp | Apple Intelligence tóm tắt bản ghi âm hoặc cuộc gọi ngay trong Notes. Cần Mac M1 trở lên, macOS 15.1+, và không có ở mọi ngôn ngữ hay khu vực. | https://support.apple.com/en-ca/guide/mac-help/summarize-an-audio-recording-in-notes-mchl2102c2ae/15.0/mac/15.0 | 2026-10-26 |
| Xuất dữ liệu | Xuất PDF và, từ iOS 26/macOS Tahoe, Markdown (ảnh để trong thư mục riêng). Bản cũ hơn không có xuất hàng loạt. | https://support.craft.do/import-and-export/import/apple-notes | 2026-10-26 |
| Quy mô cộng đồng (người dùng, sao GitHub, Reddit) | Chưa xác minh. Apple không công bố số người dùng Notes và không tìm được số thành viên subreddit. | | |
| Điểm mạnh nổi bật | Miễn phí, có sẵn trên mọi thiết bị Apple, cộng tác thời gian thực, tích hợp sâu với hệ điều hành (Shortcuts, Apple Intelligence). Nay đã xuất được Markdown. | https://support.apple.com/en-gw/guide/notes/apd4e6e2c9a6/4.13/mac/26 · https://support.craft.do/import-and-export/import/apple-notes | 2026-10-26 |
| Người dùng hay phàn nàn (Reddit, review) | 1) Note biến mất sau khi đồng bộ iCloud (03/2026): https://discussions.apple.com/thread/256254640 · https://discussions.apple.com/thread/256222050<br>2) Không có app Windows/Android, chỉ có bản web hạn chế: https://www.idownloadblog.com/2022/02/17/how-to-access-iphone-notes-on-windows-pc/<br>3) Sợ bị khoá dữ liệu vì trước iOS 26 không xuất được: https://redlib.ssps.io/r/macapps/comments/1l7ebfm/apple_notes_is_back_on_the_table | (xem link trong ô) | 2026-10-26 |

### Google Keep

| Mục | Nội dung | Nguồn (link) | Ngày tra |
|---|---|---|---|
| Nền tảng (web/Win/Mac/Linux/iOS/Android) | Android, iOS, web (keep.google.com), Wear OS. App Chrome đã ngừng hỗ trợ từ đầu 2021, nên trên desktop chỉ dùng qua web. | https://support.google.com/keep/answer/10183819 · https://en.wikipedia.org/wiki/Google_Keep | 2026-10-26 |
| Mô hình (SaaS / mở / tự host / kết hợp) | SaaS miễn phí gắn với tài khoản Google; dung lượng dùng chung gói Google One. Bản Workspace dành cho doanh nghiệp. | https://workspace.google.com/products/keep/ | 2026-10-26 |
| Giấy phép mã nguồn | Mã nguồn đóng. | https://workspace.google.com/products/keep/ | 2026-10-26 |
| Các gói và giá (USD/tháng, năm) | App miễn phí, kèm 15 GB miễn phí dùng chung trong tài khoản Google.<br>Google One, giá Việt Nam theo tháng từ trang chính thức: Lite 30 GB ₫19,000 · Basic 100 GB ₫45,000 · Google AI Pro 5 TB ₫489,000. Gói năm "Save up to 16%", nhưng trang không hiện giá năm.<br>Giá Mỹ (báo chí, chưa xác minh trên trang chính thức): AI Plus $4.99/tháng (400 GB) và AI Pro $19.99/tháng (5 TB) theo ProPakistani 10/2026; Premium 2 TB $9.99/tháng theo 9to5Google 01/2026. Giá Basic 100 GB ở Mỹ chưa xác minh. | https://one.google.com/about/plans · https://propakistani.pk/2026/10/17/google-ai-plus-to-be-severely-downgraded-after-november-13/amp/ · https://9to5google.com/2026/01/27/google-ai-plus-us/ | 2026-10-26 |
| Định dạng lưu (Markdown thuần? độc quyền?) | Định dạng độc quyền trên máy chủ Google. Có rich text cơ bản nhưng không có Markdown gốc; tính năng "Export to Markdown" mới chỉ thấy trong mã app (teardown). | https://www.androidauthority.com/google-keep-markdown-export-apk-teardown-3666449/ | 2026-10-26 |
| Đồng bộ (dịch vụ riêng, Git, WebDAV, iCloud…) | Qua tài khoản Google (dịch vụ riêng). | https://workspace.google.com/products/keep/ | 2026-10-26 |
| Offline | Có trên app Android và iOS: "Changes sync as soon as you're connected". Bản web/Chrome đã mất khả năng offline khi app Chrome bị khai tử. | https://workspace.google.com/products/keep/ · https://support.google.com/keep/answer/10183819 | 2026-10-26 |
| Cộng tác thời gian thực | Có, chia sẻ note cho người khác cùng sửa "in real time". | https://workspace.google.com/products/keep/ | 2026-10-26 |
| Plugin / API | Không có plugin. Keep API chỉ dành cho Google Workspace (quản trị, bảo mật), "not available for users with personal Google accounts". | https://developers.google.com/workspace/keep · https://workspaceupdates.googleblog.com/2021/05/keep-audit-logs-and-api.html | 2026-10-26 |
| AI tích hợp | Có "Help me create a list" bằng Gemini, cần gói Google AI và chạy trên thiết bị Pixel. | https://support.google.com/keep/answer/15222789 | 2026-10-26 |
| Xuất dữ liệu | Qua Google Takeout: mỗi note thành một file HTML và một file JSON trong file zip. Không có nút xuất trong app. | https://www.howtogeek.com/694042/how-to-export-your-google-keep-notes-and-attachments/ | 2026-10-26 |
| Quy mô cộng đồng (người dùng, sao GitHub, Reddit) | Hơn 1 tỷ lượt cài trên Play Store (mốc 12/2020, một phần nhờ cài sẵn trên máy). Chưa xác minh số thành viên r/GoogleKeep. | https://9to5google.com/2020/12/08/google-keep-reaches-1-billion-downloads-on-the-play-store/ | 2026-10-26 |
| Điểm mạnh nổi bật | Miễn phí, nhanh, đơn giản; có sẵn trên Android, cộng tác thời gian thực, tích hợp hệ sinh thái Google (Docs, Gemini). | https://workspace.google.com/products/keep/ | 2026-10-26 |
| Người dùng hay phàn nàn (Reddit, review) | 1) Note bị mất hoặc biến mất: https://redlib.hbubli.cc/r/GoogleKeep (mirror Reddit, không rõ ngày; hiện đang bảo trì)<br>2) Lỗi đồng bộ (01/2025, 08/2025): https://r1.community.samsung.com/t5/galaxy-s/google-keep-sync-issue/m-p/31553576/highlight/true · https://justuseapp.com/en/app/1029207872/google-keep-notizen-listen/problems<br>3) Không có Markdown: https://www.androidauthority.com/google-keep-markdown-export-apk-teardown-3666449/ · https://dev.to/luca_ottaviano/introducing-neatpad-22ga<br>4) Khó tổ chức nhiều note vì không có thư mục hay sổ (review cũ): https://www.computerworld.com/article/1403158/google-keep-is-just-a-notepad-so-use-it-that-way.html | (xem link trong ô) | 2026-10-26 |

### Noteriv (để đặt cạnh)
Theo hiện trạng `main` và production ngày 2026-10-26, không theo kế hoạch. Nguồn là chính repo này.

| Mục | Nội dung | Nguồn (link) | Ngày tra |
|---|---|---|---|
| Nền tảng (web/Win/Mac/Linux/iOS/Android) | Web (cài được như app, PWA, kể cả trên iPhone). Desktop Win/Mac/Linux (Tauri), chưa có bộ cài phát hành. Android: app riêng, chưa phát hành APK. Không có app iOS gốc | `docs/desktop.md`, `docs/mobile/` | 2026-10-26 |
| Mô hình (SaaS / mở / tự host / kết hợp) | Bản web chạy trên máy chủ riêng của dự án, đăng ký bằng mã mời. Mã nguồn tự host được (Docker Compose). Desktop và Android không cần tài khoản | `web/infra/`, `docs/ops/` | 2026-10-26 |
| Giấy phép mã nguồn | MIT (fork từ upstream Noteriv, phải giữ ghi công) | `LICENSE`, `NOTICE.md` | 2026-10-26 |
| Các gói và giá (USD/tháng, năm) | Chưa bán. Có lớp gói: Free (10 vault, 1 GiB đính kèm, 3 kết nối sync, 50 phiên bản lịch sử mỗi note) và Unlimited (chỉ chủ dự án). Nâng cấp hiện là gửi email | `web/server/prisma/migrations/*_plans` | 2026-10-26 |
| Định dạng lưu (Markdown thuần? độc quyền?) | Markdown thuần. Web lưu trong PostgreSQL, xuất ra file `.md`. Desktop và Android là thư mục file `.md` | `docs/reference/file-types.md` | 2026-10-26 |
| Đồng bộ (dịch vụ riêng, Git, WebDAV, iCloud…) | Web: máy chủ, cộng thêm Git (GitHub, GitLab, Gitea) và WebDAV. Desktop: Git. Android: GitHub/GitLab/Gitea, mới chỉ note `.md`. Xung đột giữ cả hai bản | `docs/sync/` | 2026-10-26 |
| Offline | Web: đọc và sửa các note mở gần đây (300 note, 25 MB). Desktop và Android: toàn bộ | `docs/features/offline.md` | 2026-10-26 |
| Cộng tác thời gian thực | Có trên web: chia sẻ vault, nhiều người sửa cùng note, có người chỉ được xem. Chưa ghép từng thao tác, chưa hiện con trỏ của người khác | `docs/plans/2026-10-20-chang-k-kiem-chung.md` (nợ kỹ thuật) | 2026-10-26 |
| Plugin / API | 20 core plugin, dùng chung trên web và desktop; Android bật/tắt theo cùng danh sách. API cho plugin cộng đồng (bản nháp, draft.11) | `packages/plugins`, `docs/plugin-api/` | 2026-10-26 |
| AI tích hợp | Không có trong app. Có máy chủ MCP 22 công cụ cho trợ lý AI, làm việc trên thư mục vault | `docs/mcp/index.md` | 2026-10-26 |
| Xuất dữ liệu | Xuất toàn bộ thành zip Markdown, kèm đính kèm và liên kết tương đối. Nhập từ Obsidian, Notion, Evernote, HTML | `docs/reference/file-types.md`, phiên O11 | 2026-10-26 |
| Quy mô cộng đồng (người dùng, sao GitHub, Reddit) | Chưa ra mắt; người dùng duy nhất là chủ dự án | — | 2026-10-26 |
| Điểm mạnh nổi bật | Một sản phẩm đủ ba dạng: web (có cộng tác), desktop và Android, cùng Markdown thuần và Git. Tự host được, MIT. Tính năng gần Obsidian: liên kết, nhúng, thuộc tính, chế độ xem, đồ thị, slash, nhập dữ liệu (đợt O1–O12). Giao diện tiếng Anh và tiếng Việt | phiên O1–O12, M1–M4 | 2026-10-26 |
| Điểm yếu đã biết | Chưa thử với người dùng ngoài. App Android chưa chạy trên máy thật sau 4 phiên gần nhất. Không có iOS gốc. Đính kèm chưa sync trên Android. Desktop chưa ký mã. Cộng tác còn đơn giản | [loi-va-gop-y.md](loi-va-gop-y.md), [moi-mat.md](moi-mat.md) mục 2 | 2026-10-26 |

### Mâu thuẫn giữa các nguồn (2026-10-26)

Ghi lại để dùng thận trọng; chưa giải quyết.

- **Giá Craft:** trang hỗ trợ chính thức ghi Team $60/tháng ($600/năm); TechRepublic (2024), Saner.ai, Toolradar ghi Team $50/tháng, Plus $8 hoặc $5, thậm chí "Business $250". Trang giá craft.do khi xem từ VN hiển thị VND (Plus ₫124.917 vs ₫99.933/tháng; Team ₫724.167/tháng ≈ quy đổi khác $60).
- **Craft Android:** trang hỗ trợ ghi ra Google Play 11/2025 dạng app native; Android Authority (02/2026) nói vẫn beta và giống bản web di động đóng gói; Saner.ai/TechRepublic còn ghi "không có Android".
- **Giá Notion:** trang giá ghi $10/$20 không rõ trả tháng hay năm; nguồn thứ cấp (usecarly, coworker) ghi $12/$24 trả tháng và $10/$20 trả năm. Ngày bỏ add-on AI: 13/05/2025 hay 13/08/2025 tuỳ nguồn.
- **Logseq Sync giá:** thông báo chính thức nói lời mời cho nhà tài trợ $15/tháng; ToolQuestor nói $5 hoặc $15; CostBench ghi $5/tháng nhưng tự thừa nhận chưa có giá chính thức.
- **Logseq định dạng:** thông báo tách bản (04/2026) nói "sẽ hỗ trợ Markdown trong bản DB, đang nghiên cứu"; changelog 05/2026 đã có Markdown Mirror nhưng chỉ một chiều.
- **Số người dùng Obsidian:** bài trên Readwise (không ngày) "ước 1 triệu"; tóm tắt podcast tiếng Trung (05/2026) "hơn 10 triệu"; 36Kr (04/2026) "hàng chục triệu" — Obsidian không tự công bố.
- **Cộng tác Obsidian:** một bài diễn đàn nói "collaborative vaults" xuất hiện từ bản insider v0.14.10 (yêu cầu mọi người dùng Sync), người khác nói đó không phải chỉnh sửa đồng thời.
- **Giấy phép AFFiNE**: README ghi "AFFiNE Community Edition (CE)... free for self-host under the MIT license", nhưng file `packages/backend/server/LICENSE` là AFFiNE EE License (production cần subscription), phần CE theo MPL 2.0; trang self-host lại ghi "Free up to 10 seats per workspace".
- **Trang giá AFFiNE**: thẻ "Self Hosted FOSS" ghi 100 GB và 10 thành viên, trong khi Free cloud ghi 10 GB và 3 thành viên; trang pricing ghi thẻ tự host Team chỉ "billed annually", trang self-host thêm giá $12 thanh toán tháng.
- **Giá Anytype**: trang chính thức hiện $4/$8/$16 kèm nút "Yearly -20%" nhưng không ghi rõ kỳ thanh toán; trang tổng hợp bên thứ ba (aiproductivity.ai, frontdeskreview.com) cho rằng đó là giá năm quy đổi, giá tháng là $5/$10/$20 — chưa xác minh từ nguồn chính thức. Tài liệu cũ của Anytype còn ghi gói Builder $99/năm và Co-Creator $299/3 năm (đã lỗi thời).
- **Plugin AFFiNE**: README nói "coming soon", trong khi một mirror tài liệu (mintlify) mô tả hệ plugin "under active development / preview" — không phải nguồn chính thức.
- SiYuan Subscription $148: trang giá ghi nhãn "Lifetime" nhưng phần FAQ cùng trang mô tả là gói đăng ký theo năm (annual) — chưa rõ chu kỳ thực.
- SiYuan định dạng lưu: README và review (mejba.me, Better Stack) nói `.sy` JSON; trang deploy của Railway lại nói kernel ghi Markdown ra volume — tin README chính thức.
- SiYuan cộng tác: trang chủ nói server Docker "dễ cho nhiều người làm việc cùng", README Kubernetes lại cảnh báo "One workspace, one writer".
- Joplin đích đồng bộ: trang /help/ tổng quan chỉ nêu Nextcloud, Dropbox, OneDrive, Joplin Cloud; trang /help/apps/sync/ liệt kê thêm WebDAV, S3, filesystem.
- Joplin định dạng: trang /help/ nói "The notes are in Markdown format", còn spec user profile cho thấy chúng nằm trong `database.sqlite` (Markdown là định dạng nội dung, không phải file .md trên đĩa).
- Joplin giấy phép: GitHub API báo license "Other/NOASSERTION" vì repo là AGPL nhưng `packages/server` có giấy phép riêng (Personal Use).
- Bear dùng thử: bear.app ghi 7 ngày, App Store Mỹ ghi 14 ngày.
- Phiên bản Bear: App Store hiện 3.0.3, nhưng blog chính thức chỉ có bài tới Bear 2.9 (07/2026) và bài Mermaid (2026-07-28), không có bài nào về Bear 3.
- Dung lượng gói Starter của Evernote: trang compare-plans ghi 5 GB, còn người dùng trên TidBITS đọc email thông báo là 1 GB.
- Giá Evernote: help chính thức cùng email gửi khách ghi Starter $14.99/tháng hoặc $99/năm và Advanced $24.99/tháng hoặc $249.99/năm. Một số trang tổng hợp lại ghi khác: ToolRadar $19.99 cho Advanced, eesel ghi tên gói cũ Personal/Professional $129.99/$169.99 mỗi năm.
- Evernote v11 và AI: AlternativeTo đưa tin 10/2025, BusinessWire 01/2026. Thông cáo báo chí nói AI cho "all Evernote customers", Yahoo nói chỉ cho "paid users".
- GummySearch: một trang nói dịch vụ "closed as of 11/30/2025", nhưng trang subreddit lại ghi "Last updated" tháng 10/2026. Vì vậy số thành viên Reddit chỉ nên coi là ước lượng.
- Google AI Plus ở Mỹ: TechCrunch 01/2026 ghi $7.99/tháng, ProPakistani 10/2026 ghi $4.99/tháng (đã giảm giá). Bài ProPakistani còn nói gói này "bị hạ cấp sau 13/11".
- Số người dùng Evernote: 250 triệu (TechCrunch, trước 2023) so với 225 triệu (APPS RUN THE WORLD, 2025). Cả hai đều không phải số chính thức hiện tại.

## 3. Bảng chấm điểm có trọng số

**Trọng số chốt ở Tuần 0, không đổi khi đang chấm.**

Trạng thái trọng số: **Đã chốt ngày 2026-10-20** (nguyên bản đề xuất)

| Nhóm tiêu chí | Trọng số |
|---|---|
| Tính năng ghi chú cốt lõi (soạn thảo, liên kết, tìm kiếm) | 20% |
| Đồng bộ, offline, an toàn dữ liệu | 20% |
| Đa nền tảng (web/desktop/di động) | 15% |
| Cộng tác | 10% |
| Mở rộng (plugin, API, AI) | 10% |
| Dễ dùng cho người mới | 10% |
| Quyền sở hữu dữ liệu (Markdown thuần, tự host, xuất) | 10% |
| Giá | 5% |

Thang điểm mỗi tiêu chí: 1 (kém) – 5 (tốt nhất nhóm). App chỉ nghiên cứu bàn giấy thì ghi điểm kèm dấu `*` (chưa dùng thật).

| App | Cốt lõi | Đồng bộ | Đa nền tảng | Cộng tác | Mở rộng | Dễ dùng | Sở hữu DL | Giá | **Tổng có trọng số** |
|---|---|---|---|---|---|---|---|---|---|
| Noteriv | 4* | 3* | 3* | 3* | 3* | 3* | 5* | – | **3.42** |
| Obsidian | 5* | 4* | 4* | 1* | 4* | 3* | 5* | 4* | **3.90** |
| Logseq | 4* | 2* | 4* | 1* | 3* | 2* | 4* | 5* | **3.05** |
| Notion | 4* | 3* | 4* | 5* | 4* | 4* | 1* | 3* | **3.55** |
| Craft | 4* | 3* | 3* | 4* | 3* | 5* | 2* | 2* | **3.35** |
| AFFiNE | 4* | 3* | 5* | 4* | 3* | 4* | 3* | 4* | **3.75** |
| Anytype | 4* | 4* | 4* | 3* | 2* | 3* | 4* | 4* | **3.60** |
| SiYuan | 5* | 3* | 4* | 1* | 4* | 2* | 3* | 3* | **3.35** |
| Joplin | 3* | 4* | 5* | 2* | 4* | 3* | 4* | 5* | **3.70** |
| Bear | 4* | 3* | 1* | 1* | 3* | 5* | 3* | 4* | **2.95** |
| Evernote | 4* | 4* | 4* | 4* | 4* | 3* | 1* | 1* | **3.45** |
| Apple Notes | 3* | 3* | 2* | 4* | 2* | 5* | 2* | 5* | **3.05** |
| Google Keep | 2* | 3* | 4* | 4* | 1* | 5* | 2* | 5* | **3.05** |

**Cách tính:** "Tổng có trọng số" là trung bình có trọng số trên thang 1–5. Noteriv chưa có giá, nên tổng của nó tính trên 95% trọng số còn lại. Mọi điểm đều là điểm bàn giấy (`*`), chấm ngày 2026-10-26, sẽ chấm lại bằng điểm dùng thật cho 4 app ở mục 4.

### Lý do từng điểm (bàn giấy)

- **Noteriv**: Cốt lõi 4 (đủ liên kết, nhúng, thuộc tính, chế độ xem, tìm kiếm có toán tử; chưa có người ngoài dùng thử) · Đồng bộ 3 (nhiều lựa chọn, giữ cả hai bản khi xung đột; offline web chỉ note gần đây; sync Android chưa chạy trên máy thật) · Đa nền tảng 3 (web, desktop, Android, nhưng chưa phát hành bộ cài/APK, không có iOS gốc) · Cộng tác 3 (thời gian thực trên web, còn đơn giản: không con trỏ người khác) · Mở rộng 3 (20 core plugin, API plugin bản nháp, MCP; không có AI trong app) · Dễ dùng 3 (có vault mẫu, hai thứ tiếng; chưa kiểm với người mới) · Sở hữu dữ liệu 5 (Markdown thuần, MIT, tự host, xuất zip) · Giá – (chưa bán). **Tự chấm, dễ thiên vị**: kiểm lại sau khi chủ dự án dùng thử 4 app ở mục 4.
- **Obsidian**: Cốt lõi 5 (liên kết, nhúng, thuộc tính, Bases, tìm kiếm; chuẩn của nhóm) · Đồng bộ 4 (Sync có mã hoá đầu-cuối và lịch sử, nhưng trả phí; Git/WebDAV chỉ qua plugin cộng đồng) · Đa nền tảng 4 (5 hệ điều hành, không có web) · Cộng tác 1 (không sửa cùng lúc) · Mở rộng 4 (hệ plugin lớn nhất nhóm, không có AI trong lõi) · Dễ dùng 3 (mạnh nhưng nhiều thứ phải tự cấu hình) · Sở hữu dữ liệu 5 (Markdown thuần, không khoá) · Giá 4 (app miễn phí, Sync $4/tháng). Chấm bởi Claude từ bảng hồ sơ ở trên.
- **Logseq**: Cốt lõi 4 (outliner, block ref, journal mạnh; chậm khi graph lớn) · Đồng bộ 2 (local-first nhưng sync chính thức còn beta, có lịch sử lỗi iCloud) · Đa nền tảng 4 (đủ 5 hệ + web; app di động bản DB còn alpha) · Cộng tác 1 (OG không có, RTC còn alpha) · Mở rộng 3 (có plugin API, không AI tích hợp) · Dễ dùng 2 (outliner khó với người mới, đang chia hai bản gây rối) · Sở hữu dữ liệu 4 (OG Markdown thuần + AGPL; DB chuyển sang SQLite) · Giá 5 (miễn phí, sync qua tài trợ $15).
- **Notion**: Cốt lõi 4 (soạn thảo + database mạnh; liên kết kiểu wiki kém hơn) · Đồng bộ 3 (đám mây ổn định nhưng offline phải chọn từng trang, DB chỉ 50 dòng) · Đa nền tảng 4 (web/Win/Mac/iOS/Android, thiếu Linux) · Cộng tác 5 (thời gian thực là lõi) · Mở rộng 4 (API, webhook, MCP, AI agent; không plugin trong app) · Dễ dùng 4 (template phong phú, nhưng database có độ dốc học) · Sở hữu dữ liệu 1 (độc quyền, không tự host, xuất mất quan hệ database) · Giá 3 (Free hào phóng cho cá nhân; AI đầy đủ cần Business $20).
- **Craft**: Cốt lõi 4 (soạn thảo đẹp, block, liên kết; task/database cơ bản) · Đồng bộ 3 (đồng bộ nhanh trên Apple; Web/Win/Android offline hạn chế) · Đa nền tảng 3 (thiếu Linux, Android mới và chưa đủ tính năng) · Cộng tác 4 (thời gian thực, cần gói Family/Team) · Mở rộng 3 (API + MCP + AI có BYO key; không plugin) · Dễ dùng 5 (được giải thiết kế, app native) · Sở hữu dữ liệu 2 (độc quyền trên AWS; xuất được Markdown/TextBundle, External Locations) · Giá 2 (Free giới hạn 1.500 block; Plus $96/năm, Team $600/năm).
- **AFFiNE**: Cốt lõi 4 (doc + whiteboard, liên kết tài liệu; có issue tìm link chậm) · Đồng bộ 3 (local-first, offline tốt nhưng nhiều issue sync lỗi/mất dữ liệu) · Đa nền tảng 5 (web + 3 desktop + 2 mobile) · Cộng tác 4 (real-time, Free chỉ 3 thành viên) · Mở rộng 3 (AI mạnh nhưng chưa có plugin/API công khai) · Dễ dùng 4 (giao diện kiểu Notion/Miro, có importer) · Sở hữu dữ liệu 3 (tự host miễn phí ≤10 seat nhưng định dạng Yjs, xuất Markdown từng trang) · Giá 4 (Free 10 GB cloud, Pro $6.75/tháng năm, tự host miễn phí).
- **Anytype**: Cốt lõi 4 (object/relation, liên kết, đồ thị; nhưng mô hình phức tạp) · Đồng bộ 4 (E2EE, offline, backup node; có báo cáo mất dữ liệu) · Đa nền tảng 4 (3 desktop + 2 mobile, không có web app) · Cộng tác 3 (real-time trong shared channel, giới hạn Editor ở gói Free) · Mở rộng 2 (không plugin, không AI tích hợp, chỉ Local API) · Dễ dùng 3 (khái niệm object/type/relation khó cho người mới, khoá 12 từ không khôi phục được) · Sở hữu dữ liệu 4 (tự host sync MIT, xuất Markdown/JSON, nhưng định dạng gốc độc quyền và license client hạn chế thương mại) · Giá 4 (Free dùng được, Plus $4/tháng; remote storage Free chỉ 100 MB).
- **SiYuan**: Cốt lõi 5 (block reference, WYSIWYG, tìm kiếm) · Đồng bộ 3 (E2EE, offline tốt nhưng mọi đồng bộ đều trả phí, có báo xung đột/mất dữ liệu) · Đa nền tảng 4 (đủ desktop/mobile, web chỉ qua Docker hạn chế) · Cộng tác 1 (one workspace, one writer) · Mở rộng 4 (plugin API, kernel API, AI qua OpenAI, MCP; chợ plugin thiên tiếng Trung) · Dễ dùng cho người mới 2 (giao diện dày đặc, "steep at first") · Sở hữu dữ liệu 3 (AGPL, tự host Docker, xuất Markdown được nhưng lưu `.sy` JSON) · Giá 3 (bản free không có đồng bộ; PRO $64 một lần khá hời, Subscription $148).
- **Joplin**: Cốt lõi 3 (Markdown + notebook/tag, editor bị chê chậm, liên kết giữa ghi chú cơ bản) · Đồng bộ 4 (nhiều đích miễn phí kèm E2EE, offline-first; nhưng phàn nàn đồng bộ chậm, không đồng bộ nền mobile) · Đa nền tảng 5 (5 OS + CLI + web app qua Cloud) · Cộng tác 2 (chỉ chia sẻ notebook, không real-time) · Mở rộng 4 (hệ plugin lớn, Data API, AI beta trên Cloud) · Dễ dùng cho người mới 3 (quen thuộc kiểu Evernote, giao diện cũ) · Sở hữu dữ liệu 4 (AGPL app, đồng bộ qua dịch vụ tự chọn; nhưng lưu SQLite, server tự host bị giới hạn dùng cá nhân) · Giá 5 (app + đồng bộ bên thứ ba miễn phí, Cloud từ €2.99/tháng).
- **Bear**: Cốt lõi 4 (soạn Markdown tốt, có tag nhưng không có [[wiki-link]] graph) · Đồng bộ 3 (chỉ iCloud, chỉ Pro, có than phiền đồng bộ chậm) · Đa nền tảng 1 (chỉ Apple, web còn beta) · Cộng tác 1 (không có) · Mở rộng 3 (x-callback-url, CLI, MCP; không có plugin) · Dễ dùng 5 (gọn, đẹp, 4.7★) · Sở hữu dữ liệu 3 (SQLite, nhưng xuất Markdown/TextBundle rộng) · Giá 4 ($29.99/năm, free một thiết bị)
- **Evernote**: Cốt lõi 4 (tìm kiếm ngữ nghĩa, web clipper, không Markdown) · Đồng bộ 4 (dịch vụ riêng ổn định, có offline; số thiết bị bị giới hạn theo gói) · Đa nền tảng 4 (đủ trừ Linux) · Cộng tác 4 (sửa cùng lúc, có gói nhóm) · Mở rộng 4 (API, MCP, nhiều AI; không plugin) · Dễ dùng 3 (app nặng, nhiều gói khó hiểu) · Sở hữu dữ liệu 1 (độc quyền, chỉ ENEX/HTML, chỉ xuất trên desktop) · Giá 1 (free 50 note, $99–249.99/năm)
- **Apple Notes**: Cốt lõi 3 (soạn rich text tốt, không có wiki-link) · Đồng bộ 3 (iCloud tiện nhưng có báo cáo mất note) · Đa nền tảng 2 (Apple cộng web hạn chế) · Cộng tác 4 (gần thời gian thực, có Activity) · Mở rộng 2 (chỉ Shortcuts, AI giới hạn theo máy và khu vực) · Dễ dùng 5 (có sẵn, miễn phí) · Sở hữu dữ liệu 2 (độc quyền, mới có xuất Markdown) · Giá 5 (miễn phí, iCloud+ từ $0.99/tháng)
- **Google Keep**: Cốt lõi 2 (note ngắn, không Markdown, khó tổ chức) · Đồng bộ 3 (có offline trên mobile, nhưng có báo cáo mất note) · Đa nền tảng 4 (Android, iOS, web, Wear OS; không có app desktop) · Cộng tác 4 (sửa cùng lúc) · Mở rộng 1 (API chỉ cho Workspace, AI cần gói trả phí) · Dễ dùng 5 (rất đơn giản) · Sở hữu dữ liệu 2 (chỉ xuất qua Takeout HTML/JSON) · Giá 5 (miễn phí, 15 GB dùng chung)

## 4. Dùng thử thực tế: 10 việc chuẩn

App dùng thử (mỗi nhóm một): **Obsidian · Notion · AFFiNE hoặc Anytype · Bear hoặc Apple Notes**, và Noteriv. Chủ dự án làm, ghi thời gian (phút) và cảm nhận 1–5.

| # | Việc | Noteriv | Obsidian | Notion | AFFiNE/Anytype | Bear/Apple Notes |
|---|---|---|---|---|---|---|
| 1 | Ghi nhanh một ý trên điện thoại | | | | | |
| 2 | Tạo 2 note và liên kết với nhau | | | | | |
| 3 | Tìm lại một câu viết tuần trước | | | | | |
| 4 | Tạo note từ mẫu | | | | | |
| 5 | Chia sẻ một note cho người khác xem/sửa | | | | | |
| 6 | Sửa trên máy A, thấy trên máy B | | | | | |
| 7 | Làm việc khi mất mạng rồi đồng bộ lại | | | | | |
| 8 | Xuất một note ra PDF | | | | | |
| 9 | Nhập dữ liệu từ app cũ | | | | | |
| 10 | Thêm một tiện ích (plugin/tích hợp) | | | | | |

Ghi thêm cảm nhận tự do mỗi app (3–5 dòng): điều gì làm mình muốn dùng tiếp / bỏ.

## 5. Bản đồ định vị

Hai trục:
- Ngang: **dữ liệu của mình** (file Markdown, tự host) ↔ **đám mây đóng** (định dạng riêng).
- Dọc: **cá nhân** ↔ **nhóm / cộng tác**.

Đặt 13 app (kể cả Noteriv) lên bản đồ; ghi lý do mỗi vị trí. Trả lời:
1. Chỗ trống nào có thật (ít app, có nhu cầu)?
2. Noteriv có nằm ở chỗ trống đó không?

### Bản nháp bàn giấy (2026-10-26, chấm lại sau khi dùng thử ở mục 4)

| | Dữ liệu của mình (Markdown thuần / tự host) | Lai (mã mở, định dạng riêng, tự host được) | Đám mây đóng |
|---|---|---|---|
| **Nhóm / cộng tác** | **Noteriv** (cộng tác thời gian thực trên web, lưu Markdown, tự host, MIT) | AFFiNE (tự host miễn phí tới 10 seat), Anytype (mạng tự host) | Notion, Evernote, Craft |
| **Cá nhân** | Obsidian, Logseq OG, Joplin (Markdown bên trong SQLite, xuất được) | SiYuan (`.sy` JSON), Logseq DB (SQLite) | Bear (SQLite, chỉ iCloud), Apple Notes, Google Keep |

Lý do vị trí: lấy từ các dòng "Định dạng lưu", "Mô hình" và "Cộng tác thời gian thực" trong hồ sơ ở mục 2.

1. **Chỗ trống có thật:** góc "dữ liệu là Markdown thuần, mà vẫn cộng tác thời gian thực". Trong 12 app không có app nào nằm ở đây:
   - Obsidian, Joplin và Logseq OG giữ Markdown nhưng không cho sửa cùng lúc.
   - AFFiNE, Anytype và Notion cho cộng tác nhưng lưu bằng định dạng riêng.
   - Nhu cầu có thật nhưng chưa đo được quy mô. Có các yêu cầu cộng tác trên diễn đàn Obsidian, dẫn ở hồ sơ Obsidian, kèm plugin cộng đồng Relay.
2. **Noteriv nằm đúng chỗ trống đó, nhưng ở mức sơ khai:**
   - Cộng tác chưa ghép từng thao tác, chưa hiện con trỏ của người khác.
   - Chưa có người ngoài dùng thử.
   - AFFiNE là đối thủ gần nhất về hướng "tự host và cộng tác" (73,9k sao GitHub), dù không lưu Markdown thuần.


## 6. Khác biệt của Noteriv: thật hay không

Lộ trình (mục 6) liệt kê khác biệt dự kiến. Kiểm từng cái (bản nháp bàn giấy 2026-10-26):

| Khác biệt dự kiến | App đối thủ cũng có | Còn là khác biệt? | Bằng chứng |
|---|---|---|---|
| Web + desktop cùng mã, cùng tính năng | AFFiNE (web và desktop), Notion, Logseq (web), Joplin (web qua Cloud) | **Không** | Mục 2, dòng "Nền tảng". Nhiều app đã có cả web lẫn desktop. Riêng Obsidian, app gần Noteriv nhất, không có web |
| Cộng tác thời gian thực trên Markdown thuần | Chưa thấy app nào có. Logseq DB có RTC (alpha) nhưng lưu SQLite; AFFiNE, Anytype, Notion cộng tác trên định dạng riêng | **Có**, nhưng mỏng: bản của Noteriv còn đơn giản | Mục 2, dòng "Định dạng lưu" và "Cộng tác thời gian thực" |
| Plugin chạy trong sandbox có phân quyền | Obsidian hoàn toàn không sandbox (chạy full quyền Node/Electron); Joplin và SiYuan không có phân quyền chi tiết; Logseq có iframe sandbox | **Có (mạnh so với Obsidian)** | Chi tiết mục 6.1 bên dưới. Obsidian không cô lập plugin; Noteriv có sandbox iframe cô lập và manifest quyền |
| Đồng bộ Git / WebDAV có sẵn | Joplin (WebDAV, Nextcloud, S3 miễn phí), SiYuan (S3/WebDAV, trả phí $64). Git có sẵn thì chưa thấy (Obsidian chỉ qua plugin) | **Một phần**: WebDAV thì không, Git thì có | Mục 2, dòng "Đồng bộ" |
| Tự host được | AFFiNE (miễn phí tới 10 seat), Anytype (mạng đồng bộ), Joplin Server (chỉ dùng cá nhân, phi thương mại), SiYuan (Docker, chỉ trình duyệt) | **Yếu**: có người làm được. Điểm khác của Noteriv là giấy phép MIT không ràng buộc dùng thương mại | Mục 2, dòng "Mô hình" và "Giấy phép" |
| Song ngữ Anh–Việt | Obsidian, Logseq, Joplin, SiYuan có tiếng Việt (bản dịch cộng đồng Crowdin/Weblate); Notion, Bear chưa có | **Lợi thế nội địa, không độc quyền** | Chi tiết mục 6.2 bên dưới. Noteriv có lợi thế song ngữ chuẩn chỉnh từ core dev, tài liệu và hỗ trợ trực tiếp tại Việt Nam |
| Mã hoá đầu-cuối (đối thủ có, Noteriv **chưa**) | Obsidian Sync, Anytype, SiYuan, Joplin, Logseq DB sync | **Điểm kém** của Noteriv, không phải khác biệt (G14 để Chặng 6) | Mục 2, dòng "Đồng bộ" |
| Một bộ ba web + desktop + Android, cùng Markdown và Git | Obsidian (không web), Joplin (web qua Cloud trả phí), Logseq | **Yếu** | Mục 2, dòng "Nền tảng" |

### 6.1. Chi tiết xác minh: Cơ chế cô lập (Sandbox) Plugin

Tra cứu tài liệu kiến trúc plugin của các đối thủ (2026-10-26):

1. **Obsidian (Không có sandbox)**:
   - *Kiến trúc*: Plugin của Obsidian được nạp và chạy trực tiếp trong tiến trình Chromium renderer của ứng dụng Electron với quyền Node.js/Electron đầy đủ.
   - *Rủi ro*: Plugin có thể đọc, ghi, xoá bất kỳ file nào trên máy người dùng (kể cả ngoài vault), gọi `child_process` chạy lệnh shell tùy ý, gửi dữ liệu ra Internet mà không cần người dùng duyệt quyền (`manifest.json` chỉ khai báo `id`, `name`, `version`, không có cơ chế permission prompt). Đây là vấn đề bảo mật chuỗi cung ứng (supply chain) thường xuyên được cộng đồng cảnh báo.
2. **Logseq (Có sandbox iframe)**:
   - *Kiến trúc*: Plugin chạy trong một `<iframe>` có thuộc tính `sandbox="allow-scripts"`, giao tiếp với ứng dụng Logseq qua `postMessage` RPC.
   - *Ưu/Nhược*: Tránh truy cập trực tiếp Node.js `fs`, nhưng trên bản desktop vẫn có các bridge API mở rộng nếu người dùng kích hoạt quyền nâng cao.
3. **Joplin (Có Facade API, cách ly một phần)**:
   - *Kiến trúc*: Plugin chạy trong tiến trình riêng hoặc Webview, chỉ được tương tác qua API facade `joplin.plugins.*`. Không cấp quyền truy cập Node `fs` trực tiếp trên web/mobile, nhưng trên desktop API vẫn cung cấp quyền đọc ghi file hệ thống tương đối rộng.
4. **SiYuan (Chạy qua WebSocket/HTTP API)**:
   - *Kiến trúc*: Plugin frontend chạy trên trình duyệt / Electron, giao tiếp với SiYuan Kernel (viết bằng Golang tại `localhost:6806`) qua HTTP/WebSocket API. Không có bảng phân quyền chi tiết (fine-grained permissions) hiển thị cho người dùng khi cài đặt.
5. **Noteriv**:
   - Kiến trúc 2 tầng: Core plugin chạy qua interface `@noteriv/plugin-api` được kiểm soát chặt chẽ; Third-party plugin chạy trong iframe cô lập (isolated iframe opaque origin, `sandbox="allow-scripts"`, không có quyền truy cập Node `fs` hay shell host) với manifest phân quyền rõ ràng (`vault:read`, `vault:write`, `editor:read`, `editor:write`, `ui:commands`, `ui:statusbar`, `ui:panel`, `markdown:render`). Người dùng có thể kiểm soát và thu hồi quyền từng plugin.
   - **Kết luận**: Đây là **khác biệt thật sự có giá trị**, đặc biệt khi so sánh trực diện với Obsidian.

### 6.2. Chi tiết xác minh: Hỗ trợ tiếng Việt

Tra cứu tình trạng hỗ trợ tiếng Việt trên 12 app đối thủ (2026-10-26):

| App | Hỗ trợ tiếng Việt? | Nguồn gốc bản dịch | Chất lượng & Đánh giá |
|---|---|---|---|
| **Obsidian** | Có | Cộng đồng (Crowdin) | Đạt ~85-90% chuỗi; một số thuật ngữ PKM chưa đồng nhất; tài liệu hướng dẫn chính thức bằng tiếng Anh |
| **Logseq** | Có | Cộng đồng (Crowdin/GitHub) | Đạt ~80%; một số menu mới và chế độ DB chưa dịch |
| **Joplin** | Có | Cộng đồng (Weblate) | Đạt ~75-80%; câu từ đôi chỗ dịch máy |
| **SiYuan** | Có | Core team + cộng đồng | Có tiếng Việt đầy đủ |
| **Notion** | **Chưa có** | Không hỗ trợ | Chỉ có tiếng Anh, Nhật, Hàn, Pháp, Đức, TBN, BĐN |
| **Bear** | **Chưa có** | Không hỗ trợ | Chỉ hỗ trợ tiếng Anh và vài ngôn ngữ lớn |
| **Apple Notes** | Có | Apple bản địa hoá | Chuẩn theo hệ điều hành iOS/macOS |
| **AFFiNE** | Một phần | Cộng đồng | Bản dịch tiếng Việt chưa hoàn thiện (~40%) |
| **Anytype** | Một phần | Cộng đồng (Crowdin) | Đạt ~60% chuỗi |
| **Noteriv** | **Có (Gốc 100%)** | Tác giả phát triển | Song ngữ Anh–Việt toàn diện (100% UI, lỗi, thông báo, tài liệu, tương thích mượt mà với các bộ gõ tiếng Việt phổ biến Unikey/EVKey/Gboard trên cả web/desktop/mobile, hỗ trợ người dùng bản địa) |

- **Kết luận**: Tiếng Việt **không phải là độc quyền tuyệt đối** so với toàn bộ thị trường, nhưng là **lợi thế cạnh tranh rất lớn** khi đánh vào người dùng Việt Nam đang dùng Notion (chưa có tiếng Việt) hoặc người dùng Obsidian/Logseq muốn trải nghiệm tài liệu, thuật ngữ chuẩn hóa và dịch vụ hỗ trợ bằng tiếng mẹ đẻ.

## 7. Kết luận phần đối thủ (viết ở Tuần 4)

- 3 đối thủ nguy hiểm nhất và vì sao.
- 3 khác biệt thật của Noteriv.
- 3 chỗ Noteriv kém rõ rệt cần lấp trước khi bán (hoặc chấp nhận).
- Gợi ý mức giá theo mặt bằng đối thủ.

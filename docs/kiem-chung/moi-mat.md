# Đánh giá mọi mặt

> Chặng K – Kiểm chứng ([kế hoạch](../plans/2026-10-20-chang-k-kiem-chung.md)). Mục 1 làm ở Tuần 0; mục 2–6 ở Tuần 3–5.
> Số liệu ghi kèm ngày đo / ngày tra và nguồn.

## 1. Số liệu nền (Tuần 0)

| Chỉ số | Giá trị | Ngày đo | Cách đo |
|---|---|---|---|
| Số tài khoản / vault / note trên production | Chưa đo: Claude không được đọc database production. Chủ dự án xem ở `/admin/stats` | | `/admin/stats` |
| Đĩa VPS dùng / còn | 95 GB / 145 GB (66%), còn 50 GB | 2026-10-26 | `df -h /` |
| RAM / swap dùng | RAM 4,8 / 7,8 GiB (còn khả dụng 3,0 GiB); swap 8,8 / 15 GiB | 2026-10-26 | `free -h` |
| RAM các container `noteriv-*` | Production khoảng 340 MiB cộng lại: api 76, worker 77, collab 55, postgres 50, web 39, redis 33, garage 6, pdf 2, backup 1. Dev (postgres, redis, garage) khoảng 12 MiB | 2026-10-26 | `docker stats --no-stream` |
| Dung lượng Garage (đính kèm) | | | |
| Kích thước bản sao lưu gần nhất | Bản sao thủ công gần nhất (`pre-5-5`, 2026-10-19) là 16,6 MB. Bản sao tự động đẩy lên repo `noteriv-backups`, chưa đo | 2026-10-26 | `ls /root/noteriv-manual-backups` |
| Thời gian mở vault thật của chủ dự án | | | Trình duyệt, tải lại trang, đến khi thấy cây thư mục |
| Số lỗi Sentry 7 ngày qua | | | Sentry |
| Uptime 30 ngày | | | UptimeRobot |

## 2. Kỹ thuật

- **Hiệu năng**: kết quả kịch bản 16–17 ([kich-ban.md](kich-ban.md)); so với ngân sách ở `docs/perf/2026-10-17-after-phase2.md`.
  - 2026-10-26: các việc thường ngày (cây thư mục ~1,7–2,4 s, mở note 0,1–0,3 s, tìm kiếm ~1,5 s) gần như không đổi từ 2.000 lên 10.000 note. Vấn đề nghẽn plugin quét vault ([loi-va-gop-y.md](loi-va-gop-y.md) #5) đã được giải quyết triệt để ở PR #51 bằng batch note reading (`POST /:vid/notes/batch` và `readAll`/`readBatch`), đưa thời gian tải đồ thị từ chỗ bị timeout > 240 s xuống còn **3,86 s** (vault 2.000 note) và **6,39 s** (vault 10.000 note / 4.750 note thực tế); bộ nhớ JS heap duy trì ổn định 17–54 MB.
- **Bảo mật**: chạy `/security-review` trên mã hiện tại; liệt kê phát hiện theo mức; mục Chặn/Nặng vào [loi-va-gop-y.md](loi-va-gop-y.md).
  - 2026-10-26: rà soát chỉ đọc code (server, web, desktop, phone). Mức rủi ro tổng thể **cao** trước khi mở đăng ký: 3 lỗ Nghiêm trọng và 1 Cao ở worker sync (đã vá trong [phiên K-B1](../plans/2026-10-26-phien-k-b1-bao-mat-server.md), PR #47, qua 2 lượt review), 2 Cao ở desktop, 5 Trung bình, 6 Thấp ([loi-va-gop-y.md](loi-va-gop-y.md) #6–#8). Thấy ổn: phân quyền theo vault (không thấy IDOR), mã hoá credentials, SQL có tham số, token email, plugin sandbox, sanitize markdown. Báo cáo đầy đủ **không để trong repo công khai** (mô tả lỗ chưa vá): giữ ở máy chủ dự án, `~/.config/noteriv/bao-mat-2026-10-26.md`.
- **Độ tin cậy**: số lỗi Sentry theo tuần, sự cố/downtime trong 6 tuần.
- **Nợ kỹ thuật đã biết** (đánh giá: có cần trả trước khi bán không):

| Mục | Ảnh hưởng | Cần trước khi bán? |
|---|---|---|
| Nâng Prisma 7 | | |
| Garage trên VPS chỉ ~3 GB | | |
| Cộng tác thay cả văn bản, chưa ghép từng thao tác (không giữ con trỏ người khác) | | |
| Desktop chưa gửi lỗi về Sentry | | |
| Ký mã desktop Windows/macOS | | |
| Lockfile tạo trên Windows, CI phải `npm install` | | |

## 3. Vận hành và chi phí

Chi tiết, nguồn và giả định: [chi-phi.md](chi-phi.md) (2026-10-26). Tóm tắt: khoảng €37 / €63 / €104 mỗi tháng ở 100 / 1.000 / 10.000 người đăng ký (€0,37 / €0,06 / €0,01 mỗi người); khi còn ít người, khoản lớn nhất là ký mã desktop (~€25/tháng). Azure Trusted Signing không cấp cho pháp nhân/cá nhân Việt Nam. Tỷ giá quy đổi giả định: 1 € ≈ 1,16 US$ ≈ 27.000 VNĐ.

Ước tính chi phí **mỗi tháng** khi chạy trên máy chủ riêng (Chặng 6.3):

| Hạng mục | 100 người dùng | 1.000 người | 10.000 người | Nguồn giá, ngày tra (2026-10-26) |
|---|---|---|---|---|
| **Máy chủ** (Hetzner Cloud, EU: NBG1/HEL1) | CX33 (4 vCPU, 8 GB, 80 GB) **€8,99** | CX43 (8 vCPU, 16 GB, 160 GB) **€16,49** | CX53 (16 vCPU, 32 GB, 320 GB) **€29,99** | Hetzner Cloud Pricing (Cost-Optimized x86) |
| **Lưu trữ đính kèm** (Cloudflare R2) | 5 GB: **$0** (trong mức miễn phí) | 50 GB: **$0,60** (≈ €0,52) | 500 GB: **$7,35** (≈ €6,34) | Cloudflare R2 ($0,015/GB-tháng, 10 GB free, 0đ egress) |
| **Email giao dịch** (Resend) | 300 email: **$0** (Free tier) | 3.000 email: **$20** (≈ €17,24) | 30.000 email: **$20** (≈ €17,24) | Resend (Free 3.000/th trần 100/ngày; Pro $20 cho 50.000/th) |
| **Theo dõi lỗi** (Sentry) | Developer: **$0** | Developer: **$0** | Team: **$26** (≈ €22,41) | Sentry Pricing (trả theo năm) |
| **Sao lưu ngoài** (Hetzner Storage Box) | BX11 (1 TB) **€3,20** | BX11 (1 TB) **€3,20** | BX11 (1 TB) **€3,20** | Hetzner Storage Box BX11 |
| **Tên miền & Ký mã desktop** (chia đều theo tháng) | **≈ €25,28** | **≈ €25,28** | **≈ €25,28** | CF Registrar ($10,46/năm ≈ €0,75/th) + Certum Cloud OV (€209/năm ≈ €17,42/th) + Apple Dev ($99/năm ≈ €7,11/th) |
| **Tổng chi phí / tháng** | **≈ €37,47** (~1.010.000 ₫) | **≈ €62,73** (~1.700.000 ₫) | **≈ €104,46** (~2.820.000 ₫) | Chi tiết tại [chi-phi.md](chi-phi.md) |
| **Tổng chi phí (nếu hoãn ký mã desktop)** | **≈ €12,94** (~350.000 ₫) | **≈ €38,20** (~1.030.000 ₫) | **≈ €79,93** (~2.160.000 ₫) | Chỉ chạy bản Web/PWA và APK Android |
| **Chi phí / người dùng / tháng** | **≈ €0,37** (chỉ web: €0,13) | **≈ €0,063** (chỉ web: €0,038) | **≈ €0,010** (chỉ web: €0,008) | Giảm mạnh theo tính kinh tế quy mô |

Thời gian vận hành dự kiến của một người mỗi tuần (ước tính): ~2–3 giờ ở 100 người (xem lỗi Sentry, kiểm tra sao lưu, giải đáp 1–2 email); ~5–7 giờ ở 1.000 người (hỗ trợ, kiểm tra tài nguyên, cập nhật bảo mật); ~15–20 giờ ở 10.000 người (cần tự động hoá cao và script hỗ trợ).

## 4. Pháp lý

- **Nhãn hiệu**: Khảo sát sơ bộ 10 tên ứng viên trên các cơ sở dữ liệu USPTO (Mỹ), WIPO Global Brand Database, EUIPO (Châu Âu), trạng thái tên miền (`.com`, `.app`, `.io`), và độ trùng lặp trên GitHub/App Store. **Chỉ tra cứu và ghi nhận rủi ro, chưa chốt chọn** (sẽ quyết định ở Chặng 6.1).

| Tên ứng viên | USPTO (Mỹ, Class 9/42) | WIPO / Quốc tế | EUIPO (Châu Âu) | Tên miền .com | .app / .io | Độ trùng Store / GitHub | Đánh giá & Ghi chú |
|---|---|---|---|---|---|---|---|
| **Noteriv** (Hiện tại) | Trống | Trống | Trống | Đã sở hữu / giá chuẩn | Khả dụng | Duy nhất trên GitHub/Store | Âm hưởng hiện đại ("Note" + "River/Derive"), nhưng người Việt dễ phát âm cụt hoặc nhầm ("nốt-ríp") |
| **Rivnote** | Trống | Trống | Trống | Parked (domain investor) | Khả dụng | Chưa có app nổi bật | Đảo của Noteriv; phát âm xuôi tai, mượt mà hơn ("Dòng chảy ghi chú") |
| **Vannote** | Trống nhóm phần mềm PKM | Trống | Trống | Bị giữ giá cao | .app khả dụng, .vn khả dụng | Chưa có app lớn | Thân thuộc với người Việt ("Văn" = văn bản, tri thức, tư duy). 2 âm tiết ngắn gọn, dễ gọi |
| **Mindriv** | Trống | Trống | Trống | Khả dụng giá chuẩn | Khả dụng | Trống | "Mind" + "River" (Dòng chảy tâm trí, Second Brain). Rất sát định vị PKM |
| **Notesmith** | Đơn cũ đã huỷ (abandoned) | Trống | Trống | Bị giữ giá cao | .app khả dụng | Có một vài repo nhỏ | Tên tiếng Anh cổ điển, sang trọng ("Thợ rèn ghi chú"), nhưng khó lấy tên miền .com giá rẻ |
| **Truenote** | **Rủi ro cao** (Lenovo/Toshiba từng đăng ký cho tablet stylus) | Có đăng ký cũ | Có đăng ký | Đã sở hữu | Đã có chủ | Nhiều app trùng tên | Ý nghĩa hay ("Ghi chú chân thực, local-first"), nhưng rủi ro tranh chấp pháp lý nhãn hiệu công nghệ tại Mỹ |
| **Markflow** | Trống nhóm PKM cá nhân | Trống | Trống | Bị giữ giá cao | .app khả dụng | Vài repo nhỏ | Gợi nhớ trực tiếp Markdown và dòng chảy liền mạch. Hợp với đối tượng dev/tech |
| **Kienote** | Trống | Trống | Trống | Khả dụng giá chuẩn | .app / .vn khả dụng | Trống | Từ gốc "Kiến" (Kiến tạo, Kiến thức) + "Note". Độc đáo, có bản sắc văn hoá Việt nhưng vẫn quốc tế |
| **CaissaNote** | Trống | Trống | Trống | Khả dụng | Khả dụng | Trống | Đặt theo tên Nữ thần cờ vua Caïssa. Tên hoàn hảo nếu chọn **Ngách cờ vua** (Chess PKM) |
| **Vietnote** | Trống ở USPTO/EUIPO | Trống | Trống | Đã sở hữu | Khả dụng | Có app Android nhỏ | Định vị hoàn toàn nội địa Việt Nam; khó mở rộng bán cho thị trường quốc tế |

- **Giấy phép**: MIT cho phép kinh doanh thương mại; điều kiện giữ nguyên ghi công (`LICENSE`, `NOTICE.md`).
- **Nghiên cứu đối thủ**: [Điều khoản của Obsidian](https://obsidian.md/terms) (cập nhật 2025-02-20, tra 2026-10-22) cấm dịch ngược và cấm dùng phần mềm để làm sản phẩm cạnh tranh. Ngày 2026-10-22, một lần chạy REA trên `obsidian.asar` đã dừng ngay lúc bắt đầu và kết quả đã xoá. **Quy tắc:** chỉ nghiên cứu đối thủ qua nguồn công khai (tài liệu, changelog, bảng giá, API công khai), không dịch ngược app độc quyền, không chép giao diện hay chữ. Áp dụng cho cả 12 app trong [doi-thu.md](doi-thu.md). Chi tiết: [obsidian-cong-khai.md](obsidian-cong-khai.md) mục 1.
- **Đã tra 2026-10-26, chi tiết ở [phap-ly.md](phap-ly.md):** Stripe chưa mở cho pháp nhân Việt Nam; Lemon Squeezy và Polar.sh có trả tiền về Việt Nam, Paddle chưa xác minh; Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 thay Nghị định 13/2023 từ 01/01/2026; có 13 câu hỏi cho kế toán/luật sư.
- **Thanh toán quốc tế từ Việt Nam**: Dùng mô hình Merchant of Record (MoR) như **Polar.sh** (gói Starter 5% + 50¢ hoặc Pro 3,8% + 40¢, hỗ trợ payouts về tài khoản ngân hàng Việt Nam, chuyên cho dev/open source) hoặc **Lemon Squeezy** (5% + 50¢). MoR chịu trách nhiệm tính và nộp thuế VAT/sales tax tại 100+ quốc gia, giúp một cá nhân tại Việt Nam bán phần mềm hợp pháp mà không phải tự đăng ký thuế ở từng nước.
- **Nghĩa vụ thuế tại Việt Nam**: Cần tham vấn kế toán theo 13 câu hỏi ở [phap-ly.md](phap-ly.md): thu nhập từ MoR chuyển về tài khoản cá nhân kê khai thuế TNCN (hoạt động kinh doanh 5% VAT + 2% TNCN) hay cần lập hộ kinh doanh / công ty TNHH để xuất hoá đơn hợp thức hoá chi phí máy chủ và chứng chỉ ký mã.
- **Dữ liệu cá nhân**: `/privacy`, `/terms` đã có từ 5.6; cập nhật bổ sung theo Luật 91/2025/QH15 (hiệu lực 01/01/2026) về quyền rút lại sự đồng ý, quyền yêu cầu xoá vĩnh viễn dữ liệu cá nhân và nhật ký đồng thuận.

## 5. Kinh doanh

- **Giả thuyết giá theo mặt bằng đối thủ** (tham chiếu [doi-thu.md](doi-thu.md)):
  - *Obsidian*: App miễn phí offline; Obsidian Sync: $4/tháng (thanh toán năm) hoặc $5/tháng (thanh toán tháng); Publish: $8–$10/tháng; Commercial license: $50/user/năm.
  - *Notion*: Free cơ bản; Plus $10/user/tháng (thanh toán năm) hoặc $12/tháng; Business $15–$18/user/tháng.
  - *Joplin Cloud*: Basic €1,99/tháng; Pro €5,99/tháng (~$6,5); Teams €7,99/user/tháng.
  - *SiYuan*: App offline miễn phí; Cloud sync $64 trọn đời một lần hoặc $8/tháng.
  - *Bear*: Bear Pro $2,99/tháng hoặc $29,99/năm (sync iCloud).

- **Đề xuất cơ cấu 3 gói cước cho Noteriv**:
  1. **Gói Khởi đầu / Tự host (Community / Free / Self-host)**: **0 ₫ / $0**
     - Mã nguồn mở giấy phép MIT, người dùng tự host server không giới hạn tài khoản.
     - Trên cloud chính thức của Noteriv: Tối đa 2 vault, 300 MB đính kèm, sync Git/WebDAV cá nhân, không hỗ trợ cộng tác thời gian thực nhiều người.
  2. **Gói Cá nhân Pro (Personal Pro)**:
     - Giá quốc tế: **$3/tháng** (hoặc $30/năm = $2,5/tháng) — rẻ hơn Obsidian Sync ($4–$5) và Joplin Pro (€5,99), tạo lợi thế cạnh tranh về giá.
     - Giá nội địa Việt Nam: **49.000 ₫ / tháng** (hoặc 499.000 ₫ / năm) — mức giá bình dân tương đương 1 ly cà phê, phù hợp học sinh, sinh viên, lập trình viên và người dùng cá nhân tại Việt Nam.
     - Quyền lợi: Không giới hạn số vault, 10 GB lưu trữ đính kèm trên Cloudflare R2, cộng tác thời gian thực (RTC Yjs), khôi phục lịch sử snapshot 90 ngày, ưu tiên băng thông worker sync, hỗ trợ kỹ thuật qua email.
  3. **Gói Đội nhóm / CLB Cờ vua (Team / Chess Club)**:
     - Giá quốc tế: **$7 / user / tháng**.
     - Giá nội địa Việt Nam: **99.000 ₫ / user / tháng**.
     - Quyền lợi: Vault dùng chung không giới hạn thành viên, phân quyền Admin/Editor/Viewer, 50 GB lưu trữ nhóm, tính năng cờ vua tương tác nâng cao (bàn cờ phân tích ván đấu PGN, bài tập chiến thuật phục vụ huấn luyện viên và học viên cờ vua).

- **Điểm hoà vốn (Break-even Analysis)**:
  - Dựa trên chi phí vận hành ở mục 3 ([chi-phi.md](chi-phi.md)):
    - **Mốc 1: Hoà vốn chi phí tiền mặt vận hành cơ bản (Chưa ký mã desktop)**:
      - Chi phí VPS Hetzner CX33 + R2 + Backup + Domain: ≈ €12,94/tháng (~350.000 ₫/tháng).
      - Chỉ cần **8 người dùng Pro Việt Nam (49.000 ₫/tháng)** hoặc **5 người dùng Pro quốc tế ($3/tháng)** là hệ thống tự duy trì tiền mặt!
    - **Mốc 2: Hoà vốn toàn bộ bao gồm cả Ký mã desktop Windows & macOS**:
      - Tổng chi phí hạ tầng + Certum Cloud OV (€17,42) + Apple Dev Program (€7,11): ≈ €37,47/tháng (~1.010.000 ₫/tháng).
      - Cần **21 người dùng Pro Việt Nam (49.000 ₫/tháng)** hoặc **14 người dùng Pro quốc tế ($3/tháng)** để trang trải 100% chi phí.
    - **Mốc 3: Hoà vốn ở quy mô 1.000 người đăng ký**:
      - Chi phí vận hành máy chủ CX43 + Resend Pro + Ký mã: ≈ €62,73/tháng (~1.700.000 ₫/tháng).
      - Cần **35 người trả tiền gói 49.000 ₫** hoặc **23 người trả tiền gói $3/tháng**.
      - Tỷ lệ chuyển đổi cần thiết: 35 / 1.000 = **3,5%** — hoàn toàn nằm trong mức khả thi của mô hình SaaS Freemium (chuẩn ngành thường đạt 2% – 5%).

  > **Lưu ý về Doanh thu Danh nghĩa (Gross) vs Thực thu ròng (Net)**: Các con số trên là điểm hoà vốn danh nghĩa (Gross: `Chi phí / Giá niêm yết`). Khi tính thực thu ròng (Net) sau khi trừ phí Merchant of Record / cổng thanh toán (5%–15%) và dự phòng nghĩa vụ thuế (VAT/TNCN ~7%), số lượng khách hàng thực tế cần để trang trải 100% dòng tiền ở Mốc 2 là khoảng **25–28 người dùng Pro Việt Nam** hoặc **17–19 người dùng Pro quốc tế**.

- **Chiến lược: Sản phẩm chung vs Phiên bản Cờ vua làm ngách đầu tiên**:
  - *Sản phẩm ghi chú chung*: Quy mô thị trường toàn cầu rất lớn, nhưng phải đối đầu trực tiếp với các kỳ lân công nghệ (Obsidian, Notion, Apple Notes). Chi phí marketing để có khách hàng đầu tiên (CAC) rất cao nếu không có sẵn cộng đồng.
  - *Phiên bản cờ vua (Chess PKM)*:
    - **Lợi thế độc quyền của chủ dự án**: Đang trực tiếp vận hành trung tâm cờ vua, có sẵn hàng trăm học viên, phụ huynh và mối quan hệ trong liên đoàn cờ. Hiểu sâu sắc nỗi đau của người chơi cờ (phần mềm ChessBase quá đắt và cổ lỗ sĩ; Lichess Study tốt nhưng không phải hệ thống ghi chú cá nhân dạng sổ tay Markdown).
    - **Chuyển đổi tức thì**: Có thể đóng gói kèm gói học phí cờ vua (ví dụ: tặng 3 tháng Pro cho học viên, sau đó thu 49k–99k/tháng để lưu giáo trình, ván đấu phân tích). Đạt ngay 30–50 người dùng trả tiền đầu tiên mà không mất chi phí quảng cáo.
    - **Khuyến nghị chiến lược**: Áp dụng chiến lược "Bàn đạp cờ vua" (Beachhead Strategy) — dùng ngách cờ vua để kiểm chứng sản phẩm, nuôi sống chi phí hạ tầng và đạt điểm hoà vốn trước (Chặng K / 6.1), sau đó hoàn thiện và mở rộng ra thị trường ghi chú chung.

- **Kênh tiếp cận khả thi cho một solo developer**:
  1. *Kênh ngách cờ vua*: Học viên trung tâm cờ vua của chủ dự án, các diễn đàn cờ vua Việt Nam, nhóm cờ vua Lichess/Chess.com Việt Nam.
  2. *Kênh lập trình viên & người dùng kỹ thuật*: Show HN (Hacker News), r/ObsidianMD, r/PKM, cộng đồng J2TEAM, các nhóm lập trình viên Việt Nam (nhấn mạnh yếu tố: mã nguồn mở MIT, tự host được, hỗ trợ tiếng Việt mượt mà, cộng tác thời gian thực trên Markdown thuần).
  3. *Kênh ra mắt sản phẩm*: Product Hunt (khi đã hoàn thiện ổn định bản release).

- **Giới hạn kiểm chứng**: Hiện tại chỉ có một người dùng thử nội bộ nên chưa có dữ liệu thực nghiệm về tỷ lệ chuyển đổi và mức sẵn lòng chi trả tiền mặt thực tế. Cần đợt thử nghiệm kín (Closed Beta) với 20–30 người dùng thật ở Chặng 6.1.

## 6. Năng lực

Đánh giá thực tế tính khả thi của mô hình vận hành "1 người + AI" (2026-10-26):

| Câu hỏi cốt tử | Đánh giá & Phương án giải quyết |
|---|---|
| **Một người + AI có kham nổi hỗ trợ khách (email, lỗi) ở 100 / 1.000 người dùng?** | **Có thể kham nổi**, nếu có kỷ luật và công cụ tự động:<br>• Ở 100 người dùng: Lượng yêu cầu khoảng 1–2 email/tuần, xử lý trong 15–30 phút.<br>• Ở 1.000 người dùng: Dự kiến 5–10 yêu cầu/tuần. Áp dụng AI (Claude/Gemini) hỗ trợ tự động đọc email, tra cứu tài liệu FAQ và soạn sẵn bản nháp phản hồi; chủ dự án chỉ cần kiểm duyệt và bấm gửi (ước tính ~3–5 giờ/tuần).<br>• Xây dựng hệ thống tài liệu hướng dẫn (Docs/FAQ) chi tiết bằng tiếng Việt để người dùng tự xử lý các vấn đề cơ bản. |
| **Ai xử lý sự cố đêm / khi chủ dự án bận?** | **Thiết lập hạ tầng tự phục hồi (Self-healing)**:<br>• Docker compose cấu hình `restart: unless-stopped` và healthcheck tự động khởi động lại container khi bị lỗi hoặc tràn RAM.<br>• UptimeRobot hoặc Better Uptime giám sát cổng HTTP 24/7, tự động gửi cảnh báo khẩn qua Telegram/SMS.<br>• Không cam kết SLA 99,99% của doanh nghiệp lớn; chấp nhận mức SLA 99,5% cho giai đoạn đầu (cho phép bảo trì hoặc gián đoạn vài giờ ban đêm nếu có sự cố VPS phần cứng). Công khai trang Status minh bạch. |
| **Cập nhật bảo mật phụ thuộc (Next, Fastify, …) mất bao lâu mỗi tháng?** | **Khoảng 2–4 giờ mỗi tháng**:<br>• Hệ thống CI GitHub Actions hiện tại đã rất hoàn chỉnh (tự động chạy 695 test cases, typecheck TypeScript toàn diện và build kiểm tra cả desktop lẫn phone).<br>• Bật Dependabot / Renovate tự động tạo PR cập nhật dependencies định kỳ. Chủ dự án dùng AI subagent rà soát changelog, chạy test và merge PR an toàn. |
| **Cần thêm người / dịch vụ gì?** | **Chưa cần thuê thêm nhân sự toàn thời gian (full-time)**. Cần các dịch vụ bổ trợ sau:<br>1. *Dịch vụ Merchant of Record (MoR)*: Polar.sh hoặc Lemon Squeezy để xử lý thanh toán, hoá đơn và nghĩa vụ thuế quốc tế.<br>2. *Kế toán thuế dịch vụ tại Việt Nam*: Thuê dịch vụ ngoài (~1–2 triệu ₫/quý) để hỗ trợ kê khai thuế thu nhập đúng quy định.<br>3. *Dịch vụ sao lưu ngoài độc lập*: Hetzner Storage Box hoặc Backblaze B2 đề phòng cháy nổ trung tâm dữ liệu chính. |

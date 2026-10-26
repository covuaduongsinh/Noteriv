# Chi phí vận hành theo quy mô

> Chặng K, mục 3 của [moi-mat.md](moi-mat.md). Nghiên cứu bàn giấy ngày 2026-10-26, chỉ dùng nguồn công khai; giá có thể đã đổi, kiểm lại trước khi đặt mua.


Tình trạng: desk research, chỉ dùng nguồn công khai. Ngày kiểm giá: **2026-10-26** (riêng giá tên miền lấy từ một trang tổng hợp cập nhật ngày 2026-10-21). Giá **chưa gồm VAT**. Mô hình vận hành: một server riêng, không dùng chung.
Tỷ giá dùng để cộng: **1 € = 1,16 US$**. Tỷ giá này là giả định, **chưa xác minh**, chỉ dùng để cộng các khoản lại với nhau.

## 1. Giả định quy mô (chọn mức thận trọng)

| Giả định | 100 | 1.000 | 10.000 | Ghi chú |
|---|---|---|---|---|
| Hoạt động trong tháng (MAU) | 40% = 40 | 40% = 400 | 40% = 4.000 | Đặt cao hơn mức thường gặp của app ghi chú để có dư địa |
| Đồng thời lúc cao điểm | 5% = 5 | 5% = 50 | 5% = 500 | Tính theo số đăng ký. Mỗi người mở khoảng 1–2 tài liệu Yjs |
| Ghi chú / người | 300 × ~4 KB | như cột trước | như cột trước | Cộng thêm trạng thái/lịch sử Yjs và chỉ mục, nhân hệ số ×4: **khoảng 5 MB/người trong Postgres** |
| Dung lượng Postgres | ~0,5 GB | ~5 GB | ~50 GB | Chỉ đúng nếu có nén cập nhật Yjs định kỳ. Không nén thì có thể gấp nhiều lần |
| Đính kèm / người (gói Free, trần 1 GiB) | 50 MB | 50 MB | 50 MB | Tính cho **mọi** người đăng ký, không chỉ người hoạt động, nên là mức thận trọng |
| Tổng đính kèm | 5 GB | 50 GB | 500 GB | |
| Lưu lượng tải đính kèm ra / tháng | ≈ tổng lưu trữ | ≈ tổng lưu trữ | ≈ tổng lưu trữ | |
| Thao tác S3 / người hoạt động / tháng | 100 ghi + 1.000 đọc | như cột trước | như cột trước | |
| Email / người đăng ký / tháng | 3 | 3 | 3 | Gồm xác minh, đặt lại mật khẩu, lời mời chia sẻ, thông báo. Không có bản tin marketing. → 300 / 3.000 / 30.000 email |
| RAM | 340 MiB cho 1 người (số đo prod) | | | Cộng thêm: Dokploy/Traefik khoảng 0,5 GB (ước tính), PDF worker lúc render khoảng 0,3–0,5 GB, Yjs khoảng 2–5 MB mỗi tài liệu đang mở, Postgres `shared_buffers` khoảng 25% RAM |

Ước lượng RAM: 100 người cần khoảng 2 GB, 1.000 người khoảng 3–4 GB, 10.000 người khoảng 8–12 GB. Đây là **ước tính chưa qua load test**. Mỗi bậc chọn server có RAM gấp khoảng 2–3 lần mức ước tính.

## 2. Bảng chi phí theo tháng

| Hạng mục | 100 người | 1.000 người | 10.000 người |
|---|---|---|---|
| **Máy chủ** (Hetzner Cloud, EU: NBG1/HEL1) | CX33 (4 vCPU, 8 GB, 80 GB) **€8,99** | CX43 (8 vCPU, 16 GB, 160 GB) **€16,49** | CX53 (16 vCPU, 32 GB, 320 GB) **€29,99** |
| Phương án Hetzner dedicated | (thừa) | (thừa) | AX41 (Ryzen 5 3600, 64 GB) €59,00, phí cài đặt €0 |
| Phương án DigitalOcean (Basic) | 4 GiB / 2 vCPU $24 | 8 GiB / 4 vCPU $48 | 16 GiB / 8 vCPU $96 (chỉ 16 GiB) |
| Phương án OVH VPS (giá "từ") | VPS-2 (8 GB) €7,21 | VPS-3 (12 GB) €10,40 | VPS-4 (24 GB) €19,96 |
| **Lưu trữ đính kèm** (chọn R2) | 5 GB, nằm trong mức miễn phí: **$0** | 40 GB tính phí × $0,015 = **$0,60** (≈ €0,52) | 490 GB × $0,015 = **$7,35** (≈ €6,34) |
| – Backblaze B2 | $0 | 40 GB × $0,00695 = $0,28 | 490 GB × $0,00695 = $3,41 |
| – Hetzner Object Storage | €6,49 (tối thiểu, gồm 1 TB) | €6,49 | €6,49 |
| **Email** (Resend) | 300 email: Free **$0** | 3.000 email: chạm trần Free (3.000/tháng, 100/ngày), nên dùng Pro **$20** (≈ €17,24) | 30.000 email: Pro **$20** (≈ €17,24) |
| **Theo dõi lỗi** (Sentry) | Developer **$0** | Developer **$0** | Team **$26** trả theo năm, $29 trả theo tháng (≈ €22,41) |
| **Sao lưu** (Hetzner Storage Box) | BX11 1 TB **€3,20** | BX11 **€3,20** | BX11 **€3,20** |
| **Tên miền + ký mã** (chia đều theo tháng) | **≈ €25,28** | **≈ €25,28** | **≈ €25,28** |
| **Tổng / tháng** | **≈ €37,47** | **≈ €62,73** | **≈ €104,46** |
| Tổng nếu chỉ chạy web, không ký mã desktop | ≈ €12,94 | ≈ €38,20 | ≈ €79,93 |
| **Chi phí / người dùng / tháng** | **≈ €0,37** (chỉ web: €0,13) | **≈ €0,063** (chỉ web: €0,038) | **≈ €0,010** (chỉ web: €0,008) |
| Kịch bản thận trọng hơn ở 10.000: thêm CX43 riêng cho Postgres | | | +€16,49, tổng **≈ €120,95** (≈ €0,012/người) |

Khoản "Tên miền + ký mã" tách ra như sau:

| Khoản | Giá năm | Giá tháng |
|---|---|---|
| Tên miền .com qua Cloudflare Registrar | $10,46/năm | $0,87 (≈ €0,75) |
| Certum Standard Code Signing in the Cloud | €209 (từ 27/02/2026 mỗi chứng chỉ có hạn tối đa 459 ngày) | €17,42 |
| Apple Developer Program | $99/năm | $8,25 (≈ €7,11) |

## 3. Ghi chú về giá và lựa chọn

- **Hetzner Cloud**: dòng CX (Cost-Optimized) rẻ nhất, giá đã gồm IPv4 và 20 TB lưu lượng. Lưu lượng vượt mức tính €1/TB.
  - Tại thời điểm kiểm, nút "Create" của cả dòng CX lẫn CPX đều báo *"This product is currently unavailable"*. Đây là rủi ro về khả năng thuê được server, cần kiểm lại trước khi đặt.
  - Dòng CPX ở EU đắt hơn hẳn: CPX32 8 GB €35,99.
  - Dòng CCX (vCPU riêng) bắt đầu từ CCX13 8 GB €43,49.
  - Tính năng Backup của Hetzner Cloud ghi giá "từ €1,198/tháng". Con số này bằng 20% của €5,99 nên có vẻ tính theo 20% giá server. Đây là suy luận của tôi, **chưa xác minh**.
- **AX41** rẻ trên mỗi GB RAM. Đổi lại phải tự lo hỏng ổ cứng, không có snapshot, và chỉ nâng cấp được bằng cách chuyển sang máy khác. Nên cân nhắc khi vượt khoảng 10.000 người.
- **Giá OVH** là giá "từ". Điều kiện kèm theo (cam kết thời hạn, khu vực) **chưa xác minh**.
- **Gói DigitalOcean Basic** 32 GiB không có trong bảng đã đọc: **chưa xác minh**.
- **Lưu trữ đính kèm**:
  - R2: lưu trữ $0,015/GB-tháng, miễn phí 10 GB, 1 triệu thao tác loại A và 10 triệu thao tác loại B mỗi tháng, **không tính phí egress**. Với giả định ở mục 1, thao tác luôn nằm trong mức miễn phí.
  - B2: $6,95/TB ($0,00695/GB), miễn phí 10 GB, egress miễn phí tới 3 lần dung lượng lưu trữ trung bình. B2 rẻ nhất khi lên 10.000 người.
  - Hetzner Object Storage: €6,49/tháng gồm 1 TB lưu trữ và 1 TB egress. Không tính phí thao tác, nhưng mọi object dưới 64 KB bị tính như 64 KB. Phương án này hợp lý nếu muốn dữ liệu ở cùng trung tâm dữ liệu EU với server.
- **Resend**: gói Free cho 3.000 email/tháng, giới hạn 100 email/ngày, 3 tên miền, và **dừng gửi khi chạm trần**. Gói Pro $20 cho 50.000 email, vượt mức tính $0,90/1.000. Ở 1.000 người, một đợt đăng ký dồn dập có thể vượt 100 email/ngày, nên tôi tính Pro.
- **Sentry**: gói Developer miễn phí cho 1 người dùng, 5.000 lỗi, 5 triệu span, 50 replay, xem lại 30 ngày. Gói Team: $26/tháng nếu trả theo năm, $29 nếu trả theo tháng; gồm 50.000 lỗi, không giới hạn người dùng, xem lại 90 ngày.
- **Sao lưu**:
  - Bản dump hằng đêm đẩy lên một repo Git riêng vẫn ổn ở mức 100–1.000 người (dump 0,5–5 GB).
  - Ở mức 10.000 người, dump khoảng 50 GB thì **không còn hợp với Git** (vượt xa kích thước repo khuyến nghị). Nên chuyển sang `pg_dump` hoặc restic lên Storage Box.
  - Đính kèm nằm trên R2 cũng cần một bản sao ở nơi khác.
  - BX11 (1 TB, €3,20) đủ chứa 500 GB đính kèm cộng khoảng 7 bản dump.
- **Ký mã Windows**:
  - **Azure Artifact Signing** (tên mới của Trusted Signing): trang giá chính thức để trống số tiền ("$-"), nên giá **chưa xác minh**. Trang chỉ cho thấy hạn mức: gói Basic 5.000 chữ ký/tháng, gói Premium 100.000 chữ ký/tháng.
  - Quan trọng hơn: chứng chỉ Public Trust của Azure chỉ cấp cho **tổ chức** ở Mỹ, Canada, EU, Anh, Úc, New Zealand, Nhật, Hàn, Singapore, Thụy Sĩ, Na Uy, Israel, và cho **cá nhân** ở Mỹ hoặc Canada. Một pháp nhân hay cá nhân Việt Nam **không dùng được** Azure, trừ khi có pháp nhân ở các nước trên.
  - Vì vậy bảng tính theo Certum Standard Cloud (OV) €209. Gói Certum Open Source Cloud giá €49, nhưng chỉ áp dụng cho dự án mã nguồn mở, nên không hợp với một sản phẩm thương mại.
  - Chứng chỉ OV không xoá ngay cảnh báo SmartScreen; cảnh báo chỉ hết dần khi file đã tích luỹ đủ lượt tải.
- **Apple**: $99 cho mỗi năm thành viên. Cần cho notarization bản macOS. Khoản này bỏ được nếu chưa phát hành bản macOS.
- **Khoản cố định chiếm phần lớn chi phí khi ít người dùng.** Ký mã (khoảng €25/tháng) lớn hơn cả server ở mức 100 người. Nếu chưa phát hành desktop, có thể hoãn ký mã và chi phí giảm còn khoảng €13/tháng.

## 4. Thứ gì vỡ trước khi lớn lên, và khi nào thêm server

1. **RAM trên một VPS là thứ vỡ đầu tiên.** Next.js SSR, Fastify, Postgres, Redis, Yjs, PDF worker và Dokploy dùng chung RAM. PDF worker tạo đột biến lúc render, còn Yjs giữ tài liệu đang mở trong bộ nhớ. Khi hết RAM, kernel sẽ chọn giết một tiến trình (OOM killer), thường là Postgres hoặc Next.
   - Dấu hiệu cần nâng cấp: RAM thường trực trên 70%, có swap, p95 API trên khoảng 500 ms.
   - Cách xử lý rẻ nhất là nâng gói tại chỗ: CX33 → CX43 → CX53, mỗi bậc khoảng €7,5–13,5 mỗi tháng.
   - Các ngưỡng là ước tính. Cần load test (ví dụ k6 với 50 và 500 phiên Yjs đồng thời) để chốt.
2. **Bộ nhớ của collab server.** Mỗi tài liệu đang mở nằm trong RAM. Một tài liệu có lịch sử dài có thể nặng vài MB đến hàng chục MB.
   - Cần đặt thời gian giải phóng tài liệu khi không còn ai mở, giới hạn kích thước tài liệu, và nén cập nhật vào snapshot.
   - Khoảng 500 người đồng thời (mức 10.000 đăng ký): nên tách Yjs ra tiến trình hoặc server riêng. Một CX33 €8,99 là đủ.
3. **Dung lượng Postgres.** 50 GB ở mức 10.000 người vẫn vừa đĩa 320 GB của CX53. Thứ đau trước là **thời gian `pg_dump`/khôi phục**, và bảng cập nhật Yjs phình ra nếu không nén.
   - Trên khoảng 50–100 GB, hoặc khi CPU tranh chấp với app: chuyển Postgres sang **server riêng**. Một CX43 €16,49 tự quản lý, có sao lưu WAL (pgBackRest hoặc WAL-G) lên Storage Box.
   - Dịch vụ Postgres được quản lý thay hộ (managed):
     - DigitalOcean Managed PostgreSQL bắt đầu từ $15,15/tháng (1 GiB / 1 vCPU / 10 GiB), nhưng mức này quá nhỏ cho 10.000 người.
     - Giá các bậc lớn hơn và gói HA (nhiều node) **chưa xác minh**. Trang giá chỉ có bộ chọn thêm node, không ghi tổng.
     - Trong các trang giá Hetzner đã kiểm, tôi không thấy dịch vụ Postgres được quản lý.
4. **Khi nào thêm server thứ hai:**
   - Ở khoảng 3.000–5.000 người đăng ký (ước tính): tách DB ra (+€16,49), **hoặc** khi cần không bị gián đoạn lúc nâng cấp.
   - Ở khoảng 10.000 người trở lên: 2 server app phía sau Load Balancer cộng 1 server DB. Giá Load Balancer của Hetzner **chưa xác minh**.
   - Một server duy nhất vẫn là điểm hỏng đơn: nếu nó chết thì toàn bộ dịch vụ dừng. Phải có sao lưu bên ngoài đã được thử khôi phục từ ngày đầu.

## 5. Nguồn (kiểm ngày 2026-10-26)

- Hetzner Cloud Cost-Optimized (CX/CAX): https://www.hetzner.com/cloud/cost-optimized
- Hetzner Cloud Regular Performance (CPX): https://www.hetzner.com/cloud/regular-performance
- Hetzner Cloud General Purpose (CCX, backup): https://www.hetzner.com/cloud/general-purpose
- Hetzner dedicated AX: https://www.hetzner.com/dedicated-rootserver/matrix-ax/
- Hetzner Object Storage: https://www.hetzner.com/storage/object-storage/
- Hetzner Storage Box: https://www.hetzner.com/storage/storage-box/
- DigitalOcean Droplets: https://www.digitalocean.com/pricing/droplets
- DigitalOcean Managed Databases: https://www.digitalocean.com/pricing/managed-databases
- OVHcloud VPS: https://www.ovhcloud.com/en-ie/vps/
- Cloudflare R2: https://developers.cloudflare.com/r2/pricing/
- Backblaze B2: https://www.backblaze.com/cloud-storage/pricing
- Resend: https://resend.com/pricing
- Sentry: https://sentry.io/pricing/
- Azure Artifact Signing, giá (để trống): https://azure.microsoft.com/en-us/pricing/details/artifact-signing/
- Azure Artifact Signing, điều kiện quốc gia: https://learn.microsoft.com/en-us/azure/artifact-signing/quickstart
- Certum Code Signing: https://shop.certum.eu/code-signing.html
- Apple Developer Program: https://developer.apple.com/programs/enroll/
- Giá .com Cloudflare Registrar (trang tổng hợp không chính thức, cập nhật 2026-10-21): https://cfdomainpricing.com/

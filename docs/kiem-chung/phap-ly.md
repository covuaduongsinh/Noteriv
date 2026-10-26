# Pháp lý và thanh toán khi bán từ Việt Nam

> Chặng K, mục 4 của [moi-mat.md](moi-mat.md). Nghiên cứu bàn giấy ngày 2026-10-26, chỉ dùng nguồn công khai. **Không phải tư vấn pháp lý hay thuế**: các điểm mở được gom thành câu hỏi cho kế toán/luật sư ở cuối.


- Ngày kiểm tra mọi nguồn: **2026-10-26** (trừ khi ghi khác).
- Đây là bản **thu thập sự kiện**, không phải tư vấn pháp lý/thuế. Mọi điểm còn mở được chuyển thành câu hỏi ở cuối.
- "chưa xác minh" = chưa thấy nguồn chính thức xác nhận, hoặc nguồn chỉ là bên thứ ba/đối thủ.

---

## 1. Merchant of Record (MoR) và cổng thanh toán

### 1.1 Bảng so sánh

| Dịch vụ | Người bán ở Việt Nam có được không? | Cá nhân hay công ty | Rút tiền về VN | Phí công bố | Nguồn |
|---|---|---|---|---|---|
| **Stripe** (tài khoản Stripe thường) | **Không.** VN không có trong 51 quốc gia/khu vực, kể cả mục preview | — | — | — | [stripe.com/global](https://stripe.com/global) |
| **Stripe Managed Payments** (MoR của Stripe) | **Không.** Danh sách địa điểm doanh nghiệp được hỗ trợ: CA, US, ~30 nước châu Âu, AU, HK, JP, SG; không có VN | Phải qua vòng xét duyệt về "business type and geography"; không hỗ trợ tài khoản Express/Connect | — | Trang tài liệu không ghi phí. Bên thứ ba nói 3,5% + phí xử lý Stripe hoặc 5% + 0,50 USD (**chưa xác minh**, các nguồn mâu thuẫn nhau) | [eligibility](https://docs.stripe.com/payments/managed-payments/eligibility), [tổng quan](https://docs.stripe.com/payments/managed-payments) |
| **Lemon Squeezy** (Stripe mua lại tháng 7/2024) | Trang "Supported countries" có **VN trong danh sách nhận tiền qua ngân hàng** | Không ghi rõ | Chuyển khoản ngân hàng (VN có trong danh sách); PayPal "200+ countries" (VN không được nêu tên) | 5% + 50¢/giao dịch; giao dịch ngoài Mỹ "may encounter small additional fees" | [supported countries](https://docs.lemonsqueezy.com/help/getting-started/supported-countries), [pricing](https://www.lemonsqueezy.com/pricing) |
| **Paddle** | VN **không** nằm trong danh sách quốc gia "unsupported suppliers". Việc VN được chấp nhận là người bán: **chưa xác minh** trực tiếp | Không thấy nguồn công khai về cá nhân/hộ kinh doanh: **chưa xác minh** | Chuyển khoản wire hoặc Payoneer (có trang khác nhắc PayPal). Ngưỡng tối thiểu 100 USD. Có thể mất phí SWIFT 15 USD ở một số nước | 5% + 50¢/giao dịch checkout, không phí tháng | [unsupported countries](https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle), [pricing](https://www.paddle.com/pricing), [get paid](https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid), [payout fee](https://paddle.com/help/manage/get-paid/is-there-a-fee-taken-for-payouts) |
| **FastSpring** | Không công bố danh sách nước của người bán: **chưa xác minh** | Form báo giá yêu cầu tên công ty, nước đặt trụ sở và email doanh nghiệp | Payouts Portal: chuyển khoản ngân hàng ở 90+ nước, 55 loại tiền; **không hỗ trợ Payoneer**. Phí rút tiền chỉ xem được sau khi đăng nhập | Báo giá riêng theo doanh số, không công bố % | [pricing](https://fastspring.com/pricing/), [payout portal](https://developer.fastspring.com/docs/payout-portal) |
| **Polar.sh** | **Có.** VN có trong danh sách nước nhận tiền qua **Stripe Connect Express** (sản phẩm này khác Stripe Payments thường) | Cá nhân được phép "given that Stripe Connect Express supports individual as a business type in your region". Riêng với VN: **chưa xác minh** | Stripe Connect Express (chuyển tiền xuyên biên giới về ngân hàng) | Starter 5% + 50¢; Pro (20 USD/tháng) 3,8% + 40¢; Growth 3,6% + 35¢; Scale 3,4% + 30¢; thẻ ngoài Mỹ +1,5%. Rút tiền theo phí Stripe: 2 USD/tháng có rút + 0,25% + 0,25 USD mỗi lần; đổi tiền 0,25–1% | [supported countries](https://polar.sh/docs/merchant-of-record/supported-countries), [pricing](https://polar.sh/resources/pricing) |
| **Gumroad** | Bảng nước nhận tiền qua ngân hàng không hiển thị được khi tra. VN: **chưa xác minh** | Không ghi rõ | Chuyển khoản ngân hàng nội tệ ở "most countries"; nước nào không có ngân hàng thì **chỉ PayPal**. Không hỗ trợ Payoneer/Wise/wire | 10% + 0,50 USD; 30% cho khách đến từ Discover | [getting paid](https://gumroad.com/help/article/13-getting-paid), [pricing](https://gumroad.com/pricing) |

### 1.2 Tình trạng Lemon Squeezy và Stripe Managed Payments

- Bài chính thức "2026 Update" ngày **28/01/2026** (JR Farr): đội ngũ đang xây Stripe Managed Payments. Bài thừa nhận hỗ trợ chậm hơn và ít cập nhật sản phẩm hơn. Mục tiêu là giúp người dùng Lemon Squeezy "an easy way to migrate to Stripe Managed Payments". Lúc đó Managed Payments chỉ cho vào theo lời mời hoặc danh sách chờ, phục vụ "35+ countries", và sẽ mở rộng "later this year". Bài không nêu ngày ngừng Lemon Squeezy. Chân trang ghi "Sold through Link, LLC f/k/a Lemon Squeezy LLC". Nguồn: [lemonsqueezy.com/blog/2026-update](https://www.lemonsqueezy.com/blog/2026-update)
- Trang pricing hiện có banner dẫn tới bài trên, và đăng ký vẫn miễn phí: [pricing](https://www.lemonsqueezy.com/pricing)
- Bên thứ ba (có cả đối thủ cạnh tranh) nói Managed Payments vào public preview tháng 2/2026, còn Lemon Squeezy vẫn chạy độc lập tới tháng 4/2026: **chưa xác minh** ([fungies.io](https://fungies.io/lemon-squeezy-stripe-acquisition-saas-founders-2026/), [dodopayments.com](https://dodopayments.com/blogs/lemonsqueezy-alternatives))
- **Rủi ro cần lưu ý:** nếu sau này Lemon Squeezy dồn người dùng sang Managed Payments, người bán ở VN có thể mất đường đi, vì hiện VN không có trong danh sách địa điểm được hỗ trợ của Managed Payments.

### 1.3 Kho ứng dụng (Google Play / App Store)

| | Google Play | Apple App Store |
|---|---|---|
| Đăng ký từ VN | VN hỗ trợ cả đăng ký developer lẫn **merchant** (bán app trả phí và in-app). Tiền trả bằng USD hoặc EUR tùy vị trí, không phải VND. [Nguồn](https://support.google.com/googleplay/android-developer/answer/9306917) | Phí 99 USD/năm. Tài khoản tổ chức cần số **D-U-N-S**. Một số developer VN báo bị chặn đăng ký cá nhân (diễn đàn, **chưa xác minh**). Yêu cầu ngân hàng VN cho Paid Apps Agreement: **chưa xác minh**. [Diễn đàn](https://developer.apple.com/forums/thread/842825), [hướng dẫn VN](https://viblo.asia/p/huong-dan-dang-ky-tai-khoan-apple-developer-5pPLkyy24RZ) |
| Phí với subscription | **15%** cho subscription tự gia hạn. Với in-app khác: 15% cho 1 triệu USD đầu mỗi năm, 30% phần vượt (áp dụng ở "remaining markets", tức ngoài các thị trường có lộ trình phí mới riêng: Úc, EEA, Nhật, Anh, Mỹ). [Nguồn](https://support.google.com/googleplay/android-developer/answer/112622) | Năm đầu nhận 70% (Apple lấy 30%); sau 1 năm thuê bao liên tục nhận 85% (15%). Thành viên Small Business Program (doanh thu ≤ 1 triệu USD/năm) nhận 85% ngay từ đầu. Có mức 10% cho điều khoản thay thế ở EU. [Subscriptions](https://developer.apple.com/app-store/subscriptions/), [Small Business Program](https://developer.apple.com/app-store/small-business-program/) |

---

## 2. Việt Nam: thuế và dữ liệu cá nhân

### 2.1 Thuế (chỉ ghi sự kiện, không kết luận)

| Chủ đề | Nội dung đã công bố | Nguồn |
|---|---|---|
| Luật Thuế GTGT mới | Luật **48/2024/QH15**, hiệu lực **01/07/2025**. Hướng dẫn: Nghị định 181/2025/NĐ-CP và Thông tư 69/2025/TT-BTC (cùng ngày 01/07/2025) | [Baker McKenzie](https://insightplus.bakermckenzie.com/bm/tax/vietnam-key-updates-on-new-vat-law-and-amended-law-on-tax-administration), [KPMG](https://kpmg.com/vn/en/home/insights/2025/07/decree-181-and-circular-69-on-value-added-tax.html) |
| Phần mềm "không chịu thuế" GTGT | Khoản 21 Điều 5 Luật 48/2024 xếp "sản phẩm phần mềm, dịch vụ phần mềm theo quy định của pháp luật" vào nhóm không chịu thuế | [Rajah & Tann](https://www.rajahtannasia.com/viewpoints/tax-amp-customs-alert-december-2024/), [Apolat Legal](https://apolatlegal.com/notes-on-determining-the-applicable-tax-rate-software-leasing-services/) |
| **Cho thuê phần mềm có thể bị tính khác** | Apolat dẫn một văn bản của cơ quan thuế TP.HCM coi "cho thuê phần mềm" **không** thuộc nhóm dịch vụ phần mềm được miễn, nên chịu 10% (đang giảm còn 8%). SaaS thuộc nhóm nào: **chưa xác minh** | [Apolat Legal](https://apolatlegal.com/notes-on-determining-the-applicable-tax-rate-software-leasing-services/) |
| GTGT 0% cho dịch vụ xuất khẩu | Áp dụng cho dịch vụ cung cấp trực tiếp cho tổ chức/cá nhân ở nước ngoài và tiêu dùng ngoài VN. Luật không định nghĩa "tiêu dùng ngoài Việt Nam". Theo bình luận dẫn Điều 18 NĐ 181, cần **hợp đồng với bên nước ngoài** và **chứng từ thanh toán không dùng tiền mặt** (**chưa xác minh** với nguyên văn). PwC: nội dung số cung cấp cho công ty nước ngoài được xem là dịch vụ xuất khẩu nếu có chứng từ chứng minh tiêu dùng ở nước ngoài | [Baker McKenzie](https://insightplus.bakermckenzie.com/bm/tax/vietnam-key-updates-on-new-vat-law-and-amended-law-on-tax-administration), [PwC PDF](https://www.pwc.com/vn/en/publications/2024/241216-new-vat-law.pdf), [lawnet](https://lawnet.vn/chinh-sach-thue/en/what-are-the-conditions-for-input-value-added-tax-deduction-for-exported-goods-and-services-in-vietn-23800.html), [vatupdate (một phần do AI viết, chưa xác minh)](https://www.vatupdate.com/2026/10/10/vat-rate-for-digital-content-services-provided-to-foreign-clients/) |
| Ghi chú về mô hình MoR | Khi dùng MoR, người mua về mặt pháp lý là MoR (ví dụ Paddle: "a legal entity responsible for selling goods or services to an end customer", và MoR lo tính/nộp sales tax). Doanh nghiệp VN khi đó **bán cho một pháp nhân nước ngoài** chứ không bán cho từng người dùng cuối. Hệ quả về thuế VN: cần hỏi kế toán | [Paddle](https://www.paddle.com/blog/what-is-merchant-of-record) |
| Thuế TNDN (CIT) | Luật **67/2025/QH15**, hiệu lực 01/10/2025, áp dụng từ kỳ tính thuế 2025. Thuế suất chuẩn 20%. Doanh thu ≤ 3 tỷ đồng: 15%; ≤ 50 tỷ đồng: 17% (NĐ 320/2025/NĐ-CP); loại trừ doanh nghiệp có quan hệ liên kết với doanh nghiệp lớn. Ưu đãi 10% trong 15 năm cho dự án đầu tư mới thuộc lĩnh vực ưu tiên, trong đó có sản xuất phần mềm. Điều kiện cụ thể: **chưa xác minh** | [Rajah & Tann](https://www.rajahtannasia.com/viewpoints/vietnam-passes-amended-corporate-income-tax-law-targeted-incentives-with-anti-abuse-safeguards/), [Vietnam Briefing](https://www.vietnam-briefing.com/news/vietnam-cit-incentives-for-software-production-what-investors-need-to-know.html/), [Rödl](https://www.roedl.com/en/insights/vietnam-new-corporate-income-tax-law/) |
| Hộ kinh doanh từ 2026 | Bỏ thuế khoán từ 01/01/2026, chuyển sang tự kê khai và tự nộp. Bỏ lệ phí môn bài (NQ 198/2025/QH15). Ngưỡng doanh thu không chịu GTGT/TNCN là 500 triệu đồng/năm (NĐ 68/2026), nhưng một nguồn nói NĐ 141/2026 đã nâng lên **1 tỷ đồng**: nguồn mâu thuẫn, **chưa xác minh**. Luật Thuế TNCN 2025 có thêm cách tính theo lợi nhuận cho doanh thu 500 triệu đến 3 tỷ đồng | [Ecovis](https://global.ecovis.com/?p=18311), [Vietanlaw](https://vietanlaw.com/new-2026-rules-for-household-enterprises-tax-in-vietnam), [SeABank](https://www.seabank.com.vn/en/tin-tuc/tu-van-dich-vu/tu-van--meo/5-dieu-ho-kinh-doanh-co-doanh-thu-duoi-1-ty-dong-can-luu-y-theo-quy-dinh-moi) |

### 2.2 Bảo vệ dữ liệu cá nhân

**Khung văn bản:**

| Văn bản | Tình trạng | Nguồn |
|---|---|---|
| Nghị định 13/2023/NĐ-CP | **Bị thay thế** từ 01/01/2026 | [Vietnam Briefing](https://www.vietnam-briefing.com/news/vietnam-personal-data-protection-regulation-decree-356.html) |
| **Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15** | Thông qua 26/06/2025, **hiệu lực 01/01/2026** | [Allen & Gledhill](https://www.allenandgledhill.com/vn/publication/articles/31075/upcoming-changes-to-s-personal-data-protection-regime), [KPMG PDF](https://assets.kpmg.com/content/dam/kpmg/vn/pdf/2025/07/exploring-vietnam-personal-data-protection-law.pdf) |
| **Nghị định 356/2025/NĐ-CP** (hướng dẫn Luật) | Hiệu lực 01/01/2026 | [Vietnam Briefing](https://www.vietnam-briefing.com/news/vietnam-personal-data-protection-regulation-decree-356.html), [EY](https://www.ey.com/en_vn/technical/tax/tax-and-law-updates/legal-alert-march-2026-decree-no-356-2025-nd-cp-providing-detailed-guidance-for-implementation-of-personal-data-protection-law), [Tilleke](https://www.tilleke.com/?p=69571) |

**Nghĩa vụ chính liên quan tới một SaaS ghi chú:**

- **Đồng ý (consent):** phải tự nguyện, có thông tin đầy đủ và riêng cho từng mục đích; không được gộp với dịch vụ không liên quan. NĐ 356 yêu cầu phương thức đồng ý kiểm chứng được và có lưu vết (thời điểm, cách thức, mục đích). Cấm ô tick sẵn, cấm mặc định đồng ý và giao diện làm mờ ranh giới đồng ý/từ chối. Nguồn: [A&G](https://www.allenandgledhill.com/vn/publication/articles/31075/upcoming-changes-to-s-personal-data-protection-regime), [Vietnam Briefing](https://www.vietnam-briefing.com/news/vietnam-personal-data-protection-regulation-decree-356.html)
- **Hồ sơ đánh giá tác động xử lý dữ liệu (DPIA):** nộp cho cơ quan chuyên trách (A05, Bộ Công an) **trong 60 ngày** kể từ khi bắt đầu xử lý. Theo Vietanlaw, mẫu là Mẫu 10 kèm Mẫu 02a: **chưa xác minh** với nguyên văn. Nguồn: [A&G](https://www.allenandgledhill.com/vn/publication/articles/31075/upcoming-changes-to-s-personal-data-protection-regime), [Vietanlaw](https://vietanlaw.com/decree-356-2025-vs-decree-13-2023-updates-on-personal-data-protection-in-vietnam/)
- **Hồ sơ chuyển dữ liệu ra nước ngoài (OTIA):** nộp trong 60 ngày kể từ lần chuyển đầu tiên, qua cổng của Bộ Công an; cơ quan xem xét trong 15 ngày và có thể yêu cầu sửa. Hồ sơ gồm mục đích, loại dữ liệu, cơ chế đồng ý, biện pháp an ninh, bảo vệ ở phía bên nhận. Có một số ngoại lệ (ví dụ chủ thể dữ liệu tự chuyển, dữ liệu nhân viên lưu trên cloud). Nguồn: [Vietnam Briefing](https://www.vietnam-briefing.com/news/vietnam-personal-data-protection-regulation-decree-356.html), [Baker McKenzie](https://connectontech.bakermckenzie.com/?p=5530)
  - Liên quan tới Noteriv: hạ tầng VPS/Garage đặt ở nước nào, MoR (nước ngoài) và Sentry đều có thể làm phát sinh việc "chuyển dữ liệu ra nước ngoài". Đây là điểm cần hỏi.
- **Miễn và ân hạn:**
  - Doanh nghiệp siêu nhỏ và hộ kinh doanh: **miễn** chỉ định DPO và miễn đánh giá tác động.
  - Doanh nghiệp nhỏ và startup: **ân hạn 5 năm** từ 01/01/2026, với điều kiện không trực tiếp xử lý dữ liệu nhạy cảm, không xử lý dữ liệu của hơn 100.000 người, và không phải nhà cung cấp dịch vụ xử lý dữ liệu.
  - Các nguồn nói khác nhau về phạm vi ân hạn: có nguồn nói gồm cả hồ sơ DPIA, có nguồn chỉ nói DPO và tiêu chuẩn vận hành: **chưa xác minh**. Nguồn: [Vietnam Briefing](https://www.vietnam-briefing.com/news/vietnam-personal-data-protection-regulation-decree-356.html), [Mondaq](https://webiis10.mondaq.com/privacy-protection/1727638/new-decree-provides-guidance-for-vietnams-personal-data-protection-law), [China Briefing](https://www.china-briefing.com/china-outbound-news/vietnam-personal-data-protection-regulation-decree-356)
  - Câu hỏi mở: một **SaaS ghi chú lưu nội dung của người dùng** có bị coi là "data processing service provider" không. Nếu có thì mất ân hạn/miễn trừ.
- **Vi phạm dữ liệu:** với dữ liệu nhạy cảm, báo cơ quan chức năng trong 72 giờ. Nguồn: [Vietnam Briefing](https://www.vietnam-briefing.com/news/vietnam-personal-data-protection-regulation-decree-356.html)
- **Chế tài:** vi phạm chuyển dữ liệu xuyên biên giới bị phạt tới 5% doanh thu năm trước; vi phạm chung tới 3 tỷ đồng. Nguồn: [A&G](https://www.allenandgledhill.com/vn/publication/articles/31075/upcoming-changes-to-s-personal-data-protection-regime), [Tilleke](https://www.tilleke.com/?p=68543)
- **Chuyển tiếp:** consent, DPIA và OTIA đã làm theo NĐ 13 vẫn còn giá trị; cập nhật sau 01/01/2026 phải theo luật mới. Nguồn: [A&G](https://www.allenandgledhill.com/vn/publication/articles/31075/upcoming-changes-to-s-personal-data-protection-regime)

---

## 3. EU/Mỹ: kiến thức cơ bản cho SaaS nhỏ bán cho người tiêu dùng

| Chủ đề | Sự kiện | Nguồn |
|---|---|---|
| GDPR có áp dụng cho người bán ngoài EU không | Có. Art. 3(2) áp dụng cho bên không có cơ sở ở EU nếu xử lý dữ liệu của người đang ở EU khi "offering of goods or services, irrespective of whether a payment … is required", hoặc khi theo dõi hành vi của họ | [Art. 3](https://gdpr-info.eu/art-3-gdpr/) |
| Đại diện tại EU (Art. 27) | Khi rơi vào Art. 3(2), phải chỉ định bằng văn bản một đại diện ở EU. **Ngoại lệ**: xử lý mang tính "occasional", không xử lý dữ liệu đặc biệt ở quy mô lớn, **và** ít rủi ro (phải thỏa đủ cả ba), hoặc bên xử lý là cơ quan công quyền. Một SaaS có thuê bao định kỳ có được coi là "occasional" không: hỏi luật sư | [Art. 27](https://gdpr-info.eu/art-27-gdpr/) |
| Chính sách quyền riêng tư (privacy policy) | Nghĩa vụ minh bạch thông tin (Art. 13–14). Chưa trích dẫn nguyên văn trong bản này: **chưa xác minh** trích dẫn | [gdpr-info.eu Art. 13](https://gdpr-info.eu/art-13-gdpr/) |
| DPA (thỏa thuận xử lý dữ liệu, Art. 28) | Cần ký với các nhà cung cấp xử lý dữ liệu thay mình (hosting, Sentry, email…). Nếu bán cho khách doanh nghiệp, khách có thể đòi Noteriv ký DPA với họ. Chưa trích dẫn nguyên văn: **chưa xác minh** trích dẫn | [gdpr-info.eu Art. 28](https://gdpr-info.eu/art-28-gdpr/) |
| VAT/sales tax | MoR là bên bán cho người dùng cuối và lo tính, thu, nộp sales tax/VAT. Stripe Managed Payments nói lo "sales tax, VAT, and GST compliance in more than 80 countries". Gumroad là MoR từ 01/01/2025 | [Paddle](https://www.paddle.com/blog/what-is-merchant-of-record), [Stripe MP](https://docs.stripe.com/payments/managed-payments), [Gumroad](https://gumroad.com/pricing) |
| Mỹ: quyền riêng tư | Không có luật liên bang chung (**chưa xác minh** trong bản này). Ví dụ luật bang: CCPA (California) chỉ áp dụng nếu doanh thu ≥ 26,625 triệu USD, **hoặc** mua/bán/chia sẻ dữ liệu của ≥ 100.000 cư dân/hộ California, **hoặc** ≥ 50% doanh thu đến từ bán/chia sẻ dữ liệu | [CPPA FAQ](https://cppa.ca.gov/faq.html) |

---

## Câu hỏi cho kế toán/luật sư

1. Với mô hình dùng MoR (Paddle, Polar, Lemon Squeezy…), doanh thu của Noteriv về pháp lý là bán dịch vụ cho **pháp nhân MoR ở nước ngoài**. Thu nhập đó được hạch toán là gì (xuất khẩu dịch vụ, phí bản quyền, hoa hồng…), và cần hợp đồng/chứng từ gì?
2. SaaS ghi chú (web + desktop/mobile) được xếp vào "dịch vụ phần mềm" (không chịu GTGT theo khoản 21 Điều 5 Luật 48/2024) hay "cho thuê phần mềm" (chịu 10%/8%) hay "dịch vụ xuất khẩu" (0%)? Nếu là 0% thì cần những chứng từ nào theo NĐ 181/2025 và TT 69/2025?
3. Có nên thành lập **công ty TNHH** ngay hay bắt đầu bằng **hộ kinh doanh**? So sánh hai hình thức về thuế (ngưỡng 500 triệu hay 1 tỷ đồng hiện hành; TNCN theo doanh thu hay lợi nhuận), khả năng mở tài khoản ở Paddle/FastSpring/Apple (D-U-N-S) và việc nhận ngoại tệ.
4. Doanh nghiệp nhỏ của Noteriv có được thuế suất TNDN 15% (doanh thu ≤ 3 tỷ đồng) không? Có đủ điều kiện ưu đãi 10% trong 15 năm cho "sản xuất phần mềm" theo Luật 67/2025 và NĐ 320/2025 không? Thủ tục chứng nhận sản phẩm phần mềm thế nào?
5. Thủ tục ngoại hối để nhận tiền từ Stripe Connect Express (Polar), Payoneer/wire (Paddle), PayPal hay Google/Apple về tài khoản ở VN: cá nhân nhận được không, hay phải dùng tài khoản doanh nghiệp? Có phải khai báo gì với ngân hàng không?
6. Thuế nhà thầu nước ngoài (FCT) hoặc nghĩa vụ khấu trừ khi trả phí cho Paddle/Polar/Apple/Google (phí MoR/hoa hồng bị trừ thẳng vào doanh thu): có phát sinh không, và hạch toán thế nào?
7. Một SaaS ghi chú lưu nội dung người dùng có bị xem là "bên cung cấp dịch vụ xử lý dữ liệu cá nhân" theo Luật 91/2025 và NĐ 356/2025 không? Nếu có thì có mất ân hạn 5 năm hoặc miễn trừ cho doanh nghiệp nhỏ/siêu nhỏ không?
8. Ân hạn 5 năm có bao gồm **hồ sơ DPIA** và **hồ sơ OTIA** không, hay chỉ gồm DPO và tiêu chuẩn vận hành? Nếu người dùng chủ yếu ở nước ngoài và không có người VN, luật VN còn áp dụng tới đâu?
9. Đặt máy chủ (VPS/kho object storage) ở nước ngoài, dùng Sentry, MoR và nhà cung cấp email nước ngoài: mỗi trường hợp có tính là "chuyển dữ liệu cá nhân ra nước ngoài" cần hồ sơ OTIA nộp trong 60 ngày không? Có ngoại lệ nào dùng được không?
10. Theo GDPR, Noteriv có cần chỉ định **đại diện ở EU (Art. 27)** không, hay có thể dựa vào ngoại lệ "occasional / ít rủi ro"? Nếu cần thì chi phí và nhà cung cấp tham khảo là gì?
11. Bộ tài liệu tối thiểu cần soạn trước khi mở bán: Privacy Policy, Terms of Service, DPA (cho khách doanh nghiệp), danh sách sub-processor, chính sách cookie. Một văn bản có đáp ứng đồng thời GDPR và Luật 91/2025 (consent kiểm chứng được, không tick sẵn) không?
12. Nếu chọn Lemon Squeezy và sau này nền tảng này bị gộp vào Stripe Managed Payments (hiện chưa hỗ trợ VN), hợp đồng và kế hoạch dự phòng nên tính thế nào? Có nên ưu tiên Paddle hoặc Polar ngay từ đầu không?
13. Bán qua Google Play/App Store (tiền nhận bằng USD/EUR, phí 15–30%): doanh thu từ kho ứng dụng có cách tính thuế VN khác với doanh thu qua MoR web không?

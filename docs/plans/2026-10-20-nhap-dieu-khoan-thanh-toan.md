# Nháp: điều khoản thanh toán và hoàn tiền

> Ngày lập: 2026-10-20 (phiên 5.6) · Trạng thái: **nháp, chưa công khai**. Đây không phải tư vấn pháp lý.
> **Khi nào dùng:** lúc bật thu phí (đầu Chặng 6, sau khi chọn merchant of record). Khi đó chỉnh theo điều kiện của bên được chọn, đưa vào `/terms` (mục 7 "Plans and payment") bằng cả tiếng Anh và tiếng Việt, rồi tăng `TERMS_VERSION` ở `web/src/lib/legal.ts` và `web/server/src/lib/registration.ts`. Người dùng cũ sẽ được hỏi đồng ý lại qua `TermsGate`.

## Chủ dự án đã chốt (2026-10-20)

- **Hoàn đủ trong 14 ngày** cho lần mua đầu và mỗi lần gia hạn.
- Thu tiền qua **merchant of record** (Paddle hoặc Lemon Squeezy; chốt ở Chặng 6). Bên đó là người bán với khách, tự tính và nộp VAT/thuế bán hàng, và xử lý hoàn tiền theo yêu cầu của mình.

## Việc phải kiểm lúc áp dụng

- Điều kiện hoàn tiền và quy trình của merchant of record (có thể nó đặt luật riêng, ví dụ hạn 14 hay 30 ngày, hoặc tự hoàn khi có tranh chấp thẻ).
- Quyền rút lại của người tiêu dùng EU/UK: nếu cho dùng gói trả phí ngay, trang mua phải xin người mua đồng ý bắt đầu ngay. Chính sách "hoàn đủ trong 14 ngày" dưới đây rộng hơn quyền đó, nên vẫn đủ.
- Hạ gói: theo hành vi hiện tại (phiên 5.3), dữ liệu vượt hạn mức **không bị xoá**, chỉ không thêm được. Giữ đúng câu này.
- Chính sách quyền riêng tư: thêm merchant of record vào danh sách bên xử lý phụ (mục 5) và thời hạn lưu chứng từ theo luật thuế (mục 4).

---

## English draft

### Paid plans and payment

1. **Who sells.** Paid plans are sold through our reseller, [merchant of record], which is the seller of record for your order and handles payment, invoices, and sales tax or VAT. Its own terms apply to the payment.
2. **Price and billing.** The price, the billing period (monthly or yearly) and any taxes are shown before you confirm the order. Subscriptions renew automatically at the end of each period at the price then in force; we tell you at least 30 days before a price increase applies to you.
3. **Cancelling.** You can cancel at any time in Settings → Plan and usage (or through the link in your receipt). Your plan stays active until the end of the period you paid for, then the account moves to the free plan.
4. **Refunds.** If you are not satisfied, ask within **14 days** of your first payment or of a renewal and we refund that payment **in full**, no questions asked. After 14 days, payments are not refunded except where the law requires it.
5. **Moving to a smaller plan.** Nothing you already have is deleted. If you are above a limit of the new plan, you cannot add more of that thing until you are back under it.
6. **Failed payments.** If a renewal cannot be charged, we and the reseller retry for a short period and email you; if it still fails, the account moves to the free plan as in point 5.
7. **Your consumer rights.** These terms do not limit any right you have under the consumer law of the country where you live.

### How to ask for a refund

Write to [contact email] from the address of your account, or use the refund link in your receipt, within 14 days of the payment.

---

## Bản nháp tiếng Việt

### Gói trả phí và thanh toán

1. **Ai bán.** Gói trả phí được bán qua đơn vị bán lại của chúng tôi, [merchant of record]. Đơn vị này là bên bán trên đơn hàng của bạn, xử lý thanh toán, hoá đơn và thuế bán hàng hoặc VAT. Việc thanh toán theo điều khoản riêng của đơn vị đó.
2. **Giá và chu kỳ.** Giá, chu kỳ thanh toán (tháng hoặc năm) và thuế được hiện trước khi bạn xác nhận đơn. Gói tự gia hạn vào cuối mỗi chu kỳ theo giá đang áp dụng; nếu tăng giá, chúng tôi báo trước ít nhất 30 ngày trước khi giá mới áp dụng cho bạn.
3. **Huỷ.** Bạn huỷ được bất cứ lúc nào ở Cài đặt → Gói và mức dùng (hoặc qua liên kết trong biên nhận). Gói vẫn dùng được tới hết chu kỳ đã trả, sau đó tài khoản chuyển về gói miễn phí.
4. **Hoàn tiền.** Nếu không hài lòng, hãy yêu cầu trong **14 ngày** kể từ lần thanh toán đầu hoặc một lần gia hạn, chúng tôi hoàn **toàn bộ** khoản đó, không cần lý do. Sau 14 ngày, khoản đã trả không được hoàn, trừ khi pháp luật bắt buộc.
5. **Chuyển sang gói nhỏ hơn.** Không có gì bạn đang có bị xoá. Nếu đang vượt một hạn mức của gói mới, bạn không thêm được thứ đó cho tới khi xuống dưới hạn mức.
6. **Thanh toán lỗi.** Nếu không thu được tiền gia hạn, chúng tôi và đơn vị bán lại thử lại trong một thời gian ngắn và gửi email cho bạn; nếu vẫn lỗi, tài khoản chuyển về gói miễn phí như điểm 5.
7. **Quyền của người tiêu dùng.** Điều khoản này không hạn chế quyền nào bạn có theo luật bảo vệ người tiêu dùng của nước nơi bạn sống.

### Cách yêu cầu hoàn tiền

Viết tới [email liên hệ] từ địa chỉ email của tài khoản, hoặc dùng liên kết hoàn tiền trong biên nhận, trong vòng 14 ngày kể từ khi thanh toán.

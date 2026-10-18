import type { Metadata } from "next";
import Link from "next/link";
import LegalShell, { Section } from "@/components/LegalShell";
import { CONTACT_EMAIL, OPERATOR_NAME } from "@/lib/legal";

export const metadata: Metadata = { title: "Terms of Use · Điều khoản sử dụng — Noteriv" };

const who = OPERATOR_NAME || "[họ tên chủ dự án]";
const mail = CONTACT_EMAIL || "[email liên hệ]";

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Use / Điều khoản sử dụng">
      <Section id="en" lang="en" title="English">
        <h3>1. The service</h3>
        <p>
          Noteriv is a web-based Markdown note-taking app run by {who} on a personal basis. It is in a trial phase and open to invited users only.
          By creating an account you agree to these terms and to the <Link href="/privacy">Privacy Policy</Link>.
        </p>

        <h3>2. Accounts</h3>
        <ul>
          <li>Provide accurate information, keep your password secret, and you are responsible for activity under your account.</li>
          <li>An invite code is for the person invited; do not sell or post it publicly.</li>
        </ul>

        <h3>3. Your content</h3>
        <ul>
          <li>You keep all rights to what you create. You grant us only the permission to store, back up and display it to you (and people you share with) in order to run the service.</li>
          <li>You warrant you have the right to upload your content and that it does not break the law or others’ rights.</li>
        </ul>

        <h3>4. Acceptable use</h3>
        <p>Do not use Noteriv to: distribute unlawful content or infringe others’ rights; attack, probe or overload the system; access other people’s data; run malicious plugins or try to escape the plugin sandbox.</p>

        <h3>5. Plugins</h3>
        <p>Third-party plugins run in a browser sandbox but may still display or process content you allow them to. Use your judgement before installing one.</p>

        <h3>6. Backups and liability</h3>
        <ul>
          <li>We back up nightly but <strong>cannot guarantee</strong> that data will never be lost. Keep your own copy of anything important (export is built in).</li>
          <li>The service is provided “as is” and may be interrupted or changed. To the extent permitted by law we are not liable for indirect damages or data loss beyond our reasonable control.</li>
        </ul>

        <h3>7. Suspension and termination</h3>
        <p>We may suspend or delete accounts that break these terms (with notice where practical). You can delete your account at any time in the app.</p>

        <h3>8. Changes and governing law</h3>
        <p>
          We may update these terms; material changes will be announced and may require you to accept again. These terms are governed by the laws of Vietnam.
          Contact: {who} — <a href={`mailto:${mail}`}>{mail}</a>.
        </p>
      </Section>

      <Section id="vi" lang="vi" title="Tiếng Việt">
        <h3>1. Dịch vụ</h3>
        <p>
          Noteriv là ứng dụng ghi chú Markdown trên web do {who} vận hành ở quy mô cá nhân. Dịch vụ đang trong giai đoạn thử nghiệm và
          chỉ nhận người dùng có mã mời. Khi tạo tài khoản, bạn đồng ý với các điều khoản này và{" "}
          <Link href="/privacy">Chính sách quyền riêng tư</Link>.
        </p>

        <h3>2. Tài khoản</h3>
        <ul>
          <li>Bạn cung cấp thông tin đúng, giữ bí mật mật khẩu và chịu trách nhiệm về hoạt động trong tài khoản của mình.</li>
          <li>Mã mời dùng cho người được mời; không bán hoặc phát tán công khai.</li>
        </ul>

        <h3>3. Nội dung của bạn</h3>
        <ul>
          <li>Bạn giữ toàn quyền với nội dung bạn tạo. Bạn chỉ cấp cho chúng tôi quyền lưu, sao lưu và hiển thị nội dung đó cho bạn (và người bạn chia sẻ) để vận hành dịch vụ.</li>
          <li>Bạn bảo đảm có quyền đối với nội dung tải lên và không vi phạm pháp luật hay quyền của người khác.</li>
        </ul>

        <h3>4. Sử dụng chấp nhận được</h3>
        <p>Không dùng Noteriv để: phát tán nội dung trái pháp luật hoặc xâm phạm quyền người khác; tấn công, dò quét hay làm quá tải hệ thống; truy cập dữ liệu của người khác; chạy plugin độc hại hoặc cố thoát khỏi hộp cát của plugin.</p>

        <h3>5. Plugin</h3>
        <p>Plugin do bên thứ ba viết chạy trong hộp cát của trình duyệt nhưng vẫn có thể hiển thị hoặc xử lý nội dung bạn cho phép. Bạn tự cân nhắc trước khi cài.</p>

        <h3>6. Sao lưu và giới hạn trách nhiệm</h3>
        <ul>
          <li>Chúng tôi sao lưu hằng đêm nhưng <strong>không bảo đảm tuyệt đối</strong> không mất dữ liệu. Hãy giữ bản sao quan trọng (tính năng xuất dữ liệu có sẵn).</li>
          <li>Dịch vụ được cung cấp “nguyên trạng”, có thể gián đoạn hoặc thay đổi. Trong phạm vi pháp luật cho phép, chúng tôi không chịu trách nhiệm cho thiệt hại gián tiếp hoặc mất dữ liệu ngoài khả năng kiểm soát hợp lý.</li>
        </ul>

        <h3>7. Tạm ngừng và chấm dứt</h3>
        <p>Chúng tôi có thể tạm khoá hoặc xoá tài khoản vi phạm điều khoản (nếu có thể, sẽ báo trước). Bạn có thể xoá tài khoản bất cứ lúc nào trong ứng dụng.</p>

        <h3>8. Thay đổi và luật áp dụng</h3>
        <p>
          Chúng tôi có thể cập nhật điều khoản; thay đổi đáng kể sẽ được thông báo và có thể yêu cầu bạn đồng ý lại. Điều khoản này chịu sự điều chỉnh của pháp luật Việt Nam.
          Liên hệ: {who} — <a href={`mailto:${mail}`}>{mail}</a>.
        </p>
      </Section>
    </LegalShell>
  );
}

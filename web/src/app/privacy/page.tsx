import type { Metadata } from "next";
import LegalShell, { Section } from "@/components/LegalShell";
import { CONTACT_EMAIL, OPERATOR_NAME } from "@/lib/legal";

export const metadata: Metadata = { title: "Chính sách quyền riêng tư · Privacy Policy — Noteriv" };

const who = OPERATOR_NAME || "[họ tên chủ dự án]";
const mail = CONTACT_EMAIL || "[email liên hệ]";

export default function PrivacyPage() {
  return (
    <LegalShell title="Chính sách quyền riêng tư / Privacy Policy">
      <Section id="vi" lang="vi" title="Tiếng Việt">
        <p>
          Noteriv là ứng dụng ghi chú Markdown chạy trên trình duyệt, do {who} vận hành ở quy mô cá nhân. Trang này nói rõ
          chúng tôi lưu gì về bạn, lưu ở đâu, trong bao lâu và bạn kiểm soát nó thế nào.
        </p>

        <h3>1. Dữ liệu chúng tôi lưu</h3>
        <ul>
          <li>Tài khoản: email, tên hiển thị, mật khẩu ở dạng băm một chiều (không lưu mật khẩu gốc), mã mời bạn đã dùng, thời điểm và phiên bản điều khoản bạn đã đồng ý.</li>
          <li>Nội dung bạn tạo: ghi chú, thư mục, tệp đính kèm, cài đặt, plugin bạn cài.</li>
          <li>Thông tin kết nối đồng bộ (GitHub, WebDAV) nếu bạn tự cấu hình: được mã hoá trên máy chủ.</li>
          <li>Nhật ký bảo mật: các sự kiện như đăng ký, đăng nhập, đăng nhập sai, tạo/xoá vault, kèm địa chỉ IP, để phát hiện lạm dụng.</li>
          <li>Cookie đăng nhập (httpOnly) cần thiết để giữ phiên. Chúng tôi không dùng cookie quảng cáo hay theo dõi, và không dùng công cụ phân tích hành vi.</li>
        </ul>

        <h3>2. Dữ liệu được lưu ở đâu, ai xử lý</h3>
        <ul>
          <li>Ứng dụng và cơ sở dữ liệu chạy trên máy chủ ảo (VPS) do chúng tôi thuê và quản lý.</li>
          <li>
            Sao lưu hằng đêm được <strong>mã hoá</strong> trước khi gửi tới một kho GitHub riêng tư của chúng tôi. Khoá giải mã không nằm trên
            máy chủ. Các bản sao lưu cơ sở dữ liệu được giữ luân phiên (khoảng 7 bản theo ngày, 4 theo tuần, 12 theo tháng).
          </li>
          <li>
            Dịch vụ giám sát (UptimeRobot, healthchecks.io) chỉ nhận tín hiệu “còn sống/lỗi” và địa chỉ công khai của trang; chúng
            không nhận nội dung ghi chú hay dữ liệu tài khoản.
          </li>
          <li>Nếu bạn bật đồng bộ GitHub/WebDAV, dữ liệu vault được gửi tới dịch vụ bạn chọn theo ý bạn.</li>
          <li>Chúng tôi không bán dữ liệu, không chia sẻ để quảng cáo.</li>
        </ul>

        <h3>3. Quyền của bạn</h3>
        <ul>
          <li>Xuất dữ liệu: trang “Vault của bạn” → “Tải xuống toàn bộ dữ liệu (JSON)”; mỗi vault cũng xuất được thành .zip.</li>
          <li>
            Xoá: xoá một vault hoặc “Xoá tài khoản” sẽ xoá ngay ghi chú, thư mục, cài đặt và <strong>tệp đính kèm</strong> khỏi hệ thống đang chạy.
          </li>
          <li>Sửa thông tin hoặc hỏi về dữ liệu của bạn: viết cho chúng tôi theo địa chỉ ở mục 6.</li>
        </ul>

        <h3>4. Giới hạn cần biết về sao lưu</h3>
        <p>
          Bản sao lưu đã mã hoá không bị sửa theo từng thay đổi nhỏ. Khi bạn xoá tài khoản, dữ liệu trong các bản sao lưu cơ sở dữ liệu
          cũ biến mất dần khi bị ghi đè theo vòng luân phiên (tối đa khoảng 12 tháng). Riêng <strong>tệp đính kèm</strong> được sao lưu theo kiểu chỉ-thêm,
          nên một tệp đã xoá có thể còn trong kho sao lưu mã hoá cho đến khi chúng tôi dọn kho đó. Nếu bạn muốn xoá hẳn, hãy
          viết cho chúng tôi; chúng tôi sẽ xoá thủ công và xác nhận lại.
        </p>

        <h3>5. Trẻ em</h3>
        <p>Noteriv có thể được dùng trong lớp học cờ vua. Nếu người dùng dưới 16 tuổi, phụ huynh hoặc giáo viên chịu trách nhiệm tạo tài khoản và đồng ý thay.</p>

        <h3>6. Liên hệ</h3>
        <p>
          {who} — <a href={`mailto:${mail}`}>{mail}</a>. Chúng tôi cố gắng trả lời trong vòng 14 ngày.
        </p>

        <h3>7. Thay đổi</h3>
        <p>Nếu chính sách thay đổi đáng kể, chúng tôi cập nhật ngày ở đầu trang và thông báo trong ứng dụng.</p>
      </Section>

      <Section id="en" lang="en" title="English">
        <p>
          Noteriv is a browser-based Markdown note-taking app run by {who} on a personal basis. This page explains what we
          store about you, where, for how long, and what control you have.
        </p>

        <h3>1. Data we store</h3>
        <ul>
          <li>Account: email, display name, a one-way hash of your password (never the password itself), the invite code you used, and when and which version of the terms you accepted.</li>
          <li>Content you create: notes, folders, attachments, settings, plugins you install.</li>
          <li>Sync credentials (GitHub, WebDAV) if you set them up: encrypted on the server.</li>
          <li>Security log: events such as sign-up, sign-in, failed sign-in, vault creation/deletion, with IP address, to detect abuse.</li>
          <li>An httpOnly sign-in cookie needed to keep your session. We use no advertising or tracking cookies and no behavioural analytics.</li>
        </ul>

        <h3>2. Where it is stored and who handles it</h3>
        <ul>
          <li>The app and database run on a virtual private server (VPS) that we rent and manage.</li>
          <li>
            Nightly backups are <strong>encrypted</strong> before being pushed to a private GitHub repository of ours. The decryption key is not on the server.
            Database backups are kept on a rotation (roughly 7 daily, 4 weekly, 12 monthly).
          </li>
          <li>Monitoring services (UptimeRobot, healthchecks.io) only receive “alive/failed” signals and the site’s public address, never note content or account data.</li>
          <li>If you enable GitHub/WebDAV sync, your vault data is sent to the service you choose.</li>
          <li>We do not sell data or share it for advertising.</li>
        </ul>

        <h3>3. Your rights</h3>
        <ul>
          <li>Export: “Your vaults” page → “Download all my data (JSON)”; each vault can also be exported as .zip.</li>
          <li>
            Deletion: deleting a vault or “Delete account” immediately removes notes, folders, settings and <strong>attachment files</strong> from the live system.
          </li>
          <li>To correct information or ask about your data, write to the address in section 6.</li>
        </ul>

        <h3>4. Backup limits you should know about</h3>
        <p>
          Encrypted backups are not edited for each small change. After you delete your account, data in older database backups disappears as it is
          overwritten by the rotation (up to about 12 months). <strong>Attachment files</strong> are backed up append-only, so a deleted file may remain in the
          encrypted backup repository until we clean that repository. If you want it gone for good, write to us; we will remove it manually and confirm.
        </p>

        <h3>5. Children</h3>
        <p>Noteriv may be used in chess classes. If a user is under 16, a parent or teacher is responsible for creating the account and consenting on their behalf.</p>

        <h3>6. Contact</h3>
        <p>
          {who} — <a href={`mailto:${mail}`}>{mail}</a>. We aim to reply within 14 days.
        </p>

        <h3>7. Changes</h3>
        <p>If this policy changes materially we update the date at the top and notify you in the app.</p>
      </Section>
    </LegalShell>
  );
}

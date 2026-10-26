# Obsidian ↔ Noteriv: bản đồ khoảng trống (từ nguồn công khai)

> Chặng K – Kiểm chứng, **Ngoại lệ 2** ([kế hoạch](../plans/2026-10-20-chang-k-kiem-chung.md)). Lập ngày 2026-10-22.
> Hồ sơ Obsidian theo mẫu chung nằm ở [doi-thu.md](doi-thu.md) mục 2, nhóm 1.

## 1. Cách làm và ranh giới pháp lý

**Ban đầu** định dùng REA (`rea-agents` 6.7.0) để dịch ngược `obsidian.asar` của bản Obsidian cài trên máy. Việc này **đã dừng ngay khi vừa chạy** (chưa đọc kết quả nào, các file tạm đã xoá), vì [Điều khoản của Obsidian](https://obsidian.md/terms) (cập nhật 2025-02-20, tra 2026-10-22) cấm:

- *"disassemble, reverse engineer or decompile the Services or Software"*. Ngoại lệ duy nhất là để viết plugin **phi thương mại**.
- *"access the Services or Software in order to develop a competing product or service"*.

Noteriv là sản phẩm thương mại cạnh tranh, nên **không dịch ngược Obsidian**. Tài liệu này chỉ dựa vào:

| Nguồn | Link | Ngày tra |
|---|---|---|
| Danh sách core plugin (hướng dẫn chính thức) | https://obsidian.md/help/plugins | 2026-10-22 |
| Bases | https://obsidian.md/help/bases | 2026-10-22 |
| Changelog desktop 1.13.6 → 1.14.4 | https://obsidian.md/changelog/ | 2026-10-22 |
| Bảng giá | https://obsidian.md/pricing | 2026-10-22 |
| API plugin công khai (giấy phép MIT, ~2,3k sao) | https://github.com/obsidianmd/obsidian-api | 2026-10-22 |

Phía Noteriv được kiểm kê từ mã nguồn (`main` @ `ba031da`, cộng nhánh phone M1b).

**Quy tắc khi làm tính năng:** chỉ dựa vào mô tả hành vi bằng lời ở mục 3. Không chép giao diện, chữ, icon hay CSS của Obsidian. Định dạng file riêng của Obsidian (`.base`) **không** dùng làm định dạng gốc của Noteriv. Nếu sau này cần *nhập* file `.base` thì đó là quyết định riêng ở Chặng 6, sau khi hỏi tư vấn. `.canvas` theo JSON Canvas là chuẩn mở, Noteriv đã có.

REA vẫn hữu ích cho **chính Noteriv**: soi bản build APK, exe desktop và bundle web để xem thực sự phát hành những gì (xem mục 5).

## 2. Obsidian có gì (tóm tắt)

- **29 core plugin** (nguồn: help/plugins): Audio recorder, Backlinks (kèm unlinked mentions), **Bases**, Bookmarks, Canvas, Command palette, Daily notes, File explorer, File recovery, Footnotes view, Graph view, Note composer, **Outgoing links**, Outline, Page preview, **Properties view**, Publish, Quick switcher, Random note, Search, **Slash commands**, Slides, Sync, Tags view, Templates, **Unique note creator**, **Web viewer**, Word count, **Workspaces**. Thêm hai plugin của chính hãng ngoài core: **Importer** (nhập từ app khác) và Maps (bản đồ cho Bases).
- **Bases** (help/bases): xem, lọc, sắp xếp, nhóm và *sửa* file theo thuộc tính, dữ liệu vẫn nằm trong Markdown. Có các kiểu Table, List, Cards, Kanban (từ 1.14.0) và Map. Có công thức, và nhúng được vào note.
- **Mới gần đây** (changelog): kanban cho Bases và highlight nhiều màu (1.14.0), MathJax 4 (1.14.1), mở file `.md` nằm ngoài vault và đặt làm app Markdown mặc định (1.14.2–1.14.4).
- **Mô hình giá** (pricing): app miễn phí. Sync $4–5/tháng (mã hoá đầu-cuối, lịch sử phiên bản, vault chia sẻ), Publish $8–10/site/tháng, Commercial $50/người/năm (tự nguyện).

## 3. Bảng khoảng trống

Cỡ ước lượng theo phiên của dự án: **S** ≤ 1 phiên · **M** 1–2 phiên · **L** 3–4 phiên · **XL** ≥ 5 phiên.
Cột Noteriv ghi theo thứ tự **W**eb / **D**esktop / **P**hone.

| # | Tính năng (mô tả hành vi bằng lời của mình) | Noteriv W/D/P | Cỡ | Giá trị | Đề xuất |
|---|---|---|---|---|---|
| G1 | **Đổi tên note thì cập nhật mọi liên kết trỏ tới nó** | Web: **chưa có** (`web/server/src/routes/notes.ts:133-156` chỉ đổi đường dẫn). Desktop: cần kiểm | M | Rất cao (đổi tên làm gãy liên kết là mất dữ liệu ngầm) | **Đợt 1** |
| G2 | **Nhúng nội dung** `![[note]]`, `![[note#heading]]`, tham chiếu khối `^id` và liên kết tới khối | Một phần: chỉ hiện chip tên (`packages/ui/src/markdown/renderers/wikilinks.ts:30-47`) | L | Rất cao (thói quen cốt lõi của người dùng Obsidian) | **Đợt 1** |
| G3 | Ô **liên kết đi ra** và **nhắc đến chưa liên kết** (có nút "biến thành link") | Không / không / không | M | Cao | **Đợt 1** |
| G4 | **Thuộc tính có kiểu** (text, số, ngày, checkbox, danh sách, tags) và **ô Thuộc tính toàn vault** (đổi tên hoặc đổi kiểu một thuộc tính ở mọi note) | Frontmatter không kiểu, chỉ `date` được xử lý riêng | L | Cao, và là nền cho G5 | **Đợt 1** |
| G5 | **Xem dạng cơ sở dữ liệu** trên thuộc tính: bảng / danh sách / thẻ / kanban, lọc, sắp xếp, nhóm, cột tính toán, sửa trực tiếp ô, nhúng vào note. Định dạng file **của Noteriv** | Chỉ có khối truy vấn `dataview` (chỉ đọc) và `board` | XL | Rất cao (tính năng nổi nhất của Obsidian năm 2026) | **Đợt 2** |
| G6 | **Tìm kiếm có toán tử** (`path:`, `tag:`, `file:`, `line:`, regex, phủ định), lưu truy vấn, **tìm & thay thế toàn vault** | Chỉ tìm toàn văn | L | Cao | **Đợt 2** |
| G7 | **Slash commands**: gõ `/` trong editor để chèn và định dạng | Không (chỉ có thanh công cụ) | S–M | Trung bình–cao (người mới quen kiểu Notion) | Đợt 3 |
| G8 | **Đồ thị cục bộ** của note đang mở, độ sâu, nhóm màu | Chỉ có đồ thị toàn vault | M | Trung bình | Đợt 3 |
| G9 | **Tạo note mã thời gian** (unique/Zettelkasten) | Không | S | Thấp–trung bình | Đợt 3 |
| G10 | **Ô Footnotes** của note đang mở | Footnote đã hiển thị, chưa có ô riêng | S | Thấp | Đợt 3 |
| G11 | **Xem trước khi rê chuột** vào liên kết trên desktop | Web có, desktop chưa | S | Trung bình | Đợt 3 |
| G12 | **Nhập dữ liệu từ app khác** (Notion, Evernote `.enex`, Bear, Apple Notes, Google Keep, Markdown/HTML) | Chỉ nhập thư mục hoặc `.zip` vault | L | Rất cao khi tìm người dùng mới (việc chuẩn #9 trong doi-thu.md) | **Đợt 4** |
| G13 | **Workspaces**: lưu và chuyển bố cục có tên, nhiều vùng chia, xếp chồng tab | Chỉ khôi phục phiên (tab đang mở), một vùng chia | M–L | Trung bình | Để Chặng 6 |
| G14 | **Đồng bộ mã hoá đầu-cuối** | Không (chỉ mã hoá token sync) | XL | Cao về thương mại (Obsidian Sync có) | Để Chặng 6 (quyết định kiến trúc) |
| G15 | **Web viewer** (mở link ngoài trong app) | Không | M | Thấp (trên web hay bị trang chặn nhúng) | Để Chặng 6 |
| G16 | Mở file `.md` ngoài vault, làm app Markdown mặc định (desktop) | Không | M | Thấp | Để Chặng 6 |
| G17 | Highlight nhiều màu | Không | S | Thấp | Gộp vào G7 nếu rảnh |
| G18 | Chạy được plugin và theme của Obsidian | API riêng, không tương thích | XL | Chiến lược, rủi ro cao | Không làm trong Chặng K |
| G19 | Thiếu trên phone: canvas, vẽ, PDF, ghi âm, command palette, cộng tác, WebDAV | Đang làm theo M2–M4 | — | — | Theo kế hoạch mobile |

**Noteriv có mà Obsidian không có sẵn** (giữ làm khác biệt): bản web đầy đủ, cộng tác thời gian thực trên Markdown, đồng bộ Git/WebDAV miễn phí có sẵn, flashcards, kanban `board`, dataview, ghi nhanh PWA, tự host, song ngữ Anh–Việt.

## 4. Thứ tự đề xuất

1. **Đợt 1, giữ dữ liệu đúng và thói quen cốt lõi:** G1 → G3 → G2 → G4. G1 làm trước vì đó là lỗi gãy liên kết. G3 dùng lại chỉ mục backlinks đã có. G4 là nền cho G5.
2. **Đợt 2, sức mạnh:** G5 → G6.
3. **Đợt 3, tiện ích nhỏ:** G7, G8, G9, G10, G11 (có thể gom 2–3 việc vào một phiên).
4. **Đợt 4, thu hút người mới:** G12, làm trước Notion và Evernote.

Mỗi việc là một phiên `covuaduongsinh/k-obs-<việc>` theo quy trình của Ngoại lệ 2 trong kế hoạch Chặng K. **Chủ dự án chốt danh sách và thứ tự trước khi code.**

## 5. Dùng REA cho chính Noteriv

REA (`rea-agents`, cần Node 22.19+/24.11+/26+; máy này dùng Node 24.18 qua `fnm`, vì Node 25 không được hỗ trợ) phù hợp để kiểm tra **sản phẩm của mình đã phát hành**:

| Đối tượng | Công cụ REA | Câu hỏi cần trả lời |
|---|---|---|
| Bundle web production (`web/.next` sau build) | `analyze-javascript-application` | Có lộ source map, biến môi trường, khoá bí mật hay đường dẫn nội bộ không? Có thư viện thừa làm nặng bundle không? |
| APK Android (`phone/`, bản release ở M4) | `open_binary` (kiểm kê ZIP) + `inspect_android_package` | Quyền Android khai báo, thư viện native, có vô tình đóng gói khoá hay file cấu hình không? |
| Exe desktop Tauri | `inspect_pe_resources`, `inspect_rust_binary` | Tài nguyên, icon, phiên bản crate phụ thuộc (đối chiếu lỗ hổng đã biết) |

Kết quả ghi vào [moi-mat.md](moi-mat.md) mục 2 (Kỹ thuật → Bảo mật).

# Theo dõi upstream (`thejacedev/Noteriv`)

> Quy tắc: **chỉ học ý tưởng, không merge** upstream vào repo này. Kiểm mỗi tháng. Cherry-pick vá bảo mật vào `desktop/` nếu còn áp dụng được. Mỗi lần kiểm ghi một mục mới ở đầu phần "Nhật ký".

## Cách kiểm hằng tháng

```sh
git fetch upstream
git log --oneline main..upstream/main       # commit upstream mà ta chưa có (kỳ vọng: rỗng)
git branch -r --list 'upstream/*' --format='%(refname:short) %(committerdate:short) %(subject)'
git tag --list --sort=-v:refname | head -3   # bản phát hành mới
```

## Nhật ký

### 2026-10-15 (Phiên 1.1)

- `upstream/main` dừng ở `c43cd37` (2026-09-06, "Merge pull request #29 … sanitize-and-scope"), bản 2.4.3. **Không có commit nào ta chưa có** (`main..upstream/main` rỗng); PR #29 đã nằm trong lịch sử của ta.
- Mới nhất liên quan bảo mật (đã có sẵn ở ta): làm sạch HTML sinh từ ghi chú, giới hạn quyền truy cập tệp của webview, từ chối chỉ thị click của mermaid trong nội dung ghi chú, khoanh vùng lệnh workspace trong vault. Đây là các vá cho **`desktop/`**; bản web có sandbox plugin và `sanitize-html` riêng, nhưng nên đối chiếu khi làm Giai đoạn 1 (dùng chung renderer markdown) để không mất các vá này.
- Nhánh upstream còn lại:
  - `rust-rewrite` (2026-04-14): **không có commit nào ngoài `main`** (đã nằm trong lịch sử); nhánh cũ, bỏ qua.
  - `feat/planned-features-v1.2` (2026-04-11): chỉ thêm `ROADMAP.md` 15 dòng.
- **Ý tưởng đáng làm lại** (từ `ROADMAP.md` upstream, chưa thực hiện ở upstream):
  1. *Extract selection to new note*: chọn đoạn, tách sang ghi chú mới và thay bằng `[[wiki-link]]`. Hợp với ghi chú cờ vua (tách một biến, một thế cờ thành ghi chú riêng). Ứng viên cho core plugin ở Giai đoạn 2–3.
  2. *Advanced search filters*: `tag:`, `folder:`, `created:`, `has:tasks`. Hợp với tìm ván theo khai cuộc, đối thủ, ngày (Giai đoạn 3).
  3. *Export DOCX/EPUB*: mở rộng xuất ngoài PDF, hữu ích khi gửi giáo án cho giáo viên khác.
  4. *Note encryption (per-note)* và *Clipboard history*: ưu tiên thấp; mã hoá từng ghi chú cần cân nhắc kỹ với đồng bộ và cộng tác.
- Việc phải làm tiếp: lần kiểm kế tiếp vào khoảng 2026-11-15.

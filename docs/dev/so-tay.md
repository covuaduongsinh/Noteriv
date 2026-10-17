# Sổ tay phát triển (tiếng Việt)

> Phần vận hành chuyển từ README cũ (2026-10-17). README nay viết bằng tiếng Anh cho người ngoài; sổ tay này dành cho chủ dự án và các phiên làm việc. Chi tiết đầy đủ (hạ tầng, kiểm thử, bài học): [`docs/plans/2026-10-14-huong-dan-ban-giao-phien.md`](../plans/2026-10-14-huong-dan-ban-giao-phien.md).

## Định hướng

Noteriv là sản phẩm ghi chú tri thức chung, hướng tới thương mại quốc tế. Phiên bản chuyên cho cờ vua làm sau, dưới dạng gói core plugin. Lộ trình: [`docs/plans/2026-10-17-lo-trinh-thuong-mai.md`](../plans/2026-10-17-lo-trinh-thuong-mai.md).

## Mô hình nhánh (từ 2026-10-17)

| Nhánh | Vai trò |
|---|---|
| `main` | **Production.** Push `main` thì Dokploy tự triển khai (5–8 phút). Không force-push. |
| `next` | **Staging / tích hợp.** Staging tự triển khai từ nhánh này. Đưa về bằng `main` sau mỗi mốc. |
| `covuaduongsinh/<chặng>-<việc>` | Nhánh làm việc ngắn, tách từ `main`. Thử trên staging bằng cách gộp vào `next`; xong thì gộp vào `main` qua PR (CI chỉ chạy khi có PR hoặc push `main`). |
| `covuaduongsinh/chess-<phiên>` | Phiên bản cờ vua, làm trong worktree riêng tách từ `main`. |

Chỉ gộp vào `main` khi đã thử trên staging, CI xanh và chủ dự án đồng ý.

## Phát triển

`web/`, `desktop/` và `packages/*` là **npm workspaces** (`web/server` và `web/pdf-service` thì không: mỗi cái có lockfile và Docker build riêng). Cài **một lần ở gốc repo**:

```sh
npm install                 # gốc repo; cho nhanh: npm install -w web -w @noteriv/core --include-workspace-root
npm test                    # Vitest: packages/core, packages/ui, packages/plugins
npm run typecheck           # core, web, desktop
npm run dev:web             # web ở http://localhost:3457 (cần API chạy ở cổng 4001)
npm run build:web           # Next standalone
npm run build:desktop       # giao diện desktop (xuất tĩnh); đóng gói Tauri: cd desktop && npm run build
```

Logic dùng chung nằm ở `packages/core` (`@noteriv/core`, TypeScript thuần, import bằng `@noteriv/core/<module>`); giao diện dùng chung (renderer markdown, editor, panel) ở `packages/ui` (`@noteriv/ui`); core plugin ở `packages/plugins`. API: `cd web/server && npm install && npm run dev`.

## Tài liệu

- Lộ trình và kế hoạch từng chặng, phiên: [`docs/plans/`](../plans/).
- Vận hành (cho người không chuyên): [`docs/ops/`](../ops/): triển khai, sao lưu và khôi phục, giám sát, xử lý sự cố, danh mục bí mật.
- Plugin API: [`docs/plugin-api/v1.md`](../plugin-api/v1.md).
- Theo dõi upstream: [`docs/upstream-notes.md`](../upstream-notes.md). Chỉ học ý tưởng từ upstream, không merge.

## Giấy phép

MIT. Giữ nguyên bản quyền của tác giả gốc; nguồn gốc và quy tắc dùng mã bên thứ ba ở [`NOTICE.md`](../../NOTICE.md). Mã hay dữ liệu chép từ dự án khác phải ghi vào `NOTICE.md` **ngay lúc chép**.

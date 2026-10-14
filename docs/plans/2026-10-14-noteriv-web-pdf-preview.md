# Kế hoạch: xem trước PDF trước khi tải

> Khi được duyệt: sao chép file này vào `docs/plans/2026-10-14-noteriv-web-pdf-preview.md`.

## Bối cảnh

Đợt B đã cho phép File → "Tải PDF" tạo và tải ngay file PDF thật (Chromium trên máy chủ). Bạn muốn **xem trước PDF rồi mới quyết định tải**. Hiện **chưa có** tính năng xem trước: `handleExportPDF` (`web/src/app/vaults/[vaultId]/page.tsx:1017`) gọi `downloadPdf` và tải về luôn.

## Hướng làm (nhỏ, tái dùng hạ tầng sẵn có)

Không cần đổi máy chủ: endpoint `POST /vaults/:vid/notes/:nid/pdf` đã trả đúng file PDF. Xem trước = hiển thị chính blob PDF đó trong một modal bằng trình xem PDF có sẵn của trình duyệt (`<iframe src="blob:…">`), nên bản xem trước **giống hệt** file sẽ tải (cùng phông, 1/2 cột, bàn cờ). Không có CSP/X-Frame-Options trong web nên iframe `blob:` hoạt động.

### 1. `web/src/lib/pdf-export.ts`
- Tách `downloadPdf` thành 2 hàm dùng chung `buildPdfDocument`:
  - `renderPdf(vaultId, noteId, content, title, options): Promise<{ blob: Blob; filename: string }>` — dựng HTML, gọi `webApi.pdf.render`, tính tên file `<tên note>.pdf` (logic tên hiện có).
  - `saveBlob(blob, filename)` — phần tạo `<a download>` hiện có.
- `downloadPdf` = `renderPdf` + `saveBlob` (hành vi cũ giữ nguyên).

### 2. Component mới `web/src/components/PdfPreviewModal.tsx`
- Props: `{ blob, filename, onDownload, onClose }`. Tạo `URL.createObjectURL(blob)` trong `useEffect`, thu hồi khi đóng.
- Giao diện (đúng kiểu `DiagnosticsModal`: overlay + hộp `bg-[var(--bg-secondary)]`, chữ tiếng Việt): thanh trên có tên file, nút **Tải PDF**, **In** (`iframe.contentWindow.print()`; bọc try/catch), **Đóng**; thân là `<iframe>` chiếm ~85vh, rộng `min(1000px, 94vw)`. Esc/click nền để đóng.
- Lưới an toàn: dưới iframe một dòng nhỏ "Trình duyệt không hiển thị được? Bấm Tải PDF" (một số trình duyệt di động không nhúng PDF).

### 3. `page.tsx` + menu
- State `pdfPreview: { blob; filename } | null`.
- Hàm mới `handlePreviewPDF()`: giống `handleExportPDF` (thông báo "Đang tạo bản xem trước…", cùng xử lý lỗi) nhưng gọi `renderPdf` rồi `setPdfPreview`. Render modal cạnh `DiagnosticsModal`; `onDownload` gọi `saveBlob` và giữ modal mở.
- Hành động mới `previewPDF` trong `lib/hotkeys.ts` (nhãn "Xem trước PDF", category File) và mục menu **File → Xem trước PDF** (đặt trên "Tải PDF") trong `AppMenu.tsx`; thêm `case "previewPDF"` trong `executeCommand` (cạnh dòng ~820). Nút PDF trên `NoteToolbar.tsx` giữ nguyên là "Tải PDF" (tải nhanh).
- Tuỳ chọn 1/2 cột và cỡ bàn cờ trong Settings tiếp tục áp dụng; có thể bổ sung sau cho đổi tuỳ chọn ngay trong modal (ngoài phạm vi lần này).

## Kiểm thử
- Dev (tunnel + API + worker + `next dev` + service PDF cục bộ, như đợt B): note có bàn cờ + tiếng Việt → File → Xem trước PDF → modal hiện PDF 2 cột đúng dấu; bấm Tải PDF trong modal tải đúng file; Đóng/Esc thu hồi blob; lỗi dịch vụ (tắt service PDF) hiện thông báo thay vì modal rỗng. Chụp màn hình để xác nhận.
- `tsc` (web), `next build`; commit một lần; **hỏi bạn trước khi push/deploy** (chỉ đổi frontend nên deploy nhanh, không cần secret/hạ tầng mới).

## Rủi ro
- Chrome nhúng PDF trong iframe tốt; Safari/di động có thể chỉ hiện trang đầu hoặc không hiện — đã có dòng gợi ý tải.

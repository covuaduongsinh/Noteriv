import { createElement } from "react";
import { createRoot } from "react-dom/client";
import type { CorePlugin, PluginApi } from "@noteriv/plugin-api";
import { isPdfFile } from "./annotations";
import { PDFViewer } from "./PDFViewer";
import { pluginPdfServices, type PdfLabels } from "./services";

export { annotationsToMarkdown, readStoredAnnotations, toStoredAnnotations, generateAnnotationId, isPdfFile, type PDFAnnotation } from "./annotations";
export { exportPath, pluginPdfServices, type PdfServices, type PdfLabels } from "./services";

export const VIEWER_ID = "pdf";

// Web speaks Vietnamese, desktop English (same convention as the other core plugins).
const TEXT: Record<"web" | "desktop", PdfLabels> = {
  web: {
    loading: "Đang tải PDF...",
    loadFailed: "Không tải được PDF",
    openFailed: "Không mở được tệp PDF",
    previousPage: "Trang trước",
    nextPage: "Trang sau",
    zoomIn: "Phóng to",
    zoomOut: "Thu nhỏ",
    fitWidth: "Vừa chiều rộng",
    fitPage: "Vừa trang",
    select: "Công cụ chọn",
    highlight: "Tô sáng",
    note: "Ghi chú",
    underline: "Gạch chân",
    toggleSidebar: "Hiện/ẩn danh sách chú thích",
    export: "Xuất chú thích ra note",
    close: "Đóng",
    notePlaceholder: "Nhập ghi chú...",
    commentPlaceholder: "Thêm nhận xét...",
    addNote: "Thêm ghi chú",
    cancel: "Huỷ",
    save: "Lưu",
    delete: "Xoá",
    annotations: "Chú thích",
    empty: "Chưa có chú thích. Dùng công cụ tô sáng, ghi chú hoặc gạch chân.",
    pageShort: "tr.",
    exportFailed: "Không xuất được chú thích.",
  },
  desktop: {
    loading: "Loading PDF...",
    loadFailed: "Could not load the PDF",
    openFailed: "Could not open the PDF",
    previousPage: "Previous page",
    nextPage: "Next page",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    fitWidth: "Fit width",
    fitPage: "Fit page",
    select: "Select",
    highlight: "Highlight",
    note: "Note",
    underline: "Underline",
    toggleSidebar: "Show/hide annotations",
    export: "Export annotations to a note",
    close: "Close",
    notePlaceholder: "Type a note...",
    commentPlaceholder: "Add a comment...",
    addNote: "Add note",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    annotations: "Annotations",
    empty: "No annotations yet. Use the highlight, note or underline tool.",
    pageShort: "p.",
    exportFailed: "Could not export the annotations.",
  },
};

/** PDF viewer: read PDFs and annotate them (highlight, underline, notes); export the annotations to a note. */
const pdfViewer: CorePlugin = {
  onload(api: PluginApi) {
    const labels = TEXT[api.app.platform];
    api.ui.registerAttachmentViewer({
      id: VIEWER_ID,
      match: (file) => isPdfFile(file.name),
      mount(container, ctx) {
        const services = pluginPdfServices(api, labels, () => ctx.close());
        const root = createRoot(container);
        root.render(createElement(PDFViewer, { target: ctx.target, name: ctx.name, services, labels, onClose: () => ctx.close() }));
        // Unmount may be asked for while React is dispatching one of the viewer's own events: wait a tick.
        return () => void setTimeout(() => root.unmount(), 0);
      },
    });
  },
};

export default pdfViewer;

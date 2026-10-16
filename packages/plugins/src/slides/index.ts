import { createElement } from "react";
import type { CorePlugin, PluginApi } from "@noteriv/plugin-api";
import { reactView } from "../shared/react-view";
import { SlidePresentation, type SlideLabels } from "./SlidePresentation";

export const VIEW_TYPE = "slides";

// Web speaks Vietnamese, desktop English (same convention as the other core plugins).
const TEXT: Record<"web" | "desktop", SlideLabels & { command: string; title: string; noNote: string }> = {
  web: {
    command: "Trình chiếu note hiện tại",
    title: "Trình chiếu",
    noNote: "Mở một ghi chú để trình chiếu.",
    exit: "Thoát",
    notes: "Ghi chú",
    overview: "Tổng quan",
    print: "In",
    speakerNotes: "Ghi chú người trình bày",
    overviewTitle: (n) => `Tổng quan (${n} trang)`,
    closeOverview: "Đóng tổng quan",
    separatorHint: "Dùng --- trên một dòng riêng để tách trang",
  },
  desktop: {
    command: "Start presentation",
    title: "Presentation",
    noNote: "Open a note to present it.",
    exit: "Exit",
    notes: "Notes",
    overview: "Overview",
    print: "Print",
    speakerNotes: "Speaker Notes",
    overviewTitle: (n) => `Slide Overview (${n} slides)`,
    closeOverview: "Close Overview",
    separatorHint: "Use --- on its own line to separate slides",
  },
};

const ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="9" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M8 11.5V14M5.5 14h5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';

/** Slides: present the open note full screen, one slide per `---` section. */
const slides: CorePlugin = {
  onload(api: PluginApi) {
    const t = TEXT[api.app.platform];
    // The note as it was when the presentation started; the view is not live.
    let content = "";
    api.ui.registerView(
      VIEW_TYPE,
      reactView(() => createElement(SlidePresentation, { content, labels: t, onClose: () => api.workspace.closeView() }))
    );
    const present = () => {
      const current = api.editor.getContent();
      if (current === null) {
        api.ui.showNotice(t.noNote);
        return;
      }
      content = current;
      void api.workspace.openView(VIEW_TYPE);
    };
    api.ui.addCommand({ id: "present", name: t.command, callback: present });
    api.ui.addRibbonIcon({ id: "present", title: t.title, icon: ICON, onClick: present });
    api.ui.addNoteToolbarButton({ id: "present", title: t.title, icon: ICON, onClick: present });
  },
};

export default slides;

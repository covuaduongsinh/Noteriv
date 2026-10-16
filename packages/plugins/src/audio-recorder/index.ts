import { createElement } from "react";
import type { CorePlugin, PluginApi } from "@noteriv/plugin-api";
import { reactView } from "../shared/react-view";
import { AudioRecorder, type RecorderLabels } from "./AudioRecorder";

export { generateRecordingFilename, formatDuration, audioMarkdown, saveErrorMessage } from "./recording";

export const VIEW_TYPE = "audio-recorder";

// Web speaks Vietnamese, desktop English (same convention as the other core plugins).
const TEXT: Record<"web" | "desktop", RecorderLabels & { command: string }> = {
  web: {
    command: "Ghi âm: ghi và chèn vào note",
    title: "Ghi âm",
    close: "Đóng",
    idle: "Sẵn sàng ghi âm",
    requesting: "Đang xin quyền microphone...",
    recording: "Đang ghi âm...",
    recorded: "Đã ghi xong",
    saving: "Đang lưu...",
    start: "Bắt đầu ghi âm",
    stop: "Dừng ghi âm",
    discard: "Huỷ",
    save: "Lưu bản ghi",
    denied: "Quyền truy cập microphone bị từ chối. Vui lòng cho phép và thử lại.",
    noMic: (m) => `Không thể truy cập microphone: ${m}`,
    saveFailed: "Lưu bản ghi âm thất bại — có thể đã vượt hạn mức lưu trữ của vault.",
    savedNoNote: (t) => `Đã lưu bản ghi (${t}). Mở một ghi chú để chèn link.`,
  },
  desktop: {
    command: "Audio recorder: record and insert",
    title: "Audio Recorder",
    close: "Close",
    idle: "Ready to record",
    requesting: "Requesting microphone access...",
    recording: "Recording...",
    recorded: "Recording complete",
    saving: "Saving...",
    start: "Start recording",
    stop: "Stop recording",
    discard: "Discard",
    save: "Save Recording",
    denied: "Microphone access was denied. Please allow it and try again.",
    noMic: (m) => `Could not access microphone: ${m}`,
    saveFailed: "Failed to save the recording.",
    savedNoNote: (t) => `Recording saved (${t}). Open a note to insert the link.`,
  },
};

const ICON =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5.5" y="1.5" width="5" height="8" rx="2.5" stroke="currentColor" stroke-width="1.2"/><path d="M3 7.5a5 5 0 0010 0M8 12.5V15" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';

/** Audio recorder: record from the microphone and insert the recording into the open note. */
const audioRecorder: CorePlugin = {
  onload(api: PluginApi) {
    const t = TEXT[api.app.platform];
    api.ui.registerView(VIEW_TYPE, reactView(() => createElement(AudioRecorder, { api, labels: t })));
    const open = () => void api.workspace.openView(VIEW_TYPE);
    api.ui.addCommand({ id: "record", name: t.command, callback: open });
    api.ui.addRibbonIcon({ id: "record", title: t.title, icon: ICON, onClick: open });
  },
};

export default audioRecorder;

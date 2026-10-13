/**
 * Audio recording helpers (Phase D8). Only the pure, storage-agnostic pieces
 * of desktop/src/lib/audio-utils.ts are ported here — the actual save step
 * goes through the Attachment API (web/src/lib/webApi.ts's `attachments`
 * namespace) instead of the electronAPI/base64 IPC round-trip desktop uses,
 * so `getAttachmentsDir`/`blobToBase64`/`saveAudioToVault` have no web
 * equivalent and are intentionally not ported.
 */

/** Generate a filename for an audio recording based on the current timestamp. */
export function generateRecordingFilename(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `recording-${date}-${time}.webm`;
}

/** Format seconds into a mm:ss display string. */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

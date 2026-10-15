/**
 * Note Publish / Share — desktop side. The page generator itself is shared with web
 * (@noteriv/core/publish); only the save dialog and file write live here, because they need
 * the Tauri/Electron bridge.
 */

import { generatePublishHTML } from "@noteriv/core/publish";

export { generatePublishHTML };

/** Prompt user where to save, write HTML, and open it */
export async function publishNote(content: string, title: string): Promise<string | null> {
  if (!window.electronAPI) return null;
  const html = generatePublishHTML(content, title);
  const defaultPath = `${title.replace(/[^a-zA-Z0-9-_ ]/g, "")}.html`;
  const filePath = await window.electronAPI.saveHtmlDialog(defaultPath);
  if (!filePath) return null;
  const success = await window.electronAPI.writeFile(filePath, html);
  return success ? filePath : null;
}

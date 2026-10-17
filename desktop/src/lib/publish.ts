/**
 * Note Publish / Share — desktop side. The page generator is shared with web (@noteriv/core/publish); the save
 * dialog and file write are in components/PublishPreview.tsx, which needs the Tauri/Electron bridge.
 */

import { generatePublishHTML } from "@noteriv/core/publish";

export { generatePublishHTML };


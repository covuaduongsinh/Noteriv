/**
 * Places where a live-preview renderer needs something from the host app that the UI package cannot know: where
 * a local image lives. (Dataview used to take its notes from here; since 2.5 it is a core plugin reading the vault
 * through the plugin API.) The app registers a function once (typically in
 * an effect that follows the active vault) and clears it on teardown. Nothing here talks to a backend itself.
 */

/**
 * Turns a note-relative image source into bytes. Used by the desktop app, whose vault is a folder of files the
 * browser cannot load directly; the web app leaves it unset (its images are URLs).
 */
export interface LocalImageLoader {
  /** Absolute path for a relative `src`, or null when the source is not a local file. */
  resolve(src: string): string | null;
  /** File contents as base64, or null when unreadable. */
  load(absolutePath: string): Promise<string | null>;
}

let localImageLoader: LocalImageLoader | null = null;

export function setLocalImageLoader(loader: LocalImageLoader | null): void {
  localImageLoader = loader;
}

export function getLocalImageLoader(): LocalImageLoader | null {
  return localImageLoader;
}

/**
 * Runs the core plugins' markdown post-processors (`markdown.registerPostProcessor`) over a piece of rendered note
 * DOM. The app registers its plugin host's runner; rendered widgets call it on the element they own (CodeMirror's
 * own line DOM is redrawn at will, so it is not handed to plugins).
 */
export type PostProcessorRunner = (el: HTMLElement, ctx: { sourcePath: string | null }) => void;

let postProcessorRunner: PostProcessorRunner | null = null;

export function setPostProcessorRunner(runner: PostProcessorRunner | null): void {
  postProcessorRunner = runner;
}

export function getPostProcessorRunner(): PostProcessorRunner | null {
  return postProcessorRunner;
}

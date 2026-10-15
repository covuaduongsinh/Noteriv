/**
 * Places where a live-preview renderer needs something from the host app that the UI package cannot know: where
 * a local image lives, and which notes a dataview query runs over. The app registers a function once (typically in
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

/** One note as a dataview query sees it. */
export interface DataviewSourceNote {
  path: string;
  content: string;
  created: string;
  modified: string;
  size: number;
}

export type DataviewSource = () => Promise<DataviewSourceNote[]>;

let dataviewSource: DataviewSource | null = null;

export function setDataviewSource(source: DataviewSource | null): void {
  dataviewSource = source;
}

export function getDataviewSource(): DataviewSource | null {
  return dataviewSource;
}

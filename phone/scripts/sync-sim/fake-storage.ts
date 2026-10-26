// In-memory stand-in for lib/storage.ts (AsyncStorage is not available outside the app).
const store = new Map<string, unknown>();

export const KEYS = {
  GIT_TOKEN: (id: string) => `git-token-${id}`,
  GITHUB_TOKEN: (id: string) => `github-token-${id}`,
};

export async function getItem<T>(key: string): Promise<T | null> {
  return store.has(key) ? (store.get(key) as T) : null;
}

export async function setItem<T>(key: string, value: T): Promise<void> {
  store.set(key, value);
}

export async function removeItem(key: string): Promise<void> {
  store.delete(key);
}

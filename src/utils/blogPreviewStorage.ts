// =============================================
// BLOG PREVIEW STORAGE (IndexedDB)
//
// The Blog Preview hand-off and the edit-mode preview round-trip snapshot used
// to live in localStorage. Blog content carries inline base64 images and
// attachment data URLs, so a large blog can exceed the ~5MB localStorage quota
// and the write would fail silently, leaving the preview tab with stale or no
// data. IndexedDB has no such size limit, so the hand-off survives any blog
// size. Values are stored via structured clone under the same storage keys.
// =============================================

const DB_NAME = 'blog-draft-preview';
const DB_VERSION = 1;
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('Failed to open IndexedDB'));
    });
  }
  return dbPromise;
};

export const readPreviewValue = async <T>(key: string): Promise<T | null> => {
  const db = await getDb();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).get(key);
    request.onsuccess = () => resolve((request.result as T) ?? null);
    request.onerror = () => resolve(null);
  });
};

export const writePreviewValue = async <T>(
  key: string,
  value: T
): Promise<void> => {
  const db = await getDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const request = transaction.objectStore(STORE).put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error ?? new Error('Failed to write preview data'));
  });
};

export const removePreviewValue = async (key: string): Promise<void> => {
  const db = await getDb();
  return new Promise((resolve) => {
    const transaction = db.transaction(STORE, 'readwrite');
    const request = transaction.objectStore(STORE).delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
};
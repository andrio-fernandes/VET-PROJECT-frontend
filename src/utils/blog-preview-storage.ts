// Blog preview storage via IndexedDB. Replaces localStorage which can
// silently fail on large blogs with inline base64 images.

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
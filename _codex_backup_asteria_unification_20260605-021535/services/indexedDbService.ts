export const ASTERIA_DB_VERSION = 2;
export const ASTERIA_DB_NAME = 'asteria_local_workspace';

export function isIndexedDbAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!window.indexedDB;
}

export function openAsteriaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isIndexedDbAvailable()) {
      return reject(new Error('IndexedDB is not available'));
    }

    const request = window.indexedDB.open(ASTERIA_DB_NAME, ASTERIA_DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('folderHandles')) {
        db.createObjectStore('folderHandles');
      }
      if (!db.objectStoreNames.contains('workspaceMetadata')) {
        db.createObjectStore('workspaceMetadata');
      }
      if (!db.objectStoreNames.contains('preferences')) {
        db.createObjectStore('preferences');
      }
      if (!db.objectStoreNames.contains('thumbnailCache')) {
        db.createObjectStore('thumbnailCache');
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result as IDBDatabase);
    };
  });
}

export async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  try {
    const db = await openAsteriaDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as T | null);
    });
  } catch (e) {
    console.warn(`[IDB] Failed to get ${key} from ${storeName}:`, e);
    return null;
  }
}

export async function idbSet<T>(storeName: string, key: string, value: T): Promise<void> {
  try {
    const db = await openAsteriaDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (e) {
    console.warn(`[IDB] Failed to set ${key} in ${storeName}:`, e);
  }
}

export async function idbDelete(storeName: string, key: string): Promise<void> {
  try {
    const db = await openAsteriaDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (e) {
    console.warn(`[IDB] Failed to delete ${key} in ${storeName}:`, e);
  }
}

export type StorageDriver = 'localStorage' | 'indexedDB-ready';

export interface StorageRecord<T> {
  version: number;
  updatedAt: string;
  data: T;
}

export function isStorageAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        const testKey = '__asteria_test__';
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        return true;
    } catch {
        return false;
    }
}

export function safeGetJson<T>(key: string, fallback: T): T {
    if (!isStorageAvailable()) return fallback;
    try {
        const item = window.localStorage.getItem(key);
        if (!item) return fallback;
        const parsed = JSON.parse(item);
        if (parsed && typeof parsed === 'object' && 'version' in parsed && 'data' in parsed && 'updatedAt' in parsed) {
            return (parsed as StorageRecord<T>).data;
        }
        // Fallback for old data without StorageRecord wrapper
        return parsed as T;
    } catch (e) {
        console.warn(`Failed to read or parse from storage for key: ${key}`, e);
        return fallback;
    }
}

export function safeSetJson<T>(key: string, value: T, version: number = 1): void {
    if (!isStorageAvailable()) return;
    try {
        const record: StorageRecord<T> = {
            version,
            updatedAt: new Date().toISOString(),
            data: value
        };
        window.localStorage.setItem(key, JSON.stringify(record));
    } catch (e) {
        console.warn(`Failed to save to storage for key: ${key}`, e);
    }
}

export function safeRemove(key: string): void {
    if (!isStorageAvailable()) return;
    try {
        window.localStorage.removeItem(key);
    } catch (e) {
        console.warn(`Failed to remove from storage for key: ${key}`, e);
    }
}

import { isTauriAvailable } from './tauriBridge';
import type { StorageRecord } from './storageService';
import type { ThumbnailCacheEntry } from '@/types/asteria';

const ASTERIA_DB_URL = 'sqlite:asteria.db';
const LOCAL_STORAGE_NAMESPACE = 'localStorage';

type SqlDatabase = {
  execute: (query: string, bindValues?: unknown[]) => Promise<unknown>;
  select: <T>(query: string, bindValues?: unknown[]) => Promise<T>;
};

let dbPromise: Promise<SqlDatabase | null> | null = null;
let migrationPromise: Promise<void> | null = null;

export function isSqlitePersistenceAvailable(): boolean {
  return isTauriAvailable();
}

async function loadDatabase(): Promise<SqlDatabase | null> {
  if (!isSqlitePersistenceAvailable()) return null;
  if (!dbPromise) {
    dbPromise = import('@tauri-apps/plugin-sql')
      .then((module) => module.default.load(ASTERIA_DB_URL) as Promise<SqlDatabase>)
      .then(async (db) => {
        await ensureSchema(db);
        return db;
      })
      .catch((error) => {
        console.warn('[Persistence] SQLite unavailable, using browser fallback:', error);
        dbPromise = null;
        return null;
      });
  }
  return dbPromise;
}

async function ensureSchema(db: SqlDatabase): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS kv_store (
      namespace TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (namespace, key)
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS thumbnail_cache (
      cache_key TEXT PRIMARY KEY,
      asset_id TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      size INTEGER NOT NULL,
      blob BLOB NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  await db.execute(
    'INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES ($1, $2)',
    [1, new Date().toISOString()],
  );
}

export async function initializePersistence(): Promise<boolean> {
  const db = await loadDatabase();
  return Boolean(db);
}

export function migrateLocalStorageToSqlite(): Promise<void> {
  if (!isSqlitePersistenceAvailable()) return Promise.resolve();
  if (!migrationPromise) {
    migrationPromise = (async () => {
      const db = await loadDatabase();
      if (!db || typeof window === 'undefined') return;

      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (!key) continue;
        const value = window.localStorage.getItem(key);
        if (!value) continue;
        await setJsonRecord(LOCAL_STORAGE_NAMESPACE, key, value);
      }
    })().catch((error) => {
      console.warn('[Persistence] LocalStorage to SQLite migration failed:', error);
    });
  }
  return migrationPromise;
}

export async function getJsonRecord(namespace: string, key: string): Promise<string | null> {
  const db = await loadDatabase();
  if (!db) return null;
  const rows = await db.select<Array<{ value_json: string }>>(
    'SELECT value_json FROM kv_store WHERE namespace = $1 AND key = $2 LIMIT 1',
    [namespace, key],
  );
  return rows[0]?.value_json ?? null;
}

export async function setJsonRecord(namespace: string, key: string, valueJson: string): Promise<void> {
  const db = await loadDatabase();
  if (!db) return;
  await db.execute(
    `INSERT INTO kv_store (namespace, key, value_json, updated_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(namespace, key)
     DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
    [namespace, key, valueJson, new Date().toISOString()],
  );
}

export async function deleteJsonRecord(namespace: string, key: string): Promise<void> {
  const db = await loadDatabase();
  if (!db) return;
  await db.execute('DELETE FROM kv_store WHERE namespace = $1 AND key = $2', [namespace, key]);
}

export async function mirrorStorageRecord<T>(key: string, record: StorageRecord<T>): Promise<void> {
  await setJsonRecord(LOCAL_STORAGE_NAMESPACE, key, JSON.stringify(record));
}

function bytesToBlob(value: unknown, mimeType: string): Blob | null {
  if (value instanceof Blob) return value;
  if (value instanceof ArrayBuffer) return new Blob([value], { type: mimeType });
  if (ArrayBuffer.isView(value)) {
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    const copy = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(copy).set(bytes);
    return new Blob([copy], { type: mimeType });
  }
  if (Array.isArray(value)) {
    return new Blob([new Uint8Array(value)], { type: mimeType });
  }
  return null;
}

export async function getThumbnailFromSqlite(cacheKey: string): Promise<ThumbnailCacheEntry | null> {
  const db = await loadDatabase();
  if (!db) return null;
  const rows = await db.select<Array<{
    cache_key: string;
    asset_id: string;
    mime_type: string;
    width: number;
    height: number;
    size: number;
    blob: unknown;
    updated_at: string;
  }>>(
    `SELECT cache_key, asset_id, mime_type, width, height, size, blob, updated_at
     FROM thumbnail_cache
     WHERE cache_key = $1
     LIMIT 1`,
    [cacheKey],
  );
  const row = rows[0];
  if (!row) return null;
  const blob = bytesToBlob(row.blob, row.mime_type);
  if (!blob) return null;
  return {
    id: row.cache_key,
    assetId: row.asset_id,
    cacheKey: row.cache_key,
    width: row.width,
    height: row.height,
    mimeType: row.mime_type,
    size: row.size,
    createdAt: row.updated_at,
    updatedAt: row.updated_at,
    blob,
  };
}

export async function saveThumbnailToSqlite(entry: ThumbnailCacheEntry): Promise<void> {
  const db = await loadDatabase();
  if (!db || !entry.blob) return;
  const bytes = new Uint8Array(await entry.blob.arrayBuffer());
  await db.execute(
    `INSERT INTO thumbnail_cache (cache_key, asset_id, mime_type, width, height, size, blob, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT(cache_key)
     DO UPDATE SET
       asset_id = excluded.asset_id,
       mime_type = excluded.mime_type,
       width = excluded.width,
       height = excluded.height,
       size = excluded.size,
       blob = excluded.blob,
       updated_at = excluded.updated_at`,
    [
      entry.cacheKey,
      entry.assetId,
      entry.mimeType,
      entry.width,
      entry.height,
      entry.size,
      bytes,
      entry.updatedAt || new Date().toISOString(),
    ],
  );
}

export async function deleteThumbnailFromSqlite(cacheKey: string): Promise<void> {
  const db = await loadDatabase();
  if (!db) return;
  await db.execute('DELETE FROM thumbnail_cache WHERE cache_key = $1', [cacheKey]);
}

export async function clearThumbnailCacheSqlite(): Promise<void> {
  const db = await loadDatabase();
  if (!db) return;
  await db.execute('DELETE FROM thumbnail_cache');
}

void initializePersistence().then((ready) => {
  if (ready) {
    void migrateLocalStorageToSqlite();
  }
});

import type { ThumbnailCacheEntry } from '@/types/asteria';
import { isTauriAvailable } from './tauriBridge';

const ASTERIA_DB_URL = 'sqlite:asteria.db';

export type MigrationState = 'running' | 'completed' | 'failed';

export interface MigrationRecord {
  migrationId: string;
  state: MigrationState;
  startedAt: string;
  completedAt?: string;
  importedCount: number;
  error?: string;
}

type SqlDatabase = {
  execute: (query: string, bindValues?: unknown[]) => Promise<{ rowsAffected?: number }>;
  select: <T>(query: string, bindValues?: unknown[]) => Promise<T>;
};

let dbPromise: Promise<SqlDatabase> | null = null;

export function isSqlitePersistenceAvailable(): boolean {
  return isTauriAvailable();
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
  await db.execute(`
    CREATE TABLE IF NOT EXISTS folder_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      native_path TEXT NOT NULL UNIQUE,
      metadata_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS migration_log (
      migration_id TEXT PRIMARY KEY,
      state TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      imported_count INTEGER NOT NULL DEFAULT 0,
      error TEXT
    );
  `);
  await db.execute(
    'INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES ($1, $2)',
    [2, new Date().toISOString()],
  );
}

export async function getDatabase(): Promise<SqlDatabase> {
  if (!isSqlitePersistenceAvailable()) {
    throw new Error('Asteria requires the native Tauri runtime with SQLite.');
  }
  if (!dbPromise) {
    dbPromise = import('@tauri-apps/plugin-sql')
      .then((module) => module.default.load(ASTERIA_DB_URL) as Promise<SqlDatabase>)
      .then(async (db) => {
        await ensureSchema(db);
        return db;
      })
      .catch((error) => {
        dbPromise = null;
        throw error;
      });
  }
  return dbPromise;
}

export async function initializePersistence(): Promise<void> {
  await getDatabase();
}

export async function getJsonRecord<T>(namespace: string, key: string): Promise<T | null> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ value_json: string }>>(
    'SELECT value_json FROM kv_store WHERE namespace = $1 AND key = $2 LIMIT 1',
    [namespace, key],
  );
  if (!rows[0]) return null;
  return JSON.parse(rows[0].value_json) as T;
}

export async function listJsonRecords<T>(namespace: string): Promise<Array<{ key: string; value: T }>> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ key: string; value_json: string }>>(
    'SELECT key, value_json FROM kv_store WHERE namespace = $1 ORDER BY updated_at DESC',
    [namespace],
  );
  return rows.map((row) => ({ key: row.key, value: JSON.parse(row.value_json) as T }));
}

export async function setJsonRecord<T>(namespace: string, key: string, value: T): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO kv_store (namespace, key, value_json, updated_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT(namespace, key)
     DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
    [namespace, key, JSON.stringify(value), new Date().toISOString()],
  );
}

export async function deleteJsonRecord(namespace: string, key: string): Promise<void> {
  const db = await getDatabase();
  await db.execute('DELETE FROM kv_store WHERE namespace = $1 AND key = $2', [namespace, key]);
}

export async function getMigrationRecord(migrationId: string): Promise<MigrationRecord | null> {
  const db = await getDatabase();
  const rows = await db.select<Array<{
    migration_id: string;
    state: MigrationState;
    started_at: string;
    completed_at: string | null;
    imported_count: number;
    error: string | null;
  }>>(
    `SELECT migration_id, state, started_at, completed_at, imported_count, error
     FROM migration_log WHERE migration_id = $1 LIMIT 1`,
    [migrationId],
  );
  const row = rows[0];
  return row ? {
    migrationId: row.migration_id,
    state: row.state,
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    importedCount: row.imported_count,
    error: row.error ?? undefined,
  } : null;
}

export async function saveMigrationRecord(record: MigrationRecord): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO migration_log
      (migration_id, state, started_at, completed_at, imported_count, error)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT(migration_id) DO UPDATE SET
       state = excluded.state,
       completed_at = excluded.completed_at,
       imported_count = excluded.imported_count,
       error = excluded.error`,
    [
      record.migrationId,
      record.state,
      record.startedAt,
      record.completedAt ?? null,
      record.importedCount,
      record.error ?? null,
    ],
  );
}

function bytesToBlob(value: unknown, mimeType: string): Blob | null {
  if (value instanceof Blob) return value;
  if (value instanceof ArrayBuffer) return new Blob([value], { type: mimeType });
  if (ArrayBuffer.isView(value)) {
    const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    return new Blob([new Uint8Array(bytes)], { type: mimeType });
  }
  if (Array.isArray(value)) return new Blob([new Uint8Array(value)], { type: mimeType });
  return null;
}

export async function getThumbnailFromSqlite(cacheKey: string): Promise<ThumbnailCacheEntry | null> {
  const db = await getDatabase();
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
     FROM thumbnail_cache WHERE cache_key = $1 LIMIT 1`,
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
  if (!entry.blob) return;
  const db = await getDatabase();
  const bytes = new Uint8Array(await entry.blob.arrayBuffer());
  await db.execute(
    `INSERT INTO thumbnail_cache
      (cache_key, asset_id, mime_type, width, height, size, blob, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT(cache_key) DO UPDATE SET
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
  const db = await getDatabase();
  await db.execute('DELETE FROM thumbnail_cache WHERE cache_key = $1', [cacheKey]);
}

export async function clearThumbnailCacheSqlite(): Promise<void> {
  const db = await getDatabase();
  await db.execute('DELETE FROM thumbnail_cache');
}

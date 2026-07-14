import type { ThumbnailCacheEntry } from '@/types/asteria';
import {
  getMigrationRecord,
  saveMigrationRecord,
  setJsonRecord,
} from '../persistenceService';
import { thumbnailRepository } from './thumbnailRepository';

const MIGRATION_ID = 'web-storage-to-native-sqlite-v2';
const LEGACY_DB_NAME = 'asteria_local_workspace';
const LEGACY_DB_VERSION = 2;

function unwrapLegacyValue(value: unknown): unknown {
  if (
    value &&
    typeof value === 'object' &&
    'version' in value &&
    'updatedAt' in value &&
    'data' in value
  ) {
    return (value as { data: unknown }).data;
  }
  return value;
}

async function importLegacyLocalStorage(): Promise<number> {
  let importedCount = 0;
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) continue;
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    try {
      const value = unwrapLegacyValue(JSON.parse(raw));
      if (key.startsWith('asteria_variants_')) {
        await setJsonRecord('asset_variants', key.slice('asteria_variants_'.length), value);
      } else if (key === 'asteria_preferences') {
        await setJsonRecord('settings', 'preferences', value);
      } else if (key === 'asteria_saved_views') {
        await setJsonRecord('workspace', 'saved_views', value);
      } else if ([
        'asteria_material_metadata_v1',
        'asteria_dismissed_materials_v1',
        'asteria_organization_metadata_v1',
        'asteria_person_clusters_v1',
        'asteria_event_clusters_v1',
        'asteria_place_tags_v1',
        'asteria_dismissed_organization_suggestions_v1',
      ].includes(key)) {
        await setJsonRecord('asset_metadata', key, value);
      } else if (key !== 'asteria_folder_sources_v2') {
        await setJsonRecord('settings', key, value);
      }
      importedCount += 1;
    } catch (error) {
      console.warn(`[Migration] Skipped invalid localStorage record ${key}:`, error);
    }
  }
  return importedCount;
}

async function openLegacyIndexedDb(): Promise<IDBDatabase | null> {
  if (!window.indexedDB) return null;
  return new Promise((resolve) => {
    const request = window.indexedDB.open(LEGACY_DB_NAME, LEGACY_DB_VERSION);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
    request.onsuccess = () => resolve(request.result);
  });
}

async function importLegacyThumbnails(): Promise<number> {
  const db = await openLegacyIndexedDb();
  if (!db || !db.objectStoreNames.contains('thumbnailCache')) return 0;
  const entries = await new Promise<ThumbnailCacheEntry[]>((resolve) => {
    const tx = db.transaction('thumbnailCache', 'readonly');
    const request = tx.objectStore('thumbnailCache').getAll();
    request.onerror = () => resolve([]);
    request.onsuccess = () => resolve(request.result as ThumbnailCacheEntry[]);
    tx.oncomplete = () => {
      db.close();
    };
  });
  let importedCount = 0;
  for (const entry of entries) {
    try {
      await thumbnailRepository.save(entry);
      importedCount += 1;
    } catch (error) {
      console.warn(`[Migration] Skipped invalid thumbnail ${entry.cacheKey}:`, error);
    }
  }
  return importedCount;
}

export async function runLegacyStorageMigration(): Promise<void> {
  const existing = await getMigrationRecord(MIGRATION_ID);
  if (existing?.state === 'completed') return;

  const startedAt = existing?.startedAt ?? new Date().toISOString();
  await saveMigrationRecord({
    migrationId: MIGRATION_ID,
    state: 'running',
    startedAt,
    importedCount: 0,
  });

  try {
    const localStorageCount = await importLegacyLocalStorage();
    const thumbnailCount = await importLegacyThumbnails();
    await saveMigrationRecord({
      migrationId: MIGRATION_ID,
      state: 'completed',
      startedAt,
      completedAt: new Date().toISOString(),
      importedCount: localStorageCount + thumbnailCount,
    });
  } catch (error) {
    await saveMigrationRecord({
      migrationId: MIGRATION_ID,
      state: 'failed',
      startedAt,
      completedAt: new Date().toISOString(),
      importedCount: 0,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

import type { ThumbnailCacheEntry } from '@/types/asteria';
import {
  clearThumbnailCacheSqlite,
  deleteThumbnailFromSqlite,
  getThumbnailFromSqlite,
  saveThumbnailToSqlite,
} from '../persistenceService';

export const thumbnailRepository = {
  get: (cacheKey: string): Promise<ThumbnailCacheEntry | null> => getThumbnailFromSqlite(cacheKey),
  save: (entry: ThumbnailCacheEntry): Promise<void> => saveThumbnailToSqlite(entry),
  delete: (cacheKey: string): Promise<void> => deleteThumbnailFromSqlite(cacheKey),
  clear: (): Promise<void> => clearThumbnailCacheSqlite(),
};

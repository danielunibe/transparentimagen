import type { FolderSource, SavedView } from '@/types/asteria';
import { deleteJsonRecord, getDatabase, getJsonRecord, setJsonRecord } from '../persistenceService';

const WORKSPACE_NAMESPACE = 'workspace';

export const workspaceRepository = {
  async getSavedViews(): Promise<SavedView[]> {
    return (await getJsonRecord<SavedView[]>(WORKSPACE_NAMESPACE, 'saved_views')) ?? [];
  },
  async saveSavedViews(views: SavedView[]): Promise<void> {
    await setJsonRecord(WORKSPACE_NAMESPACE, 'saved_views', views);
  },
  async getFolderSources(): Promise<FolderSource[]> {
    const db = await getDatabase();
    const rows = await db.select<Array<{ metadata_json: string }>>(
      'SELECT metadata_json FROM folder_sources ORDER BY updated_at DESC',
    );
    return rows.map((row) => JSON.parse(row.metadata_json) as FolderSource);
  },
  async saveFolderSource(source: FolderSource): Promise<void> {
    if (!source.nativePath) throw new Error('A native folder path is required.');
    const db = await getDatabase();
    await db.execute(
      `INSERT INTO folder_sources (id, name, native_path, metadata_json, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         native_path = excluded.native_path,
         metadata_json = excluded.metadata_json,
         updated_at = excluded.updated_at`,
      [source.id, source.name, source.nativePath, JSON.stringify(source), new Date().toISOString()],
    );
  },
  async removeFolderSource(sourceId: string): Promise<void> {
    const db = await getDatabase();
    await db.execute('DELETE FROM folder_sources WHERE id = $1', [sourceId]);
    await deleteJsonRecord(WORKSPACE_NAMESPACE, `folder:${sourceId}`);
  },
};

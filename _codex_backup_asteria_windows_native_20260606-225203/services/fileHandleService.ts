import { idbGet, idbSet, idbDelete } from './indexedDbService';
import { isSqlitePersistenceAvailable, setJsonRecord, deleteJsonRecord } from './persistenceService';

export function canPersistDirectoryHandles(): boolean {
  if (typeof window === 'undefined') return false;
  return 'showDirectoryPicker' in window && 'indexedDB' in window;
}

export async function saveDirectoryHandle(sourceId: string, handle: FileSystemDirectoryHandle): Promise<boolean> {
  if (!canPersistDirectoryHandles()) return false;
  try {
    if (isSqlitePersistenceAvailable()) {
      await setJsonRecord('folderSources', sourceId, JSON.stringify({
        sourceId,
        name: handle.name,
        persistedAt: new Date().toISOString(),
        handlePersisted: false
      }));
    }
    await idbSet('folderHandles', sourceId, handle);
    return true;
  } catch (error) {
    console.warn(`[FileHandleService] Failed to save handle for ${sourceId}:`, error);
    return false;
  }
}

export async function loadDirectoryHandle(sourceId: string): Promise<FileSystemDirectoryHandle | null> {
  if (!canPersistDirectoryHandles()) return null;
  try {
    const handle = await idbGet<FileSystemDirectoryHandle>('folderHandles', sourceId);
    return handle;
  } catch (error) {
    console.warn(`[FileHandleService] Failed to load handle for ${sourceId}:`, error);
    return null;
  }
}

export async function removeDirectoryHandle(sourceId: string): Promise<void> {
  try {
    if (isSqlitePersistenceAvailable()) {
      await deleteJsonRecord('folderSources', sourceId);
    }
    await idbDelete('folderHandles', sourceId);
  } catch (error) {
    console.warn(`[FileHandleService] Failed to remove handle for ${sourceId}:`, error);
  }
}

export async function verifyDirectoryPermission(handle: FileSystemDirectoryHandle, mode: 'read' | 'readwrite' = 'read'): Promise<boolean> {
  try {
    // queryPermission is often supported on handles if they exist
    if ((handle as any).queryPermission) {
      const status = await (handle as any).queryPermission({ mode });
      if (status === 'granted') {
        return true;
      }
    }
    return false; // Requires checking or requesting
  } catch (error) {
    console.warn('[FileHandleService] verify permission error', error);
    return false;
  }
}

export async function requestDirectoryPermission(handle: FileSystemDirectoryHandle, mode: 'read' | 'readwrite' = 'read'): Promise<boolean> {
  try {
    const isGranted = await verifyDirectoryPermission(handle, mode);
    if (isGranted) return true;
    
    if ((handle as any).requestPermission) {
      const status = await (handle as any).requestPermission({ mode });
      return status === 'granted';
    }
    return false;
  } catch (error) {
    console.warn('[FileHandleService] request permission error', error);
    return false;
  }
}

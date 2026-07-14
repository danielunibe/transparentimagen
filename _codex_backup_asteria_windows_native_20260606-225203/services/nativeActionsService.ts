import { GalleryItem } from '@/types/asteria';
import { getRuntimeCapabilities, getRuntimeKind, hasTauri } from './runtimeService';
import { showItemInFolder as tauriShowItemInFolder, openPath as tauriOpenPath } from './tauriBridge';

export interface NativeActionResult {
  ok: boolean;
  status: 'success' | 'unsupported' | 'error';
  message: string;
}

export async function locateAsset(asset: GalleryItem | null): Promise<NativeActionResult> {
  if (!asset) {
    return { ok: false, status: 'error', message: 'No asset provided.' };
  }

  const capabilities = getRuntimeCapabilities();

  if (!capabilities.canLocateFile) {
    return { 
      ok: false, 
      status: 'unsupported', 
      message: 'Locate is available in desktop mode.' 
    };
  }

  try {
    if (hasTauri() && asset.nativePath) {
        await tauriShowItemInFolder(asset.nativePath);
        return { ok: true, status: 'success', message: 'Opened in file browser.' };
    }

    if (window.asteriaNative?.file?.showItemInFolder && asset.nativePath) {
      await window.asteriaNative.file.showItemInFolder(asset.nativePath);
      return { ok: true, status: 'success', message: 'Opened in file browser.' };
    }
    
    if (window.electronAPI?.showItemInFolder && asset.nativePath) {
      await window.electronAPI.showItemInFolder(asset.nativePath);
      return { ok: true, status: 'success', message: 'Opened in file browser.' };
    }

    return { 
      ok: false, 
      status: 'unsupported', 
      message: 'Native bridge logic for locate not fully implemented yet.' 
    };
  } catch (error: any) {
    console.error('[Native Bridge] locateAsset failed:', error);
    return { ok: false, status: 'error', message: error.message || 'Failed to locate asset.' };
  }
}

export async function showItemInFolder(path: string): Promise<NativeActionResult> {
  const capabilities = getRuntimeCapabilities();

  if (!capabilities.canLocateFile) {
    return { ok: false, status: 'unsupported', message: 'Desktop mode required.' };
  }

  try {
    if (hasTauri()) {
        await tauriShowItemInFolder(path);
        return { ok: true, status: 'success', message: 'Target located.' };
    }

    if (window.asteriaNative?.file?.showItemInFolder) {
      await window.asteriaNative.file.showItemInFolder(path);
      return { ok: true, status: 'success', message: 'Target located.' };
    }

    if (window.electronAPI?.showItemInFolder) {
      await window.electronAPI.showItemInFolder(path);
      return { ok: true, status: 'success', message: 'Target located.' };
    }
    
    return { ok: false, status: 'unsupported', message: 'Bridge unsupported.' };
  } catch (e: any) {
    return { ok: false, status: 'error', message: e.message };
  }
}

export async function saveFileNatively(params: any): Promise<NativeActionResult> {
  const capabilities = getRuntimeCapabilities();

  if (!capabilities.canSaveFileNatively) {
    return { ok: false, status: 'unsupported', message: 'Native save is unavailable.' };
  }

  try {
    if (hasTauri()) {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const { writeFile } = await import('@tauri-apps/plugin-fs');
        const defaultPath = params.filename;
        const filePath = await save({ defaultPath });
        
        if (filePath) {
            const buffer = await params.blob.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            await writeFile(filePath, bytes);
            return { ok: true, status: 'success', message: 'Saved successfully via Tauri.' };
        } else {
            return { ok: false, status: 'error', message: 'Save cancelled.' };
        }
    }

    if (window.asteriaNative?.file?.saveFile) {
      const res = await window.asteriaNative.file.saveFile({
        filename: params.filename,
        mimeType: params.mimeType || 'application/octet-stream',
        data: params.blob
      });
      if (res.ok) {
        return { ok: true, status: 'success', message: res.message || 'Saved successfully.' };
      } else {
         return { ok: false, status: 'error', message: res.message || 'Save failed.' };
      }
    }
  } catch (e: any) {
    return { ok: false, status: 'error', message: e.message };
  }

  return { ok: false, status: 'unsupported', message: 'Native save not fully implemented natively yet.' };
}

export async function openDirectory(pathOrSource?: string): Promise<NativeActionResult> {
  const capabilities = getRuntimeCapabilities();
  
  if (!capabilities.canPickDirectory) {
    return { ok: false, status: 'unsupported', message: 'Directory picking is unavailable.' };
  }

  try {
    if (hasTauri()) {
        const { selectDirectory } = await import('./tauriBridge');
        const selected = await selectDirectory();
        if (selected) {
            return { ok: true, status: 'success', message: 'Directory opened: ' + selected, data: selected } as any;
        } else {
            return { ok: false, status: 'error', message: 'Directory selection cancelled.' };
        }
    }

    if (window.asteriaNative?.file?.openDirectory) {
       await window.asteriaNative.file.openDirectory(pathOrSource);
       return { ok: true, status: 'success', message: 'Directory opened.' };
    }
  } catch (e: any) {
    return { ok: false, status: 'error', message: e.message };
  }

  return { ok: false, status: 'unsupported', message: 'Directory picking not fully implemented natively yet.' };
}

export async function selectExportDirectory(): Promise<string | null> {
    if (hasTauri()) {
        const { selectDirectory } = await import('./tauriBridge');
        return await selectDirectory({ title: "Select Export Directory" });
    }
    return null;
}

export async function writeNativeFile(path: string, content: Blob | Uint8Array | string): Promise<boolean> {
    if (hasTauri()) {
        const { writeBinaryFile, writeTextFile } = await import('./tauriBridge');
        try {
            if (typeof content === 'string') {
                await writeTextFile(path, content);
            } else if (content instanceof Blob) {
                const buffer = await content.arrayBuffer();
                await writeBinaryFile(path, new Uint8Array(buffer));
            } else {
                await writeBinaryFile(path, content);
            }
            return true;
        } catch (e) {
            console.error(`[Native] Failed to write file ${path}:`, e);
            return false;
        }
    }
    return false;
}

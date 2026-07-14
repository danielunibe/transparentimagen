import { ThumbnailCacheEntry, ThumbnailGenerationOptions, GalleryImageItem } from '@/types/asteria';
import { idbGet, idbSet, idbDelete, openAsteriaDb } from '@/services/indexedDbService';

const STORE_NAME = 'thumbnailCache';

export function getDefaultThumbnailOptions(): ThumbnailGenerationOptions {
    return {
        maxWidth: 360,
        maxHeight: 360,
        quality: 0.72,
        mimeType: 'image/jpeg'
    };
}

export function createThumbnailCacheKey(item: GalleryImageItem): string {
    const size = item.file?.size || item.size || '0';
    const modified = item.lastModified || 0;
    
    if (!size && !modified) {
        return `${item.id}_${item.name}`;
    }
    
    return `${item.id}_${size}_${modified}`;
}

export async function getThumbnail(assetId: string, cacheKey: string): Promise<ThumbnailCacheEntry | null> {
    const entry = await idbGet<ThumbnailCacheEntry>(STORE_NAME, cacheKey);
    if (entry && entry.blob) {
        return entry;
    }
    return null;
}

export async function saveThumbnail(entry: ThumbnailCacheEntry): Promise<void> {
    await idbSet(STORE_NAME, entry.cacheKey, entry);
}

export async function deleteThumbnail(cacheKey: string): Promise<void> {
    await idbDelete(STORE_NAME, cacheKey);
}

export async function clearThumbnailCache(): Promise<void> {
    try {
        const db = await openAsteriaDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.warn('Failed to clear thumbnail cache', e);
    }
}

export async function createThumbnailFromUrl(
    imageUrl: string, 
    assetId: string, 
    cacheKey: string,
    options: ThumbnailGenerationOptions = getDefaultThumbnailOptions()
): Promise<ThumbnailCacheEntry> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const { maxWidth, maxHeight } = options;
            let targetWidth = img.width;
            let targetHeight = img.height;

            if (targetWidth > maxWidth || targetHeight > maxHeight) {
                const ratio = Math.min(maxWidth / targetWidth, maxHeight / targetHeight);
                targetWidth = Math.round(targetWidth * ratio);
                targetHeight = Math.round(targetHeight * ratio);
            }

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
                return reject(new Error('Failed to get 2d context for thumbnail'));
            }

            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            canvas.toBlob((blob) => {
                if (!blob) {
                    return reject(new Error('Failed to create thumbnail blob'));
                }
                
                resolve({
                    id: crypto.randomUUID(),
                    assetId,
                    cacheKey,
                    width: targetWidth,
                    height: targetHeight,
                    mimeType: options.mimeType,
                    size: blob.size,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    blob
                });
            }, options.mimeType, options.quality);
        };
        img.onerror = () => reject(new Error('Failed to load image for thumbnail generation'));
        img.src = imageUrl;
    });
}

export async function createThumbnailFromFile(
    file: File,
    assetId: string,
    cacheKey: string,
    options?: ThumbnailGenerationOptions
): Promise<ThumbnailCacheEntry> {
    const url = URL.createObjectURL(file);
    try {
        return await createThumbnailFromUrl(url, assetId, cacheKey, options);
    } finally {
        URL.revokeObjectURL(url);
    }
}

export function getThumbnailObjectUrl(entry: ThumbnailCacheEntry): string | null {
    if (!entry.blob) return null;
    return URL.createObjectURL(entry.blob);
}

export function revokeThumbnailObjectUrl(url: string | null): void {
    if (url) {
        URL.revokeObjectURL(url);
    }
}

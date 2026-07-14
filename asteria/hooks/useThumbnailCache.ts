import { useState, useCallback, useEffect, useRef } from 'react';
import { GalleryItem, GalleryImageItem, ThumbnailCacheEntry } from '@/types/asteria';
import { 
    createThumbnailCacheKey, 
    getThumbnail, 
    createThumbnailFromUrl, 
    createThumbnailFromFile,
    saveThumbnail,
    getThumbnailObjectUrl,
    revokeThumbnailObjectUrl,
    clearThumbnailCache as clearCacheService
} from '@/services/thumbnailService';
import { revokeAllTrackedObjectUrls } from '@/services/objectUrlRegistry';
import { getThumbnailConcurrencyLimit } from '@/services/performanceService';

export function useThumbnailCache() {
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
    const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
    
    // Track active object URLs so we can revoke them on unmount
    const objectUrlsRef = useRef<Record<string, string>>({});
    const inFlightRef = useRef(0);

    // Cleanup object URLs on unmount
    useEffect(() => {
        return () => {
            revokeAllTrackedObjectUrls();
        };
    }, []);

    const getOrCreateThumbnail = useCallback(async (item: GalleryItem) => {
        if (item.kind !== 'image') return;
        const imgItem = item as GalleryImageItem;
        const limit = getThumbnailConcurrencyLimit(Object.keys(thumbnails).length + loadingIds.size + failedIds.size);
        
        const cacheKey = createThumbnailCacheKey(imgItem);
        
        // Already loaded or loading/failed in this session
        if (thumbnails[imgItem.id] || loadingIds.has(imgItem.id) || failedIds.has(imgItem.id)) {
            return;
        }

        while (inFlightRef.current >= limit) {
            await new Promise(resolve => setTimeout(resolve, 16));
        }

        setLoadingIds(prev => {
            const next = new Set(prev);
            next.add(imgItem.id);
            return next;
        });
        inFlightRef.current += 1;

        try {
            let entry = await getThumbnail(imgItem.id, cacheKey);
            
            if (!entry) {
                if (imgItem.file) {
                    entry = await createThumbnailFromFile(imgItem.file, imgItem.id, cacheKey);
                } else if (imgItem.objectUrl) {
                    entry = await createThumbnailFromUrl(imgItem.objectUrl, imgItem.id, cacheKey);
                }
                
                if (entry) {
                    await saveThumbnail(entry);
                }
            }

            if (entry && entry.blob) {
                const url = getThumbnailObjectUrl(entry);
                if (url) {
                    const previous = objectUrlsRef.current[imgItem.id];
                    if (previous && previous !== url) {
                        revokeThumbnailObjectUrl(previous);
                    }
                    objectUrlsRef.current[imgItem.id] = url;
                    setThumbnails(prev => ({ ...prev, [imgItem.id]: url }));
                }
            } else {
                setFailedIds(prev => {
                    const next = new Set(prev);
                    next.add(imgItem.id);
                    return next;
                });
            }
        } catch (e) {
            console.warn('Failed to load/create thumbnail for', imgItem.name, e);
            setFailedIds(prev => {
                const next = new Set(prev);
                next.add(imgItem.id);
                return next;
            });
        } finally {
            inFlightRef.current = Math.max(0, inFlightRef.current - 1);
            setLoadingIds(prev => {
                const next = new Set(prev);
                next.delete(imgItem.id);
                return next;
            });
        }
    }, [thumbnails, loadingIds, failedIds]);

    const clearCache = useCallback(async () => {
        await clearCacheService();
        revokeAllTrackedObjectUrls();
        objectUrlsRef.current = {};
        setThumbnails({});
        setLoadingIds(new Set());
        setFailedIds(new Set());
    }, []);

    return {
        thumbnailsByAssetId: thumbnails,
        loadingThumbnailIds: loadingIds,
        failedThumbnailIds: failedIds,
        getOrCreateThumbnail,
        clearCache
    };
}

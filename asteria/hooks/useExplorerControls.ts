import { useDeferredValue, useMemo } from 'react';
import { 
    GalleryItem, 
    AssetSortMode, 
    AssetFilterMode, 
    GalleryImageItem,
    GalleryVideoItem
} from '@/types/asteria';
import { filterItemsBySearch, SearchContext, parseSearchQuery } from '@/services/searchService';

export function useExplorerControls(
    rawItems: GalleryItem[], 
    searchQuery: string,
    sortMode: AssetSortMode,
    filterMode: AssetFilterMode,
    selectedIds: Set<string>,
    searchContext?: SearchContext
) {
    const deferredSearchQuery = useDeferredValue(searchQuery);
    const deferredFilterMode = useDeferredValue(filterMode);
    const deferredSortMode = useDeferredValue(sortMode);
    // Filter Items
    const filteredItems = useMemo(() => {
        let items = rawItems;

        // Apply Search
        if (deferredSearchQuery.trim()) {
            if (searchContext) {
                // Determine if it's a simple search or advanced
                const isAdvanced = parseSearchQuery(deferredSearchQuery).some(t => t.kind !== 'text');
                if (isAdvanced) {
                    items = filterItemsBySearch(items, deferredSearchQuery, searchContext);
                } else {
                    const query = deferredSearchQuery.toLowerCase();
                    items = items.filter(item => 
                        item.name.toLowerCase().includes(query)
                    );
                }
            } else {
                // Fallback to simple
                const query = deferredSearchQuery.toLowerCase();
                items = items.filter(item => 
                    item.name.toLowerCase().includes(query)
                );
            }
        }

        // Apply Mode Filter
        if (deferredFilterMode !== 'all') {
            if (deferredFilterMode === 'folders') {
                items = items.filter(item => item.kind === 'folder');
            } else if (deferredFilterMode === 'videos') {
                items = items.filter(item => item.kind === 'video');
            } else if (deferredFilterMode === 'images') {
                items = items.filter(item => item.kind === 'image');
            } else {
                // By extension
                items = items.filter(item => {
                    if (item.kind === 'folder') return false;
                    const media = item as GalleryImageItem | GalleryVideoItem;
                    const ext = media.metadata?.extension?.toLowerCase();
                    if (!ext) return false;
                    
                    if (deferredFilterMode === 'jpg' && (ext === 'jpg' || ext === 'jpeg')) return true;
                    if (deferredFilterMode === 'png' && ext === 'png') return true;
                    if (deferredFilterMode === 'svg' && ext === 'svg') return true;
                    if (deferredFilterMode === 'gif' && ext === 'gif') return true;
                    if (deferredFilterMode === 'bmp' && ext === 'bmp') return true;
                    if (deferredFilterMode === 'webp' && ext === 'webp') return true;
                    return false;
                });
            }
        }

        return items;
    }, [rawItems, deferredSearchQuery, deferredFilterMode, searchContext]);

    // Sort Items
    const sortedItems = useMemo(() => {
        const sorted = [...filteredItems];

        // Ensure folders are typically first unless sorting by type
        sorted.sort((a, b) => {
            if (deferredSortMode !== 'type') {
                if (a.kind === 'folder' && b.kind !== 'folder') return -1;
                if (a.kind !== 'folder' && b.kind === 'folder') return 1;
            }

            const nameA = a.name.toLowerCase();
            const nameB = b.name.toLowerCase();

            switch (deferredSortMode) {
                case 'name_asc':
                    return nameA.localeCompare(nameB);
                case 'name_desc':
                    return nameB.localeCompare(nameA);
                case 'date_desc': {
                    const dateA = a.kind === 'image' ? (a.lastModified || 0) : 0;
                    const dateB = b.kind === 'image' ? (b.lastModified || 0) : 0;
                    return dateB - dateA;
                }
                case 'date_asc': {
                    const dateA = a.kind === 'image' ? (a.lastModified || 0) : 0;
                    const dateB = b.kind === 'image' ? (b.lastModified || 0) : 0;
                    return dateA - dateB;
                }
                case 'size_desc': {
                    const sizeA = a.kind === 'image' && a.file ? a.file.size : 0;
                    const sizeB = b.kind === 'image' && b.file ? b.file.size : 0;
                    return sizeB - sizeA;
                }
                case 'size_asc': {
                    const sizeA = a.kind === 'image' && a.file ? a.file.size : 0;
                    const sizeB = b.kind === 'image' && b.file ? b.file.size : 0;
                    return sizeA - sizeB;
                }
                case 'type': {
                    const extA = a.kind === 'image' ? (a.metadata?.extension || '') : 'folder';
                    const extB = b.kind === 'image' ? (b.metadata?.extension || '') : 'folder';
                    const extCompare = extA.localeCompare(extB);
                    if (extCompare !== 0) return extCompare;
                    return nameA.localeCompare(nameB);
                }
                default:
                    return 0;
            }
        });

        return sorted;
    }, [filteredItems, deferredSortMode]);

    // Resolve full items
    const selectedItems = useMemo(() => {
        return rawItems.filter(item => selectedIds.has(item.id));
    }, [rawItems, selectedIds]);

    return {
        visibleItems: sortedItems,
        selectedItems
    };
}

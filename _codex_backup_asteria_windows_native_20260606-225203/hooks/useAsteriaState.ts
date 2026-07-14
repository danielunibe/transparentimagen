import { useState, useCallback, useEffect } from 'react';
import { AppView, EditorViewMode, ViewDensity, ActiveModeId, AssetSortMode, AssetFilterMode } from '@/types/asteria';
import { safeGetJson, safeSetJson } from '@/services/storageService';

const PREFS_KEY = 'asteria_preferences';

export function useAsteriaState() {
    const [viewMode, setViewMode] = useState<EditorViewMode>('split'); 
    const [hasImage, setHasImage] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeMode, setActiveMode] = useState<ActiveModeId | string>('enhance');
    
    const [currentView, setCurrentView] = useState<AppView>('library');

    const [viewDensity, setViewDensity] = useState<ViewDensity>(() => {
        const prefs = safeGetJson<{viewDensity?: ViewDensity}>(PREFS_KEY, {});
        return prefs.viewDensity || 'grid';
    });
    
    const [sortMode, setSortMode] = useState<AssetSortMode>(() => {
        const prefs = safeGetJson<{sortMode?: AssetSortMode}>(PREFS_KEY, {});
        return prefs.sortMode || 'name_asc';
    });
    
    const [filterMode, setFilterMode] = useState<AssetFilterMode>(() => {
        const prefs = safeGetJson<{filterMode?: AssetFilterMode}>(PREFS_KEY, {});
        return prefs.filterMode || 'all';
    });

    const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
    const [selectedItemUrl, setSelectedItemUrl] = useState<string | null>(null);

    useEffect(() => {
        const prefs = safeGetJson<{viewDensity?: ViewDensity, sortMode?: AssetSortMode, filterMode?: AssetFilterMode}>(PREFS_KEY, {});
        safeSetJson(PREFS_KEY, { ...prefs, viewDensity, sortMode, filterMode });
    }, [viewDensity, sortMode, filterMode]);

    const openEditor = () => setCurrentView('editor');
    const backToLibrary = () => setCurrentView('library');
    const selectItemId = (id: string, url?: string) => {
        setSelectedItemIds(id ? new Set([id]) : new Set());
        if (url !== undefined) {
             setSelectedItemUrl(url);
        }
    };
    
    const toggleSelection = (id: string) => {
        setSelectedItemIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const clearSelection = () => {
        setSelectedItemIds(new Set());
        setSelectedItemUrl(null);
    };

    const selectRange = (ids: string[]) => {
        setSelectedItemIds(new Set(ids));
    };

    const toggleHasImage = (val?: boolean) => setHasImage(val !== undefined ? val : !hasImage);
    
    const startProcessing = () => {
        setIsProcessing(true);
        setTimeout(() => setIsProcessing(false), 1200);
    };
    
    const stopProcessing = () => setIsProcessing(false);

    const cycleViewDensity = () => {
        setViewDensity(prev => {
            if (prev === 'grid') return 'large';
            if (prev === 'large') return 'compact';
            if (prev === 'compact') return 'list';
            return 'grid';
        });
    };

    return {
        viewMode,
        setViewMode,
        hasImage,
        setHasImage: toggleHasImage,
        isProcessing,
        activeMode,
        setActiveMode,
        currentView,
        setCurrentView,
        sortMode,
        setSortMode,
        filterMode,
        setFilterMode,
        selectedItemId: selectedItemIds.size > 0 ? Array.from(selectedItemIds)[0] : null,
        selectedItemIds,
        selectedItemUrl,
        selectItemId,
        viewDensity,
        setViewDensity,
        cycleViewDensity,
        openEditor,
        backToLibrary,
        toggleSelection,
        clearSelection,
        selectRange,
        startProcessing,
        stopProcessing
    };
}

import { useState, useCallback, useMemo } from 'react';
import { SmartCollection, SavedView, GalleryItem, AssetVariant, ExportJob, AiProcessingJob } from '@/types/asteria';
import { 
    getBuiltInSmartCollections, 
    loadSavedViews, 
    saveSavedViews, 
    createSavedViewFromCurrentState, 
    deleteSavedView as deleteSavedViewService,
    filterItemsByCollection
} from '@/services/smartCollectionService';
import { loadAllStoredVariants } from '@/services/variantService';

export function useSmartCollections(
    items: GalleryItem[],
    activeSessionVariants: AssetVariant[],
    exportJobs: ExportJob[],
    aiJobs: AiProcessingJob[]
) {
    const [savedViews, setSavedViews] = useState<SavedView[]>(() => loadSavedViews());
    const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);

    const builtInCollections = useMemo(() => getBuiltInSmartCollections(), []);

    const activeCollection = useMemo(() => {
        if (!activeCollectionId) return null;
        const builtIn = builtInCollections.find(c => c.id === activeCollectionId);
        if (builtIn) return builtIn;
        const savedView = savedViews.find(v => v.id === activeCollectionId);
        if (savedView) {
            return {
                id: savedView.id,
                kind: 'custom',
                label: savedView.label,
                builtIn: false,
                criteria: savedView.criteria
            } as SmartCollection;
        }
        return null;
    }, [activeCollectionId, builtInCollections, savedViews]);

    const context = useMemo(() => {
        const storedVariants = loadAllStoredVariants();
        // Merge stored variants with active session variants
        // Active session variants take priority for the same variant ID
        const allVariantsMap = new Map<string, AssetVariant>();
        
        storedVariants.forEach(v => allVariantsMap.set(v.id, v));
        activeSessionVariants.forEach(v => allVariantsMap.set(v.id, v));

        const allVariants = Array.from(allVariantsMap.values());

        const variantsByAsset: Record<string, AssetVariant[]> = {};
        allVariants.forEach(v => {
            if (!variantsByAsset[v.assetId]) variantsByAsset[v.assetId] = [];
            variantsByAsset[v.assetId].push(v);
        });

        const activeJobsByAsset: Record<string, AiProcessingJob[]> = {};
        aiJobs.forEach(j => {
            if (!activeJobsByAsset[j.assetId]) activeJobsByAsset[j.assetId] = [];
            activeJobsByAsset[j.assetId].push(j);
        });

        const exportJobsByAsset: Record<string, ExportJob[]> = {};
        exportJobs.forEach(j => {
            if (!exportJobsByAsset[j.assetId]) exportJobsByAsset[j.assetId] = [];
            exportJobsByAsset[j.assetId].push(j);
        });

        return { variantsByAsset, activeJobsByAsset, exportJobsByAsset };
    }, [activeSessionVariants, aiJobs, exportJobs]);

    const filteredItems = useMemo(() => {
        if (!activeCollection) return undefined;
        return filterItemsByCollection(items, context, activeCollection);
    }, [items, activeCollection, context]);

    const saveCurrentView = useCallback((label: string, criteria: SmartCollection['criteria']) => {
        const newView = createSavedViewFromCurrentState(label, criteria);
        const newSavedViews = [...savedViews, newView];
        setSavedViews(newSavedViews);
        saveSavedViews(newSavedViews);
    }, [savedViews]);

    const deleteSavedView = useCallback((id: string) => {
        deleteSavedViewService(id);
        setSavedViews(loadSavedViews());
        if (activeCollectionId === id) {
            setActiveCollectionId(null);
        }
    }, [activeCollectionId]);

    const clearActiveCollection = useCallback(() => {
        setActiveCollectionId(null);
    }, []);

    return {
        builtInCollections,
        savedViews,
        activeCollectionId,
        activeCollection,
        setActiveCollection: setActiveCollectionId,
        clearActiveCollection,
        saveCurrentView,
        deleteSavedView,
        filteredItems,
        context
    };
}

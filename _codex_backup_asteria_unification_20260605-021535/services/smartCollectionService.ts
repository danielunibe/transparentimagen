import { SmartCollection, SavedView, GalleryItem, AssetVariant, ExportJob, AiProcessingJob } from '@/types/asteria';
import { safeSetJson, safeGetJson } from './storageService';
import { builtInCollections } from '@/data/smartCollections';

const SAVED_VIEWS_KEY = 'asteria_saved_views';

export interface SmartCollectionContext {
    variantsByAsset: Record<string, AssetVariant[]>;
    activeJobsByAsset: Record<string, AiProcessingJob[]>;
    exportJobsByAsset: Record<string, ExportJob[]>;
}

export function getBuiltInSmartCollections(): SmartCollection[] {
    return builtInCollections;
}

export function evaluateSmartCollection(item: GalleryItem, context: SmartCollectionContext, collection: SmartCollection): boolean {
    const { criteria } = collection;
    
    if (criteria.filterMode) {
        if (criteria.filterMode === 'images' && item.kind !== 'image') return false;
        if (criteria.filterMode === 'folders' && item.kind !== 'folder') return false;
    }

    if (criteria.searchQuery) {
        if (!item.name.toLowerCase().includes(criteria.searchQuery.toLowerCase())) return false;
    }

    const itemVariants = context.variantsByAsset[item.id] || [];
    const itemExports = context.exportJobsByAsset[item.id] || [];
    const itemAiJobs = context.activeJobsByAsset[item.id] || [];

    if (criteria.hasVariants && itemVariants.length === 0) return false;
    if (criteria.hasAiJobs) {
        const hasAiVariant = itemVariants.some(v => ['enhanced', 'cutout', 'portrait', 'ue5', 'ai_preview'].includes(v.kind));
        if (itemAiJobs.length === 0 && !hasAiVariant) return false;
    }
    if (criteria.hasExports) {
        const completedExports = itemExports.filter(j => j.status === 'completed');
        if (completedExports.length === 0) return false;
    }
    if (criteria.hasAdjustments) {
        if (!itemVariants.some(v => v.kind === 'adjustment')) return false;
    }
    if (criteria.hasCutout) {
        if (!itemVariants.some(v => v.kind === 'cutout')) return false;
    }
    if (criteria.hasMetadataOnlyVariants) {
        if (!itemVariants.some(v => v.metadataOnly)) return false;
    }
    if (criteria.hasSessionOutputs) {
        if (!itemVariants.some(v => v.sessionOnly && !!v.objectUrl)) return false;
    }

    // specific 'recently_edited' checks
    if (collection.kind === 'recently_edited') {
        const hasActionableVariant = itemVariants.some(v => ['adjustment', 'enhanced', 'portrait', 'ue5', 'ai_preview'].includes(v.kind));
        if (!hasActionableVariant) return false;
    }

    return true;
}

export function filterItemsByCollection(items: GalleryItem[], context: SmartCollectionContext, collection: SmartCollection): GalleryItem[] {
    return items.filter(item => evaluateSmartCollection(item, context, collection));
}

export function loadSavedViews(): SavedView[] {
    return safeGetJson<SavedView[]>(SAVED_VIEWS_KEY, []);
}

export function saveSavedViews(views: SavedView[]): void {
    safeSetJson(SAVED_VIEWS_KEY, views);
}

export function createSavedViewFromCurrentState(label: string, criteria: SmartCollection['criteria']): SavedView {
    return {
        id: `view_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        label,
        createdAt: new Date().toISOString(),
        criteria
    };
}

export function deleteSavedView(id: string): void {
    const views = loadSavedViews();
    saveSavedViews(views.filter(v => v.id !== id));
}

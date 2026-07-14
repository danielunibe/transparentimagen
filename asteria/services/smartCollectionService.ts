import { SmartCollection, SavedView, GalleryItem, AssetVariant, ExportJob, AiProcessingJob } from '@/types/asteria';
import { workspaceRepository } from './repositories/workspaceRepository';
import { builtInCollections } from '@/data/smartCollections';
import { buildOrganizationMetadata } from './mediaOrganizationService';
import { assetMatchesSearch, buildAssetSearchMetadata } from './searchService';

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
        if (criteria.filterMode === 'videos' && item.kind !== 'video') return false;
        if (criteria.filterMode === 'folders' && item.kind !== 'folder') return false;
    }

    if (criteria.mediaKind) {
        if (criteria.mediaKind === 'image' && item.kind !== 'image') return false;
        if (criteria.mediaKind === 'video' && item.kind !== 'video') return false;
        if (criteria.mediaKind === 'folder' && item.kind !== 'folder') return false;
    }

    if (criteria.searchQuery) {
        if (criteria.searchQuery.includes(':')) {
            const meta = buildAssetSearchMetadata(item, context);
            if (!assetMatchesSearch(meta, [{ raw: criteria.searchQuery, kind: 'status', key: criteria.searchQuery.split(':')[0], value: criteria.searchQuery.split(':').slice(1).join(':') }])) return false;
        } else if (!item.name.toLowerCase().includes(criteria.searchQuery.toLowerCase())) return false;
    }

    const itemVariants = context.variantsByAsset[item.id] || [];
    const itemExports = context.exportJobsByAsset[item.id] || [];
    const itemAiJobs = context.activeJobsByAsset[item.id] || [];
    const organization = item.kind !== 'folder' ? buildOrganizationMetadata(item) : undefined;
    const sizeBytes = item.kind !== 'folder' && item.file ? item.file.size : 0;
    const smartFolder = item.kind === 'folder' ? item.smartFolder : item.metadata?.smartFolder;
    const material = item.kind === 'folder' ? item.material : (item.kind === 'image' ? item.metadata?.material : undefined);

    if (criteria.hasVariants && itemVariants.length === 0) return false;
    if (criteria.hasAiJobs) {
        const hasAiVariant = itemVariants.some(v => ['enhanced', 'cutout', 'upscaled', 'portrait', 'ue5', 'ai_preview'].includes(v.kind));
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
    if (criteria.hasUpscaled) {
        if (!itemVariants.some(v => v.kind === 'upscaled')) return false;
    }
    if (criteria.hasMetadataOnlyVariants) {
        if (!itemVariants.some(v => v.metadataOnly)) return false;
    }
    if (criteria.hasSessionOutputs) {
        if (!itemVariants.some(v => v.sessionOnly && !!v.objectUrl)) return false;
    }
    if (criteria.isScreenshot && !organization?.isScreenshot) return false;
    if (criteria.isUnorganized) {
        const isUnorganized = !organization?.people?.length && !organization?.places?.length && !organization?.eventIds?.length;
        if (!isUnorganized) return false;
    }
    if (criteria.hasMissingMetadata) {
        if (item.kind === 'folder') return false;
        if (organization?.dateTaken && organization?.cameraModel) return false;
    }
    if (criteria.isLargeFile && sizeBytes < 10 * 1024 * 1024) return false;
    if (criteria.isDuplicateCandidate && !organization?.isDuplicateCandidate) return false;
    if (criteria.year) {
        const year = organization?.dateTaken ? new Date(organization.dateTaken).getFullYear().toString() : undefined;
        if (year !== criteria.year) return false;
    }
    if (criteria.isSmartFolder && !smartFolder) return false;
    if (criteria.smartFolderKind && smartFolder?.kind !== criteria.smartFolderKind) return false;
    if (criteria.smartFolderStatus && smartFolder?.status !== criteria.smartFolderStatus) return false;
    if (criteria.isMaterialFolder && !material) return false;
    if (criteria.materialStatus && material?.status !== criteria.materialStatus) return false;
    if (criteria.pbrMapType) {
        const hasMap = item.kind === 'image'
            ? item.pbrMapType === criteria.pbrMapType
            : material?.maps.some(map => map.mapType === criteria.pbrMapType);
        if (!hasMap) return false;
    }
    if (criteria.missingMapType && !material?.missingMaps.includes(criteria.missingMapType as any)) return false;
    if (criteria.isFavoriteMaterial && !material?.isFavorite) return false;
    if (criteria.materialCategory && material?.category?.toLowerCase() !== criteria.materialCategory.toLowerCase()) return false;
    if (criteria.materialReady && ((material?.completenessScore || 0) < 90 || material?.needsReview)) return false;
    if (criteria.materialNeedsReview && !material?.needsReview) return false;
    if (criteria.hasMaterialWarnings && !material?.hasWarnings) return false;
    if (criteria.hasMaterialErrors && !material?.hasErrors) return false;
    if (criteria.readyTarget) {
        if (material?.targetEngine !== criteria.readyTarget || (material?.completenessScore || 0) < 90 || material?.needsReview) return false;
    }
    if (criteria.hasResolutionMismatch && !material?.diagnostics?.resolution.hasResolutionMismatch) return false;
    if (criteria.minCompletenessScore && (material?.completenessScore || 0) < criteria.minCompletenessScore) return false;

    // specific 'recently_edited' checks
    if (collection.kind === 'recently_edited') {
        const hasActionableVariant = itemVariants.some(v => ['adjustment', 'enhanced', 'upscaled', 'portrait', 'ue5', 'ai_preview'].includes(v.kind));
        if (!hasActionableVariant) return false;
    }

    return true;
}

export function filterItemsByCollection(items: GalleryItem[], context: SmartCollectionContext, collection: SmartCollection): GalleryItem[] {
    return items.filter(item => evaluateSmartCollection(item, context, collection));
}

export async function loadSavedViews(): Promise<SavedView[]> {
    void SAVED_VIEWS_KEY;
    return workspaceRepository.getSavedViews();
}

export async function saveSavedViews(views: SavedView[]): Promise<void> {
    await workspaceRepository.saveSavedViews(views);
}

export function createSavedViewFromCurrentState(label: string, criteria: SmartCollection['criteria']): SavedView {
    return {
        id: `view_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        label,
        createdAt: new Date().toISOString(),
        criteria
    };
}

export async function deleteSavedView(id: string): Promise<SavedView[]> {
    const views = await loadSavedViews();
    const next = views.filter(v => v.id !== id);
    await saveSavedViews(next);
    return next;
}

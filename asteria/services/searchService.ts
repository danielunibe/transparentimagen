import { ParsedSearchToken, AssetSearchMetadata, GalleryItem, AssetVariant, ExportJob, AiProcessingJob } from '@/types/asteria';
import { getCanonicalSearchHints, parseCanonicalSearchQuery } from './criteriaService';
import { normalizeSearchValue } from '@/data/canonicalCriteria';

export interface SearchContext {
    variantsByAsset: Record<string, AssetVariant[]>;
    activeJobsByAsset: Record<string, AiProcessingJob[]>;
    exportJobsByAsset: Record<string, ExportJob[]>;
}

export function buildAssetSearchMetadata(item: GalleryItem, context: SearchContext): AssetSearchMetadata {
    const isImage = item.kind === 'image';
    const metadata = isImage ? (item as any).metadata : undefined;
    const variants = context.variantsByAsset[item.id] || [];
    const aiJobs = context.activeJobsByAsset[item.id] || [];
    const exports = context.exportJobsByAsset[item.id] || [];

    const variantKinds = Array.from(new Set(variants.map(v => v.kind)));
    const presetLabels = variants.map(v => v.presetLabel).filter(Boolean) as string[];
    const upscaleScales = Array.from(new Set(variants.map(v => v.upscaleScale).filter(Boolean))) as number[];
    const upscaleEngines = Array.from(new Set(variants.flatMap(v => [v.actualEngine, v.upscaleEngine]).filter(Boolean))) as string[];
    const upscaleQualityPresets = Array.from(new Set(variants.map(v => v.upscaleQualityPreset).filter(Boolean))) as string[];
    const upscaleTileSizes = Array.from(new Set(variants.map(v => v.tileSize).filter(Boolean))) as number[];
    const upscaleTilePads = Array.from(new Set(variants.map(v => v.tilePad).filter(Boolean))) as number[];
    const upscaleModelIds = Array.from(new Set(variants.map(v => v.modelId).filter(Boolean))) as string[];

    const organization = item.kind !== 'folder' ? item.metadata?.organization : undefined;
    const smartFolder = item.kind === 'folder' ? item.smartFolder : item.metadata?.smartFolder;
    const material = item.kind === 'folder' ? item.material : (item.kind === 'image' ? item.metadata?.material : undefined);
    const dateTaken = organization?.dateTaken;
    const date = dateTaken ? new Date(dateTaken) : (item.kind !== 'folder' && item.lastModified ? new Date(item.lastModified) : undefined);
    const year = date && !Number.isNaN(date.getTime()) ? String(date.getFullYear()) : undefined;
    const month = date && !Number.isNaN(date.getTime()) ? `${year}-${String(date.getMonth() + 1).padStart(2, '0')}` : undefined;

    return {
        assetId: item.id,
        name: item.name,
        mediaKind: item.kind === 'folder' ? 'folder' : item.kind,
        extension: metadata?.extension?.toLowerCase(),
        format: metadata?.extension?.toLowerCase() || (item.kind !== 'folder' ? item.type.split('/')[1]?.toLowerCase() : undefined),
        width: metadata?.width,
        height: metadata?.height,
        size: metadata?.size,
        modifiedAt: item.kind !== 'folder' ? item.lastModified : undefined,
        sourceName: (item as any).handle?.name, // Approximation
        hasVariants: variants.length > 0,
        hasAdjustments: variantKinds.includes('adjustment'),
        hasAiJobs: aiJobs.length > 0 || variantKinds.some(k => ['enhanced', 'cutout', 'upscaled', 'portrait', 'ue5', 'ai_preview'].includes(k)),
        hasExports: exports.some(e => e.status === 'completed'),
        hasMetadataOnlyVariants: variants.some(v => v.metadataOnly),
        hasSessionOutputs: variants.some(v => v.sessionOnly && !!v.objectUrl),
        hasUpscaled: variantKinds.includes('upscaled'),
        presetLabels,
        variantKinds,
        upscaleScales,
        upscaleEngines,
        upscaleQualityPresets,
        upscaleTileSizes,
        upscaleTilePads,
        upscaleModelIds,
        people: organization?.people || [],
        places: organization?.places || [],
        eventIds: organization?.eventIds || [],
        visualTags: organization?.visualTags || [],
        qualityFlags: organization?.qualityFlags || [],
        isDuplicateCandidate: organization?.isDuplicateCandidate || false,
        isScreenshot: organization?.isScreenshot || false,
        isVideo: organization?.isVideo || item.kind === 'video',
        dateTaken,
        year,
        month,
        hasOrganizationMetadata: Boolean(organization && Object.keys(organization).length > 1),
        isUnorganized: !organization?.people?.length && !organization?.places?.length && !organization?.eventIds?.length,
        isSmartFolder: Boolean(item.kind === 'folder' && item.isSmartFolder),
        smartFolderKind: smartFolder?.kind,
        smartFolderStatus: smartFolder?.status,
        smartFolderTags: smartFolder?.tags || [],
        smartFolderWarnings: smartFolder?.warnings || [],
        childCount: smartFolder?.childAssetIds?.length,
        isMaterialFolder: Boolean(item.kind === 'folder' && item.isMaterialFolder),
        materialStatus: material?.status,
        materialName: material?.materialName,
        materialCategory: material?.category,
        isFavoriteMaterial: Boolean(material?.isFavorite),
        pbrMapType: item.kind === 'image' ? item.pbrMapType : undefined,
        pbrMapTypes: material?.maps?.map(map => map.mapType) || [],
        missingMaps: material?.missingMaps || [],
        materialCompletenessScore: material?.completenessScore,
        materialNeedsReview: Boolean(material?.needsReview),
        hasMaterialWarnings: Boolean(material?.hasWarnings),
        hasMaterialErrors: Boolean(material?.hasErrors),
        materialTargetEngine: material?.targetEngine,
        materialOverrideCount: material?.maps?.filter((map) => map.isManualOverride).length || 0,
        hasMaterialOverrides: Boolean(material?.maps?.some((map) => map.isManualOverride)),
        hasResolutionMismatch: Boolean(material?.diagnostics?.resolution.hasResolutionMismatch)
    };
}

export function assetMatchesSearch(meta: AssetSearchMetadata, tokens: ParsedSearchToken[]): boolean {
    for (const token of tokens) {
        const valLow = normalizeSearchValue(token.value);
        let matched = false;

        switch (token.kind) {
            case 'text':
                matched = meta.name.toLowerCase().includes(valLow);
                break;
            case 'extension':
            case 'format':
                matched = (meta.extension === valLow) || (meta.format === valLow) || meta.name.toLowerCase().endsWith('.' + valLow);
                break;
            case 'dimension': {
                const dimValue = (token.key === 'w' || token.key === 'width') ? meta.width : meta.height;
                const num = Number(valLow.replace(/^[<>]/, ''));
                if (dimValue !== undefined && !Number.isNaN(num)) {
                    if (token.value.startsWith('>')) matched = dimValue > num;
                    else if (token.value.startsWith('<')) matched = dimValue < num;
                }
                break;
            }
            case 'variant':
                matched = meta.variantKinds?.some(k => k.toLowerCase().includes(valLow)) || false;
                break;
            case 'preset':
                matched = meta.presetLabels?.some(l => l.toLowerCase().includes(valLow)) || false;
                break;
            case 'ai':
                matched = (valLow === 'true' || valLow === '1') ? !!meta.hasAiJobs : !meta.hasAiJobs;
                break;
            case 'export':
                matched = (valLow === 'true' || valLow === '1') ? !!meta.hasExports : !meta.hasExports;
                break;
            case 'status':
                if (token.key === 'edited') matched = !!meta.hasAdjustments || !!meta.hasVariants;
                else if (token.key === 'metadata') matched = !!meta.hasMetadataOnlyVariants;
                else if (token.key === 'session') matched = !!meta.hasSessionOutputs;
                else if (token.key === 'upscale' || token.key === 'upscaled') matched = !!meta.hasUpscaled;
                else if (token.key === 'scale') matched = meta.upscaleScales?.some(scale => String(scale) === valLow.replace('x', '')) || false;
                else if (token.key === 'engine') matched = meta.upscaleEngines?.some(engine => normalizeSearchValue(engine).replace(/[_-]/g, '').includes(valLow.replace(/[_-]/g, ''))) || false;
                else if (token.key === 'quality') matched = meta.upscaleQualityPresets?.some(preset => preset.toLowerCase() === valLow) || false;
                else if (token.key === 'tile') matched = meta.upscaleTileSizes?.some(size => String(size) === valLow) || false;
                else if (token.key === 'model') matched = meta.upscaleModelIds?.some(modelId => normalizeSearchValue(modelId).replace(/[_-]/g, '').includes(valLow.replace(/[_-]/g, ''))) || false;
                else if (token.key === 'media') matched = meta.mediaKind === valLow;
                else if (token.key === 'smart') matched = (valLow === 'true' || valLow === '1')
                    ? !!meta.isSmartFolder
                    : meta.smartFolderKind === `${valLow.replace(/-/g, '_')}_folder` || meta.smartFolderKind === valLow.replace(/-/g, '_');
                else if (token.key === 'folder') {
                    const normalized = valLow.replace(/-/g, '_');
                    matched = normalized === 'smart'
                        ? !!meta.isSmartFolder
                        : meta.smartFolderKind === `${normalized}_folder` || meta.smartFolderKind === normalized;
                }
                else if (token.key === 'video') matched = (valLow === 'true' || valLow === '1') ? !!meta.isVideo : !meta.isVideo;
                else if (token.key === 'screenshot') matched = (valLow === 'true' || valLow === '1') ? !!meta.isScreenshot : !meta.isScreenshot;
                else if (token.key === 'person') matched = meta.people?.some(person => person.toLowerCase().includes(valLow)) || false;
                else if (token.key === 'place') matched = meta.places?.some(place => place.toLowerCase().includes(valLow)) || false;
                else if (token.key === 'event') matched = meta.eventIds?.some(eventId => eventId.toLowerCase().includes(valLow)) || false;
                else if (token.key === 'year') matched = meta.year === valLow;
                else if (token.key === 'month') matched = meta.month === valLow;
                else if (token.key === 'unorganized') matched = (valLow === 'true' || valLow === '1') ? !!meta.isUnorganized : !meta.isUnorganized;
                else if (token.key === 'duplicate') matched = (valLow === 'true' || valLow === '1') ? !!meta.isDuplicateCandidate : !meta.isDuplicateCandidate;
                else if (token.key === 'material' && (valLow === 'true' || valLow === '1')) matched = !!meta.isMaterialFolder;
                else if (token.key === 'material' && ['complete', 'partial', 'texture_set', 'unknown'].includes(valLow)) matched = meta.materialStatus === valLow;
                else if (token.key === 'material' && valLow === 'ready') matched = (meta.materialCompletenessScore || 0) >= 90;
                else if (token.key === 'material' && valLow === 'review') matched = !!meta.materialNeedsReview;
                else if (token.key === 'material' && valLow === 'warnings') matched = !!meta.hasMaterialWarnings;
                else if (token.key === 'material' && valLow === 'errors') matched = !!meta.hasMaterialErrors;
                else if (token.key === 'material' && (valLow === 'complete' || valLow === 'partial' || valLow === 'texture_set' || valLow === 'unknown')) matched = meta.materialStatus === valLow;
                else if (token.key === 'material' && valLow === 'needs_review') matched = !!meta.materialNeedsReview;
                else if (token.key === 'material' && valLow === 'incomplete') matched = (meta.materialCompletenessScore || 0) < 90;
                else if (token.key === 'pbr') matched = (valLow === 'true' || valLow === '1') ? !!meta.isMaterialFolder || !!meta.pbrMapType : false;
                else if (token.key === 'map') {
                    const normalizedMap = valLow.replace(/basecolor/g, 'base_color').replace(/-/g, '_');
                    matched = meta.pbrMapType === normalizedMap || meta.pbrMapTypes?.includes(normalizedMap as any) || false;
                }
                else if (token.key === 'missing') {
                    const normalizedMap = valLow.replace(/basecolor/g, 'base_color').replace(/-/g, '_');
                    matched = meta.missingMaps?.includes(normalizedMap as any) || false;
                }
                else if (token.key === 'favorite') matched = !!meta.isFavoriteMaterial;
                else if (token.key === 'category') matched = meta.materialCategory?.toLowerCase().includes(valLow) || false;
                else if (token.key === 'target' || token.key === 'targetengine') matched = meta.materialTargetEngine === valLow;
                else if (token.key === 'manual' || token.key === 'overrides' || token.key === 'override') matched = (valLow === 'true' || valLow === '1') ? !!meta.hasMaterialOverrides : !meta.hasMaterialOverrides;
                else if (token.key === 'ready') matched = valLow === 'generic'
                    ? (meta.materialCompletenessScore || 0) >= 90 && !meta.materialNeedsReview
                    : meta.materialTargetEngine === valLow && (meta.materialCompletenessScore || 0) >= 90 && !meta.materialNeedsReview;
                else if (token.key === 'mismatch') matched = valLow === 'resolution' ? !!meta.hasResolutionMismatch : false;
                else if (token.key === 'score') matched = (meta.materialCompletenessScore || 0) >= Number(valLow);
                break;
            case 'source':
                matched = meta.sourceName?.toLowerCase().includes(valLow) || false;
                break;
        }

        // If even one token doesn't match (AND logic), the whole search fails.
        if (!matched) return false;
    }
    return true;
}

export function filterItemsBySearch(items: GalleryItem[], query: string, context: SearchContext): GalleryItem[] {
    const tokens = parseCanonicalSearchQuery(query);
    if (tokens.length === 0) return items;

    // We only build metadata for items when searching to avoid pre-computation cost
    return items.filter(item => {
        const meta = buildAssetSearchMetadata(item, context);
        return assetMatchesSearch(meta, tokens);
    });
}

export function getSearchHint(query: string): string[] {
    return getCanonicalSearchHints(query);
}

export const parseSearchQuery = parseCanonicalSearchQuery;

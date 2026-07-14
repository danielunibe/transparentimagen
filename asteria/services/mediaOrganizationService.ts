import {
    GalleryItem,
    MediaOrganizationMetadata,
    OrganizationConfidence
} from '@/types/asteria';
import { extractBasicMediaHints, getMediaFormat } from './mediaDetectionService';
import { getOrganizationMetadata } from './organizationStorageService';

export interface OrganizationSuggestion {
    id: string;
    type: 'screenshots' | 'videos' | 'images' | 'recent' | 'large_files' | 'missing_metadata' | 'year' | 'month' | 'format' | 'camera_media' | 'unorganized' | 'duplicates_placeholder';
    label: string;
    assetIds: string[];
    description: string;
    confidence: OrganizationConfidence;
    targetFolder?: string;
    metadata?: Record<string, unknown>;
}

function getAssetBytes(asset: GalleryItem): number {
    return asset.kind !== 'folder' && asset.file ? asset.file.size : 0;
}

function getAssetTimestamp(asset: GalleryItem): number | undefined {
    return asset.kind !== 'folder' ? asset.lastModified : undefined;
}

function getDateParts(asset: GalleryItem): { year?: string; month?: string } {
    const dateTaken = asset.kind !== 'folder' ? asset.metadata?.organization?.dateTaken : undefined;
    const timestamp = dateTaken ? new Date(dateTaken).getTime() : (asset.kind !== 'folder' ? asset.lastModified : undefined);
    if (!timestamp || Number.isNaN(timestamp)) return {};
    const date = new Date(timestamp);
    const year = String(date.getFullYear());
    const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return { year, month };
}

export function buildOrganizationMetadata(asset: GalleryItem): MediaOrganizationMetadata {
    const stored = getOrganizationMetadata(asset.id);
    const hints = extractBasicMediaHints(asset);
    const current = asset.kind !== 'folder' ? asset.metadata?.organization : undefined;
    const dateTaken = current?.dateTaken || stored?.dateTaken || (asset.kind !== 'folder' && asset.lastModified ? new Date(asset.lastModified).toISOString() : undefined);

    return {
        mediaKind: hints.mediaKind,
        people: current?.people || stored?.people || [],
        personClusterIds: current?.personClusterIds || stored?.personClusterIds || [],
        places: current?.places || stored?.places || [],
        eventIds: current?.eventIds || stored?.eventIds || [],
        visualTags: Array.from(new Set([...(stored?.visualTags || []), ...(current?.visualTags || []), ...hints.visualTags])),
        qualityFlags: current?.qualityFlags || stored?.qualityFlags || hints.qualityFlags,
        isDuplicateCandidate: current?.isDuplicateCandidate || stored?.isDuplicateCandidate || false,
        duplicateGroupId: current?.duplicateGroupId || stored?.duplicateGroupId,
        isScreenshot: current?.isScreenshot ?? stored?.isScreenshot ?? hints.isScreenshot,
        isVideo: current?.isVideo ?? stored?.isVideo ?? hints.isVideo,
        dateTaken,
        cameraModel: current?.cameraModel || stored?.cameraModel,
        organizationNotes: Array.from(new Set([...(stored?.organizationNotes || []), ...(current?.organizationNotes || []), ...hints.organizationNotes])),
        organizationConfidence: current?.organizationConfidence || stored?.organizationConfidence || 'suggested',
    };
}

export function createOrganizationSuggestion(
    type: OrganizationSuggestion['type'],
    assetIds: string[],
    label: string,
    description: string,
    targetFolder?: string,
    metadata?: Record<string, unknown>,
): OrganizationSuggestion {
    return {
        id: `org_suggestion_${type}_${label.replace(/\s+/g, '_').toLowerCase()}`,
        type,
        label,
        assetIds,
        description,
        confidence: 'suggested',
        targetFolder,
        metadata,
    };
}

export function suggestDateGroups(assets: GalleryItem[]): OrganizationSuggestion[] {
    const yearMap = new Map<string, string[]>();
    assets.forEach(asset => {
        if (asset.kind === 'folder') return;
        const { year } = getDateParts(asset);
        if (!year) return;
        yearMap.set(year, [...(yearMap.get(year) || []), asset.id]);
    });
    return Array.from(yearMap.entries()).map(([year, assetIds]) =>
        createOrganizationSuggestion('year', assetIds, `Organize ${year}`, `Group ${assetIds.length} assets by year ${year}.`, year, { year })
    );
}

export function suggestFormatGroups(assets: GalleryItem[]): OrganizationSuggestion[] {
    const formatMap = new Map<string, string[]>();
    assets.forEach(asset => {
        if (asset.kind === 'folder') return;
        const format = getMediaFormat(asset.name);
        if (!format) return;
        formatMap.set(format, [...(formatMap.get(format) || []), asset.id]);
    });
    return Array.from(formatMap.entries())
        .filter(([, assetIds]) => assetIds.length > 1)
        .map(([format, assetIds]) =>
            createOrganizationSuggestion('format', assetIds, `Group ${format.toUpperCase()}`, `${assetIds.length} assets share the ${format.toUpperCase()} format.`, format.toUpperCase(), { format })
        );
}

export function suggestScreenshotGroup(assets: GalleryItem[]): OrganizationSuggestion | null {
    const assetIds = assets
        .filter(asset => asset.kind !== 'folder' && buildOrganizationMetadata(asset).isScreenshot)
        .map(asset => asset.id);
    return assetIds.length > 0
        ? createOrganizationSuggestion('screenshots', assetIds, 'Organize Screenshots', `${assetIds.length} assets look like screenshots.`, 'Screenshots')
        : null;
}

export function suggestVideoGroup(assets: GalleryItem[]): OrganizationSuggestion | null {
    const assetIds = assets.filter(asset => asset.kind === 'video').map(asset => asset.id);
    return assetIds.length > 0
        ? createOrganizationSuggestion('videos', assetIds, 'Review Videos', `${assetIds.length} video items detected in this library.`, 'Videos')
        : null;
}

export function suggestLargeFilesGroup(assets: GalleryItem[]): OrganizationSuggestion | null {
    const threshold = 10 * 1024 * 1024;
    const assetIds = assets.filter(asset => asset.kind !== 'folder' && getAssetBytes(asset) >= threshold).map(asset => asset.id);
    return assetIds.length > 0
        ? createOrganizationSuggestion('large_files', assetIds, 'Review Large Files', `${assetIds.length} assets are larger than 10 MB.`, 'Large Files')
        : null;
}

export function suggestUnorganizedGroup(assets: GalleryItem[]): OrganizationSuggestion | null {
    const assetIds = assets
        .filter(asset => asset.kind !== 'folder')
        .filter(asset => {
            const metadata = buildOrganizationMetadata(asset);
            const hasRichMetadata = Boolean(
                metadata.people?.length ||
                metadata.places?.length ||
                metadata.eventIds?.length ||
                metadata.cameraModel ||
                metadata.dateTaken
            );
            return !hasRichMetadata;
        })
        .map(asset => asset.id);
    return assetIds.length > 0
        ? createOrganizationSuggestion('unorganized', assetIds, 'Review Unorganized Media', `${assetIds.length} assets still need richer organization metadata.`, 'Unorganized')
        : null;
}

export function suggestCollections(assets: GalleryItem[]): OrganizationSuggestion[] {
    const suggestions: OrganizationSuggestion[] = [];
    const screenshotGroup = suggestScreenshotGroup(assets);
    const videoGroup = suggestVideoGroup(assets);
    const largeFilesGroup = suggestLargeFilesGroup(assets);
    const unorganizedGroup = suggestUnorganizedGroup(assets);

    if (assets.some(asset => asset.kind === 'image')) {
        const imageIds = assets.filter(asset => asset.kind === 'image').map(asset => asset.id);
        suggestions.push(createOrganizationSuggestion('images', imageIds, 'Review Photos', `${imageIds.length} image assets detected.`, 'Photos'));
    }
    if (screenshotGroup) suggestions.push(screenshotGroup);
    if (videoGroup) suggestions.push(videoGroup);
    if (largeFilesGroup) suggestions.push(largeFilesGroup);
    if (unorganizedGroup) suggestions.push(unorganizedGroup);

    const recentIds = assets
        .filter(asset => asset.kind !== 'folder' && getAssetTimestamp(asset))
        .sort((a, b) => (getAssetTimestamp(b) || 0) - (getAssetTimestamp(a) || 0))
        .slice(0, 25)
        .map(asset => asset.id);
    if (recentIds.length > 0) {
        suggestions.push(createOrganizationSuggestion('recent', recentIds, 'Recently Added', `${recentIds.length} recent assets ready for review.`));
    }

    suggestions.push(...suggestDateGroups(assets).slice(0, 4));
    suggestions.push(...suggestFormatGroups(assets).slice(0, 4));

    const cameraMediaIds = assets
        .filter(asset => asset.kind !== 'folder')
        .filter(asset => buildOrganizationMetadata(asset).visualTags?.includes('camera_media'))
        .map(asset => asset.id);
    if (cameraMediaIds.length > 0) {
        suggestions.push(createOrganizationSuggestion('camera_media', cameraMediaIds, 'Possible Camera Photos', `${cameraMediaIds.length} assets look like direct camera media.`, 'Camera Photos'));
    }

    suggestions.push(createOrganizationSuggestion('duplicates_placeholder', [], 'Possible Duplicates', 'Duplicate detection is not enabled yet in this phase.'));

    return suggestions;
}

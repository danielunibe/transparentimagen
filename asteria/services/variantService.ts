import { GalleryImageItem, AssetVariant, AssetVariantKind } from '@/types/asteria';
import { ExportResult } from './exportService';
import { assetRepository } from './repositories/assetRepository';

export function getVariantsStorageKey(assetId: string): string {
    return assetId;
}

function generateId(): string {
    return Math.random().toString(36).substring(2, 9);
}

function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function createOriginalVariant(item: GalleryImageItem): AssetVariant {
    return {
        id: `orig_${item.id}`,
        assetId: item.id,
        kind: 'original',
        label: 'Original',
        status: 'ready',
        createdAt: new Date().toISOString(),
        filename: item.name,
        objectUrl: item.objectUrl, // memory reference only
        mimeType: item.metadata?.extension ? `image/${item.metadata.extension.toLowerCase()}` : undefined,
        sizeLabel: item.metadata?.formattedSize,
        width: item.metadata?.width,
        height: item.metadata?.height
    };
}

export function createPngExportVariant(item: GalleryImageItem, result?: ExportResult): AssetVariant {
    return {
        id: `png_${generateId()}`,
        assetId: item.id,
        kind: 'png_export',
        label: 'PNG Export',
        status: 'ready',
        createdAt: new Date().toISOString(),
        filename: result?.filename,
        mimeType: result?.mimeType || 'image/png',
        sizeLabel: result?.size ? formatBytes(result.size) : undefined,
        note: 'Exported as PNG'
    };
}

export function createSvgContainerVariant(item: GalleryImageItem, result?: ExportResult): AssetVariant {
    return {
        id: `svg_${generateId()}`,
        assetId: item.id,
        kind: 'svg_container',
        label: 'SVG Container',
        status: 'ready',
        createdAt: new Date().toISOString(),
        filename: result?.filename,
        mimeType: result?.mimeType || 'image/svg+xml',
        sizeLabel: result?.size ? formatBytes(result.size) : undefined,
        note: 'Raster image embedded in SVG container'
    };
}

export function createAiPlaceholderVariant(item: GalleryImageItem, kind: AssetVariantKind, label: string): AssetVariant {
    return {
        id: `${kind}_${generateId()}`,
        assetId: item.id,
        kind: kind,
        label: label,
        status: 'placeholder',
        createdAt: new Date().toISOString(),
        note: 'Ready for local AI pipeline'
    };
}

export function sanitizeVariantForStorage(variant: AssetVariant): AssetVariant {
    const { objectUrl, file, sessionOnly, ...rest } = variant;
    
    // If it was a processed variant and had an objectUrl, it becomes metadataOnly when stored
    if (variant.kind !== 'original' && variant.status === 'ready' && objectUrl) {
        return { ...rest, metadataOnly: true } as AssetVariant;
    }
    
    return { ...rest, metadataOnly: variant.metadataOnly } as AssetVariant;
}

export function rehydrateStoredVariant(variant: AssetVariant): AssetVariant {
    // When loaded from storage, they don't have objectUrls
    if (variant.kind !== 'original' && variant.status === 'ready' && !variant.objectUrl) {
        return { ...variant, objectUrl: undefined, file: undefined, metadataOnly: true };
    }
    return { ...variant, objectUrl: undefined, file: undefined };
}

export async function loadVariants(assetId: string): Promise<AssetVariant[]> {
    const parsed = await assetRepository.getVariants(getVariantsStorageKey(assetId));
    return parsed.map(rehydrateStoredVariant);
}

export async function loadAllStoredVariants(): Promise<AssetVariant[]> {
    const allVariants = await assetRepository.getAllVariants();
    return allVariants.map(rehydrateStoredVariant);
}

export async function saveVariants(assetId: string, variants: AssetVariant[]): Promise<void> {
    const cleanVariants = variants.map(sanitizeVariantForStorage);
    await assetRepository.saveVariants(getVariantsStorageKey(assetId), cleanVariants);
}

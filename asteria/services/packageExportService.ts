import { 
    ExportPackageJob, 
    ExportPackageManifest, 
    ExportPackageItem, 
    ExportPackageStatus,
    AssetVariantKind,
    RealEsrganStatus,
    ExportFormat,
    ExportSourceMode
} from '@/types/asteria';
import { getJobLifecycleLabel } from './jobLifecycleService';

export function createExportPackageJob(label: string, itemIds: string[]): ExportPackageJob {
    const now = new Date().toISOString();
    return {
        id: `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        label,
        status: 'preparing',
        createdAt: now,
        updatedAt: now,
        format: 'folder_manifest',
        itemIds
    };
}

export function createPackageManifest(
    job: ExportPackageJob, 
    items: ExportPackageItem[]
): ExportPackageManifest {
    return {
        id: job.id,
        label: job.label,
        createdAt: new Date().toISOString(),
        appName: 'Asteria',
        format: job.format,
        itemCount: items.length,
        completedCount: items.filter(i => i.status === 'completed').length,
        failedCount: items.filter(i => i.status === 'failed').length,
        items,
        notes: [
            "This manifest describes a package of files exported from Asteria.",
            "ZIP packaging is reserved for native runtime or an approved zip dependency."
        ]
    };
}

export function generateAssetExportFilename(
    assetName: string, 
    format: ExportFormat, 
    variantLabel?: string
): string {
    const base = assetName.includes('.') ? assetName.substring(0, assetName.lastIndexOf('.')) : assetName;
    const finalName = variantLabel ? `${base}_${variantLabel.replace(/[\s\/\\:]/g, '_').toLowerCase()}` : base;
    return `${finalName}.${format}`;
}

export function createPackageItem(
    itemId: string,
    assetId: string,
    assetName: string,
    format: ExportFormat,
    sourceMode: ExportSourceMode,
    options?: {
        variantId?: string;
        variantLabel?: string;
        status?: string;
        message?: string;
        error?: string;
        hasAlpha?: boolean;
        cutoutKind?: 'cutout' | 'refined_cutout';
        variantKind?: AssetVariantKind;
        upscaleScale?: number;
        upscaleEngine?: string;
        upscaleQualityPreset?: 'fast' | 'balanced' | 'quality' | 'max';
        tileSize?: number;
        tilePad?: number;
        requestedEngine?: string;
        actualEngine?: string;
        fallbackFrom?: string;
        realEsrganStatus?: RealEsrganStatus;
        modelId?: string;
        modelStatus?: RealEsrganStatus | string;
        memoryMode?: string;
        estimatedCost?: string;
        outputWidth?: number;
        outputHeight?: number;
        smartFolderKind?: string;
        materialName?: string;
        materialStatus?: string;
        maps?: Array<{
            type: string;
            fileName: string;
        }>;
        missingMaps?: string[];
        category?: string;
        favorite?: boolean;
        materialDiagnostics?: {
            completenessScore: number;
            targetEngine: string;
            missingRequiredMaps: string[];
            missingOptionalMaps: string[];
            hasWarnings: boolean;
            hasErrors: boolean;
            hasResolutionMismatch: boolean;
            diagnostics: Array<{
                code: string;
                severity: string;
                message: string;
            }>;
        };
    }
): ExportPackageItem {
    return {
        id: itemId,
        assetId,
        assetName,
        exportFormat: format,
        sourceMode,
        outputFilename: generateAssetExportFilename(assetName, format, options?.variantLabel),
        status: (options?.status as any) || 'queued',
        variantId: options?.variantId,
        variantLabel: options?.variantLabel,
        hasAlpha: options?.hasAlpha,
        cutoutKind: options?.cutoutKind,
        variantKind: options?.variantKind,
        upscaleScale: options?.upscaleScale,
        upscaleEngine: options?.upscaleEngine,
        upscaleQualityPreset: options?.upscaleQualityPreset,
        tileSize: options?.tileSize,
        tilePad: options?.tilePad,
        requestedEngine: options?.requestedEngine,
        actualEngine: options?.actualEngine,
        fallbackFrom: options?.fallbackFrom,
        realEsrganStatus: options?.realEsrganStatus,
        modelId: options?.modelId,
        modelStatus: options?.modelStatus as any,
        memoryMode: options?.memoryMode,
        estimatedCost: options?.estimatedCost,
        outputWidth: options?.outputWidth,
        outputHeight: options?.outputHeight,
        smartFolderKind: options?.smartFolderKind as any,
        materialName: options?.materialName,
        materialStatus: options?.materialStatus as any,
        maps: options?.maps as any,
        missingMaps: options?.missingMaps as any,
        category: options?.category,
        favorite: options?.favorite,
        materialDiagnostics: options?.materialDiagnostics,
        message: options?.message,
        error: options?.error
    };
}

export function createManifestBlob(manifest: ExportPackageManifest): Blob {
    return new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
}

export function getPackageStatusLabel(status: ExportPackageStatus): string {
    return getJobLifecycleLabel(status);
}

export function sanitizePackageJobForStorage(job: ExportPackageJob): ExportPackageJob {
    return {
        ...job,
        manifest: job.manifest ? {
            ...job.manifest,
            items: job.manifest.items.map(item => ({...item}))
        } : undefined
    };
}

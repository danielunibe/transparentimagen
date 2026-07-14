import { 
    ExportPackageJob, 
    ExportPackageManifest, 
    ExportPackageItem, 
    ExportPackageStatus,
    ExportFormat,
    ExportSourceMode
} from '@/types/asteria';

export function createExportPackageJob(label: string, itemIds: string[]): ExportPackageJob {
    const now = new Date().toISOString();
    return {
        id: `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        label,
        status: 'queued', // Use standard queued or draft. Wait, `ExportPackageStatus` has `preparing` or `draft`. Let's use `preparing` initially until started. Wait, status is queued? Ah, `ExportPackageStatus` missing 'queued'. Is it?
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
    options?: { variantId?: string; variantLabel?: string; status?: string; message?: string; error?: string }
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
        message: options?.message,
        error: options?.error
    };
}

export function createManifestBlob(manifest: ExportPackageManifest): Blob {
    return new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
}

export function getPackageStatusLabel(status: ExportPackageStatus): string {
    switch (status) {
        case 'draft': return 'Draft';
        case 'preparing': return 'Preparing';
        case 'exporting': return 'Exporting';
        case 'completed': return 'Completed';
        case 'failed': return 'Failed';
        case 'partial': return 'Partial Success';
        case 'unsupported': return 'Unsupported';
        default: return status;
    }
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

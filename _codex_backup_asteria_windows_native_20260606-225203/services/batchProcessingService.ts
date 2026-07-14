import { BatchProcessingJob, BatchProcessingAction, BatchProcessingItemResult, BatchProcessingStatus, BatchProcessingOptions } from '@/types/asteria';
import { getJobLifecycleLabel } from './jobLifecycleService';

export function createBatchJob(
    label: string,
    action: BatchProcessingAction,
    itemIds: string[],
    presetId?: string,
    presetLabel?: string,
    options?: BatchProcessingOptions
): BatchProcessingJob {
    const now = Date.now().toString();
    return {
        id: `batch_${now}_${Math.random().toString(36).substring(2, 9)}`,
        label,
        action,
        itemIds,
        status: 'queued',
        createdAt: now,
        updatedAt: now,
        progress: 0,
        completedCount: 0,
        failedCount: 0,
        results: [],
        presetId,
        presetLabel,
        options
    };
}

export function updateBatchJob(job: BatchProcessingJob, patch: Partial<BatchProcessingJob>): BatchProcessingJob {
    return {
        ...job,
        ...patch,
        updatedAt: Date.now().toString()
    };
}

export function createBatchItemResult(
    itemId: string,
    itemName: string,
    status: BatchProcessingStatus,
    options?: Partial<BatchProcessingItemResult>
): BatchProcessingItemResult {
    return {
        itemId,
        itemName,
        status,
        ...options
    };
}

export function calculateBatchProgress(job: BatchProcessingJob): number {
    if (job.itemIds.length === 0) return 0;
    const processed = job.completedCount + job.failedCount + (job.skippedCount || 0);
    return Math.round((processed / job.itemIds.length) * 100);
}

export function getBatchActionLabel(action: BatchProcessingAction): string {
    switch (action) {
        case 'apply_preset': return 'Apply Preset';
        case 'create_adjustment_variant': return 'Create Adjustment';
        case 'enhance': return 'Enhance';
        case 'upscale': return 'Upscale';
        case 'portrait': return 'Portrait';
        case 'ue5': return 'UE5';
        case 'remove_bg': return 'Remove BG';
        case 'export_png': return 'Export PNG';
        case 'export_svg': return 'Export SVG';
        default: return 'Batch Job';
    }
}

export function getBatchProcessingMessage(action: BatchProcessingAction): string {
    switch (action) {
        case 'upscale': return 'Upscaling locally...';
        case 'remove_bg': return 'Removing backgrounds locally...';
        case 'enhance': return 'Enhancing locally...';
        default: return 'Processing...';
    }
}

export function getBatchStatusLabel(status: BatchProcessingStatus): string {
    return getJobLifecycleLabel(status);
}

export function sanitizeBatchJobForStorage(job: BatchProcessingJob): BatchProcessingJob {
    return {
        ...job,
        // Ensure no blobs or heavy objects snuck in
        results: job.results.map(r => ({
            itemId: r.itemId,
            itemName: r.itemName,
            status: r.status,
            variantId: r.variantId,
            variantKind: r.variantKind,
            exportJobId: r.exportJobId,
            outputWidth: r.outputWidth,
            outputHeight: r.outputHeight,
            upscaleScale: r.upscaleScale,
            upscaleEngine: r.upscaleEngine,
            errorCode: r.errorCode,
            message: r.message,
            error: r.error
        }))
    };
}

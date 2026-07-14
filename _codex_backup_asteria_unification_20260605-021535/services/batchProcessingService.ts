import { BatchProcessingJob, BatchProcessingAction, BatchProcessingItemResult, BatchProcessingStatus } from '@/types/asteria';

export function createBatchJob(
    label: string,
    action: BatchProcessingAction,
    itemIds: string[],
    presetId?: string,
    presetLabel?: string
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
        presetLabel
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
    options?: { variantId?: string; exportJobId?: string; message?: string; error?: string }
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
    const processed = job.completedCount + job.failedCount;
    return Math.round((processed / job.itemIds.length) * 100);
}

export function getBatchStatusLabel(status: BatchProcessingStatus): string {
    switch (status) {
        case 'queued': return 'Queued';
        case 'running': return 'Running';
        case 'completed': return 'Completed';
        case 'failed': return 'Failed';
        case 'cancelled': return 'Cancelled';
        case 'partial': return 'Partial Success';
        default: return status;
    }
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
            exportJobId: r.exportJobId,
            message: r.message,
            error: r.error
        }))
    };
}

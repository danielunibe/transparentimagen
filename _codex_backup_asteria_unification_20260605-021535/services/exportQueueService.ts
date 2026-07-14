import { safeSetJson, safeGetJson } from './storageService';
import { ExportJob, BatchExportPlan, ExportRecipe, GalleryItem } from '@/types/asteria';

const EXPORT_JOBS_STORAGE_KEY = 'asteria_export_jobs';

export function getExportJobs(): ExportJob[] {
    return safeGetJson<ExportJob[]>(EXPORT_JOBS_STORAGE_KEY, []).filter(job => job.status === 'completed' || job.status === 'failed' || job.status === 'unsupported' || job.status === 'cancelled');
}

export function saveExportJobs(jobs: ExportJob[]): void {
    safeSetJson(EXPORT_JOBS_STORAGE_KEY, jobs);
}

export function createExportJob(item: GalleryItem, recipe: ExportRecipe, variantId?: string, variantLabel?: string): ExportJob {
    return {
        id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        assetId: item.id,
        assetName: item.name,
        format: recipe.format,
        sourceMode: recipe.sourceMode,
        status: 'queued',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        variantId,
        variantLabel
    };
}

export function createBatchExportPlan(items: GalleryItem[], recipe: ExportRecipe): BatchExportPlan {
    return {
        id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        itemIds: items.map(i => i.id),
        recipeId: recipe.id,
        createdAt: new Date().toISOString(),
        status: 'queued'
    };
}

export function sanitizeExportJobForStorage(job: ExportJob): ExportJob {
    return {
        ...job
    };
}

export function getExportStatusLabel(status: ExportJob['status']): string {
    switch (status) {
        case 'queued': return 'Queued';
        case 'preparing': return 'Preparing...';
        case 'exporting': return 'Exporting...';
        case 'completed': return 'Completed';
        case 'failed': return 'Failed';
        case 'cancelled': return 'Cancelled';
        case 'unsupported': return 'Unsupported';
        default: return status;
    }
}

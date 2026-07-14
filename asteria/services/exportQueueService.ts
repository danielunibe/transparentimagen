import { readNativeJson, writeNativeJson } from './storageService';
import { ExportJob, BatchExportPlan, ExportRecipe, GalleryItem } from '@/types/asteria';
import { getJobLifecycleLabel } from './jobLifecycleService';
import { isJobLifecycleTerminal } from '@/data/jobStatuses';

const EXPORT_JOBS_STORAGE_KEY = 'asteria_export_jobs';

export async function getExportJobs(): Promise<ExportJob[]> {
    return (await readNativeJson<ExportJob[]>(EXPORT_JOBS_STORAGE_KEY, []))
        .filter(job => isJobLifecycleTerminal(job.status));
}

export async function saveExportJobs(jobs: ExportJob[]): Promise<void> {
    await writeNativeJson(EXPORT_JOBS_STORAGE_KEY, jobs);
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
    return getJobLifecycleLabel(status);
}

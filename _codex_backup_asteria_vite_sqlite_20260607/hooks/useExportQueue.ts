import { useState, useCallback, useEffect } from 'react';
import { ExportJob, BatchExportPlan, ExportRecipe, GalleryItem, AssetVariant, GalleryImageItem } from '@/types/asteria';
import { getExportJobs, saveExportJobs, createExportJob, createBatchExportPlan, sanitizeExportJobForStorage } from '@/services/exportQueueService';
import { exportRecipes } from '@/data/exportRecipes';
import { saveImageAsPng, exportImageAsSvgContainer } from '@/services/exportService';
import { isJobLifecycleTerminal } from '@/data/jobStatuses';

export function useExportQueue(
    getItems: () => GalleryItem[],
    getVariants: () => AssetVariant[]
) {
    const [jobs, setJobs] = useState<ExportJob[]>(() => getExportJobs().slice(0, 100));

    const updateJob = useCallback((jobId: string, patch: Partial<ExportJob>) => {
        setJobs(prev => {
            const next = prev.map(j => j.id === jobId ? { ...j, ...patch, updatedAt: new Date().toISOString() } : j);
            
            // Background save for completed/failed
            const jobNow = next.find(j => j.id === jobId);
            if (jobNow && isJobLifecycleTerminal(jobNow.status)) {
                const toSave = next.filter(j => isJobLifecycleTerminal(j.status)).map(sanitizeExportJobForStorage);
                saveExportJobs(toSave.slice(0, 100));
            }
            
            return next;
        });
    }, []);

    const runExportJob = useCallback(async (job: ExportJob, item: GalleryItem, activeVariant?: AssetVariant) => {
        updateJob(job.id, { status: 'exporting' });
        
        try {
            if (item.kind !== 'image') {
                updateJob(job.id, { status: 'unsupported', error: 'Only images are supported' });
                return false;
            }

            const imageItem = item as GalleryImageItem;
            
            // Resolve item to export
            let exportItem = imageItem;
            
            if (job.sourceMode === 'active_variant' && activeVariant) {
                if (activeVariant.metadataOnly) {
                    updateJob(job.id, { status: 'unsupported', error: 'Variant output is metadata only. Cannot export.' });
                    return false;
                }
                
                if (activeVariant.objectUrl) {
                    exportItem = {
                        ...imageItem,
                        objectUrl: activeVariant.objectUrl,
                        file: activeVariant.file,
                        name: activeVariant.filename || imageItem.name,
                    };
                }
            }
            
            let result;
            if (job.format === 'png') {
                result = await saveImageAsPng(exportItem);
            } else if (job.format === 'svg') {
                result = await exportImageAsSvgContainer(exportItem);
            } else {
                throw new Error(`Unsupported format: ${job.format}`);
            }
            
            updateJob(job.id, { 
                status: 'completed', 
                filename: result.filename 
            });
            return true;
        } catch (e: any) {
            console.error('Export job failed:', e);
            updateJob(job.id, { 
                status: 'failed', 
                error: e.message || 'Unknown error' 
            });
            return false;
        }
    }, [updateJob]);

    const queueExportJob = useCallback(async (item: GalleryItem, recipe: ExportRecipe, activeVariant?: AssetVariant) => {
        let vId, vLabel;
        if (recipe.sourceMode === 'active_variant' && activeVariant && activeVariant.kind !== 'original') {
             vId = activeVariant.id;
             vLabel = activeVariant.label;
        }
        
        const job = createExportJob(item, recipe, vId, vLabel);
        setJobs(prev => [job, ...prev].slice(0, 100));
        
        // Let state update, then run
        setTimeout(() => runExportJob(job, item, activeVariant), 50);
        return job;
    }, [runExportJob]);

    const runBatchExport = useCallback(async (items: GalleryItem[], recipeId: string) => {
        const recipe = exportRecipes[recipeId];
        if (!recipe) return false;

        const allVariants = getVariants();
        const plan = createBatchExportPlan(items, recipe); // We don't save plan yet, just use for logs if needed
        
        // Queue all jobs
        const newJobs = items.map(item => {
             // Find active variant for this item if needed
             let activeVariant = undefined;
             if (recipe.sourceMode === 'active_variant') {
                 // Simplistic assumption: last active or just some variant. 
                 // Actually find highest created ready variant for this item
                 const itemVariants = allVariants.filter(v => v.assetId === item.id && v.status === 'ready' && !v.metadataOnly);
                 if (itemVariants.length > 0) {
                     // Sort by createdAt desc
                     itemVariants.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                     activeVariant = itemVariants[0];
                 }
             }
             
             let vId, vLabel;
             if (activeVariant) {
                 vId = activeVariant.id;
                 vLabel = activeVariant.label;
             }
             return createExportJob(item, recipe, vId, vLabel);
        });

        setJobs(prev => [...newJobs, ...prev].slice(0, 100));

        // Let state update, then run sequentially (to avoid browser prompt blocking too much)
        setTimeout(async () => {
            for (let i = 0; i < newJobs.length; i++) {
                const job = newJobs[i];
                const item = items.find(it => it.id === job.assetId);
                if (item) {
                    const activeVariant = job.variantId ? allVariants.find(v => v.id === job.variantId) : undefined;
                    await runExportJob(job, item, activeVariant);
                }
            }
        }, 50);

        return true;
    }, [runExportJob, getVariants]);

    const clearCompletedExports = useCallback(() => {
        setJobs(prev => {
            const next = prev.filter(j => !isJobLifecycleTerminal(j.status));
            saveExportJobs([]); 
            return next;
        });
    }, []);

    const cancelExportJob = useCallback((jobId: string) => {
        updateJob(jobId, { status: 'cancelled' });
    }, [updateJob]);

    const getJobsForAsset = useCallback((assetId: string) => {
        return jobs.filter(j => j.assetId === assetId);
    }, [jobs]);

    return {
        exportJobs: jobs,
        queueExportJob,
        runBatchExport,
        clearCompletedExports,
        cancelExportJob,
        getJobsForAsset
    };
}

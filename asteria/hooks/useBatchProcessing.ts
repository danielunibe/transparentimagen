import { useState, useCallback, useRef, useEffect } from 'react';
import { BatchProcessingJob, BatchProcessingItemResult, BatchProcessingAction, GalleryItem, AssetVariant, BatchProcessingOptions, BatchUpscaleOptions } from '@/types/asteria';
import { 
    createBatchJob, 
    updateBatchJob, 
    createBatchItemResult, 
    calculateBatchProgress,
    sanitizeBatchJobForStorage
} from '@/services/batchProcessingService';
import { 
    applyAdjustmentSettings, 
    applyEnhancePreset, 
    applyPortraitPreset, 
    applyUe5PreviewPreset 
} from '@/services/browserImageProcessingService';
import { builtInPresets } from '@/data/adjustmentPresets';
import { readNativeJson, writeNativeJson } from '@/services/storageService';
import { loadVariants, saveVariants } from '@/services/variantService';
import { exportRecipes } from '@/data/exportRecipes';
import { aiAdapterRegistry } from '@/services/aiAdapterRegistry';
import { createProcessingReport, exportProcessingReportJson, loadProcessingReports, ProcessingReport, saveProcessingReport } from '@/services/processingReportService';

const BATCH_JOBS_STORAGE_KEY = 'asteria_batch_jobs';

import { ExportRecipe } from '@/types/asteria';

export function useBatchProcessing(items: GalleryItem[], queueExportJob?: (item: GalleryItem, recipe: ExportRecipe, activeVariant?: AssetVariant) => void) {
    const [batchJobs, setBatchJobs] = useState<BatchProcessingJob[]>([]);
    const [activeBatchJob, setActiveBatchJob] = useState<BatchProcessingJob | null>(null);
    const cancelRef = useRef<Record<string, boolean>>({});
    const [sessionVariants, setSessionVariants] = useState<AssetVariant[]>([]);
    const [processingReports, setProcessingReports] = useState<ProcessingReport[]>([]);

    useEffect(() => {
        void readNativeJson<BatchProcessingJob[]>(BATCH_JOBS_STORAGE_KEY, []).then(setBatchJobs);
        void loadProcessingReports().then(setProcessingReports);
    }, []);

    const saveJobs = useCallback((jobs: BatchProcessingJob[]) => {
        setBatchJobs(jobs);
        const toSave = jobs.slice(0, 50).map(sanitizeBatchJobForStorage);
        void writeNativeJson(BATCH_JOBS_STORAGE_KEY, toSave);
    }, []);

    const updateJob = useCallback((jobId: string, patch: Partial<BatchProcessingJob>) => {
        let updated: BatchProcessingJob | null = null;
        setBatchJobs(prev => {
            const next = prev.map(j => {
                if (j.id === jobId) {
                    updated = updateBatchJob(j, patch);
                    return updated;
                }
                return j;
            });
            setTimeout(() => saveJobs(next), 0);
            return next;
        });
        
        setActiveBatchJob(prev => {
            if (prev?.id === jobId) return updated || prev;
            return prev;
        });
    }, [saveJobs]);

    const runBatchJob = useCallback(async (job: BatchProcessingJob) => {
        cancelRef.current[job.id] = false;
        setActiveBatchJob(job);
        const startedAt = Date.now();
        
        updateJob(job.id, { status: 'running' });
        
        const results: BatchProcessingItemResult[] = [];
        let completed = 0;
        let failed = 0;
        let skipped = 0;
        let createdVariantCount = 0;
        
        const preset = job.presetId ? builtInPresets.find(p => p.id === job.presetId) : null;
        
        for (const itemId of job.itemIds) {
            if (cancelRef.current[job.id]) {
                break;
            }
            
            const item = items.find(i => i.id === itemId);
            if (!item || item.kind !== 'image') {
                skipped++;
                results.push(createBatchItemResult(itemId, item?.name || 'Unknown', 'skipped', { message: 'Item not found or not an image' }));
                updateJob(job.id, { completedCount: completed, failedCount: failed, skippedCount: skipped, results, progress: calculateBatchProgress({ ...job, completedCount: completed, failedCount: failed, skippedCount: skipped }) });
                continue;
            }
            
            try {
                let variant: AssetVariant | null = null;
                const now = new Date().toISOString();
                
                if (job.action === 'apply_preset' && preset && item.objectUrl) {
                    const proc = await applyAdjustmentSettings(item.objectUrl, preset.settings);
                    variant = {
                        id: `adj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                        assetId: item.id,
                        kind: 'adjustment',
                        label: preset.label || preset.id,
                        status: 'ready',
                        sessionOnly: true,
                        objectUrl: URL.createObjectURL(proc.blob),
                        createdAt: now,
                        presetId: preset.id,
                        note: 'Batch adjustment',
                        mimeType: 'image/png'
                    };
                } else if (job.action === 'enhance' && item.objectUrl) {
                    const proc = await applyEnhancePreset(item.objectUrl);
                    variant = {
                        id: `enh_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                        assetId: item.id,
                        kind: 'enhanced',
                        label: 'Enhanced',
                        status: 'ready',
                        sessionOnly: true,
                        objectUrl: URL.createObjectURL(proc.blob),
                        createdAt: now,
                        note: 'Batch enhance',
                        mimeType: 'image/png'
                    };
                } else if (job.action === 'portrait' && item.objectUrl) {
                    const proc = await applyPortraitPreset(item.objectUrl);
                    variant = {
                        id: `por_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                        assetId: item.id,
                        kind: 'portrait',
                        label: 'Portrait',
                        status: 'ready',
                        sessionOnly: true,
                        objectUrl: URL.createObjectURL(proc.blob),
                        createdAt: now,
                        mimeType: 'image/png'
                    };
                } else if (job.action === 'ue5' && item.objectUrl) {
                    const proc = await applyUe5PreviewPreset(item.objectUrl);
                    variant = {
                        id: `ue5_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                        assetId: item.id,
                        kind: 'ue5',
                        label: 'UE5 Preview',
                        status: 'ready',
                        sessionOnly: true,
                        objectUrl: URL.createObjectURL(proc.blob),
                        createdAt: now,
                        mimeType: 'image/png'
                    };
                } else if (job.action === 'remove_bg') {
                    const adapter = aiAdapterRegistry.resolveAdapterForMode('remove_bg');
                    if (!adapter || adapter.info.id !== 'tauri_sidecar') {
                         throw new Error('Background removal requires native Python sidecar.');
                    }
                    if (adapter.info.status !== 'available' || !adapter.info.capabilities.removeBg) {
                         throw new Error('Background removal dependencies are not installed.');
                    }
                    
                    const result = await adapter.process({
                        jobId: job.id,
                        assetId: item.id,
                        assetName: item.name,
                        mode: 'remove_bg',
                        objectUrl: item.objectUrl,
                        file: item.file
                    });
                    
                    if (result.status === 'completed' && result.outputObjectUrl) {
                         variant = {
                             id: `cutout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                             assetId: item.id,
                             kind: 'cutout',
                             label: 'Cutout Preview',
                             status: 'ready',
                             sessionOnly: true,
                             objectUrl: result.outputObjectUrl,
                             createdAt: now,
                             mimeType: 'image/png',
                             filename: result.outputFilename,
                             hasAlpha: true,
                             file: result.outputBlob ? new File([result.outputBlob], result.outputFilename || 'output.png', { type: result.outputMimeType || 'image/png' }) : undefined,
                             note: 'Batch background removal'
                         };
                    } else {
                         throw new Error(result.message || 'Background removal failed');
                    }
                } else if (job.action === 'upscale') {
                    const upscaleOptions = normalizeBatchUpscaleOptions(job.options?.upscale);
                    await aiAdapterRegistry.checkAdapters();
                    const adapter = aiAdapterRegistry.resolveAdapterForMode('upscale');
                    if (!adapter || adapter.info.id !== 'tauri_sidecar') {
                         throw createBatchError('sidecar_required', 'Upscale requires the local Python sidecar.');
                    }
                    if (adapter.info.status !== 'available' || !adapter.info.capabilities.upscale) {
                         throw createBatchError('upscale_unavailable', 'Upscale is not available in the current Python runtime.');
                    }
                    
                    const result = await adapter.process({
                        jobId: job.id,
                        assetId: item.id,
                        assetName: item.name,
                        mode: 'upscale',
                        objectUrl: item.objectUrl,
                        file: item.file,
                        scale: upscaleOptions.scale,
                        engine: upscaleOptions.engine,
                        qualityPreset: upscaleOptions.qualityPreset,
                        tileSize: upscaleOptions.tileSize,
                        tilePad: upscaleOptions.tilePad,
                        modelId: upscaleOptions.modelId
                    });
                    
                     if (result.status === 'completed' && result.outputObjectUrl) {
                         const scale = result.scale || upscaleOptions.scale;
                         const requestedEngine = result.requestedEngine || upscaleOptions.engine;
                         const actualEngine = result.actualEngine || result.engine || 'pillow_lanczos';
                         variant = {
                             id: `upscaled_${scale}x_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                             assetId: item.id,
                             kind: 'upscaled',
                             label: `Upscaled ${scale}x`,
                             status: 'ready',
                             sessionOnly: true,
                             objectUrl: result.outputObjectUrl,
                             createdAt: now,
                             mimeType: 'image/png',
                             filename: result.outputFilename,
                             file: result.outputBlob ? new File([result.outputBlob], result.outputFilename || 'upscaled.png', { type: result.outputMimeType || 'image/png' }) : undefined,
                             width: result.outputWidth,
                             height: result.outputHeight,
                             originalWidth: item.metadata?.width,
                             originalHeight: item.metadata?.height,
                             outputWidth: result.outputWidth,
                             outputHeight: result.outputHeight,
                             upscaleScale: scale,
                             upscaleEngine: actualEngine,
                             upscaleQualityPreset: result.qualityPreset || upscaleOptions.qualityPreset,
                             tileSize: result.tileSize || upscaleOptions.tileSize,
                             tilePad: result.tilePad || upscaleOptions.tilePad,
                             requestedEngine,
                             actualEngine,
                             fallbackFrom: result.fallbackFrom,
                             realEsrganStatus: result.realEsrganStatus,
                             modelId: result.modelId,
                             modelStatus: result.modelStatus,
                             memoryMode: result.memoryMode,
                             estimatedCost: result.estimatedCost,
                             sourceJobId: job.id,
                              note: 'Upscaled locally with Python sidecar.'
                         };
                    } else {
                         throw createBatchError('image_failed_to_upscale', result.message || 'Image failed to upscale.');
                    }
                } else if ((job.action === 'export_png' || job.action === 'export_svg') && queueExportJob) {
                    const recipeId = job.action === 'export_svg' ? 'svg_container' : 'png_active_variant';
                    const recipe = exportRecipes[recipeId];
                    if (recipe) {
                        queueExportJob(item, recipe);
                        completed++;
                        results.push(createBatchItemResult(itemId, item.name, 'completed'));
                    } else {
                        throw new Error(`Export recipe ${recipeId} not found`);
                    }
                    updateJob(job.id, { completedCount: completed, failedCount: failed, results, progress: calculateBatchProgress({ ...job, completedCount: completed, failedCount: failed }) });
                    continue;
                } else {
                    throw new Error('Unsupported action or missing requirements');
                }
                
                if (variant) {
                    setSessionVariants(prev => [...prev, variant!]);
                    
                    // Persist metadata (stripping objectUrl) so Smart Collections remember across reload
                    const existing = await loadVariants(item.id);
                    // Filter out original because loadVariants might return it depending on implementation, actually wait.
                    // Persisted variants contain metadata only; session URLs remain in memory.
                    await saveVariants(item.id, [...existing, variant]);

                    completed++;
                    createdVariantCount++;
                    results.push(createBatchItemResult(itemId, item.name, 'completed', {
                        variantId: variant.id,
                        variantKind: variant.kind,
                        outputWidth: variant.outputWidth || variant.width,
                        outputHeight: variant.outputHeight || variant.height,
                        upscaleScale: variant.upscaleScale,
                        upscaleEngine: variant.upscaleEngine,
                        upscaleQualityPreset: variant.upscaleQualityPreset,
                        tileSize: variant.tileSize,
                        tilePad: variant.tilePad,
                        requestedEngine: variant.requestedEngine,
                        actualEngine: variant.actualEngine,
                        fallbackFrom: variant.fallbackFrom,
                        realEsrganStatus: variant.realEsrganStatus,
                        modelId: variant.modelId,
                        modelStatus: variant.modelStatus,
                        memoryMode: variant.memoryMode,
                        estimatedCost: variant.estimatedCost,
                        message: job.action === 'upscale' ? 'Upscaled variant created' : undefined
                    }));
                } else {
                     throw new Error('Variant not created');
                }
            } catch (err: any) {
                failed++;
                results.push(createBatchItemResult(itemId, item.name, 'failed', { error: err.message || 'Processing failed', errorCode: err.code }));
                console.error(`Batch item failed: ${item.name}`, err);
            }
            
            updateJob(job.id, { completedCount: completed, failedCount: failed, skippedCount: skipped, createdVariantCount, results, progress: calculateBatchProgress({ ...job, completedCount: completed, failedCount: failed, skippedCount: skipped }) });
        }
        
        const isCancelled = cancelRef.current[job.id];
        const finalStatus = isCancelled ? 'cancelled' : (failed > 0 && completed > 0 ? 'partial' : (failed > 0 ? 'failed' : 'completed'));
        const durationMs = Date.now() - startedAt;
        const finalJob = updateBatchJob(job, {
            status: finalStatus,
            completedCount: completed,
            failedCount: failed,
            skippedCount: skipped,
            createdVariantCount,
            durationMs,
            results,
            progress: calculateBatchProgress({ ...job, completedCount: completed, failedCount: failed, skippedCount: skipped })
        });
        const report = createProcessingReport(finalJob);
        const savedReports = await saveProcessingReport(report);
        setProcessingReports(savedReports);
        
        updateJob(job.id, { status: finalStatus, durationMs, createdVariantCount, reportId: report.id });
        
        if (activeBatchJob?.id === job.id) {
            setActiveBatchJob(null);
        }
        
    }, [items, updateJob, queueExportJob, activeBatchJob]);

    const queueBatchJob = useCallback((label: string, action: BatchProcessingAction, itemIds: string[], presetId?: string, presetLabel?: string, options?: BatchProcessingOptions) => {
        const job = createBatchJob(label, action, itemIds, presetId, presetLabel, options);
        setBatchJobs(prev => {
            const next = [job, ...prev];
            setTimeout(() => saveJobs(next), 0);
            return next;
        });
        // Auto-run for now
        runBatchJob(job);
        return job;
    }, [runBatchJob, saveJobs]);

    const cancelBatchJob = useCallback((jobId: string) => {
        cancelRef.current[jobId] = true;
    }, []);

    const clearCompletedBatchJobs = useCallback(() => {
        setBatchJobs(prev => {
            const next = prev.filter(j => j.status === 'running' || j.status === 'queued');
            saveJobs(next);
            return next;
        });
    }, [saveJobs]);

    const downloadProcessingReport = useCallback((reportId: string) => {
        const report = processingReports.find(item => item.id === reportId);
        if (report) exportProcessingReportJson(report);
    }, [processingReports]);

    return {
        batchJobs,
        activeBatchJob,
        queueBatchJob,
        cancelBatchJob,
        clearCompletedBatchJobs,
        processingReports,
        downloadProcessingReport,
        sessionVariants
    };
}

function normalizeBatchUpscaleOptions(options?: BatchUpscaleOptions): BatchUpscaleOptions {
    const scale = options?.scale && [2, 3, 4].includes(options.scale) ? options.scale : 2;
    const engine = options?.engine === 'real-esrgan' || options?.engine === 'real_esrgan' || options?.engine === 'pillow' ? options.engine : 'auto';
    const qualityPreset = options?.qualityPreset && ['fast', 'balanced', 'quality', 'max'].includes(options.qualityPreset)
        ? options.qualityPreset
        : 'balanced';
    const tileSize = options?.tileSize && [64, 128, 192, 256].includes(options.tileSize) ? options.tileSize : undefined;
    const tilePad = options?.tilePad && [4, 8, 12, 16].includes(options.tilePad) ? options.tilePad : undefined;
    const modelId = options?.modelId?.trim() || undefined;
    return { scale, engine, qualityPreset, tileSize, tilePad, modelId };
}

function createBatchError(code: string, message: string): Error & { code?: string } {
    const error = new Error(message) as Error & { code?: string };
    error.code = code;
    return error;
}

import { useState, useCallback, useEffect } from 'react';
import { AiProcessingJob, AiProcessingMode, BatchUpscaleOptions, GalleryItem } from '@/types/asteria';
import { RuntimeFeatureId } from '@/types/domains/runtime';
import { readNativeJson, writeNativeJson } from '@/services/storageService';
import { createAiJob, updateAiJob, mapModeToVariantKind, getVariantLabelForMode } from '@/services/aiProcessingService';
import { aiAdapterRegistry } from '@/services/aiAdapterRegistry';
import { isJobLifecycleActive, isJobLifecycleTerminal } from '@/data/jobStatuses';
import { collectRuntimeCapabilitySnapshot } from '@/services/capabilityStatusService';
import { getRuntimeFeatureStatus, explainUnavailableFeature } from '@/services/runtimeCapabilityService';

const AI_JOBS_KEY = 'asteria_ai_jobs';
const MAX_JOBS = 50;

export function useAiProcessing(registerVariant: (variant: any) => void, showFeedback: (msg: string) => void) {
    const [jobs, setJobs] = useState<AiProcessingJob[]>([]);
    const [jobsLoaded, setJobsLoaded] = useState(false);

    useEffect(() => {
        void readNativeJson<AiProcessingJob[]>(AI_JOBS_KEY, []).then((stored) => {
            setJobs(Array.isArray(stored) ? stored : []);
            setJobsLoaded(true);
        });
        aiAdapterRegistry.checkAdapters();
    }, []);

    useEffect(() => {
        if (jobsLoaded) void writeNativeJson(AI_JOBS_KEY, jobs);
    }, [jobs, jobsLoaded]);

    const getJobsForAsset = useCallback((assetId: string) => {
        return jobs.filter(j => j.assetId === assetId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [jobs]);

    const getLatestJobForAsset = useCallback((assetId: string) => {
        const assetJobs = getJobsForAsset(assetId);
        return assetJobs.length > 0 ? assetJobs[0] : null;
    }, [getJobsForAsset]);

    const runAiJob = useCallback(async (asset: GalleryItem, mode: AiProcessingMode, prompt?: string, options?: { upscale?: BatchUpscaleOptions }) => {
        if (asset.kind !== 'image') {
            showFeedback('Select an image to run AI actions.');
            return;
        }

        const safePrompt = prompt ? prompt.substring(0, 500) : undefined;
        const adapter = aiAdapterRegistry.resolveAdapterForMode(mode);
        const runtimeSnapshot = await collectRuntimeCapabilitySnapshot();
        const featureId = mode === 'remove_bg'
            ? 'rembg'
            : mode === 'upscale'
                ? (options?.upscale?.engine === 'real-esrgan' || options?.upscale?.engine === 'real_esrgan'
                    ? 'upscale_real_esrgan'
                    : 'upscale_pillow')
                : 'python_sidecar';
        const requestedFeature = getRuntimeFeatureStatus(runtimeSnapshot, featureId as RuntimeFeatureId);

        if (requestedFeature && !requestedFeature.available) {
            const job = createAiJob({
                assetId: asset.id,
                assetName: asset.name,
                mode,
                prompt: safePrompt,
                adapterId: adapter.info.id,
                adapterLabel: adapter.info.label,
                status: 'failed',
                message: explainUnavailableFeature(requestedFeature)
            });
            setJobs(prev => [job, ...prev].slice(0, MAX_JOBS));
            showFeedback(job.message || 'Action unavailable.');
            return;
        }
        
        let job = createAiJob({
            assetId: asset.id,
            assetName: asset.name,
            mode,
            prompt: safePrompt,
            adapterId: adapter.info.id,
            adapterLabel: adapter.info.label
        });

        setJobs(prev => [job, ...prev].slice(0, MAX_JOBS));
        
        // small UI delay for preparing state
        setTimeout(() => {
            setJobs(prev => prev.map(j => j.id === job.id ? updateAiJob(j, { status: 'preparing' }) : j));
        }, 100);

        try {
            const result = await adapter.process({
                jobId: job.id,
                assetId: asset.id,
                assetName: asset.name,
                mode,
                prompt: safePrompt,
                objectUrl: asset.objectUrl,
                file: asset.file,
                scale: mode === 'upscale' ? (options?.upscale?.scale || 2) : undefined,
                engine: mode === 'upscale' ? (options?.upscale?.engine || 'auto') : undefined,
                qualityPreset: mode === 'upscale' ? (options?.upscale?.qualityPreset || 'balanced') : undefined,
                tileSize: mode === 'upscale' ? options?.upscale?.tileSize : undefined,
                tilePad: mode === 'upscale' ? options?.upscale?.tilePad : undefined,
                modelId: mode === 'upscale' ? options?.upscale?.modelId : undefined
            });
            
            if (result.status === 'placeholder') {
                 setJobs(prev => prev.map(j => j.id === job.id ? updateAiJob(j, { 
                     status: 'placeholder', 
                     message: result.message
                 }) : j));

                 showFeedback(result.message || `${getVariantLabelForMode(mode)} is not available yet.`);
            } else if (result.status === 'completed') {
                const variantId = `var_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                setJobs(prev => prev.map(j => j.id === job.id ? updateAiJob(j, { 
                     status: 'completed', 
                     message: result.message,
                     variantId
                 }) : j));
                 
                if (result.outputObjectUrl) {
                     registerVariant({
                         id: variantId,
                         assetId: asset.id,
                         kind: mapModeToVariantKind(mode),
                         label: mode === 'upscale' ? `Upscaled ${result.scale || 2}x Preview` : getVariantLabelForMode(mode),
                         status: 'ready',
                         createdAt: new Date().toISOString(),
                         note: result.message,
                         objectUrl: result.outputObjectUrl,
                         mimeType: result.outputMimeType,
                         filename: result.outputFilename,
                         width: result.outputWidth,
                         height: result.outputHeight,
                         hasAlpha: mode === 'remove_bg',
                         upscaleScale: mode === 'upscale' ? (result.scale || 2) : undefined,
                         upscaleEngine: mode === 'upscale' ? (result.actualEngine || result.engine || 'pillow_lanczos') : undefined,
                         upscaleQualityPreset: mode === 'upscale' ? result.qualityPreset : undefined,
                         tileSize: mode === 'upscale' ? result.tileSize : undefined,
                         tilePad: mode === 'upscale' ? result.tilePad : undefined,
                         requestedEngine: mode === 'upscale' ? (result.requestedEngine || 'auto') : undefined,
                         actualEngine: mode === 'upscale' ? (result.actualEngine || result.engine || 'pillow_lanczos') : undefined,
                         fallbackFrom: mode === 'upscale' ? result.fallbackFrom : undefined,
                         realEsrganStatus: mode === 'upscale' ? result.realEsrganStatus : undefined,
                         modelId: mode === 'upscale' ? result.modelId : undefined,
                         modelStatus: mode === 'upscale' ? result.modelStatus : undefined,
                         memoryMode: mode === 'upscale' ? result.memoryMode : undefined,
                         estimatedCost: mode === 'upscale' ? result.estimatedCost : undefined,
                         originalWidth: mode === 'upscale' ? asset.metadata?.width : undefined,
                         originalHeight: mode === 'upscale' ? asset.metadata?.height : undefined,
                         outputWidth: mode === 'upscale' ? result.outputWidth : undefined,
                         outputHeight: mode === 'upscale' ? result.outputHeight : undefined,
                         file: result.outputBlob ? new File([result.outputBlob], result.outputFilename || 'output.png', { type: result.outputMimeType || 'image/png' }) : undefined,
                         sessionOnly: true,
                         sourceJobId: job.id
                     });
                 }
                 showFeedback(`Job completed: ${getVariantLabelForMode(mode)}`);
            } else if (result.status === 'failed') {
                setJobs(prev => prev.map(j => j.id === job.id ? updateAiJob(j, { 
                     status: 'failed', 
                     message: result.message
                 }) : j));
                 showFeedback(`Job failed: ${result.message}`);
            }
        } catch (error: any) {
            setJobs(prev => prev.map(j => j.id === job.id ? updateAiJob(j, { 
                 status: 'failed', 
                 message: error.message || 'Unknown error'
             }) : j));
             showFeedback('Error during AI processing.');
        }

    }, [registerVariant, showFeedback]);
    
    const runPlaceholderJob = runAiJob; // alias for older usage

    const cancelJob = useCallback(async (jobId: string) => {
        const job = jobs.find(j => j.id === jobId);
        if (job && job.adapterId) {
            const adapter = aiAdapterRegistry.getAdapterById(job.adapterId);
            if (adapter && adapter.cancel) {
                await adapter.cancel(jobId);
            }
        }
        setJobs(prev => prev.map(j => {
            if (j.id === jobId && isJobLifecycleActive(j.status)) {
                return updateAiJob(j, { status: 'cancelled', message: 'User cancelled' });
            }
            return j;
        }));
    }, [jobs]);

    const clearCompleted = useCallback(() => {
        setJobs(prev => prev.filter(j => !isJobLifecycleTerminal(j.status) && j.status !== 'placeholder'));
    }, []);

    return {
        jobs,
        getJobsForAsset,
        getLatestJobForAsset,
        runAiJob,
        runPlaceholderJob,
        cancelJob,
        clearCompleted
    };
}

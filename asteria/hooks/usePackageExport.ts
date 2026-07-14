import { useState, useCallback, useEffect, useRef } from 'react';
import { 
    ExportPackageJob, 
    ExportPackageManifest, 
    ExportPackageItem, 
    GalleryItem, 
    ExportRecipe, 
    AssetVariant 
} from '@/types/asteria';
import { 
    createExportPackageJob, 
    createPackageManifest, 
    createPackageItem, 
    createManifestBlob, 
    sanitizePackageJobForStorage 
} from '@/services/packageExportService';
import { downloadBlob } from '@/services/exportService';
import { readNativeJson, writeNativeJson } from '@/services/storageService';

const PACKAGE_JOBS_STORAGE_KEY = 'asteria_package_jobs';

export function usePackageExport(
    items: GalleryItem[], 
    queueExportJob: (item: GalleryItem, recipe: ExportRecipe, activeVariant?: AssetVariant) => void
) {
    const [packageJobs, setPackageJobs] = useState<ExportPackageJob[]>([]);
    const [activePackageJob, setActivePackageJob] = useState<ExportPackageJob | null>(null);

    useEffect(() => {
        void readNativeJson<ExportPackageJob[]>(PACKAGE_JOBS_STORAGE_KEY, []).then(setPackageJobs);
    }, []);

    const saveJobs = useCallback((jobs: ExportPackageJob[]) => {
        setPackageJobs(jobs);
        const toSave = jobs.slice(0, 30).map(sanitizePackageJobForStorage);
        void writeNativeJson(PACKAGE_JOBS_STORAGE_KEY, toSave);
    }, []);

    const runPackageExport = useCallback(async (
        label: string, 
        itemIds: string[], 
        recipe: ExportRecipe, 
        variants: AssetVariant[]
    ) => {
        const job = createExportPackageJob(label, itemIds);
        job.status = 'preparing';
        setActivePackageJob(job);
        
        let outputDir: string | null = null;
        let isNative = false;
        
        try {
            const { selectExportDirectory } = await import('@/services/nativeActionsService');
            outputDir = await selectExportDirectory();
            if (outputDir) {
                isNative = true;
            }
        } catch (e) {
            console.warn("Native directory selection not available:", e);
        }

        job.status = 'exporting';
        job.nativeExport = isNative;
        if (outputDir) job.outputDirectory = outputDir;
        
        const pkgItems: ExportPackageItem[] = [];
        
        if (!isNative) {
            setActivePackageJob({...job}); // trigger re-render
            for (const itemId of itemIds) {
                const assetInfo = items.find(i => i.id === itemId);
                if (!assetInfo) continue;

                if (assetInfo.kind === 'folder') {
                    const pkgItem = createPackageItem(
                        `pkgitem_${Date.now()}_${Math.random().toString(36).substring(2)}`,
                        itemId,
                        assetInfo.name,
                        recipe.format,
                        recipe.sourceMode,
                        {
                            status: 'completed',
                            smartFolderKind: assetInfo.smartFolderKind,
                            materialName: assetInfo.material?.materialName || assetInfo.material?.folderName,
                            materialStatus: assetInfo.material?.status,
                            maps: assetInfo.material?.maps.map((map) => ({ type: map.mapType, fileName: map.fileName })),
                            missingMaps: assetInfo.material?.missingMaps,
                            category: assetInfo.material?.category,
                            favorite: assetInfo.material?.isFavorite,
                            materialDiagnostics: assetInfo.material?.diagnostics ? {
                                completenessScore: assetInfo.material.diagnostics.completeness.score,
                                targetEngine: assetInfo.material.diagnostics.completeness.targetEngine,
                                missingRequiredMaps: assetInfo.material.diagnostics.completeness.missingRequiredMaps,
                                missingOptionalMaps: assetInfo.material.diagnostics.completeness.missingOptionalMaps,
                                hasWarnings: Boolean(assetInfo.material.hasWarnings),
                                hasErrors: Boolean(assetInfo.material.hasErrors),
                                hasResolutionMismatch: assetInfo.material.diagnostics.resolution.hasResolutionMismatch,
                                diagnostics: assetInfo.material.diagnostics.items.map((item) => ({
                                    code: item.code,
                                    severity: item.severity,
                                    message: item.message,
                                })),
                            } : undefined,
                        }
                    );
                    pkgItems.push(pkgItem);
                    continue;
                }

                const activeVariant = variants.find(v => v.assetId === itemId && v.status === 'ready'); // simplified selection
                const variantId = activeVariant?.id;
                const variantLabel = activeVariant?.label || activeVariant?.presetLabel;
                const cutoutKind = activeVariant?.kind === 'cutout' || activeVariant?.kind === 'refined_cutout'
                    ? activeVariant.kind
                    : undefined;
                const imageMaterial = assetInfo.kind === 'image' ? assetInfo.metadata?.material : undefined;

                const pkgItem = createPackageItem(
                    `pkgitem_${Date.now()}_${Math.random().toString(36).substring(2)}`,
                    itemId,
                    assetInfo.name,
                    recipe.format,
                    recipe.sourceMode,
                    {
                        variantId,
                        variantLabel,
                        status: 'completed',
                        hasAlpha: activeVariant?.hasAlpha || cutoutKind !== undefined,
                        cutoutKind,
                        variantKind: activeVariant?.kind,
                        upscaleScale: activeVariant?.upscaleScale,
                        upscaleEngine: activeVariant?.upscaleEngine,
                        upscaleQualityPreset: activeVariant?.upscaleQualityPreset,
                        tileSize: activeVariant?.tileSize,
                        tilePad: activeVariant?.tilePad,
                        requestedEngine: activeVariant?.requestedEngine,
                        actualEngine: activeVariant?.actualEngine,
                        fallbackFrom: activeVariant?.fallbackFrom,
                        realEsrganStatus: activeVariant?.realEsrganStatus,
                        modelId: activeVariant?.modelId,
                        modelStatus: activeVariant?.modelStatus,
                        memoryMode: activeVariant?.memoryMode,
                        estimatedCost: activeVariant?.estimatedCost,
                        outputWidth: activeVariant?.outputWidth || activeVariant?.width,
                        outputHeight: activeVariant?.outputHeight || activeVariant?.height,
                        smartFolderKind: assetInfo.metadata?.smartFolder?.kind,
                        materialName: imageMaterial?.materialName,
                        materialStatus: imageMaterial?.status,
                        maps: imageMaterial?.maps.map((map) => ({ type: map.mapType, fileName: map.fileName })),
                        missingMaps: imageMaterial?.missingMaps,
                        category: imageMaterial?.category,
                        favorite: imageMaterial?.isFavorite,
                        materialDiagnostics: imageMaterial?.diagnostics ? {
                            completenessScore: imageMaterial.diagnostics.completeness.score,
                            targetEngine: imageMaterial.diagnostics.completeness.targetEngine,
                            missingRequiredMaps: imageMaterial.diagnostics.completeness.missingRequiredMaps,
                            missingOptionalMaps: imageMaterial.diagnostics.completeness.missingOptionalMaps,
                            hasWarnings: Boolean(imageMaterial.hasWarnings),
                            hasErrors: Boolean(imageMaterial.hasErrors),
                            hasResolutionMismatch: imageMaterial.diagnostics.resolution.hasResolutionMismatch,
                            diagnostics: imageMaterial.diagnostics.items.map((item) => ({
                                code: item.code,
                                severity: item.severity,
                                message: item.message,
                            })),
                        } : undefined,
                    } // Simulate completed for manifest since queue handles true dl
                );

                pkgItems.push(pkgItem);
                
                // Queue actual browser download
                queueExportJob(assetInfo, recipe, activeVariant);
            }

            const manifest = createPackageManifest(job, pkgItems);
            job.manifest = manifest;
            job.status = 'completed'; // Once all are queued and manifest ready
            
            // Download Manifest via Browser
            const manifestBlob = createManifestBlob(manifest);
            downloadBlob(manifestBlob, `manifest_${job.id}.json`);
        } else {
            // NATIVE EXPORT FLOW
            const { writeNativeFile } = await import('@/services/nativeActionsService');
            const { joinPath, ensureSafeFilename } = await import('@/services/tauriBridge');
            const { createPngExportResult, createSvgExportResult } = await import('@/services/exportService');
            
            setActivePackageJob({...job}); // force UI update

            let savedCount = 0;
            let failedCount = 0;

            for (const itemId of itemIds) {
                const assetInfo = items.find(i => i.id === itemId);
                if (!assetInfo || assetInfo.kind !== 'image') continue;

                const activeVariant = variants.find(v => v.assetId === itemId && v.status === 'ready');
                let exportItem = { ...assetInfo } as any;

                if (recipe.sourceMode === 'active_variant' && activeVariant) {
                    if (activeVariant.metadataOnly) {
                        failedCount++;
                        continue;
                    }
                    if (activeVariant.objectUrl) {
                        exportItem = {
                            ...exportItem,
                            objectUrl: activeVariant.objectUrl,
                            file: activeVariant.file,
                            name: activeVariant.filename || assetInfo.name,
                        };
                    }
                }

                const variantId = activeVariant?.id;
                const variantLabel = activeVariant?.label || activeVariant?.presetLabel;
                const cutoutKind = activeVariant?.kind === 'cutout' || activeVariant?.kind === 'refined_cutout'
                    ? activeVariant.kind
                    : undefined;

                const pkgItem = createPackageItem(
                    `pkgitem_${Date.now()}_${Math.random().toString(36).substring(2)}`,
                    itemId,
                    assetInfo.name,
                    recipe.format,
                    recipe.sourceMode,
                    {
                        variantId,
                        variantLabel,
                        status: 'exporting',
                        hasAlpha: activeVariant?.hasAlpha || cutoutKind !== undefined,
                        cutoutKind,
                        variantKind: activeVariant?.kind,
                        upscaleScale: activeVariant?.upscaleScale,
                        upscaleEngine: activeVariant?.upscaleEngine,
                        upscaleQualityPreset: activeVariant?.upscaleQualityPreset,
                        tileSize: activeVariant?.tileSize,
                        tilePad: activeVariant?.tilePad,
                        requestedEngine: activeVariant?.requestedEngine,
                        actualEngine: activeVariant?.actualEngine,
                        fallbackFrom: activeVariant?.fallbackFrom,
                        realEsrganStatus: activeVariant?.realEsrganStatus,
                        modelId: activeVariant?.modelId,
                        modelStatus: activeVariant?.modelStatus,
                        memoryMode: activeVariant?.memoryMode,
                        estimatedCost: activeVariant?.estimatedCost,
                        outputWidth: activeVariant?.outputWidth || activeVariant?.width,
                        outputHeight: activeVariant?.outputHeight || activeVariant?.height
                    }
                );
                
                try {
                    let result;
                    if (recipe.format === 'png') {
                        result = await createPngExportResult(exportItem);
                    } else if (recipe.format === 'svg') {
                        result = await createSvgExportResult(exportItem);
                    } else {
                        throw new Error(`Unsupported format: ${recipe.format}`);
                    }
                    
                    if (result && result.blob) {
                        // Let's create a safe filename maybe using variantLabel
                        pkgItem.outputFilename = ensureSafeFilename(pkgItem.outputFilename);
                        const fullPath = await joinPath(outputDir!, pkgItem.outputFilename);
                        const writeSuccess = await writeNativeFile(fullPath, result.blob);
                        
                        if (writeSuccess) {
                            pkgItem.status = 'completed';
                            pkgItem.outputPath = fullPath;
                            pkgItem.nativeSaved = true;
                            savedCount++;
                        } else {
                            pkgItem.status = 'failed';
                            pkgItem.error = 'Native write returned false';
                            failedCount++;
                        }
                    } else {
                        pkgItem.status = 'failed';
                        pkgItem.error = 'No blob returned';
                        failedCount++;
                    }
                } catch (e: any) {
                    pkgItem.status = 'failed';
                    pkgItem.error = e.message || 'Error occurred';
                    failedCount++;
                }

                pkgItems.push(pkgItem);
            }

            job.savedFileCount = savedCount;
            job.skippedFileCount = failedCount;

            const manifest = createPackageManifest(job, pkgItems);
            job.manifest = manifest;
            
            // Save manifest JSON natively
            const manifestFilename = `manifest_${job.id}.json`;
            const manifestString = JSON.stringify(manifest, null, 2);
            package_manifest_write: {
                try {
                    const fullManifestPath = await joinPath(outputDir!, manifestFilename);
                    await writeNativeFile(fullManifestPath, manifestString);
                } catch (err) {
                    console.error("Failed to write manifest", err);
                }
            }

            job.status = failedCount > 0 ? 'partial' : 'completed';
        }

        setPackageJobs(prev => {
            const next = [job, ...prev];
            setTimeout(() => saveJobs(next), 0);
            return next;
        });

        setActivePackageJob(null);
    }, [items, queueExportJob, saveJobs]);

    const downloadPackageManifest = useCallback((job: ExportPackageJob) => {
        if (!job.manifest) return;
        const blob = createManifestBlob(job.manifest);
        downloadBlob(blob, `manifest_${job.id}.json`);
    }, []);

    const clearCompletedPackages = useCallback(() => {
        setPackageJobs(prev => {
            const next = prev.filter(j => j.status === 'exporting' || j.status === 'preparing');
            saveJobs(next);
            return next;
        });
    }, [saveJobs]);

    return {
        packageJobs,
        activePackageJob,
        runPackageExport,
        downloadPackageManifest,
        clearCompletedPackages
    };
}

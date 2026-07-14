import { useCallback, useState } from 'react';
import { GalleryItem, AssetVariant, AiProcessingMode, ExportRecipe, BatchUpscaleOptions } from '@/types/asteria';
import { createPngExportVariant, createSvgContainerVariant } from '@/services/variantService';
import { exportRecipes } from '@/data/exportRecipes';

export interface UseAssetActionsProps {
    selectedItem: GalleryItem | null;
    activeVariant?: AssetVariant | null;
    onOpenEditor?: () => void;
    onOpenFolder?: (folder: GalleryItem) => void;
    onRescanFolder?: () => void;
    registerVariant?: (variant: AssetVariant) => void;
    runPlaceholderJob?: (asset: GalleryItem, mode: AiProcessingMode, prompt?: string, options?: { upscale?: BatchUpscaleOptions }) => void;
    queueExportJob?: (item: GalleryItem, recipe: ExportRecipe, activeVariant?: AssetVariant) => Promise<any>;
}

export function useAssetActions({ 
    selectedItem, 
    activeVariant,
    onOpenEditor, 
    onOpenFolder, 
    onRescanFolder,
    registerVariant,
    runPlaceholderJob,
    queueExportJob
}: UseAssetActionsProps) {
    const [actionFeedback, setActionFeedback] = useState<string | null>(null);

    const showFeedback = useCallback((msg: string) => {
        setActionFeedback(msg);
        // Clear any existing timeout mechanism naturally or just set it
        setTimeout(() => setActionFeedback(null), 3000);
    }, []);

    const clearActionFeedback = useCallback(() => {
        setActionFeedback(null);
    }, []);

    const editSelectedAsset = useCallback(() => {
        if (!selectedItem || selectedItem.kind !== 'image' || !onOpenEditor) return;
        onOpenEditor();
    }, [selectedItem, onOpenEditor]);

    const openSelectedFolder = useCallback(() => {
        if (!selectedItem || selectedItem.kind !== 'folder' || !onOpenFolder) return;
        onOpenFolder(selectedItem);
    }, [selectedItem, onOpenFolder]);

    const rescanSelectedFolder = useCallback(() => {
        if (!selectedItem || selectedItem.kind !== 'folder' || !onRescanFolder) return;
        
        if (selectedItem.handle) {
            onRescanFolder();
        } else {
            showFeedback("Local folder access is required to rescan.");
        }
    }, [selectedItem, onRescanFolder, showFeedback]);

    const locateSelectedAsset = useCallback(async () => {
        if (!selectedItem) return;
        
        try {
            const { locateAsset } = await import('@/services/nativeActionsService');
            const result = await locateAsset(selectedItem);
            if (!result.ok) {
                showFeedback(result.message);
            } else {
                showFeedback(result.message || "Opened in file browser.");
            }
        } catch (err: any) {
            showFeedback("Locate is available in desktop mode.");
        }
    }, [selectedItem, showFeedback]);

    const enhanceSelectedAsset = useCallback(() => {
        if (!selectedItem) return;
        if (selectedItem.kind !== 'image') {
           return showFeedback("Select an image to enhance.");
        }
        if (runPlaceholderJob) {
            runPlaceholderJob(selectedItem, 'enhance');
        } else {
            showFeedback("Ready for local AI pipeline (enhance).");
        }
    }, [selectedItem, showFeedback, runPlaceholderJob]);

    const removeBgSelectedAsset = useCallback(() => {
        if (!selectedItem || selectedItem.kind !== 'image') return showFeedback("Select an image to process.");
        if (runPlaceholderJob) runPlaceholderJob(selectedItem, 'remove_bg');
    }, [selectedItem, showFeedback, runPlaceholderJob]);

    const upscaleSelectedAsset = useCallback((options?: { upscale?: BatchUpscaleOptions }) => {
        if (!selectedItem || selectedItem.kind !== 'image') return showFeedback("Select an image to process.");
        if (runPlaceholderJob) runPlaceholderJob(selectedItem, 'upscale', undefined, options);
    }, [selectedItem, showFeedback, runPlaceholderJob]);

    const portraitSelectedAsset = useCallback(() => {
        if (!selectedItem || selectedItem.kind !== 'image') return showFeedback("Select an image to process.");
        if (runPlaceholderJob) runPlaceholderJob(selectedItem, 'portrait');
    }, [selectedItem, showFeedback, runPlaceholderJob]);

    const ue5SelectedAsset = useCallback(() => {
        if (!selectedItem || selectedItem.kind !== 'image') return showFeedback("Select an image to process.");
        if (runPlaceholderJob) runPlaceholderJob(selectedItem, 'ue5');
    }, [selectedItem, showFeedback, runPlaceholderJob]);

    const saveSelectedAsPng = useCallback(async () => {
        if (!selectedItem) return;
        if (selectedItem.kind !== 'image') {
             return showFeedback("Select an image to export.");
        }
        
        try {
            let isExportingVariant = false;
            let recipe = exportRecipes.png_original;
            
            if (activeVariant && activeVariant.kind !== 'original' && activeVariant.status === 'ready') {
                if (activeVariant.objectUrl) {
                     recipe = exportRecipes.png_active_variant;
                     isExportingVariant = true;
                } else {
                     showFeedback("Variant output is metadata only. Exporting original instead.");
                }
            }
            
            if (queueExportJob) {
                await queueExportJob(selectedItem, recipe, isExportingVariant ? activeVariant as AssetVariant : undefined);
                showFeedback("PNG export queued.");
            } else {
                showFeedback("Export queue unavailable.");
            }
        } catch(e) {
            console.error(e);
            showFeedback("Couldn't queue PNG export.");
        }
    }, [selectedItem, activeVariant, showFeedback, queueExportJob]);

    const exportSelectedAsSvg = useCallback(async () => {
        if (!selectedItem) return;
        if (selectedItem.kind !== 'image') {
            return showFeedback("Select an image to export.");
        }
        
        try {
            let isExportingVariant = false;
            let recipe = exportRecipes.svg_original_container;
            
            if (activeVariant && activeVariant.kind !== 'original' && activeVariant.status === 'ready') {
                if (activeVariant.objectUrl) {
                     recipe = exportRecipes.svg_container;
                     isExportingVariant = true;
                } else {
                     showFeedback("Variant output is metadata only. Exporting original SVG container instead.");
                }
            }

            if (queueExportJob) {
                await queueExportJob(selectedItem, recipe, isExportingVariant ? activeVariant as AssetVariant : undefined);
                showFeedback("SVG container export queued.");
            } else {
                showFeedback("Export queue unavailable.");
            }
        } catch(e) {
            console.error(e);
            showFeedback("Couldn't queue SVG export.");
        }
    }, [selectedItem, activeVariant, showFeedback, queueExportJob]);

    return {
        actionFeedback,
        showFeedback,
        clearActionFeedback,
        editSelectedAsset,
        openSelectedFolder,
        rescanSelectedFolder,
        locateSelectedAsset,
        enhanceSelectedAsset,
        removeBgSelectedAsset,
        upscaleSelectedAsset,
        portraitSelectedAsset,
        ue5SelectedAsset,
        saveSelectedAsPng,
        exportSelectedAsSvg,
    };
}

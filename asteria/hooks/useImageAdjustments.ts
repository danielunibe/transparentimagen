import { useState, useCallback, useEffect, useRef } from 'react';
import { ImageAdjustmentSettings, AssetVariant, GalleryItem, ImageAdjustmentPreset, AdjustmentHistoryEntry } from '@/types/asteria';
import { applyAdjustmentSettings } from '@/services/browserImageProcessingService';

export const defaultAdjustmentSettings: ImageAdjustmentSettings = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    warmth: 0,
    sharpness: 0
};

export function useImageAdjustments(
    sourceUrl: string | null | undefined,
    registerVariant?: (variant: AssetVariant) => void
) {
    const [settings, setSettings] = useState<ImageAdjustmentSettings>(defaultAdjustmentSettings);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isRendering, setIsRendering] = useState(false);
    
    // Preset states
    const [activePreset, setActivePreset] = useState<ImageAdjustmentPreset | null>(null);

    // History state
    const [history, setHistory] = useState<AdjustmentHistoryEntry[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const historyDebounce = useRef<NodeJS.Timeout | null>(null);
    
    // Ref to manage debounce
    const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
    const cleanupPreview = useCallback(() => {
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
    }, [previewUrl]);

    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // History actions
    const pushHistory = useCallback((currentSettings: ImageAdjustmentSettings, applyLabel = 'Manual Adjustment') => {
        setHistory(prev => {
            const nextHistory = prev.slice(0, historyIndex + 1);
            const entry: AdjustmentHistoryEntry = {
                id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                label: applyLabel,
                settings: { ...currentSettings },
                createdAt: new Date().toISOString()
            };
            const updated = [...nextHistory, entry];
            // Keep at most 30 entries
            if (updated.length > 30) {
                updated.shift();
            }
            return updated;
        });
        setHistoryIndex(prev => Math.min(prev + 1, 29)); // Handle length limit constraint
    }, [historyIndex]);

    const renderPreview = useCallback(async (currentSettings: ImageAdjustmentSettings) => {
        if (!sourceUrl) return;
        const { brightness, contrast, saturation, warmth, sharpness } = currentSettings;
        if (brightness === 0 && contrast === 0 && saturation === 0 && warmth === 0 && sharpness === 0) {
            cleanupPreview();
            setIsRendering(false);
            return;
        }

        setIsRendering(true);
        try {
            const result = await applyAdjustmentSettings(sourceUrl, currentSettings);
            cleanupPreview();
            setPreviewUrl(result.objectUrl);
        } catch (error) {
            console.error("Failed to render adjustment preview:", error);
        } finally {
            setIsRendering(false);
        }
    }, [sourceUrl, cleanupPreview]);

    const setSetting = useCallback((key: keyof ImageAdjustmentSettings, value: number) => {
        setSettings(prev => {
            const next = { ...prev, [key]: value };
            
            if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
            debounceTimeout.current = setTimeout(() => renderPreview(next), 300);
            
            if (historyDebounce.current) clearTimeout(historyDebounce.current);
            historyDebounce.current = setTimeout(() => pushHistory(next), 600);
            
            setActivePreset(null);
            return next;
        });
    }, [renderPreview, pushHistory]);

    const applyPreset = useCallback((preset: ImageAdjustmentPreset) => {
        setSettings(preset.settings);
        setActivePreset(preset);
        renderPreview(preset.settings);
        pushHistory(preset.settings, preset.label);
    }, [renderPreview, pushHistory]);

    const resetSettings = useCallback(() => {
        setSettings(defaultAdjustmentSettings);
        setActivePreset(null);
        cleanupPreview();
        setIsRendering(false);
        pushHistory(defaultAdjustmentSettings, 'Reset');
    }, [cleanupPreview, pushHistory]);

    const undo = useCallback(() => {
        if (historyIndex > 0) {
            const targetIndex = historyIndex - 1;
            const entry = history[targetIndex];
            setSettings(entry.settings);
            setHistoryIndex(targetIndex);
            setActivePreset(null);
            renderPreview(entry.settings);
        }
    }, [history, historyIndex, renderPreview]);

    const redo = useCallback(() => {
        if (historyIndex < history.length - 1) {
            const targetIndex = historyIndex + 1;
            const entry = history[targetIndex];
            setSettings(entry.settings);
            setHistoryIndex(targetIndex);
            setActivePreset(null);
            renderPreview(entry.settings);
        }
    }, [history, historyIndex, renderPreview]);

    const applyAsVariant = useCallback(async (
        asset: GalleryItem, 
        baseVariant?: AssetVariant | null
    ) => {
        if (!previewUrl || !registerVariant) return false;
        
        try {
            setIsRendering(true);
            const source = baseVariant && baseVariant.objectUrl ? baseVariant.objectUrl : ('objectUrl' in asset ? asset.objectUrl : null);
            if (!source) throw new Error("No source URL");
            
            const result = await applyAdjustmentSettings(source, settings);
            
            const variantId = `var_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            
            registerVariant({
                id: variantId,
                assetId: asset.id,
                kind: 'adjustment',
                label: activePreset ? `Adjusted · ${activePreset.label}` : 'Adjusted Variant',
                status: 'ready',
                createdAt: new Date().toISOString(),
                objectUrl: result.objectUrl,
                mimeType: result.mimeType,
                filename: asset.name.replace(/\.[^/.]+$/, "") + result.filenameSuffix + ".png",
                width: result.width,
                height: result.height,
                file: new File([result.blob], asset.name.replace(/\.[^/.]+$/, "") + result.filenameSuffix + ".png", { type: result.mimeType }),
                sessionOnly: true,
                adjustmentSettings: { ...settings },
                presetId: activePreset?.id,
                presetLabel: activePreset?.label,
                note: 'Non-destructive adjustment'
            });
            
            // Clean up UI state
            setSettings(defaultAdjustmentSettings);
            setActivePreset(null);
            cleanupPreview();
            setIsRendering(false);
            setHistory([]);
            setHistoryIndex(-1);
            
            return true;
        } catch (err) {
            console.error("Failed to apply as variant", err);
            return false;
        } finally {
            setIsRendering(false);
        }
    }, [previewUrl, registerVariant, settings, activePreset, cleanupPreview]);

    const canUndo = historyIndex > 0;
    const canRedo = historyIndex < history.length - 1;
    const hasAdjustments = settings.brightness !== 0 || settings.contrast !== 0 || settings.saturation !== 0 || settings.warmth !== 0 || settings.sharpness !== 0;

    return {
        settings,
        setSetting,
        resetSettings,
        hasAdjustments,
        previewUrl,
        isRendering,
        applyAsVariant,
        history,
        canUndo,
        canRedo,
        undo,
        redo,
        activePreset,
        applyPreset
    };
}

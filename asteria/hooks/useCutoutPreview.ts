import { useState, useEffect, useCallback } from 'react';
import { CutoutRefinementSettings, AssetVariant, GalleryImageItem } from '@/types/asteria';
import {
    createCutoutRefinementVariant,
    getDefaultCutoutSettings
} from '@/services/cutoutProcessingService';

export function useCutoutPreview(sourceUrl: string | undefined | null, registerVariant?: (variant: AssetVariant) => void) {
    const [settings, setSettings] = useState<CutoutRefinementSettings>(getDefaultCutoutSettings);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isRendering, setIsRendering] = useState(false);

    const cleanupPreview = useCallback(() => {
        setPreviewUrl(prev => {
            if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
            return null;
        });
    }, []);

    const setSetting = useCallback(<K extends keyof CutoutRefinementSettings>(key: K, value: CutoutRefinementSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    const hasOutputAdjustments = settings.trimTransparentPixels || settings.padding > 0;
    const hasAdjustments = hasOutputAdjustments || settings.shadowPreview;

    useEffect(() => {
        let cancelled = false;

        async function renderPreview() {
            if (!sourceUrl || !hasOutputAdjustments) {
                cleanupPreview();
                return;
            }

            setIsRendering(true);
            try {
                const result = await createCutoutRefinementVariant(sourceUrl, settings);
                if (cancelled) {
                    URL.revokeObjectURL(result.objectUrl);
                    return;
                }
                setPreviewUrl(prev => {
                    if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
                    return result.objectUrl;
                });
            } catch (error) {
                console.error('Failed to render cutout preview', error);
                if (!cancelled) cleanupPreview();
            } finally {
                if (!cancelled) setIsRendering(false);
            }
        }

        const timer = window.setTimeout(renderPreview, 250);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [sourceUrl, settings, hasOutputAdjustments, cleanupPreview]);

    useEffect(() => cleanupPreview, [cleanupPreview]);

    const applyAsVariant = useCallback(async (
        asset: GalleryImageItem,
        baseVariant?: AssetVariant | null
    ): Promise<boolean> => {
        if (!sourceUrl || !registerVariant || !hasAdjustments) return false;

        try {
            setIsRendering(true);
            const result = hasOutputAdjustments
                ? await createCutoutRefinementVariant(sourceUrl, settings)
                : await createCutoutRefinementVariant(sourceUrl, { ...settings, trimTransparentPixels: false, padding: 0 });
            const variantId = `refined_cutout_${Date.now()}`;

            registerVariant({
                id: variantId,
                assetId: asset.id,
                kind: 'refined_cutout',
                label: 'Refined Cutout',
                status: 'ready',
                sessionOnly: true,
                metadataOnly: false,
                objectUrl: result.objectUrl,
                file: new File([result.blob], `refined_${asset.name}.png`, { type: 'image/png' }),
                createdAt: new Date().toISOString(),
                hasAlpha: true,
                cutoutSettings: { ...settings },
                refinedFromVariantId: baseVariant?.id,
                sourceJobId: baseVariant?.sourceJobId,
                mimeType: 'image/png',
                width: result.width,
                height: result.height,
                filename: `refined_${asset.name}.png`,
                note: 'Cutout refined locally.'
            });

            setSettings(getDefaultCutoutSettings());
            cleanupPreview();
            return true;
        } catch (error) {
            console.error('Failed to create refined cutout variant', error);
            return false;
        } finally {
            setIsRendering(false);
        }
    }, [sourceUrl, registerVariant, hasAdjustments, hasOutputAdjustments, settings, cleanupPreview]);

    return {
        settings,
        setSetting,
        hasAdjustments,
        previewUrl,
        isRendering,
        applyAsVariant
    };
}

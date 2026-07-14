import { useState, useEffect, useCallback } from 'react';
import { AssetVariant, GalleryImageItem } from '@/types/asteria';
import { loadVariants, saveVariants, createOriginalVariant } from '@/services/variantService';

export function useAssetVariants(selectedItem: GalleryImageItem | null) {
    const [variants, setVariants] = useState<AssetVariant[]>([]);
    const [activeVariantId, setActiveVariantId] = useState<string | null>(null);

    // Load initial variants when asset changes
    useEffect(() => {
        let isMounted = true;
        
        return () => {
             // Cleanup any object URLs generated during this session for this asset
             // when unmounting or switching to a new asset
             variants.forEach(v => {
                 if (v.kind !== 'original' && v.objectUrl && v.objectUrl.startsWith('blob:')) {
                     URL.revokeObjectURL(v.objectUrl);
                 }
             });
        }
    }, [variants]);

    useEffect(() => {
        let isMounted = true;
        
        if (!selectedItem) {
            setVariants([]);
            setActiveVariantId(null);
            return;
        }

        const originalVariant = createOriginalVariant(selectedItem);
        const storedVariants = loadVariants(selectedItem.id);
        
        // Find if there's already an 'original' variant in stored (replace it to have fresh objectUrl)
        const otherVariants = storedVariants.filter(v => v.kind !== 'original');
        
        const allVariants = [originalVariant, ...otherVariants];
        
        if (isMounted) {
            setVariants(allVariants);
            setActiveVariantId(originalVariant.id);
        }
        
        return () => { isMounted = false; };
    }, [selectedItem]);

    const registerVariant = useCallback((newVariant: AssetVariant) => {
        setVariants(prev => {
            const updated = [...prev, newVariant];
            if (newVariant.assetId) {
                saveVariants(newVariant.assetId, updated);
            }
            return updated;
        });
        setActiveVariantId(newVariant.id);
    }, []);

    const clearVariants = useCallback(() => {
        if (selectedItem) {
            const original = createOriginalVariant(selectedItem);
            setVariants([original]);
            setActiveVariantId(original.id);
            saveVariants(selectedItem.id, [original]);
        }
    }, [selectedItem]);

    return {
        variants,
        activeVariant: variants.find(v => v.id === activeVariantId) || null,
        setActiveVariantId,
        registerVariant,
        clearVariants
    };
}

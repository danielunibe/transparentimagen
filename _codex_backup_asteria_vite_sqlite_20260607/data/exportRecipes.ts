import { ExportRecipe } from '@/types/asteria';

export const exportRecipes: Record<string, ExportRecipe> = {
    png_original: {
        id: 'png_original',
        label: 'PNG Original',
        format: 'png',
        sourceMode: 'original',
        description: 'Export original asset as PNG'
    },
    png_active_variant: {
        id: 'png_active_variant',
        label: 'PNG Active Variant',
        format: 'png',
        sourceMode: 'active_variant',
        description: 'Export active variant as PNG'
    },
    svg_container: {
        id: 'svg_container',
        label: 'SVG Container',
        format: 'svg',
        sourceMode: 'active_variant',
        description: 'Export active variant embedded in SVG'
    },
    svg_original_container: {
        id: 'svg_original_container',
        label: 'SVG Original Container',
        format: 'svg',
        sourceMode: 'original',
        description: 'Export original asset embedded in SVG'
    }
};

import { ImageAdjustmentPreset } from '@/types/asteria';

export const builtInPresets: ImageAdjustmentPreset[] = [
    {
        id: 'preset_clean_boost',
        label: 'Clean Boost',
        description: 'Subtle pop in contrast and brightness',
        builtIn: true,
        settings: {
            brightness: 6,
            contrast: 10,
            saturation: 8,
            warmth: 0,
            sharpness: 8
        }
    },
    {
        id: 'preset_soft_portrait',
        label: 'Soft Portrait',
        description: 'Smooth and warm skin tones',
        builtIn: true,
        settings: {
            brightness: 5,
            contrast: 4,
            saturation: 5,
            warmth: 6,
            sharpness: 2
        }
    },
    {
        id: 'preset_product_sharp',
        label: 'Product Sharp',
        description: 'High clarity and contrast for products',
        builtIn: true,
        settings: {
            brightness: 4,
            contrast: 14,
            saturation: 4,
            warmth: 0,
            sharpness: 18
        }
    },
    {
        id: 'preset_warm_editorial',
        label: 'Warm Editorial',
        description: 'Cinematic warm feeling',
        builtIn: true,
        settings: {
            brightness: 3,
            contrast: 8,
            saturation: 6,
            warmth: 14,
            sharpness: 6
        }
    },
    {
        id: 'preset_cool_studio',
        label: 'Cool Studio',
        description: 'Clean, cool, modern look',
        builtIn: true,
        settings: {
            brightness: 2,
            contrast: 9,
            saturation: 3,
            warmth: -14,
            sharpness: 7
        }
    },
    {
        id: 'preset_high_contrast',
        label: 'High Contrast',
        description: 'Punchy blacks and whites',
        builtIn: true,
        settings: {
            brightness: 0,
            contrast: 22,
            saturation: 5,
            warmth: 0,
            sharpness: 10
        }
    }
];

import { Wand2, Scissors, UserSquare, Layers, Maximize2 } from 'lucide-react';
import { ToolMode } from '@/types/asteria';

export const MODES: Record<string, ToolMode> = {
    'enhance': {
        id: 'enhance',
        icon: Wand2,
        label: 'Enhance',
        description: 'Improve detail and sharpness',
        placeholder: 'Describe what to enhance...',
        chips: ['High Fidelity', 'Real-ESRGAN', '4X'],
        action: 'Process'
    },
    'remove_bg': {
        id: 'remove_bg',
        icon: Scissors,
        label: 'Remove Background',
        description: 'Transparent PNG cutout',
        placeholder: 'Describe edge cleanup or leave empty...',
        chips: ['Transparent PNG', 'Refine Edge', 'Despill'],
        action: 'Remove BG'
    },
    'upscale': {
        id: 'upscale',
        icon: Maximize2,
        label: 'Upscale 2x',
        description: 'Local Pillow/LANCZOS enlargement',
        placeholder: 'Upscale uses the local sidecar without prompts...',
        chips: ['2x', 'Pillow', 'Local PNG'],
        action: 'Upscale'
    },
    'portrait': {
        id: 'portrait',
        icon: UserSquare,
        label: 'Portrait',
        description: 'Recover face detail',
        placeholder: 'Describe face recovery intensity...',
        chips: ['Face Detail', 'Natural Skin', 'Preserve Identity'],
        action: 'Recover'
    },
    'ue5': {
        id: 'ue5',
        icon: Layers,
        label: 'UE5 Assets',
        description: 'Depth, normal and texture set',
        placeholder: 'Name this texture asset...',
        chips: ['Albedo', 'Depth', 'Normal'],
        action: 'Export UE5 Set'
    }
};

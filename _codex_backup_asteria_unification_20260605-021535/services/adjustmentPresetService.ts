import { safeSetJson, safeGetJson } from './storageService';
import { ImageAdjustmentPreset } from '@/types/asteria';
import { builtInPresets } from '@/data/adjustmentPresets';

const PRESETS_STORAGE_KEY = 'asteria_custom_presets';

export function getCustomPresets(): ImageAdjustmentPreset[] {
    return safeGetJson<ImageAdjustmentPreset[]>(PRESETS_STORAGE_KEY, []);
}

export function saveCustomPreset(preset: ImageAdjustmentPreset): void {
    const existing = getCustomPresets();
    safeSetJson(PRESETS_STORAGE_KEY, [...existing, preset]);
}

export function deleteCustomPreset(id: string): void {
    const existing = getCustomPresets();
    safeSetJson(PRESETS_STORAGE_KEY, existing.filter(p => p.id !== id));
}

export function getAllPresets(): ImageAdjustmentPreset[] {
    return [...builtInPresets, ...getCustomPresets()];
}

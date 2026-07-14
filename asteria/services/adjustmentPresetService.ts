import { readNativeJson, writeNativeJson } from './storageService';
import { ImageAdjustmentPreset } from '@/types/asteria';
import { builtInPresets } from '@/data/adjustmentPresets';

const PRESETS_STORAGE_KEY = 'asteria_custom_presets';

export async function getCustomPresets(): Promise<ImageAdjustmentPreset[]> {
    return readNativeJson<ImageAdjustmentPreset[]>(PRESETS_STORAGE_KEY, []);
}

export async function saveCustomPreset(preset: ImageAdjustmentPreset): Promise<void> {
    const existing = await getCustomPresets();
    await writeNativeJson(PRESETS_STORAGE_KEY, [...existing, preset]);
}

export async function deleteCustomPreset(id: string): Promise<void> {
    const existing = await getCustomPresets();
    await writeNativeJson(PRESETS_STORAGE_KEY, existing.filter(p => p.id !== id));
}

export async function getAllPresets(): Promise<ImageAdjustmentPreset[]> {
    return [...builtInPresets, ...(await getCustomPresets())];
}

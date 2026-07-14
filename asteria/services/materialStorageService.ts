import { MaterialCategory, MaterialFolderMetadata, MaterialTargetEngine, PbrMapType } from '@/types/asteria';
import { assetRepository } from './repositories/assetRepository';

const MATERIAL_METADATA_KEY = 'asteria_material_metadata_v1';
const DISMISSED_MATERIALS_KEY = 'asteria_dismissed_materials_v1';

export interface MaterialMetadataPatch {
  materialName?: string;
  category?: MaterialCategory;
  notes?: string;
  isFavorite?: boolean;
  targetEngine?: MaterialTargetEngine;
  preferredPreviewShape?: 'sphere' | 'cube' | 'plane';
  mapOverrides?: Record<string, PbrMapType>;
  dismissedDiagnostics?: string[];
}

let materialMetadataCache: Record<string, MaterialMetadataPatch> = {};
let dismissedMaterialsCache: string[] = [];

export async function initializeMaterialStorage(): Promise<void> {
  [materialMetadataCache, dismissedMaterialsCache] = await Promise.all([
    assetRepository.getMetadata(MATERIAL_METADATA_KEY, {}),
    assetRepository.getMetadata(DISMISSED_MATERIALS_KEY, []),
  ]);
}

export function loadMaterialMetadataMap(): Record<string, MaterialMetadataPatch> {
  return materialMetadataCache;
}

export async function saveMaterialMetadataMap(value: Record<string, MaterialMetadataPatch>): Promise<void> {
  materialMetadataCache = value;
  await assetRepository.saveMetadata(MATERIAL_METADATA_KEY, value);
}

export function getMaterialMetadata(folderAssetId: string): MaterialMetadataPatch | undefined {
  return loadMaterialMetadataMap()[folderAssetId];
}

export async function mergeMaterialMetadata(folderAssetId: string, patch: MaterialMetadataPatch): Promise<void> {
  const current = { ...loadMaterialMetadataMap() };
  current[folderAssetId] = {
    ...(current[folderAssetId] || {}),
    ...patch,
  };
  await saveMaterialMetadataMap(current);
}

export function applyStoredMaterialMetadata(material: MaterialFolderMetadata): MaterialFolderMetadata {
  const patch = getMaterialMetadata(material.folderAssetId);
  if (!patch) return material;
  return {
    ...material,
    materialName: patch.materialName ?? material.materialName,
    category: patch.category ?? material.category,
    notes: patch.notes ?? material.notes,
    isFavorite: patch.isFavorite ?? material.isFavorite,
    targetEngine: patch.targetEngine ?? material.targetEngine,
    maps: material.maps.map((map) => {
      const overrideType = patch.mapOverrides?.[map.id];
      if (!overrideType) return map;
      return {
        ...map,
        originalMapType: map.originalMapType || map.mapType,
        mapType: overrideType,
        isManualOverride: true,
      };
    }),
  };
}

export function loadDismissedMaterialSuggestions(): string[] {
  return dismissedMaterialsCache;
}

export async function saveDismissedMaterialSuggestions(value: string[]): Promise<void> {
  dismissedMaterialsCache = value;
  await assetRepository.saveMetadata(DISMISSED_MATERIALS_KEY, value);
}

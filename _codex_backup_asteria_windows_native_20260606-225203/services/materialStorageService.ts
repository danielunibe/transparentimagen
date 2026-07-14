import { MaterialCategory, MaterialFolderMetadata, MaterialTargetEngine, PbrMapType } from '@/types/asteria';
import { safeGetJson, safeSetJson } from './storageService';

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

export function loadMaterialMetadataMap(): Record<string, MaterialMetadataPatch> {
  return safeGetJson<Record<string, MaterialMetadataPatch>>(MATERIAL_METADATA_KEY, {});
}

export function saveMaterialMetadataMap(value: Record<string, MaterialMetadataPatch>): void {
  safeSetJson(MATERIAL_METADATA_KEY, value);
}

export function getMaterialMetadata(folderAssetId: string): MaterialMetadataPatch | undefined {
  return loadMaterialMetadataMap()[folderAssetId];
}

export function mergeMaterialMetadata(folderAssetId: string, patch: MaterialMetadataPatch): void {
  const current = loadMaterialMetadataMap();
  current[folderAssetId] = {
    ...(current[folderAssetId] || {}),
    ...patch,
  };
  saveMaterialMetadataMap(current);
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
  return safeGetJson<string[]>(DISMISSED_MATERIALS_KEY, []);
}

export function saveDismissedMaterialSuggestions(value: string[]): void {
  safeSetJson(DISMISSED_MATERIALS_KEY, value);
}

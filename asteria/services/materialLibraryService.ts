import { GalleryFolderItem, GalleryItem, MaterialCategory, MaterialFolderMetadata, MaterialTargetEngine, PbrMapType } from '@/types/asteria';
import { applyStoredMaterialMetadata, getMaterialMetadata, mergeMaterialMetadata } from './materialStorageService';
import { buildMaterialDiagnostics, calculateCompletenessScore, getMaterialReadinessLabel, hasMaterialErrors, hasMaterialWarnings } from './materialDiagnosticsService';

export function getMaterialFolders(assets: GalleryItem[]): GalleryFolderItem[] {
  return assets.filter((asset): asset is GalleryFolderItem => asset.kind === 'folder' && !!asset.material);
}

export function attachDiagnosticsToMaterial(material: MaterialFolderMetadata): MaterialFolderMetadata {
  const diagnostics = buildMaterialDiagnostics(material, { targetEngine: material.targetEngine || 'generic' });
  const completenessScore = diagnostics.completeness.score;
  const hasWarnings = hasMaterialWarnings(diagnostics);
  const hasErrors = hasMaterialErrors(diagnostics);
  const needsReview = hasErrors || hasWarnings || completenessScore < 90;

  return {
    ...material,
    diagnostics,
    completenessScore,
    missingMaps: diagnostics.completeness.missingRequiredMaps,
    hasWarnings,
    hasErrors,
    needsReview,
    status: diagnostics.completeness.missingRequiredMaps.length === 0
      ? 'complete'
      : completenessScore >= 35
        ? 'partial'
        : 'texture_set',
  };
}

export function attachDiagnosticsToMaterials(materials: MaterialFolderMetadata[]): MaterialFolderMetadata[] {
  return materials.map(attachDiagnosticsToMaterial);
}

export function buildMaterialLibrary(assets: GalleryItem[]): MaterialFolderMetadata[] {
  return attachDiagnosticsToMaterials(getMaterialFolders(assets)
    .map((folder) => folder.material)
    .filter((material): material is MaterialFolderMetadata => Boolean(material))
    .map(applyStoredMaterialMetadata));
}

export function getMaterialMapsForFolder(folderId: string, assets: GalleryItem[]) {
  return buildMaterialLibrary(assets).find((material) => material.folderAssetId === folderId)?.maps || [];
}

export function getCompleteMaterials(assets: GalleryItem[]) {
  return buildMaterialLibrary(assets).filter((material) => material.status === 'complete');
}

export function getPartialMaterials(assets: GalleryItem[]) {
  return buildMaterialLibrary(assets).filter((material) => material.status === 'partial');
}

export function getTextureSets(assets: GalleryItem[]) {
  return buildMaterialLibrary(assets).filter((material) => material.status === 'texture_set');
}

export function getFavoriteMaterials(assets: GalleryItem[]) {
  return buildMaterialLibrary(assets).filter((material) => material.isFavorite);
}

export function getMaterialsWithWarnings(assets: GalleryItem[]) {
  return buildMaterialLibrary(assets).filter((material) => material.hasWarnings);
}

export function getMaterialsWithErrors(assets: GalleryItem[]) {
  return buildMaterialLibrary(assets).filter((material) => material.hasErrors);
}

export function getMaterialsReady(assets: GalleryItem[]) {
  return buildMaterialLibrary(assets).filter((material) => (material.completenessScore || 0) >= 90 && !material.hasErrors);
}

export function getMaterialsNeedingReview(assets: GalleryItem[]) {
  return buildMaterialLibrary(assets).filter((material) => Boolean(material.needsReview));
}

export function getAverageCompletenessScore(assets: GalleryItem[]) {
  const materials = buildMaterialLibrary(assets);
  if (materials.length === 0) return 0;
  const total = materials.reduce((sum, material) => sum + (material.completenessScore || 0), 0);
  return Math.round(total / materials.length);
}

export function getMaterialsReadyForTarget(assets: GalleryItem[], targetEngine: MaterialTargetEngine) {
  return buildMaterialLibrary(assets).filter((material) => getMaterialReadinessLabel(material, targetEngine).toLowerCase().includes(`ready for ${targetEngine}`));
}

export function getMaterialCompletenessScore(material: MaterialFolderMetadata) {
  return material.completenessScore ?? calculateCompletenessScore(material, material.targetEngine || 'generic');
}

export function updateMaterialMetadata(materialId: string, patch: Partial<MaterialFolderMetadata>) {
  mergeMaterialMetadata(materialId, {
    materialName: patch.materialName,
    category: patch.category,
    notes: patch.notes,
    isFavorite: patch.isFavorite,
    targetEngine: patch.targetEngine,
  });
}

export function updateMaterialCategory(materialId: string, category: MaterialCategory) {
  mergeMaterialMetadata(materialId, { category });
}

export function updateMaterialTargetEngine(materialId: string, targetEngine: MaterialTargetEngine) {
  mergeMaterialMetadata(materialId, { targetEngine });
}

export function overrideMaterialMapType(materialId: string, mapId: string, newMapType: PbrMapType) {
  const current = getMaterialMetadata(materialId);
  mergeMaterialMetadata(materialId, {
    mapOverrides: {
      ...(current?.mapOverrides || {}),
      [mapId]: newMapType,
    },
  });
}

export function resetMaterialMapOverride(materialId: string, mapId: string) {
  const current = getMaterialMetadata(materialId);
  const nextOverrides = { ...(current?.mapOverrides || {}) };
  delete nextOverrides[mapId];
  mergeMaterialMetadata(materialId, {
    mapOverrides: nextOverrides,
  });
}

export function markMaterialFavorite(materialId: string) {
  const isCurrentlyFavorite = Boolean(getMaterialMetadata(materialId)?.isFavorite);
  mergeMaterialMetadata(materialId, { isFavorite: !isCurrentlyFavorite });
}

export function createMaterialManifest(material: MaterialFolderMetadata) {
  const enriched = applyStoredMaterialMetadata(material);
  return {
    smartFolderKind: 'pbr_material_folder',
    materialName: enriched.materialName || enriched.folderName,
    status: enriched.status,
    maps: enriched.maps.map((map) => ({
      type: map.mapType,
      fileName: map.fileName,
    })),
    missingMaps: enriched.missingMaps,
    category: enriched.category,
    favorite: Boolean(enriched.isFavorite),
    materialDiagnostics: enriched.diagnostics ? {
      completenessScore: enriched.diagnostics.completeness.score,
      targetEngine: enriched.diagnostics.completeness.targetEngine,
      missingRequiredMaps: enriched.diagnostics.completeness.missingRequiredMaps,
      missingOptionalMaps: enriched.diagnostics.completeness.missingOptionalMaps,
      hasWarnings: Boolean(enriched.hasWarnings),
      hasErrors: Boolean(enriched.hasErrors),
      hasResolutionMismatch: enriched.diagnostics.resolution.hasResolutionMismatch,
      diagnostics: enriched.diagnostics.items.map((item) => ({
        code: item.code,
        severity: item.severity,
        message: item.message,
      })),
    } : undefined,
  };
}

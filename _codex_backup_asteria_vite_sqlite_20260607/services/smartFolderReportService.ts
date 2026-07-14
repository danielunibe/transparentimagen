import { GalleryFolderItem, GalleryItem, SmartFolderKind } from '@/types/asteria';

export function createSmartFolderReport(assets: GalleryItem[]) {
  const smartFolders = assets.filter((asset): asset is GalleryFolderItem => asset.kind === 'folder' && !!asset.smartFolder);
  const materialFolders = smartFolders.filter((folder) => !!folder.material);
  const byKind = smartFolders.reduce<Record<SmartFolderKind, number>>((acc, folder) => {
    const kind = folder.smartFolder?.kind || 'unknown_folder';
    acc[kind] = (acc[kind] || 0) + 1;
    return acc;
  }, {
    photo_folder: 0,
    video_folder: 0,
    screenshot_folder: 0,
    cutout_folder: 0,
    upscale_folder: 0,
    export_folder: 0,
    pbr_material_folder: 0,
    texture_set_folder: 0,
    project_folder: 0,
    unknown_folder: 0,
  });

  const missingMapBreakdown = materialFolders.reduce<Record<string, number>>((acc, folder) => {
    folder.material?.missingMaps.forEach((mapType) => {
      acc[mapType] = (acc[mapType] || 0) + 1;
    });
    return acc;
  }, {});

  return {
    totalSmartFolders: smartFolders.length,
    byKind,
    materialFolders: materialFolders.length,
    completeMaterials: materialFolders.filter((folder) => folder.material?.status === 'complete').length,
    partialMaterials: materialFolders.filter((folder) => folder.material?.status === 'partial').length,
    textureSets: materialFolders.filter((folder) => folder.material?.status === 'texture_set').length,
    materialsReady: materialFolders.filter((folder) => (folder.material?.completenessScore || 0) >= 90).length,
    materialsWithWarnings: materialFolders.filter((folder) => folder.material?.hasWarnings).length,
    materialsWithErrors: materialFolders.filter((folder) => folder.material?.hasErrors).length,
    averageCompletenessScore: materialFolders.length
      ? Math.round(materialFolders.reduce((sum, folder) => sum + (folder.material?.completenessScore || 0), 0) / materialFolders.length)
      : 0,
    targetEngineBreakdown: materialFolders.reduce<Record<string, number>>((acc, folder) => {
      const key = folder.material?.targetEngine || 'generic';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    foldersNeedingReview: smartFolders.filter((folder) => folder.smartFolder?.status === 'needs_review').length,
    missingMapBreakdown,
    generatedAt: new Date().toISOString(),
  };
}

import { MaterialFolderMetadata, PbrMapType, PbrTextureMap } from '@/types/asteria';
import { getCanonicalPbrMapType } from './pbrDetectionService';

export interface MaterialPreviewMapBinding {
  baseColorMap?: PbrTextureMap;
  normalMap?: PbrTextureMap;
  roughnessMap?: PbrTextureMap;
  metalnessMap?: PbrTextureMap;
  aoMap?: PbrTextureMap;
  heightMapCandidate?: PbrTextureMap;
  opacityMapCandidate?: PbrTextureMap;
  emissiveMapCandidate?: PbrTextureMap;
  missingRecommendedMaps: PbrMapType[];
  appliedOverrides: Array<{ mapId: string; originalMapType?: PbrMapType; mapType: PbrMapType }>;
  previewReadiness: 'ready' | 'partial' | 'needs_review' | 'basic';
}

function getResolvedMapType(map: PbrTextureMap): PbrMapType {
  return map.isManualOverride ? map.mapType : getCanonicalPbrMapType(map.mapType);
}

function pickFirstMap(material: MaterialFolderMetadata, candidates: PbrMapType[]): PbrTextureMap | undefined {
  return material.maps.find((map) => candidates.includes(getResolvedMapType(map)));
}

function getAppliedOverrides(material: MaterialFolderMetadata) {
  return material.maps
    .filter((map) => map.isManualOverride)
    .map((map) => ({
      mapId: map.id,
      originalMapType: map.originalMapType,
      mapType: map.mapType,
    }));
}

export function resolveMaterialPreviewMaps(material: MaterialFolderMetadata): MaterialPreviewMapBinding {
  const baseColorMap = pickFirstMap(material, ['base_color', 'albedo', 'diffuse']);
  const normalMap = pickFirstMap(material, ['normal']);
  const roughnessMap = pickFirstMap(material, ['roughness']);
  const metalnessMap = pickFirstMap(material, ['metallic']);
  const aoMap = pickFirstMap(material, ['ambient_occlusion']);
  const heightMapCandidate = pickFirstMap(material, ['height', 'displacement']);
  const opacityMapCandidate = pickFirstMap(material, ['opacity', 'alpha']);
  const emissiveMapCandidate = pickFirstMap(material, ['emissive']);
  const hasWarnings = Boolean(material.diagnostics?.items.some((item) => item.severity === 'warning'));
  const hasErrors = Boolean(material.diagnostics?.items.some((item) => item.severity === 'error'));

  const missingRecommendedMaps: PbrMapType[] = [];
  if (!baseColorMap) missingRecommendedMaps.push('base_color');
  if (!normalMap) missingRecommendedMaps.push('normal');
  if (!roughnessMap) missingRecommendedMaps.push('roughness');
  if (!metalnessMap) missingRecommendedMaps.push('metallic');
  if (!aoMap) missingRecommendedMaps.push('ambient_occlusion');

  const previewReadiness: MaterialPreviewMapBinding['previewReadiness'] = !baseColorMap && !normalMap
    ? 'basic'
    : missingRecommendedMaps.length === 0
      ? 'ready'
      : hasWarnings || hasErrors
        ? 'needs_review'
        : 'partial';

  return {
    baseColorMap,
    normalMap,
    roughnessMap,
    metalnessMap,
    aoMap,
    heightMapCandidate,
    opacityMapCandidate,
    emissiveMapCandidate,
    missingRecommendedMaps,
    appliedOverrides: getAppliedOverrides(material),
    previewReadiness,
  };
}

export function getPreferredBaseColorMap(material: MaterialFolderMetadata): PbrTextureMap | undefined {
  return resolveMaterialPreviewMaps(material).baseColorMap;
}

export function getPreferredNormalMap(material: MaterialFolderMetadata): PbrTextureMap | undefined {
  return resolveMaterialPreviewMaps(material).normalMap;
}

export function getPreferredRoughnessMap(material: MaterialFolderMetadata): PbrTextureMap | undefined {
  return resolveMaterialPreviewMaps(material).roughnessMap;
}

export function getPreferredMetalnessMap(material: MaterialFolderMetadata): PbrTextureMap | undefined {
  return resolveMaterialPreviewMaps(material).metalnessMap;
}

export function getPreferredAoMap(material: MaterialFolderMetadata): PbrTextureMap | undefined {
  return resolveMaterialPreviewMaps(material).aoMap;
}

export function summarizeMaterialPreviewReadiness(binding: MaterialPreviewMapBinding): string {
  if (binding.previewReadiness === 'ready') return 'Preview ready with core PBR maps bound.';
  if (binding.previewReadiness === 'needs_review') return 'Preview is usable but the material still needs review.';
  if (binding.previewReadiness === 'partial') return `Preview is partial; missing recommended maps: ${binding.missingRecommendedMaps.join(', ')}.`;
  return 'Preview is basic; base color or normal binding is missing.';
}

import {
  MaterialDiagnosticCode,
  MaterialDiagnosticItem,
  MaterialDiagnostics,
  MaterialDiagnosticSeverity,
  MaterialFolderMetadata,
  MaterialTargetEngine,
  PbrMapType,
  PbrTextureMap,
} from '@/types/asteria';
import { areEquivalentBaseColorMaps, getCanonicalPbrMapType } from './pbrDetectionService';

const TARGET_REQUIREMENTS: Record<MaterialTargetEngine, { required: PbrMapType[]; optional: PbrMapType[] }> = {
  generic: {
    required: ['base_color', 'normal', 'roughness'],
    optional: ['ambient_occlusion', 'metallic', 'height', 'opacity', 'emissive'],
  },
  blender: {
    required: ['base_color', 'normal', 'roughness'],
    optional: ['metallic', 'ambient_occlusion', 'height', 'opacity', 'emissive'],
  },
  unreal: {
    required: ['base_color', 'normal', 'roughness'],
    optional: ['metallic', 'ambient_occlusion', 'height', 'emissive', 'opacity'],
  },
  unity: {
    required: ['base_color', 'normal'],
    optional: ['metallic', 'roughness', 'ambient_occlusion', 'height', 'opacity', 'emissive'],
  },
};

const SCORE_WEIGHTS: Partial<Record<PbrMapType, number>> = {
  base_color: 35,
  normal: 30,
  roughness: 25,
  ambient_occlusion: 5,
  metallic: 5,
};

function createDiagnostic(
  code: MaterialDiagnosticCode,
  severity: MaterialDiagnosticSeverity,
  title: string,
  message: string,
  affectedMapIds?: string[],
  recommendation?: string,
): MaterialDiagnosticItem {
  return {
    id: `diag_${code}_${affectedMapIds?.join('_') || 'global'}`,
    code,
    severity,
    title,
    message,
    affectedMapIds,
    recommendation,
  };
}

function hasEquivalentMap(maps: PbrTextureMap[], targetMap: PbrMapType): boolean {
  if (targetMap === 'base_color') {
    return maps.some((map) => areEquivalentBaseColorMaps(map.mapType));
  }
  return maps.some((map) => getCanonicalPbrMapType(map.mapType) === targetMap);
}

function getPresentMaps(maps: PbrTextureMap[], candidates: PbrMapType[]): PbrMapType[] {
  return candidates.filter((candidate) => hasEquivalentMap(maps, candidate));
}

export function getMaterialOverrideCount(material: MaterialFolderMetadata): number {
  return material.maps.filter((map) => map.isManualOverride).length;
}

export function hasMaterialOverrides(material: MaterialFolderMetadata): boolean {
  return getMaterialOverrideCount(material) > 0;
}

export function getRequiredMapsForTarget(targetEngine: MaterialTargetEngine): PbrMapType[] {
  return TARGET_REQUIREMENTS[targetEngine].required;
}

export function getOptionalMapsForTarget(targetEngine: MaterialTargetEngine): PbrMapType[] {
  return TARGET_REQUIREMENTS[targetEngine].optional;
}

export function getRequiredPbrMaps(targetEngine: MaterialTargetEngine = 'generic'): PbrMapType[] {
  return getRequiredMapsForTarget(targetEngine);
}

export function getOptionalPbrMaps(targetEngine: MaterialTargetEngine = 'generic'): PbrMapType[] {
  return getOptionalMapsForTarget(targetEngine);
}

export function detectMissingMaps(material: MaterialFolderMetadata, targetEngine: MaterialTargetEngine) {
  const requiredMaps = getRequiredMapsForTarget(targetEngine);
  const optionalMaps = getOptionalMapsForTarget(targetEngine);
  const presentRequiredMaps = getPresentMaps(material.maps, requiredMaps);
  const presentOptionalMaps = getPresentMaps(material.maps, optionalMaps);
  return {
    requiredMaps,
    optionalMaps,
    presentRequiredMaps,
    missingRequiredMaps: requiredMaps.filter((mapType) => !presentRequiredMaps.includes(mapType)),
    presentOptionalMaps,
    missingOptionalMaps: optionalMaps.filter((mapType) => !presentOptionalMaps.includes(mapType)),
  };
}

export function calculateCompletenessScore(material: MaterialFolderMetadata, targetEngine: MaterialTargetEngine): number {
  const { presentRequiredMaps, presentOptionalMaps } = detectMissingMaps(material, targetEngine);
  const score = [...presentRequiredMaps, ...presentOptionalMaps]
    .reduce((total, mapType) => total + (SCORE_WEIGHTS[mapType] || 0), 0);
  return Math.min(100, score);
}

export function detectResolutionMismatch(material: MaterialFolderMetadata) {
  const resolutions = material.maps.map((map) => ({
    mapType: map.mapType,
    width: map.width,
    height: map.height,
    fileName: map.fileName,
  }));
  const populated = resolutions.filter((entry) => entry.width && entry.height);
  const dominant = populated[0];
  const hasResolutionMismatch = populated.some((entry) => entry.width !== dominant?.width || entry.height !== dominant?.height);
  return {
    dominantWidth: dominant?.width,
    dominantHeight: dominant?.height,
    hasResolutionMismatch,
    resolutions,
  };
}

export function detectMixedFormats(material: MaterialFolderMetadata): boolean {
  return new Set(material.maps.map((map) => String(map.format).toLowerCase())).size > 1;
}

export function detectDuplicateMapTypes(material: MaterialFolderMetadata): PbrTextureMap[] {
  const seen = new Map<PbrMapType, PbrTextureMap>();
  const duplicates: PbrTextureMap[] = [];
  material.maps.forEach((map) => {
    const canonical = getCanonicalPbrMapType(map.mapType);
    if (seen.has(canonical)) {
      duplicates.push(map);
    } else {
      seen.set(canonical, map);
    }
  });
  return duplicates;
}

export function detectLowConfidenceMaps(material: MaterialFolderMetadata): PbrTextureMap[] {
  return material.maps.filter((map) => map.confidence !== 'high');
}

export function detectFilenameConflicts(material: MaterialFolderMetadata): PbrTextureMap[] {
  return material.maps.filter((map) => {
    const lower = map.fileName.toLowerCase();
    return lower.includes('normalgl') || lower.includes('normaldx') || lower.includes('diffuse') && lower.includes('albedo');
  });
}

export function buildMaterialRecommendations(material: MaterialFolderMetadata, diagnostics: MaterialDiagnostics): string[] {
  const recommendations: string[] = [];
  if (hasMaterialOverrides(material)) {
    recommendations.push('Manual map overrides are active and diagnostics respect the overridden map types.');
  }
  if (diagnostics.completeness.missingRequiredMaps.length > 0) {
    recommendations.push(`Add required maps: ${diagnostics.completeness.missingRequiredMaps.join(', ')}.`);
  }
  if (diagnostics.resolution.hasResolutionMismatch) {
    recommendations.push('Align texture resolutions before engine export.');
  }
  if (detectMixedFormats(material)) {
    recommendations.push('Normalize texture formats for a cleaner downstream pipeline.');
  }
  if (recommendations.length === 0) {
    recommendations.push(`Material looks ready for ${diagnostics.completeness.targetEngine}.`);
  }
  return recommendations;
}

export function getMaterialReadinessLabel(material: MaterialFolderMetadata, targetEngine: MaterialTargetEngine): string {
  const score = material.completenessScore ?? calculateCompletenessScore(material, targetEngine);
  if (score >= 90) return targetEngine === 'generic' ? 'Ready' : `Ready for ${targetEngine}`;
  if (score >= 60) return 'Needs Review';
  if (score >= 35) return 'Partial';
  return 'Needs Review';
}

export function getMaterialDiagnosticTone(item: MaterialDiagnosticItem): string {
  if (item.severity === 'error') return 'text-[#ff8c7a]';
  if (item.severity === 'warning') return 'text-[#f5c451]';
  return 'text-[#7fd6b1]';
}

export function hasMaterialWarnings(diagnostics: MaterialDiagnostics): boolean {
  return diagnostics.items.some((item) => item.severity === 'warning');
}

export function hasMaterialErrors(diagnostics: MaterialDiagnostics): boolean {
  return diagnostics.items.some((item) => item.severity === 'error');
}

export function buildDiagnosticItems(material: MaterialFolderMetadata, diagnostics: MaterialDiagnostics): MaterialDiagnosticItem[] {
  const duplicateMaps = detectDuplicateMapTypes(material);
  const lowConfidenceMaps = detectLowConfidenceMaps(material);
  const filenameConflicts = detectFilenameConflicts(material);
  const items: MaterialDiagnosticItem[] = [];

  diagnostics.completeness.missingRequiredMaps.forEach((mapType) => {
    if (mapType === 'base_color') {
      items.push(createDiagnostic('missing_base_color', 'error', 'Missing base color', 'This material is missing a base color or equivalent albedo/diffuse map.', undefined, 'Add a base color map or override an equivalent map if the filename was detected incorrectly.'));
      return;
    }
    if (mapType === 'normal') {
      const severity: MaterialDiagnosticSeverity = material.status === 'texture_set' || material.status === 'unknown' ? 'error' : 'warning';
      items.push(createDiagnostic('missing_normal', severity, 'Missing normal', 'A normal map was not detected for this material.', undefined, 'Add a normal map if the material should be ready for general PBR use.'));
      return;
    }
    if (mapType === 'roughness') {
      items.push(createDiagnostic('missing_roughness', 'warning', 'Missing roughness', 'A roughness map was not detected for this material.', undefined, 'Add a roughness map for more reliable PBR readiness.'));
      return;
    }
  });

  if (diagnostics.completeness.score >= 90 && diagnostics.completeness.missingRequiredMaps.length === 0) {
    const readyCode: MaterialDiagnosticCode = diagnostics.completeness.targetEngine === 'generic'
      ? 'ready_for_generic'
      : diagnostics.completeness.targetEngine === 'blender'
        ? 'ready_for_blender'
        : diagnostics.completeness.targetEngine === 'unreal'
          ? 'ready_for_unreal'
          : 'ready_for_unity';
    items.push(createDiagnostic(readyCode, 'info', 'Ready', 'Required maps are present for this material.', undefined, 'You can keep reviewing optional maps, but the core PBR set looks ready.'));
  } else if (diagnostics.completeness.score >= 35) {
    items.push(createDiagnostic('partial_material', 'info', 'Partial material', 'The folder contains a coherent texture set, but it is not ready yet.', undefined, 'Review the missing required maps and any low-confidence detections.'));
  } else {
    items.push(createDiagnostic('needs_review', 'warning', 'Needs review', 'The folder has weak or incomplete PBR signals.', undefined, 'Check filenames and confirm whether this folder is meant to be a PBR material.'));
  }

  if (diagnostics.resolution.hasResolutionMismatch) {
    items.push(createDiagnostic('resolution_mismatch', 'warning', 'Resolution mismatch', 'Detected maps do not share the same dominant resolution.', undefined, 'Normalize the texture set before final export.'));
  }
  if (detectMixedFormats(material)) {
    items.push(createDiagnostic('mixed_formats', 'warning', 'Mixed formats', 'Detected maps use mixed file formats.', undefined, 'Prefer a consistent format set for downstream tools.'));
  }
  if (duplicateMaps.length > 0) {
    items.push(createDiagnostic('duplicate_map_type', 'warning', 'Duplicate map type', 'Multiple files are being interpreted as the same map type.', duplicateMaps.map((map) => map.id), 'Use manual override to disambiguate maps.'));
  }
  if (lowConfidenceMaps.length > 0) {
    items.push(createDiagnostic('low_confidence_detection', 'warning', 'Low confidence detection', 'Some maps were detected with medium or low filename confidence.', lowConfidenceMaps.map((map) => map.id), 'Review filename-based detections before treating this set as final.'));
  }
  if (filenameConflicts.length > 0) {
    items.push(createDiagnostic('filename_conflict', 'warning', 'Filename conflict', 'Some filenames contain conflicting naming conventions.', filenameConflicts.map((map) => map.id), 'Use overrides or rename later in a safe phase.'));
  }

  return items;
}

export function buildMaterialDiagnostics(material: MaterialFolderMetadata, options?: { targetEngine?: MaterialTargetEngine }): MaterialDiagnostics {
  const targetEngine = options?.targetEngine || material.targetEngine || 'generic';
  const completenessParts = detectMissingMaps(material, targetEngine);
  const completenessScore = calculateCompletenessScore(material, targetEngine);
  const resolution = detectResolutionMismatch(material);
  const diagnosticsBase = {
    materialId: material.id,
    completeness: {
      score: completenessScore,
      requiredMaps: completenessParts.requiredMaps,
      optionalMaps: completenessParts.optionalMaps,
      presentRequiredMaps: completenessParts.presentRequiredMaps,
      missingRequiredMaps: completenessParts.missingRequiredMaps,
      presentOptionalMaps: completenessParts.presentOptionalMaps,
      missingOptionalMaps: completenessParts.missingOptionalMaps,
      targetEngine,
    },
    resolution,
    items: [] as MaterialDiagnosticItem[],
    generatedAt: new Date().toISOString(),
  } satisfies MaterialDiagnostics;
  const items = buildDiagnosticItems(material, diagnosticsBase);
  return {
    ...diagnosticsBase,
    items,
  };
}

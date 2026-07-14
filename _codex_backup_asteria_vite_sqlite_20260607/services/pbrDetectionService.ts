import {
  GalleryFolderItem,
  GalleryImageItem,
  GalleryItem,
  MaterialCategory,
  MaterialFolderMetadata,
  MaterialFolderStatus,
  PbrMapType,
  PbrTextureMap,
} from '@/types/asteria';
import { PBR_BASE_COLOR_EQUIVALENTS, PBR_OPTIONAL_MAPS, PBR_REQUIRED_COMPLETE_MAPS } from '@/data/pbrMapTypes';
import { MATERIAL_COMPLETE_MIN_MAPS, MATERIAL_MIN_PBR_SIGNAL, MATERIAL_PARTIAL_MIN_MAPS } from '@/data/materialVaultConstants';

const MAP_PATTERNS: Array<{ mapType: PbrMapType; patterns: RegExp[] }> = [
  { mapType: 'base_color', patterns: [/\bbasecolor\b/i, /\bbase_color\b/i, /\bbase_col\b/i, /\bbase-col\b/i] },
  { mapType: 'albedo', patterns: [/\balbedo\b/i] },
  { mapType: 'diffuse', patterns: [/\bdiffuse\b/i, /\bdiff\b/i] },
  { mapType: 'normal', patterns: [/\bnormal\b/i, /\bnormalgl\b/i, /\bnormaldx\b/i, /\bnrm\b/i, /\bnor\b/i] },
  { mapType: 'roughness', patterns: [/\broughness\b/i, /\brough\b/i, /\brgh\b/i] },
  { mapType: 'metallic', patterns: [/\bmetallic\b/i, /\bmetalness\b/i, /\bmetal\b/i] },
  { mapType: 'ambient_occlusion', patterns: [/\bao\b/i, /\bambientocclusion\b/i, /\bambient_occlusion\b/i, /\bocclusion\b/i] },
  { mapType: 'height', patterns: [/\bheight\b/i] },
  { mapType: 'displacement', patterns: [/\bdisplacement\b/i, /\bdisp\b/i, /\bdisplace\b/i] },
  { mapType: 'opacity', patterns: [/\bopacity\b/i, /\btransparent\b/i, /\btransparency\b/i] },
  { mapType: 'alpha', patterns: [/\balpha\b/i] },
  { mapType: 'emissive', patterns: [/\bemissive\b/i, /\bemission\b/i, /\bemit\b/i] },
  { mapType: 'specular', patterns: [/\bspecular\b/i, /\bspec\b/i] },
  { mapType: 'gloss', patterns: [/\bgloss\b/i, /\bglossiness\b/i] },
];

const REQUIRED_COMPLETE_MAPS: PbrMapType[] = PBR_REQUIRED_COMPLETE_MAPS;
const OPTIONAL_COMPLETE_MAPS: PbrMapType[] = PBR_OPTIONAL_MAPS;
const CATEGORY_HINTS: Array<{ category: MaterialCategory; hints: string[] }> = [
  { category: 'wood', hints: ['wood', 'oak', 'pine', 'walnut'] },
  { category: 'metal', hints: ['metal', 'steel', 'iron', 'copper', 'brass'] },
  { category: 'stone', hints: ['stone', 'rock', 'marble', 'granite'] },
  { category: 'fabric', hints: ['fabric', 'cloth', 'linen', 'cotton'] },
  { category: 'plastic', hints: ['plastic', 'polymer'] },
  { category: 'organic', hints: ['leaf', 'bark', 'moss', 'organic'] },
  { category: 'ground', hints: ['ground', 'soil', 'mud', 'sand'] },
  { category: 'wall', hints: ['wall', 'plaster', 'concrete'] },
  { category: 'ceramic', hints: ['ceramic', 'porcelain'] },
  { category: 'glass', hints: ['glass', 'transparent'] },
  { category: 'tile', hints: ['tile'] },
  { category: 'skin', hints: ['skin', 'leather'] },
];

function createId(prefix: string, value: string): string {
  return `${prefix}:${value.replace(/\\/g, '/').toLowerCase()}`;
}

export function normalizePbrFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[\s.-]+/g, '_')
    .replace(/__+/g, '_');
}

export function getCanonicalPbrMapType(mapType: PbrMapType): PbrMapType {
  if (mapType === 'albedo' || mapType === 'diffuse') return 'base_color';
  if (mapType === 'displacement') return 'height';
  if (mapType === 'alpha') return 'opacity';
  return mapType;
}

export function areEquivalentBaseColorMaps(mapType: PbrMapType): boolean {
  return PBR_BASE_COLOR_EQUIVALENTS.includes(mapType);
}

export function isRequiredPbrMap(mapType: PbrMapType): boolean {
  return REQUIRED_COMPLETE_MAPS.includes(getCanonicalPbrMapType(mapType));
}

export function isOptionalPbrMap(mapType: PbrMapType): boolean {
  return OPTIONAL_COMPLETE_MAPS.includes(getCanonicalPbrMapType(mapType));
}

export function detectPbrMapType(fileName: string): PbrMapType {
  const normalized = normalizePbrFileName(fileName);
  for (const candidate of MAP_PATTERNS) {
    if (candidate.patterns.some((pattern) => pattern.test(normalized))) {
      return candidate.mapType;
    }
  }
  return 'unknown';
}

export function getPbrMapConfidence(fileName: string, mapType: PbrMapType): 'high' | 'medium' | 'low' {
  if (mapType === 'unknown') return 'low';
  const normalized = normalizePbrFileName(fileName);
  const exactHints = {
    base_color: ['basecolor', 'base_color'],
    albedo: ['albedo'],
    diffuse: ['diffuse', 'diff'],
    normal: ['normal', 'nrm', 'nor'],
    roughness: ['roughness', 'rough', 'rgh'],
    metallic: ['metallic', 'metalness'],
    ambient_occlusion: ['ambientocclusion', 'ambient_occlusion', 'occlusion'],
    height: ['height'],
    displacement: ['displacement', 'displace'],
    opacity: ['opacity', 'transparency'],
    alpha: ['alpha'],
    emissive: ['emissive', 'emission'],
    specular: ['specular'],
    gloss: ['gloss', 'glossiness'],
    unknown: [],
  } satisfies Record<PbrMapType, string[]>;
  if (exactHints[mapType].some((hint) => normalized.includes(hint))) return 'high';
  return 'medium';
}

export function getPbrMapLabel(mapType: PbrMapType): string {
  return mapType.replace(/_/g, ' ');
}

export function normalizeMaterialName(folderName: string): string {
  return folderName
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectMaterialCategory(folderName: string): MaterialCategory {
  const normalized = normalizePbrFileName(folderName);
  const match = CATEGORY_HINTS.find((candidate) => candidate.hints.some((hint) => normalized.includes(hint)));
  return match?.category || 'unknown';
}

export function detectPbrMapsInAssets(assets: GalleryItem[]): PbrTextureMap[] {
  return assets
    .filter((asset): asset is GalleryImageItem => asset.kind === 'image')
    .map((asset) => {
      const mapType = detectPbrMapType(asset.name);
      return {
        id: createId('pbr-map', asset.id),
        assetId: asset.id,
        fileName: asset.name,
        mapType,
        format: asset.metadata?.extension || asset.type || 'unknown',
        width: asset.metadata?.width,
        height: asset.metadata?.height,
        confidence: getPbrMapConfidence(asset.name, mapType),
      };
    })
    .filter((entry) => entry.mapType !== 'unknown');
}

export function getMissingRequiredMaps(maps: PbrTextureMap[]): PbrMapType[] {
  return REQUIRED_COMPLETE_MAPS.filter((mapType) => !maps.some((map) => getCanonicalPbrMapType(map.mapType) === mapType || (mapType === 'base_color' && areEquivalentBaseColorMaps(map.mapType))));
}

export function classifyMaterialStatus(maps: PbrTextureMap[]): MaterialFolderStatus {
  if (maps.length === 0) return 'unknown';
  const missing = getMissingRequiredMaps(maps);
  const uniqueCanonicalMaps = new Set(maps.map((map) => getCanonicalPbrMapType(map.mapType)));
  if (missing.length === 0 && uniqueCanonicalMaps.size >= MATERIAL_COMPLETE_MIN_MAPS) return 'complete';
  if (uniqueCanonicalMaps.size >= MATERIAL_PARTIAL_MIN_MAPS) return 'partial';
  if (uniqueCanonicalMaps.size >= 1) return 'texture_set';
  return 'unknown';
}

export function createMaterialFolderMetadata(
  folderAsset: GalleryFolderItem,
  childAssets: GalleryItem[],
): MaterialFolderMetadata | undefined {
  const maps = detectPbrMapsInAssets(childAssets);
  const uniqueCanonicalMaps = new Set(maps.map((map) => getCanonicalPbrMapType(map.mapType)));
  const hasPrimarySignal = maps.some((map) => areEquivalentBaseColorMaps(map.mapType) || map.mapType === 'normal');
  const hasSecondarySignal = maps.some((map) => ['roughness', 'metallic', 'ambient_occlusion', 'height', 'opacity', 'emissive'].includes(map.mapType));
  if (maps.length < MATERIAL_MIN_PBR_SIGNAL || uniqueCanonicalMaps.size < MATERIAL_MIN_PBR_SIGNAL || !hasPrimarySignal || (!hasSecondarySignal && maps.length < MATERIAL_COMPLETE_MIN_MAPS)) {
    return undefined;
  }
  const now = new Date().toISOString();
  return {
    id: createId('material-folder', folderAsset.id),
    folderAssetId: folderAsset.id,
    folderName: folderAsset.name,
    status: classifyMaterialStatus(maps),
    maps,
    missingMaps: getMissingRequiredMaps(maps),
    detectedAt: now,
    updatedAt: now,
    materialName: normalizeMaterialName(folderAsset.name),
    category: detectMaterialCategory(folderAsset.name),
    targetEngine: 'generic',
  };
}

export function detectMaterialFolder(
  folderAsset: GalleryFolderItem,
  childAssets: GalleryItem[],
): MaterialFolderMetadata | undefined {
  return createMaterialFolderMetadata(folderAsset, childAssets);
}

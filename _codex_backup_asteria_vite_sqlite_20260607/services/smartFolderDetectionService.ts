import {
  GalleryFolderItem,
  GalleryItem,
  SmartFolderKind,
  SmartFolderMetadata,
  SmartFolderStatus,
} from '@/types/asteria';
import { buildOrganizationMetadata } from './mediaOrganizationService';
import { detectMaterialFolder } from './pbrDetectionService';

function createId(prefix: string, value: string): string {
  return `${prefix}:${value.replace(/\\/g, '/').toLowerCase()}`;
}

function getChildImageItems(childAssets: GalleryItem[]) {
  return childAssets.filter((asset) => asset.kind === 'image');
}

function getChildVideoItems(childAssets: GalleryItem[]) {
  return childAssets.filter((asset) => asset.kind === 'video');
}

export function isLikelyPhotoFolder(childAssets: GalleryItem[]): boolean {
  const images = getChildImageItems(childAssets);
  return images.length > 0 && images.length >= getChildVideoItems(childAssets).length * 2;
}

export function isLikelyVideoFolder(childAssets: GalleryItem[]): boolean {
  const videos = getChildVideoItems(childAssets);
  return videos.length > 0 && videos.length >= getChildImageItems(childAssets).length;
}

export function isLikelyScreenshotFolder(childAssets: GalleryItem[]): boolean {
  const images = getChildImageItems(childAssets);
  if (images.length === 0) return false;
  const screenshotMatches = images.filter((asset) => buildOrganizationMetadata(asset).isScreenshot).length;
  return screenshotMatches / images.length >= 0.5;
}

export function isLikelyCutoutFolder(childAssets: GalleryItem[]): boolean {
  const images = getChildImageItems(childAssets);
  if (images.length === 0) return false;
  return images.some((asset) => {
    const name = asset.name.toLowerCase();
    return name.includes('cutout') || name.includes('alpha') || name.includes('transparent');
  });
}

export function isLikelyUpscaleFolder(childAssets: GalleryItem[]): boolean {
  const images = getChildImageItems(childAssets);
  if (images.length === 0) return false;
  return images.some((asset) => {
    const name = asset.name.toLowerCase();
    return name.includes('upscaled') || name.includes('upscale') || /\b[234]x\b/.test(name);
  });
}

export function isLikelyPbrMaterialFolder(childAssets: GalleryItem[]): boolean {
  const imageAssets = getChildImageItems(childAssets);
  if (imageAssets.length < 2) return false;
  const pseudoFolder: GalleryFolderItem = {
    id: 'folder:detector',
    kind: 'folder',
    mediaKind: 'folder',
    name: 'detector',
    pathLabel: 'detector',
    imageCount: 0,
    videoCount: 0,
    previewUrls: [],
  };
  return Boolean(detectMaterialFolder(pseudoFolder, childAssets));
}

export function isLikelyTextureSetFolder(childAssets: GalleryItem[]): boolean {
  const images = getChildImageItems(childAssets);
  if (images.length < 2) return false;
  if (isLikelyPbrMaterialFolder(childAssets)) return false;
  const matchingTextures = images.filter((asset) => {
    const name = asset.name.toLowerCase();
    return ['texture', 'tex', 'surface', 'mat'].some((hint) => name.includes(hint));
  });
  return matchingTextures.length >= 2 || images.length >= 3;
}

export function detectSmartFolderKind(folderAsset: GalleryFolderItem, childAssets: GalleryItem[]): SmartFolderKind {
  if (isLikelyPbrMaterialFolder(childAssets)) return 'pbr_material_folder';
  if (isLikelyTextureSetFolder(childAssets)) return 'texture_set_folder';
  if (isLikelyScreenshotFolder(childAssets)) return 'screenshot_folder';
  if (isLikelyCutoutFolder(childAssets)) return 'cutout_folder';
  if (isLikelyUpscaleFolder(childAssets)) return 'upscale_folder';
  if (isLikelyVideoFolder(childAssets)) return 'video_folder';
  if (isLikelyPhotoFolder(childAssets)) return 'photo_folder';
  if (folderAsset.name.toLowerCase().includes('export')) return 'export_folder';
  if (folderAsset.name.toLowerCase().includes('project')) return 'project_folder';
  return 'unknown_folder';
}

export function getSmartFolderStatus(kind: SmartFolderKind, childAssets: GalleryItem[]): SmartFolderStatus {
  if (kind === 'unknown_folder') return 'unknown';
  if (kind === 'texture_set_folder') return 'partial';
  if (kind === 'pbr_material_folder' && childAssets.length < 3) return 'needs_review';
  if (childAssets.length === 0) return 'needs_review';
  return 'ready';
}

export function getSmartFolderWarnings(metadata: SmartFolderMetadata): string[] {
  const warnings: string[] = [];
  if (metadata.kind === 'unknown_folder') warnings.push('Folder pattern is still ambiguous.');
  if (metadata.status === 'needs_review') warnings.push('Review recommended before using this folder as a smart workspace.');
  if (metadata.childAssetIds.length === 0) warnings.push('No supported media children detected.');
  return warnings;
}

export function getSmartFolderSummary(metadata: SmartFolderMetadata): string {
  return `${metadata.kind.replace(/_/g, ' ')} with ${metadata.childAssetIds.length} detected items`;
}

export function buildSmartFolderMetadata(
  folderAsset: GalleryFolderItem,
  childAssets: GalleryItem[],
): SmartFolderMetadata {
  const now = new Date().toISOString();
  const kind = detectSmartFolderKind(folderAsset, childAssets);
  const status = getSmartFolderStatus(kind, childAssets);
  const confidence: SmartFolderMetadata['confidence'] =
    kind === 'unknown_folder'
      ? 'low'
      : kind === 'texture_set_folder' || status === 'needs_review'
        ? 'medium'
        : 'high';
  const metadata: SmartFolderMetadata = {
    id: createId('smart-folder', folderAsset.id),
    folderAssetId: folderAsset.id,
    folderName: folderAsset.name,
    kind,
    status,
    childAssetIds: childAssets.map((asset) => asset.id),
    detectedAt: now,
    updatedAt: now,
    confidence,
    tags: [kind.replace(/_folder$/, '').replace(/_/g, ' ')],
  };
  metadata.summary = getSmartFolderSummary(metadata);
  metadata.warnings = getSmartFolderWarnings(metadata);
  return metadata;
}

export function detectSmartFolder(
  folderAsset: GalleryFolderItem,
  childAssets: GalleryItem[],
): SmartFolderMetadata {
  return buildSmartFolderMetadata(folderAsset, childAssets);
}

import type {
  LocalUpscaleModelInfo,
  LocalUpscaleModelStatus,
  RealEsrganStatus,
  SmartCollectionCriteria,
  SmartCollectionKind,
  UpscaleEngine,
  UpscaleQualityPreset,
  ViewDensity,
} from './domains/core';
import { LucideIcon } from 'lucide-react';

export * from './domains/core';
export * from './domains/jobs';
export * from './domains/runtime';

export type BatchProcessingAction =
  | 'apply_preset'
  | 'create_adjustment_variant'
  | 'enhance'
  | 'upscale'
  | 'portrait'
  | 'ue5'
  | 'remove_bg'
  | 'export_png'
  | 'export_svg';

export type BatchProcessingStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'partial'
  | 'skipped';

export interface BatchUpscaleOptions {
  scale: 2 | 3 | 4;
  engine: UpscaleEngine;
  qualityPreset?: UpscaleQualityPreset;
  tileSize?: 64 | 128 | 192 | 256;
  tilePad?: 4 | 8 | 12 | 16;
  modelId?: string;
}

export interface BatchProcessingOptions {
  upscale?: BatchUpscaleOptions;
}

export interface BatchProcessingItemResult {
  itemId: string;
  itemName: string;
  status: BatchProcessingStatus;
  variantId?: string;
  variantKind?: AssetVariantKind;
  exportJobId?: string;
  outputWidth?: number;
  outputHeight?: number;
  upscaleScale?: number;
  upscaleEngine?: string;
  upscaleQualityPreset?: UpscaleQualityPreset;
  tileSize?: number;
  tilePad?: number;
  requestedEngine?: UpscaleEngine | string;
  actualEngine?: string;
  fallbackFrom?: string;
  realEsrganStatus?: RealEsrganStatus;
  modelId?: string;
  modelStatus?: RealEsrganStatus | LocalUpscaleModelStatus;
  memoryMode?: string;
  estimatedCost?: string;
  errorCode?: string;
  message?: string;
  error?: string;
}

export interface BatchProcessingJob {
  id: string;
  label: string;
  action: BatchProcessingAction;
  itemIds: string[];
  status: BatchProcessingStatus;
  createdAt: string;
  updatedAt: string;
  progress: number;
  completedCount: number;
  failedCount: number;
  skippedCount?: number;
  durationMs?: number;
  createdVariantCount?: number;
  results: BatchProcessingItemResult[];
  presetId?: string;
  presetLabel?: string;
  options?: BatchProcessingOptions;
  reportId?: string;
  message?: string;
}

export type SearchTokenKind =
  | 'text'
  | 'extension'
  | 'format'
  | 'dimension'
  | 'status'
  | 'variant'
  | 'preset'
  | 'ai'
  | 'export'
  | 'source';

export interface ParsedSearchToken {
  raw: string;
  kind: SearchTokenKind;
  key?: string;
  value: string;
}

export interface AssetSearchMetadata {
  assetId: string;
  name: string;
  mediaKind?: MediaKind;
  extension?: string;
  format?: string;
  width?: number;
  height?: number;
  size?: number;
  modifiedAt?: number;
  sourceName?: string;
  hasVariants?: boolean;
  hasAdjustments?: boolean;
  hasAiJobs?: boolean;
  hasExports?: boolean;
  hasMetadataOnlyVariants?: boolean;
  hasSessionOutputs?: boolean;
  hasUpscaled?: boolean;
  presetLabels?: string[];
  variantKinds?: string[];
  upscaleScales?: number[];
  upscaleEngines?: string[];
  upscaleFallbacks?: string[];
  upscaleQualityPresets?: string[];
  upscaleTileSizes?: number[];
  upscaleTilePads?: number[];
  upscaleModelIds?: string[];
  people?: string[];
  places?: string[];
  eventIds?: string[];
  visualTags?: string[];
  qualityFlags?: string[];
  isDuplicateCandidate?: boolean;
  isScreenshot?: boolean;
  isVideo?: boolean;
  dateTaken?: string;
  year?: string;
  month?: string;
  hasOrganizationMetadata?: boolean;
  isUnorganized?: boolean;
  isSmartFolder?: boolean;
  smartFolderKind?: SmartFolderKind;
  smartFolderStatus?: SmartFolderStatus;
  smartFolderTags?: string[];
  smartFolderWarnings?: string[];
  childCount?: number;
  isMaterialFolder?: boolean;
  materialStatus?: MaterialFolderStatus;
  materialName?: string;
  materialCategory?: string;
  isFavoriteMaterial?: boolean;
  pbrMapType?: PbrMapType;
  pbrMapTypes?: PbrMapType[];
  missingMaps?: PbrMapType[];
  materialCompletenessScore?: number;
  materialNeedsReview?: boolean;
  hasMaterialWarnings?: boolean;
  hasMaterialErrors?: boolean;
  materialTargetEngine?: MaterialTargetEngine;
  materialOverrideCount?: number;
  hasMaterialOverrides?: boolean;
  hasResolutionMismatch?: boolean;
}

export type AssetSortMode =
  | 'name_asc'
  | 'name_desc'
  | 'date_desc'
  | 'date_asc'
  | 'size_desc'
  | 'size_asc'
  | 'type';

export type AiProcessingMode =
  | 'enhance'
  | 'remove_bg'
  | 'upscale'
  | 'portrait'
  | 'ue5'
  | 'prompt_edit';

export type AiJobStatus =
  | 'queued'
  | 'preparing'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'placeholder';

export interface AiProcessingJob {
  id: string;
  assetId: string;
  assetName: string;
  mode: AiProcessingMode;
  status: AiJobStatus;
  createdAt: string;
  updatedAt: string;
  prompt?: string;
  progress?: number;
  message?: string;
  variantId?: string;
  error?: string;
  adapterId?: string;
  adapterLabel?: string;
}

export type AiAdapterKind =
  | 'placeholder'
  | 'browser_worker'
  | 'tauri_sidecar'
  | 'comfyui_local'
  | 'python_local'
  | 'external_api';

export type AiAdapterStatus = 'available' | 'unavailable' | 'not_configured' | 'checking' | 'error';

export interface AiAdapterCapabilities {
  enhance: boolean;
  removeBg: boolean;
  upscale: boolean;
  upscaleEngine?: string;
  realEsrgan?: boolean;
  realEsrganStatus?: RealEsrganStatus;
  supportedUpscaleScales?: number[];
  supportedUpscaleEngines?: string[];
  supportedUpscaleQualityPresets?: UpscaleQualityPreset[];
  supportedUpscaleTileSizes?: number[];
  supportedUpscaleTilePads?: number[];
  recommendedUpscaleModelId?: string;
  modelsDir?: string;
  realEsrganModels?: LocalUpscaleModelInfo[];
  portrait: boolean;
  ue5: boolean;
  promptEdit: boolean;
  returnsImage: boolean;
  supportsProgress: boolean;
  supportsCancel: boolean;
}

export interface AiAdapterInfo {
  id: string;
  kind: AiAdapterKind;
  label: string;
  status: AiAdapterStatus;
  capabilities: AiAdapterCapabilities;
  message?: string;
}

export interface AiProcessRequest {
  jobId: string;
  assetId: string;
  assetName: string;
  mode: AiProcessingMode;
  prompt?: string;
  objectUrl?: string;
  file?: File;
  scale?: number;
  engine?: UpscaleEngine | string;
  qualityPreset?: UpscaleQualityPreset;
  tileSize?: number;
  tilePad?: number;
  modelId?: string;
}

export interface AiProcessResult {
  ok: boolean;
  status: 'completed' | 'placeholder' | 'failed' | 'cancelled';
  message: string;
  outputObjectUrl?: string;
  outputBlob?: Blob;
  outputMimeType?: string;
  outputFilename?: string;
  outputWidth?: number;
  outputHeight?: number;
  scale?: number;
  engine?: string;
  qualityPreset?: UpscaleQualityPreset;
  tileSize?: number;
  tilePad?: number;
  requestedEngine?: UpscaleEngine | string;
  actualEngine?: string;
  fallbackFrom?: string;
  realEsrganStatus?: RealEsrganStatus;
  modelId?: string;
  modelStatus?: RealEsrganStatus | LocalUpscaleModelStatus;
  memoryMode?: string;
  estimatedCost?: string;
}

export interface ProcessedImageResult {
  blob: Blob;
  objectUrl: string;
  width: number;
  height: number;
  mimeType: string;
  filenameSuffix: string;
}

export type AssetFilterMode =
  | 'all'
  | 'images'
  | 'videos'
  | 'folders'
  | 'png'
  | 'jpg'
  | 'webp'
  | 'svg'
  | 'gif'
  | 'bmp';

export type SelectionMode = 'single' | 'multiple';
export type ViewMode = ViewDensity;
export type EditorProcessingStatus = 'idle' | 'ready' | 'mock-processing' | 'completed' | 'error';

export interface ToolMode {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  chips: string[];
  action: string;
  icon: LucideIcon;
}

export interface LibraryAsset {
  id: number;
  name: string;
  type: string;
  size: string;
  badges: string[];
  url: string;
}

export interface FolderAsset {
  id: number;
  name: string;
  count: number;
  type: string;
  previews: string[];
}

export type MediaKind = 'image' | 'video' | 'folder' | 'unknown';

export type OrganizationConfidence = 'manual' | 'suggested' | 'detected' | 'unknown';

export interface PersonCluster {
  id: string;
  label: string;
  displayName?: string;
  status: 'unnamed' | 'named' | 'ignored';
  assetIds: string[];
  confidence: OrganizationConfidence;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceTag {
  id: string;
  label: string;
  source: 'exif' | 'manual' | 'suggested' | 'unknown';
  confidence: OrganizationConfidence;
}

export interface EventCluster {
  id: string;
  label: string;
  dateRange?: { from?: string; to?: string };
  assetIds: string[];
  confidence: OrganizationConfidence;
  createdAt: string;
  updatedAt: string;
}

export interface MediaOrganizationMetadata {
  mediaKind: MediaKind;
  people?: string[];
  personClusterIds?: string[];
  places?: string[];
  eventIds?: string[];
  visualTags?: string[];
  qualityFlags?: string[];
  isDuplicateCandidate?: boolean;
  duplicateGroupId?: string;
  isScreenshot?: boolean;
  isVideo?: boolean;
  dateTaken?: string;
  cameraModel?: string;
  organizationNotes?: string[];
  organizationConfidence?: OrganizationConfidence;
}

export type SmartFolderKind =
  | 'photo_folder'
  | 'video_folder'
  | 'screenshot_folder'
  | 'cutout_folder'
  | 'upscale_folder'
  | 'export_folder'
  | 'pbr_material_folder'
  | 'texture_set_folder'
  | 'project_folder'
  | 'unknown_folder';

export type SmartFolderStatus = 'ready' | 'partial' | 'needs_review' | 'unknown';

export type PbrMapType =
  | 'base_color'
  | 'albedo'
  | 'diffuse'
  | 'normal'
  | 'roughness'
  | 'metallic'
  | 'ambient_occlusion'
  | 'height'
  | 'displacement'
  | 'opacity'
  | 'alpha'
  | 'emissive'
  | 'specular'
  | 'gloss'
  | 'unknown';

export type MaterialFolderStatus = 'complete' | 'partial' | 'texture_set' | 'unknown';
export type MaterialCategory = 'wood' | 'metal' | 'stone' | 'fabric' | 'plastic' | 'organic' | 'ground' | 'wall' | 'ceramic' | 'glass' | 'tile' | 'skin' | 'other' | 'unknown';
export type MaterialTargetEngine = 'generic' | 'blender' | 'unreal' | 'unity';
export type MaterialDiagnosticSeverity = 'info' | 'warning' | 'error';

export type MaterialDiagnosticCode =
  | 'missing_base_color'
  | 'missing_normal'
  | 'missing_roughness'
  | 'missing_ao'
  | 'missing_metallic'
  | 'partial_material'
  | 'needs_review'
  | 'resolution_mismatch'
  | 'mixed_formats'
  | 'duplicate_map_type'
  | 'unknown_map'
  | 'low_confidence_detection'
  | 'filename_conflict'
  | 'ready_for_generic'
  | 'ready_for_blender'
  | 'ready_for_unreal'
  | 'ready_for_unity';

export interface SmartFolderMetadata {
  id: string;
  folderAssetId: string;
  folderName: string;
  kind: SmartFolderKind;
  status: SmartFolderStatus;
  childAssetIds: string[];
  detectedAt: string;
  updatedAt: string;
  confidence: 'high' | 'medium' | 'low';
  summary?: string;
  warnings?: string[];
  tags?: string[];
}

export interface PbrTextureMap {
  id: string;
  assetId: string;
  fileName: string;
  mapType: PbrMapType;
  originalMapType?: PbrMapType;
  isManualOverride?: boolean;
  format: string;
  width?: number;
  height?: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface MaterialDiagnosticItem {
  id: string;
  code: MaterialDiagnosticCode;
  severity: MaterialDiagnosticSeverity;
  title: string;
  message: string;
  affectedMapIds?: string[];
  recommendation?: string;
}

export interface MaterialCompletenessProfile {
  score: number;
  requiredMaps: PbrMapType[];
  optionalMaps: PbrMapType[];
  presentRequiredMaps: PbrMapType[];
  missingRequiredMaps: PbrMapType[];
  presentOptionalMaps: PbrMapType[];
  missingOptionalMaps: PbrMapType[];
  targetEngine: MaterialTargetEngine;
}

export interface MaterialResolutionProfile {
  dominantWidth?: number;
  dominantHeight?: number;
  hasResolutionMismatch: boolean;
  resolutions: Array<{ mapType: PbrMapType; width?: number; height?: number; fileName: string }>;
}

export interface MaterialDiagnostics {
  materialId: string;
  completeness: MaterialCompletenessProfile;
  resolution: MaterialResolutionProfile;
  items: MaterialDiagnosticItem[];
  generatedAt: string;
}

export interface MaterialFolderMetadata {
  id: string;
  folderAssetId: string;
  folderName: string;
  status: MaterialFolderStatus;
  maps: PbrTextureMap[];
  missingMaps: PbrMapType[];
  detectedAt: string;
  updatedAt: string;
  materialName?: string;
  category?: MaterialCategory;
  notes?: string;
  isFavorite?: boolean;
  targetEngine?: MaterialTargetEngine;
  diagnostics?: MaterialDiagnostics;
  completenessScore?: number;
  hasWarnings?: boolean;
  hasErrors?: boolean;
  needsReview?: boolean;
}

export type GalleryItemKind = 'folder' | 'image' | 'video';
export type FolderSourceKind = 'persistent_handle' | 'webkit_fallback' | 'dropped_files' | 'native_bridge' | 'metadata_only';
export type FolderSourceStatus = 'connected' | 'reconnect_required' | 'temporary' | 'unavailable' | 'scanning';

export interface BatchActionPlan {
  id: string;
  itemIds: string[];
  action: 'export_png' | 'export_svg' | 'ai_enhance';
  status: 'ready' | 'unsupported' | 'future';
}

export interface FolderSource {
  id: string;
  name: string;
  pathLabel: string;
  kind?: FolderSourceKind;
  status?: FolderSourceStatus;
  imageCount: number;
  videoCount?: number;
  folderCount: number;
  createdAt: string;
  updatedAt?: string;
  lastOpenedAt?: string;
  canReconnect?: boolean;
  hasPersistentHandle?: boolean;
}

export type AssetVariantKind =
  | 'original'
  | 'png_export'
  | 'svg_container'
  | 'ai_preview'
  | 'enhanced'
  | 'cutout'
  | 'refined_cutout'
  | 'upscaled'
  | 'portrait'
  | 'ue5'
  | 'adjustment';

export interface CutoutRefinementSettings {
  trimTransparentPixels: boolean;
  padding: number;
  shadowPreview: boolean;
  shadowOpacity: number;
  shadowBlur: number;
}

export type CutoutSettings = CutoutRefinementSettings;

export interface ImageAdjustmentSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  sharpness: number;
}

export interface ImageAdjustmentPreset {
  id: string;
  label: string;
  description?: string;
  settings: ImageAdjustmentSettings;
  builtIn?: boolean;
  createdAt?: string;
}

export interface AdjustmentHistoryEntry {
  id: string;
  label: string;
  settings: ImageAdjustmentSettings;
  createdAt: string;
}

export type AssetVariantStatus = 'ready' | 'pending' | 'placeholder' | 'failed';

export interface AssetVariant {
  id: string;
  assetId: string;
  kind: AssetVariantKind;
  label: string;
  status: AssetVariantStatus;
  createdAt: string;
  filename?: string;
  objectUrl?: string; // Session only
  file?: File; // Session only
  sessionOnly?: boolean;
  metadataOnly?: boolean;
  sourceJobId?: string;
  mimeType?: string;
  sizeLabel?: string;
  width?: number;
  height?: number;
  note?: string;
  hasAlpha?: boolean;
  cutoutSettings?: CutoutSettings;
  refinedFromVariantId?: string;
  upscaleScale?: number;
  upscaleEngine?: string;
  upscaleQualityPreset?: UpscaleQualityPreset;
  tileSize?: number;
  tilePad?: number;
  requestedEngine?: UpscaleEngine | string;
  actualEngine?: string;
  fallbackFrom?: string;
  realEsrganStatus?: RealEsrganStatus;
  modelId?: string;
  modelStatus?: RealEsrganStatus | LocalUpscaleModelStatus;
  memoryMode?: string;
  estimatedCost?: string;
  originalWidth?: number;
  originalHeight?: number;
  outputWidth?: number;
  outputHeight?: number;
  adjustmentSettings?: ImageAdjustmentSettings;
  presetId?: string;
  presetLabel?: string;
}

export interface GalleryFolderItem {
  id: string;
  kind: 'folder';
  mediaKind?: 'folder';
  name: string;
  pathLabel: string;
  imageCount: number;
  videoCount?: number;
  previewUrls: string[];
  handle?: FileSystemDirectoryHandle;
  nativePath?: string;
  childAssetIds?: string[];
  isSmartFolder?: boolean;
  smartFolderKind?: SmartFolderKind;
  smartFolder?: SmartFolderMetadata;
  isMaterialFolder?: boolean;
  material?: MaterialFolderMetadata;
}

export interface GalleryImageItem {
  id: string;
  kind: 'image';
  mediaKind?: 'image';
  name: string;
  type: string;
  size: string;
  badges: string[];
  objectUrl: string;
  file?: File;
  lastModified?: number;
  nativePath?: string;
  pbrMapType?: PbrMapType;
  metadata?: {
    width?: number;
    height?: number;
    aspectRatio?: string;
    formattedSize?: string;
    extension?: string;
    modifiedLabel?: string;
    fileName?: string;
    mediaKind?: MediaKind;
    organization?: MediaOrganizationMetadata;
    smartFolder?: SmartFolderMetadata;
    material?: MaterialFolderMetadata;
  };
}

export interface GalleryVideoItem {
  id: string;
  kind: 'video';
  mediaKind?: 'video';
  name: string;
  type: string;
  size: string;
  badges: string[];
  objectUrl?: string;
  file?: File;
  lastModified?: number;
  nativePath?: string;
  metadata?: {
    width?: number;
    height?: number;
    aspectRatio?: string;
    formattedSize?: string;
    extension?: string;
    modifiedLabel?: string;
    fileName?: string;
    mediaKind?: MediaKind;
    organization?: MediaOrganizationMetadata;
    smartFolder?: SmartFolderMetadata;
  };
}

export type GalleryItem = GalleryFolderItem | GalleryImageItem | GalleryVideoItem;
export interface SmartCollection {
  id: string;
  kind: SmartCollectionKind;
  label: string;
  description?: string;
  builtIn: boolean;
  icon?: string;
  createdAt?: string;
  criteria: SmartCollectionCriteria;
}

export interface SavedView {
  id: string;
  label: string;
  createdAt: string;
  criteria: SmartCollectionCriteria;
}

export interface ThumbnailCacheEntry {
  id: string;
  assetId: string;
  cacheKey: string;
  width: number;
  height: number;
  mimeType: string;
  size: number;
  createdAt: string;
  updatedAt: string;
  blob?: Blob;
}

export interface ThumbnailGenerationOptions {
  maxWidth: number;
  maxHeight: number;
  quality: number;
  mimeType: 'image/jpeg' | 'image/webp' | 'image/png';
}

export interface PerformanceSnapshot {
  imageCount: number;
  folderCount: number;
  objectUrlCount?: number;
  thumbnailCount?: number;
  estimatedMemoryLabel?: string;
}

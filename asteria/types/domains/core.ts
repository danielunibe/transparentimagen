import { LucideIcon } from 'lucide-react';

export type AppView = 'library' | 'editor' | 'organizer' | 'smart_folders' | 'materials';
export type EditorViewMode = 'compare' | 'before' | 'after' | 'split';
export type TransparentPreviewBackground = 'checkerboard' | 'white' | 'black' | 'dark';
export type PreviewBgMode = TransparentPreviewBackground;

export type ExportFormat = 'png' | 'svg';
export type ExportSourceMode = 'original' | 'active_variant' | 'specific_variant';
export type ExportJobStatus = 'queued' | 'preparing' | 'exporting' | 'completed' | 'failed' | 'cancelled' | 'unsupported';

export interface ExportRecipe {
  id: string;
  label: string;
  format: ExportFormat;
  sourceMode: ExportSourceMode;
  description?: string;
}

export interface ExportJob {
  id: string;
  assetId: string;
  assetName: string;
  format: ExportFormat;
  sourceMode: ExportSourceMode;
  status: ExportJobStatus;
  createdAt: string;
  updatedAt: string;
  filename?: string;
  variantId?: string;
  variantLabel?: string;
  message?: string;
  error?: string;
}

export interface BatchExportPlan {
  id: string;
  itemIds: string[];
  recipeId: string;
  createdAt: string;
  status: ExportJobStatus;
}

export type ExportPackageStatus = 'draft' | 'queued' | 'preparing' | 'exporting' | 'completed' | 'failed' | 'partial' | 'unsupported';
export type ExportPackageFormat = 'folder_manifest' | 'zip_future' | 'native_folder_future';

export type UpscaleEngine = 'auto' | 'pillow' | 'pillow_lanczos' | 'real-esrgan' | 'real_esrgan';
export type UpscaleQualityPreset = 'fast' | 'balanced' | 'quality' | 'max';

export type RealEsrganStatus = 'available' | 'dependency_missing' | 'model_missing' | 'model_invalid' | 'inference_failed' | 'unsupported' | 'error';
export type LocalUpscaleModelStatus = 'available' | 'missing' | 'invalid' | 'untested' | 'dependency_missing' | 'inference_failed';

export interface LocalUpscaleModelInfo {
  id: string;
  filename: string;
  label: string;
  engine: 'real_esrgan';
  scale: 2 | 4;
  exists: boolean;
  status: LocalUpscaleModelStatus;
  message?: string;
  sizeBytes?: number;
  lastModified?: string;
}

export interface ExportPackageItem {
  id: string;
  assetId: string;
  assetName: string;
  exportFormat: ExportFormat;
  sourceMode: ExportSourceMode;
  variantId?: string;
  variantLabel?: string;
  hasAlpha?: boolean;
  cutoutKind?: 'cutout' | 'refined_cutout';
  variantKind?: string;
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
  outputWidth?: number;
  outputHeight?: number;
  smartFolderKind?: string;
  materialName?: string;
  materialStatus?: string;
  maps?: Array<{ type: string; fileName: string }>;
  missingMaps?: string[];
  category?: string;
  favorite?: boolean;
  materialDiagnostics?: {
    completenessScore: number;
    targetEngine: string;
    missingRequiredMaps: string[];
    missingOptionalMaps: string[];
    hasWarnings: boolean;
    hasErrors: boolean;
    hasResolutionMismatch: boolean;
    diagnostics: Array<{ code: string; severity: string; message: string }>;
  };
  outputFilename: string;
  outputPath?: string;
  nativeSaved?: boolean;
  status: ExportJobStatus;
  message?: string;
  error?: string;
}

export interface ExportPackageManifest {
  id: string;
  label: string;
  createdAt: string;
  appName: 'Asteria';
  format: ExportPackageFormat;
  itemCount: number;
  completedCount: number;
  failedCount: number;
  items: ExportPackageItem[];
  notes?: string[];
}

export interface ExportPackageJob {
  id: string;
  label: string;
  status: ExportPackageStatus;
  createdAt: string;
  updatedAt: string;
  format: ExportPackageFormat;
  itemIds: string[];
  manifest?: ExportPackageManifest;
  outputDirectory?: string;
  nativeExport?: boolean;
  savedFileCount?: number;
  skippedFileCount?: number;
  message?: string;
  error?: string;
}

export type ViewDensity = 'grid' | 'large' | 'compact' | 'list';
export type ActiveModeId = 'enhance' | 'remove_bg' | 'upscale' | 'portrait' | 'ue5';
export type EditorProcessingMode = 'idle' | ActiveModeId;

export type SmartCollectionKind =
  | 'recently_edited'
  | 'has_variants'
  | 'ai_processed'
  | 'exported'
  | 'adjusted'
  | 'metadata_only'
  | 'session_outputs'
  | 'images'
  | 'photos'
  | 'videos'
  | 'screenshots'
  | 'unorganized'
  | 'missing_metadata'
  | 'large_files'
  | 'by_year'
  | 'recently_imported'
  | 'possible_duplicates'
  | 'folders'
  | 'cutouts'
  | 'upscaled'
  | 'smart_folders'
  | 'photo_folders'
  | 'video_folders'
  | 'pbr_material_folders'
  | 'texture_set_folders'
  | 'needs_review_folders'
  | 'materials'
  | 'complete_pbr_materials'
  | 'partial_pbr_materials'
  | 'texture_sets'
  | 'missing_normal_map'
  | 'missing_roughness_map'
  | 'favorite_materials'
  | 'custom';

export interface SmartCollectionCriteria {
  filterMode?: string;
  sortMode?: string;
  viewDensity?: ViewDensity;
  mediaKind?: string;
  hasVariants?: boolean;
  hasCutout?: boolean;
  hasUpscaled?: boolean;
  hasAiJobs?: boolean;
  hasExports?: boolean;
  hasAdjustments?: boolean;
  hasMetadataOnlyVariants?: boolean;
  hasSessionOutputs?: boolean;
  isScreenshot?: boolean;
  isUnorganized?: boolean;
  hasMissingMetadata?: boolean;
  isLargeFile?: boolean;
  isDuplicateCandidate?: boolean;
  year?: string;
  isSmartFolder?: boolean;
  smartFolderKind?: string;
  smartFolderStatus?: string;
  isMaterialFolder?: boolean;
  materialStatus?: string;
  pbrMapType?: string;
  missingMapType?: string;
  isFavoriteMaterial?: boolean;
  materialCategory?: string;
  materialReady?: boolean;
  materialNeedsReview?: boolean;
  hasMaterialWarnings?: boolean;
  hasMaterialErrors?: boolean;
  readyTarget?: string;
  hasResolutionMismatch?: boolean;
  minCompletenessScore?: number;
  searchQuery?: string;
}

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

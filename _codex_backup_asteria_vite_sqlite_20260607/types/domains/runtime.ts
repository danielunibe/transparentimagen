export type RuntimeAvailability =
  | 'available'
  | 'unavailable'
  | 'missing_dependency'
  | 'missing_model'
  | 'unsupported'
  | 'browser_fallback'
  | 'tauri_only'
  | 'unknown';

export type RuntimeFeatureId =
  | 'python_sidecar'
  | 'tauri_runtime'
  | 'browser_canvas'
  | 'file_system_access'
  | 'remove_bg'
  | 'upscale_pillow'
  | 'upscale_real_esrgan'
  | 'onnxruntime'
  | 'rembg'
  | 'model_manager'
  | 'package_export'
  | 'native_file_open'
  | 'native_save'
  | 'webgl'
  | 'material_3d_preview';

export interface RuntimeModelStatus {
  id: string;
  fileName: string;
  present: boolean;
  valid?: boolean;
  path?: string;
  message?: string;
}

export interface RuntimeFeatureStatus {
  id: RuntimeFeatureId;
  label: string;
  availability: RuntimeAvailability;
  available: boolean;
  reason?: string;
  message?: string;
  requiresTauri?: boolean;
  requiresPython?: boolean;
  requiresModel?: boolean;
  modelName?: string;
  checkedAt?: string;
}

export interface RuntimeCapabilitySnapshot {
  checkedAt: string;
  isTauri: boolean;
  isBrowser: boolean;
  pythonSidecar?: RuntimeFeatureStatus;
  features: RuntimeFeatureStatus[];
  models?: RuntimeModelStatus[];
}

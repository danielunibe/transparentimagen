import { RuntimeAvailability, RuntimeCapabilitySnapshot, RuntimeFeatureId, RuntimeFeatureStatus, RuntimeModelStatus } from '@/types/domains/runtime';

export function normalizeRuntimeAvailability(input?: string | null): RuntimeAvailability {
  const normalized = String(input || '').trim().toLowerCase();
  if (['available', 'unavailable', 'missing_dependency', 'missing_model', 'unsupported', 'browser_fallback', 'tauri_only', 'unknown'].includes(normalized)) {
    return normalized as RuntimeAvailability;
  }
  return 'unknown';
}

export function getRuntimeFeatureLabel(featureId: RuntimeFeatureId): string {
  switch (featureId) {
    case 'python_sidecar': return 'Python Sidecar';
    case 'tauri_runtime': return 'Tauri Runtime';
    case 'browser_canvas': return 'Browser Canvas';
    case 'file_system_access': return 'File System Access';
    case 'remove_bg': return 'Remove BG';
    case 'upscale_pillow': return 'Upscale Pillow';
    case 'upscale_real_esrgan': return 'Real-ESRGAN Upscale';
    case 'onnxruntime': return 'ONNX Runtime';
    case 'rembg': return 'rembg';
    case 'model_manager': return 'Model Manager';
    case 'package_export': return 'Package Export';
    case 'native_file_open': return 'Native File Open';
    case 'native_save': return 'Native Save';
    case 'webgl': return 'WebGL';
    case 'material_3d_preview': return 'Material 3D Preview';
    default: return featureId;
  }
}

export function createRuntimeFeatureStatus(params: Omit<RuntimeFeatureStatus, 'label'> & { label?: string }): RuntimeFeatureStatus {
  const { label, ...rest } = params;
  return {
    ...rest,
    label: label || getRuntimeFeatureLabel(params.id),
    availability: rest.availability || 'unknown',
    available: Boolean(rest.available),
    checkedAt: rest.checkedAt || new Date().toISOString(),
  };
}

export function getRuntimeFeatureStatus(snapshot: RuntimeCapabilitySnapshot | null | undefined, featureId: RuntimeFeatureId): RuntimeFeatureStatus | undefined {
  return snapshot?.features.find(feature => feature.id === featureId);
}

export function isFeatureAvailable(snapshot: RuntimeCapabilitySnapshot | null | undefined, featureId: RuntimeFeatureId): boolean {
  return Boolean(getRuntimeFeatureStatus(snapshot, featureId)?.available);
}

export function explainUnavailableFeature(status?: RuntimeFeatureStatus | null): string {
  if (!status) return 'Feature status is unknown.';
  if (status.available) return status.message || `${status.label} is available.`;
  return status.message || status.reason || `${status.label} is not available.`;
}

export function mergeSidecarCapabilities(
  base: RuntimeFeatureStatus | undefined,
  override: Partial<RuntimeFeatureStatus> | undefined
): RuntimeFeatureStatus | undefined {
  if (!base && !override) return undefined;
  const merged = {
    ...(base || {}),
    ...(override || {}),
  } as RuntimeFeatureStatus;
  merged.label = merged.label || (base?.label || 'Python Sidecar');
  merged.checkedAt = merged.checkedAt || new Date().toISOString();
  return merged;
}

export function mergeModelStatuses(...groups: Array<RuntimeModelStatus[] | undefined>): RuntimeModelStatus[] {
  const map = new Map<string, RuntimeModelStatus>();
  for (const group of groups) {
    for (const model of group || []) {
      map.set(model.id, { ...map.get(model.id), ...model });
    }
  }
  return [...map.values()];
}

export function buildRuntimeCapabilitySnapshot(params: {
  checkedAt?: string;
  isTauri: boolean;
  isBrowser: boolean;
  pythonSidecar?: RuntimeFeatureStatus;
  features: RuntimeFeatureStatus[];
  models?: RuntimeModelStatus[];
}): RuntimeCapabilitySnapshot {
  return {
    checkedAt: params.checkedAt || new Date().toISOString(),
    isTauri: params.isTauri,
    isBrowser: params.isBrowser,
    pythonSidecar: params.pythonSidecar,
    features: params.features,
    models: params.models,
  };
}

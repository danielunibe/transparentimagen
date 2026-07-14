import { getRuntimeCapabilities, getRuntimeKind, supportsFileSystemAccess } from './runtimeService';
import { checkPythonSidecar, getPythonSidecarCapabilities, isTauriAvailable } from './tauriBridge';
import { listLocalModels, validateLocalModels } from './localModelService';
import { buildRuntimeCapabilitySnapshot, createRuntimeFeatureStatus, mergeModelStatuses, normalizeRuntimeAvailability } from './runtimeCapabilityService';
import type { RuntimeModelStatus } from '@/types/domains/runtime';

let lastSnapshot: any = null;
let lastSnapshotAt = '';

export async function collectBrowserCapabilities() {
  const isBrowser = typeof window !== 'undefined' && !isTauriAvailable();
  const canvasAvailable = typeof document !== 'undefined' && Boolean(document.createElement('canvas').getContext('2d'));
  const webglAvailable = typeof document !== 'undefined' && Boolean(document.createElement('canvas').getContext('webgl') || document.createElement('canvas').getContext('experimental-webgl'));
  return { isBrowser, canvasAvailable, webglAvailable };
}

export async function collectTauriCapabilities() {
  return {
    isTauri: isTauriAvailable(),
    runtimeKind: getRuntimeKind(),
    runtime: getRuntimeCapabilities(),
  };
}

export async function collectPythonSidecarCapabilities() {
  const health = await checkPythonSidecar();
  const sidecarCaps = await getPythonSidecarCapabilities();
  return { health, sidecarCaps };
}

export async function collectModelStatuses() {
  const [listed, validated] = await Promise.all([listLocalModels(), validateLocalModels()]);
  const toRuntimeModel = (model: any): RuntimeModelStatus => ({
    id: model.id,
    fileName: model.filename || model.fileName || model.id,
    present: Boolean(model.exists),
    valid: model.status === 'available' ? true : model.status === 'invalid' ? false : undefined,
    path: model.path,
    message: model.message,
  });
  return mergeModelStatuses((listed?.models || []).map(toRuntimeModel), (validated?.models || []).map(toRuntimeModel));
}

export async function collectRuntimeCapabilitySnapshot() {
  const checkedAt = new Date().toISOString();
  const { isBrowser, canvasAvailable, webglAvailable } = await collectBrowserCapabilities();
  const { isTauri, runtime } = await collectTauriCapabilities();
  const { health, sidecarCaps } = await collectPythonSidecarCapabilities();
  const models = await collectModelStatuses();
  let threeAvailable = false;
  if (typeof window !== 'undefined') {
    try {
      await import('three');
      threeAvailable = true;
    } catch {
      threeAvailable = false;
    }
  }
  const pythonFeature = createRuntimeFeatureStatus({
    id: 'python_sidecar',
    availability: normalizeRuntimeAvailability(health?.ok ? 'available' : health?.status || 'unavailable'),
    available: Boolean(health?.ok),
    reason: health?.message || sidecarCaps?.message || 'Python sidecar is unavailable.',
    message: health?.message || sidecarCaps?.message || 'Python sidecar is unavailable.',
    requiresTauri: true,
    requiresPython: true,
    checkedAt,
  });

  const features = [
    createRuntimeFeatureStatus({
      id: 'tauri_runtime',
      availability: isTauri ? 'available' : 'unavailable',
      available: isTauri,
      reason: isTauri ? undefined : 'Native Tauri runtime is not available.',
      message: isTauri ? 'Tauri runtime available.' : 'This action requires the native Tauri runtime.',
      requiresTauri: true,
      checkedAt,
    }),
    createRuntimeFeatureStatus({
      id: 'browser_canvas',
      availability: canvasAvailable ? 'available' : 'unsupported',
      available: canvasAvailable,
      reason: canvasAvailable ? undefined : 'Canvas 2D API not available.',
      message: canvasAvailable ? 'Browser canvas is available.' : 'Browser fallback is limited because canvas is unavailable.',
      checkedAt,
    }),
    createRuntimeFeatureStatus({
      id: 'file_system_access',
      availability: supportsFileSystemAccess() ? 'available' : (isBrowser ? 'browser_fallback' : 'tauri_only'),
      available: supportsFileSystemAccess() || isTauri,
      reason: supportsFileSystemAccess() ? undefined : (isTauri ? 'Use native Tauri file operations.' : 'File System Access API not available.'),
      message: supportsFileSystemAccess() ? 'Browser File System Access is available.' : (isTauri ? 'This action requires Tauri for native file access.' : 'Browser fallback is limited for file operations.'),
      requiresTauri: !supportsFileSystemAccess(),
      checkedAt,
    }),
    createRuntimeFeatureStatus({
      id: 'webgl',
      availability: webglAvailable ? 'available' : 'unsupported',
      available: webglAvailable,
      message: webglAvailable ? 'WebGL is available.' : 'WebGL is unavailable in this browser.',
      checkedAt,
    }),
    createRuntimeFeatureStatus({
      id: 'package_export',
      availability: 'available',
      available: true,
      message: 'Package export is available.',
      checkedAt,
    }),
  ];

  const sidecarAvailable = Boolean(health?.ok && sidecarCaps?.ok);
  const sidecarModels = Array.isArray(sidecarCaps?.capabilities?.realEsrganModels) ? sidecarCaps.capabilities.realEsrganModels : [];
  const hasRealEsrganModel = sidecarModels.some((model: any) => model?.exists && model?.status === 'available');
  const hasRembg = Boolean(sidecarCaps?.capabilities?.removeBgPipelineReady || sidecarCaps?.capabilities?.removeBg);
  const hasOnnx = Boolean(sidecarCaps?.dependencyStatus?.onnxruntime);

  features.push(
    createRuntimeFeatureStatus({
      id: 'rembg',
      availability: hasRembg ? 'available' : (sidecarAvailable ? 'missing_dependency' : 'unavailable'),
      available: hasRembg,
      reason: hasRembg ? undefined : 'rembg is not available in the Python sidecar.',
      message: hasRembg ? 'Remove BG is available.' : 'Remove BG requires rembg in the Python sidecar.',
      requiresPython: true,
      checkedAt,
    }),
    createRuntimeFeatureStatus({
      id: 'onnxruntime',
      availability: hasOnnx ? 'available' : (sidecarAvailable ? 'missing_dependency' : 'unavailable'),
      available: hasOnnx,
      reason: hasOnnx ? undefined : 'onnxruntime is not installed in the Python environment.',
      message: hasOnnx ? 'ONNX Runtime is available.' : 'ONNX Runtime is missing in the Python sidecar environment.',
      requiresPython: true,
      checkedAt,
    }),
    createRuntimeFeatureStatus({
      id: 'upscale_pillow',
      availability: sidecarAvailable ? 'available' : 'unavailable',
      available: sidecarAvailable,
      message: sidecarAvailable ? 'Pillow upscale is available as a fallback.' : 'Pillow upscale requires the Python sidecar.',
      requiresPython: true,
      checkedAt,
    }),
    createRuntimeFeatureStatus({
      id: 'upscale_real_esrgan',
      availability: hasRealEsrganModel ? 'available' : 'missing_model',
      available: hasRealEsrganModel,
      reason: hasRealEsrganModel ? undefined : 'Approved ONNX model is missing.',
      message: hasRealEsrganModel
        ? 'Real-ESRGAN is available.'
        : 'Real-ESRGAN model is missing. Place an approved ONNX model in the local models folder.',
      requiresPython: true,
      requiresModel: true,
      modelName: sidecarCaps?.capabilities?.recommendedUpscaleModelId,
      checkedAt,
    }),
    createRuntimeFeatureStatus({
      id: 'model_manager',
      availability: isTauri ? 'available' : 'tauri_only',
      available: isTauri,
      reason: isTauri ? undefined : 'Model management requires Tauri.',
      message: isTauri ? 'Model manager available.' : 'Model manager requires the native Tauri runtime.',
      requiresTauri: true,
      checkedAt,
    }),
    createRuntimeFeatureStatus({
      id: 'native_file_open',
      availability: isTauri ? 'available' : 'tauri_only',
      available: isTauri,
      message: isTauri ? 'Native file open is available.' : 'Native file open requires Tauri.',
      requiresTauri: true,
      checkedAt,
    }),
    createRuntimeFeatureStatus({
      id: 'native_save',
      availability: isTauri ? 'available' : 'tauri_only',
      available: isTauri,
      message: isTauri ? 'Native save is available.' : 'Native save requires Tauri.',
      requiresTauri: true,
      checkedAt,
    }),
    createRuntimeFeatureStatus({
      id: 'material_3d_preview',
      availability: webglAvailable ? (threeAvailable ? 'available' : 'missing_dependency') : 'unsupported',
      available: webglAvailable && threeAvailable,
      reason: webglAvailable
        ? (threeAvailable ? undefined : 'Three.js is not available in the current bundle.')
        : 'WebGL is unavailable in this browser.',
      message: webglAvailable
        ? (threeAvailable
            ? '3D preview renderer is available.'
            : '3D preview foundation is scaffolded, but Three.js is missing from the current bundle.')
        : '3D preview is unsupported because WebGL is unavailable.',
      checkedAt,
    }),
  );

  const snapshot = buildRuntimeCapabilitySnapshot({
    checkedAt,
    isTauri,
    isBrowser,
    pythonSidecar: pythonFeature,
    features,
    models: models.length > 0 ? models : undefined,
  });

  lastSnapshot = snapshot;
  lastSnapshotAt = checkedAt;
  return snapshot;
}

export async function refreshRuntimeCapabilitySnapshot() {
  return await collectRuntimeCapabilitySnapshot();
}

export function getCachedRuntimeCapabilitySnapshot() {
  return lastSnapshot;
}

export function getCachedRuntimeCapabilitySnapshotAt() {
  return lastSnapshotAt;
}

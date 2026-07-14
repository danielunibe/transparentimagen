# Runtime Capability Truth Layer

## Problem solved

Asteria previously inferred availability from broad runtime categories like "desktop" or from adapter existence alone. That made the UI overstate what could actually run.

This layer turns runtime truth into a compact snapshot so the UI and processing paths can answer a smaller question honestly:

- Is the feature actually available right now?
- If not, why not?

## Runtime availability meanings

- `available`: the feature can execute now.
- `unavailable`: the feature cannot run in the current runtime.
- `missing_dependency`: a required package or runtime dependency is absent.
- `missing_model`: the runtime is ready, but the required model file is missing.
- `unsupported`: the current platform does not support the feature yet.
- `browser_fallback`: a reduced browser path may exist.
- `tauri_only`: native Tauri access is required.
- `unknown`: the current information is insufficient.

## What is detected

### Python sidecar

- health check
- reported capabilities
- dependency status
- model list

### Tauri

- native bridge availability
- file system support
- native open/save pathways

### Browser

- Canvas 2D
- WebGL
- File System Access API when available

### Models

- model presence
- validation status
- model-specific availability for Real-ESRGAN

## Truth rules for UI

- Never say "ready" if the runtime has not been validated.
- Never show Real-ESRGAN as available without an approved ONNX model.
- Never show Remove BG as available if `rembg` is missing.
- When fallback exists, show the fallback honestly instead of hiding the limitation.

## Real-ESRGAN rules

- Depends on model presence and model validation.
- `onnxruntime` alone is not enough.
- The UI should show `missing_model` when the approved ONNX file is absent.

## Remove BG rules

- Depends on the Python sidecar.
- Depends on `rembg`.
- If missing, the feature should report a dependency problem rather than simulating progress.

## Browser / Tauri rules

- Tauri-only features must not be advertised in browser mode.
- Browser fallback should be explicit when available.
- Browser mode should never silently trigger native file operations.

## Remaining work

- Continue converging any remaining runtime-specific labels into the shared snapshot.
- Keep the sidecar and model manager honest as the Python runtime evolves.
- Expand the layer only when a new runtime-sensitive feature is introduced.


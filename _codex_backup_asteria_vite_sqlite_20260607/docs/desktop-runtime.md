# Asteria Desktop Runtime

Asteria is the official frontend for the unified `transparentimagen` program. The legacy Python/Tkinter app remains as reference and source of reusable image-processing logic, but the final interface is `C:\Desarrollos DEV daniel\transparentimagen\asteria`.

## Technical Decision: Tauri-First

Asteria has adopted a **Tauri-First** strategy for native packaging.
Why Tauri over Electron?
1. **Lightweight**: Asteria relies on modern web technologies. Tauri leverages the OS webview instead of shipping a full Chromium binary.
2. **Security**: Tauri provides a tighter, safer bridge between the UI and system APIs.
3. **Local-First**: Perfect match for local metadata and upcoming Rust-based bindings for AI model inference or heavy image processing.

*(Note: Electron remains completely viable via `nativeBridgeContract`, but Tauri is the official target.)*

## Current Architecture Status

The application is structured to gracefully adapt to its environment:
- **`services/runtimeService.ts`**: Safely detects whether it's running in Web Preview, Tauri, Electron, or a Custom Native Bridge. Exposes `RuntimeCapabilities`.
- **`services/nativeBridgeContract.ts`**: Defines pure interfaces for desktop commands (`minimize`, `showItemInFolder`, etc).
- **`services/nativeActionsService.ts`**: Implements the actions using the contracts (e.g. Locate via file manager) and gracefully falls back to web patterns.
- **`services/windowControls.ts`**: Detects if we are in a frameless native shell to display window chrome.

## Fallback Mechanisms

Inside standard Web previews (like Google AI Studio):
- File selections are handled via HTML5 `showDirectoryPicker()` (File System Access API).
- Features requiring native features (like 'Locate file in File Explorer') show a clean "Available in desktop mode" status message, maintaining UX without erroring.
- Save actions fall back to browser `Blob` downloads instead of native file-save dialogs.

## Roadmap for Packaging

1. ✅ Installed Tauri CLI and configured `src-tauri`.
2. ✅ Mapped Rust commands and plugins to `tauriBridge` and `nativeActionsService`.
3. ✅ Native Package Export: We implemented manual directory picking and native filesystem export instead of multiple ZIP blobs.
4. ✅ AI Engine Strategy: Implemented aiEngineService to prepare the fallback paths for local models and a Native Sidecar.
5. ✅ Python Sidecar MVP: Created a minimal, secure python script that Tauri executes sequentially to report health and capabilities.
6. ✅ Background Removal Pipeline: Established Native Image Pipeline passing safe inputs/outputs logic between Tauri rust layer and Python sidecar.
7. ✅ Background Removal Pipeline: `remove-bg` is wired through Tauri and the Python sidecar. It is available only when the Python executable used by Asteria can import `rembg`.
8. ✅ Batch Background Removal: Implemented batch pipelining for `remove_bg` Action, successfully creating and exporting multiple `cutout` PNG alpha variants locally.
9. ✅ Sidecar Image Ops: Split Python operations into `sidecars/python-ai/image_ops/` and exposed real `enhance`, `resize`, and `convert` commands when Pillow is available.
10. ✅ Closed Tauri Commands: Rust invokes only known sidecar subcommands and validates image input/output paths before calling Python.
11. ✅ Local Upscale MVP: Added a safe `upscale` sidecar command using Pillow/LANCZOS for 2x/3x/4x output, wired through Tauri as an individual image action.
12. ✅ Batch Upscale + Processing Reports: Multi-select batch upscale now runs sequentially through the local Python sidecar, creates non-destructive `upscaled` variants, exposes 2x/3x/4x selection, and generates downloadable JSON reports with metadata only.
13. ✅ Real-ESRGAN Safe Adapter: Asteria now detects optional local Real-ESRGAN dependencies and manual ONNX models without downloading anything automatically. `auto` falls back honestly to Pillow LANCZOS, while explicit `real-esrgan` fails honestly if dependencies or models are missing.
14. ✅ Real-ESRGAN Model Manager: The sidecar can now list allowlisted local ONNX models, validate them, run a closed smoke test, and expose the controlled models folder to Tauri without accepting arbitrary paths.
15. Next.js is kept as `standalone` output for maximum compatibility with Web deployment, using `npm run dev` for `tauri dev` server.

## Current Official Runtime

- Browser Mode: supported through File System Access and Blob download fallbacks.
- Tauri Mode: official desktop target.
- Python Sidecar: local processing bridge for confirmed capabilities.
- Local Model Policy: manual-install boundary for optional Real-ESRGAN models and dependencies.
- Local Model Manager: desktop-only model listing, validation, smoke test, and folder-open flow.
- Processing Reports: stored as lightweight metadata JSON; image blobs, object URLs, and File objects are never persisted.
- Legacy Tkinter: preserved as reference, not the primary UI.

## Python Runtime Check

Run these commands from the Asteria folder:

```bash
python --version
where python
python -c "import PIL; print('Pillow OK')"
python -c "import rembg; print('rembg OK')"
python sidecars/python-ai/asteria_sidecar.py health
python sidecars/python-ai/asteria_sidecar.py capabilities
```

If `removeBg` is false, install the sidecar dependencies into that same Python runtime:

```bash
pip install -r sidecars/python-ai/requirements.txt
```

If you want to prepare Real-ESRGAN manually, see [local-model-policy.md](./local-model-policy.md) and place the ONNX model under `sidecars/python-ai/models/`.

# Tauri Implementation Guide

Asteria has Tauri completely scaffolded and integrated using `@tauri-apps/api`. Compatibility with web preview environments (like Google AI Studio) is preserved.

## Running in Desktop Mode

If you have Rust and Cargo installed natively on your machine:
```bash
npm run tauri:dev
```
This boots up the Next.js dev server and connects the Tauri wrapper to it smoothly. 

## Features Implemented

1. **Window Controls**: Handled via `@tauri-apps/api/window` ensuring frameless shell acts like native.
2. **Native Save Dialog & File Writing**: Uses `tauri-plugin-dialog` and `tauri-plugin-fs` in `nativeActionsService.ts` for native OS file saves.
3. **Show Item In Folder**: Triggered via a custom Rust backend command `show_item_in_folder`.
4. **Fallback Handling**: Seamless fallbacks down to browser Blob downloading if Tauri context is not detected (`isTauriAvailable()`).
5. **AI Engine Strategy (Phase 24)**: Structured `aiEngineService` and `tauriSidecarAdapter` to safely determine if the local computer can boot heavy AI processes dynamically.
6. **Python Sidecar MVP (Phase 25)**: Validated secure `std::process::Command` pipes linking Tauri frontend to a sandboxed Python CLI for dynamic plugin health checking.
7. **Background Removal Pipeline (Phase 26A)**: Set up the temp folder IO pipeline between Next.js, Rust APIs and the Python subcommand.
8. **Background Removal Real Model (Phase 26B)**: The Tauri/Python command is wired. Real foreground matting requires `rembg` in the same Python runtime used by Asteria.
9. **Batch Background Removal (Phase 27)**: Allowed sequential batch processing passing files to Python sidecar, hardening Alpha-PNG export generation.
10. **Sidecar Image Ops Unification**: Added closed Tauri commands for `enhance`, `resize`, and `convert`, backed by local Python/Pillow commands. These commands do not overwrite originals and do not accept arbitrary shell input.
11. **Cutout Preview Tools**: Cutout variants support checkerboard/white/black/dark preview backgrounds, transparent trim, transparent padding, and CSS-only shadow preview.
12. **Local Upscale MVP**: Added `run_python_upscale` and frontend individual Upscale flow backed by the Python sidecar.
13. **Batch Upscale + Processing Reports**: Added multi-select Upscale with 2x/3x/4x options, sequential processing, per-item errors, `upscaled` variants, and downloadable JSON processing reports. Reports persist metadata only.
14. **Real-ESRGAN Safe Adapter**: `auto`, `pillow`, and `real-esrgan` are now supported as closed engine values. Real-ESRGAN is detected only from manual local dependencies and local ONNX files. No automatic downloads are performed.
15. **Real-ESRGAN Model Manager**: Added closed Tauri commands to list models, validate models, run smoke tests, and open the controlled models folder. Browser mode reports desktop-only honestly.

## Next Phase

Next phases should migrate only validated processing logic from the legacy Python app. UE5 texture export and portrait recovery remain legacy/reference until each receives a safe sidecar command, approved dependency/model policy, and frontend flow.

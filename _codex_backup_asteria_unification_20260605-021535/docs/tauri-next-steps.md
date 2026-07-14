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
8. **Background Removal Real Model (Phase 26B)**: Installed optional dependency `rembg[cpu]` to execute active foreground matting local AI, generating and saving Alpha-transparent object files.
9. **Batch Background Removal (Phase 27)**: Allowed sequential batch processing passing files to Python sidecar, hardening Alpha-PNG export generation.

## Next Phase

In **Phase 28**, Asteria will expand native AI powers by introducing Generative AI features (like Stable Diffusion upscaling) or exploring manual mask editing features.

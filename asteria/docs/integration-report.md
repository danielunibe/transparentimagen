# Asteria Integration Report

Date: 2026-06-05

## Official Folder

`C:\Desarrollos DEV daniel\transparentimagen\asteria` is the official frontend and desktop app folder.

## Parent Audit

The parent folder contains the legacy Python/Tkinter app under `image_enhancer/image_enhancer`. The canonical reusable files are:

- `pipeline.py`: remove background, alpha cleanup, local light/color restore, LANCZOS upscale, Real-ESRGAN tile upscale, UE5 texture export, SVG/PNG/JPEG export, batch processing, smoke tests.
- `models.py`: rembg sessions, ONNX Runtime provider handling, Real-ESRGAN and Depth Anything cache, module registry.
- `storage.py`: presets, export profiles, history, reports, settings.
- `ui.py`: legacy Tkinter UI and worker queue.
- `comfyui_client.py`: optional local ComfyUI bridge.
- `video_pipeline.py`: isolated video sprint with ffmpeg/ffprobe.

The old UI is preserved as legacy. It was not moved or deleted.

## Asteria Audit

Asteria already includes:

- Next/React app in `app/`.
- Feature modules in `features/` for shell, library, editor, inspector, jobs, batch, export, AI status, sidebar, and window chrome.
- Services for Tauri bridge, native pipeline, adapters, export, package export, folder workspace, search, smart collections, thumbnails, storage, and runtime detection.
- Python sidecar in `sidecars/python-ai`.
- Tauri Rust commands in `src-tauri/src/lib.rs`.

## Organizer Foundation

Phase 34 adds the first organizer architecture for mixed photo and video libraries:

- media detection now distinguishes images, videos, folders, and unknown files
- lightweight organization metadata can be attached per asset without persisting blobs, files, or object URLs
- videos now appear as visible media items in the library instead of being ignored during scan
- Organizer View provides summary cards, safe suggestions, and preview-only plans
- people, places, and events now have storage and UI placeholders without claiming automatic recognition
- Browser Mode remains safe and read-only for organization actions
- Tauri Mode remains the future path for confirmed file moves or copies

## Smart Folders And Material Vault

Phase 35 extends Asteria into a local Smart Folder Explorer:

- folders can now be interpreted as `photo`, `video`, `screenshot`, `cutout`, `upscale`, `export`, `pbr material`, `texture set`, `project`, or `unknown`
- Smart Folder detection stays metadata-only and does not move, rename, or modify local files
- PBR map detection now classifies base color, albedo, diffuse, normal, roughness, metallic, ambient occlusion, height, displacement, opacity, alpha, emissive, specular, and gloss by filename hints
- Material Vault introduces a first dedicated UI for complete, partial, and texture-set material folders
- Smart Collections, Search, Inspector metadata, and package manifests now understand Smart Folder and Material metadata
- 3D preview is explicitly deferred; only a future-facing placeholder is shown

## Material Diagnostics

Phase 36 upgrades Material Vault from basic detection into diagnostics:

- completeness score by target engine
- required vs optional map review
- manual map-type overrides stored as metadata only
- warnings for resolution mismatch, mixed formats, duplicate map types, and filename conflicts
- metadata-only material diagnostic report generation

Phase 36B tightens that layer into an explicit MVP:

- `MaterialCard` now surfaces score, readiness state, warning/error counts, detected maps, and missing required maps
- `MaterialInspectorPanel` exposes required/optional present vs missing maps and downloadable JSON reports
- Search supports `material:ready`, `material:review`, `material:warnings`, `material:errors`, `missing:*`, and `score:*`
- Smart Collections include ready/review/warnings/errors and missing required-map collections
- package manifests now include lightweight material diagnostic metadata such as warnings/errors plus missing required/optional maps

## Stability notes after Phase 35

- false positives around PBR folder detection were reduced by requiring stronger multi-map signals
- Material Vault UI now guards more optional fields before rendering
- Smart Folders review no longer hides every weak detection path behind a hard exclusion
- scan-time helper assets avoid carrying unnecessary `File` references for Smart Folder classification

## Migrated Or Adapted Logic

The sidecar now exposes safe local CLI operations:

- `remove-bg`: real rembg command when dependencies are installed.
- `enhance`: Pillow-based local enhancement adapted from the legacy light/color restore direction.
- `upscale`: Pillow/LANCZOS 2x/3x/4x enlargement plus optional manual Real-ESRGAN adapter with honest detection and fallback.
- `models`, `validate-models`, and `smoke-test-upscale`: closed local model-management commands for allowlisted Real-ESRGAN ONNX files.
- `resize`: Pillow LANCZOS resize.
- `convert`: Pillow PNG/JPEG/WebP conversion.
- `capabilities`: reports the current Python executable, Python version, dependency status, Real-ESRGAN status, and supported upscale engines.

## Batch Upscale And Reports

Batch processing now supports `upscale` for selected images in Tauri mode:

- Scale selection: 2x, 3x, and 4x.
- Engine selection: `auto`, `pillow`, and `real-esrgan`.
- Quality presets: `fast`, `balanced`, `quality`, and `max`.
- Advanced controls: optional `tileSize`, `tilePad`, and allowlisted `modelId`.
- Execution: sequential, one image at a time.
- Output: real session-only `upscaled` variants with scale, requested engine, actual engine, quality preset, tile controls, model id/status, original dimensions, output dimensions, fallback metadata, memory mode, estimated cost, and Real-ESRGAN status.
- Persistence: stored variants are sanitized to metadata-only; blobs, object URLs, and File objects are not persisted.
- Reports: each completed batch creates a lightweight JSON processing report with totals, per-item status, variant metadata, errors, and duration.
- Export: Package Export manifests include `variantKind: upscaled`, scale, requested engine, actual engine, quality preset, tile controls, fallback metadata, Real-ESRGAN status, model id/status, memory/cost metadata, and output dimensions when exporting upscaled variants.

## Cutout Preview Tools

The editor now keeps cutout work non-destructive:

- Preview backgrounds: checkerboard, white, black, and dark CSS backgrounds.
- Trim transparent pixels: creates a PNG with transparent bounds cropped to visible alpha.
- Padding: adds transparent padding without painting a matte.
- Shadow preview: CSS-only visual preview; it is not baked into exported PNGs.
- Refined Cutout variants: session-only PNG variants with `hasAlpha: true`.

## Real-ESRGAN Audit Outcome

The legacy implementation was audited but not copied blindly:

- It uses ONNX Runtime plus NumPy.
- It expects local ONNX model files and supports tile processing with `128` tile size and `8` tile padding.
- It can run with CPU fallback.
- It also includes automatic download/cache logic in the legacy app, which is explicitly blocked in Asteria.
- Asteria Phase 32 adds a separate local model manager instead of trusting file presence alone.

## Legacy Or Pending

These remain reference/pending:

- Depth/normal/UE5 texture set export.
- CodeFormer/GFPGAN portrait recovery.
- ComfyUI workflow execution.
- Video pipeline.

## Validation Commands

```bash
npm run build
npm run lint
npx tsc --noEmit
python sidecars/python-ai/asteria_sidecar.py health
python sidecars/python-ai/asteria_sidecar.py capabilities
cargo fmt --check --manifest-path src-tauri\Cargo.toml
cargo check --manifest-path src-tauri\Cargo.toml
```

If `removeBg` is false, run:

```bash
pip install -r sidecars/python-ai/requirements.txt
```

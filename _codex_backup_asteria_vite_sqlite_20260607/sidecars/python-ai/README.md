# Asteria Python Sidecar

This sidecar is the local processing bridge for Asteria. It exposes a small, explicit CLI consumed by Tauri Rust commands. It does not start Tkinter and does not call external cloud APIs.

## Commands

```bash
python sidecars/python-ai/asteria_sidecar.py health
python sidecars/python-ai/asteria_sidecar.py capabilities
python sidecars/python-ai/asteria_sidecar.py models
python sidecars/python-ai/asteria_sidecar.py validate-models
python sidecars/python-ai/asteria_sidecar.py smoke-test-upscale --model RealESRGAN_x4plus.onnx
python sidecars/python-ai/asteria_sidecar.py remove-bg --input input.png --output output.png
python sidecars/python-ai/asteria_sidecar.py enhance --input input.png --output output.png
python sidecars/python-ai/asteria_sidecar.py upscale --input input.png --output output.png --scale 2 --engine auto --quality balanced
python sidecars/python-ai/asteria_sidecar.py upscale --input input.png --output output.png --scale 4 --engine real-esrgan --quality quality --tile-size 128 --tile-pad 12 --model RealESRGAN_x4plus.onnx
python sidecars/python-ai/asteria_sidecar.py resize --input input.png --output output.png --width 1024
python sidecars/python-ai/asteria_sidecar.py convert --input input.png --output output.webp --format webp
```

## Capabilities

`capabilities` reports only what is actually importable in the current Python runtime:

- `removeBg`: true only when `rembg` and Pillow are installed.
- `enhance`: true when Pillow is installed.
- `upscale`: true when Pillow is installed.
- `upscaleEngine`: current default engine, normally `pillow_lanczos`.
- `realEsrgan`: true only when `onnxruntime`, `numpy`, and a manual local ONNX model are present.
- `realEsrganStatus`: `dependency_missing`, `model_missing`, or `available`.
- `supportedUpscaleEngines`: always includes `pillow_lanczos`, and adds `real_esrgan` only when it is actually ready.
- `supportedUpscaleQualityPresets`: `fast`, `balanced`, `quality`, `max`.
- `supportedUpscaleTileSizes`: `64`, `128`, `192`, `256`.
- `supportedUpscaleTilePads`: `4`, `8`, `12`, `16`.
- `recommendedUpscaleModelId`: current preferred allowlisted model id for UI defaults.
- `modelsDir`: controlled local models folder exposed as `sidecars/python-ai/models`.
- `realEsrganModels`: allowlisted model entries with status, size, and last modified metadata.
- `resize`: true when Pillow is installed.
- `convert`: true when Pillow is installed.
- `portrait` and `ue5`: false until migrated into this sidecar with validated commands.

## Batch Upscale

Batch Upscale reuses the same closed `upscale` command sequentially through Tauri. It supports 2x, 3x, and 4x with requested engine selection:

- `auto`: prefer Real-ESRGAN, otherwise fall back to Pillow LANCZOS.
- `pillow`: force Pillow LANCZOS.
- `real-esrgan`: require Real-ESRGAN or fail honestly.
- quality presets: `fast`, `balanced`, `quality`, `max`.
- optional tile controls: `tileSize` = `64 | 128 | 192 | 256`, `tilePad` = `4 | 8 | 12 | 16`.
- optional model selection: one supported allowlisted `.onnx` filename only.

It creates non-destructive `upscaled` variants and records processing reports as JSON metadata only. It does not overwrite originals and does not persist image blobs, object URLs, or File objects.

## Manual Real-ESRGAN Setup

Manual model folder:

- `sidecars/python-ai/models/`

Recognized filenames:

- `RealESRGAN_x2plus.onnx`
- `RealESRGAN_x4plus.onnx`
- `RealESRGAN_x4plus_anime_6B.onnx`
- optional matching `.data` companion file when the model needs it

Optional dependency file:

```bash
pip install -r sidecars/python-ai/requirements-realesrgan.txt
```

Asteria does not download models automatically.

Validation flow:

```bash
python sidecars/python-ai/asteria_sidecar.py models
python sidecars/python-ai/asteria_sidecar.py validate-models
python sidecars/python-ai/asteria_sidecar.py smoke-test-upscale --model RealESRGAN_x4plus.onnx
```

## Local Dependencies

```bash
pip install -r sidecars/python-ai/requirements.txt
```

Always install into the same Python runtime that Tauri will call. Confirm with:

```bash
python -c "import sys; print(sys.executable)"
python sidecars/python-ai/asteria_sidecar.py capabilities
```

The previous Python/Tkinter app remains in `../image_enhancer/image_enhancer` relative to the project parent. Its reusable processing ideas were adapted here only where they can run as safe CLI operations.

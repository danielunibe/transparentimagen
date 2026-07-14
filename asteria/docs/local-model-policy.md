# Local Model Policy

## Scope

This project is local-first. Asteria does not upload images to external APIs and does not download AI models automatically.

## Real-ESRGAN Rules

- Real-ESRGAN is optional.
- Manual installation only.
- Expected controlled folder: `sidecars/python-ai/models/`
- Supported filenames:
  - `RealESRGAN_x2plus.onnx`
  - `RealESRGAN_x4plus.onnx`
  - `RealESRGAN_x4plus_anime_6B.onnx`
- Optional external data file: matching `.data` companion file when the model needs it
- If the runtime dependencies are missing, the sidecar reports `dependency_missing`.
- If dependencies exist but the model is missing, the sidecar reports `model_missing`.
- If the file exists but fails validation, the sidecar reports `model_invalid`.
- If the file loads but test inference fails, the sidecar reports `inference_failed`.
- If dependencies and model are present, the sidecar reports `available`.

## Runtime Behavior

- `engine auto`: prefer Real-ESRGAN when available, otherwise fall back to Pillow LANCZOS.
- `engine pillow`: always use Pillow LANCZOS.
- `engine real-esrgan`: use Real-ESRGAN only; if unavailable, fail honestly with `engine_unavailable`.
- Upscale quality presets are local metadata and policy hints only: `fast`, `balanced`, `quality`, `max`.
- Tile controls are allowlisted and closed: `tileSize` = `64 | 128 | 192 | 256`, `tilePad` = `4 | 8 | 12 | 16`.
- Pillow ignores tile and model controls; Asteria still preserves the requested values in metadata, reports, and manifests.
- Optional model selection is restricted to the supported allowlist; arbitrary paths are not accepted.
- Desktop UI can open the controlled models folder directly; browser mode remains read-only and unsupported for local model management.

## Privacy And Persistence

- No images are sent to the internet.
- No external APIs are used.
- No image blobs, object URLs, or `File` objects are persisted.
- Processing reports and manifests store metadata only.

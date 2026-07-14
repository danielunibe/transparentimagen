# Local Real-ESRGAN Models

Place manual Real-ESRGAN ONNX files in this folder.

Supported ONNX filenames:

- `RealESRGAN_x2plus.onnx`
- `RealESRGAN_x4plus.onnx`
- `RealESRGAN_x4plus_anime_6B.onnx`

Optional external data file:

- `.data` companion file with the same basename if the chosen model requires it

Important rules:

- No models are included by default.
- Asteria does not download models automatically.
- If this folder is empty, Upscale still works through Pillow LANCZOS.
- If `onnxruntime` or `numpy` is missing, Asteria reports `dependency_missing`.
- If dependencies exist but the ONNX model is missing here, Asteria reports `model_missing`.
- If the file exists but cannot be loaded or validated, Asteria reports `invalid` or `inference_failed`.

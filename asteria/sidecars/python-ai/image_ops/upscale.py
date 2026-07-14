from __future__ import annotations

import importlib.util
import threading
from pathlib import Path

from .enhancement import pillow_available
from .model_manager import (
    get_models_dir,
    get_supported_realesrgan_models,
    validate_model_file,
)
from .utils import ImageOperationResult, SidecarError, validate_paths

SUPPORTED_SCALES = {2, 3, 4}
SUPPORTED_TILE_SIZES = {64, 128, 192, 256}
SUPPORTED_TILE_PADS = {4, 8, 12, 16}
SUPPORTED_QUALITY_PRESETS = {"fast", "balanced", "quality", "max"}
DEFAULT_QUALITY_PRESET = "balanced"
DEFAULT_TILE_SIZE = 128
DEFAULT_TILE_PAD = 8
DEFAULT_MODEL_ID = "RealESRGAN_x4plus.onnx"
REALESRGAN_SCALE = 4
_REALESRGAN_SESSIONS: dict[str, object] = {}
_REALESRGAN_SESSION_LOCK = threading.Lock()
_REALESRGAN_NUMPY = None

PRESET_OPTIONS = {
    "fast": {
        "tileSize": 64,
        "tilePad": 4,
        "memoryMode": "low",
        "estimatedCost": "low",
    },
    "balanced": {
        "tileSize": 128,
        "tilePad": 8,
        "memoryMode": "balanced",
        "estimatedCost": "medium",
    },
    "quality": {
        "tileSize": 192,
        "tilePad": 12,
        "memoryMode": "high",
        "estimatedCost": "high",
    },
    "max": {
        "tileSize": 256,
        "tilePad": 16,
        "memoryMode": "very_high",
        "estimatedCost": "very_high",
    },
}


def _module_available(module_name: str) -> bool:
    return importlib.util.find_spec(module_name) is not None


def _normalize_engine(engine: str) -> str:
    normalized = engine.lower().strip().replace("_", "-")
    if normalized in {"real-esrgan", "realesrgan"}:
        return "real_esrgan"
    if normalized in {"pillow", "pillow-lanczos", "pillow_lanczos"}:
        return "pillow_lanczos"
    if normalized == "auto":
        return "auto"
    return normalized


def _normalize_quality_preset(quality_preset: str | None) -> str:
    normalized = (quality_preset or DEFAULT_QUALITY_PRESET).lower().strip()
    if normalized not in SUPPORTED_QUALITY_PRESETS:
        raise SidecarError(
            "invalid_quality_preset",
            f"Unsupported upscale quality preset: {quality_preset}",
        )
    return normalized


def _validate_tile_size(tile_size: int | None) -> int:
    value = tile_size or DEFAULT_TILE_SIZE
    if value not in SUPPORTED_TILE_SIZES:
        raise SidecarError("invalid_tile_size", "Tile size must be 64, 128, 192, or 256.")
    return value


def _validate_tile_pad(tile_pad: int | None) -> int:
    value = tile_pad or DEFAULT_TILE_PAD
    if value not in SUPPORTED_TILE_PADS:
        raise SidecarError("invalid_tile_pad", "Tile pad must be 4, 8, 12, or 16.")
    return value


def get_upscale_preset_options(quality_preset: str | None) -> dict[str, object]:
    preset = _normalize_quality_preset(quality_preset)
    return {
        "qualityPreset": preset,
        **PRESET_OPTIONS[preset],
    }


def normalize_upscale_options(
    *,
    scale: int = 2,
    engine: str = "auto",
    quality_preset: str | None = None,
    tile_size: int | None = None,
    tile_pad: int | None = None,
    model_id: str | None = None,
) -> dict[str, object]:
    if scale not in SUPPORTED_SCALES:
        raise SidecarError("invalid_scale", "Upscale scale must be 2, 3, or 4.")

    normalized_engine = _normalize_engine(engine)
    if normalized_engine not in {"auto", "pillow_lanczos", "real_esrgan"}:
        raise SidecarError("unsupported_engine", f"Unsupported upscale engine: {engine}")

    preset_options = get_upscale_preset_options(quality_preset)
    resolved_tile_size = _validate_tile_size(tile_size or int(preset_options["tileSize"]))
    resolved_tile_pad = _validate_tile_pad(tile_pad or int(preset_options["tilePad"]))

    return {
        "scale": scale,
        "engine": normalized_engine,
        "qualityPreset": str(preset_options["qualityPreset"]),
        "tileSize": resolved_tile_size,
        "tilePad": resolved_tile_pad,
        "memoryMode": preset_options["memoryMode"],
        "estimatedCost": preset_options["estimatedCost"],
        "modelId": model_id or None,
    }


def _supported_model_map() -> dict[str, dict[str, object]]:
    return {str(model["id"]): model for model in get_supported_realesrgan_models()}


def _resolve_model_status(model_id: str | None = None) -> dict[str, object]:
    supported_models = _supported_model_map()
    if model_id is not None and model_id not in supported_models:
        raise SidecarError(
            "unsupported_model",
            "Unsupported Real-ESRGAN model id.",
            {
                "engine": "real_esrgan",
                "modelId": model_id,
                "modelStatus": "model_invalid",
                "realEsrganStatus": "model_invalid",
            },
        )

    if model_id is None:
        preferred_ids = [DEFAULT_MODEL_ID, *[model_id for model_id in supported_models if model_id != DEFAULT_MODEL_ID]]
        best_info = None
        for candidate_id in preferred_ids:
            candidate = validate_model_file(candidate_id)
            if candidate.get("status") == "available":
                best_info = candidate
                break
            if best_info is None:
                best_info = candidate
        model_info = best_info or validate_model_file(DEFAULT_MODEL_ID)
    else:
        model_info = validate_model_file(model_id)

    resolved_model_id = str(model_info["id"])
    model_status = str(model_info.get("status") or "model_missing")
    model_path = get_models_dir() / resolved_model_id
    return {
        "configured": model_status == "available",
        "modelPath": str(model_path) if model_path.exists() else None,
        "externalDataPath": str(model_path.with_suffix(".data")) if model_path.with_suffix(".data").exists() else None,
        "modelName": model_info.get("filename"),
        "modelId": model_info.get("id"),
        "modelScale": supported_models[resolved_model_id]["scale"],
        "modelStatus": model_status,
        "message": model_info.get("message"),
    }


def _normalize_realesrgan_status(model_status: str) -> str:
    if model_status == "missing":
        return "model_missing"
    if model_status == "invalid":
        return "model_invalid"
    return model_status


def detect_realesrgan(model_id: str | None = None) -> dict[str, object]:
    has_onnxruntime = _module_available("onnxruntime")
    has_numpy = _module_available("numpy")
    model_info = _resolve_model_status(model_id)

    if not has_onnxruntime or not has_numpy:
        status = "dependency_missing"
    elif not model_info["configured"]:
        status = _normalize_realesrgan_status(str(model_info["modelStatus"]))
    else:
        status = "available"

    return {
        "realEsrgan": status == "available",
        "realEsrganStatus": status,
        "dependencyStatus": {
            "onnxruntime": has_onnxruntime,
            "numpy": has_numpy,
        },
        **model_info,
    }


def detect_upscale_capabilities() -> dict[str, object]:
    has_pillow = pillow_available()
    default_realesrgan = detect_realesrgan()
    supported_engines = ["pillow_lanczos"] if has_pillow else []
    if default_realesrgan["realEsrgan"]:
        supported_engines.append("real_esrgan")
    default_engine = "real_esrgan" if default_realesrgan["realEsrgan"] else ("pillow_lanczos" if has_pillow else "unavailable")
    return {
        "upscale": has_pillow,
        "upscaleEngine": default_engine,
        "realEsrgan": default_realesrgan["realEsrgan"],
        "realEsrganStatus": default_realesrgan["realEsrganStatus"],
        "supportedUpscaleEngines": supported_engines,
        "supportedUpscaleScales": [2, 3, 4] if has_pillow else [],
        "supportedUpscaleQualityPresets": ["fast", "balanced", "quality", "max"] if has_pillow else [],
        "supportedUpscaleTileSizes": [64, 128, 192, 256] if has_pillow else [],
        "supportedUpscaleTilePads": [4, 8, 12, 16] if has_pillow else [],
        "recommendedUpscaleModelId": default_realesrgan["modelId"] or DEFAULT_MODEL_ID,
        "realEsrganModelPath": default_realesrgan["modelPath"],
        "realEsrganModelName": default_realesrgan["modelName"],
        "realEsrganModelId": default_realesrgan["modelId"],
        "modelsDir": "sidecars/python-ai/models",
        "realEsrganModels": [validate_model_file(str(model["id"])) for model in get_supported_realesrgan_models()],
    }


def get_upscale_capabilities() -> dict[str, object]:
    return detect_upscale_capabilities()


def upscale_image(
    input_path: Path,
    output_path: Path,
    scale: int = 2,
    engine: str = "auto",
    *,
    quality_preset: str | None = None,
    tile_size: int | None = None,
    tile_pad: int | None = None,
    model_id: str | None = None,
) -> ImageOperationResult:
    options = normalize_upscale_options(
        scale=scale,
        engine=engine,
        quality_preset=quality_preset,
        tile_size=tile_size,
        tile_pad=tile_pad,
        model_id=model_id,
    )
    requested_engine = str(options["engine"])
    realesrgan = detect_realesrgan(str(options["modelId"]) if options["modelId"] else None)

    shared_metadata = {
        "qualityPreset": options["qualityPreset"],
        "tileSize": options["tileSize"],
        "tilePad": options["tilePad"],
        "memoryMode": options["memoryMode"],
        "estimatedCost": options["estimatedCost"],
        "modelId": realesrgan["modelId"],
        "modelStatus": realesrgan["modelStatus"],
        "realEsrganStatus": realesrgan["realEsrganStatus"],
    }

    if requested_engine == "auto":
        if realesrgan["realEsrgan"]:
            return upscale_with_realesrgan(
                input_path,
                output_path,
                int(options["scale"]),
                requested_engine="auto",
                tile_size=int(options["tileSize"]),
                tile_pad=int(options["tilePad"]),
                model_id=str(realesrgan["modelId"]),
                quality_preset=str(options["qualityPreset"]),
                memory_mode=str(options["memoryMode"]),
                estimated_cost=str(options["estimatedCost"]),
            )
        result = upscale_with_pillow(
            input_path,
            output_path,
            int(options["scale"]),
            quality_preset=str(options["qualityPreset"]),
            model_id=str(realesrgan["modelId"]) if realesrgan["modelId"] else None,
            real_esrgan_status=str(realesrgan["realEsrganStatus"]),
            model_status=str(realesrgan["modelStatus"]),
        )
        result.metadata = {
            **(result.metadata or {}),
            **shared_metadata,
            "requestedEngine": "auto",
            "actualEngine": "pillow_lanczos",
            "fallbackFrom": "real_esrgan",
            "message": "Real-ESRGAN unavailable; image upscaled with Pillow LANCZOS.",
        }
        return result

    if requested_engine == "pillow_lanczos":
        result = upscale_with_pillow(
            input_path,
            output_path,
            int(options["scale"]),
            quality_preset=str(options["qualityPreset"]),
            model_id=str(realesrgan["modelId"]) if realesrgan["modelId"] else None,
            real_esrgan_status=str(realesrgan["realEsrganStatus"]),
            model_status=str(realesrgan["modelStatus"]),
        )
        result.metadata = {
            **(result.metadata or {}),
            **shared_metadata,
            "requestedEngine": "pillow",
            "actualEngine": "pillow_lanczos",
        }
        return result

    if requested_engine == "real_esrgan":
        if not realesrgan["realEsrgan"]:
            raise SidecarError(
                "engine_unavailable",
                str(realesrgan.get("message") or "Real-ESRGAN is not installed or no local model is configured."),
                {
                    "operation": "upscale",
                    "requestedEngine": "real-esrgan",
                    "actualEngine": None,
                    "engine": "real_esrgan",
                    "qualityPreset": options["qualityPreset"],
                    "tileSize": options["tileSize"],
                    "tilePad": options["tilePad"],
                    "realEsrganStatus": realesrgan["realEsrganStatus"],
                    "modelStatus": realesrgan["modelStatus"],
                    "modelId": realesrgan["modelId"],
                    "memoryMode": options["memoryMode"],
                    "estimatedCost": options["estimatedCost"],
                },
            )
        return upscale_with_realesrgan(
            input_path,
            output_path,
            int(options["scale"]),
            requested_engine="real-esrgan",
            tile_size=int(options["tileSize"]),
            tile_pad=int(options["tilePad"]),
            model_id=str(realesrgan["modelId"]),
            quality_preset=str(options["qualityPreset"]),
            memory_mode=str(options["memoryMode"]),
            estimated_cost=str(options["estimatedCost"]),
        )

    raise SidecarError("unsupported_engine", f"Unsupported upscale engine: {engine}")


def upscale_with_pillow(
    input_path: Path,
    output_path: Path,
    scale: int = 2,
    *,
    quality_preset: str = DEFAULT_QUALITY_PRESET,
    model_id: str | None = None,
    real_esrgan_status: str = "model_missing",
    model_status: str = "model_missing",
) -> ImageOperationResult:
    source, target = validate_paths(input_path, output_path)
    if not pillow_available():
        raise SidecarError("dependency_missing", "Upscale requires Pillow.")
    if scale not in SUPPORTED_SCALES:
        raise SidecarError("invalid_scale", "Upscale scale must be 2, 3, or 4.")

    from PIL import Image, ImageEnhance, ImageFilter, ImageOps

    with Image.open(source) as image:
        base = ImageOps.exif_transpose(image).convert("RGBA")
        r, g, b, a = base.split()
        rgb = Image.merge("RGB", (r, g, b))
        rgb = ImageEnhance.Sharpness(rgb).enhance(1.18)
        target_size = (base.width * scale, base.height * scale)
        rgb = rgb.resize(target_size, Image.Resampling.LANCZOS)
        alpha = a.resize(target_size, Image.Resampling.LANCZOS)
        rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.3, percent=110, threshold=2))
        out_r, out_g, out_b = rgb.split()
        output = Image.merge("RGBA", (out_r, out_g, out_b, alpha))
        output.save(target, format="PNG", optimize=True)
        width, height = output.size

    return ImageOperationResult(
        target,
        "image/png",
        width,
        height,
        metadata={
            "requestedEngine": "pillow",
            "actualEngine": "pillow_lanczos",
            "qualityPreset": quality_preset,
            "realEsrganStatus": real_esrgan_status,
            "modelStatus": model_status,
            "modelId": model_id,
        },
    )


def _get_realesrgan_session(model_id: str):
    global _REALESRGAN_NUMPY
    if model_id in _REALESRGAN_SESSIONS:
        return _REALESRGAN_SESSIONS[model_id]

    with _REALESRGAN_SESSION_LOCK:
        if model_id in _REALESRGAN_SESSIONS:
            return _REALESRGAN_SESSIONS[model_id]

        info = detect_realesrgan(model_id)
        if not info["realEsrgan"]:
            raise SidecarError(
                "engine_unavailable",
                str(info.get("message") or "Real-ESRGAN is not available."),
                {
                    "realEsrganStatus": info["realEsrganStatus"],
                    "modelId": info["modelId"],
                    "modelStatus": info["modelStatus"],
                },
            )

        import numpy as np
        import onnxruntime as ort

        model_path = Path(str(info["modelPath"]))
        session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
        _REALESRGAN_NUMPY = np
        _REALESRGAN_SESSIONS[model_id] = session
        return session


def _run_realesrgan_tile(session, input_name: str, crop, tile_size: int):
    np = _REALESRGAN_NUMPY
    from PIL import Image

    arr = np.array(crop.convert("RGB"), dtype=np.float32)
    pad_h = tile_size - arr.shape[0]
    pad_w = tile_size - arr.shape[1]
    if pad_h < 0 or pad_w < 0:
        raise SidecarError("tile_error", "Real-ESRGAN tile exceeded the supported size.")
    if pad_h or pad_w:
        arr = np.pad(arr, ((0, pad_h), (0, pad_w), (0, 0)), mode="edge")

    tensor = (arr / 255.0).transpose(2, 0, 1)[None, :, :, :].astype(np.float32)
    output = session.run(None, {input_name: tensor})[0][0]
    output = output.transpose(1, 2, 0)
    output = np.clip(output * 255.0, 0, 255).astype("uint8")
    return Image.fromarray(output, "RGB")


def upscale_with_realesrgan(
    input_path: Path,
    output_path: Path,
    scale: int = 2,
    *,
    requested_engine: str = "real-esrgan",
    tile_size: int = DEFAULT_TILE_SIZE,
    tile_pad: int = DEFAULT_TILE_PAD,
    model_id: str = DEFAULT_MODEL_ID,
    quality_preset: str = DEFAULT_QUALITY_PRESET,
    memory_mode: str = "balanced",
    estimated_cost: str = "medium",
) -> ImageOperationResult:
    source, target = validate_paths(input_path, output_path)
    if scale not in SUPPORTED_SCALES:
        raise SidecarError("invalid_scale", "Upscale scale must be 2, 3, or 4.")

    from PIL import Image, ImageOps

    session = _get_realesrgan_session(model_id)
    input_name = session.get_inputs()[0].name

    with Image.open(source) as image:
        base = ImageOps.exif_transpose(image).convert("RGBA")
        rgb = base.convert("RGB")
        alpha = base.getchannel("A")
        core = tile_size - (tile_pad * 2)
        if core <= 0:
            raise SidecarError("invalid_tile_size", "Tile size must be larger than twice the tile pad.")

        xs = list(range(0, rgb.width, core))
        ys = list(range(0, rgb.height, core))
        output = Image.new("RGB", (rgb.width * REALESRGAN_SCALE, rgb.height * REALESRGAN_SCALE))

        for y0 in ys:
            for x0 in xs:
                x1 = min(x0 + core, rgb.width)
                y1 = min(y0 + core, rgb.height)
                sx0 = max(0, x0 - tile_pad)
                sy0 = max(0, y0 - tile_pad)
                sx1 = min(rgb.width, x1 + tile_pad)
                sy1 = min(rgb.height, y1 + tile_pad)

                crop = rgb.crop((sx0, sy0, sx1, sy1))
                tile = _run_realesrgan_tile(session, input_name, crop, tile_size)

                left = (x0 - sx0) * REALESRGAN_SCALE
                top = (y0 - sy0) * REALESRGAN_SCALE
                right = left + (x1 - x0) * REALESRGAN_SCALE
                bottom = top + (y1 - y0) * REALESRGAN_SCALE
                output.paste(tile.crop((left, top, right, bottom)), (x0 * REALESRGAN_SCALE, y0 * REALESRGAN_SCALE))

        if scale != REALESRGAN_SCALE:
            resized_size = (base.width * scale, base.height * scale)
            output = output.resize(resized_size, Image.Resampling.LANCZOS)
        alpha = alpha.resize(output.size, Image.Resampling.LANCZOS)
        out_r, out_g, out_b = output.split()
        final_output = Image.merge("RGBA", (out_r, out_g, out_b, alpha))
        final_output.save(target, format="PNG", optimize=True)
        width, height = final_output.size

    return ImageOperationResult(
        target,
        "image/png",
        width,
        height,
        metadata={
            "requestedEngine": requested_engine,
            "actualEngine": "real_esrgan",
            "qualityPreset": quality_preset,
            "tileSize": tile_size,
            "tilePad": tile_pad,
            "memoryMode": memory_mode,
            "estimatedCost": estimated_cost,
            "realEsrganStatus": "available",
            "modelStatus": "available",
            "modelId": model_id,
            "modelPath": str(get_models_dir() / model_id),
        },
    )

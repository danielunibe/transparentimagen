from __future__ import annotations

import importlib.util
import time
from pathlib import Path
import os

from .utils import SidecarError

MODELS_DIR = Path(os.environ.get("ASTERIA_MODELS_DIR", Path(__file__).resolve().parent.parent / "models"))
MODELS_DIR_LABEL = "sidecars/python-ai/models"
REALESRGAN_TILE_SIZE = 128
REALESRGAN_TILE_PAD = 8

SUPPORTED_REALESRGAN_MODELS = (
    {
        "id": "RealESRGAN_x2plus.onnx",
        "filename": "RealESRGAN_x2plus.onnx",
        "label": "Real-ESRGAN x2",
        "scale": 2,
    },
    {
        "id": "RealESRGAN_x4plus.onnx",
        "filename": "RealESRGAN_x4plus.onnx",
        "label": "Real-ESRGAN x4",
        "scale": 4,
    },
    {
        "id": "RealESRGAN_x4plus_anime_6B.onnx",
        "filename": "RealESRGAN_x4plus_anime_6B.onnx",
        "label": "Real-ESRGAN x4 Anime 6B",
        "scale": 4,
    },
)


def get_models_dir() -> Path:
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    return MODELS_DIR


def get_models_dir_label() -> str:
    return MODELS_DIR_LABEL


def get_supported_realesrgan_models() -> list[dict[str, object]]:
    return [dict(model, engine="real_esrgan") for model in SUPPORTED_REALESRGAN_MODELS]


def _module_available(module_name: str) -> bool:
    return importlib.util.find_spec(module_name) is not None


def _dependency_status() -> str | None:
    if not _module_available("onnxruntime") or not _module_available("numpy"):
        return "dependency_missing"
    return None


def _model_path(model_id: str) -> Path:
    return get_models_dir() / model_id


def _build_model_info(model: dict[str, object]) -> dict[str, object]:
    path = _model_path(str(model["filename"]))
    exists = path.exists()
    info = {
        "id": model["id"],
        "filename": model["filename"],
        "label": model["label"],
        "engine": "real_esrgan",
        "scale": model["scale"],
        "exists": exists,
        "status": "missing" if not exists else "untested",
    }
    if exists:
        stat = path.stat()
        info["sizeBytes"] = stat.st_size
        info["lastModified"] = str(int(stat.st_mtime))
    return info


def list_local_models() -> list[dict[str, object]]:
    dependency_status = _dependency_status()
    models = []
    for model in get_supported_realesrgan_models():
        info = _build_model_info(model)
        if dependency_status:
            info["status"] = dependency_status
            info["message"] = "Install optional Real-ESRGAN dependencies first."
        models.append(info)
    return models


def _load_session(model_path: Path):
    import numpy as np
    import onnxruntime as ort

    session = ort.InferenceSession(str(model_path), providers=["CPUExecutionProvider"])
    return session, np


def _validate_session_shapes(session, expected_scale: int) -> tuple[bool, str]:
    inputs = session.get_inputs()
    outputs = session.get_outputs()
    if not inputs or not outputs:
        return False, "Model must expose at least one input and one output."

    input_shape = getattr(inputs[0], "shape", []) or []
    output_shape = getattr(outputs[0], "shape", []) or []
    if len(input_shape) != 4 or len(output_shape) != 4:
        return False, "Model must use 4D NCHW tensors."

    if input_shape[1] not in (3, "3", None, "None"):
        return False, "Model input channel count is not compatible with RGB NCHW."
    if output_shape[1] not in (3, "3", None, "None"):
        return False, "Model output channel count is not compatible with RGB NCHW."

    scale_hint = getattr(outputs[0], "shape", [None, None, None, None])[2]
    if isinstance(scale_hint, int) and scale_hint not in (REALESRGAN_TILE_SIZE * 2, REALESRGAN_TILE_SIZE * 4):
        return False, "Model output shape does not match the expected upscale family."

    if expected_scale not in (2, 4):
        return False, "Unsupported model scale."
    return True, "Model structure looks compatible."


def run_realesrgan_smoke_test(model_id: str) -> dict[str, object]:
    dependency_status = _dependency_status()
    if dependency_status:
        return {
            "ok": False,
            "status": dependency_status,
            "model": model_id,
            "engine": "real_esrgan",
            "message": "Install optional Real-ESRGAN dependencies first.",
        }

    supported = {str(model["id"]): model for model in get_supported_realesrgan_models()}
    model = supported.get(model_id)
    if not model:
        return {
            "ok": False,
            "status": "unsupported",
            "model": model_id,
            "engine": "real_esrgan",
            "message": "Unsupported Real-ESRGAN model id.",
        }

    path = _model_path(model_id)
    if not path.exists():
        return {
            "ok": False,
            "status": "model_missing",
            "model": model_id,
            "engine": "real_esrgan",
            "message": "Real-ESRGAN model is not installed.",
        }

    started = time.perf_counter()
    try:
        session, np = _load_session(path)
        input_name = session.get_inputs()[0].name
        output_name = session.get_outputs()[0].name
        tile = np.zeros((1, 3, REALESRGAN_TILE_SIZE, REALESRGAN_TILE_SIZE), dtype=np.float32)
        output = session.run([output_name], {input_name: tile})[0]
        duration_ms = int((time.perf_counter() - started) * 1000)
        output_size = list(output.shape)
        return {
            "ok": True,
            "status": "available",
            "model": model_id,
            "engine": "real_esrgan",
            "outputSize": output_size,
            "durationMs": duration_ms,
            "message": "Real-ESRGAN smoke test completed.",
        }
    except Exception as exc:
        return {
            "ok": False,
            "status": "inference_failed",
            "model": model_id,
            "engine": "real_esrgan",
            "message": f"Model inference failed: {exc}",
        }


def validate_model_file(model_id: str) -> dict[str, object]:
    supported = {str(model["id"]): model for model in get_supported_realesrgan_models()}
    model = supported.get(model_id)
    if not model:
        return {
            "id": model_id,
            "filename": model_id,
            "label": model_id,
            "engine": "real_esrgan",
            "scale": 4,
            "exists": False,
            "status": "invalid",
            "message": "Model is not in the supported allowlist.",
        }

    dependency_status = _dependency_status()
    info = _build_model_info(model)
    if dependency_status:
        info["status"] = dependency_status
        info["message"] = "Install optional Real-ESRGAN dependencies first."
        return info
    if not info["exists"]:
        info["status"] = "missing"
        info["message"] = "Place a supported ONNX model in sidecars/python-ai/models."
        return info

    try:
        session, _np = _load_session(_model_path(model_id))
        valid, message = _validate_session_shapes(session, int(model["scale"]))
        if not valid:
            info["status"] = "invalid"
            info["message"] = message
            return info
    except Exception as exc:
        info["status"] = "invalid"
        info["message"] = f"Model failed to load: {exc}"
        return info

    smoke = run_realesrgan_smoke_test(model_id)
    if smoke["ok"]:
        info["status"] = "available"
        info["message"] = "Model validated successfully."
        return info

    info["status"] = str(smoke["status"])
    info["message"] = str(smoke["message"])
    return info


def validate_all_models() -> list[dict[str, object]]:
    return [validate_model_file(str(model["id"])) for model in get_supported_realesrgan_models()]


def detect_realesrgan_models() -> dict[str, object]:
    models = validate_all_models()
    available = [model for model in models if model["status"] == "available"]
    dependency_status = _dependency_status()
    if dependency_status:
        status = dependency_status
    elif available:
        status = "available"
    elif any(model["status"] == "invalid" for model in models if model["exists"]):
        status = "model_invalid"
    elif any(model["status"] == "inference_failed" for model in models if model["exists"]):
        status = "inference_failed"
    else:
        status = "model_missing"

    active_model = available[0] if available else None
    return {
        "realEsrgan": bool(available),
        "realEsrganStatus": status,
        "modelsDir": get_models_dir_label(),
        "models": models,
        "activeModel": active_model,
    }


def get_model_status() -> dict[str, object]:
    return detect_realesrgan_models()

from __future__ import annotations

import io
import json
import os
import re
import subprocess
import sys
import tempfile
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageOps, ImageStat

try:
    from rembg import remove
except ImportError:
    remove = None

from models import (
    CODEFORMER_ENV_ONNX,
    CODEFORMER_ENV_PYTHON,
    CODEFORMER_ENV_SCRIPT,
    CV2_AVAILABLE,
    DEEPWB_ENV_ONNX,
    DEFAULT_MODEL_KEY,
    DEFAULT_UPSCALE_ENGINE,
    ERROR,
    FAST_SEGMENTATION_MODEL,
    GFPGAN_ENV_PYTHON,
    GFPGAN_ENV_SCRIPT,
    MODEL_KEYS,
    MODEL_MANAGER,
    MODULE_REGISTRY,
    NAFNET_ENV_ONNX,
    NUMPY_AVAILABLE,
    ORT_AVAILABLE,
    PREMIUM_SEGMENTATION_MODEL,
    PYIQA_ENV_METRIC,
    PYIQA_ENV_PYTHON,
    REALESRGAN_SCALE,
    REALESRGAN_TILE_PAD,
    REALESRGAN_TILE_SIZE,
    REMBG_AVAILABLE,
    SWINIR_ENV_ONNX,
    SUCCESS,
    TEXT_DIM,
    UE5_DEPTH_ENV_ONNX,
    UE5_NORMAL_ENV_ONNX,
    WARNING,
    ZERO_DCE_ENV_ONNX,
    cv2,
    get_realesrgan_session,
    get_rembg_session,
    np,
)
from comfyui_client import ComfyUICancelled, run_workflow, smoke_comfyui
from storage import (
    ExportProfile,
    append_history,
    get_export_profile,
    load_comfyui_settings,
    save_batch_report,
    slugify,
)


@dataclass
class CancellationToken:
    _cancelled: bool = False
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def cancel(self):
        with self._lock:
            self._cancelled = True

    def is_cancelled(self) -> bool:
        with self._lock:
            return self._cancelled

    def raise_if_cancelled(self):
        if self.is_cancelled():
            raise ProcessingCancelled("Procesamiento cancelado por nueva solicitud.")


class ProcessingCancelled(RuntimeError):
    pass


@dataclass
class ProcessingOptions:
    do_rembg: bool = True
    model_key: str = DEFAULT_MODEL_KEY
    alpha_matting: bool = True
    post_process_mask: bool = True
    cleanup: bool = True
    cleanup_ratio: float = 0.0015
    keep_main_object: bool = False
    despill: bool = True
    despill_strength: float = 0.55
    feather: bool = True
    feather_radius: float = 0.45
    do_upscale: bool = True
    upscale_engine: str = DEFAULT_UPSCALE_ENGINE
    factor: int = 4
    sharpness: float = 1.3
    contrast: float = 1.05
    mode_label: str = "High Fidelity"
    do_face_recovery: bool = False
    face_backend: str = "codeformer"
    face_strength: float = 0.72
    use_face_crop: bool = False
    do_light_color_restore: bool = False
    light_restore_strength: float = 0.55
    render_mode: str = "final"
    active_modules: tuple[str, ...] = ()


@dataclass
class ProcessingResult:
    image: Image.Image
    render_mode: str
    provider: str
    warnings: list[str] = field(default_factory=list)
    metrics: dict[str, str] = field(default_factory=dict)


@dataclass
class UE5TextureSetExport:
    folder: Path
    files: dict[str, Path] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    metrics: dict[str, str] = field(default_factory=dict)


@dataclass
class SegmentationComparisonResult:
    image: Image.Image
    fast_image: Image.Image
    premium_image: Image.Image
    fast_model: str = FAST_SEGMENTATION_MODEL
    premium_model: str = PREMIUM_SEGMENTATION_MODEL
    metrics: dict[str, str] = field(default_factory=dict)


@dataclass
class BatchItemResult:
    source_path: str
    status: str
    output_paths: list[str] = field(default_factory=list)
    duration_ms: int = 0
    provider: str = ""
    warnings: list[str] = field(default_factory=list)
    error: str = ""
    metrics: dict[str, str] = field(default_factory=dict)


@dataclass
class BatchReport:
    batch_name: str
    input_dir: str
    output_dir: str
    export_profile_id: str
    started_at: str
    finished_at: str = ""
    status: str = "running"
    items_total: int = 0
    items_ok: int = 0
    items_error: int = 0
    items_cancelled: int = 0
    report_path: str = ""
    items: list[BatchItemResult] = field(default_factory=list)


def make_checkerboard(size: tuple[int, int], tile: int = 12) -> Image.Image:
    """Tablero de ajedrez para visualizar transparencia."""
    w, h = size
    img  = Image.new("RGB", (w, h), (195, 195, 195))
    draw = ImageDraw.Draw(img)
    for y in range(0, h, tile * 2):
        for x in range(0, w, tile * 2):
            draw.rectangle([x + tile, y,        x + tile*2 - 1, y + tile - 1],    fill=(155, 155, 155))
            draw.rectangle([x,        y + tile,  x + tile - 1,  y + tile*2 - 1], fill=(155, 155, 155))
    return img.convert("RGBA")


def upscale_image(img: Image.Image, factor: int,
                  sharpness: float = 1.3,
                  contrast: float  = 1.05) -> Image.Image:
    """
    Pipeline de upscaling de calidad:
        1. Sharpen previo
        2. Resize LANCZOS (mejor kernel PIL)
        3. Unsharp Mask post-resize para recuperar detalle
        4. Leve boost de contraste
    Preserva canal alfa.
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    r, g, b, a = img.split()
    rgb = Image.merge("RGB", (r, g, b))

    # 1 · Pre-sharpen
    rgb = ImageEnhance.Sharpness(rgb).enhance(sharpness)

    # 2 · Upscale con LANCZOS
    nw, nh = rgb.width * factor, rgb.height * factor
    rgb = rgb.resize((nw, nh), Image.LANCZOS)
    a   = a.resize((nw, nh), Image.LANCZOS)

    # 3 · Unsharp Mask (recupera micro-detalle perdido en resize)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.5, percent=130, threshold=2))

    # 4 · Contraste
    rgb = ImageEnhance.Contrast(rgb).enhance(contrast)

    r2, g2, b2 = rgb.split()
    return Image.merge("RGBA", (r2, g2, b2, a))


def _notify(status_cb: Callable[[str, str], None] | None, msg: str, color: str = TEXT_DIM):
    if status_cb:
        status_cb(msg, color)


def blend_rgba(base: Image.Image, enhanced: Image.Image, strength: float) -> Image.Image:
    """Mezcla dos imagenes RGBA preservando el alfa del resultado mejorado."""
    strength = max(0.0, min(1.0, float(strength)))
    base_rgba = base.convert("RGBA")
    enhanced_rgba = enhanced.convert("RGBA")
    if base_rgba.size != enhanced_rgba.size:
        enhanced_rgba = enhanced_rgba.resize(base_rgba.size, Image.LANCZOS)
    if strength <= 0.0:
        return base_rgba
    if strength >= 1.0:
        return enhanced_rgba
    rgb = Image.blend(base_rgba.convert("RGB"), enhanced_rgba.convert("RGB"), strength)
    alpha = enhanced_rgba.getchannel("A")
    r, g, b = rgb.split()
    return Image.merge("RGBA", (r, g, b, alpha))


def resolve_codeformer_cli() -> tuple[str, str]:
    """Resuelve la integracion externa de CodeFormer via su script oficial."""
    script = os.environ.get(CODEFORMER_ENV_SCRIPT, "").strip()
    if not script:
        raise RuntimeError(
            "CodeFormer no esta configurado. Define "
            f"{CODEFORMER_ENV_SCRIPT} apuntando a inference_codeformer.py."
        )
    script_path = Path(script).expanduser()
    if not script_path.exists():
        raise RuntimeError(f"No existe el script de CodeFormer: {script_path}")

    python_cmd = os.environ.get(CODEFORMER_ENV_PYTHON, "").strip() or sys.executable
    return python_cmd, str(script_path)


def resolve_gfpgan_cli() -> tuple[str, str]:
    """Resuelve la integracion externa de GFPGAN via su script oficial."""
    script = os.environ.get(GFPGAN_ENV_SCRIPT, "").strip()
    if not script:
        raise RuntimeError(
            "GFPGAN externo no esta configurado. Define "
            f"{GFPGAN_ENV_SCRIPT} apuntando a inference_gfpgan.py."
        )
    script_path = Path(script).expanduser()
    if not script_path.exists():
        raise RuntimeError(f"No existe el script de GFPGAN: {script_path}")

    python_cmd = os.environ.get(GFPGAN_ENV_PYTHON, "").strip() or sys.executable
    return python_cmd, str(script_path)


def _optional_env_path(env_name: str) -> tuple[bool, str]:
    value = os.environ.get(env_name, "").strip()
    if not value:
        return False, f"{env_name} no definido"
    path = Path(value).expanduser()
    if not path.exists():
        return False, f"{env_name} apunta a una ruta inexistente: {path}"
    return True, str(path)


def face_detector_ready() -> tuple[bool, str]:
    if not CV2_AVAILABLE or not NUMPY_AVAILABLE:
        return False, "OpenCV o numpy no estan disponibles."
    cascade_root = getattr(getattr(cv2, "data", None), "haarcascades", "")
    cascade_path = Path(cascade_root) / "haarcascade_frontalface_default.xml"
    if not cascade_path.exists():
        return False, f"No existe el cascade facial local: {cascade_path}"
    cascade = cv2.CascadeClassifier(str(cascade_path))
    if cascade.empty():
        return False, f"OpenCV no pudo cargar el cascade facial: {cascade_path}"
    return True, str(cascade_path)


def detect_face_boxes(img: Image.Image, max_faces: int = 3) -> list[tuple[int, int, int, int]]:
    ready, cascade_path = face_detector_ready()
    if not ready:
        return []

    base = img.convert("RGB")
    gray = np.array(base.convert("L"))
    scale = 1.0
    max_side = max(base.width, base.height)
    if max_side > 900:
        scale = 900 / max_side
        gray = cv2.resize(gray, (max(1, int(base.width * scale)), max(1, int(base.height * scale))))

    cascade = cv2.CascadeClassifier(cascade_path)
    faces = cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(32, 32))
    boxes: list[tuple[int, int, int, int]] = []
    for x, y, w, h in faces:
        if scale != 1.0:
            x = int(x / scale)
            y = int(y / scale)
            w = int(w / scale)
            h = int(h / scale)
        boxes.append((int(x), int(y), int(w), int(h)))
    boxes.sort(key=lambda item: item[2] * item[3], reverse=True)
    return boxes[:max_faces]


def _expanded_face_box(
    box: tuple[int, int, int, int],
    size: tuple[int, int],
    pad_ratio: float = 0.55,
) -> tuple[int, int, int, int]:
    x, y, w, h = box
    pad = int(max(w, h) * pad_ratio)
    left = max(0, x - pad)
    top = max(0, y - pad)
    right = min(size[0], x + w + pad)
    bottom = min(size[1], y + h + pad)
    return left, top, right, bottom


def _run_codeformer_cli_image(
    img: Image.Image,
    fidelity: float = 0.72,
    status_cb: Callable[[str, str], None] | None = None,
) -> Image.Image:
    """Ejecuta CodeFormer como proceso externo y conserva el alfa original."""
    python_cmd, script_path = resolve_codeformer_cli()
    fidelity = max(0.0, min(1.0, float(fidelity)))
    base = img.convert("RGBA")
    source_alpha = base.getchannel("A")

    with tempfile.TemporaryDirectory(prefix="image_enhancer_codeformer_") as tmp_dir:
        tmp_path = Path(tmp_dir)
        input_path = tmp_path / "input.png"
        output_root = tmp_path / "output"
        base.save(input_path, format="PNG")

        cmd = [
            python_cmd,
            script_path,
            "-i",
            str(input_path),
            "-o",
            str(output_root),
            "-w",
            f"{fidelity:.2f}",
            "-s",
            "1",
        ]
        _notify(status_cb, "Recuperando rostro con CodeFormer...", TEXT_DIM)
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=False,
                timeout=900,
            )
        except OSError as exc:
            raise RuntimeError("No se pudo lanzar CodeFormer desde esta instalacion.") from exc
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError("CodeFormer excedio el tiempo esperado.") from exc

        if result.returncode != 0:
            stderr = (result.stderr or result.stdout or "").strip()
            raise RuntimeError(
                "CodeFormer devolvio un error.\n"
                f"Comando: {' '.join(cmd)}\n"
                f"Salida: {stderr[:500]}"
            )

        candidates = sorted(output_root.rglob("*.png"))
        if not candidates:
            candidates = sorted(output_root.rglob("*.jpg"))
        if not candidates:
            raise RuntimeError("CodeFormer termino pero no genero imagen de salida.")

        restored = Image.open(candidates[-1]).convert("RGBA")
        if restored.size != base.size:
            restored = restored.resize(base.size, Image.LANCZOS)
        r, g, b, _ = restored.split()
        return Image.merge("RGBA", (r, g, b, source_alpha))


def _run_gfpgan_cli_image(
    img: Image.Image,
    status_cb: Callable[[str, str], None] | None = None,
) -> Image.Image:
    """Ejecuta GFPGAN como proceso externo y conserva el alfa original."""
    python_cmd, script_path = resolve_gfpgan_cli()
    base = img.convert("RGBA")
    source_alpha = base.getchannel("A")

    with tempfile.TemporaryDirectory(prefix="image_enhancer_gfpgan_") as tmp_dir:
        tmp_path = Path(tmp_dir)
        input_path = tmp_path / "input.png"
        output_root = tmp_path / "output"
        base.save(input_path, format="PNG")

        cmd = [
            python_cmd,
            script_path,
            "-i",
            str(input_path),
            "-o",
            str(output_root),
            "-v",
            "1.4",
            "-s",
            "1",
        ]
        _notify(status_cb, "Recuperando rostro con GFPGAN...", TEXT_DIM)
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=False,
                timeout=900,
            )
        except OSError as exc:
            raise RuntimeError("No se pudo lanzar GFPGAN desde esta instalacion.") from exc
        except subprocess.TimeoutExpired as exc:
            raise RuntimeError("GFPGAN excedio el tiempo esperado.") from exc

        if result.returncode != 0:
            stderr = (result.stderr or result.stdout or "").strip()
            raise RuntimeError(
                "GFPGAN devolvio un error.\n"
                f"Comando: {' '.join(cmd)}\n"
                f"Salida: {stderr[:500]}"
            )

        candidates = sorted(output_root.rglob("*.png"))
        if not candidates:
            candidates = sorted(output_root.rglob("*.jpg"))
        if not candidates:
            raise RuntimeError("GFPGAN termino pero no genero imagen de salida.")

        restored = Image.open(candidates[-1]).convert("RGBA")
        if restored.size != base.size:
            restored = restored.resize(base.size, Image.LANCZOS)
        r, g, b, _ = restored.split()
        return Image.merge("RGBA", (r, g, b, source_alpha))


def run_gfpgan_face_recovery(
    img: Image.Image,
    status_cb: Callable[[str, str], None] | None = None,
    crop_to_face: bool = False,
) -> Image.Image:
    """Ejecuta GFPGAN externo sobre el frame completo o un crop facial detectado."""
    base = img.convert("RGBA")
    if crop_to_face:
        boxes = detect_face_boxes(base, max_faces=1)
        if boxes:
            face_box = _expanded_face_box(boxes[0], base.size)
            _notify(status_cb, "Rostro detectado: aplicando GFPGAN en crop local...", TEXT_DIM)
            crop = base.crop(face_box)
            restored_crop = _run_gfpgan_cli_image(crop, status_cb)
            restored = base.copy()
            restored.paste(restored_crop, face_box[:2], restored_crop.getchannel("A"))
            return restored
        _notify(status_cb, "No se detecto rostro; GFPGAN usara la imagen completa.", WARNING)

    return _run_gfpgan_cli_image(base, status_cb)


def run_codeformer_face_recovery(
    img: Image.Image,
    fidelity: float = 0.72,
    status_cb: Callable[[str, str], None] | None = None,
    crop_to_face: bool = False,
) -> Image.Image:
    """Ejecuta CodeFormer externo sobre el frame completo o un crop facial detectado."""
    base = img.convert("RGBA")
    if crop_to_face:
        boxes = detect_face_boxes(base, max_faces=1)
        if boxes:
            face_box = _expanded_face_box(boxes[0], base.size)
            _notify(status_cb, "Rostro detectado: aplicando CodeFormer en crop local...", TEXT_DIM)
            crop = base.crop(face_box)
            restored_crop = _run_codeformer_cli_image(crop, fidelity, status_cb)
            restored = base.copy()
            restored.paste(restored_crop, face_box[:2], restored_crop.getchannel("A"))
            return restored
        _notify(status_cb, "No se detecto rostro; CodeFormer usara la imagen completa.", WARNING)

    return _run_codeformer_cli_image(base, fidelity, status_cb)



def _run_realesrgan_tile(session, input_name: str, crop: Image.Image) -> Image.Image:
    """Ejecuta una tile fija 128x128 y devuelve RGB x4."""
    arr = np.array(crop.convert("RGB"), dtype=np.float32)
    pad_h = REALESRGAN_TILE_SIZE - arr.shape[0]
    pad_w = REALESRGAN_TILE_SIZE - arr.shape[1]
    if pad_h < 0 or pad_w < 0:
        raise ValueError("Real-ESRGAN recibio una tile mayor a 128x128.")
    if pad_h or pad_w:
        arr = np.pad(arr, ((0, pad_h), (0, pad_w), (0, 0)), mode="edge")

    tensor = (arr / 255.0).transpose(2, 0, 1)[None, :, :, :].astype(np.float32)
    out = session.run(None, {input_name: tensor})[0][0]
    out = out.transpose(1, 2, 0)
    out = np.clip(out * 255.0, 0, 255).astype("uint8")
    return Image.fromarray(out, "RGB")


def realesrgan_upscale_image(
    img: Image.Image,
    factor: int,
    sharpness: float = 1.3,
    contrast: float = 1.05,
    status_cb: Callable[[str, str], None] | None = None,
    cancellation_token: CancellationToken | None = None,
) -> Image.Image:
    """Upscaling IA Real-ESRGAN x4 por tiles, con salida ajustada al factor pedido."""
    if factor not in (2, 3, 4):
        raise ValueError("Real-ESRGAN solo admite salida final 2x, 3x o 4x.")

    base = img.convert("RGBA")
    rgb = base.convert("RGB")
    alpha = base.getchannel("A")
    session = get_realesrgan_session(status_cb)
    input_name = session.get_inputs()[0].name

    core = REALESRGAN_TILE_SIZE - (REALESRGAN_TILE_PAD * 2)
    xs = list(range(0, rgb.width, core))
    ys = list(range(0, rgb.height, core))
    total = max(1, len(xs) * len(ys))
    output = Image.new("RGB", (rgb.width * REALESRGAN_SCALE, rgb.height * REALESRGAN_SCALE))
    done = 0
    last_report = 0.0

    for y0 in ys:
        for x0 in xs:
            if cancellation_token:
                cancellation_token.raise_if_cancelled()
            x1 = min(x0 + core, rgb.width)
            y1 = min(y0 + core, rgb.height)
            sx0 = max(0, x0 - REALESRGAN_TILE_PAD)
            sy0 = max(0, y0 - REALESRGAN_TILE_PAD)
            sx1 = min(rgb.width, x1 + REALESRGAN_TILE_PAD)
            sy1 = min(rgb.height, y1 + REALESRGAN_TILE_PAD)

            crop = rgb.crop((sx0, sy0, sx1, sy1))
            tile = _run_realesrgan_tile(session, input_name, crop)

            left = (x0 - sx0) * REALESRGAN_SCALE
            top = (y0 - sy0) * REALESRGAN_SCALE
            right = left + (x1 - x0) * REALESRGAN_SCALE
            bottom = top + (y1 - y0) * REALESRGAN_SCALE
            output.paste(
                tile.crop((left, top, right, bottom)),
                (x0 * REALESRGAN_SCALE, y0 * REALESRGAN_SCALE),
            )

            done += 1
            now = time.monotonic()
            if done == total or now - last_report > 0.8:
                _notify(status_cb, f"Real-ESRGAN procesando tiles {done}/{total}...", TEXT_DIM)
                last_report = now

    alpha = alpha.resize(output.size, Image.LANCZOS)
    if factor != REALESRGAN_SCALE:
        target_size = (base.width * factor, base.height * factor)
        output = output.resize(target_size, Image.LANCZOS)
        alpha = alpha.resize(target_size, Image.LANCZOS)

    if sharpness > 1.0:
        output = ImageEnhance.Sharpness(output).enhance(1.0 + ((sharpness - 1.0) * 0.35))
    if contrast != 1.0:
        output = ImageEnhance.Contrast(output).enhance(contrast)

    r, g, b = output.split()
    return Image.merge("RGBA", (r, g, b, alpha))


def despill_edges(img: Image.Image, strength: float = 0.55) -> Image.Image:
    """Reduce contaminacion de color del fondo en bordes semitransparentes."""
    if not NUMPY_AVAILABLE:
        return img

    strength = max(0.0, min(1.0, float(strength)))
    if strength <= 0.0:
        return img

    base = img.convert("RGBA")
    arr = np.array(base, dtype=np.float32)
    alpha = arr[:, :, 3]
    edge_mask = (alpha > 0) & (alpha < 252)
    if int(edge_mask.sum()) < 8:
        return base

    bg_mask = alpha <= 12
    if int(bg_mask.sum()) < 8:
        bg_mask = (alpha > 0) & (alpha < 90)
    fg_mask = alpha >= 245
    if int(fg_mask.sum()) < 8:
        fg_mask = alpha > 170
    if int(bg_mask.sum()) < 8 or int(fg_mask.sum()) < 8:
        return base

    bg_color = np.median(arr[:, :, :3][bg_mask], axis=0)
    fg_color = np.median(arr[:, :, :3][fg_mask], axis=0)
    spill_cast = bg_color - fg_color
    edge_weight = ((1.0 - (alpha / 255.0)) ** 0.75) * strength
    edge_weight[~edge_mask] = 0.0
    arr[:, :, :3] = np.clip(arr[:, :, :3] - spill_cast * edge_weight[:, :, None], 0, 255)
    return Image.fromarray(arr.astype("uint8"), "RGBA")


def feather_alpha(img: Image.Image, radius: float = 0.45) -> Image.Image:
    """Suaviza ligeramente el canal alfa para integrar mejor el recorte."""
    radius = max(0.0, min(3.0, float(radius)))
    if radius <= 0.0:
        return img.convert("RGBA")

    base = img.convert("RGBA")
    r, g, b, a = base.split()
    a = a.filter(ImageFilter.GaussianBlur(radius=radius))
    return Image.merge("RGBA", (r, g, b, a))


def restore_light_color(img: Image.Image, strength: float = 0.55) -> Image.Image:
    """Mejora luz/color con Pillow, preservando alfa y evitando dependencias pesadas."""
    strength = max(0.0, min(1.0, float(strength)))
    base = img.convert("RGBA")
    if strength <= 0.0:
        return base

    alpha = base.getchannel("A")
    rgb = base.convert("RGB")
    corrected = ImageOps.autocontrast(rgb, cutoff=1)
    corrected = ImageEnhance.Brightness(corrected).enhance(1.0 + (0.14 * strength))
    corrected = ImageEnhance.Contrast(corrected).enhance(1.0 + (0.24 * strength))
    corrected = ImageEnhance.Color(corrected).enhance(1.0 + (0.16 * strength))

    # Denoise suave para fotos planas/oscuras sin borrar demasiado detalle.
    softened = corrected.filter(ImageFilter.MedianFilter(size=3))
    corrected = Image.blend(corrected, softened, 0.18 * strength)
    corrected = Image.blend(rgb, corrected, strength)
    r, g, b = corrected.split()
    return Image.merge("RGBA", (r, g, b, alpha))


def _mean_luma(img: Image.Image) -> float:
    return float(ImageStat.Stat(img.convert("L")).mean[0])


def remove_background(
    img: Image.Image,
    session,
    alpha_matting: bool = True,
    post_process_mask: bool = True,
) -> Image.Image:
    """Remueve fondo usando rembg → devuelve RGBA con transparencia."""
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    result_bytes = remove(
        buf.read(),
        session=session,
        alpha_matting=alpha_matting,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=8,
        post_process_mask=post_process_mask,
    )
    return Image.open(io.BytesIO(result_bytes)).convert("RGBA")


def clean_alpha_artifacts(
    img: Image.Image,
    min_area_ratio: float = 0.0015,
    keep_largest: bool = False,
    alpha_threshold: int = 8,
) -> Image.Image:
    """Elimina islas pequeñas de alfa sin alterar los colores visibles."""
    if img.mode != "RGBA" or not CV2_AVAILABLE:
        return img

    arr = np.array(img)
    alpha = arr[:, :, 3]
    mask = (alpha > alpha_threshold).astype("uint8")
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    if num_labels <= 1:
        return img

    if keep_largest:
        largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        keep = {largest}
    else:
        min_area = max(16, int(img.width * img.height * min_area_ratio))
        keep = {
            idx
            for idx in range(1, num_labels)
            if stats[idx, cv2.CC_STAT_AREA] >= min_area
        }
        if not keep:
            keep = {1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))}

    cleaned_mask = np.isin(labels, list(keep))
    arr[:, :, 3] = np.where(cleaned_mask, alpha, 0).astype("uint8")
    return Image.fromarray(arr, "RGBA")


def make_soft_brush(radius: int, opacity: float = 1.0, softness: float = 0.65) -> Image.Image:
    """Crea un pincel radial suave para editar alfa sin bordes duros."""
    radius = max(1, int(radius))
    opacity = max(0.05, min(1.0, float(opacity)))
    softness = max(0.0, min(0.95, float(softness)))
    size = radius * 2 + 1
    hard_radius = radius * (1.0 - softness)
    brush = Image.new("L", (size, size), 0)
    px = brush.load()

    for y in range(size):
        for x in range(size):
            dx = x - radius
            dy = y - radius
            dist = (dx * dx + dy * dy) ** 0.5
            if dist > radius:
                continue
            if dist <= hard_radius or softness == 0:
                value = 255
            else:
                falloff = 1.0 - ((dist - hard_radius) / max(1.0, radius - hard_radius))
                value = int(255 * max(0.0, falloff))
            px[x, y] = int(value * opacity)

    return brush


def paste_brush_mask(size: tuple[int, int], x: int, y: int, brush: Image.Image) -> Image.Image:
    """Pega un pincel recortandolo si cae fuera de la imagen."""
    mask = Image.new("L", size, 0)
    half_w = brush.width // 2
    half_h = brush.height // 2
    left = int(x - half_w)
    top = int(y - half_h)
    right = left + brush.width
    bottom = top + brush.height

    dst_left = max(0, left)
    dst_top = max(0, top)
    dst_right = min(size[0], right)
    dst_bottom = min(size[1], bottom)
    if dst_left >= dst_right or dst_top >= dst_bottom:
        return mask

    src_left = dst_left - left
    src_top = dst_top - top
    src_right = src_left + (dst_right - dst_left)
    src_bottom = src_top + (dst_bottom - dst_top)
    mask.paste(brush.crop((src_left, src_top, src_right, src_bottom)), (dst_left, dst_top))
    return mask


def resize_restore_source(source: Image.Image | None, size: tuple[int, int]) -> Image.Image | None:
    if source is None:
        return None
    src = source.convert("RGBA")
    if src.size != size:
        src = src.resize(size, Image.LANCZOS)
    return src


def apply_alpha_brush(
    img: Image.Image,
    restore_source: Image.Image | None,
    x: int,
    y: int,
    radius: int,
    mode: str,
    opacity: float = 1.0,
    softness: float = 0.65,
) -> Image.Image:
    """Borra o recupera alfa con un pincel suave."""
    base = img.convert("RGBA")
    brush = make_soft_brush(radius, opacity, softness)
    mask = paste_brush_mask(base.size, x, y, brush)
    alpha = base.getchannel("A")

    if mode == "restore":
        source = resize_restore_source(restore_source, base.size) or base
        rgb = Image.composite(source.convert("RGB"), base.convert("RGB"), mask)
        alpha = Image.composite(Image.new("L", base.size, 255), alpha, mask)
        r, g, b = rgb.split()
        return Image.merge("RGBA", (r, g, b, alpha))

    alpha = Image.composite(Image.new("L", base.size, 0), alpha, mask)
    r, g, b, _ = base.split()
    return Image.merge("RGBA", (r, g, b, alpha))


def adjust_alpha_edge(img: Image.Image, action: str) -> Image.Image:
    """Aplica acciones globales de refinado sobre el canal alfa."""
    base = img.convert("RGBA")
    alpha = base.getchannel("A")

    if action == "smooth":
        alpha = alpha.filter(ImageFilter.GaussianBlur(radius=1.15))
        alpha = alpha.filter(ImageFilter.UnsharpMask(radius=1.0, percent=120, threshold=2))
    elif action == "expand":
        alpha = alpha.filter(ImageFilter.MaxFilter(3))
    elif action == "contract":
        alpha = alpha.filter(ImageFilter.MinFilter(3))
    elif action == "crisp":
        alpha = alpha.filter(ImageFilter.UnsharpMask(radius=1.2, percent=190, threshold=1))

    r, g, b, _ = base.split()
    return Image.merge("RGBA", (r, g, b, alpha))


def fit_into(img: Image.Image, box: tuple[int, int]) -> Image.Image:
    """Redimensiona manteniendo aspect ratio para caber en box."""
    thumb = img.copy()
    thumb.thumbnail(box, Image.LANCZOS)
    return thumb


def composite_on_checkerboard(img: Image.Image, box: tuple[int, int]) -> Image.Image:
    """Coloca la imagen sobre un tablero de ajedrez para la preview."""
    board = make_checkerboard(box)
    thumb = fit_into(img, box)
    if thumb.mode != "RGBA":
        thumb = thumb.convert("RGBA")
    x = (box[0] - thumb.width)  // 2
    y = (box[1] - thumb.height) // 2
    board.paste(thumb, (x, y), thumb)
    return board


def make_split_preview(before: Image.Image, after: Image.Image, box: tuple[int, int]) -> Image.Image:
    """Crea una comparacion vertical antes/despues dentro del mismo lienzo."""
    left = composite_on_checkerboard(before, box)
    right = composite_on_checkerboard(after, box)
    mid = box[0] // 2
    split = left.copy()
    split.paste(right.crop((mid, 0, box[0], box[1])), (mid, 0))
    draw = ImageDraw.Draw(split)
    draw.line((mid, 0, mid, box[1]), fill=(124, 106, 255, 255), width=3)
    draw.rectangle((mid - 22, 14, mid + 22, 40), fill=(17, 17, 19, 220), outline=(124, 106, 255, 255))
    draw.text((mid - 12, 20), "A/B", fill=(226, 226, 232, 255))
    return split


def _alpha_coverage_label(img: Image.Image) -> str:
    base = img.convert("RGBA")
    alpha = base.getchannel("A")
    hist = alpha.histogram()
    visible = sum(hist[1:])
    total = max(1, base.width * base.height)
    return f"{(visible * 100 / total):.1f}% alfa visible"


def make_labeled_segmentation_comparison(
    fast: Image.Image,
    premium: Image.Image,
    fast_label: str,
    premium_label: str,
) -> Image.Image:
    """Crea una hoja comparativa guardable entre segmentacion rapida y premium."""
    fast_rgba = fast.convert("RGBA")
    premium_rgba = premium.convert("RGBA")
    width = fast_rgba.width + premium_rgba.width
    image_h = max(fast_rgba.height, premium_rgba.height)
    header_h = 44
    canvas = make_checkerboard((width, image_h + header_h), tile=14)
    draw = ImageDraw.Draw(canvas)

    draw.rectangle((0, 0, fast_rgba.width, header_h), fill=(17, 17, 19, 235))
    draw.rectangle((fast_rgba.width, 0, width, header_h), fill=(17, 17, 19, 235))
    draw.line((fast_rgba.width, 0, fast_rgba.width, image_h + header_h), fill=(124, 106, 255, 255), width=3)
    draw.text((14, 10), fast_label, fill=(226, 226, 232, 255))
    draw.text((fast_rgba.width + 14, 10), premium_label, fill=(253, 228, 0, 255))
    draw.text((14, 27), _alpha_coverage_label(fast_rgba), fill=(90, 90, 106, 255))
    draw.text((fast_rgba.width + 14, 27), _alpha_coverage_label(premium_rgba), fill=(90, 90, 106, 255))

    y_fast = header_h + ((image_h - fast_rgba.height) // 2)
    y_premium = header_h + ((image_h - premium_rgba.height) // 2)
    canvas.paste(fast_rgba, (0, y_fast), fast_rgba)
    canvas.paste(premium_rgba, (fast_rgba.width, y_premium), premium_rgba)
    return canvas


def _format_pct(value: float) -> str:
    return f"{value:.1f}%"


def _safe_asset_slug(name: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9_\\-]+", "_", name.strip())
    slug = re.sub(r"_+", "_", slug).strip("_-")
    return slug.lower() or "image_asset"


def _compute_quality_score_local(image_path: Path, metric_name: str) -> float:
    import pyiqa

    metric = pyiqa.create_metric(metric_name, device="cpu")
    value = metric(str(image_path))
    raw_value = value.item() if hasattr(value, "item") else value
    return float(raw_value)


def _compute_quality_score_external(image_path: Path, metric_name: str, python_path: Path) -> float:
    command = [
        str(python_path),
        "-c",
        (
            "import sys, pyiqa; "
            "metric = pyiqa.create_metric(sys.argv[2], device='cpu'); "
            "value = metric(sys.argv[1]); "
            "raw = value.item() if hasattr(value, 'item') else value; "
            "print(float(raw))"
        ),
        str(image_path),
        metric_name,
    ]
    completed = subprocess.run(
        command,
        capture_output=True,
        text=True,
        check=True,
        timeout=180,
    )
    output = completed.stdout.strip().splitlines()
    if not output:
        raise RuntimeError("PyIQA no devolvio score.")
    return float(output[-1].strip())


def maybe_collect_quality_score(
    image: Image.Image,
    *,
    active_modules: tuple[str, ...] = (),
    render_mode: str = "final",
) -> str | None:
    if "quality_pyiqa" not in active_modules:
        return None
    if render_mode not in {"final", "comfyui"}:
        return None

    metric_name = os.environ.get(PYIQA_ENV_METRIC, "niqe").strip() or "niqe"
    external_python = os.environ.get(PYIQA_ENV_PYTHON, "").strip()

    try:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = Path(tmp.name)
        try:
            image.convert("RGB").save(tmp_path, format="PNG", optimize=True)
            if external_python:
                score_value = _compute_quality_score_external(
                    tmp_path,
                    metric_name,
                    Path(external_python).expanduser(),
                )
            else:
                score_value = _compute_quality_score_local(tmp_path, metric_name)
        finally:
            tmp_path.unlink(missing_ok=True)
    except Exception:
        return None

    return f"{metric_name}:{score_value:.4f}"


def collect_basic_metrics(
    image: Image.Image,
    *,
    source_size: tuple[int, int] | None = None,
    provider: str = "",
    warnings: list[str] | None = None,
    active_modules: tuple[str, ...] = (),
    render_mode: str = "final",
) -> dict[str, str]:
    rgba = image.convert("RGBA")
    total_px = max(1, rgba.width * rgba.height)
    alpha = rgba.getchannel("A")
    hist = alpha.histogram()
    transparent_px = hist[0]
    opaque_px = hist[255]
    visible_px = total_px - transparent_px
    soft_alpha_px = max(0, total_px - transparent_px - opaque_px)
    alpha_min, alpha_max = alpha.getextrema()

    metrics: dict[str, str] = {
        "render": render_mode,
        "mode": image.mode,
        "size": f"{image.width}x{image.height}",
        "megapixels": f"{(total_px / 1_000_000):.2f} MP",
        "alpha_range": f"{alpha_min}-{alpha_max}",
        "alpha_visible": _format_pct(visible_px * 100 / total_px),
        "alpha_transparent": _format_pct(transparent_px * 100 / total_px),
        "alpha_soft": _format_pct(soft_alpha_px * 100 / total_px),
        "warnings": str(len(warnings or [])),
        "active_modules": ", ".join(active_modules) if active_modules else "ninguno",
    }
    if source_size:
        sw, sh = source_size
        metrics["source_size"] = f"{sw}x{sh}"
        metrics["scale"] = f"{image.width / max(1, sw):.2f}x/{image.height / max(1, sh):.2f}x"
    if provider:
        metrics["provider"] = provider
    score = maybe_collect_quality_score(
        image,
        active_modules=active_modules,
        render_mode=render_mode,
    )
    if score:
        metrics["score"] = score
    return metrics


def export_ue5_texture_set(
    image: Image.Image,
    destination_parent: Path,
    asset_name: str,
    *,
    metrics: dict[str, str] | None = None,
    source_path: Path | None = None,
) -> UE5TextureSetExport:
    asset_slug = _safe_asset_slug(asset_name)
    export_folder = Path(destination_parent) / f"{asset_slug}_UE5_Texture_Set"
    export_folder.mkdir(parents=True, exist_ok=True)

    export = UE5TextureSetExport(folder=export_folder)
    albedo_path = export_folder / "albedo.png"
    image.convert("RGBA").save(albedo_path, format="PNG", optimize=True)
    export.files["albedo"] = albedo_path

    depth_status = MODULE_REGISTRY.status("ue5_depth")
    normal_status = MODULE_REGISTRY.status("ue5_normal_map")
    if depth_status != "Activo":
        export.warnings.append("depth.png omitido: ue5_depth aun no tiene modelo ONNX validado.")
    if normal_status != "Activo":
        export.warnings.append("normal.png omitido: ue5_normal_map aun no tiene modelo validado.")

    export.metrics = dict(metrics or {})
    manifest = {
        "profile": "UE5 Texture Set",
        "asset": asset_slug,
        "source": str(source_path) if source_path else "",
        "files": {key: path.name for key, path in export.files.items()},
        "missing": {
            "depth": "ue5_depth no instalado" if "depth" not in export.files else "",
            "normal": "ue5_normal_map no instalado" if "normal" not in export.files else "",
        },
        "metrics": export.metrics,
        "warnings": export.warnings,
    }
    manifest_path = export_folder / "texture_manifest.json"
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    export.files["manifest"] = manifest_path
    return export


def apply_background_pipeline(
    img: Image.Image,
    model_key: str,
    alpha_matting: bool = True,
    post_process_mask: bool = True,
    cleanup: bool = True,
    cleanup_ratio: float = 0.0015,
    keep_main_object: bool = False,
    despill: bool = True,
    despill_strength: float = 0.55,
    feather: bool = True,
    feather_radius: float = 0.45,
    token: CancellationToken | None = None,
    status_cb: Callable[[str, str], None] | None = None,
    label: str = "",
) -> Image.Image:
    """Aplica segmentacion rembg y el postproceso alfa confirmado."""
    token = token or CancellationToken()
    if not REMBG_AVAILABLE:
        raise RuntimeError("rembg no esta instalado. Ejecuta instalar.bat.")

    prefix = f"{label}: " if label else ""
    _notify(status_cb, f"{prefix}Cargando modelo IA {model_key}...", TEXT_DIM)
    session = get_rembg_session(model_key)
    token.raise_if_cancelled()
    _notify(status_cb, f"{prefix}Removiendo fondo con {model_key}...", TEXT_DIM)
    result = remove_background(
        img,
        session,
        alpha_matting=alpha_matting,
        post_process_mask=post_process_mask,
    )
    token.raise_if_cancelled()
    if cleanup:
        _notify(status_cb, f"{prefix}Limpiando restos sueltos...", TEXT_DIM)
        result = clean_alpha_artifacts(
            result,
            min_area_ratio=cleanup_ratio,
            keep_largest=keep_main_object,
        )
    if despill:
        _notify(status_cb, f"{prefix}Descontaminando color de bordes...", TEXT_DIM)
        result = despill_edges(result, despill_strength)
    if feather:
        _notify(status_cb, f"{prefix}Suavizando alfa del recorte...", TEXT_DIM)
        result = feather_alpha(result, feather_radius)
    return result


def compare_segmentation_presets(
    source: Image.Image,
    options: ProcessingOptions,
    token: CancellationToken | None = None,
    status_cb: Callable[[str, str], None] | None = None,
) -> SegmentationComparisonResult:
    """Compara u2net contra BiRefNet en preview 25% sin alterar el resultado final."""
    token = token or CancellationToken()
    if not REMBG_AVAILABLE:
        raise RuntimeError("rembg no esta instalado. Ejecuta instalar.bat.")

    base = source.copy()
    if base.mode not in ("RGB", "RGBA"):
        base = base.convert("RGBA")

    preview_size = (max(1, base.width // 4), max(1, base.height // 4))
    base = base.resize(preview_size, Image.LANCZOS)
    _notify(status_cb, "Comparacion rapida de segmentacion al 25%...", TEXT_DIM)

    fast = apply_background_pipeline(
        base.copy(),
        FAST_SEGMENTATION_MODEL,
        alpha_matting=options.alpha_matting,
        post_process_mask=options.post_process_mask,
        cleanup=options.cleanup,
        cleanup_ratio=options.cleanup_ratio,
        keep_main_object=options.keep_main_object,
        despill=options.despill,
        despill_strength=options.despill_strength,
        feather=options.feather,
        feather_radius=options.feather_radius,
        token=token,
        status_cb=status_cb,
        label="u2net rapido",
    )
    token.raise_if_cancelled()
    premium = apply_background_pipeline(
        base.copy(),
        PREMIUM_SEGMENTATION_MODEL,
        alpha_matting=options.alpha_matting,
        post_process_mask=options.post_process_mask,
        cleanup=options.cleanup,
        cleanup_ratio=options.cleanup_ratio,
        keep_main_object=options.keep_main_object,
        despill=options.despill,
        despill_strength=options.despill_strength,
        feather=options.feather,
        feather_radius=options.feather_radius,
        token=token,
        status_cb=status_cb,
        label="BiRefNet premium",
    )
    comparison = make_labeled_segmentation_comparison(
        fast,
        premium,
        "u2net rapido",
        "BiRefNet premium",
    )
    return SegmentationComparisonResult(
        image=comparison,
        fast_image=fast,
        premium_image=premium,
        metrics={
            FAST_SEGMENTATION_MODEL: _alpha_coverage_label(fast),
            PREMIUM_SEGMENTATION_MODEL: _alpha_coverage_label(premium),
        },
    )


SUPPORTED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"}


def _now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def _save_image_variant(image: Image.Image, target_path: Path, fmt: str, jpeg_quality: int = 95):
    target_path.parent.mkdir(parents=True, exist_ok=True)
    if fmt == "jpg":
        bg = Image.new("RGB", image.size, (255, 255, 255))
        rgba = image.convert("RGBA")
        bg.paste(rgba, mask=rgba.getchannel("A"))
        bg.save(target_path, format="JPEG", quality=jpeg_quality, optimize=True)
    else:
        image.convert("RGBA").save(target_path, format="PNG", optimize=True)


def export_with_profile(
    image: Image.Image,
    source_path: Path,
    output_root: Path,
    profile: ExportProfile,
    *,
    input_root: Path | None = None,
) -> list[Path]:
    relative_parent = Path()
    if profile.keep_folder_structure and input_root:
        try:
            relative_parent = source_path.parent.relative_to(input_root)
        except ValueError:
            relative_parent = Path()
    base_dir = output_root / profile.output_subdir / relative_parent
    stem = source_path.stem + profile.filename_suffix
    outputs: list[Path] = []
    for fmt in profile.formats:
        target = base_dir / f"{stem}.{fmt}"
        _save_image_variant(image, target, fmt, profile.jpeg_quality)
        outputs.append(target)
    return outputs


def _iter_folder_images(folder: Path) -> list[Path]:
    return sorted(path for path in folder.rglob("*") if path.suffix.lower() in SUPPORTED_IMAGE_EXTENSIONS)


# ── App principal ──────────────────────────────────────────────────────────


def process_image(
    source: Image.Image,
    options: ProcessingOptions,
    token: CancellationToken | None = None,
    status_cb: Callable[[str, str], None] | None = None,
) -> ProcessingResult:
    token = token or CancellationToken()
    warnings: list[str] = []
    active_modules = set(options.active_modules)
    module_metrics: dict[str, str] = {}
    source_size = source.size
    img = source.copy()
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA")

    if options.render_mode == "preview":
        preview_size = (max(1, img.width // 4), max(1, img.height // 4))
        img = img.resize(preview_size, Image.LANCZOS)
        _notify(status_cb, "Preview rapido al 25%...", TEXT_DIM)

    token.raise_if_cancelled()
    if options.do_rembg:
        img = apply_background_pipeline(
            img,
            options.model_key,
            alpha_matting=options.alpha_matting,
            post_process_mask=options.post_process_mask,
            cleanup=options.cleanup,
            cleanup_ratio=options.cleanup_ratio,
            keep_main_object=options.keep_main_object,
            despill=options.despill,
            despill_strength=options.despill_strength,
            feather=options.feather,
            feather_radius=options.feather_radius,
            token=token,
            status_cb=status_cb,
        )
        _notify(status_cb, "Fondo removido ✓", SUCCESS)

    token.raise_if_cancelled()
    if options.do_light_color_restore or "color_local_restore" in active_modules:
        _notify(status_cb, "Restaurando luz/color local...", TEXT_DIM)
        try:
            img = restore_light_color(img, options.light_restore_strength)
            module_metrics["color_local_restore"] = "aplicado"
            _notify(status_cb, "Luz/color restaurados ✓", SUCCESS)
        except Exception as exc:
            warnings.append(f"Luz/color local omitido: {exc}")
            module_metrics["color_local_restore"] = "fallback"
            _notify(status_cb, "Luz/color no se pudo aplicar; sigue el render base.", WARNING)

    token.raise_if_cancelled()
    if options.do_upscale:
        if options.render_mode == "preview":
            warnings.append("Preview rapido: upscale IA completo omitido.")
            _notify(status_cb, "Preview: upscale completo omitido para mantener velocidad.", WARNING)
        elif options.upscale_engine == "realesrgan":
            _notify(status_cb, f"Upscaling {options.factor}× con Real-ESRGAN ONNX ({options.mode_label})...", TEXT_DIM)
            try:
                img = realesrgan_upscale_image(
                    img,
                    options.factor,
                    options.sharpness,
                    options.contrast,
                    status_cb=status_cb,
                    cancellation_token=token,
                )
            except Exception as exc:
                warnings.append(f"Real-ESRGAN fallback LANCZOS: {exc}")
                print(f"[Real-ESRGAN] Fallback LANCZOS activado: {exc}")
                _notify(status_cb, "Real-ESRGAN no cargo; usando LANCZOS fallback...", WARNING)
                img = upscale_image(img, options.factor, options.sharpness, options.contrast)
        else:
            _notify(status_cb, f"Upscaling {options.factor}× con LANCZOS + sharpen ({options.mode_label})...", TEXT_DIM)
            img = upscale_image(img, options.factor, options.sharpness, options.contrast)
        if options.render_mode != "preview":
            _notify(status_cb, f"Calidad mejorada {options.factor}× ✓", SUCCESS)

    token.raise_if_cancelled()
    if options.do_face_recovery and options.render_mode != "preview":
        try:
            face_backend = options.face_backend if options.face_backend in {"codeformer", "gfpgan"} else "codeformer"
            if face_backend == "gfpgan":
                restored = run_gfpgan_face_recovery(
                    img,
                    status_cb=status_cb,
                    crop_to_face=options.use_face_crop or "portrait_face_detector" in active_modules,
                )
                module_metrics["portrait_gfpgan_external"] = "aplicado"
            else:
                restored = run_codeformer_face_recovery(
                    img,
                    fidelity=options.face_strength,
                    status_cb=status_cb,
                    crop_to_face=options.use_face_crop or "portrait_face_detector" in active_modules,
                )
                module_metrics["portrait_codeformer"] = "aplicado"
            img = blend_rgba(img, restored, options.face_strength)
            module_metrics["portrait_face_backend"] = face_backend
            module_metrics["portrait_face_crop"] = (
                "activo" if options.use_face_crop or "portrait_face_detector" in active_modules else "inactivo"
            )
            _notify(status_cb, "Face recovery aplicado ✓", SUCCESS)
        except Exception as exc:
            warnings.append(f"Face recovery omitido: {exc}")
            module_metrics["portrait_codeformer"] = "fallback"
            module_metrics["portrait_gfpgan_external"] = "fallback"
            _notify(status_cb, "Face recovery no disponible; se conserva el render base.", WARNING)

    provider = MODEL_MANAGER.runtime_label()
    metrics = collect_basic_metrics(
        img,
        source_size=source_size,
        provider=provider,
        warnings=warnings,
        active_modules=options.active_modules,
        render_mode=options.render_mode,
    )
    metrics.update(module_metrics)

    return ProcessingResult(
        image=img,
        render_mode=options.render_mode,
        provider=provider,
        warnings=warnings,
        metrics=metrics,
    )


def record_processing_history(
    source_path: Path | None,
    result: ProcessingResult,
    *,
    kind: str,
    extra: dict[str, str] | None = None,
):
    append_history(
        {
            "timestamp": _now_iso(),
            "kind": kind,
            "source": str(source_path) if source_path else "",
            "render_mode": result.render_mode,
            "provider": result.provider,
            "warnings": result.warnings,
            "metrics": result.metrics,
            "extra": extra or {},
        }
    )


def export_current_result_with_profile(
    image: Image.Image,
    source_path: Path,
    destination_root: Path,
    profile_id: str,
) -> list[Path]:
    profile = get_export_profile(profile_id)
    if profile is None:
        raise RuntimeError(f"Perfil de exportacion desconocido: {profile_id}")
    return export_with_profile(image, source_path, destination_root, profile)


def run_production_batch_smoke() -> int:
    """Valida Fase 9 con presets/export/batch/historial/reportes sin tocar la UI."""
    try:
        with tempfile.TemporaryDirectory(prefix="image_enhancer_batch_smoke_") as tmp_dir:
            root = Path(tmp_dir)
            input_dir = root / "input"
            output_dir = root / "output"
            input_dir.mkdir(parents=True, exist_ok=True)
            output_dir.mkdir(parents=True, exist_ok=True)

            img1 = Image.new("RGBA", (24, 24), (120, 80, 60, 255))
            img2 = Image.new("RGBA", (18, 30), (40, 90, 150, 255))
            img1.save(input_dir / "sample_a.png", format="PNG")
            img2.save(input_dir / "sample_b.png", format="PNG")

            options = ProcessingOptions(
                do_rembg=False,
                do_upscale=False,
                do_light_color_restore=True,
                render_mode="final",
                active_modules=("production_batch", "color_local_restore"),
            )
            report = run_batch_folder(
                input_dir,
                output_dir,
                options,
                "png_transparent",
                token=CancellationToken(),
                status_cb=lambda _msg, _color: None,
            )
            if report.status != "done":
                raise RuntimeError(f"estado inesperado del batch: {report.status}")
            if report.items_ok != 2 or report.items_error != 0 or report.items_cancelled != 0:
                raise RuntimeError(
                    f"conteos batch inesperados: ok={report.items_ok} err={report.items_error} cancel={report.items_cancelled}"
                )
            if not report.report_path or not Path(report.report_path).exists():
                raise RuntimeError("no se genero el reporte final por lote")
            exported = sorted(output_dir.rglob("*.png"))
            if len(exported) != 2:
                raise RuntimeError(f"se esperaban 2 PNG exportados y se encontraron {len(exported)}")
        print("OK: production batch smoke passed")
        return 0
    except Exception as exc:
        print(f"FAIL: production batch smoke failed: {exc}", file=sys.stderr)
        return 1


def run_batch_folder(
    input_dir: Path,
    output_dir: Path,
    options: ProcessingOptions,
    profile_id: str,
    *,
    token: CancellationToken | None = None,
    status_cb: Callable[[str, str], None] | None = None,
    item_cb: Callable[[BatchItemResult, int, int], None] | None = None,
) -> BatchReport:
    token = token or CancellationToken()
    profile = get_export_profile(profile_id)
    if profile is None:
        raise RuntimeError(f"Perfil de exportacion desconocido: {profile_id}")
    input_dir = Path(input_dir)
    output_dir = Path(output_dir)
    files = _iter_folder_images(input_dir)
    if not files:
        raise RuntimeError(f"No se encontraron imagenes compatibles en {input_dir}")

    report = BatchReport(
        batch_name=slugify(input_dir.name),
        input_dir=str(input_dir),
        output_dir=str(output_dir),
        export_profile_id=profile_id,
        started_at=_now_iso(),
        items_total=len(files),
    )
    _notify(status_cb, f"Batch listo: {len(files)} imagen(es) en cola...", TEXT_DIM)

    for index, file_path in enumerate(files, start=1):
        if token.is_cancelled():
            report.status = "cancelled"
            break
        started = time.perf_counter()
        try:
            token.raise_if_cancelled()
            _notify(status_cb, f"[Batch {index}/{len(files)}] Procesando {file_path.name}...", TEXT_DIM)
            with Image.open(file_path) as opened:
                src = opened.convert("RGBA") if opened.mode not in ("RGB", "RGBA") else opened.copy()
            result = process_image(src, options, token=token, status_cb=status_cb)
            outputs = export_with_profile(result.image, file_path, output_dir, profile, input_root=input_dir)
            duration_ms = int((time.perf_counter() - started) * 1000)
            item = BatchItemResult(
                source_path=str(file_path),
                status="ok",
                output_paths=[str(path) for path in outputs],
                duration_ms=duration_ms,
                provider=result.provider,
                warnings=result.warnings,
                metrics=result.metrics,
            )
            report.items.append(item)
            report.items_ok += 1
            append_history(
                {
                    "timestamp": _now_iso(),
                    "kind": "batch-item",
                    "source": str(file_path),
                    "render_mode": result.render_mode,
                    "provider": result.provider,
                    "warnings": result.warnings,
                    "metrics": result.metrics,
                    "extra": {"outputs": item.output_paths, "profile": profile_id},
                }
            )
        except ProcessingCancelled:
            duration_ms = int((time.perf_counter() - started) * 1000)
            item = BatchItemResult(
                source_path=str(file_path),
                status="cancelled",
                duration_ms=duration_ms,
                error="Procesamiento cancelado por el usuario.",
            )
            report.items.append(item)
            report.items_cancelled += 1
            report.status = "cancelled"
            if item_cb:
                item_cb(item, index, len(files))
            break
        except Exception as exc:
            duration_ms = int((time.perf_counter() - started) * 1000)
            item = BatchItemResult(
                source_path=str(file_path),
                status="error",
                duration_ms=duration_ms,
                error=str(exc),
            )
            report.items.append(item)
            report.items_error += 1
        if item_cb:
            item_cb(report.items[-1], index, len(files))

    if report.status == "running":
        report.status = "done"
    if report.status == "cancelled":
        remaining = max(0, report.items_total - len(report.items))
        report.items_cancelled += remaining
    report.finished_at = _now_iso()
    report_dict = {
        "batch_name": report.batch_name,
        "input_dir": report.input_dir,
        "output_dir": report.output_dir,
        "export_profile_id": report.export_profile_id,
        "started_at": report.started_at,
        "finished_at": report.finished_at,
        "status": report.status,
        "items_total": report.items_total,
        "items_ok": report.items_ok,
        "items_error": report.items_error,
        "items_cancelled": report.items_cancelled,
        "items": [
            {
                "source_path": item.source_path,
                "status": item.status,
                "output_paths": item.output_paths,
                "duration_ms": item.duration_ms,
                "provider": item.provider,
                "warnings": item.warnings,
                "error": item.error,
                "metrics": item.metrics,
            }
            for item in report.items
        ],
    }
    report_path = save_batch_report(report_dict, report.batch_name)
    report.report_path = str(report_path)
    append_history(
        {
            "timestamp": _now_iso(),
            "kind": "batch-report",
            "source": report.input_dir,
            "render_mode": "batch",
            "provider": "",
            "warnings": [],
            "metrics": {
                "status": report.status,
                "items_total": str(report.items_total),
                "items_ok": str(report.items_ok),
                "items_error": str(report.items_error),
                "items_cancelled": str(report.items_cancelled),
            },
            "extra": {"report_path": report.report_path, "profile": profile_id},
        }
    )
    return report


def run_comfyui_external(
    image: Image.Image,
    *,
    base_url: str,
    workflow_path: str,
    output_prefix: str,
    prompt_text: str = "",
    negative_prompt: str = "",
    reference_image_path: str = "",
    control_image_path: str = "",
    workflow_params: dict[str, object] | None = None,
    token: CancellationToken | None = None,
    status_cb: Callable[[str, str], None] | None = None,
) -> ProcessingResult:
    token = token or CancellationToken()
    try:
        result_image, meta = run_workflow(
            image,
            base_url=base_url,
            workflow_path=workflow_path,
            output_prefix=output_prefix,
            prompt_text=prompt_text,
            negative_prompt=negative_prompt,
            reference_image_path=reference_image_path,
            control_image_path=control_image_path,
            workflow_params=workflow_params,
            cancel_check=token.is_cancelled,
            status_cb=lambda msg: _notify(status_cb, msg, TEXT_DIM),
        )
    except ComfyUICancelled as exc:
        raise ProcessingCancelled(str(exc)) from exc

    metrics = collect_basic_metrics(
        result_image,
        source_size=image.size,
        provider="ComfyUI externo",
        warnings=[],
        active_modules=("creative_comfyui",),
        render_mode="comfyui",
    )
    metrics["comfy_prompt_id"] = str(meta.get("prompt_id", ""))
    metrics["comfy_output"] = str(meta.get("filename", ""))
    if meta.get("reference_image"):
        metrics["comfy_reference"] = str(meta.get("reference_image", ""))
    if meta.get("control_image"):
        metrics["comfy_control"] = str(meta.get("control_image", ""))
    return ProcessingResult(
        image=result_image,
        render_mode="comfyui",
        provider="ComfyUI externo",
        warnings=[],
        metrics=metrics,
    )


def run_smoke() -> int:
    """Headless runtime validation for installs and packaged builds."""
    if not REMBG_AVAILABLE:
        print("FAIL: rembg is not installed", file=sys.stderr)
        return 1
    if not NUMPY_AVAILABLE:
        print("FAIL: numpy is not installed", file=sys.stderr)
        return 1

    if not ORT_AVAILABLE:
        print("FAIL: onnxruntime is not installed", file=sys.stderr)
        return 1

    try:
        img = Image.new("RGBA", (12, 8), (120, 80, 40, 180))
        up = upscale_image(img, 2, 1.3, 1.05)
        preview = composite_on_checkerboard(up, (64, 64))
        split = make_split_preview(img, up, (96, 64))
        cleaned = clean_alpha_artifacts(up, min_area_ratio=0.001, keep_largest=False)
        erased = apply_alpha_brush(up, img, 8, 6, 4, "erase", 1.0, 0.5)
        restored = apply_alpha_brush(erased, img, 8, 6, 4, "restore", 1.0, 0.5)
        smoothed = adjust_alpha_edge(restored, "smooth")
        despilled = despill_edges(smoothed, 0.55)
        feathered = feather_alpha(despilled, 0.45)
        light_restored = restore_light_color(feathered, 0.55)
        metrics = collect_basic_metrics(
            light_restored,
            source_size=img.size,
            provider="smoke",
            warnings=["smoke warning"],
            active_modules=("ue5_texture_set", "color_local_restore"),
            render_mode="final",
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            ue5_export = export_ue5_texture_set(
                light_restored,
                Path(tmp_dir),
                "smoke asset",
                metrics=metrics,
            )
            assert (ue5_export.folder / "albedo.png").exists()
            assert (ue5_export.folder / "texture_manifest.json").exists()
        assert up.size == (24, 16)
        assert up.mode == "RGBA"
        assert preview.size == (64, 64)
        assert preview.mode == "RGBA"
        assert split.size == (96, 64)
        assert cleaned.mode == "RGBA"
        assert erased.getchannel("A").getextrema()[0] == 0
        assert restored.mode == "RGBA"
        assert smoothed.mode == "RGBA"
        assert despilled.mode == "RGBA"
        assert feathered.mode == "RGBA"
        assert light_restored.mode == "RGBA"
        assert metrics["alpha_visible"].endswith("%")
        assert metrics["warnings"] == "1"
    except Exception as exc:
        print(f"FAIL: image pipeline smoke failed: {exc}", file=sys.stderr)
        return 1

    print("OK: smoke validation passed")
    return 0


def run_rembg_smoke(model_key: str) -> int:
    """Validate a real rembg session and processing pass."""
    if model_key not in MODEL_KEYS:
        print(f"FAIL: unsupported model {model_key}", file=sys.stderr)
        return 1
    if not REMBG_AVAILABLE:
        print("FAIL: rembg is not installed", file=sys.stderr)
        return 1

    try:
        img = Image.new("RGB", (96, 96), "white")
        draw = ImageDraw.Draw(img)
        draw.rounded_rectangle([22, 18, 74, 78], radius=12, fill=(220, 45, 45))
        session = get_rembg_session(model_key)
        result = remove_background(img, session, alpha_matting=True, post_process_mask=True)
        result = clean_alpha_artifacts(result, min_area_ratio=0.0015, keep_largest=False)
        if result.mode != "RGBA":
            raise RuntimeError(f"expected RGBA output, got {result.mode}")
        print(f"OK: rembg smoke passed with {model_key} ({result.width}x{result.height})")
        return 0
    except Exception as exc:
        print(f"FAIL: rembg smoke failed with {model_key}: {exc}", file=sys.stderr)
        return 1


def run_segmentation_compare_smoke() -> int:
    """Valida la comparacion real u2net vs BiRefNet. Puede descargar modelos."""
    if not REMBG_AVAILABLE:
        print("FAIL: rembg is not installed", file=sys.stderr)
        return 1

    try:
        img = Image.new("RGB", (128, 112), "white")
        draw = ImageDraw.Draw(img)
        draw.ellipse([36, 18, 92, 74], fill=(40, 80, 220))
        draw.rectangle([46, 62, 82, 98], fill=(40, 80, 220))
        options = ProcessingOptions(do_rembg=True, do_upscale=False, render_mode="preview")
        result = compare_segmentation_presets(
            img,
            options,
            status_cb=lambda msg, _color=TEXT_DIM: print(msg),
        )
        if result.image.mode != "RGBA" or result.fast_image.mode != "RGBA" or result.premium_image.mode != "RGBA":
            raise RuntimeError("expected RGBA outputs from segmentation comparison")
        print(
            "OK: segmentation comparison smoke passed "
            f"({FAST_SEGMENTATION_MODEL} vs {PREMIUM_SEGMENTATION_MODEL})"
        )
        return 0
    except Exception as exc:
        print(f"FAIL: segmentation comparison smoke failed: {exc}", file=sys.stderr)
        return 1


def run_realesrgan_smoke() -> int:
    """Validate Real-ESRGAN ONNX with a tiny one-tile image. May download ~60 MB."""
    if not ORT_AVAILABLE:
        print("FAIL: onnxruntime is not installed", file=sys.stderr)
        return 1
    if not NUMPY_AVAILABLE:
        print("FAIL: numpy is not installed", file=sys.stderr)
        return 1

    try:
        img = Image.new("RGBA", (10, 8), (60, 120, 210, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([2, 2, 7, 6], fill=(220, 70, 40, 210))
        result = realesrgan_upscale_image(
            img,
            factor=2,
            sharpness=1.0,
            contrast=1.0,
            status_cb=lambda msg, _color=TEXT_DIM: print(msg),
        )
        if result.size != (20, 16) or result.mode != "RGBA":
            raise RuntimeError(f"unexpected Real-ESRGAN output {result.size} {result.mode}")
        print("OK: Real-ESRGAN smoke passed")
        return 0
    except Exception as exc:
        print(f"FAIL: Real-ESRGAN smoke failed: {exc}", file=sys.stderr)
        return 1


def run_codeformer_smoke() -> int:
    """Valida que la integracion externa de CodeFormer este configurada."""
    try:
        python_cmd, script_path = resolve_codeformer_cli()
        print(f"OK: CodeFormer integration ready -> {python_cmd} | {script_path}")
        return 0
    except Exception as exc:
        print(f"FAIL: CodeFormer integration is not ready: {exc}", file=sys.stderr)
        return 1


def _print_optional_file_probe(label: str, env_name: str, *, require_ort: bool = False) -> bool:
    if not os.environ.get(env_name, "").strip():
        print(f"OK: {label} en fallback ({env_name} no definido)")
        return True
    ok, msg = _optional_env_path(env_name)
    if not ok:
        print(f"FAIL: {label}: {msg}", file=sys.stderr)
        return False
    if require_ort and not ORT_AVAILABLE:
        print(f"FAIL: {label}: onnxruntime no esta instalado", file=sys.stderr)
        return False
    print(f"OK: {label} candidato -> {msg}")
    return True


def run_portrait_smoke() -> int:
    """Valida Fase 7 sin exigir PyTorch ni un modelo local pesado."""
    ok = True
    detector_ready, detector_msg = face_detector_ready()
    if detector_ready:
        print(f"OK: detector facial local listo -> {detector_msg}")
    else:
        print(f"OK: detector facial en fallback -> {detector_msg}")

    passed, msg = MODULE_REGISTRY.validate("portrait_codeformer")
    print(f"{'OK' if passed else 'FAIL'}: portrait_codeformer - {msg}")
    ok = ok and passed
    passed, msg = MODULE_REGISTRY.validate("portrait_gfpgan_external")
    print(f"{'OK' if passed else 'FAIL'}: portrait_gfpgan_external - {msg}")
    ok = ok and passed
    ok = _print_optional_file_probe("CodeFormer ONNX", CODEFORMER_ENV_ONNX, require_ort=True) and ok
    ok = _print_optional_file_probe("GFPGAN externo", GFPGAN_ENV_SCRIPT) and ok
    if os.environ.get(GFPGAN_ENV_PYTHON, "").strip():
        print(f"OK: GFPGAN python configurado -> {os.environ[GFPGAN_ENV_PYTHON]}")

    if ok:
        print("OK: portrait phase smoke passed")
        return 0
    return 1


def run_color_restore_smoke() -> int:
    """Valida Fase 8 con restauracion local y candidatos ONNX opcionales."""
    try:
        img = Image.new("RGBA", (32, 24), (36, 42, 50, 255))
        draw = ImageDraw.Draw(img)
        draw.rectangle([8, 6, 24, 18], fill=(58, 70, 86, 255))
        before = _mean_luma(img)
        result = restore_light_color(img, 0.72)
        after = _mean_luma(result)
        if result.size != img.size or result.mode != "RGBA":
            raise RuntimeError(f"salida inesperada {result.size} {result.mode}")
        if after <= before:
            raise RuntimeError(f"luma no mejoro ({before:.2f} -> {after:.2f})")
    except Exception as exc:
        print(f"FAIL: color restore smoke failed: {exc}", file=sys.stderr)
        return 1

    ok = True
    ok = _print_optional_file_probe("Zero-DCE ONNX", ZERO_DCE_ENV_ONNX, require_ort=True) and ok
    ok = _print_optional_file_probe("DeepWB ONNX", DEEPWB_ENV_ONNX, require_ort=True) and ok
    ok = _print_optional_file_probe("SwinIR/HAT/BSRGAN ONNX", SWINIR_ENV_ONNX, require_ort=True) and ok
    ok = _print_optional_file_probe("NAFNet ONNX", NAFNET_ENV_ONNX, require_ort=True) and ok
    if ok:
        print(f"OK: color restore smoke passed (luma {before:.2f} -> {after:.2f})")
        return 0
    return 1


def run_ue5_texture_set_smoke() -> int:
    """Valida Fase 5 v1: export UE5 albedo + manifest con fallback depth/normal."""
    try:
        img = Image.new("RGBA", (24, 18), (120, 80, 40, 220))
        draw = ImageDraw.Draw(img)
        draw.rectangle([4, 4, 18, 14], fill=(200, 160, 90, 255))
        metrics = collect_basic_metrics(
            img,
            source_size=(12, 9),
            provider="ue5-smoke",
            warnings=[],
            active_modules=("ue5_texture_set",),
            render_mode="final",
        )
        with tempfile.TemporaryDirectory(prefix="image_enhancer_ue5_smoke_") as tmp_dir:
            export = export_ue5_texture_set(
                img,
                Path(tmp_dir),
                "Smoke Asset 01",
                metrics=metrics,
            )
            albedo_path = export.folder / "albedo.png"
            manifest_path = export.folder / "texture_manifest.json"
            if not albedo_path.exists():
                raise RuntimeError("albedo.png no fue exportado")
            if not manifest_path.exists():
                raise RuntimeError("texture_manifest.json no fue exportado")
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            if manifest.get("profile") != "UE5 Texture Set":
                raise RuntimeError("manifest sin profile UE5 Texture Set")
            if manifest.get("files", {}).get("albedo") != "albedo.png":
                raise RuntimeError("manifest no registra albedo.png")
            missing = manifest.get("missing", {})
            if "depth" not in missing or "normal" not in missing:
                raise RuntimeError("manifest no registra fallback depth/normal")
            if export.folder.name != "smoke_asset_01_UE5_Texture_Set":
                raise RuntimeError(f"naming UE5 inesperado: {export.folder.name}")
        print("OK: UE5 Texture Set smoke passed (albedo + manifest + fallback depth/normal)")
        return 0
    except Exception as exc:
        print(f"FAIL: UE5 Texture Set smoke failed: {exc}", file=sys.stderr)
        return 1


def run_ue5_candidates_smoke() -> int:
    """Valida rutas opcionales reales para depth/normal map de UE5 sin ejecutarlas aun."""
    ok = True
    ok = _print_optional_file_probe("UE5 Depth ONNX", UE5_DEPTH_ENV_ONNX, require_ort=True) and ok
    ok = _print_optional_file_probe("UE5 Normal ONNX", UE5_NORMAL_ENV_ONNX, require_ort=True) and ok
    if ok:
        print("OK: UE5 candidate smoke passed")
        return 0
    return 1


def run_comfyui_smoke() -> int:
    settings = load_comfyui_settings()
    ok, msg = smoke_comfyui(
        str(settings.get("base_url", "http://127.0.0.1:8188")),
        str(settings.get("workflow_path", "")),
    )
    print(f"{'OK' if ok else 'FAIL'}: {msg}", file=sys.stdout if ok else sys.stderr)
    return 0 if ok else 1


def run_cuda_smoke() -> int:
    """Valida si ONNX Runtime puede preferir CUDA en este entorno."""
    report = MODEL_MANAGER.cuda_report()
    for key, value in report.items():
        print(f"{key}: {value}")

    if "CUDAExecutionProvider" in report["preferred_providers"]:
        print("OK: CUDAExecutionProvider listo como provider preferido")
        return 0

    print("FAIL: CUDAExecutionProvider no esta activo; CPU fallback sigue en uso", file=sys.stderr)
    return 1



def run_modules_smoke() -> int:
    ok = True
    for spec in MODULE_REGISTRY.all_specs():
        passed, msg = MODULE_REGISTRY.validate(spec.id)
        status = MODULE_REGISTRY.status(spec.id)
        print(f"{'OK' if passed else 'FAIL'}: {spec.id} [{status}] - {msg}")
        ok = ok and passed
    return 0 if ok else 1


def run_module_smoke(module_id: str) -> int:
    passed, msg = MODULE_REGISTRY.validate(module_id)
    spec = MODULE_REGISTRY.get(module_id)
    if spec is None:
        print(f"FAIL: {msg}", file=sys.stderr)
        return 1
    print(f"{'OK' if passed else 'FAIL'}: {module_id} [{MODULE_REGISTRY.status(module_id)}] - {msg}")
    return 0 if passed else 1

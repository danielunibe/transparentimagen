#!/usr/bin/env python3
"""
╔══════════════════════════════════════╗
║   IMAGE ENHANCER — Unova Games       ║
║   v1.0 · AI Background Removal       ║
║         + Quality Upscaling          ║
╚══════════════════════════════════════╝

Dependencias:
    pip install rembg Pillow

Uso:
    python image_enhancer.py
"""

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageTk, ImageFilter, ImageEnhance, ImageDraw
import threading
import io
import time
import urllib.error
import urllib.request
import zipfile
from pathlib import Path
from typing import Callable

# ── rembg (AI background removal) ──────────────────────────────────────────
try:
    from rembg import remove, new_session
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

try:
    import onnxruntime as ort
    ORT_AVAILABLE = True
except ImportError:
    ORT_AVAILABLE = False

# ── Paleta / Constantes ────────────────────────────────────────────────────
PREVIEW_W  = 355
PREVIEW_H  = 430
SINGLE_PREVIEW_W = 735
SINGLE_PREVIEW_H = 500
EDGE_EDITOR_W = 820
EDGE_EDITOR_H = 600
ACCENT     = "#7C6AFF"
ACCENT2    = "#5B4FCC"
BG         = "#111113"
PANEL      = "#1C1C20"
PANEL2     = "#232328"
BORDER     = "#2E2E35"
TEXT       = "#E2E2E8"
TEXT_DIM   = "#5A5A6A"
SUCCESS    = "#4ADE80"
WARNING    = "#FACC15"
ERROR      = "#F87171"
CTA        = "#FDE400"
CTA_HOVER  = "#DEC800"
CTA_TEXT   = "#201C00"
ACTION_BG  = "#353534"
ACTION_LOW = "#201F1F"
ACTION_BR  = "#4B4731"
SIDEBAR_BG = "#0E0E0E"
TOPBAR_BG  = "#151515"
CARD_BG    = "#202020"
FONT_UI = "Segoe UI"
FONT_UI_SYMBOL = "Segoe UI Symbol"

REMBG_MODELS = [
    ("u2net",                 "u2net                 <- mejor default"),
    ("birefnet-general",      "birefnet-general      <- recomendado precision"),
    ("birefnet-general-lite", "birefnet-general-lite <- rapido/preciso"),
    ("bria-rmbg",             "bria-rmbg             <- IA especializada"),
    ("birefnet-hrsod",        "birefnet-hrsod        <- objeto destacado"),
    ("birefnet-dis",          "birefnet-dis          <- siluetas complejas"),
    ("birefnet-portrait",     "birefnet-portrait     <- retratos"),
    ("isnet-general-use",     "isnet-general-use     <- general estable"),
    ("isnet-anime",           "isnet-anime           <- ilustracion/anime"),
    ("u2net_human_seg",       "u2net_human_seg       <- personas"),
    ("silueta",               "silueta               <- rapido/simple"),
]
MODEL_KEYS    = [k for k, _ in REMBG_MODELS]
MODEL_LABELS  = [v for _, v in REMBG_MODELS]
MODEL_BY_LABEL = {label: key for key, label in REMBG_MODELS}
DEFAULT_MODEL_KEY = "u2net"
DEFAULT_MODEL_INDEX = MODEL_KEYS.index(DEFAULT_MODEL_KEY)

UPSCALE_ENGINES = [
    ("lanczos", "LANCZOS rapido"),
    ("realesrgan", "Real-ESRGAN IA x4"),
]
UPSCALE_ENGINE_LABELS = [label for _, label in UPSCALE_ENGINES]
UPSCALE_ENGINE_BY_LABEL = {label: key for key, label in UPSCALE_ENGINES}
DEFAULT_UPSCALE_ENGINE = "lanczos"

LUPA_MODES = [
    ("high_fidelity", "High Fidelity"),
    ("portrait", "Portrait"),
    ("game_asset", "Game Asset"),
    ("product", "Producto"),
    ("creative", "Creative"),
]
LUPA_MODE_LABELS = [label for _, label in LUPA_MODES]
LUPA_MODE_BY_LABEL = {label: key for key, label in LUPA_MODES}
DEFAULT_LUPA_MODE = "high_fidelity"

LUPA_MODE_PRESETS = {
    "high_fidelity": {
        "engine": "realesrgan",
        "model": "u2net",
        "factor": 4,
        "sharpness": 1.2,
        "contrast": 1.02,
        "despill": 0.50,
        "feather": 0.35,
        "cleanup": 0.15,
        "keep_main_object": False,
        "face_recovery": False,
        "face_strength": 0.55,
    },
    "portrait": {
        "engine": "realesrgan",
        "model": "birefnet-portrait",
        "factor": 4,
        "sharpness": 1.15,
        "contrast": 1.03,
        "despill": 0.40,
        "feather": 0.45,
        "cleanup": 0.10,
        "keep_main_object": False,
        "face_recovery": True,
        "face_strength": 0.72,
    },
    "game_asset": {
        "engine": "realesrgan",
        "model": "isnet-anime",
        "factor": 4,
        "sharpness": 1.45,
        "contrast": 1.06,
        "despill": 0.18,
        "feather": 0.18,
        "cleanup": 0.08,
        "keep_main_object": True,
        "face_recovery": False,
        "face_strength": 0.55,
    },
    "product": {
        "engine": "realesrgan",
        "model": "birefnet-hrsod",
        "factor": 4,
        "sharpness": 1.25,
        "contrast": 1.04,
        "despill": 0.58,
        "feather": 0.28,
        "cleanup": 0.12,
        "keep_main_object": True,
        "face_recovery": False,
        "face_strength": 0.55,
    },
    "creative": {
        "engine": "lanczos",
        "model": "isnet-anime",
        "factor": 4,
        "sharpness": 1.65,
        "contrast": 1.10,
        "despill": 0.22,
        "feather": 0.20,
        "cleanup": 0.08,
        "keep_main_object": False,
        "face_recovery": False,
        "face_strength": 0.55,
    },
}

REALESRGAN_RELEASE = "v0.46.1"
REALESRGAN_MODEL_URL = (
    "https://qaihub-public-assets.s3.us-west-2.amazonaws.com/"
    "qai-hub-models/models/real_esrgan_x4plus/releases/v0.46.1/"
    "real_esrgan_x4plus-onnx-float.zip"
)
REALESRGAN_CACHE_DIR = (
    Path.home() / ".image_enhancer_models" / "real_esrgan_x4plus" / REALESRGAN_RELEASE
)
REALESRGAN_ONNX_PATH = REALESRGAN_CACHE_DIR / "real_esrgan_x4plus.onnx"
REALESRGAN_DATA_PATH = REALESRGAN_CACHE_DIR / "real_esrgan_x4plus.data"
REALESRGAN_TILE_SIZE = 128
REALESRGAN_TILE_PAD = 8
REALESRGAN_SCALE = 4
REALESRGAN_SESSION = None
CODEFORMER_ENV_SCRIPT = "IMAGE_ENHANCER_CODEFORMER_SCRIPT"
CODEFORMER_ENV_PYTHON = "IMAGE_ENHANCER_CODEFORMER_PYTHON"


# ── Helpers ────────────────────────────────────────────────────────────────

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


def run_codeformer_face_recovery(
    img: Image.Image,
    fidelity: float = 0.72,
    status_cb: Callable[[str, str], None] | None = None,
) -> Image.Image:
    """Ejecuta CodeFormer como proceso externo sobre la imagen completa."""
    python_cmd, script_path = resolve_codeformer_cli()
    fidelity = max(0.0, min(1.0, float(fidelity)))

    with tempfile.TemporaryDirectory(prefix="image_enhancer_codeformer_") as tmp_dir:
        tmp_path = Path(tmp_dir)
        input_path = tmp_path / "input.png"
        output_root = tmp_path / "output"
        img.convert("RGBA").save(input_path, format="PNG")

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
        if restored.size != img.size:
            restored = restored.resize(img.size, Image.LANCZOS)
        return restored


def ensure_realesrgan_model(status_cb: Callable[[str, str], None] | None = None) -> Path:
    """Descarga y extrae Real-ESRGAN ONNX fuera del EXE si no existe."""
    if REALESRGAN_ONNX_PATH.exists() and REALESRGAN_DATA_PATH.exists():
        return REALESRGAN_ONNX_PATH

    REALESRGAN_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    zip_path = REALESRGAN_CACHE_DIR / "real_esrgan_x4plus-onnx-float.zip"

    if not zip_path.exists():
        tmp_path = zip_path.with_name(zip_path.name + ".tmp")
        _notify(status_cb, "Descargando Real-ESRGAN ONNX (~60 MB)...", TEXT_DIM)
        try:
            req = urllib.request.Request(
                REALESRGAN_MODEL_URL,
                headers={"User-Agent": "ImageEnhancer-Unova/1.0"},
            )
            with urllib.request.urlopen(req, timeout=90) as response:
                total = int(response.headers.get("Content-Length", "0") or 0)
                done = 0
                last_report = 0.0
                with tmp_path.open("wb") as fh:
                    while True:
                        chunk = response.read(1024 * 1024)
                        if not chunk:
                            break
                        fh.write(chunk)
                        done += len(chunk)
                        now = time.monotonic()
                        if total and now - last_report > 0.5:
                            pct = int(done * 100 / total)
                            _notify(status_cb, f"Descargando Real-ESRGAN... {pct}%", TEXT_DIM)
                            last_report = now
            tmp_path.replace(zip_path)
        except (OSError, urllib.error.URLError) as exc:
            try:
                tmp_path.unlink(missing_ok=True)
            except OSError:
                pass
            raise RuntimeError(
                "No se pudo descargar Real-ESRGAN. Verifica internet y espacio libre en "
                f"{REALESRGAN_CACHE_DIR}."
            ) from exc

    _notify(status_cb, "Extrayendo Real-ESRGAN ONNX...", TEXT_DIM)
    try:
        with zipfile.ZipFile(zip_path) as archive:
            extracted = set()
            for member in archive.infolist():
                name = Path(member.filename).name
                if name not in {"real_esrgan_x4plus.onnx", "real_esrgan_x4plus.data"}:
                    continue
                target = REALESRGAN_CACHE_DIR / name
                with archive.open(member) as src, target.open("wb") as dst:
                    shutil.copyfileobj(src, dst)
                extracted.add(name)
    except (OSError, zipfile.BadZipFile) as exc:
        raise RuntimeError(
            "El paquete descargado de Real-ESRGAN no se pudo extraer. "
            "Borra la carpeta del modelo y vuelve a intentarlo."
        ) from exc

    if not REALESRGAN_ONNX_PATH.exists() or not REALESRGAN_DATA_PATH.exists():
        raise RuntimeError("El paquete Real-ESRGAN no contiene los archivos ONNX esperados.")

    return REALESRGAN_ONNX_PATH


def get_realesrgan_session(status_cb: Callable[[str, str], None] | None = None):
    """Crea una sesion ONNX Runtime CPU reutilizable para Real-ESRGAN."""
    global REALESRGAN_SESSION
    if REALESRGAN_SESSION is not None:
        return REALESRGAN_SESSION
    if not ORT_AVAILABLE:
        raise RuntimeError("onnxruntime no esta instalado. Ejecuta instalar.bat.")
    if not NUMPY_AVAILABLE:
        raise RuntimeError("numpy no esta instalado. Ejecuta instalar.bat.")

    model_path = ensure_realesrgan_model(status_cb)
    _notify(status_cb, "Cargando Real-ESRGAN en ONNX Runtime CPU...", TEXT_DIM)
    session_options = ort.SessionOptions()
    session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    REALESRGAN_SESSION = ort.InferenceSession(
        str(model_path),
        sess_options=session_options,
        providers=["CPUExecutionProvider"],
    )
    return REALESRGAN_SESSION


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


# ── App principal ──────────────────────────────────────────────────────────

class ImageEnhancerApp:

    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Image Enhancer — Unova")
        self.root.configure(bg=BG)
        self.root.resizable(True, True)
        self.root.option_add("*Font", f"{FONT_UI} 9")

        # Estado
        self.input_image:  Image.Image | None = None
        self.output_image: Image.Image | None = None
        self.input_path:   Path | None        = None
        self._session      = None
        self._session_model: str = ""
        self._processing   = False
        self.view_mode     = tk.StringVar(value="compare")
        self._view_btns: dict[str, tk.Button] = {}
        self._action_chips: dict[str, tk.Label] = {}

        self._configure_ttk_styles()
        self._build_ui()
        self.root.minsize(1220, 760)
        self._center_window(1340, 820)
        self._apply_mode_preset(DEFAULT_LUPA_MODE, force=True)

    # ── Layout ────────────────────────────────────────────────────────────

    def _configure_ttk_styles(self):
        style = ttk.Style(self.root)
        for theme in ("vista", "xpnative", "winnative", "clam"):
            try:
                style.theme_use(theme)
                break
            except tk.TclError:
                continue

        style.configure("TCombobox", padding=5)
        style.configure("TScrollbar", arrowsize=12)
        style.configure("TProgressbar", thickness=8)

    def _build_ui(self):
        # ─ Top app bar ───────────────────────────────────────────────────
        topbar = tk.Frame(self.root, bg=BG, height=64)
        topbar.pack(fill="x")
        topbar.pack_propagate(False)

        brand = tk.Frame(topbar, bg=BG)
        brand.pack(side="left", padx=24, fill="y")
        tk.Label(
            brand, text="LupaAI",
            font=(FONT_UI, 18, "bold"), fg=TEXT, bg=BG
        ).pack(side="left")
        tk.Label(
            brand, text="  Image Studio",
            font=(FONT_UI, 10), fg=TEXT_DIM, bg=BG
        ).pack(side="left", padx=(8, 0))

        nav = tk.Frame(topbar, bg=BG)
        nav.pack(side="left", padx=(18, 0))
        for label in ("Enhance", "Create", "Portrait", "Assets"):
            tk.Label(
                nav,
                text=label,
                font=(FONT_UI, 10),
                fg=TEXT if label == "Enhance" else TEXT_DIM,
                bg=BG,
                padx=10,
            ).pack(side="left")

        top_status = tk.Frame(topbar, bg=BG)
        top_status.pack(side="right", padx=24)
        tk.Button(
            top_status,
            text="Pricing",
            bg=PANEL,
            fg=TEXT,
            activebackground=PANEL2,
            activeforeground=TEXT,
            font=(FONT_UI, 9),
            relief="flat",
            cursor="hand2",
            padx=12,
            pady=6,
        ).pack(side="left", padx=(0, 10))
        self._top_chip(top_status, "local AI", SUCCESS)
        self._top_chip(top_status, "ONNX CPU", TEXT_DIM if ORT_AVAILABLE else WARNING)

        tk.Frame(self.root, bg=BORDER, height=1).pack(fill="x")

        # ─ Shell principal ───────────────────────────────────────────────
        shell = tk.Frame(self.root, bg=BG)
        shell.pack(fill="both", expand=True)

        sidebar = tk.Frame(shell, bg=SIDEBAR_BG, width=240, padx=16, pady=18)
        sidebar.pack(side="left", fill="y")
        sidebar.pack_propagate(False)
        self._build_sidebar(sidebar)

        workspace = tk.Frame(shell, bg=BG)
        workspace.pack(side="left", fill="both", expand=True)

        body = tk.Frame(workspace, bg=BG)
        body.pack(fill="both", expand=True, padx=24, pady=18)

        preview = tk.Frame(body, bg=BG)
        preview.pack(side="left", fill="both", expand=True)

        inspector = tk.Frame(body, bg=PANEL, width=332, highlightthickness=1, highlightbackground=BORDER)
        inspector.pack(side="right", fill="y", padx=(12, 0))
        inspector.pack_propagate(False)

        controls = self._make_scrollable_panel(inspector)
        self._build_left_panel(controls)

        self._build_preview_panel(preview)

        # ─ Status bar ─────────────────────────────────────────────────────
        tk.Frame(self.root, bg=BORDER, height=1).pack(fill="x")

        status_bar = tk.Frame(self.root, bg=PANEL, pady=7)
        status_bar.pack(fill="x")

        self.status_lbl = tk.Label(
            status_bar, text="● Listo para comenzar",
            font=(FONT_UI, 9), fg=TEXT_DIM, bg=PANEL)
        self.status_lbl.pack(side="left", padx=18)

        self.progress = ttk.Progressbar(status_bar, mode="indeterminate", length=140)
        self.progress.pack(side="right", padx=18)

    def _top_chip(self, parent, text: str, color: str):
        chip = tk.Label(
            parent,
            text=text,
            bg=CARD_BG,
            fg=color,
            font=(FONT_UI, 9, "bold"),
            padx=10,
            pady=5,
            highlightthickness=1,
            highlightbackground=BORDER,
        )
        chip.pack(side="left", padx=(6, 0))

    def _build_sidebar(self, parent):
        logo = tk.Frame(parent, bg=PANEL, height=66, highlightthickness=1, highlightbackground=BORDER)
        logo.pack(fill="x", pady=(0, 18))
        logo.pack_propagate(False)
        tk.Label(
            logo, text="◎",
            font=(FONT_UI_SYMBOL, 18, "bold"), fg=TEXT, bg=PANEL,
            width=3
        ).pack(side="left", padx=(10, 4))
        brand = tk.Frame(logo, bg=PANEL)
        brand.pack(side="left", fill="both", expand=True)
        tk.Label(
            brand, text="Creative Workspace",
            font=(FONT_UI, 10, "bold"), fg=TEXT, bg=PANEL,
            anchor="w"
        ).pack(fill="x", pady=(12, 0))
        tk.Label(
            brand, text="Lupa local",
            font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL,
            anchor="w"
        ).pack(fill="x")

        tk.Label(
            parent, text="MODES",
            font=(FONT_UI, 8, "bold"), fg=TEXT_DIM, bg=SIDEBAR_BG
        ).pack(anchor="w", pady=(2, 10))
        for active, label, note in (
            (True, "Enhance", "upscale + cleanup"),
            (False, "Portrait", "face recovery"),
            (False, "Creative", "stylized output"),
            (False, "Assets", "game/product"),
        ):
            self._sidebar_step(parent, active, label, note)

        tk.Frame(parent, bg=SIDEBAR_BG).pack(fill="both", expand=True)

        cta = tk.Button(
            parent,
            text="Open Prompt Presets",
            bg=PANEL,
            fg=TEXT,
            activebackground=PANEL2,
            activeforeground=TEXT,
            font=(FONT_UI, 9),
            relief="flat",
            cursor="hand2",
            padx=10,
            pady=9,
        )
        cta.pack(fill="x", pady=(0, 10))

        stats = tk.Frame(parent, bg=PANEL, padx=12, pady=12, highlightthickness=1, highlightbackground=BORDER)
        stats.pack(fill="x")
        tk.Label(
            stats, text="RUNTIME",
            font=(FONT_UI, 8, "bold"), fg=TEXT_DIM, bg=PANEL
        ).pack(anchor="w", pady=(0, 8))
        self._runtime_row(stats, "rembg", "OK" if REMBG_AVAILABLE else "Falta", SUCCESS if REMBG_AVAILABLE else WARNING)
        self._runtime_row(stats, "onnx", "CPU" if ORT_AVAILABLE else "Falta", SUCCESS if ORT_AVAILABLE else WARNING)
        self._runtime_row(stats, "focus", "prompt-first", CTA)

    def _sidebar_step(self, parent, active: bool, label: str, note: str):
        row = tk.Frame(parent, bg=PANEL if active else SIDEBAR_BG, padx=10, pady=9,
                       highlightthickness=1 if active else 0, highlightbackground=BORDER)
        row.pack(fill="x", pady=(0, 4))
        tk.Label(
            row, text="●" if active else "○",
            font=(FONT_UI_SYMBOL, 10, "bold"), fg=CTA if active else TEXT_DIM,
            bg=PANEL if active else SIDEBAR_BG, width=2, anchor="w"
        ).pack(side="left")
        text = tk.Frame(row, bg=PANEL if active else SIDEBAR_BG)
        text.pack(side="left", fill="x", expand=True)
        tk.Label(
            text, text=label,
            font=(FONT_UI, 10, "bold"), fg=TEXT, bg=PANEL if active else SIDEBAR_BG,
            anchor="w"
        ).pack(fill="x")
        tk.Label(
            text, text=note,
            font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL if active else SIDEBAR_BG,
            anchor="w"
        ).pack(fill="x")

    def _runtime_row(self, parent, label: str, value: str, color: str):
        row = tk.Frame(parent, bg=PANEL)
        row.pack(fill="x", pady=(0, 4))
        tk.Label(row, text=label, font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(side="left")
        tk.Label(row, text=value, font=(FONT_UI, 8, "bold"), fg=color, bg=PANEL).pack(side="right")

    def _make_scrollable_panel(self, parent):
        canvas = tk.Canvas(parent, bg=PANEL, bd=0, highlightthickness=0)
        scrollbar = ttk.Scrollbar(parent, orient="vertical", command=canvas.yview)
        inner = tk.Frame(canvas, bg=PANEL, padx=18, pady=18)
        inner_id = canvas.create_window((0, 0), window=inner, anchor="nw")

        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        inner.bind(
            "<Configure>",
            lambda _event: canvas.configure(scrollregion=canvas.bbox("all")),
        )
        canvas.bind(
            "<Configure>",
            lambda event: canvas.itemconfigure(inner_id, width=event.width),
        )

        def _wheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        canvas.bind("<Enter>", lambda _event: canvas.bind_all("<MouseWheel>", _wheel))
        canvas.bind("<Leave>", lambda _event: canvas.unbind_all("<MouseWheel>"))
        return inner

    def _build_left_panel(self, parent):
        # ─ Sección: Cargar ────────────────────────────────────────────────
        self._section_label(parent, "IMAGEN")

        self.load_btn = tk.Button(
            parent, text="+  Add source image",
            command=self._load_image,
            bg=ACTION_LOW, fg=TEXT,
            font=(FONT_UI, 9, "bold"),
            relief="flat", cursor="hand2",
            padx=10, pady=8, anchor="w")
        self.load_btn.pack(fill="x", pady=(0, 4))

        self.file_lbl = tk.Label(
            parent, text="Drop or choose a source image to begin the enhancement flow.",
            font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL,
            anchor="w", wraplength=260, justify="left")
        self.file_lbl.pack(fill="x", pady=(0, 14))

        # ─ Sección: Operaciones ───────────────────────────────────────────
        self._section_label(parent, "ENHANCEMENT STACK")

        # Remover fondo
        self.do_rembg = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Background removal / transparency",
            variable=self.do_rembg,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 9),
            cursor="hand2").pack(anchor="w")

        mdl_row = tk.Frame(parent, bg=PANEL)
        mdl_row.pack(fill="x", pady=(3, 10))
        tk.Label(mdl_row, text="  Modelo :", font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(side="left")
        self.model_var = tk.StringVar(value=MODEL_LABELS[DEFAULT_MODEL_INDEX])
        self.model_cb  = ttk.Combobox(mdl_row, textvariable=self.model_var,
                                       values=MODEL_LABELS, width=27,
                                       font=(FONT_UI, 8), state="readonly")
        self.model_cb.pack(side="left", padx=4)
        self.model_cb.current(DEFAULT_MODEL_INDEX)
        self.model_cb.bind("<<ComboboxSelected>>", self._on_model_change)

        self.do_alpha_matting = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Borde IA fino (alpha matting)",
            variable=self.do_alpha_matting,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 8),
            cursor="hand2").pack(anchor="w")

        self.do_post_process = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Postprocesar mascara",
            variable=self.do_post_process,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 8),
            cursor="hand2").pack(anchor="w")

        self.do_cleanup = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Limpiar objetos/restos sueltos",
            variable=self.do_cleanup,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 8),
            cursor="hand2").pack(anchor="w")

        self.keep_main_object = tk.BooleanVar(value=False)
        tk.Checkbutton(
            parent, text="Mantener solo objeto principal",
            variable=self.keep_main_object,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 8),
            cursor="hand2").pack(anchor="w", pady=(0, 4))

        tk.Label(parent, text="Limpieza minima de restos (%)",
                 font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.cleanup_var = tk.DoubleVar(value=0.15)
        tk.Scale(parent, from_=0.0, to=2.0, resolution=0.05,
                 orient="horizontal", variable=self.cleanup_var,
                 bg=PANEL, fg=TEXT, troughcolor=BORDER,
                 highlightthickness=0, font=(FONT_UI, 8),
                 length=260).pack(fill="x", pady=(0, 8))

        # ─ Sección: Bordes automaticos ───────────────────────────────────
        self._section_label(parent, "EDGE POLISH")

        self.do_despill = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Descontaminar borde (despill)",
            variable=self.do_despill,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 8),
            cursor="hand2").pack(anchor="w")

        tk.Label(parent, text="Fuerza despill",
                 font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.despill_var = tk.DoubleVar(value=0.55)
        tk.Scale(parent, from_=0.0, to=1.0, resolution=0.05,
                 orient="horizontal", variable=self.despill_var,
                 bg=PANEL, fg=TEXT, troughcolor=BORDER,
                 highlightthickness=0, font=(FONT_UI, 8),
                 length=260).pack(fill="x", pady=(0, 4))

        self.do_feather = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Suavizar alfa fino",
            variable=self.do_feather,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 8),
            cursor="hand2").pack(anchor="w")

        tk.Label(parent, text="Feather alfa (px)",
                 font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.feather_var = tk.DoubleVar(value=0.45)
        tk.Scale(parent, from_=0.0, to=2.5, resolution=0.05,
                 orient="horizontal", variable=self.feather_var,
                 bg=PANEL, fg=TEXT, troughcolor=BORDER,
                 highlightthickness=0, font=(FONT_UI, 8),
                 length=260).pack(fill="x", pady=(0, 8))

        # Upscale
        self.do_upscale = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Mejorar calidad (upscale)",
            variable=self.do_upscale,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 9),
            cursor="hand2").pack(anchor="w")

        mode_row = tk.Frame(parent, bg=PANEL)
        mode_row.pack(fill="x", pady=(3, 4))
        tk.Label(mode_row, text="  Modo   :", font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(side="left")
        self.lupa_mode_var = tk.StringVar(value=LUPA_MODE_LABELS[0])
        self.lupa_mode_cb = ttk.Combobox(
            mode_row,
            textvariable=self.lupa_mode_var,
            values=LUPA_MODE_LABELS,
            width=18,
            font=(FONT_UI, 8),
            state="readonly",
        )
        self.lupa_mode_cb.pack(side="left", padx=4)
        self.lupa_mode_cb.current(0)
        self.lupa_mode_cb.bind("<<ComboboxSelected>>", self._on_lupa_mode_change)

        engine_row = tk.Frame(parent, bg=PANEL)
        engine_row.pack(fill="x", pady=(3, 4))
        tk.Label(engine_row, text="  Motor  :", font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(side="left")
        self.upscale_engine_var = tk.StringVar(value=UPSCALE_ENGINE_LABELS[0])
        self.upscale_engine_cb = ttk.Combobox(
            engine_row,
            textvariable=self.upscale_engine_var,
            values=UPSCALE_ENGINE_LABELS,
            width=18,
            font=(FONT_UI, 8),
            state="readonly",
        )
        self.upscale_engine_cb.pack(side="left", padx=4)
        self.upscale_engine_cb.current(0)
        self.upscale_engine_cb.bind("<<ComboboxSelected>>", lambda _event: self._refresh_action_chips())

        factor_row = tk.Frame(parent, bg=PANEL)
        factor_row.pack(fill="x", pady=(0, 10))
        tk.Label(factor_row, text="  Factor :", font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(side="left")

        self.factor_var  = tk.IntVar(value=2)
        self._factor_btns: dict[int, tk.Button] = {}
        for f in (2, 3, 4):
            btn = tk.Button(
                factor_row, text=f"{f}×",
                command=lambda v=f: self._set_factor(v),
                bg=CTA if f == 2 else PANEL2,
                fg=CTA_TEXT if f == 2 else TEXT_DIM,
                font=(FONT_UI, 8, "bold"), relief="flat",
                padx=9, pady=2, cursor="hand2", width=3)
            btn.pack(side="left", padx=2)
            self._factor_btns[f] = btn

        # ─ Sección: Ajustes ───────────────────────────────────────────────
        self._section_label(parent, "TUNING")

        tk.Label(parent, text="Nitidez  (LANCZOS/post IA)",
                 font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.sharp_var = tk.DoubleVar(value=1.3)
        tk.Scale(parent, from_=1.0, to=3.0, resolution=0.1,
                 orient="horizontal", variable=self.sharp_var,
                 bg=PANEL, fg=TEXT, troughcolor=BORDER,
                 highlightthickness=0, font=(FONT_UI, 8),
                 length=225).pack(fill="x")

        tk.Label(parent, text="Contraste  (post-upscale)",
                 font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w", pady=(6, 0))
        self.contrast_var = tk.DoubleVar(value=1.05)
        tk.Scale(parent, from_=1.0, to=1.8, resolution=0.05,
                 orient="horizontal", variable=self.contrast_var,
                 bg=PANEL, fg=TEXT, troughcolor=BORDER,
                 highlightthickness=0, font=(FONT_UI, 8),
                 length=225).pack(fill="x", pady=(0, 10))

        self._section_label(parent, "PORTRAIT RECOVERY")
        self.do_face_recovery = tk.BooleanVar(value=False)
        tk.Checkbutton(
            parent, text="Aplicar CodeFormer en retratos",
            variable=self.do_face_recovery,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 8),
            cursor="hand2").pack(anchor="w")

        tk.Label(parent, text="Fuerza rostro (mezcla CodeFormer)",
                 font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.face_strength_var = tk.DoubleVar(value=0.72)
        tk.Scale(parent, from_=0.0, to=1.0, resolution=0.05,
                 orient="horizontal", variable=self.face_strength_var,
                 bg=PANEL, fg=TEXT, troughcolor=BORDER,
                 highlightthickness=0, font=(FONT_UI, 8),
                 length=225).pack(fill="x")
        tk.Label(
            parent,
            text=(
                "Requiere una instalacion externa de CodeFormer. "
                f"Configura {CODEFORMER_ENV_SCRIPT}."
            ),
            font=(FONT_UI, 8),
            fg=TEXT_DIM,
            bg=PANEL,
            wraplength=250,
            justify="left",
        ).pack(anchor="w", pady=(4, 8))

    def _build_preview_panel(self, parent):
        hero = tk.Frame(parent, bg=PANEL, padx=22, pady=18, highlightthickness=1, highlightbackground=BORDER)
        hero.pack(fill="x", pady=(0, 12))

        hero_head = tk.Frame(hero, bg=PANEL)
        hero_head.pack(fill="x")
        tk.Label(
            hero_head, text="Enhance images with local AI",
            font=(FONT_UI, 21, "bold"), fg=TEXT, bg=PANEL
        ).pack(anchor="w")
        tk.Label(
            hero_head,
            text="Upscale, clean edges, recover portraits and export final PNG assets with a LupaAI-inspired flow.",
            font=(FONT_UI, 10), fg=TEXT_DIM, bg=PANEL, wraplength=760, justify="left"
        ).pack(anchor="w", pady=(6, 0))

        highlight_row = tk.Frame(hero, bg=PANEL)
        highlight_row.pack(anchor="w", pady=(14, 0))
        for key, text in (("hero_mode", "High Fidelity"), ("hero_engine", "Real-ESRGAN IA"), ("hero_factor", "4x")):
            chip = tk.Label(
                highlight_row,
                text=text,
                bg=ACTION_LOW,
                fg=TEXT,
                font=(FONT_UI, 8, "bold"),
                padx=10,
                pady=6,
                highlightthickness=1,
                highlightbackground=ACTION_BR,
            )
            chip.pack(side="left", padx=(0, 8))
            self._action_chips[key] = chip

        action_bar = tk.Frame(parent, bg=PANEL, padx=18, pady=12, highlightthickness=1, highlightbackground=BORDER)
        action_bar.pack(fill="x", pady=(0, 12))

        title_box = tk.Frame(action_bar, bg=PANEL)
        title_box.pack(side="left")
        tk.Label(
            title_box, text="Preview Canvas",
            font=(FONT_UI, 16, "bold"), fg=TEXT, bg=PANEL
        ).pack(side="left")
        tk.Label(
            title_box, text="Before / After",
            font=(FONT_UI, 8, "bold"), fg=TEXT_DIM, bg=ACTION_LOW, padx=8, pady=4
        ).pack(side="left", padx=(10, 0))

        tools = tk.Frame(action_bar, bg=PANEL)
        tools.pack(side="right")
        for label in ("Open", "Reset"):
            tk.Button(
                tools,
                text=label,
                bg=ACTION_LOW,
                fg=TEXT,
                activebackground=PANEL2,
                activeforeground=TEXT,
                font=(FONT_UI, 9),
                relief="flat",
                cursor="hand2",
                padx=12,
                pady=6,
            ).pack(side="left", padx=(0, 8))
        tk.Button(
            tools,
            text="Export Final",
            bg=CTA,
            fg=CTA_TEXT,
            activebackground=CTA_HOVER,
            activeforeground=CTA_TEXT,
            font=(FONT_UI, 9, "bold"),
            relief="flat",
            cursor="hand2",
            padx=14,
            pady=6,
        ).pack(side="left")

        view_bar = tk.Frame(parent, bg=BG)
        view_bar.pack(fill="x", pady=(0, 8))

        tk.Label(view_bar, text="VISTA", font=(FONT_UI, 8, "bold"),
                 fg=TEXT_DIM, bg=BG).pack(side="left", padx=(0, 10))
        for key, label in (
            ("compare", "Comparar"),
            ("before", "Antes"),
            ("after", "Despues"),
            ("split", "Split A/B"),
        ):
            btn = tk.Button(
                view_bar, text=label,
                command=lambda v=key: self._set_view_mode(v),
                bg=CTA if key == "compare" else PANEL,
                fg=CTA_TEXT if key == "compare" else TEXT_DIM,
                font=(FONT_UI, 8, "bold"), relief="flat",
                cursor="hand2", padx=11, pady=5)
            btn.pack(side="left", padx=(0, 6))
            self._view_btns[key] = btn

        self.compare_frame = tk.Frame(parent, bg=BG)
        self.compare_frame.pack(fill="both", expand=True, pady=(0, 10))

        self.before_canvas, self.before_info = self._make_preview_block(
            self.compare_frame, "ORIGINAL", side="left", pad=(0, 6))

        self.after_canvas, self.after_info = self._make_preview_block(
            self.compare_frame, "RESULTADO", side="left", pad=(6, 0))

        self.single_frame = tk.Frame(parent, bg=PANEL, padx=10, pady=10, highlightthickness=1, highlightbackground=BORDER)
        self.single_title = tk.Label(
            self.single_frame, text="PREVIEW",
            font=(FONT_UI, 8, "bold"), fg=TEXT_DIM, bg=PANEL)
        self.single_title.pack(anchor="w")
        tk.Frame(self.single_frame, bg=BORDER, height=1).pack(fill="x", pady=(2, 6))

        self.single_canvas = tk.Canvas(
            self.single_frame, width=SINGLE_PREVIEW_W, height=SINGLE_PREVIEW_H,
            bg="#0D0D10", highlightthickness=1,
            highlightbackground=BORDER)
        self.single_canvas.pack(fill="both", expand=True)
        self.single_canvas.bind("<Configure>", lambda _event: self._render_previews())

        self.single_info = tk.Label(
            self.single_frame, text="—",
            font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL)
        self.single_info.pack(pady=(5, 0))

        self._build_action_bar(parent)

    def _build_action_bar(self, parent):
        wrap = tk.Frame(parent, bg=BG)
        wrap.pack(fill="x", pady=(6, 0))

        bar = tk.Frame(
            wrap,
            bg=ACTION_BG,
            padx=14,
            pady=10,
            highlightthickness=1,
            highlightbackground=ACTION_BR,
        )
        bar.pack(fill="x")

        load_btn = tk.Button(
            bar, text="+",
            command=self._load_image,
            bg=ACTION_LOW, fg=TEXT,
            activebackground=PANEL2, activeforeground=TEXT,
            font=(FONT_UI, 14, "bold"),
            relief="flat", cursor="hand2",
            width=3, padx=4, pady=8)
        load_btn.pack(side="left", padx=(0, 10))

        prompt_area = tk.Frame(bar, bg=ACTION_BG)
        prompt_area.pack(side="left", fill="x", expand=True, padx=(0, 10))
        self.action_file_lbl = tk.Label(
            prompt_area, text="Describe how you want to enhance this image...",
            bg=ACTION_BG, fg=TEXT_DIM,
            font=(FONT_UI, 12, "bold"),
            anchor="w")
        self.action_file_lbl.pack(anchor="w")

        chips = tk.Frame(prompt_area, bg=ACTION_BG)
        chips.pack(anchor="w", pady=(8, 0))
        self._make_action_chip(chips, "model", "Local subject")
        self._make_action_chip(chips, "mode", "High Fidelity")
        self._make_action_chip(chips, "engine", "Real-ESRGAN IA")
        self._make_action_chip(chips, "factor", "4x")

        self.refine_btn = tk.Button(
            bar, text="Refine Edge",
            command=self._open_edge_refiner,
            bg=ACTION_LOW, fg=TEXT_DIM,
            activebackground=PANEL2, activeforeground=TEXT,
            font=(FONT_UI, 8, "bold"), relief="flat",
            cursor="hand2", padx=10, pady=7,
            state="disabled")
        self.refine_btn.pack(side="left", padx=(0, 4))

        self.save_btn = tk.Button(
            bar, text="Save PNG",
            command=self._save_output,
            bg=ACTION_LOW, fg=TEXT_DIM,
            activebackground=PANEL2, activeforeground=TEXT,
            font=(FONT_UI, 8, "bold"), relief="flat",
            cursor="hand2", padx=10, pady=7,
            state="disabled")
        self.save_btn.pack(side="left", padx=4)

        self.process_btn = tk.Button(
            bar, text="Generate",
            command=self._start_processing,
            bg=CTA, fg=CTA_TEXT,
            activebackground=CTA_HOVER, activeforeground=CTA_TEXT,
            font=(FONT_UI, 11, "bold"),
            relief="flat", cursor="hand2",
            padx=18, pady=10,
            state="normal")
        self.process_btn.pack(side="right", padx=(12, 0))
        self._refresh_action_chips()

    def _make_action_chip(self, parent, key: str, text: str):
        chip = tk.Label(
            parent,
            text=text,
            bg=ACTION_LOW,
            fg=TEXT,
            font=(FONT_UI, 8, "bold"),
            padx=10,
            pady=5,
            highlightthickness=1,
            highlightbackground=ACTION_BR,
        )
        chip.pack(side="left", padx=(0, 6))
        self._action_chips[key] = chip

    def _make_preview_block(self, parent, title, side, pad):
        padx = pad
        frame = tk.Frame(parent, bg=PANEL, padx=12, pady=12, highlightthickness=1, highlightbackground=BORDER)
        frame.pack(side=side, fill="both", expand=True, padx=padx)

        tk.Label(frame, text=title, font=(FONT_UI, 8, "bold"),
                 fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        tk.Frame(frame, bg=BORDER, height=1).pack(fill="x", pady=(2, 6))

        canvas = tk.Canvas(
            frame, width=PREVIEW_W, height=PREVIEW_H,
            bg="#0D0D10", highlightthickness=1,
            highlightbackground=BORDER)
        canvas.pack(fill="both", expand=True)
        canvas.bind("<Configure>", lambda _event: self._render_previews())

        info = tk.Label(frame, text="—",
                        font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL)
        info.pack(pady=(5, 0))

        return canvas, info

    # ── Helpers UI ────────────────────────────────────────────────────────

    def _section_label(self, parent, text):
        tk.Label(parent, text=text, font=(FONT_UI, 8, "bold"),
                 fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        tk.Frame(parent, bg=BORDER, height=1).pack(fill="x", pady=(2, 8))

    def _center_window(self, w, h):
        sw = self.root.winfo_screenwidth()
        sh = self.root.winfo_screenheight()
        x  = (sw - w) // 2
        y  = (sh - h) // 2
        self.root.geometry(f"{w}x{h}+{x}+{y}")

    def _set_factor(self, value: int):
        self.factor_var.set(value)
        for f, btn in self._factor_btns.items():
            btn.configure(
                bg=CTA if f == value else PANEL2,
                fg=CTA_TEXT if f == value else TEXT_DIM)
        self._refresh_action_chips()

    def _on_model_change(self, event):
        # Fuerza recrear sesión
        self._session = None
        self._session_model = ""
        self._refresh_action_chips()

    def _selected_model_key(self) -> str:
        idx = self.model_cb.current()
        if 0 <= idx < len(MODEL_KEYS):
            return MODEL_KEYS[idx]
        return MODEL_BY_LABEL.get(self.model_var.get(), DEFAULT_MODEL_KEY)

    def _selected_upscale_engine(self) -> str:
        return UPSCALE_ENGINE_BY_LABEL.get(self.upscale_engine_var.get(), DEFAULT_UPSCALE_ENGINE)

    def _selected_lupa_mode(self) -> str:
        return LUPA_MODE_BY_LABEL.get(self.lupa_mode_var.get(), DEFAULT_LUPA_MODE)

    def _apply_mode_preset(self, mode_key: str, force: bool = False):
        preset = LUPA_MODE_PRESETS.get(mode_key)
        if not preset:
            return

        if hasattr(self, "upscale_engine_var"):
            engine_label = next(label for key, label in UPSCALE_ENGINES if key == preset["engine"])
            if force or self.upscale_engine_var.get() != engine_label:
                self.upscale_engine_var.set(engine_label)
        if hasattr(self, "model_cb"):
            try:
                idx = MODEL_KEYS.index(preset["model"])
                if force or self.model_cb.current() != idx:
                    self.model_cb.current(idx)
                    self._session = None
                    self._session_model = ""
            except ValueError:
                pass
        if hasattr(self, "_factor_btns"):
            self._set_factor(int(preset["factor"]))
        if hasattr(self, "sharp_var"):
            self.sharp_var.set(float(preset["sharpness"]))
        if hasattr(self, "contrast_var"):
            self.contrast_var.set(float(preset["contrast"]))
        if hasattr(self, "despill_var"):
            self.despill_var.set(float(preset["despill"]))
        if hasattr(self, "feather_var"):
            self.feather_var.set(float(preset["feather"]))
        if hasattr(self, "cleanup_var"):
            self.cleanup_var.set(float(preset["cleanup"]))
        if hasattr(self, "keep_main_object"):
            self.keep_main_object.set(bool(preset["keep_main_object"]))
        if hasattr(self, "do_face_recovery"):
            self.do_face_recovery.set(bool(preset["face_recovery"]))
        if hasattr(self, "face_strength_var"):
            self.face_strength_var.set(float(preset["face_strength"]))
        self._refresh_action_chips()

    def _on_lupa_mode_change(self, _event=None):
        self._apply_mode_preset(self._selected_lupa_mode(), force=True)
        self._refresh_action_chips()

    def _refresh_action_chips(self):
        if hasattr(self, "action_file_lbl"):
            if self.input_path:
                name = self.input_path.name
                if len(name) > 28:
                    name = name[:12] + "..." + name[-12:]
                self.action_file_lbl.configure(text=name, fg=TEXT)
            else:
                self.action_file_lbl.configure(text="Type prompt here...", fg=TEXT_DIM)

        if "model" in self._action_chips and hasattr(self, "model_cb"):
            self._action_chips["model"].configure(text=f"Modelo {self._selected_model_key()}")
        if "mode" in self._action_chips and hasattr(self, "lupa_mode_var"):
            self._action_chips["mode"].configure(text=self.lupa_mode_var.get())
        if "hero_mode" in self._action_chips and hasattr(self, "lupa_mode_var"):
            self._action_chips["hero_mode"].configure(text=self.lupa_mode_var.get())
        if "engine" in self._action_chips and hasattr(self, "upscale_engine_var"):
            label = self.upscale_engine_var.get()
            if "Real-ESRGAN" in label:
                label = "Real-ESRGAN IA"
            else:
                label = "LANCZOS rapido"
            self._action_chips["engine"].configure(text=label)
            if "hero_engine" in self._action_chips:
                self._action_chips["hero_engine"].configure(text=label)
        if "factor" in self._action_chips and hasattr(self, "factor_var"):
            self._action_chips["factor"].configure(text=f"{self.factor_var.get()}x")
        if "hero_factor" in self._action_chips and hasattr(self, "factor_var"):
            self._action_chips["hero_factor"].configure(text=f"{self.factor_var.get()}x")

    def _set_view_mode(self, mode: str):
        self.view_mode.set(mode)
        for key, btn in self._view_btns.items():
            btn.configure(
                bg=CTA if key == mode else PANEL,
                fg=CTA_TEXT if key == mode else TEXT_DIM)
        self._render_previews()

    def _set_status(self, msg: str, color: str = TEXT_DIM):
        self.status_lbl.configure(text=f"● {msg}", fg=color)

    def _show_in_canvas(self, canvas: tk.Canvas, img: Image.Image, box: tuple[int, int]):
        composed = composite_on_checkerboard(img, box)
        tk_img   = ImageTk.PhotoImage(composed)
        canvas._tk_img = tk_img           # evita garbage collection
        canvas.delete("all")
        canvas.create_image(0, 0, anchor="nw", image=tk_img)

    def _canvas_box(self, canvas: tk.Canvas, fallback: tuple[int, int]) -> tuple[int, int]:
        width = max(160, canvas.winfo_width())
        height = max(160, canvas.winfo_height())
        if width <= 1 or height <= 1:
            return fallback
        return width, height

    def _show_raw_preview(self, canvas: tk.Canvas, img: Image.Image, box: tuple[int, int]):
        tk_img = ImageTk.PhotoImage(img)
        canvas._tk_img = tk_img
        canvas.delete("all")
        canvas.create_image(0, 0, anchor="nw", image=tk_img)

    def _render_previews(self):
        if self.input_image:
            self._show_in_canvas(self.before_canvas, self.input_image, self._canvas_box(self.before_canvas, (PREVIEW_W, PREVIEW_H)))
            self.before_info.configure(
                text=f"{self.input_image.width} × {self.input_image.height}  •  {self.input_image.mode}")
        else:
            self.before_canvas.delete("all")
            self.before_info.configure(text="—")

        if self.output_image:
            self._show_in_canvas(self.after_canvas, self.output_image, self._canvas_box(self.after_canvas, (PREVIEW_W, PREVIEW_H)))
            self.after_info.configure(
                text=f"{self.output_image.width} × {self.output_image.height}  •  {self.output_image.mode}")
        else:
            self.after_canvas.delete("all")
            self.after_info.configure(text="—")

        mode = self.view_mode.get()
        if mode == "compare":
            if not self.compare_frame.winfo_ismapped():
                self.single_frame.pack_forget()
                self.compare_frame.pack(fill="both", expand=True)
            return

        if self.compare_frame.winfo_ismapped():
            self.compare_frame.pack_forget()
        if not self.single_frame.winfo_ismapped():
            self.single_frame.pack(fill="both", expand=True)

        box = self._canvas_box(self.single_canvas, (SINGLE_PREVIEW_W, SINGLE_PREVIEW_H))
        if mode == "before":
            self.single_title.configure(text="ANTES")
            img = self.input_image
        elif mode == "after":
            self.single_title.configure(text="DESPUES")
            img = self.output_image or self.input_image
        else:
            self.single_title.configure(text="SPLIT A/B")
            img = (
                make_split_preview(self.input_image, self.output_image, box)
                if self.input_image and self.output_image
                else None
            )

        if img is None:
            self.single_canvas.delete("all")
            self.single_info.configure(text="Carga y procesa una imagen para activar esta vista")
            return

        if mode == "split":
            self._show_raw_preview(self.single_canvas, img, box)
            self.single_info.configure(text="Izquierda: antes  •  Derecha: despues")
        else:
            self._show_in_canvas(self.single_canvas, img, box)
            self.single_info.configure(text=f"{img.width} × {img.height}  •  {img.mode}")

    def _file_size_str(self, path: Path) -> str:
        try:
            b = path.stat().st_size
            if b < 1024:
                return f"{b} B"
            if b < 1024**2:
                return f"{b/1024:.1f} KB"
            return f"{b/1024**2:.1f} MB"
        except Exception:
            return ""

    # ── Acciones ──────────────────────────────────────────────────────────

    def _load_image(self):
        path = filedialog.askopenfilename(
            title="Seleccionar imagen",
            filetypes=[
                ("Imágenes", "*.png *.jpg *.jpeg *.webp *.bmp *.tiff *.tif"),
                ("PNG",  "*.png"),
                ("JPEG", "*.jpg *.jpeg"),
                ("Todos", "*.*"),
            ])
        if not path:
            return
        try:
            self.input_path  = Path(path)
            self.input_image = Image.open(path)

            # Normalizar modo
            if self.input_image.mode not in ("RGB", "RGBA"):
                self.input_image = self.input_image.convert("RGBA")

            size_s = self._file_size_str(self.input_path)
            self.file_lbl.configure(
                text=f"{self.input_path.name}  ({size_s})", fg=TEXT)

            self.output_image = None
            self._render_previews()
            self._refresh_action_chips()
            self.save_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
            self.refine_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)

            # Activar botón procesar
            self.process_btn.configure(state="normal", bg=CTA, fg=CTA_TEXT, text="Generate")
            self._set_status("Imagen cargada — lista para generar", SUCCESS)

        except Exception as e:
            messagebox.showerror("Error al cargar", str(e))

    def _start_processing(self):
        if not self.input_image:
            messagebox.showwarning("Sin imagen", "Carga una imagen primero.")
            return
        if self._processing:
            return
        if not self.do_rembg.get() and not self.do_upscale.get():
            messagebox.showwarning("Sin operación", "Activa al menos una operación.")
            return

        self._processing = True
        self.process_btn.configure(state="disabled", bg=ACTION_BR, fg=TEXT_DIM, text="Generating...")
        self.save_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
        self.refine_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
        self.progress.start(12)

        threading.Thread(target=self._process_thread, daemon=True).start()

    def _process_thread(self):
        try:
            img = self.input_image.copy()
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGBA")

            # ─── Paso 1: Remove background ─────────────────────────────
            if self.do_rembg.get():
                if not REMBG_AVAILABLE:
                    self.root.after(0, lambda: messagebox.showerror(
                        "rembg no instalado",
                        "Ejecuta instalar.bat para instalar las dependencias locales.\n\n"
                        "La primera ejecucion descarga el modelo de IA en:\n"
                        "%USERPROFILE%\\.u2net"))
                    self.root.after(0, self._on_error)
                    return

                model_key = self._selected_model_key()
                self._update_status("Cargando modelo IA...", TEXT_DIM)

                # Crear/reutilizar sesión
                if self._session is None or self._session_model != model_key:
                    self._session       = new_session(model_key)
                    self._session_model = model_key

                self._update_status(f"Removiendo fondo con {model_key}...", TEXT_DIM)
                img = remove_background(
                    img,
                    self._session,
                    alpha_matting=self.do_alpha_matting.get(),
                    post_process_mask=self.do_post_process.get(),
                )
                if self.do_cleanup.get():
                    self._update_status("Limpiando restos sueltos...", TEXT_DIM)
                    img = clean_alpha_artifacts(
                        img,
                        min_area_ratio=self.cleanup_var.get() / 100,
                        keep_largest=self.keep_main_object.get(),
                    )
                if self.do_despill.get():
                    self._update_status("Descontaminando color de bordes...", TEXT_DIM)
                    img = despill_edges(img, self.despill_var.get())
                if self.do_feather.get():
                    self._update_status("Suavizando alfa del recorte...", TEXT_DIM)
                    img = feather_alpha(img, self.feather_var.get())
                self._update_status("Fondo removido ✓", SUCCESS)

            # ─── Paso 2: Upscale ───────────────────────────────────────
            if self.do_upscale.get():
                factor   = self.factor_var.get()
                sharpness = self.sharp_var.get()
                contrast  = self.contrast_var.get()
                engine = self._selected_upscale_engine()
                mode_label = self.lupa_mode_var.get()
                if engine == "realesrgan":
                    self._update_status(f"Upscaling {factor}× con Real-ESRGAN ONNX ({mode_label})...", TEXT_DIM)
                    img = realesrgan_upscale_image(
                        img,
                        factor,
                        sharpness,
                        contrast,
                        status_cb=self._update_status,
                    )
                else:
                    self._update_status(f"Upscaling {factor}× con LANCZOS + sharpen ({mode_label})...", TEXT_DIM)
                    img = upscale_image(img, factor, sharpness, contrast)
                self._update_status(f"Calidad mejorada {factor}× ✓", SUCCESS)

            if self.do_face_recovery.get():
                restored = run_codeformer_face_recovery(
                    img,
                    fidelity=self.face_strength_var.get(),
                    status_cb=self._update_status,
                )
                img = blend_rgba(img, restored, self.face_strength_var.get())
                self._update_status("Face recovery aplicado ✓", SUCCESS)

            self.output_image = img
            self.root.after(0, self._on_done)

        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            self.root.after(0, lambda: messagebox.showerror(
                "Error en procesamiento",
                f"{e}\n\n"
                "Si el error ocurrio al cargar un modelo, verifica conexion a internet "
                "en la primera descarga y que exista espacio libre en %USERPROFILE%\\.u2net "
                "o %USERPROFILE%\\.image_enhancer_models.\n\n"
                f"Detalle:\n{tb[:700]}"))
            self.root.after(0, self._on_error)

    def _on_done(self):
        self._processing = False
        self.progress.stop()
        self.process_btn.configure(state="normal", bg=CTA, fg=CTA_TEXT, text="Generate")

        self._render_previews()

        self.save_btn.configure(state="normal", bg=ACTION_LOW, fg=TEXT)
        self.refine_btn.configure(state="normal", bg=ACTION_LOW, fg=TEXT)
        self._set_status("Proceso completado ✓", SUCCESS)

    def _on_error(self):
        self._processing = False
        self.progress.stop()
        state = "normal" if self.input_image else "disabled"
        bg = CTA if self.input_image else PANEL2
        fg = CTA_TEXT if self.input_image else TEXT_DIM
        self.process_btn.configure(state=state, bg=bg, fg=fg, text="Generate")
        self._set_status("Error — revisa la consola", ERROR)

    def _update_status(self, msg: str, color: str = TEXT_DIM):
        self.root.after(0, lambda: self._set_status(msg, color))

    def _open_edge_refiner(self):
        if not self.output_image:
            messagebox.showwarning("Sin resultado", "Procesa una imagen antes de refinar bordes.")
            return

        def apply_refined(refined: Image.Image):
            self.output_image = refined.convert("RGBA")
            self._render_previews()
            self._set_status("Bordes refinados y aplicados", SUCCESS)

        EdgeRefineWindow(
            self.root,
            self.output_image,
            self.input_image,
            apply_refined,
        )

    def _save_output(self):
        if not self.output_image:
            return

        default = (self.input_path.stem + "_enhanced") if self.input_path else "enhanced"
        path = filedialog.asksaveasfilename(
            title="Guardar resultado",
            defaultextension=".png",
            initialfile=default,
            filetypes=[
                ("PNG con transparencia", "*.png"),
                ("JPEG alta calidad",     "*.jpg"),
            ])
        if not path:
            return

        try:
            if path.lower().endswith((".jpg", ".jpeg")):
                # JPEG no soporta alfa → fondo blanco
                bg  = Image.new("RGB", self.output_image.size, (255, 255, 255))
                if self.output_image.mode == "RGBA":
                    bg.paste(self.output_image, mask=self.output_image.split()[3])
                else:
                    bg.paste(self.output_image.convert("RGB"))
                bg.save(path, format="JPEG", quality=96, optimize=True)
            else:
                self.output_image.save(path, format="PNG", optimize=True)

            self._set_status(f"Guardado: {Path(path).name}", SUCCESS)
            messagebox.showinfo("Guardado ✓", f"Imagen guardada en:\n{path}")

        except Exception as e:
            messagebox.showerror("Error al guardar", str(e))


class EdgeRefineWindow:
    """Editor manual de alfa para perfeccionar bordes despues del recorte IA."""

    def __init__(self, parent, image: Image.Image, restore_source: Image.Image | None, on_apply):
        self.parent = parent
        self.image = image.convert("RGBA").copy()
        self.original = self.image.copy()
        self.restore_source = resize_restore_source(restore_source, self.image.size) or self.original.copy()
        self.on_apply = on_apply
        self.mode = tk.StringVar(value="erase")
        self.brush_size = tk.IntVar(value=34)
        self.opacity = tk.DoubleVar(value=0.9)
        self.softness = tk.DoubleVar(value=0.7)
        self.undo_stack: list[Image.Image] = []
        self._mode_btns: dict[str, tk.Button] = {}
        self._offset = (0, 0)
        self._scale = 1.0
        self._stroke_active = False

        self.win = tk.Toplevel(parent)
        self.win.title("Refinar bordes - Image Enhancer")
        self.win.configure(bg=BG)
        self.win.minsize(1060, 690)
        self.win.transient(parent)

        self._build_ui()
        self._center_window(1120, 720)
        self._render()

    def _build_ui(self):
        main = tk.Frame(self.win, bg=BG)
        main.pack(fill="both", expand=True, padx=18, pady=18)

        tools = tk.Frame(main, bg=PANEL, padx=16, pady=16, width=250)
        tools.pack(side="left", fill="y", padx=(0, 12))
        tools.pack_propagate(False)

        tk.Label(
            tools, text="REFINAR BORDES",
            font=("Consolas", 10, "bold"), fg=ACCENT, bg=PANEL
        ).pack(anchor="w")
        tk.Frame(tools, bg=BORDER, height=1).pack(fill="x", pady=(6, 12))

        self._tool_label(tools, "PINCEL")
        for key, label in (("erase", "Borrar restos"), ("restore", "Recuperar borde")):
            btn = tk.Button(
                tools, text=label,
                command=lambda v=key: self._set_mode(v),
                bg=ACCENT if key == "erase" else PANEL2,
                fg="white" if key == "erase" else TEXT,
                font=("Consolas", 9, "bold"), relief="flat",
                cursor="hand2", padx=9, pady=7)
            btn.pack(fill="x", pady=(0, 6))
            self._mode_btns[key] = btn

        tk.Label(tools, text="Tamano", font=("Consolas", 7), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        tk.Scale(
            tools, from_=4, to=180, resolution=2,
            orient="horizontal", variable=self.brush_size,
            bg=PANEL, fg=TEXT, troughcolor=BORDER,
            highlightthickness=0, font=("Consolas", 7),
            length=210).pack(fill="x")

        tk.Label(tools, text="Fuerza", font=("Consolas", 7), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        tk.Scale(
            tools, from_=0.1, to=1.0, resolution=0.05,
            orient="horizontal", variable=self.opacity,
            bg=PANEL, fg=TEXT, troughcolor=BORDER,
            highlightthickness=0, font=("Consolas", 7),
            length=210).pack(fill="x")

        tk.Label(tools, text="Suavidad", font=("Consolas", 7), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        tk.Scale(
            tools, from_=0.0, to=0.95, resolution=0.05,
            orient="horizontal", variable=self.softness,
            bg=PANEL, fg=TEXT, troughcolor=BORDER,
            highlightthickness=0, font=("Consolas", 7),
            length=210).pack(fill="x", pady=(0, 10))

        self._tool_label(tools, "ACCIONES DE BORDE")
        for label, action in (
            ("Suavizar borde", "smooth"),
            ("Expandir 1 px", "expand"),
            ("Contraer 1 px", "contract"),
            ("Definir borde", "crisp"),
            ("Limpiar islas", "cleanup"),
        ):
            tk.Button(
                tools, text=label,
                command=lambda v=action: self._apply_edge_action(v),
                bg=PANEL2, fg=TEXT,
                font=("Consolas", 8), relief="flat",
                cursor="hand2", padx=9, pady=6).pack(fill="x", pady=(0, 5))

        tk.Frame(tools, bg=PANEL).pack(expand=True, fill="y")

        tk.Button(
            tools, text="Deshacer",
            command=self._undo,
            bg=PANEL2, fg=TEXT,
            font=("Consolas", 8), relief="flat",
            cursor="hand2", padx=9, pady=6).pack(fill="x", pady=(0, 5))
        tk.Button(
            tools, text="Restaurar entrada",
            command=self._reset,
            bg=PANEL2, fg=TEXT,
            font=("Consolas", 8), relief="flat",
            cursor="hand2", padx=9, pady=6).pack(fill="x", pady=(0, 12))
        tk.Button(
            tools, text="Aplicar refinado",
            command=self._apply,
            bg=ACCENT, fg="white",
            font=("Consolas", 10, "bold"), relief="flat",
            cursor="hand2", padx=9, pady=9).pack(fill="x")

        stage = tk.Frame(main, bg=PANEL, padx=10, pady=10)
        stage.pack(side="left", fill="both", expand=True)
        tk.Label(
            stage, text="Pinta sobre el borde: borrar hace transparente, recuperar vuelve opaco usando la imagen original.",
            font=("Consolas", 8), fg=TEXT_DIM, bg=PANEL
        ).pack(anchor="w", pady=(0, 6))

        self.canvas = tk.Canvas(
            stage, width=EDGE_EDITOR_W, height=EDGE_EDITOR_H,
            bg="#0D0D10", highlightthickness=1,
            highlightbackground=BORDER, cursor="crosshair")
        self.canvas.pack(fill="both", expand=True)
        self.canvas.bind("<ButtonPress-1>", self._start_stroke)
        self.canvas.bind("<B1-Motion>", self._paint)
        self.canvas.bind("<ButtonRelease-1>", self._end_stroke)

        self.info = tk.Label(stage, text="", font=("Consolas", 7), fg=TEXT_DIM, bg=PANEL)
        self.info.pack(pady=(6, 0))

    def _tool_label(self, parent, text):
        tk.Label(parent, text=text, font=("Consolas", 8, "bold"), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        tk.Frame(parent, bg=BORDER, height=1).pack(fill="x", pady=(2, 8))

    def _center_window(self, w, h):
        self.win.update_idletasks()
        sw = self.win.winfo_screenwidth()
        sh = self.win.winfo_screenheight()
        x = (sw - w) // 2
        y = (sh - h) // 2
        self.win.geometry(f"{w}x{h}+{x}+{y}")

    def _push_undo(self):
        self.undo_stack.append(self.image.copy())
        if len(self.undo_stack) > 20:
            self.undo_stack.pop(0)

    def _set_mode(self, mode: str):
        self.mode.set(mode)
        for key, btn in self._mode_btns.items():
            btn.configure(
                bg=ACCENT if key == mode else PANEL2,
                fg="white" if key == mode else TEXT)

    def _image_point(self, event) -> tuple[int, int] | None:
        x = (event.x - self._offset[0]) / self._scale
        y = (event.y - self._offset[1]) / self._scale
        if x < 0 or y < 0 or x >= self.image.width or y >= self.image.height:
            return None
        return int(x), int(y)

    def _start_stroke(self, event):
        self._stroke_active = True
        self._push_undo()
        self._paint(event)

    def _paint(self, event):
        if not self._stroke_active:
            return
        point = self._image_point(event)
        if point is None:
            return
        x, y = point
        self.image = apply_alpha_brush(
            self.image,
            self.restore_source,
            x,
            y,
            self.brush_size.get(),
            self.mode.get(),
            self.opacity.get(),
            self.softness.get(),
        )
        self._render()

    def _end_stroke(self, _event):
        self._stroke_active = False

    def _apply_edge_action(self, action: str):
        self._push_undo()
        if action == "cleanup":
            self.image = clean_alpha_artifacts(self.image, min_area_ratio=0.0007, keep_largest=False)
        else:
            self.image = adjust_alpha_edge(self.image, action)
        self._render()

    def _undo(self):
        if not self.undo_stack:
            return
        self.image = self.undo_stack.pop()
        self._render()

    def _reset(self):
        self._push_undo()
        self.image = self.original.copy()
        self._render()

    def _apply(self):
        self.on_apply(self.image.copy())
        self.win.destroy()

    def _render(self):
        box = (max(1, self.canvas.winfo_width()), max(1, self.canvas.winfo_height()))
        if box[0] < 20 or box[1] < 20:
            box = (EDGE_EDITOR_W, EDGE_EDITOR_H)

        board = make_checkerboard(box, tile=14)
        thumb = self.image.copy()
        thumb.thumbnail(box, Image.LANCZOS)
        self._scale = thumb.width / self.image.width if self.image.width else 1.0
        self._offset = ((box[0] - thumb.width) // 2, (box[1] - thumb.height) // 2)
        board.paste(thumb, self._offset, thumb)

        tk_img = ImageTk.PhotoImage(board)
        self.canvas._tk_img = tk_img
        self.canvas.delete("all")
        self.canvas.create_image(0, 0, anchor="nw", image=tk_img)
        self.info.configure(
            text=(
                f"{self.image.width} x {self.image.height}  •  "
                f"Modo: {self.mode.get()}  •  Pincel: {self.brush_size.get()} px"
            )
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
        session = new_session(model_key)
        result = remove_background(img, session, alpha_matting=True, post_process_mask=True)
        result = clean_alpha_artifacts(result, min_area_ratio=0.0015, keep_largest=False)
        if result.mode != "RGBA":
            raise RuntimeError(f"expected RGBA output, got {result.mode}")
        print(f"OK: rembg smoke passed with {model_key} ({result.width}x{result.height})")
        return 0
    except Exception as exc:
        print(f"FAIL: rembg smoke failed with {model_key}: {exc}", file=sys.stderr)
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


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Image Enhancer - Unova Games Studio")
    parser.add_argument("--smoke", action="store_true", help="Run headless runtime validation.")
    parser.add_argument(
        "--smoke-rembg",
        action="store_true",
        help="Run a real rembg model/session validation. May download the model on first use.",
    )
    parser.add_argument(
        "--smoke-realesrgan",
        action="store_true",
        help="Run a real Real-ESRGAN ONNX validation. May download the model on first use.",
    )
    parser.add_argument(
        "--smoke-codeformer",
        action="store_true",
        help="Validate external CodeFormer integration via environment variables.",
    )
    parser.add_argument(
        "--model",
        choices=MODEL_KEYS,
        default="silueta",
        help="Model used by --smoke-rembg.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.smoke:
        return run_smoke()
    if args.smoke_rembg:
        return run_rembg_smoke(args.model)
    if args.smoke_realesrgan:
        return run_realesrgan_smoke()
    if args.smoke_codeformer:
        return run_codeformer_smoke()

    root = tk.Tk()
    app  = ImageEnhancerApp(root)
    root.mainloop()
    return 0


# ── Entry point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    raise SystemExit(main())

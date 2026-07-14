from __future__ import annotations

import io
import os
import subprocess
import sys
import tempfile
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

try:
    from rembg import remove
except ImportError:
    remove = None

from models import (
    CODEFORMER_ENV_PYTHON,
    CODEFORMER_ENV_SCRIPT,
    CV2_AVAILABLE,
    DEFAULT_MODEL_KEY,
    DEFAULT_UPSCALE_ENGINE,
    ERROR,
    MODEL_KEYS,
    MODEL_MANAGER,
    MODULE_REGISTRY,
    NUMPY_AVAILABLE,
    ORT_AVAILABLE,
    REALESRGAN_SCALE,
    REALESRGAN_TILE_PAD,
    REALESRGAN_TILE_SIZE,
    REMBG_AVAILABLE,
    SUCCESS,
    TEXT_DIM,
    WARNING,
    cv2,
    get_realesrgan_session,
    get_rembg_session,
    np,
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
    face_strength: float = 0.72
    render_mode: str = "final"
    active_modules: tuple[str, ...] = ()


@dataclass
class ProcessingResult:
    image: Image.Image
    render_mode: str
    provider: str
    warnings: list[str] = field(default_factory=list)
    metrics: dict[str, str] = field(default_factory=dict)


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


def process_image(
    source: Image.Image,
    options: ProcessingOptions,
    token: CancellationToken | None = None,
    status_cb: Callable[[str, str], None] | None = None,
) -> ProcessingResult:
    token = token or CancellationToken()
    warnings: list[str] = []
    img = source.copy()
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA")

    if options.render_mode == "preview":
        preview_size = (max(1, img.width // 4), max(1, img.height // 4))
        img = img.resize(preview_size, Image.LANCZOS)
        _notify(status_cb, "Preview rapido al 25%...", TEXT_DIM)

    token.raise_if_cancelled()
    if options.do_rembg:
        if not REMBG_AVAILABLE:
            raise RuntimeError("rembg no esta instalado. Ejecuta instalar.bat.")
        _notify(status_cb, f"Cargando modelo IA {options.model_key}...", TEXT_DIM)
        session = get_rembg_session(options.model_key)
        token.raise_if_cancelled()
        _notify(status_cb, f"Removiendo fondo con {options.model_key}...", TEXT_DIM)
        img = remove_background(
            img,
            session,
            alpha_matting=options.alpha_matting,
            post_process_mask=options.post_process_mask,
        )
        token.raise_if_cancelled()
        if options.cleanup:
            _notify(status_cb, "Limpiando restos sueltos...", TEXT_DIM)
            img = clean_alpha_artifacts(
                img,
                min_area_ratio=options.cleanup_ratio,
                keep_largest=options.keep_main_object,
            )
        if options.despill:
            _notify(status_cb, "Descontaminando color de bordes...", TEXT_DIM)
            img = despill_edges(img, options.despill_strength)
        if options.feather:
            _notify(status_cb, "Suavizando alfa del recorte...", TEXT_DIM)
            img = feather_alpha(img, options.feather_radius)
        _notify(status_cb, "Fondo removido ✓", SUCCESS)

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
        restored = run_codeformer_face_recovery(
            img,
            fidelity=options.face_strength,
            status_cb=status_cb,
        )
        img = blend_rgba(img, restored, options.face_strength)
        _notify(status_cb, "Face recovery aplicado ✓", SUCCESS)

    return ProcessingResult(
        image=img,
        render_mode=options.render_mode,
        provider=MODEL_MANAGER.runtime_label(),
        warnings=warnings,
        metrics={"active_modules": ",".join(options.active_modules)},
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

from __future__ import annotations

from pathlib import Path

from .utils import ImageOperationResult, SidecarError, validate_paths


def pillow_available() -> bool:
    try:
        import PIL  # noqa: F401

        return True
    except ImportError:
        return False


def enhance_file(
    input_path: Path,
    output_path: Path,
    *,
    brightness: float = 1.04,
    contrast: float = 1.12,
    saturation: float = 1.08,
    sharpness: float = 1.18,
) -> ImageOperationResult:
    source, target = validate_paths(input_path, output_path)
    if not pillow_available():
        raise SidecarError("dependency_missing", "Image enhancement requires Pillow.")

    from PIL import Image, ImageEnhance, ImageFilter, ImageOps

    with Image.open(source) as image:
        base = ImageOps.exif_transpose(image).convert("RGBA")
        alpha = base.getchannel("A")
        rgb = ImageOps.autocontrast(base.convert("RGB"), cutoff=1)
        rgb = ImageEnhance.Brightness(rgb).enhance(max(0.1, brightness))
        rgb = ImageEnhance.Contrast(rgb).enhance(max(0.1, contrast))
        rgb = ImageEnhance.Color(rgb).enhance(max(0.0, saturation))
        rgb = ImageEnhance.Sharpness(rgb).enhance(max(0.0, sharpness))
        rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.2, percent=90, threshold=3))
        r, g, b = rgb.split()
        output = Image.merge("RGBA", (r, g, b, alpha))
        output.save(target, format="PNG", optimize=True)
        width, height = output.size

    return ImageOperationResult(target, "image/png", width, height)

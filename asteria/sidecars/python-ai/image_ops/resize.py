from __future__ import annotations

from pathlib import Path

from .enhancement import pillow_available
from .utils import ImageOperationResult, SidecarError, validate_paths


def resize_file(input_path: Path, output_path: Path, *, width: int | None, height: int | None) -> ImageOperationResult:
    source, target = validate_paths(input_path, output_path)
    if not pillow_available():
        raise SidecarError("dependency_missing", "Image resize requires Pillow.")
    if not width and not height:
        raise SidecarError("invalid_dimensions", "Resize requires width, height, or both.")
    if width is not None and width <= 0:
        raise SidecarError("invalid_dimensions", "Width must be greater than zero.")
    if height is not None and height <= 0:
        raise SidecarError("invalid_dimensions", "Height must be greater than zero.")

    from PIL import Image, ImageOps

    with Image.open(source) as image:
        base = ImageOps.exif_transpose(image).convert("RGBA")
        if width and height:
            target_size = (width, height)
        elif width:
            ratio = width / base.width
            target_size = (width, max(1, round(base.height * ratio)))
        else:
            ratio = height / base.height
            target_size = (max(1, round(base.width * ratio)), height)

        output = base.resize(target_size, Image.Resampling.LANCZOS)
        output.save(target, format="PNG", optimize=True)
        final_width, final_height = output.size

    return ImageOperationResult(target, "image/png", final_width, final_height)

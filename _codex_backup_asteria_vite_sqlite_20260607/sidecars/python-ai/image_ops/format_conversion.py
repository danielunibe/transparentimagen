from __future__ import annotations

from pathlib import Path

from .enhancement import pillow_available
from .utils import ImageOperationResult, SidecarError, mime_type_for_format, validate_paths


def convert_file(input_path: Path, output_path: Path, fmt: str) -> ImageOperationResult:
    source, target = validate_paths(input_path, output_path)
    if not pillow_available():
        raise SidecarError("dependency_missing", "Image conversion requires Pillow.")

    normalized = fmt.lower()
    if normalized == "jpg":
        normalized = "jpeg"
    mime_type = mime_type_for_format(normalized)

    from PIL import Image, ImageOps

    with Image.open(source) as image:
        base = ImageOps.exif_transpose(image)
        if normalized == "png":
            output = base.convert("RGBA")
            output.save(target, format="PNG", optimize=True)
        elif normalized == "webp":
            output = base.convert("RGBA")
            output.save(target, format="WEBP", quality=94, method=6)
        else:
            output = base.convert("RGB")
            output.save(target, format="JPEG", quality=95, optimize=True)
        width, height = output.size

    return ImageOperationResult(target, mime_type, width, height)

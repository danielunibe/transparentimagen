from __future__ import annotations

from pathlib import Path

from .utils import ImageOperationResult, SidecarError, validate_paths


def rembg_available() -> bool:
    try:
        import PIL  # noqa: F401
        import rembg  # noqa: F401

        return True
    except ImportError:
        return False


def remove_background_file(input_path: Path, output_path: Path) -> ImageOperationResult:
    source, target = validate_paths(input_path, output_path)
    if not rembg_available():
        raise SidecarError("dependency_missing", "Background removal requires rembg and Pillow.")

    from PIL import Image
    from rembg import remove

    with Image.open(source) as input_image:
        output_image = remove(input_image)
        output_image = output_image.convert("RGBA")
        output_image.save(target, format="PNG", optimize=True)
        width, height = output_image.size

    return ImageOperationResult(target, "image/png", width, height)

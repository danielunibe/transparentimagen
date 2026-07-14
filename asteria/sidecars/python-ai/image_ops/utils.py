from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


SUPPORTED_INPUT_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"}


class SidecarError(RuntimeError):
    def __init__(self, status: str, message: str, details: dict[str, object] | None = None):
        super().__init__(message)
        self.status = status
        self.details = details or {}


@dataclass
class ImageOperationResult:
    output_path: Path
    mime_type: str
    width: int
    height: int
    metadata: dict[str, object] | None = None


def validate_paths(input_path: Path, output_path: Path) -> tuple[Path, Path]:
    source = input_path.expanduser().resolve()
    target = output_path.expanduser().resolve()

    if not source.exists() or not source.is_file():
        raise SidecarError("input_missing", f"Input file not found: {source}")
    if source.suffix.lower() not in SUPPORTED_INPUT_EXTENSIONS:
        raise SidecarError("unsupported_input", f"Unsupported input image type: {source.suffix}")
    if source == target:
        raise SidecarError("unsafe_output", "Output path must be different from input path.")

    target.parent.mkdir(parents=True, exist_ok=True)
    return source, target


def mime_type_for_format(fmt: str) -> str:
    normalized = fmt.lower()
    if normalized == "jpg":
        normalized = "jpeg"
    if normalized not in {"png", "jpeg", "webp"}:
        raise SidecarError("unsupported_format", f"Unsupported output format: {fmt}")
    return f"image/{normalized}"

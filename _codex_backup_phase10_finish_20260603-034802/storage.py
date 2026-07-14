from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

APP_STATE_DIR = Path.home() / ".image_enhancer_unova"
PRESETS_PATH = APP_STATE_DIR / "presets.json"
SETTINGS_PATH = APP_STATE_DIR / "settings.json"
HISTORY_PATH = APP_STATE_DIR / "history.jsonl"
REPORTS_DIR = APP_STATE_DIR / "reports"


@dataclass(frozen=True)
class ExportProfile:
    id: str
    name: str
    description: str
    formats: tuple[str, ...]
    filename_suffix: str = ""
    output_subdir: str = "exports"
    keep_folder_structure: bool = True
    jpeg_quality: int = 95


DEFAULT_EXPORT_PROFILES = (
    ExportProfile(
        id="png_transparent",
        name="PNG Transparente",
        description="Exporta PNG optimizado preservando alfa.",
        formats=("png",),
        filename_suffix="_transparent",
        output_subdir="png_transparent",
    ),
    ExportProfile(
        id="jpg_white",
        name="JPG Fondo Blanco",
        description="Exporta JPG listo para catalogo o web sin alfa.",
        formats=("jpg",),
        filename_suffix="_white",
        output_subdir="jpg_white",
    ),
    ExportProfile(
        id="png_plus_jpg",
        name="PNG + JPG",
        description="Genera ambos formatos en una sola pasada.",
        formats=("png", "jpg"),
        filename_suffix="_export",
        output_subdir="png_plus_jpg",
    ),
)


def ensure_app_state() -> Path:
    APP_STATE_DIR.mkdir(parents=True, exist_ok=True)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    return APP_STATE_DIR


def _read_json(path: Path, default: Any):
    ensure_app_state()
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return default


def _write_json(path: Path, payload: Any):
    ensure_app_state()
    path.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")


def list_export_profiles() -> list[ExportProfile]:
    return list(DEFAULT_EXPORT_PROFILES)


def get_export_profile(profile_id: str) -> ExportProfile | None:
    for profile in DEFAULT_EXPORT_PROFILES:
        if profile.id == profile_id:
            return profile
    return None


def export_profile_labels() -> list[str]:
    return [profile.name for profile in DEFAULT_EXPORT_PROFILES]


def export_profile_by_label() -> dict[str, str]:
    return {profile.name: profile.id for profile in DEFAULT_EXPORT_PROFILES}


def load_presets() -> dict[str, dict[str, Any]]:
    data = _read_json(PRESETS_PATH, {})
    return data if isinstance(data, dict) else {}


def save_preset(name: str, payload: dict[str, Any]):
    presets = load_presets()
    presets[name] = payload
    _write_json(PRESETS_PATH, presets)


def delete_preset(name: str) -> bool:
    presets = load_presets()
    if name not in presets:
        return False
    del presets[name]
    _write_json(PRESETS_PATH, presets)
    return True


def append_history(entry: dict[str, Any]):
    ensure_app_state()
    with HISTORY_PATH.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry, ensure_ascii=True) + "\n")


def load_recent_history(limit: int = 10) -> list[dict[str, Any]]:
    ensure_app_state()
    if not HISTORY_PATH.exists():
        return []
    entries: list[dict[str, Any]] = []
    try:
        with HISTORY_PATH.open("r", encoding="utf-8") as fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    payload = json.loads(line)
                except json.JSONDecodeError:
                    continue
                if isinstance(payload, dict):
                    entries.append(payload)
    except OSError:
        return []
    return entries[-limit:][::-1]


def _default_settings() -> dict[str, Any]:
    return {
        "comfyui": {
            "enabled": False,
            "base_url": "http://127.0.0.1:8188",
            "workflow_path": "",
            "output_prefix": "image_enhancer",
            "use_output_image": True,
            "prompt": "",
            "negative_prompt": "text, watermark, low quality",
            "reference_image_path": "",
            "control_image_path": "",
            "workflow_params": {},
        }
    }


def load_settings() -> dict[str, Any]:
    base = _default_settings()
    loaded = _read_json(SETTINGS_PATH, {})
    if not isinstance(loaded, dict):
        return base
    for key, value in loaded.items():
        base[key] = value
    return base


def save_settings(settings: dict[str, Any]):
    merged = _default_settings()
    merged.update(settings)
    _write_json(SETTINGS_PATH, merged)


def load_comfyui_settings() -> dict[str, Any]:
    settings = load_settings().get("comfyui", {})
    defaults = _default_settings()["comfyui"]
    if not isinstance(settings, dict):
        return defaults
    merged = dict(defaults)
    merged.update(settings)
    return merged


def save_comfyui_settings(settings: dict[str, Any]):
    data = load_settings()
    data["comfyui"] = settings
    save_settings(data)


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "_", value.strip()).strip("_")
    return slug or "batch"


def timestamp_slug() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


def save_batch_report(report: dict[str, Any], name_hint: str = "batch") -> Path:
    ensure_app_state()
    safe_name = slugify(name_hint)
    path = REPORTS_DIR / f"{timestamp_slug()}-{safe_name}.json"
    _write_json(path, report)
    return path


def export_profile_to_dict(profile: ExportProfile) -> dict[str, Any]:
    return asdict(profile)

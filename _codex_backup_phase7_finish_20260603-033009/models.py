from __future__ import annotations

import ctypes
import importlib.util
import os
import site
import shutil
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from storage import load_comfyui_settings

try:
    from rembg import new_session
    REMBG_AVAILABLE = True
except ImportError:
    new_session = None
    REMBG_AVAILABLE = False

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    np = None
    NUMPY_AVAILABLE = False

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    cv2 = None
    CV2_AVAILABLE = False

try:
    import onnxruntime as ort
    ORT_AVAILABLE = True
except ImportError:
    ort = None
    ORT_AVAILABLE = False

ONNX_CUDA_PROVIDER = "CUDAExecutionProvider"
ONNX_CPU_PROVIDER = "CPUExecutionProvider"
TEXT_DIM = "#5A5A6A"
SUCCESS = "#4ADE80"
WARNING = "#FACC15"
ERROR = "#F87171"

FAST_SEGMENTATION_MODEL = "u2net"
PREMIUM_SEGMENTATION_MODEL = "birefnet-general"

REMBG_MODELS = [
    ("u2net",                 "u2net                 <- rapido/default"),
    ("birefnet-general",      "birefnet-general      <- premium precision"),
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
    ("realesrgan", "Real-ESRGAN IA x4"),
    ("lanczos", "LANCZOS rapido"),
]
UPSCALE_ENGINE_LABELS = [label for _, label in UPSCALE_ENGINES]
UPSCALE_ENGINE_BY_LABEL = {label: key for key, label in UPSCALE_ENGINES}
DEFAULT_UPSCALE_ENGINE = "realesrgan"

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
CODEFORMER_ENV_SCRIPT = "IMAGE_ENHANCER_CODEFORMER_SCRIPT"
CODEFORMER_ENV_PYTHON = "IMAGE_ENHANCER_CODEFORMER_PYTHON"
CODEFORMER_ENV_ONNX = "IMAGE_ENHANCER_CODEFORMER_ONNX"
GFPGAN_ENV_SCRIPT = "IMAGE_ENHANCER_GFPGAN_SCRIPT"
GFPGAN_ENV_PYTHON = "IMAGE_ENHANCER_GFPGAN_PYTHON"
ZERO_DCE_ENV_ONNX = "IMAGE_ENHANCER_ZERO_DCE_ONNX"
DEEPWB_ENV_ONNX = "IMAGE_ENHANCER_DEEPWB_ONNX"
UE5_DEPTH_ENV_ONNX = "IMAGE_ENHANCER_UE5_DEPTH_ONNX"
UE5_NORMAL_ENV_ONNX = "IMAGE_ENHANCER_UE5_NORMAL_ONNX"
PYIQA_ENV_PYTHON = "IMAGE_ENHANCER_PYIQA_PYTHON"
PYIQA_ENV_METRIC = "IMAGE_ENHANCER_PYIQA_METRIC"


def _module_available(module_name: str) -> bool:
    return importlib.util.find_spec(module_name) is not None


def _notify(status_cb: Callable[[str, str], None] | None, msg: str, color: str = TEXT_DIM):
    if status_cb:
        status_cb(msg, color)


@dataclass(frozen=True)
class ModuleSpec:
    id: str
    name: str
    family: str
    description: str
    dependencies: tuple[str, ...] = ()
    model_required: str = ""
    fallback: str = ""
    smoke_test: str = ""
    implemented: bool = False


MODULE_STATE_NOT_INSTALLED = "No instalado"
MODULE_STATE_READY = "Listo"
MODULE_STATE_ACTIVE = "Activo"
MODULE_STATE_FALLBACK = "Fallback"
MODULE_STATE_ERROR = "Error"


class ModuleRegistry:
    def __init__(self):
        self._active: set[str] = set()
        self._errors: dict[str, str] = {}
        self._specs: dict[str, ModuleSpec] = {
            "segmentation_birefnet": ModuleSpec(
                id="segmentation_birefnet",
                name="BiRefNet premium",
                family="Segmentacion",
                description="Preset premium para cabello, bordes complejos y comparacion contra u2net.",
                dependencies=("rembg",),
                model_required=PREMIUM_SEGMENTATION_MODEL,
                fallback=FAST_SEGMENTATION_MODEL,
                smoke_test="--smoke-rembg --model birefnet-general",
                implemented=True,
            ),
            "upscale_realesrgan": ModuleSpec(
                id="upscale_realesrgan",
                name="Real-ESRGAN x4",
                family="Restauracion",
                description="Upscale ONNX principal con fallback LANCZOS si falla modelo o runtime.",
                dependencies=("onnxruntime-gpu", "numpy"),
                model_required=str(REALESRGAN_ONNX_PATH),
                fallback="LANCZOS",
                smoke_test="--smoke-realesrgan",
                implemented=True,
            ),
            "portrait_codeformer": ModuleSpec(
                id="portrait_codeformer",
                name="CodeFormer externo",
                family="Retratos",
                description="Recuperacion facial opcional via instalacion externa oficial.",
                dependencies=("IMAGE_ENHANCER_CODEFORMER_SCRIPT",),
                model_required="inference_codeformer.py",
                fallback="sin face recovery",
                smoke_test="--smoke-codeformer",
                implemented=True,
            ),
            "portrait_face_detector": ModuleSpec(
                id="portrait_face_detector",
                name="Detector facial local",
                family="Retratos",
                description="Detecta rostro con OpenCV para aplicar CodeFormer en crop y mezclar sin tocar todo el frame.",
                dependencies=("opencv-python-headless", "numpy"),
                model_required="haarcascade_frontalface_default.xml",
                fallback="CodeFormer sobre imagen completa",
                smoke_test="--smoke-portrait",
                implemented=True,
            ),
            "portrait_codeformer_onnx": ModuleSpec(
                id="portrait_codeformer_onnx",
                name="CodeFormer ONNX ruta",
                family="Retratos",
                description="Ruta candidata para validar un ONNX local sin meter PyTorch al EXE.",
                dependencies=(CODEFORMER_ENV_ONNX,),
                model_required="codeformer.onnx",
                fallback="CodeFormer externo por script",
                smoke_test="--smoke-portrait",
            ),
            "portrait_gfpgan_external": ModuleSpec(
                id="portrait_gfpgan_external",
                name="GFPGAN externo",
                family="Retratos",
                description="Candidato externo para evaluar face recovery sin sumar PyTorch al runtime principal.",
                dependencies=(GFPGAN_ENV_SCRIPT,),
                model_required="inference_gfpgan.py",
                fallback="CodeFormer externo",
                smoke_test="--smoke-portrait",
            ),
            "ue5_texture_set": ModuleSpec(
                id="ue5_texture_set",
                name="UE5 Texture Set",
                family="UE5 Texture Tools",
                description="Export profile local con carpeta estable, albedo.png y manifest tecnico.",
                fallback="albedo only si faltan depth/normal",
                smoke_test="--smoke-ue5-texture-set",
                implemented=True,
            ),
            "quality_pyiqa": ModuleSpec(
                id="quality_pyiqa",
                name="PyIQA scoring",
                family="Calidad automatica",
                description="Medicion numerica de mejora/empeoramiento para futuros pipelines auto-regulados.",
                dependencies=("pyiqa opcional o IMAGE_ENHANCER_PYIQA_PYTHON",),
                fallback="sin scoring",
                smoke_test="--smoke-module quality_pyiqa",
                implemented=True,
            ),
            "ue5_depth": ModuleSpec(
                id="ue5_depth",
                name="Depth Anything v2",
                family="UE5 Texture Tools",
                description="Futuro mapa de profundidad local para export tecnico hacia Unreal Engine.",
                dependencies=(UE5_DEPTH_ENV_ONNX,),
                model_required="depth_anything_v2.onnx",
                fallback="export albedo actual",
                smoke_test="--smoke-module ue5_depth",
            ),
            "ue5_normal_map": ModuleSpec(
                id="ue5_normal_map",
                name="Normal Map AI",
                family="UE5 Texture Tools",
                description="Futuro normal map desde fotografia/textura para sets PBR.",
                dependencies=(UE5_NORMAL_ENV_ONNX,),
                fallback="sin normal map",
                smoke_test="--smoke-module ue5_normal_map",
            ),
            "color_zero_dce": ModuleSpec(
                id="color_zero_dce",
                name="Zero-DCE luz",
                family="Luz + color",
                description="Candidato ONNX para recuperacion de fotos oscuras/subexpuestas.",
                dependencies=(ZERO_DCE_ENV_ONNX,),
                model_required="zero_dce.onnx",
                fallback="Luz/color local",
                smoke_test="--smoke-module color_zero_dce",
            ),
            "color_deepwb": ModuleSpec(
                id="color_deepwb",
                name="DeepWB color",
                family="Luz + color",
                description="Candidato ONNX para balance de blancos automatico en fotos planas.",
                dependencies=(DEEPWB_ENV_ONNX,),
                model_required="deepwb.onnx",
                fallback="Luz/color local",
                smoke_test="--smoke-module color_deepwb",
            ),
            "color_local_restore": ModuleSpec(
                id="color_local_restore",
                name="Luz/color local",
                family="Luz + color",
                description="Restauracion local segura con autocontraste, color, brillo y denoise suave sin dependencias nuevas.",
                dependencies=("Pillow",),
                fallback="sin restauracion de luz/color",
                smoke_test="--smoke-color-restore",
                implemented=True,
            ),
            "restoration_swinir": ModuleSpec(
                id="restoration_swinir",
                name="SwinIR/HAT/BSRGAN",
                family="Restauracion",
                description="Candidato futuro para denoise/deblur/super-res segun ONNX viable.",
                dependencies=("modelo ONNX restauracion",),
                fallback="Real-ESRGAN o LANCZOS",
                smoke_test="--smoke-module restoration_swinir",
            ),
            "creative_comfyui": ModuleSpec(
                id="creative_comfyui",
                name="ComfyUI API",
                family="Creativa",
                description="Backend externo opcional para nodos/modelos avanzados sin inflar la app base.",
                dependencies=("ComfyUI local",),
                fallback="pipeline local actual",
                smoke_test="--smoke-module creative_comfyui",
                implemented=True,
            ),
            "production_batch": ModuleSpec(
                id="production_batch",
                name="Batch + presets",
                family="Produccion",
                description="Procesamiento por carpetas, presets guardables, export profiles e historial.",
                dependencies=(),
                fallback="procesamiento unitario actual",
                smoke_test="--smoke-module production_batch",
                implemented=True,
            ),
        }

    def all_specs(self) -> list[ModuleSpec]:
        return list(self._specs.values())

    def get(self, module_id: str) -> ModuleSpec | None:
        return self._specs.get(module_id)

    def is_active(self, module_id: str) -> bool:
        return module_id in self._active

    def status(self, module_id: str) -> str:
        spec = self.get(module_id)
        if spec is None:
            return MODULE_STATE_ERROR
        if module_id in self._errors:
            return MODULE_STATE_ERROR
        if module_id in self._active:
            return MODULE_STATE_ACTIVE
        if not spec.implemented:
            return MODULE_STATE_NOT_INSTALLED
        if module_id == "segmentation_birefnet":
            return MODULE_STATE_READY if REMBG_AVAILABLE else MODULE_STATE_NOT_INSTALLED
        if module_id == "upscale_realesrgan":
            if ORT_AVAILABLE and NUMPY_AVAILABLE:
                return MODULE_STATE_FALLBACK if MODEL_MANAGER.runtime_label() == "CPU fallback" else MODULE_STATE_READY
            return MODULE_STATE_NOT_INSTALLED
        if module_id == "portrait_codeformer":
            script = os.environ.get("IMAGE_ENHANCER_CODEFORMER_SCRIPT", "").strip()
            return MODULE_STATE_READY if script and Path(script).expanduser().exists() else MODULE_STATE_FALLBACK
        if module_id == "portrait_face_detector":
            return MODULE_STATE_READY if CV2_AVAILABLE and NUMPY_AVAILABLE else MODULE_STATE_FALLBACK
        if module_id == "creative_comfyui":
            settings = load_comfyui_settings()
            workflow_path = str(settings.get("workflow_path", "")).strip()
            base_url = str(settings.get("base_url", "")).strip()
            if workflow_path and Path(workflow_path).expanduser().exists() and base_url:
                return MODULE_STATE_READY
            return MODULE_STATE_FALLBACK
        if module_id == "production_batch":
            return MODULE_STATE_READY
        if module_id == "color_local_restore":
            return MODULE_STATE_READY
        if module_id == "quality_pyiqa":
            external_python = os.environ.get(PYIQA_ENV_PYTHON, "").strip()
            if external_python and Path(external_python).expanduser().exists():
                return MODULE_STATE_READY
            if _module_available("pyiqa"):
                return MODULE_STATE_READY
            return MODULE_STATE_FALLBACK
        if module_id == "ue5_depth":
            model_path = os.environ.get(UE5_DEPTH_ENV_ONNX, "").strip()
            return MODULE_STATE_READY if model_path and Path(model_path).expanduser().exists() else MODULE_STATE_FALLBACK
        if module_id == "ue5_normal_map":
            model_path = os.environ.get(UE5_NORMAL_ENV_ONNX, "").strip()
            return MODULE_STATE_READY if model_path and Path(model_path).expanduser().exists() else MODULE_STATE_FALLBACK
        return MODULE_STATE_READY

    def activate(self, module_id: str) -> str:
        spec = self.get(module_id)
        if spec is None:
            self._errors[module_id] = "Modulo desconocido"
            return MODULE_STATE_ERROR
        state = self.status(module_id)
        if state in (MODULE_STATE_READY, MODULE_STATE_FALLBACK):
            self._active.add(module_id)
            return MODULE_STATE_ACTIVE if state == MODULE_STATE_READY else MODULE_STATE_FALLBACK
        return state

    def deactivate(self, module_id: str) -> str:
        self._active.discard(module_id)
        return self.status(module_id)

    def validate(self, module_id: str) -> tuple[bool, str]:
        spec = self.get(module_id)
        if spec is None:
            return False, f"Modulo no registrado: {module_id}"
        state = self.status(module_id)
        optional_paths = {
            "portrait_codeformer_onnx": (CODEFORMER_ENV_ONNX, True),
            "portrait_gfpgan_external": (GFPGAN_ENV_SCRIPT, False),
            "color_zero_dce": (ZERO_DCE_ENV_ONNX, True),
            "color_deepwb": (DEEPWB_ENV_ONNX, True),
        }
        if module_id in optional_paths:
            env_name, needs_ort = optional_paths[module_id]
            raw_path = os.environ.get(env_name, "").strip()
            if not raw_path:
                return True, f"{spec.name} queda en fallback; define {env_name} para validar una ruta local."
            path = Path(raw_path).expanduser()
            if not path.exists():
                return False, f"{spec.name}: {env_name} apunta a una ruta inexistente: {path}"
            if needs_ort and not ORT_AVAILABLE:
                return False, f"{spec.name}: onnxruntime no esta instalado para validar ONNX."
            return True, f"{spec.name} ruta candidata valida: {path}"
        if not spec.implemented:
            return True, f"{spec.name} registrado como futuro modulo; fallback: {spec.fallback}."
        if state == MODULE_STATE_NOT_INSTALLED:
            return False, f"{spec.name} no esta instalado o no tiene dependencias disponibles."
        if state == MODULE_STATE_FALLBACK:
            if module_id == "creative_comfyui":
                return True, (
                    "ComfyUI registrado en fallback. Configura endpoint + workflow y ejecuta "
                    "--smoke-comfyui para validar la API."
                )
            if module_id == "quality_pyiqa":
                return True, (
                    "quality_pyiqa queda opcional. Instala pyiqa en este entorno o define "
                    "IMAGE_ENHANCER_PYIQA_PYTHON para calcular score sin inflar la app base."
                )
            if module_id == "ue5_depth":
                return True, (
                    "ue5_depth queda en fallback. Define IMAGE_ENHANCER_UE5_DEPTH_ONNX "
                    "para validar un modelo local real."
                )
            if module_id == "ue5_normal_map":
                return True, (
                    "ue5_normal_map queda en fallback. Define IMAGE_ENHANCER_UE5_NORMAL_ONNX "
                    "para validar un modelo local real."
                )
            return True, f"{spec.name} disponible solo en fallback: {spec.fallback}."
        if module_id == "quality_pyiqa":
            external_python = os.environ.get(PYIQA_ENV_PYTHON, "").strip()
            metric_name = os.environ.get(PYIQA_ENV_METRIC, "niqe").strip() or "niqe"
            if external_python:
                path = Path(external_python).expanduser()
                if not path.exists():
                    return False, f"quality_pyiqa: {PYIQA_ENV_PYTHON} apunta a una ruta inexistente: {path}"
                return True, f"PyIQA listo via {PYIQA_ENV_PYTHON} con metrica '{metric_name}'."
            return True, f"PyIQA importable en este entorno con metrica '{metric_name}'."
        return True, f"{spec.name} validado: {state}."


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


class ModelManager:
    """Singleton para cargar y reutilizar modelos ONNX durante toda la app."""

    _instance = None
    _instance_lock = threading.Lock()

    def __new__(cls):
        with cls._instance_lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if getattr(self, "_initialized", False):
            return
        self._initialized = True
        self._lock = threading.RLock()
        self._rembg_sessions = {}
        self._realesrgan_session = None
        self.cuda_dll_directory_error = ""
        self.cuda_dll_directory_handles = self._register_nvidia_dll_directories()
        self.cuda_preload_error = ""
        self.cuda_preload_done = self._preload_cuda_dlls()
        self.available_providers = self._load_available_providers()
        self.nvidia_gpu_available = self._detect_nvidia_gpu()
        self.cuda_runtime_error = ""
        self.preferred_providers = self._resolve_preferred_providers()
        self._print_startup_summary()

    def _register_nvidia_dll_directories(self) -> list[object]:
        if os.name != "nt":
            return []

        handles = []
        site_dirs = []
        try:
            site_dirs.extend(site.getsitepackages())
        except Exception:
            pass
        try:
            user_site = site.getusersitepackages()
            if user_site:
                site_dirs.append(user_site)
        except Exception:
            pass

        nvidia_roots: list[Path] = []
        for site_dir in site_dirs:
            nvidia_root = Path(site_dir) / "nvidia"
            if not nvidia_root.exists():
                continue
            nvidia_roots.append(nvidia_root)

        frozen_root = getattr(sys, "_MEIPASS", "")
        if frozen_root:
            nvidia_roots.append(Path(frozen_root) / "nvidia")
        nvidia_roots.append(Path(sys.executable).resolve().parent / "_internal" / "nvidia")

        dll_dirs: set[Path] = set()
        for nvidia_root in nvidia_roots:
            if not nvidia_root.exists():
                continue
            for dll_path in nvidia_root.rglob("*.dll"):
                dll_dirs.add(dll_path.parent)

        sorted_dll_dirs = sorted(dll_dirs)
        existing_path_parts = os.environ.get("PATH", "").split(os.pathsep)
        prepend_dirs = [str(path) for path in sorted_dll_dirs if str(path) not in existing_path_parts]
        if prepend_dirs:
            os.environ["PATH"] = os.pathsep.join(prepend_dirs + existing_path_parts)

        for dll_dir in sorted_dll_dirs:
            try:
                handles.append(os.add_dll_directory(str(dll_dir)))
            except (OSError, AttributeError) as exc:
                self.cuda_dll_directory_error = str(exc)
        return handles

    def _preload_cuda_dlls(self) -> bool:
        if not ORT_AVAILABLE or not hasattr(ort, "preload_dlls"):
            return False
        try:
            # Empty string prefers NVIDIA wheels in site-packages, then system paths.
            ort.preload_dlls(cuda=True, cudnn=True, msvc=True, directory="")
            return True
        except Exception as exc:
            self.cuda_preload_error = str(exc)
            return False

    def _load_available_providers(self) -> list[str]:
        if not ORT_AVAILABLE:
            return []
        try:
            return list(ort.get_available_providers())
        except Exception:
            return []

    def _detect_nvidia_gpu(self) -> bool:
        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0) if os.name == "nt" else 0
        try:
            result = subprocess.run(
                ["nvidia-smi", "-L"],
                capture_output=True,
                text=True,
                timeout=4,
                creationflags=creationflags,
            )
        except (OSError, subprocess.TimeoutExpired):
            return False
        output = f"{result.stdout}\n{result.stderr}".upper()
        return result.returncode == 0 and "NVIDIA" in output and "GPU" in output

    def _resolve_preferred_providers(self) -> list[str]:
        if not ORT_AVAILABLE:
            return []
        if ONNX_CUDA_PROVIDER in self.available_providers and self._cuda_runtime_ready():
            return [ONNX_CUDA_PROVIDER, ONNX_CPU_PROVIDER]
        return [ONNX_CPU_PROVIDER]

    def _cuda_runtime_ready(self) -> bool:
        if ONNX_CUDA_PROVIDER not in self.available_providers:
            return False
        if os.name != "nt":
            return True

        missing = []
        for dll_name in ("cudart64_12.dll", "cublas64_12.dll", "cublasLt64_12.dll", "cudnn64_9.dll"):
            try:
                ctypes.WinDLL(dll_name)
            except OSError:
                missing.append(dll_name)

        if missing:
            self.cuda_runtime_error = "faltan " + ", ".join(missing)
            return False
        return True

    def cuda_report(self) -> dict[str, object]:
        return {
            "nvidia_gpu_available": self.nvidia_gpu_available,
            "available_providers": list(self.available_providers),
            "preferred_providers": list(self.preferred_providers),
            "runtime_label": self.runtime_label(),
            "cuda_dll_directories_registered": len(self.cuda_dll_directory_handles),
            "cuda_dll_directory_error": self.cuda_dll_directory_error,
            "cuda_preload_done": self.cuda_preload_done,
            "cuda_preload_error": self.cuda_preload_error,
            "cuda_runtime_error": self.cuda_runtime_error,
        }

    def _provider_text(self, providers: list[str] | tuple[str, ...] | None = None) -> str:
        providers = list(providers if providers is not None else self.preferred_providers)
        return ", ".join(providers) if providers else "no disponible"

    def _print_startup_summary(self):
        if not ORT_AVAILABLE:
            print("[ONNXRuntime] No instalado. Ejecuta instalar.bat.")
            return
        gpu_state = "detectada" if self.nvidia_gpu_available else "no detectada"
        print(f"[ONNXRuntime] GPU NVIDIA: {gpu_state}")
        print(f"[ONNXRuntime] Directorios DLL NVIDIA: {len(self.cuda_dll_directory_handles)} registrados")
        if self.cuda_dll_directory_error:
            print(f"[ONNXRuntime] Registro DLL NVIDIA parcial: {self.cuda_dll_directory_error}")
        print(f"[ONNXRuntime] Preload CUDA/cuDNN: {'OK' if self.cuda_preload_done else 'no disponible'}")
        if self.cuda_preload_error:
            print(f"[ONNXRuntime] Preload CUDA/cuDNN fallo: {self.cuda_preload_error}")
        print(f"[ONNXRuntime] Providers disponibles: {self._provider_text(self.available_providers)}")
        print(f"[ONNXRuntime] Provider preferido al iniciar: {self._provider_text()}")
        if ONNX_CUDA_PROVIDER in self.available_providers and ONNX_CUDA_PROVIDER not in self.preferred_providers:
            reason = self.cuda_runtime_error or "CUDA no paso la verificacion local"
            print(f"[ONNXRuntime] CUDAExecutionProvider instalado pero no activado: {reason}.")
        if (
            ONNX_CUDA_PROVIDER not in self.available_providers
            and ONNX_CUDA_PROVIDER not in self.preferred_providers
            and self.nvidia_gpu_available
        ):
            print(
                "[ONNXRuntime] RTX detectada, pero CUDAExecutionProvider no esta disponible. "
                "Instala/verifica CUDA 12.x y cuDNN 9.x para activar CUDA."
            )

    def runtime_label(self) -> str:
        if not ORT_AVAILABLE:
            return "Falta"
        if ONNX_CUDA_PROVIDER in self.preferred_providers:
            return "CUDA + CPU"
        return "CPU fallback"

    def runtime_color(self) -> str:
        if not ORT_AVAILABLE:
            return WARNING
        if ONNX_CUDA_PROVIDER in self.preferred_providers:
            return SUCCESS
        return WARNING if self.nvidia_gpu_available else SUCCESS

    def _session_options(self):
        session_options = ort.SessionOptions()
        session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        return session_options

    def _create_onnx_session(self, model_path: Path, model_label: str):
        providers = list(self.preferred_providers)
        try:
            session = ort.InferenceSession(
                str(model_path),
                sess_options=self._session_options(),
                providers=providers,
            )
        except Exception as exc:
            if providers != [ONNX_CPU_PROVIDER]:
                print(
                    f"[ONNXRuntime] {model_label}: fallo CUDA, usando CPUExecutionProvider. "
                    f"Detalle: {exc}"
                )
                session = ort.InferenceSession(
                    str(model_path),
                    sess_options=self._session_options(),
                    providers=[ONNX_CPU_PROVIDER],
                )
            else:
                raise
        active_providers = session.get_providers()
        if ONNX_CUDA_PROVIDER in providers and ONNX_CUDA_PROVIDER not in active_providers:
            print(f"[ONNXRuntime] {model_label}: CUDA no se activo; fallback CPU en uso.")
            self.preferred_providers = [ONNX_CPU_PROVIDER]
        print(f"[ONNXRuntime] {model_label}: providers activos {self._provider_text(active_providers)}")
        return session

    def get_realesrgan_session(self, status_cb: Callable[[str, str], None] | None = None):
        with self._lock:
            if self._realesrgan_session is not None:
                return self._realesrgan_session
            if not ORT_AVAILABLE:
                raise RuntimeError("onnxruntime no esta instalado. Ejecuta instalar.bat.")
            if not NUMPY_AVAILABLE:
                raise RuntimeError("numpy no esta instalado. Ejecuta instalar.bat.")

            model_path = ensure_realesrgan_model(status_cb)
            _notify(status_cb, f"Cargando Real-ESRGAN en ONNX Runtime ({self.runtime_label()})...", TEXT_DIM)
            self._realesrgan_session = self._create_onnx_session(model_path, "Real-ESRGAN")
            return self._realesrgan_session

    def get_rembg_session(self, model_key: str):
        with self._lock:
            if model_key in self._rembg_sessions:
                return self._rembg_sessions[model_key]
            if not REMBG_AVAILABLE:
                raise RuntimeError("rembg no esta instalado. Ejecuta instalar.bat.")

            providers = list(self.preferred_providers)
            try:
                session = new_session(model_key, providers=providers)
            except Exception as exc:
                if providers != [ONNX_CPU_PROVIDER]:
                    print(
                        f"[ONNXRuntime] rembg/{model_key}: fallo CUDA, usando CPUExecutionProvider. "
                        f"Detalle: {exc}"
                    )
                    session = new_session(model_key, providers=[ONNX_CPU_PROVIDER])
                else:
                    raise

            inner_session = getattr(session, "inner_session", None)
            active = inner_session.get_providers() if inner_session else providers
            if ONNX_CUDA_PROVIDER in providers and ONNX_CUDA_PROVIDER not in active:
                print(f"[ONNXRuntime] rembg/{model_key}: CUDA no se activo; fallback CPU en uso.")
                self.preferred_providers = [ONNX_CPU_PROVIDER]
            print(f"[ONNXRuntime] rembg/{model_key}: providers activos {self._provider_text(active)}")
            self._rembg_sessions[model_key] = session
            return session


MODEL_MANAGER = ModelManager()


def get_realesrgan_session(status_cb: Callable[[str, str], None] | None = None):
    """Devuelve la sesion singleton de Real-ESRGAN ONNX."""
    return MODEL_MANAGER.get_realesrgan_session(status_cb)


def get_rembg_session(model_key: str):
    """Devuelve una sesion rembg cacheada por modelo."""
    return MODEL_MANAGER.get_rembg_session(model_key)

MODULE_REGISTRY = ModuleRegistry()

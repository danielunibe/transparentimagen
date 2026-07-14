from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
import threading
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

from storage import save_batch_report

RIFE_ENV_SCRIPT = "IMAGE_ENHANCER_RIFE_SCRIPT"
BASICVSR_ENV_SCRIPT = "IMAGE_ENHANCER_BASICVSR_SCRIPT"


class VideoProcessingCancelled(RuntimeError):
    pass


@dataclass
class VideoCancellationToken:
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
            raise VideoProcessingCancelled("Procesamiento de video cancelado por el usuario.")


@dataclass(frozen=True)
class VideoSprintOptions:
    source_path: Path
    output_path: Path
    frame_processor: str = "copy"
    temp_root: Path | None = None
    keep_temp: bool = False


@dataclass
class VideoSprintReport:
    status: str
    source_path: str
    output_path: str
    temp_dir: str
    processor: str
    stage: str
    started_at: str
    finished_at: str
    frames_total: int = 0
    frames_processed: int = 0
    fps: float = 0.0
    width: int = 0
    height: int = 0
    has_audio: bool = False
    warnings: list[str] = field(default_factory=list)
    report_path: str = ""


def _notify(status_cb: Callable[[str], None] | None, msg: str):
    if status_cb:
        status_cb(msg)


def _run_command(
    command: list[str],
    *,
    token: VideoCancellationToken,
    stage: str,
    status_cb: Callable[[str], None] | None = None,
) -> None:
    _notify(status_cb, f"{stage}: {' '.join(command[:3])}...")
    with tempfile.NamedTemporaryFile(mode="w+", encoding="utf-8", delete=False, suffix=".log") as log_file:
        log_path = Path(log_file.name)
    try:
        with log_path.open("w+", encoding="utf-8") as handle:
            process = subprocess.Popen(
                command,
                stdout=handle,
                stderr=handle,
                text=True,
            )
            while True:
                if token.is_cancelled():
                    process.kill()
                    raise VideoProcessingCancelled(f"{stage} cancelado.")
                code = process.poll()
                if code is not None:
                    handle.flush()
                    handle.seek(0)
                    detail = handle.read().strip()
                    if code != 0:
                        raise RuntimeError(f"{stage} fallo.\nComando: {' '.join(command)}\nSalida: {detail[:800]}")
                    return
                time.sleep(0.2)
    finally:
        log_path.unlink(missing_ok=True)


def _probe_video(source_path: Path) -> dict:
    command = [
        "ffprobe",
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_streams",
        "-show_format",
        str(source_path),
    ]
    completed = subprocess.run(command, capture_output=True, text=True, check=True, timeout=120)
    return json.loads(completed.stdout)


def _parse_fps(value: str) -> float:
    if not value or value == "0/0":
        return 0.0
    if "/" in value:
        num, den = value.split("/", 1)
        return float(num) / max(1.0, float(den))
    return float(value)


def _extract_video_info(probe: dict) -> tuple[float, int, int, bool]:
    fps = 0.0
    width = 0
    height = 0
    has_audio = False
    for stream in probe.get("streams", []):
        if stream.get("codec_type") == "video" and not width:
            fps = _parse_fps(str(stream.get("avg_frame_rate", "0/0")))
            width = int(stream.get("width", 0) or 0)
            height = int(stream.get("height", 0) or 0)
        if stream.get("codec_type") == "audio":
            has_audio = True
    return fps, width, height, has_audio


def _restore_light_frame(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    rgb = rgba.convert("RGB")
    rgb = ImageOps.autocontrast(rgb, cutoff=1)
    rgb = ImageEnhance.Brightness(rgb).enhance(1.07)
    rgb = ImageEnhance.Color(rgb).enhance(1.06)
    rgb = rgb.filter(ImageFilter.MedianFilter(size=3))
    return Image.merge("RGBA", (*rgb.split(), rgba.getchannel("A")))


def _process_frames(
    source_dir: Path,
    output_dir: Path,
    *,
    processor: str,
    token: VideoCancellationToken,
    status_cb: Callable[[str], None] | None = None,
) -> int:
    frames = sorted(source_dir.glob("frame_*.png"))
    total = len(frames)
    if not total:
        raise RuntimeError("No se extrajeron frames para el sprint de video.")
    for index, frame_path in enumerate(frames, start=1):
        token.raise_if_cancelled()
        target = output_dir / frame_path.name
        if processor == "copy":
            shutil.copy2(frame_path, target)
        elif processor == "light_restore":
            with Image.open(frame_path) as image:
                restored = _restore_light_frame(image)
                restored.save(target, format="PNG", optimize=True)
        else:
            raise RuntimeError(f"Frame processor no soportado: {processor}")
        if index == 1 or index == total or index % 10 == 0:
            _notify(status_cb, f"Procesando frames... {index}/{total}")
    return total


def _assemble_video(
    processed_dir: Path,
    source_path: Path,
    output_path: Path,
    *,
    fps: float,
    has_audio: bool,
    token: VideoCancellationToken,
    status_cb: Callable[[str], None] | None = None,
):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    command = [
        "ffmpeg",
        "-y",
        "-framerate",
        f"{fps:.6f}" if fps > 0 else "24",
        "-i",
        str(processed_dir / "frame_%06d.png"),
    ]
    if has_audio:
        command += ["-i", str(source_path), "-map", "0:v:0", "-map", "1:a:0?"]
    command += [
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        str(output_path),
    ]
    _run_command(command, token=token, stage="Ensamblado de video", status_cb=status_cb)


def run_video_sprint(
    options: VideoSprintOptions,
    *,
    token: VideoCancellationToken | None = None,
    status_cb: Callable[[str], None] | None = None,
) -> VideoSprintReport:
    token = token or VideoCancellationToken()
    started_at = datetime.now().isoformat(timespec="seconds")
    temp_dir_obj: tempfile.TemporaryDirectory[str] | None = None
    temp_root = options.temp_root
    if temp_root is None:
        temp_dir_obj = tempfile.TemporaryDirectory(prefix="image_enhancer_video_")
        temp_root = Path(temp_dir_obj.name)
    else:
        temp_root.mkdir(parents=True, exist_ok=True)

    extracted_dir = temp_root / "frames_src"
    processed_dir = temp_root / "frames_out"
    extracted_dir.mkdir(parents=True, exist_ok=True)
    processed_dir.mkdir(parents=True, exist_ok=True)

    report = VideoSprintReport(
        status="running",
        source_path=str(options.source_path),
        output_path=str(options.output_path),
        temp_dir=str(temp_root),
        processor=options.frame_processor,
        stage="probe",
        started_at=started_at,
        finished_at="",
    )

    try:
        if not options.source_path.exists():
            raise RuntimeError(f"No existe el video fuente: {options.source_path}")

        token.raise_if_cancelled()
        _notify(status_cb, "Analizando video fuente...")
        probe = _probe_video(options.source_path)
        fps, width, height, has_audio = _extract_video_info(probe)
        report.fps = fps
        report.width = width
        report.height = height
        report.has_audio = has_audio

        report.stage = "extract"
        _run_command(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(options.source_path),
                str(extracted_dir / "frame_%06d.png"),
            ],
            token=token,
            stage="Extraccion de frames",
            status_cb=status_cb,
        )

        report.stage = "process"
        report.frames_total = len(list(extracted_dir.glob("frame_*.png")))
        report.frames_processed = _process_frames(
            extracted_dir,
            processed_dir,
            processor=options.frame_processor,
            token=token,
            status_cb=status_cb,
        )

        report.stage = "assemble"
        _assemble_video(
            processed_dir,
            options.source_path,
            options.output_path,
            fps=fps,
            has_audio=has_audio,
            token=token,
            status_cb=status_cb,
        )

        report.status = "completed"
        report.stage = "done"
    except VideoProcessingCancelled as exc:
        report.status = "cancelled"
        report.stage = "cancelled"
        report.warnings.append(str(exc))
    except Exception as exc:
        report.status = "error"
        report.stage = "error"
        report.warnings.append(str(exc))
    finally:
        report.finished_at = datetime.now().isoformat(timespec="seconds")
        report.report_path = str(save_batch_report(asdict(report), name_hint="video_sprint"))
        if temp_dir_obj is not None and not options.keep_temp:
            temp_dir_obj.cleanup()
        elif temp_root is not None and not options.keep_temp and temp_root.exists():
            shutil.rmtree(temp_root, ignore_errors=True)

    return report


def run_video_sprint_cli(
    source_path: str,
    output_path: str,
    *,
    frame_processor: str = "copy",
    keep_temp: bool = False,
) -> int:
    report = run_video_sprint(
        VideoSprintOptions(
            source_path=Path(source_path).expanduser(),
            output_path=Path(output_path).expanduser(),
            frame_processor=frame_processor,
            keep_temp=keep_temp,
        ),
        status_cb=print,
    )
    print(json.dumps(asdict(report), ensure_ascii=True, indent=2))
    return 0 if report.status == "completed" else 1


def _print_optional_script_probe(label: str, env_name: str) -> bool:
    raw_value = os.environ.get(env_name, "").strip()
    raw = Path(raw_value).expanduser() if raw_value else None
    if raw is None:
        print(f"OK: {label} en fallback ({env_name} no definido)")
        return True
    if not raw.exists():
        print(f"FAIL: {label}: ruta inexistente en {env_name}: {raw}")
        return False
    print(f"OK: {label} candidato -> {raw}")
    return True


def run_video_sprint_smoke() -> int:
    try:
        with tempfile.TemporaryDirectory(prefix="image_enhancer_video_smoke_") as tmp_dir:
            tmp = Path(tmp_dir)
            source = tmp / "source.mp4"
            output = tmp / "output.mp4"
            subprocess.run(
                [
                    "ffmpeg",
                    "-y",
                    "-f",
                    "lavfi",
                    "-i",
                    "testsrc=size=96x64:rate=12",
                    "-t",
                    "1.5",
                    str(source),
                ],
                capture_output=True,
                text=True,
                check=True,
                timeout=120,
            )
            report = run_video_sprint(
                VideoSprintOptions(
                    source_path=source,
                    output_path=output,
                    frame_processor="light_restore",
                    keep_temp=False,
                ),
                status_cb=lambda msg: None,
            )
            if report.status != "completed":
                raise RuntimeError(f"sprint de video no completo: {report.status} {report.warnings}")
            if not output.exists():
                raise RuntimeError("no se genero el video de salida")
            if report.frames_processed <= 0:
                raise RuntimeError("no se procesaron frames")
    except Exception as exc:
        print(f"FAIL: video sprint smoke failed: {exc}")
        return 1

    ok = True
    ok = _print_optional_script_probe("RIFE externo", RIFE_ENV_SCRIPT) and ok
    ok = _print_optional_script_probe("BasicVSR++ externo", BASICVSR_ENV_SCRIPT) and ok
    if ok:
        print("OK: video sprint smoke passed")
        return 0
    return 1

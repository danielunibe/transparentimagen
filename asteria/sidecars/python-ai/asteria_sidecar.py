from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from image_ops.background_removal import remove_background_file, rembg_available
from image_ops.enhancement import enhance_file, pillow_available
from image_ops.format_conversion import convert_file
from image_ops.model_manager import (
    get_models_dir_label,
    get_model_status,
    run_realesrgan_smoke_test,
    validate_all_models,
)
from image_ops.resize import resize_file
from image_ops.upscale import detect_upscale_capabilities, upscale_image
from image_ops.utils import SidecarError

VERSION = "0.3.0"


def emit(payload: dict[str, Any], exit_code: int = 0) -> int:
    print(json.dumps(payload, ensure_ascii=False))
    return exit_code


def command_health(_args: argparse.Namespace) -> int:
    return emit(
        {
            "ok": True,
            "engine": "python_sidecar",
            "version": VERSION,
            "message": "Asteria Python sidecar is available.",
        }
    )


def command_capabilities(_args: argparse.Namespace) -> int:
    has_pillow = pillow_available()
    has_rembg = rembg_available()
    has_onnxruntime = _module_available("onnxruntime")
    upscale_caps = detect_upscale_capabilities()
    available_commands = ["health", "capabilities"]
    if has_rembg:
        available_commands.append("remove-bg")
    if has_pillow:
        available_commands.extend(["enhance", "resize", "convert", "upscale"])
    available_commands.extend(["models", "validate-models", "smoke-test-upscale"])

    return emit(
        {
            "ok": True,
            "engine": "python_sidecar",
            "version": VERSION,
            "pythonExecutable": sys.executable,
            "pythonVersion": sys.version.split()[0],
            "dependencyStatus": {
                "pillow": has_pillow,
                "rembg": has_rembg,
                "onnxruntime": has_onnxruntime,
            },
            "capabilities": {
                "removeBg": has_rembg,
                "removeBgPipelineReady": True,
                "enhance": has_pillow,
                "resize": has_pillow,
                "convert": has_pillow,
                "upscale": bool(upscale_caps["upscale"]),
                "upscaleEngine": upscale_caps["upscaleEngine"],
                "realEsrgan": upscale_caps["realEsrgan"],
                "realEsrganStatus": upscale_caps["realEsrganStatus"],
                "supportedUpscaleEngines": upscale_caps["supportedUpscaleEngines"],
                "supportedUpscaleScales": upscale_caps["supportedUpscaleScales"],
                "supportedUpscaleQualityPresets": upscale_caps["supportedUpscaleQualityPresets"],
                "supportedUpscaleTileSizes": upscale_caps["supportedUpscaleTileSizes"],
                "supportedUpscaleTilePads": upscale_caps["supportedUpscaleTilePads"],
                "recommendedUpscaleModelId": upscale_caps["recommendedUpscaleModelId"],
                "modelsDir": upscale_caps["modelsDir"],
                "realEsrganModels": upscale_caps["realEsrganModels"],
                "portrait": False,
                "ue5": False,
                "promptEdit": False,
                "returnsImage": has_pillow or has_rembg,
                "supportsProgress": False,
                "supportsCancel": False,
            },
            "availableCommands": available_commands,
        }
    )


def _module_available(module_name: str) -> bool:
    try:
        __import__(module_name)
        return True
    except ImportError:
        return False


def command_remove_bg(args: argparse.Namespace) -> int:
    return _run_image_command(
        lambda: remove_background_file(Path(args.input), Path(args.output)),
        success_message="Background removed locally.",
    )


def command_enhance(args: argparse.Namespace) -> int:
    return _run_image_command(
        lambda: enhance_file(
            Path(args.input),
            Path(args.output),
            brightness=args.brightness,
            contrast=args.contrast,
            saturation=args.saturation,
            sharpness=args.sharpness,
        ),
        success_message="Image enhanced locally.",
    )


def command_resize(args: argparse.Namespace) -> int:
    return _run_image_command(
        lambda: resize_file(
            Path(args.input),
            Path(args.output),
            width=args.width,
            height=args.height,
        ),
        success_message="Image resized locally.",
    )


def command_convert(args: argparse.Namespace) -> int:
    return _run_image_command(
        lambda: convert_file(Path(args.input), Path(args.output), args.format),
        success_message="Image converted locally.",
    )


def command_upscale(args: argparse.Namespace) -> int:
    try:
        result = upscale_image(
            Path(args.input),
            Path(args.output),
            scale=args.scale,
            engine=args.engine,
            quality_preset=args.quality,
            tile_size=args.tile_size,
            tile_pad=args.tile_pad,
            model_id=args.model,
        )
        metadata = result.metadata or {}
        actual_engine = metadata.get("actualEngine") or ("pillow_lanczos" if args.engine in ("auto", "pillow") else "real_esrgan")
        payload = {
            "ok": True,
            "status": "completed",
            "operation": "upscale",
            "output": str(result.output_path),
            "mimeType": result.mime_type,
            "width": result.width,
            "height": result.height,
            "scale": args.scale,
            "requestedEngine": args.engine,
            "engine": actual_engine,
            "actualEngine": actual_engine,
            "qualityPreset": metadata.get("qualityPreset") or args.quality,
            "tileSize": metadata.get("tileSize") or args.tile_size,
            "tilePad": metadata.get("tilePad") or args.tile_pad,
            "realEsrganStatus": metadata.get("realEsrganStatus"),
            "modelId": metadata.get("modelId"),
            "modelStatus": metadata.get("modelStatus"),
            "memoryMode": metadata.get("memoryMode"),
            "estimatedCost": metadata.get("estimatedCost"),
            "fallbackFrom": metadata.get("fallbackFrom"),
            "message": metadata.get("message") or "Image upscaled locally.",
        }
        return emit(payload)
    except SidecarError as exc:
        details = exc.details or {}
        return emit(
            {
                "ok": False,
                "status": exc.status,
                "operation": "upscale",
                "engine": details.get("engine") or ("real_esrgan" if args.engine == "real-esrgan" else "python_sidecar"),
                "requestedEngine": details.get("requestedEngine") or args.engine,
                "actualEngine": details.get("actualEngine"),
                "qualityPreset": details.get("qualityPreset") or args.quality,
                "tileSize": details.get("tileSize") or args.tile_size,
                "tilePad": details.get("tilePad") or args.tile_pad,
                "realEsrganStatus": details.get("realEsrganStatus"),
                "modelId": details.get("modelId"),
                "modelStatus": details.get("modelStatus"),
                "memoryMode": details.get("memoryMode"),
                "estimatedCost": details.get("estimatedCost"),
                "message": str(exc),
            },
            1,
        )
    except Exception as exc:
        return emit(
            {
                "ok": False,
                "status": "failed",
                "operation": "upscale",
                "engine": "python_sidecar",
                "requestedEngine": args.engine,
                "qualityPreset": args.quality,
                "tileSize": args.tile_size,
                "tilePad": args.tile_pad,
                "message": f"Unexpected sidecar error: {exc}",
            },
            1,
        )


def command_models(_args: argparse.Namespace) -> int:
    status = get_model_status()
    return emit(
        {
            "ok": True,
            "modelsDir": get_models_dir_label(),
            "realEsrganStatus": status["realEsrganStatus"],
            "models": status["models"],
        }
    )


def command_validate_models(_args: argparse.Namespace) -> int:
    status = get_model_status()
    return emit(
        {
            "ok": True,
            "modelsDir": get_models_dir_label(),
            "realEsrganStatus": status["realEsrganStatus"],
            "models": validate_all_models(),
        }
    )


def command_smoke_test_upscale(args: argparse.Namespace) -> int:
    result = run_realesrgan_smoke_test(args.model)
    return emit(result, 0 if result.get("ok") else 1)


def _run_image_command(operation, *, success_message: str, extra: dict[str, Any] | None = None) -> int:
    try:
        result = operation()
        payload = {
            "ok": True,
            "status": "completed",
            "output": str(result.output_path),
            "mimeType": result.mime_type,
            "width": result.width,
            "height": result.height,
            "message": success_message,
        }
        if extra:
            payload.update(extra)
        return emit(payload)
    except SidecarError as exc:
        return emit(
            {
                "ok": False,
                "status": exc.status,
                "engine": "python_sidecar",
                "message": str(exc),
            },
            1,
        )
    except Exception as exc:
        return emit(
            {
                "ok": False,
                "status": "failed",
                "engine": "python_sidecar",
                "message": f"Unexpected sidecar error: {exc}",
            },
            1,
        )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="asteria_sidecar.py")
    subcommands = parser.add_subparsers(dest="command", required=True)

    subcommands.add_parser("health").set_defaults(handler=command_health)
    subcommands.add_parser("capabilities").set_defaults(handler=command_capabilities)
    subcommands.add_parser("models").set_defaults(handler=command_models)
    subcommands.add_parser("validate-models").set_defaults(handler=command_validate_models)

    remove_bg = subcommands.add_parser("remove-bg")
    remove_bg.add_argument("--input", required=True)
    remove_bg.add_argument("--output", required=True)
    remove_bg.set_defaults(handler=command_remove_bg)

    enhance = subcommands.add_parser("enhance")
    enhance.add_argument("--input", required=True)
    enhance.add_argument("--output", required=True)
    enhance.add_argument("--brightness", type=float, default=1.04)
    enhance.add_argument("--contrast", type=float, default=1.12)
    enhance.add_argument("--saturation", type=float, default=1.08)
    enhance.add_argument("--sharpness", type=float, default=1.18)
    enhance.set_defaults(handler=command_enhance)

    resize = subcommands.add_parser("resize")
    resize.add_argument("--input", required=True)
    resize.add_argument("--output", required=True)
    resize.add_argument("--width", type=int)
    resize.add_argument("--height", type=int)
    resize.set_defaults(handler=command_resize)

    convert = subcommands.add_parser("convert")
    convert.add_argument("--input", required=True)
    convert.add_argument("--output", required=True)
    convert.add_argument("--format", required=True, choices=["png", "jpeg", "jpg", "webp"])
    convert.set_defaults(handler=command_convert)

    upscale = subcommands.add_parser("upscale")
    upscale.add_argument("--input", required=True)
    upscale.add_argument("--output", required=True)
    upscale.add_argument("--scale", type=int, default=2, choices=[2, 3, 4])
    upscale.add_argument("--engine", default="auto", choices=["auto", "pillow", "real-esrgan"])
    upscale.add_argument("--quality", default="balanced", choices=["fast", "balanced", "quality", "max"])
    upscale.add_argument("--tile-size", type=int, choices=[64, 128, 192, 256])
    upscale.add_argument("--tile-pad", type=int, choices=[4, 8, 12, 16])
    upscale.add_argument("--model")
    upscale.set_defaults(handler=command_upscale)

    smoke = subcommands.add_parser("smoke-test-upscale")
    smoke.add_argument("--model", required=True)
    smoke.set_defaults(handler=command_smoke_test_upscale)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.handler(args)


if __name__ == "__main__":
    raise SystemExit(main())

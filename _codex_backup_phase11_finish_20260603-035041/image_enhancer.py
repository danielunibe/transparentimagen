#!/usr/bin/env python3
"""Compatibility CLI for the modular Image Enhancer app."""

from __future__ import annotations

import argparse

from main import main as run_app
from models import MODEL_KEYS
from pipeline import (
    run_color_restore_smoke,
    run_codeformer_smoke,
    run_comfyui_smoke,
    run_cuda_smoke,
    run_module_smoke,
    run_modules_smoke,
    run_portrait_smoke,
    run_realesrgan_smoke,
    run_rembg_smoke,
    run_segmentation_compare_smoke,
    run_smoke,
    run_ue5_candidates_smoke,
    run_ue5_texture_set_smoke,
)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Image Enhancer - Unova Games Studio")
    parser.add_argument("--smoke", action="store_true", help="Run headless runtime validation.")
    parser.add_argument(
        "--smoke-rembg",
        action="store_true",
        help="Run a real rembg model/session validation. May download the model on first use.",
    )
    parser.add_argument(
        "--smoke-realesrgan",
        action="store_true",
        help="Run a real Real-ESRGAN ONNX validation. May download the model on first use.",
    )
    parser.add_argument(
        "--smoke-segmentation-compare",
        action="store_true",
        help="Run a real u2net vs BiRefNet comparison validation. May download models on first use.",
    )
    parser.add_argument(
        "--smoke-codeformer",
        action="store_true",
        help="Validate external CodeFormer integration via environment variables.",
    )
    parser.add_argument(
        "--smoke-portrait",
        action="store_true",
        help="Validate portrait phase fallbacks without adding PyTorch to the app runtime.",
    )
    parser.add_argument(
        "--smoke-color-restore",
        action="store_true",
        help="Validate local light/color restoration and optional ONNX candidate paths.",
    )
    parser.add_argument(
        "--smoke-ue5-texture-set",
        action="store_true",
        help="Validate UE5 Texture Set export with albedo.png and manifest fallback metadata.",
    )
    parser.add_argument(
        "--smoke-ue5-candidates",
        action="store_true",
        help="Validate optional ONNX candidate paths for UE5 depth/normal modules.",
    )
    parser.add_argument(
        "--smoke-cuda",
        action="store_true",
        help="Validate whether ONNX Runtime can activate CUDAExecutionProvider.",
    )
    parser.add_argument(
        "--smoke-comfyui",
        action="store_true",
        help="Validate optional ComfyUI local API and configured workflow JSON.",
    )
    parser.add_argument(
        "--smoke-modules",
        action="store_true",
        help="Validate the AI module registry without downloading every model.",
    )
    parser.add_argument(
        "--smoke-module",
        default="",
        help="Validate one registered AI module by id, for example ue5_depth.",
    )
    parser.add_argument(
        "--model",
        default="silueta",
        choices=MODEL_KEYS,
        help="Model used by --smoke-rembg.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.smoke:
        return run_smoke()
    if args.smoke_rembg:
        return run_rembg_smoke(args.model)
    if args.smoke_realesrgan:
        return run_realesrgan_smoke()
    if args.smoke_segmentation_compare:
        return run_segmentation_compare_smoke()
    if args.smoke_codeformer:
        return run_codeformer_smoke()
    if args.smoke_portrait:
        return run_portrait_smoke()
    if args.smoke_color_restore:
        return run_color_restore_smoke()
    if args.smoke_ue5_texture_set:
        return run_ue5_texture_set_smoke()
    if args.smoke_ue5_candidates:
        return run_ue5_candidates_smoke()
    if args.smoke_cuda:
        return run_cuda_smoke()
    if args.smoke_comfyui:
        return run_comfyui_smoke()
    if args.smoke_modules:
        return run_modules_smoke()
    if args.smoke_module:
        return run_module_smoke(args.smoke_module)
    return run_app()


if __name__ == "__main__":
    raise SystemExit(main())

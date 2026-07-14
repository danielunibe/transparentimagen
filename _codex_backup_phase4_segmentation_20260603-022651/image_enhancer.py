#!/usr/bin/env python3
"""Compatibility CLI for the modular Image Enhancer app."""

from __future__ import annotations

import argparse

from main import main as run_app
from models import MODEL_KEYS
from pipeline import (
    run_codeformer_smoke,
    run_module_smoke,
    run_modules_smoke,
    run_realesrgan_smoke,
    run_rembg_smoke,
    run_smoke,
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
        "--smoke-codeformer",
        action="store_true",
        help="Validate external CodeFormer integration via environment variables.",
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
    if args.smoke_codeformer:
        return run_codeformer_smoke()
    if args.smoke_modules:
        return run_modules_smoke()
    if args.smoke_module:
        return run_module_smoke(args.smoke_module)
    return run_app()


if __name__ == "__main__":
    raise SystemExit(main())

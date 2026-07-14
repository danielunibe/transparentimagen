from __future__ import annotations

import json
import os
import threading
import tkinter as tk
from pathlib import Path
from tkinter import filedialog, messagebox, simpledialog, ttk

from PIL import Image, ImageTk

from models import (
    DEFAULT_MODEL_INDEX,
    DEFAULT_MODEL_KEY,
    DEFAULT_UPSCALE_ENGINE,
    FAST_SEGMENTATION_MODEL,
    MODEL_BY_LABEL,
    MODEL_KEYS,
    MODEL_LABELS,
    MODEL_MANAGER,
    MODULE_REGISTRY,
    MODULE_STATE_ACTIVE,
    MODULE_STATE_ERROR,
    MODULE_STATE_FALLBACK,
    MODULE_STATE_NOT_INSTALLED,
    MODULE_STATE_READY,
    ORT_AVAILABLE,
    PREMIUM_SEGMENTATION_MODEL,
    REMBG_AVAILABLE,
    UPSCALE_ENGINE_BY_LABEL,
    UPSCALE_ENGINE_LABELS,
    UPSCALE_ENGINES,
)
from pipeline import (
    CODEFORMER_ENV_SCRIPT,
    BatchItemResult,
    BatchReport,
    CancellationToken,
    ProcessingCancelled,
    ProcessingOptions,
    ProcessingResult,
    SegmentationComparisonResult,
    adjust_alpha_edge,
    apply_alpha_brush,
    clean_alpha_artifacts,
    collect_basic_metrics,
    compare_segmentation_presets,
    composite_on_checkerboard,
    export_ue5_texture_set,
    export_current_result_with_profile,
    fit_into,
    make_checkerboard,
    make_split_preview,
    paste_brush_mask,
    process_image,
    record_processing_history,
    resize_restore_source,
    run_batch_folder,
    run_comfyui_external,
)
from storage import (
    delete_preset,
    export_profile_by_label,
    export_profile_labels,
    load_comfyui_settings,
    load_presets,
    load_recent_history,
    save_comfyui_settings,
    save_preset,
)

# UI constants
PREVIEW_W  = 355
PREVIEW_H  = 430
SINGLE_PREVIEW_W = 735
SINGLE_PREVIEW_H = 500
EDGE_EDITOR_W = 820
EDGE_EDITOR_H = 600
ACCENT     = "#7C6AFF"
ACCENT2    = "#5B4FCC"
BG         = "#111113"
PANEL      = "#1C1C20"
PANEL2     = "#232328"
BORDER     = "#2E2E35"
TEXT       = "#E2E2E8"
TEXT_DIM   = "#5A5A6A"
SUCCESS    = "#4ADE80"
WARNING    = "#FACC15"
ERROR      = "#F87171"
CTA        = "#FDE400"
CTA_HOVER  = "#DEC800"
CTA_TEXT   = "#201C00"
ACTION_BG  = "#353534"
ACTION_LOW = "#201F1F"
ACTION_BR  = "#4B4731"
SIDEBAR_BG = "#0E0E0E"
TOPBAR_BG  = "#151515"
CARD_BG    = "#202020"
FONT_UI = "Segoe UI"
FONT_UI_SYMBOL = "Segoe UI Symbol"

LUPA_MODES = [
    ("high_fidelity", "High Fidelity"),
    ("portrait", "Portrait"),
    ("game_asset", "Game Asset"),
    ("product", "Producto"),
    ("creative", "Creative"),
]
LUPA_MODE_LABELS = [label for _, label in LUPA_MODES]
LUPA_MODE_BY_LABEL = {label: key for key, label in LUPA_MODES}
DEFAULT_LUPA_MODE = "high_fidelity"

LUPA_MODE_PRESETS = {
    "high_fidelity": {
        "engine": "realesrgan",
        "model": "u2net",
        "factor": 4,
        "sharpness": 1.2,
        "contrast": 1.02,
        "despill": 0.50,
        "feather": 0.35,
        "cleanup": 0.15,
        "keep_main_object": False,
        "face_recovery": False,
        "face_strength": 0.55,
    },
    "portrait": {
        "engine": "realesrgan",
        "model": "birefnet-portrait",
        "factor": 4,
        "sharpness": 1.15,
        "contrast": 1.03,
        "despill": 0.40,
        "feather": 0.45,
        "cleanup": 0.10,
        "keep_main_object": False,
        "face_recovery": True,
        "face_strength": 0.72,
    },
    "game_asset": {
        "engine": "realesrgan",
        "model": "isnet-anime",
        "factor": 4,
        "sharpness": 1.45,
        "contrast": 1.06,
        "despill": 0.18,
        "feather": 0.18,
        "cleanup": 0.08,
        "keep_main_object": True,
        "face_recovery": False,
        "face_strength": 0.55,
    },
    "product": {
        "engine": "realesrgan",
        "model": "birefnet-hrsod",
        "factor": 4,
        "sharpness": 1.25,
        "contrast": 1.04,
        "despill": 0.58,
        "feather": 0.28,
        "cleanup": 0.12,
        "keep_main_object": True,
        "face_recovery": False,
        "face_strength": 0.55,
    },
    "creative": {
        "engine": "realesrgan",
        "model": "isnet-anime",
        "factor": 4,
        "sharpness": 1.65,
        "contrast": 1.10,
        "despill": 0.22,
        "feather": 0.20,
        "cleanup": 0.08,
        "keep_main_object": False,
        "face_recovery": False,
        "face_strength": 0.55,
    },
}

class ImageEnhancerApp:

    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Image Enhancer — Unova")
        self.root.configure(bg=BG)
        self.root.resizable(True, True)
        self.root.option_add("*Font", f"{FONT_UI} 9")

        # Estado
        self.input_image:  Image.Image | None = None
        self.output_image: Image.Image | None = None
        self.input_path:   Path | None        = None
        self._processing   = False
        self._current_token: CancellationToken | None = None
        self._pending_render_mode: str | None = None
        self._active_render_mode: str = "final"
        self.view_mode     = tk.StringVar(value="compare")
        self._view_btns: dict[str, tk.Button] = {}
        self._action_chips: dict[str, tk.Label] = {}
        self._module_status_labels: dict[str, tk.Label] = {}
        self._segmentation_compare_btn: tk.Button | None = None
        self._last_segmentation_comparison: SegmentationComparisonResult | None = None
        self._quality_metric_labels: dict[str, tk.Label] = {}
        self._last_metrics: dict[str, str] = {}
        self.ue5_export_btn: tk.Button | None = None
        self.comfy_btn: tk.Button | None = None
        self.batch_run_btn: tk.Button | None = None
        self.batch_cancel_btn: tk.Button | None = None
        self.export_profile_btn: tk.Button | None = None
        self._last_processing_result: ProcessingResult | None = None
        self._last_batch_report: BatchReport | None = None
        self._batch_input_dir: Path | None = None
        self._batch_output_dir: Path | None = None
        self._saved_presets: dict[str, dict] = {}
        self._history_listbox: tk.Listbox | None = None
        self._history_summary_lbl: tk.Label | None = None
        self._comfy_status_lbl: tk.Label | None = None

        self._configure_ttk_styles()
        self._build_ui()
        self.root.minsize(1220, 760)
        self._center_window(1340, 820)
        self._apply_mode_preset(DEFAULT_LUPA_MODE, force=True)
        self._load_saved_presets_into_ui()
        self._load_comfyui_settings_into_ui()
        self._refresh_history_panel()

    # ── Layout ────────────────────────────────────────────────────────────

    def _configure_ttk_styles(self):
        style = ttk.Style(self.root)
        for theme in ("vista", "xpnative", "winnative", "clam"):
            try:
                style.theme_use(theme)
                break
            except tk.TclError:
                continue

        style.configure("TCombobox", padding=5)
        style.configure("TScrollbar", arrowsize=12)
        style.configure("TProgressbar", thickness=8)

    def _build_ui(self):
        # ─ Top app bar ───────────────────────────────────────────────────
        topbar = tk.Frame(self.root, bg=BG, height=64)
        topbar.pack(fill="x")
        topbar.pack_propagate(False)

        brand = tk.Frame(topbar, bg=BG)
        brand.pack(side="left", padx=24, fill="y")
        tk.Label(
            brand, text="LupaAI",
            font=(FONT_UI, 18, "bold"), fg=TEXT, bg=BG
        ).pack(side="left")
        tk.Label(
            brand, text="  Image Studio",
            font=(FONT_UI, 10), fg=TEXT_DIM, bg=BG
        ).pack(side="left", padx=(8, 0))

        nav = tk.Frame(topbar, bg=BG)
        nav.pack(side="left", padx=(18, 0))
        for label in ("Enhance", "Create", "Portrait", "Assets"):
            tk.Label(
                nav,
                text=label,
                font=(FONT_UI, 10),
                fg=TEXT if label == "Enhance" else TEXT_DIM,
                bg=BG,
                padx=10,
            ).pack(side="left")

        top_status = tk.Frame(topbar, bg=BG)
        top_status.pack(side="right", padx=24)
        tk.Button(
            top_status,
            text="Pricing",
            bg=PANEL,
            fg=TEXT,
            activebackground=PANEL2,
            activeforeground=TEXT,
            font=(FONT_UI, 9),
            relief="flat",
            cursor="hand2",
            padx=12,
            pady=6,
        ).pack(side="left", padx=(0, 10))
        self._top_chip(top_status, "local AI", SUCCESS)
        self._top_chip(top_status, MODEL_MANAGER.runtime_label(), MODEL_MANAGER.runtime_color())

        tk.Frame(self.root, bg=BORDER, height=1).pack(fill="x")

        # ─ Shell principal ───────────────────────────────────────────────
        shell = tk.Frame(self.root, bg=BG)
        shell.pack(fill="both", expand=True)

        sidebar = tk.Frame(shell, bg=SIDEBAR_BG, width=240, padx=16, pady=18)
        sidebar.pack(side="left", fill="y")
        sidebar.pack_propagate(False)
        self._build_sidebar(sidebar)

        workspace = tk.Frame(shell, bg=BG)
        workspace.pack(side="left", fill="both", expand=True)

        body = tk.Frame(workspace, bg=BG)
        body.pack(fill="both", expand=True, padx=24, pady=18)

        preview = tk.Frame(body, bg=BG)
        preview.pack(side="left", fill="both", expand=True)

        inspector = tk.Frame(body, bg=PANEL, width=332, highlightthickness=1, highlightbackground=BORDER)
        inspector.pack(side="right", fill="y", padx=(12, 0))
        inspector.pack_propagate(False)

        controls = self._make_scrollable_panel(inspector)
        self._build_left_panel(controls)

        self._build_preview_panel(preview)

        # ─ Status bar ─────────────────────────────────────────────────────
        tk.Frame(self.root, bg=BORDER, height=1).pack(fill="x")

        status_bar = tk.Frame(self.root, bg=PANEL, pady=7)
        status_bar.pack(fill="x")

        self.status_lbl = tk.Label(
            status_bar, text="● Listo para comenzar",
            font=(FONT_UI, 9), fg=TEXT_DIM, bg=PANEL)
        self.status_lbl.pack(side="left", padx=18)

        self.progress = ttk.Progressbar(status_bar, mode="indeterminate", length=140)
        self.progress.pack(side="right", padx=18)

    def _top_chip(self, parent, text: str, color: str):
        chip = tk.Label(
            parent,
            text=text,
            bg=CARD_BG,
            fg=color,
            font=(FONT_UI, 9, "bold"),
            padx=10,
            pady=5,
            highlightthickness=1,
            highlightbackground=BORDER,
        )
        chip.pack(side="left", padx=(6, 0))

    def _build_sidebar(self, parent):
        logo = tk.Frame(parent, bg=PANEL, height=66, highlightthickness=1, highlightbackground=BORDER)
        logo.pack(fill="x", pady=(0, 18))
        logo.pack_propagate(False)
        tk.Label(
            logo, text="◎",
            font=(FONT_UI_SYMBOL, 18, "bold"), fg=TEXT, bg=PANEL,
            width=3
        ).pack(side="left", padx=(10, 4))
        brand = tk.Frame(logo, bg=PANEL)
        brand.pack(side="left", fill="both", expand=True)
        tk.Label(
            brand, text="Creative Workspace",
            font=(FONT_UI, 10, "bold"), fg=TEXT, bg=PANEL,
            anchor="w"
        ).pack(fill="x", pady=(12, 0))
        tk.Label(
            brand, text="Lupa local",
            font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL,
            anchor="w"
        ).pack(fill="x")

        tk.Label(
            parent, text="MODES",
            font=(FONT_UI, 8, "bold"), fg=TEXT_DIM, bg=SIDEBAR_BG
        ).pack(anchor="w", pady=(2, 10))
        for active, label, note in (
            (True, "Enhance", "upscale + cleanup"),
            (False, "Portrait", "face recovery"),
            (False, "Creative", "stylized output"),
            (False, "Assets", "game/product"),
        ):
            self._sidebar_step(parent, active, label, note)

        tk.Frame(parent, bg=SIDEBAR_BG).pack(fill="both", expand=True)

        cta = tk.Button(
            parent,
            text="Open Prompt Presets",
            bg=PANEL,
            fg=TEXT,
            activebackground=PANEL2,
            activeforeground=TEXT,
            font=(FONT_UI, 9),
            relief="flat",
            cursor="hand2",
            padx=10,
            pady=9,
        )
        cta.pack(fill="x", pady=(0, 10))

        stats = tk.Frame(parent, bg=PANEL, padx=12, pady=12, highlightthickness=1, highlightbackground=BORDER)
        stats.pack(fill="x")
        tk.Label(
            stats, text="RUNTIME",
            font=(FONT_UI, 8, "bold"), fg=TEXT_DIM, bg=PANEL
        ).pack(anchor="w", pady=(0, 8))
        self._runtime_row(stats, "rembg", "OK" if REMBG_AVAILABLE else "Falta", SUCCESS if REMBG_AVAILABLE else WARNING)
        self._runtime_row(stats, "onnx", MODEL_MANAGER.runtime_label(), MODEL_MANAGER.runtime_color())
        self._runtime_row(stats, "focus", "prompt-first", CTA)

    def _sidebar_step(self, parent, active: bool, label: str, note: str):
        row = tk.Frame(parent, bg=PANEL if active else SIDEBAR_BG, padx=10, pady=9,
                       highlightthickness=1 if active else 0, highlightbackground=BORDER)
        row.pack(fill="x", pady=(0, 4))
        tk.Label(
            row, text="●" if active else "○",
            font=(FONT_UI_SYMBOL, 10, "bold"), fg=CTA if active else TEXT_DIM,
            bg=PANEL if active else SIDEBAR_BG, width=2, anchor="w"
        ).pack(side="left")
        text = tk.Frame(row, bg=PANEL if active else SIDEBAR_BG)
        text.pack(side="left", fill="x", expand=True)
        tk.Label(
            text, text=label,
            font=(FONT_UI, 10, "bold"), fg=TEXT, bg=PANEL if active else SIDEBAR_BG,
            anchor="w"
        ).pack(fill="x")
        tk.Label(
            text, text=note,
            font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL if active else SIDEBAR_BG,
            anchor="w"
        ).pack(fill="x")

    def _runtime_row(self, parent, label: str, value: str, color: str):
        row = tk.Frame(parent, bg=PANEL)
        row.pack(fill="x", pady=(0, 4))
        tk.Label(row, text=label, font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(side="left")
        tk.Label(row, text=value, font=(FONT_UI, 8, "bold"), fg=color, bg=PANEL).pack(side="right")

    def _make_scrollable_panel(self, parent):
        canvas = tk.Canvas(parent, bg=PANEL, bd=0, highlightthickness=0)
        scrollbar = ttk.Scrollbar(parent, orient="vertical", command=canvas.yview)
        inner = tk.Frame(canvas, bg=PANEL, padx=18, pady=18)
        inner_id = canvas.create_window((0, 0), window=inner, anchor="nw")

        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        inner.bind(
            "<Configure>",
            lambda _event: canvas.configure(scrollregion=canvas.bbox("all")),
        )
        canvas.bind(
            "<Configure>",
            lambda event: canvas.itemconfigure(inner_id, width=event.width),
        )

        def _wheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")

        canvas.bind("<Enter>", lambda _event: canvas.bind_all("<MouseWheel>", _wheel))
        canvas.bind("<Leave>", lambda _event: canvas.unbind_all("<MouseWheel>"))
        return inner

    def _build_left_panel(self, parent):
        # ─ Sección: Cargar ────────────────────────────────────────────────
        self._section_label(parent, "IMAGEN")

        self.load_btn = tk.Button(
            parent, text="+  Add source image",
            command=self._load_image,
            bg=ACTION_LOW, fg=TEXT,
            font=(FONT_UI, 9, "bold"),
            relief="flat", cursor="hand2",
            padx=10, pady=8, anchor="w")
        self.load_btn.pack(fill="x", pady=(0, 4))

        self.file_lbl = tk.Label(
            parent, text="Drop or choose a source image to begin the enhancement flow.",
            font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL,
            anchor="w", wraplength=260, justify="left")
        self.file_lbl.pack(fill="x", pady=(0, 14))

        # ─ Sección: Operaciones ───────────────────────────────────────────
        self._section_label(parent, "ENHANCEMENT STACK")

        # Remover fondo
        self.do_rembg = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Background removal / transparency",
            variable=self.do_rembg,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 9),
            cursor="hand2").pack(anchor="w")

        mdl_row = tk.Frame(parent, bg=PANEL)
        mdl_row.pack(fill="x", pady=(3, 10))
        tk.Label(mdl_row, text="  Modelo :", font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(side="left")
        self.model_var = tk.StringVar(value=MODEL_LABELS[DEFAULT_MODEL_INDEX])
        self.model_cb  = ttk.Combobox(mdl_row, textvariable=self.model_var,
                                       values=MODEL_LABELS, width=27,
                                       font=(FONT_UI, 8), state="readonly")
        self.model_cb.pack(side="left", padx=4)
        self.model_cb.current(DEFAULT_MODEL_INDEX)
        self.model_cb.bind("<<ComboboxSelected>>", self._on_model_change)

        self.do_alpha_matting = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Borde IA fino (alpha matting)",
            variable=self.do_alpha_matting,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 8),
            cursor="hand2").pack(anchor="w")

        self.do_post_process = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Postprocesar mascara",
            variable=self.do_post_process,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 8),
            cursor="hand2").pack(anchor="w")

        self.do_cleanup = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Limpiar objetos/restos sueltos",
            variable=self.do_cleanup,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 8),
            cursor="hand2").pack(anchor="w")

        self.keep_main_object = tk.BooleanVar(value=False)
        tk.Checkbutton(
            parent, text="Mantener solo objeto principal",
            variable=self.keep_main_object,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 8),
            cursor="hand2").pack(anchor="w", pady=(0, 4))

        tk.Label(parent, text="Limpieza minima de restos (%)",
                 font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.cleanup_var = tk.DoubleVar(value=0.15)
        tk.Scale(parent, from_=0.0, to=2.0, resolution=0.05,
                 orient="horizontal", variable=self.cleanup_var,
                 bg=PANEL, fg=TEXT, troughcolor=BORDER,
                 highlightthickness=0, font=(FONT_UI, 8),
                 length=260).pack(fill="x", pady=(0, 8))

        # ─ Sección: Bordes automaticos ───────────────────────────────────
        self._section_label(parent, "EDGE POLISH")

        self.do_despill = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Descontaminar borde (despill)",
            variable=self.do_despill,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 8),
            cursor="hand2").pack(anchor="w")

        tk.Label(parent, text="Fuerza despill",
                 font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.despill_var = tk.DoubleVar(value=0.55)
        tk.Scale(parent, from_=0.0, to=1.0, resolution=0.05,
                 orient="horizontal", variable=self.despill_var,
                 bg=PANEL, fg=TEXT, troughcolor=BORDER,
                 highlightthickness=0, font=(FONT_UI, 8),
                 length=260).pack(fill="x", pady=(0, 4))

        self.do_feather = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Suavizar alfa fino",
            variable=self.do_feather,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 8),
            cursor="hand2").pack(anchor="w")

        tk.Label(parent, text="Feather alfa (px)",
                 font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.feather_var = tk.DoubleVar(value=0.45)
        tk.Scale(parent, from_=0.0, to=2.5, resolution=0.05,
                 orient="horizontal", variable=self.feather_var,
                 bg=PANEL, fg=TEXT, troughcolor=BORDER,
                 highlightthickness=0, font=(FONT_UI, 8),
                 length=260).pack(fill="x", pady=(0, 8))

        # Upscale
        self.do_upscale = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Mejorar calidad (upscale)",
            variable=self.do_upscale,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 9),
            cursor="hand2").pack(anchor="w")

        mode_row = tk.Frame(parent, bg=PANEL)
        mode_row.pack(fill="x", pady=(3, 4))
        tk.Label(mode_row, text="  Modo   :", font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(side="left")
        self.lupa_mode_var = tk.StringVar(value=LUPA_MODE_LABELS[0])
        self.lupa_mode_cb = ttk.Combobox(
            mode_row,
            textvariable=self.lupa_mode_var,
            values=LUPA_MODE_LABELS,
            width=18,
            font=(FONT_UI, 8),
            state="readonly",
        )
        self.lupa_mode_cb.pack(side="left", padx=4)
        self.lupa_mode_cb.current(0)
        self.lupa_mode_cb.bind("<<ComboboxSelected>>", self._on_lupa_mode_change)

        engine_row = tk.Frame(parent, bg=PANEL)
        engine_row.pack(fill="x", pady=(3, 4))
        tk.Label(engine_row, text="  Motor  :", font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(side="left")
        default_engine_label = next(label for key, label in UPSCALE_ENGINES if key == DEFAULT_UPSCALE_ENGINE)
        self.upscale_engine_var = tk.StringVar(value=default_engine_label)
        self.upscale_engine_cb = ttk.Combobox(
            engine_row,
            textvariable=self.upscale_engine_var,
            values=UPSCALE_ENGINE_LABELS,
            width=18,
            font=(FONT_UI, 8),
            state="readonly",
        )
        self.upscale_engine_cb.pack(side="left", padx=4)
        self.upscale_engine_cb.current(UPSCALE_ENGINE_LABELS.index(default_engine_label))
        self.upscale_engine_cb.bind("<<ComboboxSelected>>", lambda _event: self._refresh_action_chips())

        factor_row = tk.Frame(parent, bg=PANEL)
        factor_row.pack(fill="x", pady=(0, 10))
        tk.Label(factor_row, text="  Factor :", font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(side="left")

        self.factor_var  = tk.IntVar(value=2)
        self._factor_btns: dict[int, tk.Button] = {}
        for f in (2, 3, 4):
            btn = tk.Button(
                factor_row, text=f"{f}×",
                command=lambda v=f: self._set_factor(v),
                bg=CTA if f == 2 else PANEL2,
                fg=CTA_TEXT if f == 2 else TEXT_DIM,
                font=(FONT_UI, 8, "bold"), relief="flat",
                padx=9, pady=2, cursor="hand2", width=3)
            btn.pack(side="left", padx=2)
            self._factor_btns[f] = btn

        # ─ Sección: Ajustes ───────────────────────────────────────────────
        self._section_label(parent, "TUNING")

        tk.Label(parent, text="Nitidez  (LANCZOS/post IA)",
                 font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.sharp_var = tk.DoubleVar(value=1.3)
        tk.Scale(parent, from_=1.0, to=3.0, resolution=0.1,
                 orient="horizontal", variable=self.sharp_var,
                 bg=PANEL, fg=TEXT, troughcolor=BORDER,
                 highlightthickness=0, font=(FONT_UI, 8),
                 length=225).pack(fill="x")

        tk.Label(parent, text="Contraste  (post-upscale)",
                 font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w", pady=(6, 0))
        self.contrast_var = tk.DoubleVar(value=1.05)
        tk.Scale(parent, from_=1.0, to=1.8, resolution=0.05,
                 orient="horizontal", variable=self.contrast_var,
                 bg=PANEL, fg=TEXT, troughcolor=BORDER,
                 highlightthickness=0, font=(FONT_UI, 8),
                 length=225).pack(fill="x", pady=(0, 10))

        self._section_label(parent, "PORTRAIT RECOVERY")
        self.do_face_recovery = tk.BooleanVar(value=False)
        tk.Checkbutton(
            parent, text="Aplicar face recovery en retratos",
            variable=self.do_face_recovery,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=(FONT_UI, 8),
            cursor="hand2").pack(anchor="w")

        tk.Label(parent, text="Fuerza rostro (mezcla face recovery)",
                 font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.face_strength_var = tk.DoubleVar(value=0.72)
        tk.Scale(parent, from_=0.0, to=1.0, resolution=0.05,
                 orient="horizontal", variable=self.face_strength_var,
                 bg=PANEL, fg=TEXT, troughcolor=BORDER,
                 highlightthickness=0, font=(FONT_UI, 8),
                 length=225).pack(fill="x")
        tk.Label(
            parent,
            text=(
                "Usa CodeFormer o GFPGAN como backend externo. "
                f"Configura {CODEFORMER_ENV_SCRIPT} o IMAGE_ENHANCER_GFPGAN_SCRIPT."
            ),
            font=(FONT_UI, 8),
            fg=TEXT_DIM,
            bg=PANEL,
            wraplength=250,
            justify="left",
        ).pack(anchor="w", pady=(4, 8))

        self._build_quality_panel(parent)
        self._build_module_panel(parent)
        self._build_production_panel(parent)
        self._build_comfyui_panel(parent)
        self._build_history_panel(parent)

    def _build_quality_panel(self, parent):
        self._section_label(parent, "CALIDAD")
        for key, label in (
            ("size", "Salida"),
            ("scale", "Escala"),
            ("score", "Score"),
            ("alpha_visible", "Alfa visible"),
            ("alpha_soft", "Alfa suave"),
            ("warnings", "Warnings"),
            ("provider", "Runtime"),
        ):
            self._make_quality_row(parent, key, label)

    def _make_quality_row(self, parent, key: str, label: str):
        row = tk.Frame(parent, bg=PANEL)
        row.pack(fill="x", pady=(0, 4))
        tk.Label(
            row,
            text=label,
            font=(FONT_UI, 7, "bold"),
            fg=TEXT_DIM,
            bg=PANEL,
            width=12,
            anchor="w",
        ).pack(side="left")
        value = tk.Label(
            row,
            text="—",
            font=(FONT_UI, 7, "bold"),
            fg=TEXT,
            bg=ACTION_LOW,
            padx=6,
            pady=2,
            anchor="e",
        )
        value.pack(side="right", fill="x", expand=True)
        self._quality_metric_labels[key] = value

    def _refresh_quality_panel(self, metrics: dict[str, str] | None = None):
        metrics = metrics or {}
        for key, label in self._quality_metric_labels.items():
            label.configure(text=metrics.get(key, "—"))

    def _build_module_panel(self, parent):
        self._section_label(parent, "MODULOS IA")
        tk.Label(
            parent,
            text="Activa capas locales por familia. Los modulos futuros quedan registrados sin descargar modelos pesados.",
            font=(FONT_UI, 8),
            fg=TEXT_DIM,
            bg=PANEL,
            wraplength=250,
            justify="left",
        ).pack(anchor="w", pady=(0, 8))

        for spec in MODULE_REGISTRY.all_specs():
            card = tk.Frame(parent, bg=CARD_BG, padx=9, pady=8, highlightthickness=1, highlightbackground=BORDER)
            card.pack(fill="x", pady=(0, 7))

            head = tk.Frame(card, bg=CARD_BG)
            head.pack(fill="x")
            tk.Label(
                head,
                text=spec.name,
                font=(FONT_UI, 8, "bold"),
                fg=TEXT,
                bg=CARD_BG,
                anchor="w",
            ).pack(side="left", fill="x", expand=True)
            status = MODULE_REGISTRY.status(spec.id)
            status_lbl = tk.Label(
                head,
                text=status,
                font=(FONT_UI, 7, "bold"),
                fg=self._module_status_color(status),
                bg=ACTION_LOW,
                padx=6,
                pady=2,
            )
            status_lbl.pack(side="right")
            self._module_status_labels[spec.id] = status_lbl

            tk.Label(
                card,
                text=f"{spec.family} · {spec.description}",
                font=(FONT_UI, 7),
                fg=TEXT_DIM,
                bg=CARD_BG,
                wraplength=245,
                justify="left",
                anchor="w",
            ).pack(fill="x", pady=(5, 6))

            actions = tk.Frame(card, bg=CARD_BG)
            actions.pack(fill="x")
            for text, command in (
                ("Activar", lambda mid=spec.id: self._activate_module(mid)),
                ("Desactivar", lambda mid=spec.id: self._deactivate_module(mid)),
                ("Validar", lambda mid=spec.id: self._validate_module(mid)),
            ):
                tk.Button(
                    actions,
                    text=text,
                    command=command,
                    bg=ACTION_LOW,
                    fg=TEXT,
                    activebackground=PANEL2,
                    activeforeground=TEXT,
                    font=(FONT_UI, 7, "bold"),
                    relief="flat",
                    cursor="hand2",
                    padx=7,
                    pady=3,
                ).pack(side="left", padx=(0, 4))

            if spec.id == "segmentation_birefnet":
                self._build_segmentation_module_tools(card)

    def _build_segmentation_module_tools(self, parent):
        lab = tk.Frame(parent, bg=ACTION_LOW, padx=8, pady=7, highlightthickness=1, highlightbackground=ACTION_BR)
        lab.pack(fill="x", pady=(8, 0))
        tk.Label(
            lab,
            text=f"Rapido: {FAST_SEGMENTATION_MODEL}  |  Premium: {PREMIUM_SEGMENTATION_MODEL}",
            font=(FONT_UI, 7, "bold"),
            fg=TEXT,
            bg=ACTION_LOW,
            anchor="w",
        ).pack(fill="x")
        tk.Label(
            lab,
            text="Usa premium para cabello, transparencias finas, producto con borde dificil o sujeto complejo.",
            font=(FONT_UI, 7),
            fg=TEXT_DIM,
            bg=ACTION_LOW,
            wraplength=230,
            justify="left",
            anchor="w",
        ).pack(fill="x", pady=(3, 6))
        self._segmentation_compare_btn = tk.Button(
            lab,
            text="Comparar u2net / BiRefNet",
            command=self._start_segmentation_comparison,
            bg=CTA,
            fg=CTA_TEXT,
            activebackground=CTA_HOVER,
            activeforeground=CTA_TEXT,
            font=(FONT_UI, 7, "bold"),
            relief="flat",
            cursor="hand2",
            padx=7,
            pady=4,
        )
        self._segmentation_compare_btn.pack(fill="x")
        tk.Label(
            lab,
            text="Seleccion por objeto: Sujeto principal ahora. Cajas/SAM quedan preparadas para fase futura.",
            font=(FONT_UI, 7),
            fg=WARNING,
            bg=ACTION_LOW,
            wraplength=230,
            justify="left",
            anchor="w",
        ).pack(fill="x", pady=(6, 0))

    def _module_status_color(self, status: str) -> str:
        if status == MODULE_STATE_ACTIVE:
            return CTA
        if status == MODULE_STATE_READY:
            return SUCCESS
        if status == MODULE_STATE_FALLBACK:
            return WARNING
        if status == MODULE_STATE_ERROR:
            return ERROR
        return TEXT_DIM

    def _refresh_module_cards(self):
        for module_id, label in self._module_status_labels.items():
            status = MODULE_REGISTRY.status(module_id)
            label.configure(text=status, fg=self._module_status_color(status))

    def _activate_module(self, module_id: str):
        state = MODULE_REGISTRY.activate(module_id)
        spec = MODULE_REGISTRY.get(module_id)
        if module_id == "segmentation_birefnet" and state in (MODULE_STATE_ACTIVE, MODULE_STATE_FALLBACK):
            self.do_rembg.set(True)
            self._set_segmentation_model(PREMIUM_SEGMENTATION_MODEL, activate_module=False)
        elif module_id == "upscale_realesrgan" and state in (MODULE_STATE_ACTIVE, MODULE_STATE_FALLBACK):
            self.do_upscale.set(True)
            label = next(label for key, label in UPSCALE_ENGINES if key == "realesrgan")
            self.upscale_engine_var.set(label)
        elif module_id == "portrait_codeformer":
            self.do_face_recovery.set(state == MODULE_STATE_ACTIVE)
            if state == MODULE_STATE_FALLBACK:
                messagebox.showinfo(
                    "CodeFormer en fallback",
                    "CodeFormer esta registrado, pero falta configurar IMAGE_ENHANCER_CODEFORMER_SCRIPT.",
                )
        elif module_id == "portrait_gfpgan_external":
            self.do_face_recovery.set(state in (MODULE_STATE_ACTIVE, MODULE_STATE_FALLBACK))
            if state == MODULE_STATE_FALLBACK:
                messagebox.showinfo(
                    "GFPGAN en fallback",
                    "GFPGAN externo esta registrado, pero falta configurar IMAGE_ENHANCER_GFPGAN_SCRIPT.",
                )
        elif module_id == "portrait_face_detector":
            if state in (MODULE_STATE_ACTIVE, MODULE_STATE_FALLBACK):
                self.do_face_recovery.set(True)
            if state == MODULE_STATE_FALLBACK:
                messagebox.showinfo(
                    "Detector facial en fallback",
                    "No se pudo activar el detector local. CodeFormer usara la imagen completa si esta configurado.",
                )
        elif module_id == "color_local_restore":
            if state in (MODULE_STATE_ACTIVE, MODULE_STATE_FALLBACK):
                messagebox.showinfo(
                    "Luz/color local activo",
                    "La restauracion local de luz/color se aplicara en el siguiente render sin descargar modelos.",
                )
        elif spec and not spec.implemented:
            messagebox.showinfo(
                "Modulo registrado",
                f"{spec.name} queda registrado para el roadmap.\n\nFallback actual: {spec.fallback}",
            )
        self._refresh_action_chips()
        self._refresh_module_cards()
        self._set_status(f"Modulo {module_id}: {state}", self._module_status_color(state))

    def _deactivate_module(self, module_id: str):
        state = MODULE_REGISTRY.deactivate(module_id)
        if module_id == "segmentation_birefnet" and self._selected_model_key() == PREMIUM_SEGMENTATION_MODEL:
            self._set_segmentation_model(FAST_SEGMENTATION_MODEL, activate_module=False)
        if module_id in {"portrait_codeformer", "portrait_gfpgan_external"}:
            self.do_face_recovery.set(False)
        if module_id == "portrait_face_detector" and not (
            MODULE_REGISTRY.is_active("portrait_codeformer") or MODULE_REGISTRY.is_active("portrait_gfpgan_external")
        ):
            self.do_face_recovery.set(False)
        self._refresh_module_cards()
        self._set_status(f"Modulo {module_id}: {state}", self._module_status_color(state))

    def _validate_module(self, module_id: str):
        ok, msg = MODULE_REGISTRY.validate(module_id)
        self._refresh_module_cards()
        self._set_status(msg, SUCCESS if ok else ERROR)
        messagebox.showinfo("Validacion de modulo" if ok else "Modulo con error", msg)

    def _build_production_panel(self, parent):
        self._section_label(parent, "PRODUCCION")

        tk.Label(
            parent,
            text="Presets guardables, export profiles y batch por carpeta.",
            font=(FONT_UI, 8),
            fg=TEXT_DIM,
            bg=PANEL,
            wraplength=250,
            justify="left",
        ).pack(anchor="w", pady=(0, 8))

        tk.Label(parent, text="Preset guardado", font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.saved_preset_var = tk.StringVar(value="")
        self.saved_preset_cb = ttk.Combobox(parent, textvariable=self.saved_preset_var, values=[], state="readonly")
        self.saved_preset_cb.pack(fill="x", pady=(0, 6))

        preset_actions = tk.Frame(parent, bg=PANEL)
        preset_actions.pack(fill="x", pady=(0, 10))
        for text, command in (
            ("Aplicar", self._apply_saved_preset_from_ui),
            ("Guardar", self._save_current_preset),
            ("Borrar", self._delete_selected_preset),
        ):
            tk.Button(
                preset_actions,
                text=text,
                command=command,
                bg=ACTION_LOW,
                fg=TEXT,
                activebackground=PANEL2,
                activeforeground=TEXT,
                font=(FONT_UI, 7, "bold"),
                relief="flat",
                cursor="hand2",
                padx=7,
                pady=3,
            ).pack(side="left", padx=(0, 4))

        tk.Label(parent, text="Export profile", font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        profile_labels = export_profile_labels()
        self.export_profile_var = tk.StringVar(value=profile_labels[0] if profile_labels else "")
        self.export_profile_cb = ttk.Combobox(
            parent,
            textvariable=self.export_profile_var,
            values=profile_labels,
            state="readonly",
        )
        self.export_profile_cb.pack(fill="x", pady=(0, 6))

        folders = tk.Frame(parent, bg=PANEL)
        folders.pack(fill="x", pady=(0, 4))
        tk.Button(
            folders,
            text="Carpeta batch",
            command=self._select_batch_input_folder,
            bg=ACTION_LOW,
            fg=TEXT,
            font=(FONT_UI, 7, "bold"),
            relief="flat",
            cursor="hand2",
            padx=7,
            pady=3,
        ).pack(side="left", padx=(0, 4))
        tk.Button(
            folders,
            text="Salida batch",
            command=self._select_batch_output_folder,
            bg=ACTION_LOW,
            fg=TEXT,
            font=(FONT_UI, 7, "bold"),
            relief="flat",
            cursor="hand2",
            padx=7,
            pady=3,
        ).pack(side="left")

        self.batch_folder_lbl = tk.Label(
            parent,
            text="Entrada batch: sin carpeta seleccionada",
            font=(FONT_UI, 7),
            fg=TEXT_DIM,
            bg=PANEL,
            wraplength=250,
            justify="left",
        )
        self.batch_folder_lbl.pack(anchor="w")
        self.batch_output_lbl = tk.Label(
            parent,
            text="Salida batch: se crea junto al flujo o donde indiques",
            font=(FONT_UI, 7),
            fg=TEXT_DIM,
            bg=PANEL,
            wraplength=250,
            justify="left",
        )
        self.batch_output_lbl.pack(anchor="w", pady=(2, 6))

        batch_actions = tk.Frame(parent, bg=PANEL)
        batch_actions.pack(fill="x", pady=(0, 8))
        self.export_profile_btn = tk.Button(
            batch_actions,
            text="Export actual",
            command=self._export_current_with_profile,
            bg=ACTION_LOW,
            fg=TEXT,
            font=(FONT_UI, 7, "bold"),
            relief="flat",
            cursor="hand2",
            padx=7,
            pady=3,
            state="disabled",
        )
        self.export_profile_btn.pack(side="left", padx=(0, 4))
        self.batch_run_btn = tk.Button(
            batch_actions,
            text="Run batch",
            command=self._start_batch_folder,
            bg=ACTION_LOW,
            fg=TEXT,
            font=(FONT_UI, 7, "bold"),
            relief="flat",
            cursor="hand2",
            padx=7,
            pady=3,
        )
        self.batch_run_btn.pack(side="left", padx=(0, 4))
        self.batch_cancel_btn = tk.Button(
            batch_actions,
            text="Cancelar",
            command=self._cancel_current_work,
            bg=ACTION_LOW,
            fg=TEXT_DIM,
            font=(FONT_UI, 7, "bold"),
            relief="flat",
            cursor="hand2",
            padx=7,
            pady=3,
            state="disabled",
        )
        self.batch_cancel_btn.pack(side="left", padx=(0, 4))
        tk.Button(
            batch_actions,
            text="Abrir reporte",
            command=self._open_last_batch_report,
            bg=ACTION_LOW,
            fg=TEXT,
            font=(FONT_UI, 7, "bold"),
            relief="flat",
            cursor="hand2",
            padx=7,
            pady=3,
        ).pack(side="left")

    def _build_comfyui_panel(self, parent):
        self._section_label(parent, "COMFYUI")
        tk.Label(
            parent,
            text="Backend externo opcional. Usa workflow JSON con placeholders __COMFY_IMAGE__ y __OUTPUT_PREFIX__.",
            font=(FONT_UI, 8),
            fg=TEXT_DIM,
            bg=PANEL,
            wraplength=250,
            justify="left",
        ).pack(anchor="w", pady=(0, 8))

        self.comfy_enabled_var = tk.BooleanVar(value=False)
        tk.Checkbutton(
            parent,
            text="Habilitar backend ComfyUI",
            variable=self.comfy_enabled_var,
            bg=PANEL,
            fg=TEXT,
            activebackground=PANEL,
            selectcolor=PANEL2,
            font=(FONT_UI, 8),
            cursor="hand2",
            command=self._persist_comfyui_settings,
        ).pack(anchor="w")

        tk.Label(parent, text="Endpoint", font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.comfy_url_var = tk.StringVar(value="http://127.0.0.1:8188")
        self.comfy_url_entry = tk.Entry(parent, textvariable=self.comfy_url_var, bg=ACTION_LOW, fg=TEXT, relief="flat")
        self.comfy_url_entry.pack(fill="x", pady=(0, 4))

        tk.Label(parent, text="Workflow JSON", font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.comfy_workflow_var = tk.StringVar(value="")
        self.comfy_workflow_entry = tk.Entry(parent, textvariable=self.comfy_workflow_var, bg=ACTION_LOW, fg=TEXT, relief="flat")
        self.comfy_workflow_entry.pack(fill="x", pady=(0, 4))

        tk.Label(parent, text="Prompt", font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.comfy_prompt_var = tk.StringVar(value="")
        self.comfy_prompt_entry = tk.Entry(parent, textvariable=self.comfy_prompt_var, bg=ACTION_LOW, fg=TEXT, relief="flat")
        self.comfy_prompt_entry.pack(fill="x", pady=(0, 4))

        tk.Label(parent, text="Negative prompt", font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.comfy_negative_var = tk.StringVar(value="text, watermark, low quality")
        self.comfy_negative_entry = tk.Entry(parent, textvariable=self.comfy_negative_var, bg=ACTION_LOW, fg=TEXT, relief="flat")
        self.comfy_negative_entry.pack(fill="x", pady=(0, 4))

        tk.Label(parent, text="Reference image", font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.comfy_reference_var = tk.StringVar(value="")
        self.comfy_reference_entry = tk.Entry(parent, textvariable=self.comfy_reference_var, bg=ACTION_LOW, fg=TEXT, relief="flat")
        self.comfy_reference_entry.pack(fill="x", pady=(0, 4))

        tk.Label(parent, text="Control image", font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.comfy_control_var = tk.StringVar(value="")
        self.comfy_control_entry = tk.Entry(parent, textvariable=self.comfy_control_var, bg=ACTION_LOW, fg=TEXT, relief="flat")
        self.comfy_control_entry.pack(fill="x", pady=(0, 4))

        tk.Label(parent, text="Workflow params JSON", font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.comfy_params_text = tk.Text(
            parent,
            height=4,
            bg=ACTION_LOW,
            fg=TEXT,
            relief="flat",
            insertbackground=TEXT,
            font=(FONT_UI, 8),
        )
        self.comfy_params_text.pack(fill="x", pady=(0, 4))
        self.comfy_params_text.insert("1.0", "{\n  \"steps\": 20,\n  \"cfg\": 7,\n  \"denoise\": 0.45\n}")

        self.comfy_use_output_var = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent,
            text="Usar resultado actual como entrada si existe",
            variable=self.comfy_use_output_var,
            bg=PANEL,
            fg=TEXT,
            activebackground=PANEL,
            selectcolor=PANEL2,
            font=(FONT_UI, 8),
            cursor="hand2",
            command=self._persist_comfyui_settings,
        ).pack(anchor="w")

        comfy_actions = tk.Frame(parent, bg=PANEL)
        comfy_actions.pack(fill="x", pady=(6, 6))
        for text, command in (
            ("Workflow...", self._pick_comfyui_workflow),
            ("Ref...", self._pick_comfyui_reference),
            ("Control...", self._pick_comfyui_control),
            ("Plantillas", self._show_comfyui_templates),
            ("Guardar", self._persist_comfyui_settings),
            ("Smoke", self._validate_comfyui),
        ):
            tk.Button(
                comfy_actions,
                text=text,
                command=command,
                bg=ACTION_LOW,
                fg=TEXT,
                activebackground=PANEL2,
                activeforeground=TEXT,
                font=(FONT_UI, 7, "bold"),
                relief="flat",
                cursor="hand2",
                padx=7,
                pady=3,
            ).pack(side="left", padx=(0, 4))

        self._comfy_status_lbl = tk.Label(
            parent,
            text="ComfyUI: fallback local activo",
            font=(FONT_UI, 7),
            fg=TEXT_DIM,
            bg=PANEL,
            wraplength=250,
            justify="left",
        )
        self._comfy_status_lbl.pack(anchor="w")

    def _build_history_panel(self, parent):
        self._section_label(parent, "HISTORIAL")
        self._history_listbox = tk.Listbox(
            parent,
            height=6,
            bg=ACTION_LOW,
            fg=TEXT,
            highlightthickness=1,
            highlightbackground=BORDER,
            relief="flat",
        )
        self._history_listbox.pack(fill="x", pady=(0, 6))
        history_actions = tk.Frame(parent, bg=PANEL)
        history_actions.pack(fill="x", pady=(0, 4))
        tk.Button(
            history_actions,
            text="Refrescar",
            command=self._refresh_history_panel,
            bg=ACTION_LOW,
            fg=TEXT,
            font=(FONT_UI, 7, "bold"),
            relief="flat",
            cursor="hand2",
            padx=7,
            pady=3,
        ).pack(side="left", padx=(0, 4))
        self._history_summary_lbl = tk.Label(
            parent,
            text="Sin resultados recientes",
            font=(FONT_UI, 7),
            fg=TEXT_DIM,
            bg=PANEL,
            wraplength=250,
            justify="left",
        )
        self._history_summary_lbl.pack(anchor="w")

    def _build_preview_panel(self, parent):
        hero = tk.Frame(parent, bg=PANEL, padx=22, pady=18, highlightthickness=1, highlightbackground=BORDER)
        hero.pack(fill="x", pady=(0, 12))

        hero_head = tk.Frame(hero, bg=PANEL)
        hero_head.pack(fill="x")
        tk.Label(
            hero_head, text="Enhance images with local AI",
            font=(FONT_UI, 21, "bold"), fg=TEXT, bg=PANEL
        ).pack(anchor="w")
        tk.Label(
            hero_head,
            text="Upscale, clean edges, recover portraits and export final PNG assets with a LupaAI-inspired flow.",
            font=(FONT_UI, 10), fg=TEXT_DIM, bg=PANEL, wraplength=760, justify="left"
        ).pack(anchor="w", pady=(6, 0))

        highlight_row = tk.Frame(hero, bg=PANEL)
        highlight_row.pack(anchor="w", pady=(14, 0))
        for key, text in (("hero_mode", "High Fidelity"), ("hero_engine", "Real-ESRGAN IA"), ("hero_factor", "4x")):
            chip = tk.Label(
                highlight_row,
                text=text,
                bg=ACTION_LOW,
                fg=TEXT,
                font=(FONT_UI, 8, "bold"),
                padx=10,
                pady=6,
                highlightthickness=1,
                highlightbackground=ACTION_BR,
            )
            chip.pack(side="left", padx=(0, 8))
            self._action_chips[key] = chip

        action_bar = tk.Frame(parent, bg=PANEL, padx=18, pady=12, highlightthickness=1, highlightbackground=BORDER)
        action_bar.pack(fill="x", pady=(0, 12))

        title_box = tk.Frame(action_bar, bg=PANEL)
        title_box.pack(side="left")
        tk.Label(
            title_box, text="Preview Canvas",
            font=(FONT_UI, 16, "bold"), fg=TEXT, bg=PANEL
        ).pack(side="left")
        tk.Label(
            title_box, text="Before / After",
            font=(FONT_UI, 8, "bold"), fg=TEXT_DIM, bg=ACTION_LOW, padx=8, pady=4
        ).pack(side="left", padx=(10, 0))

        tools = tk.Frame(action_bar, bg=PANEL)
        tools.pack(side="right")
        for label in ("Open", "Reset"):
            tk.Button(
                tools,
                text=label,
                bg=ACTION_LOW,
                fg=TEXT,
                activebackground=PANEL2,
                activeforeground=TEXT,
                font=(FONT_UI, 9),
                relief="flat",
                cursor="hand2",
                padx=12,
                pady=6,
            ).pack(side="left", padx=(0, 8))
        tk.Button(
            tools,
            text="Export Final",
            bg=CTA,
            fg=CTA_TEXT,
            activebackground=CTA_HOVER,
            activeforeground=CTA_TEXT,
            font=(FONT_UI, 9, "bold"),
            relief="flat",
            cursor="hand2",
            padx=14,
            pady=6,
        ).pack(side="left")

        view_bar = tk.Frame(parent, bg=BG)
        view_bar.pack(fill="x", pady=(0, 8))

        tk.Label(view_bar, text="VISTA", font=(FONT_UI, 8, "bold"),
                 fg=TEXT_DIM, bg=BG).pack(side="left", padx=(0, 10))
        for key, label in (
            ("compare", "Comparar"),
            ("before", "Antes"),
            ("after", "Despues"),
            ("split", "Split A/B"),
        ):
            btn = tk.Button(
                view_bar, text=label,
                command=lambda v=key: self._set_view_mode(v),
                bg=CTA if key == "compare" else PANEL,
                fg=CTA_TEXT if key == "compare" else TEXT_DIM,
                font=(FONT_UI, 8, "bold"), relief="flat",
                cursor="hand2", padx=11, pady=5)
            btn.pack(side="left", padx=(0, 6))
            self._view_btns[key] = btn

        self.compare_frame = tk.Frame(parent, bg=BG)
        self.compare_frame.pack(fill="both", expand=True, pady=(0, 10))

        self.before_canvas, self.before_info = self._make_preview_block(
            self.compare_frame, "ORIGINAL", side="left", pad=(0, 6))

        self.after_canvas, self.after_info = self._make_preview_block(
            self.compare_frame, "RESULTADO", side="left", pad=(6, 0))

        self.single_frame = tk.Frame(parent, bg=PANEL, padx=10, pady=10, highlightthickness=1, highlightbackground=BORDER)
        self.single_title = tk.Label(
            self.single_frame, text="PREVIEW",
            font=(FONT_UI, 8, "bold"), fg=TEXT_DIM, bg=PANEL)
        self.single_title.pack(anchor="w")
        tk.Frame(self.single_frame, bg=BORDER, height=1).pack(fill="x", pady=(2, 6))

        self.single_canvas = tk.Canvas(
            self.single_frame, width=SINGLE_PREVIEW_W, height=SINGLE_PREVIEW_H,
            bg="#0D0D10", highlightthickness=1,
            highlightbackground=BORDER)
        self.single_canvas.pack(fill="both", expand=True)
        self.single_canvas.bind("<Configure>", lambda _event: self._render_previews())

        self.single_info = tk.Label(
            self.single_frame, text="—",
            font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL)
        self.single_info.pack(pady=(5, 0))

        self._build_action_bar(parent)

    def _build_action_bar(self, parent):
        wrap = tk.Frame(parent, bg=BG)
        wrap.pack(fill="x", pady=(6, 0))

        bar = tk.Frame(
            wrap,
            bg=ACTION_BG,
            padx=14,
            pady=10,
            highlightthickness=1,
            highlightbackground=ACTION_BR,
        )
        bar.pack(fill="x")

        load_btn = tk.Button(
            bar, text="+",
            command=self._load_image,
            bg=ACTION_LOW, fg=TEXT,
            activebackground=PANEL2, activeforeground=TEXT,
            font=(FONT_UI, 14, "bold"),
            relief="flat", cursor="hand2",
            width=3, padx=4, pady=8)
        load_btn.pack(side="left", padx=(0, 10))

        prompt_area = tk.Frame(bar, bg=ACTION_BG)
        prompt_area.pack(side="left", fill="x", expand=True, padx=(0, 10))
        self.action_file_lbl = tk.Label(
            prompt_area, text="Describe how you want to enhance this image...",
            bg=ACTION_BG, fg=TEXT_DIM,
            font=(FONT_UI, 12, "bold"),
            anchor="w")
        self.action_file_lbl.pack(anchor="w")

        chips = tk.Frame(prompt_area, bg=ACTION_BG)
        chips.pack(anchor="w", pady=(8, 0))
        self._make_action_chip(chips, "model", "Local subject")
        self._make_action_chip(chips, "mode", "High Fidelity")
        self._make_action_chip(chips, "engine", "Real-ESRGAN IA")
        self._make_action_chip(chips, "factor", "4x")

        self.refine_btn = tk.Button(
            bar, text="Refine Edge",
            command=self._open_edge_refiner,
            bg=ACTION_LOW, fg=TEXT_DIM,
            activebackground=PANEL2, activeforeground=TEXT,
            font=(FONT_UI, 8, "bold"), relief="flat",
            cursor="hand2", padx=10, pady=7,
            state="disabled")
        self.refine_btn.pack(side="left", padx=(0, 4))

        self.save_btn = tk.Button(
            bar, text="Save PNG",
            command=self._save_output,
            bg=ACTION_LOW, fg=TEXT_DIM,
            activebackground=PANEL2, activeforeground=TEXT,
            font=(FONT_UI, 8, "bold"), relief="flat",
            cursor="hand2", padx=10, pady=7,
            state="disabled")
        self.save_btn.pack(side="left", padx=4)

        self.ue5_export_btn = tk.Button(
            bar, text="UE5 Set",
            command=self._export_ue5_set,
            bg=ACTION_LOW, fg=TEXT_DIM,
            activebackground=PANEL2, activeforeground=TEXT,
            font=(FONT_UI, 8, "bold"), relief="flat",
            cursor="hand2", padx=10, pady=7,
            state="disabled")
        self.ue5_export_btn.pack(side="left", padx=4)

        self.comfy_btn = tk.Button(
            bar, text="ComfyUI",
            command=self._start_comfyui_render,
            bg=ACTION_LOW, fg=TEXT_DIM,
            activebackground=PANEL2, activeforeground=TEXT,
            font=(FONT_UI, 8, "bold"), relief="flat",
            cursor="hand2", padx=10, pady=7,
            state="disabled")
        self.comfy_btn.pack(side="left", padx=4)

        self.preview_btn = tk.Button(
            bar, text="Preview 25%",
            command=lambda: self._start_processing("preview"),
            bg=ACTION_LOW, fg=TEXT,
            activebackground=PANEL2, activeforeground=TEXT,
            font=(FONT_UI, 8, "bold"), relief="flat",
            cursor="hand2", padx=10, pady=7,
            state="normal")
        self.preview_btn.pack(side="right", padx=(8, 0))

        self.process_btn = tk.Button(
            bar, text="Generate",
            command=lambda: self._start_processing("final"),
            bg=CTA, fg=CTA_TEXT,
            activebackground=CTA_HOVER, activeforeground=CTA_TEXT,
            font=(FONT_UI, 11, "bold"),
            relief="flat", cursor="hand2",
            padx=18, pady=10,
            state="normal")
        self.process_btn.pack(side="right", padx=(12, 0))
        self._refresh_action_chips()

    def _make_action_chip(self, parent, key: str, text: str):
        chip = tk.Label(
            parent,
            text=text,
            bg=ACTION_LOW,
            fg=TEXT,
            font=(FONT_UI, 8, "bold"),
            padx=10,
            pady=5,
            highlightthickness=1,
            highlightbackground=ACTION_BR,
        )
        chip.pack(side="left", padx=(0, 6))
        self._action_chips[key] = chip

    def _make_preview_block(self, parent, title, side, pad):
        padx = pad
        frame = tk.Frame(parent, bg=PANEL, padx=12, pady=12, highlightthickness=1, highlightbackground=BORDER)
        frame.pack(side=side, fill="both", expand=True, padx=padx)

        tk.Label(frame, text=title, font=(FONT_UI, 8, "bold"),
                 fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        tk.Frame(frame, bg=BORDER, height=1).pack(fill="x", pady=(2, 6))

        canvas = tk.Canvas(
            frame, width=PREVIEW_W, height=PREVIEW_H,
            bg="#0D0D10", highlightthickness=1,
            highlightbackground=BORDER)
        canvas.pack(fill="both", expand=True)
        canvas.bind("<Configure>", lambda _event: self._render_previews())

        info = tk.Label(frame, text="—",
                        font=(FONT_UI, 8), fg=TEXT_DIM, bg=PANEL)
        info.pack(pady=(5, 0))

        return canvas, info

    def _load_saved_presets_into_ui(self):
        self._saved_presets = load_presets()
        names = sorted(self._saved_presets.keys())
        if hasattr(self, "saved_preset_cb"):
            self.saved_preset_cb.configure(values=names)
        if names and not self.saved_preset_var.get():
            self.saved_preset_var.set(names[0])

    def _capture_preset_payload(self) -> dict:
        options = self._collect_processing_options("final")
        return {
            "do_rembg": options.do_rembg,
            "model_key": options.model_key,
            "alpha_matting": options.alpha_matting,
            "post_process_mask": options.post_process_mask,
            "cleanup": options.cleanup,
            "cleanup_ratio": round(options.cleanup_ratio, 6),
            "keep_main_object": options.keep_main_object,
            "despill": options.despill,
            "despill_strength": options.despill_strength,
            "feather": options.feather,
            "feather_radius": options.feather_radius,
            "do_upscale": options.do_upscale,
            "upscale_engine": options.upscale_engine,
            "factor": options.factor,
            "sharpness": options.sharpness,
            "contrast": options.contrast,
            "mode_label": options.mode_label,
            "do_face_recovery": options.do_face_recovery,
            "face_strength": options.face_strength,
            "use_face_crop": self.use_face_crop.get() if hasattr(self, "use_face_crop") else False,
            "do_light_color_restore": self.do_light_color_restore.get() if hasattr(self, "do_light_color_restore") else False,
            "light_restore_strength": self.light_restore_strength_var.get() if hasattr(self, "light_restore_strength_var") else 0.55,
            "active_modules": list(options.active_modules),
            "export_profile_label": self.export_profile_var.get() if hasattr(self, "export_profile_var") else "",
        }

    def _apply_saved_preset_payload(self, payload: dict):
        self.do_rembg.set(bool(payload.get("do_rembg", True)))
        model_key = str(payload.get("model_key", DEFAULT_MODEL_KEY))
        if model_key in MODEL_KEYS:
            self.model_cb.current(MODEL_KEYS.index(model_key))
        self.do_alpha_matting.set(bool(payload.get("alpha_matting", True)))
        self.do_post_process.set(bool(payload.get("post_process_mask", True)))
        self.do_cleanup.set(bool(payload.get("cleanup", True)))
        self.cleanup_var.set(float(payload.get("cleanup_ratio", 0.0015)) * 100)
        self.keep_main_object.set(bool(payload.get("keep_main_object", False)))
        self.do_despill.set(bool(payload.get("despill", True)))
        self.despill_var.set(float(payload.get("despill_strength", 0.55)))
        self.do_feather.set(bool(payload.get("feather", True)))
        self.feather_var.set(float(payload.get("feather_radius", 0.45)))
        self.do_upscale.set(bool(payload.get("do_upscale", True)))
        engine_key = str(payload.get("upscale_engine", DEFAULT_UPSCALE_ENGINE))
        engine_label = next((label for key, label in UPSCALE_ENGINES if key == engine_key), UPSCALE_ENGINE_LABELS[0])
        self.upscale_engine_var.set(engine_label)
        self._set_factor(int(payload.get("factor", 4)))
        self.sharp_var.set(float(payload.get("sharpness", 1.3)))
        self.contrast_var.set(float(payload.get("contrast", 1.05)))
        mode_label = str(payload.get("mode_label", self.lupa_mode_var.get()))
        if mode_label in LUPA_MODE_BY_LABEL:
            self.lupa_mode_var.set(mode_label)
        self.do_face_recovery.set(bool(payload.get("do_face_recovery", False)))
        self.face_strength_var.set(float(payload.get("face_strength", 0.72)))
        if hasattr(self, "use_face_crop"):
            self.use_face_crop.set(bool(payload.get("use_face_crop", False)))
        if hasattr(self, "do_light_color_restore"):
            self.do_light_color_restore.set(bool(payload.get("do_light_color_restore", False)))
        if hasattr(self, "light_restore_strength_var"):
            self.light_restore_strength_var.set(float(payload.get("light_restore_strength", 0.55)))
        for spec in MODULE_REGISTRY.all_specs():
            MODULE_REGISTRY.deactivate(spec.id)
        for module_id in payload.get("active_modules", []):
            MODULE_REGISTRY.activate(module_id)
        export_profile_label = str(payload.get("export_profile_label", ""))
        if export_profile_label and hasattr(self, "export_profile_var"):
            self.export_profile_var.set(export_profile_label)
        self._refresh_module_cards()
        self._refresh_action_chips()

    def _apply_saved_preset_from_ui(self):
        name = self.saved_preset_var.get().strip()
        if not name:
            messagebox.showinfo("Preset", "Selecciona un preset guardado.")
            return
        payload = self._saved_presets.get(name)
        if not payload:
            messagebox.showerror("Preset", f"No existe el preset '{name}'.")
            return
        self._apply_saved_preset_payload(payload)
        self._set_status(f"Preset aplicado: {name}", SUCCESS)

    def _save_current_preset(self):
        name = simpledialog.askstring("Guardar preset", "Nombre del preset:", parent=self.root)
        if not name:
            return
        save_preset(name, self._capture_preset_payload())
        self._load_saved_presets_into_ui()
        self.saved_preset_var.set(name)
        self._set_status(f"Preset guardado: {name}", SUCCESS)

    def _delete_selected_preset(self):
        name = self.saved_preset_var.get().strip()
        if not name:
            return
        if delete_preset(name):
            self._load_saved_presets_into_ui()
            self.saved_preset_var.set("")
            self._set_status(f"Preset borrado: {name}", WARNING)

    def _export_profile_id(self) -> str:
        return export_profile_by_label().get(self.export_profile_var.get(), "png_transparent")

    def _load_comfyui_settings_into_ui(self):
        settings = load_comfyui_settings()
        if hasattr(self, "comfy_enabled_var"):
            self.comfy_enabled_var.set(bool(settings.get("enabled", False)))
        if hasattr(self, "comfy_url_var"):
            self.comfy_url_var.set(str(settings.get("base_url", "http://127.0.0.1:8188")))
        if hasattr(self, "comfy_workflow_var"):
            self.comfy_workflow_var.set(str(settings.get("workflow_path", "")))
        if hasattr(self, "comfy_prompt_var"):
            self.comfy_prompt_var.set(str(settings.get("prompt", "")))
        if hasattr(self, "comfy_negative_var"):
            self.comfy_negative_var.set(str(settings.get("negative_prompt", "text, watermark, low quality")))
        if hasattr(self, "comfy_reference_var"):
            self.comfy_reference_var.set(str(settings.get("reference_image_path", "")))
        if hasattr(self, "comfy_control_var"):
            self.comfy_control_var.set(str(settings.get("control_image_path", "")))
        if hasattr(self, "comfy_params_text"):
            params = settings.get("workflow_params", {})
            try:
                payload = json.dumps(params if isinstance(params, dict) else {}, ensure_ascii=True, indent=2)
            except (TypeError, ValueError):
                payload = "{}"
            self.comfy_params_text.delete("1.0", tk.END)
            self.comfy_params_text.insert("1.0", payload)
        if hasattr(self, "comfy_use_output_var"):
            self.comfy_use_output_var.set(bool(settings.get("use_output_image", True)))
        self._refresh_comfyui_status()

    def _collect_comfyui_settings(self):
        params_text = self.comfy_params_text.get("1.0", tk.END).strip() if hasattr(self, "comfy_params_text") else "{}"
        if not params_text:
            params_text = "{}"
        try:
            workflow_params = json.loads(params_text)
        except json.JSONDecodeError as exc:
            messagebox.showerror("ComfyUI", f"Workflow params JSON invalido:\n{exc}")
            return None
        if not isinstance(workflow_params, dict):
            messagebox.showerror("ComfyUI", "Workflow params debe ser un objeto JSON.")
            return None
        return {
            "enabled": self.comfy_enabled_var.get(),
            "base_url": self.comfy_url_var.get().strip() or "http://127.0.0.1:8188",
            "workflow_path": self.comfy_workflow_var.get().strip(),
            "output_prefix": "image_enhancer",
            "use_output_image": self.comfy_use_output_var.get(),
            "prompt": self.comfy_prompt_var.get().strip(),
            "negative_prompt": self.comfy_negative_var.get().strip(),
            "reference_image_path": self.comfy_reference_var.get().strip(),
            "control_image_path": self.comfy_control_var.get().strip(),
            "workflow_params": workflow_params,
        }

    def _persist_comfyui_settings(self):
        settings = self._collect_comfyui_settings()
        if settings is None:
            return False
        save_comfyui_settings(settings)
        self._refresh_comfyui_status()
        self._refresh_module_cards()
        self._set_status("Configuracion ComfyUI guardada", SUCCESS)
        return True

    def _refresh_comfyui_status(self):
        if not self._comfy_status_lbl:
            return
        workflow = self.comfy_workflow_var.get().strip() if hasattr(self, "comfy_workflow_var") else ""
        base_url = self.comfy_url_var.get().strip() if hasattr(self, "comfy_url_var") else ""
        ref_path = self.comfy_reference_var.get().strip() if hasattr(self, "comfy_reference_var") else ""
        control_path = self.comfy_control_var.get().strip() if hasattr(self, "comfy_control_var") else ""
        if self.comfy_enabled_var.get() and workflow and base_url:
            extras: list[str] = []
            if ref_path:
                extras.append("ref")
            if control_path:
                extras.append("control")
            extra_suffix = f" · extras: {', '.join(extras)}" if extras else ""
            text = f"ComfyUI listo para smoke en {base_url}{extra_suffix}"
            color = SUCCESS
        else:
            text = "ComfyUI: fallback local activo"
            color = TEXT_DIM
        self._comfy_status_lbl.configure(text=text, fg=color)

    def _pick_comfyui_workflow(self):
        path = filedialog.askopenfilename(
            title="Seleccionar workflow JSON",
            filetypes=[("Workflow JSON", "*.json"), ("Todos", "*.*")],
        )
        if not path:
            return
        self.comfy_workflow_var.set(path)
        self._persist_comfyui_settings()

    def _pick_comfyui_reference(self):
        path = filedialog.askopenfilename(
            title="Seleccionar imagen de referencia",
            filetypes=[("Imagenes", "*.png;*.jpg;*.jpeg;*.webp;*.bmp"), ("Todos", "*.*")],
        )
        if not path:
            return
        self.comfy_reference_var.set(path)
        self._persist_comfyui_settings()

    def _pick_comfyui_control(self):
        path = filedialog.askopenfilename(
            title="Seleccionar control image",
            filetypes=[("Imagenes", "*.png;*.jpg;*.jpeg;*.webp;*.bmp"), ("Todos", "*.*")],
        )
        if not path:
            return
        self.comfy_control_var.set(path)
        self._persist_comfyui_settings()

    def _show_comfyui_templates(self):
        templates_dir = Path(__file__).resolve().parent / "workflows" / "comfyui"
        if not templates_dir.exists():
            messagebox.showinfo("Plantillas ComfyUI", "No hay plantillas locales todavia.")
            return
        try:
            os.startfile(str(templates_dir))
        except OSError as exc:
            messagebox.showerror("Plantillas ComfyUI", str(exc))

    def _validate_comfyui(self):
        if not self._persist_comfyui_settings():
            return
        from pipeline import run_comfyui_smoke

        code = run_comfyui_smoke()
        self._set_status("ComfyUI validado" if code == 0 else "ComfyUI no valido", SUCCESS if code == 0 else ERROR)

    def _refresh_history_panel(self):
        entries = load_recent_history(8)
        if self._history_listbox:
            self._history_listbox.delete(0, tk.END)
            for entry in entries:
                kind = entry.get("kind", "resultado")
                source = Path(entry.get("source", "")).name or "sin fuente"
                provider = entry.get("provider", "")
                self._history_listbox.insert(tk.END, f"{kind}: {source} {provider}".strip())
        if self._history_summary_lbl:
            if entries:
                latest = entries[0]
                self._history_summary_lbl.configure(
                    text=f"Ultimo: {latest.get('kind', 'resultado')} · {Path(latest.get('source', '')).name or 'sin fuente'}",
                    fg=TEXT_DIM,
                )
            else:
                self._history_summary_lbl.configure(text="Sin resultados recientes", fg=TEXT_DIM)

    def _select_batch_input_folder(self):
        path = filedialog.askdirectory(title="Seleccionar carpeta de entrada batch")
        if not path:
            return
        self._batch_input_dir = Path(path)
        self.batch_folder_lbl.configure(text=f"Entrada batch: {self._batch_input_dir}")

    def _select_batch_output_folder(self):
        path = filedialog.askdirectory(title="Seleccionar carpeta de salida batch")
        if not path:
            return
        self._batch_output_dir = Path(path)
        self.batch_output_lbl.configure(text=f"Salida batch: {self._batch_output_dir}")

    def _open_last_batch_report(self):
        if not self._last_batch_report or not self._last_batch_report.report_path:
            messagebox.showinfo("Reporte batch", "Todavia no hay reporte de lote.")
            return
        try:
            os.startfile(self._last_batch_report.report_path)
        except OSError as exc:
            messagebox.showerror("Reporte batch", str(exc))

    def _cancel_current_work(self):
        if self._current_token:
            self._current_token.cancel()
            self._set_status("Cancelacion solicitada...", WARNING)

    def _export_current_with_profile(self):
        if not self.output_image or not self.input_path:
            messagebox.showwarning("Sin resultado", "Genera una imagen final antes de exportar con perfil.")
            return
        folder = filedialog.askdirectory(title="Seleccionar carpeta para export profile")
        if not folder:
            return
        outputs = export_current_result_with_profile(
            self.output_image,
            self.input_path,
            Path(folder),
            self._export_profile_id(),
        )
        self._set_status(f"Export profile completado ({len(outputs)} archivo(s))", SUCCESS)
        messagebox.showinfo("Export profile", "\n".join(str(path) for path in outputs))

    def _start_batch_folder(self):
        if self._processing:
            messagebox.showinfo("Batch", "Espera a que termine la operacion actual o cancela primero.")
            return
        if not self._batch_input_dir:
            messagebox.showwarning("Batch", "Selecciona la carpeta de entrada batch.")
            return
        if not self._batch_output_dir:
            self._batch_output_dir = self._batch_input_dir / "_batch_output"
            self.batch_output_lbl.configure(text=f"Salida batch: {self._batch_output_dir}")

        self._processing = True
        self._current_token = CancellationToken()
        self._last_batch_report = None
        self.progress.start(12)
        if self.batch_cancel_btn:
            self.batch_cancel_btn.configure(state="normal", bg=ACTION_BR, fg=TEXT)
        if self.batch_run_btn:
            self.batch_run_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
        self._restore_processing_buttons()
        options = self._collect_processing_options("final")
        threading.Thread(target=self._batch_thread, args=(options, self._current_token), daemon=True).start()

    def _batch_thread(self, options: ProcessingOptions, token: CancellationToken):
        try:
            report = run_batch_folder(
                self._batch_input_dir,
                self._batch_output_dir,
                options,
                self._export_profile_id(),
                token=token,
                status_cb=self._update_status,
                item_cb=lambda item, index, total: self.root.after(
                    0, lambda: self._set_status(f"Batch {index}/{total}: {Path(item.source_path).name} -> {item.status}", TEXT_DIM)
                ),
            )
            self.root.after(0, lambda: self._on_batch_done(report, token))
        except ProcessingCancelled:
            self.root.after(0, lambda: self._on_batch_cancelled(token))
        except Exception as exc:
            self.root.after(0, lambda: self._on_batch_error(token, exc))

    def _on_batch_done(self, report: BatchReport, token: CancellationToken):
        if token is not self._current_token:
            return
        self._last_batch_report = report
        self._processing = False
        self._current_token = None
        self.progress.stop()
        if self.batch_cancel_btn:
            self.batch_cancel_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
        if self.batch_run_btn:
            self.batch_run_btn.configure(state="normal", bg=ACTION_LOW, fg=TEXT)
        self._restore_processing_buttons()
        self._refresh_history_panel()
        self._set_status(
            f"Batch {report.status}: OK {report.items_ok} · Error {report.items_error} · Canceladas {report.items_cancelled}",
            SUCCESS if report.status == "done" else WARNING,
        )
        messagebox.showinfo(
            "Reporte final por lote",
            (
                f"Estado: {report.status}\n"
                f"OK: {report.items_ok}\n"
                f"Error: {report.items_error}\n"
                f"Canceladas: {report.items_cancelled}\n"
                f"Reporte: {report.report_path}"
            ),
        )

    def _on_batch_cancelled(self, token: CancellationToken):
        if token is not self._current_token:
            return
        self._processing = False
        self._current_token = None
        self.progress.stop()
        if self.batch_cancel_btn:
            self.batch_cancel_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
        if self.batch_run_btn:
            self.batch_run_btn.configure(state="normal", bg=ACTION_LOW, fg=TEXT)
        self._restore_processing_buttons()
        self._set_status("Batch cancelado", WARNING)

    def _on_batch_error(self, token: CancellationToken, exc: Exception):
        if token is not self._current_token:
            return
        self._processing = False
        self._current_token = None
        self.progress.stop()
        if self.batch_cancel_btn:
            self.batch_cancel_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
        if self.batch_run_btn:
            self.batch_run_btn.configure(state="normal", bg=ACTION_LOW, fg=TEXT)
        self._restore_processing_buttons()
        messagebox.showerror("Batch con error", str(exc))
        self._set_status("Batch con error", ERROR)

    # ── Helpers UI ────────────────────────────────────────────────────────

    def _section_label(self, parent, text):
        tk.Label(parent, text=text, font=(FONT_UI, 8, "bold"),
                 fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        tk.Frame(parent, bg=BORDER, height=1).pack(fill="x", pady=(2, 8))

    def _center_window(self, w, h):
        sw = self.root.winfo_screenwidth()
        sh = self.root.winfo_screenheight()
        x  = (sw - w) // 2
        y  = (sh - h) // 2
        self.root.geometry(f"{w}x{h}+{x}+{y}")

    def _set_factor(self, value: int):
        self.factor_var.set(value)
        for f, btn in self._factor_btns.items():
            btn.configure(
                bg=CTA if f == value else PANEL2,
                fg=CTA_TEXT if f == value else TEXT_DIM)
        self._refresh_action_chips()

    def _on_model_change(self, event):
        # ModelManager mantiene las sesiones ya cargadas y solo crea las nuevas que hagan falta.
        selected = self._selected_model_key()
        if selected == PREMIUM_SEGMENTATION_MODEL:
            MODULE_REGISTRY.activate("segmentation_birefnet")
        elif MODULE_REGISTRY.is_active("segmentation_birefnet"):
            MODULE_REGISTRY.deactivate("segmentation_birefnet")
        self._refresh_module_cards()
        self._refresh_action_chips()

    def _selected_model_key(self) -> str:
        idx = self.model_cb.current()
        if 0 <= idx < len(MODEL_KEYS):
            return MODEL_KEYS[idx]
        return MODEL_BY_LABEL.get(self.model_var.get(), DEFAULT_MODEL_KEY)

    def _set_segmentation_model(self, model_key: str, activate_module: bool = True):
        try:
            self.model_cb.current(MODEL_KEYS.index(model_key))
        except ValueError:
            return
        self.do_rembg.set(True)
        if activate_module:
            if model_key == PREMIUM_SEGMENTATION_MODEL:
                MODULE_REGISTRY.activate("segmentation_birefnet")
            elif model_key == FAST_SEGMENTATION_MODEL:
                MODULE_REGISTRY.deactivate("segmentation_birefnet")
        self._refresh_module_cards()
        self._refresh_action_chips()
        self._set_status(f"Segmentacion seleccionada: {model_key}", SUCCESS)

    def _selected_upscale_engine(self) -> str:
        return UPSCALE_ENGINE_BY_LABEL.get(self.upscale_engine_var.get(), DEFAULT_UPSCALE_ENGINE)

    def _selected_lupa_mode(self) -> str:
        return LUPA_MODE_BY_LABEL.get(self.lupa_mode_var.get(), DEFAULT_LUPA_MODE)

    def _apply_mode_preset(self, mode_key: str, force: bool = False):
        preset = LUPA_MODE_PRESETS.get(mode_key)
        if not preset:
            return

        if hasattr(self, "upscale_engine_var"):
            engine_label = next(label for key, label in UPSCALE_ENGINES if key == preset["engine"])
            if force or self.upscale_engine_var.get() != engine_label:
                self.upscale_engine_var.set(engine_label)
        if hasattr(self, "model_cb"):
            try:
                idx = MODEL_KEYS.index(preset["model"])
                if force or self.model_cb.current() != idx:
                    self.model_cb.current(idx)
            except ValueError:
                pass
        if hasattr(self, "_factor_btns"):
            self._set_factor(int(preset["factor"]))
        if hasattr(self, "sharp_var"):
            self.sharp_var.set(float(preset["sharpness"]))
        if hasattr(self, "contrast_var"):
            self.contrast_var.set(float(preset["contrast"]))
        if hasattr(self, "despill_var"):
            self.despill_var.set(float(preset["despill"]))
        if hasattr(self, "feather_var"):
            self.feather_var.set(float(preset["feather"]))
        if hasattr(self, "cleanup_var"):
            self.cleanup_var.set(float(preset["cleanup"]))
        if hasattr(self, "keep_main_object"):
            self.keep_main_object.set(bool(preset["keep_main_object"]))
        if hasattr(self, "do_face_recovery"):
            self.do_face_recovery.set(bool(preset["face_recovery"]))
        if hasattr(self, "face_strength_var"):
            self.face_strength_var.set(float(preset["face_strength"]))
        self._refresh_action_chips()

    def _on_lupa_mode_change(self, _event=None):
        self._apply_mode_preset(self._selected_lupa_mode(), force=True)
        self._refresh_action_chips()

    def _refresh_action_chips(self):
        if hasattr(self, "action_file_lbl"):
            if self.input_path:
                name = self.input_path.name
                if len(name) > 28:
                    name = name[:12] + "..." + name[-12:]
                self.action_file_lbl.configure(text=name, fg=TEXT)
            else:
                self.action_file_lbl.configure(text="Type prompt here...", fg=TEXT_DIM)

        if "model" in self._action_chips and hasattr(self, "model_cb"):
            self._action_chips["model"].configure(text=f"Modelo {self._selected_model_key()}")
        if "mode" in self._action_chips and hasattr(self, "lupa_mode_var"):
            self._action_chips["mode"].configure(text=self.lupa_mode_var.get())
        if "hero_mode" in self._action_chips and hasattr(self, "lupa_mode_var"):
            self._action_chips["hero_mode"].configure(text=self.lupa_mode_var.get())
        if "engine" in self._action_chips and hasattr(self, "upscale_engine_var"):
            label = self.upscale_engine_var.get()
            if "Real-ESRGAN" in label:
                label = "Real-ESRGAN IA"
            else:
                label = "LANCZOS rapido"
            self._action_chips["engine"].configure(text=label)
            if "hero_engine" in self._action_chips:
                self._action_chips["hero_engine"].configure(text=label)
        if "factor" in self._action_chips and hasattr(self, "factor_var"):
            self._action_chips["factor"].configure(text=f"{self.factor_var.get()}x")
        if "hero_factor" in self._action_chips and hasattr(self, "factor_var"):
            self._action_chips["hero_factor"].configure(text=f"{self.factor_var.get()}x")

    def _set_view_mode(self, mode: str):
        self.view_mode.set(mode)
        for key, btn in self._view_btns.items():
            btn.configure(
                bg=CTA if key == mode else PANEL,
                fg=CTA_TEXT if key == mode else TEXT_DIM)
        self._render_previews()

    def _set_status(self, msg: str, color: str = TEXT_DIM):
        self.status_lbl.configure(text=f"● {msg}", fg=color)

    def _show_in_canvas(self, canvas: tk.Canvas, img: Image.Image, box: tuple[int, int]):
        composed = composite_on_checkerboard(img, box)
        tk_img   = ImageTk.PhotoImage(composed)
        canvas._tk_img = tk_img           # evita garbage collection
        canvas.delete("all")
        canvas.create_image(0, 0, anchor="nw", image=tk_img)

    def _canvas_box(self, canvas: tk.Canvas, fallback: tuple[int, int]) -> tuple[int, int]:
        width = max(160, canvas.winfo_width())
        height = max(160, canvas.winfo_height())
        if width <= 1 or height <= 1:
            return fallback
        return width, height

    def _show_raw_preview(self, canvas: tk.Canvas, img: Image.Image, box: tuple[int, int]):
        tk_img = ImageTk.PhotoImage(img)
        canvas._tk_img = tk_img
        canvas.delete("all")
        canvas.create_image(0, 0, anchor="nw", image=tk_img)

    def _render_previews(self):
        if self.input_image:
            self._show_in_canvas(self.before_canvas, self.input_image, self._canvas_box(self.before_canvas, (PREVIEW_W, PREVIEW_H)))
            self.before_info.configure(
                text=f"{self.input_image.width} × {self.input_image.height}  •  {self.input_image.mode}")
        else:
            self.before_canvas.delete("all")
            self.before_info.configure(text="—")

        if self.output_image:
            self._show_in_canvas(self.after_canvas, self.output_image, self._canvas_box(self.after_canvas, (PREVIEW_W, PREVIEW_H)))
            self.after_info.configure(
                text=f"{self.output_image.width} × {self.output_image.height}  •  {self.output_image.mode}")
        else:
            self.after_canvas.delete("all")
            self.after_info.configure(text="—")

        mode = self.view_mode.get()
        if mode == "compare":
            if not self.compare_frame.winfo_ismapped():
                self.single_frame.pack_forget()
                self.compare_frame.pack(fill="both", expand=True)
            return

        if self.compare_frame.winfo_ismapped():
            self.compare_frame.pack_forget()
        if not self.single_frame.winfo_ismapped():
            self.single_frame.pack(fill="both", expand=True)

        box = self._canvas_box(self.single_canvas, (SINGLE_PREVIEW_W, SINGLE_PREVIEW_H))
        if mode == "before":
            self.single_title.configure(text="ANTES")
            img = self.input_image
        elif mode == "after":
            self.single_title.configure(text="DESPUES")
            img = self.output_image or self.input_image
        else:
            self.single_title.configure(text="SPLIT A/B")
            img = (
                make_split_preview(self.input_image, self.output_image, box)
                if self.input_image and self.output_image
                else None
            )

        if img is None:
            self.single_canvas.delete("all")
            self.single_info.configure(text="Carga y procesa una imagen para activar esta vista")
            return

        if mode == "split":
            self._show_raw_preview(self.single_canvas, img, box)
            self.single_info.configure(text="Izquierda: antes  •  Derecha: despues")
        else:
            self._show_in_canvas(self.single_canvas, img, box)
            self.single_info.configure(text=f"{img.width} × {img.height}  •  {img.mode}")

    def _file_size_str(self, path: Path) -> str:
        try:
            b = path.stat().st_size
            if b < 1024:
                return f"{b} B"
            if b < 1024**2:
                return f"{b/1024:.1f} KB"
            return f"{b/1024**2:.1f} MB"
        except Exception:
            return ""

    # ── Acciones ──────────────────────────────────────────────────────────

    def _load_image(self):
        path = filedialog.askopenfilename(
            title="Seleccionar imagen",
            filetypes=[
                ("Imágenes", "*.png *.jpg *.jpeg *.webp *.bmp *.tiff *.tif"),
                ("PNG",  "*.png"),
                ("JPEG", "*.jpg *.jpeg"),
                ("Todos", "*.*"),
            ])
        if not path:
            return
        try:
            self.input_path  = Path(path)
            self.input_image = Image.open(path)

            # Normalizar modo
            if self.input_image.mode not in ("RGB", "RGBA"):
                self.input_image = self.input_image.convert("RGBA")

            size_s = self._file_size_str(self.input_path)
            self.file_lbl.configure(
                text=f"{self.input_path.name}  ({size_s})", fg=TEXT)

            self.output_image = None
            self._last_metrics = {}
            self._refresh_quality_panel()
            self._render_previews()
            self._refresh_action_chips()
            self._restore_processing_buttons()
            self._set_status("Imagen cargada — lista para generar", SUCCESS)

        except Exception as e:
            messagebox.showerror("Error al cargar", str(e))

    def _start_processing(self, render_mode: str = "final"):
        if not self.input_image:
            messagebox.showwarning("Sin imagen", "Carga una imagen primero.")
            return
        if self._processing:
            if self._current_token:
                self._current_token.cancel()
            self._pending_render_mode = render_mode
            self._set_status("Cancelando operacion actual para iniciar la nueva...", WARNING)
            return
        if not self.do_rembg.get() and not self.do_upscale.get():
            messagebox.showwarning("Sin operación", "Activa al menos una operación.")
            return

        self._processing = True
        self._active_render_mode = render_mode
        token = CancellationToken()
        self._current_token = token
        options = self._collect_processing_options(render_mode)
        self.process_btn.configure(state="normal", bg=ACTION_BR, fg=TEXT_DIM, text="Cancel + Render")
        self.preview_btn.configure(state="normal", bg=ACTION_BR, fg=TEXT_DIM, text="Cancel + Preview")
        self.save_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
        self.refine_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
        if self.ue5_export_btn:
            self.ue5_export_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
        if self.export_profile_btn:
            self.export_profile_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
        if self.comfy_btn:
            self.comfy_btn.configure(state="disabled", bg=ACTION_BR, fg=TEXT_DIM, text="ComfyUI")
        self.progress.start(12)

        threading.Thread(target=self._process_thread, args=(options, token), daemon=True).start()

    def _start_comfyui_render(self):
        if self._processing:
            messagebox.showinfo("ComfyUI", "Espera a que termine la operacion actual o cancelala primero.")
            return
        if not self.input_image:
            messagebox.showwarning("ComfyUI", "Carga una imagen primero.")
            return
        if not self.comfy_enabled_var.get():
            messagebox.showwarning("ComfyUI", "Habilita ComfyUI en el panel derecho primero.")
            return
        if not self._persist_comfyui_settings():
            return
        comfy_settings = self._collect_comfyui_settings()
        if comfy_settings is None:
            return
        if not self.comfy_workflow_var.get().strip():
            messagebox.showwarning("ComfyUI", "Selecciona un workflow JSON.")
            return

        self._processing = True
        token = CancellationToken()
        self._current_token = token
        self.progress.start(12)
        self.process_btn.configure(state="normal", bg=ACTION_BR, fg=TEXT_DIM, text="Cancel + Render")
        self.preview_btn.configure(state="normal", bg=ACTION_BR, fg=TEXT_DIM, text="Cancel + Preview")
        if self.comfy_btn:
            self.comfy_btn.configure(state="normal", bg=ACTION_BR, fg=TEXT, text="Cancel + ComfyUI")
        self.save_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
        self.refine_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
        if self.ue5_export_btn:
            self.ue5_export_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
        if self.export_profile_btn:
            self.export_profile_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
        self._pending_comfyui_settings = comfy_settings
        threading.Thread(target=self._comfyui_thread, args=(token,), daemon=True).start()

    def _start_segmentation_comparison(self):
        if not self.input_image:
            messagebox.showwarning("Sin imagen", "Carga una imagen primero.")
            return
        if self._processing:
            if self._current_token:
                self._current_token.cancel()
            self._set_status("Cancelando operacion actual antes de comparar segmentacion...", WARNING)
            return

        self._processing = True
        token = CancellationToken()
        self._current_token = token
        options = self._collect_processing_options("preview")
        options.do_rembg = True
        options.do_upscale = False
        options.render_mode = "preview"
        self.progress.start(12)
        self.process_btn.configure(state="disabled", bg=ACTION_BR, fg=TEXT_DIM)
        self.preview_btn.configure(state="disabled", bg=ACTION_BR, fg=TEXT_DIM)
        if self._segmentation_compare_btn:
            self._segmentation_compare_btn.configure(state="disabled", bg=ACTION_BR, fg=TEXT_DIM, text="Comparando...")
        self._set_status("Comparando segmentacion rapida vs premium...", TEXT_DIM)

        threading.Thread(
            target=self._segmentation_comparison_thread,
            args=(options, token),
            daemon=True,
        ).start()

    def _collect_processing_options(self, render_mode: str) -> ProcessingOptions:
        active_modules = tuple(
            spec.id for spec in MODULE_REGISTRY.all_specs() if MODULE_REGISTRY.is_active(spec.id)
        )
        face_backend = "gfpgan" if "portrait_gfpgan_external" in active_modules else "codeformer"
        return ProcessingOptions(
            do_rembg=self.do_rembg.get(),
            model_key=self._selected_model_key(),
            alpha_matting=self.do_alpha_matting.get(),
            post_process_mask=self.do_post_process.get(),
            cleanup=self.do_cleanup.get(),
            cleanup_ratio=self.cleanup_var.get() / 100,
            keep_main_object=self.keep_main_object.get(),
            despill=self.do_despill.get(),
            despill_strength=self.despill_var.get(),
            feather=self.do_feather.get(),
            feather_radius=self.feather_var.get(),
            do_upscale=self.do_upscale.get(),
            upscale_engine=self._selected_upscale_engine(),
            factor=self.factor_var.get(),
            sharpness=self.sharp_var.get(),
            contrast=self.contrast_var.get(),
            mode_label=self.lupa_mode_var.get(),
            do_face_recovery=self.do_face_recovery.get() or "portrait_codeformer" in active_modules or "portrait_gfpgan_external" in active_modules,
            face_backend=face_backend,
            face_strength=self.face_strength_var.get(),
            use_face_crop="portrait_face_detector" in active_modules,
            do_light_color_restore="color_local_restore" in active_modules,
            render_mode=render_mode,
            active_modules=active_modules,
        )

    def _process_thread(self, options: ProcessingOptions, token: CancellationToken):
        try:
            result = process_image(
                self.input_image,
                options,
                token=token,
                status_cb=self._update_status,
            )
            self.root.after(0, lambda: self._on_done(result, token))

        except ProcessingCancelled:
            self.root.after(0, lambda: self._on_cancelled(token))
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            self.root.after(0, lambda: messagebox.showerror(
                "Error en procesamiento",
                f"{e}\n\n"
                "Si el error ocurrio al cargar un modelo, verifica conexion a internet "
                "en la primera descarga y que exista espacio libre en %USERPROFILE%\\.u2net "
                "o %USERPROFILE%\\.image_enhancer_models.\n\n"
                f"Detalle:\n{tb[:700]}"))
            self.root.after(0, lambda: self._on_error(token))

    def _comfyui_thread(self, token: CancellationToken):
        try:
            comfy_settings = getattr(self, "_pending_comfyui_settings", None) or {}
            source = (
                self.output_image.copy()
                if self.comfy_use_output_var.get() and self.output_image is not None
                else self.input_image.copy()
            )
            result = run_comfyui_external(
                source,
                base_url=self.comfy_url_var.get().strip(),
                workflow_path=self.comfy_workflow_var.get().strip(),
                output_prefix="image_enhancer",
                prompt_text=self.comfy_prompt_var.get().strip(),
                negative_prompt=self.comfy_negative_var.get().strip(),
                reference_image_path=str(comfy_settings.get("reference_image_path", "")),
                control_image_path=str(comfy_settings.get("control_image_path", "")),
                workflow_params=dict(comfy_settings.get("workflow_params", {})),
                token=token,
                status_cb=self._update_status,
            )
            self.root.after(0, lambda: self._on_done(result, token))
        except ProcessingCancelled:
            self.root.after(0, lambda: self._on_cancelled(token))
        except Exception as exc:
            self.root.after(0, lambda: messagebox.showerror("ComfyUI", str(exc)))
            self.root.after(0, lambda: self._on_error(token))

    def _segmentation_comparison_thread(self, options: ProcessingOptions, token: CancellationToken):
        try:
            result = compare_segmentation_presets(
                self.input_image,
                options,
                token=token,
                status_cb=self._update_status,
            )
            self.root.after(0, lambda: self._on_segmentation_comparison_done(result, token))
        except ProcessingCancelled:
            self.root.after(0, lambda: self._on_cancelled(token))
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            self.root.after(0, lambda: messagebox.showerror(
                "Error en comparacion",
                f"{e}\n\n"
                "La comparacion usa u2net y birefnet-general. En la primera ejecucion puede "
                "descargar modelos en %USERPROFILE%\\.u2net.\n\n"
                f"Detalle:\n{tb[:700]}"))
            self.root.after(0, lambda: self._on_error(token))

    def _on_done(self, result: ProcessingResult, token: CancellationToken):
        if token is not self._current_token:
            return
        self.output_image = result.image
        self._last_processing_result = result
        self._processing = False
        self._current_token = None
        self.progress.stop()
        self._restore_processing_buttons()

        self._last_metrics = dict(result.metrics)
        self._refresh_quality_panel(self._last_metrics)
        self._render_previews()
        if self.input_path and result.render_mode != "preview":
            record_processing_history(
                self.input_path,
                result,
                kind="comfyui" if result.render_mode == "comfyui" else "single",
            )
            self._refresh_history_panel()

        if result.render_mode == "final":
            self.save_btn.configure(state="normal", bg=ACTION_LOW, fg=TEXT)
            self.refine_btn.configure(state="normal", bg=ACTION_LOW, fg=TEXT)
            if self.ue5_export_btn:
                self.ue5_export_btn.configure(state="normal", bg=ACTION_LOW, fg=TEXT)
            if self.export_profile_btn:
                self.export_profile_btn.configure(state="normal", bg=ACTION_LOW, fg=TEXT)
            self._set_status("Render final completado ✓", SUCCESS)
        elif result.render_mode == "comfyui":
            self.save_btn.configure(state="normal", bg=ACTION_LOW, fg=TEXT)
            self.refine_btn.configure(state="normal", bg=ACTION_LOW, fg=TEXT)
            if self.ue5_export_btn:
                self.ue5_export_btn.configure(state="normal", bg=ACTION_LOW, fg=TEXT)
            if self.export_profile_btn:
                self.export_profile_btn.configure(state="normal", bg=ACTION_LOW, fg=TEXT)
            self._set_status("ComfyUI devolvio resultado ✓", SUCCESS)
        else:
            self.save_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
            self.refine_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
            if self.ue5_export_btn:
                self.ue5_export_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
            if self.export_profile_btn:
                self.export_profile_btn.configure(state="disabled", bg=ACTION_LOW, fg=TEXT_DIM)
            self._set_status("Preview rapido completado al 25%", SUCCESS)

    def _on_segmentation_comparison_done(self, result: SegmentationComparisonResult, token: CancellationToken):
        if token is not self._current_token:
            return
        self._last_segmentation_comparison = result
        self._processing = False
        self._current_token = None
        self.progress.stop()
        self._restore_processing_buttons()
        self._set_status("Comparacion de segmentacion lista", SUCCESS)
        SegmentationComparisonWindow(
            self.root,
            result,
            on_select=self._set_segmentation_model,
        )

    def _on_cancelled(self, token: CancellationToken):
        if token is not self._current_token:
            return
        self._processing = False
        self._current_token = None
        self.progress.stop()
        self._restore_processing_buttons()
        pending = self._pending_render_mode
        self._pending_render_mode = None
        if pending:
            self.root.after(50, lambda: self._start_processing(pending))
        else:
            self._set_status("Procesamiento cancelado", WARNING)

    def _on_error(self, token: CancellationToken | None = None):
        if token is not None and token is not self._current_token:
            return
        self._processing = False
        self._current_token = None
        self.progress.stop()
        self._restore_processing_buttons()
        self._set_status("Error — revisa la consola", ERROR)

    def _restore_processing_buttons(self):
        state = "disabled" if self._processing else ("normal" if self.input_image else "disabled")
        bg = CTA if (self.input_image and not self._processing) else PANEL2
        fg = CTA_TEXT if (self.input_image and not self._processing) else TEXT_DIM
        self.process_btn.configure(state=state, bg=bg, fg=fg, text="Generate")
        preview_bg = ACTION_LOW if (self.input_image and not self._processing) else PANEL2
        self.preview_btn.configure(
            state=state,
            bg=preview_bg,
            fg=TEXT if (self.input_image and not self._processing) else TEXT_DIM,
            text="Preview 25%",
        )
        output_state = "disabled" if self._processing else ("normal" if self.output_image else "disabled")
        output_fg = TEXT if (self.output_image and not self._processing) else TEXT_DIM
        self.save_btn.configure(state=output_state, bg=ACTION_LOW, fg=output_fg)
        self.refine_btn.configure(state=output_state, bg=ACTION_LOW, fg=output_fg)
        if self.ue5_export_btn:
            self.ue5_export_btn.configure(state=output_state, bg=ACTION_LOW, fg=output_fg)
        if self.comfy_btn:
            self.comfy_btn.configure(state=state, bg=ACTION_LOW if self.input_image else PANEL2, fg=TEXT if self.input_image else TEXT_DIM, text="ComfyUI")
        if self.export_profile_btn:
            self.export_profile_btn.configure(state=output_state, bg=ACTION_LOW, fg=output_fg)
        if self.batch_cancel_btn:
            self.batch_cancel_btn.configure(
                state="normal" if self._processing else "disabled",
                bg=ACTION_BR if self._processing else ACTION_LOW,
                fg=TEXT if self._processing else TEXT_DIM,
            )
        if self.batch_run_btn:
            self.batch_run_btn.configure(
                state="disabled" if self._processing else "normal",
                bg=ACTION_LOW,
                fg=TEXT_DIM if self._processing else TEXT,
            )
        if self._segmentation_compare_btn:
            compare_bg = CTA if self.input_image else PANEL2
            compare_fg = CTA_TEXT if self.input_image else TEXT_DIM
            self._segmentation_compare_btn.configure(
                state=state,
                bg=compare_bg,
                fg=compare_fg,
                text="Comparar u2net / BiRefNet",
            )

    def _update_status(self, msg: str, color: str = TEXT_DIM):
        self.root.after(0, lambda: self._set_status(msg, color))

    def _open_edge_refiner(self):
        if not self.output_image:
            messagebox.showwarning("Sin resultado", "Procesa una imagen antes de refinar bordes.")
            return

        def apply_refined(refined: Image.Image):
            self.output_image = refined.convert("RGBA")
            self._last_metrics = collect_basic_metrics(
                self.output_image,
                source_size=self.input_image.size if self.input_image else None,
                provider="manual refine",
                render_mode="final",
            )
            self._refresh_quality_panel(self._last_metrics)
            self._render_previews()
            self._set_status("Bordes refinados y aplicados", SUCCESS)

        EdgeRefineWindow(
            self.root,
            self.output_image,
            self.input_image,
            apply_refined,
        )

    def _export_ue5_set(self):
        if not self.output_image:
            messagebox.showwarning("Sin resultado", "Genera un render final antes de exportar UE5.")
            return

        parent = filedialog.askdirectory(title="Seleccionar carpeta para UE5 Texture Set")
        if not parent:
            return

        asset_name = self.input_path.stem if self.input_path else "image_asset"
        try:
            export = export_ue5_texture_set(
                self.output_image,
                Path(parent),
                asset_name,
                metrics=self._last_metrics,
                source_path=self.input_path,
            )
            files = ", ".join(path.name for path in export.files.values())
            warning_text = "\n".join(export.warnings) if export.warnings else "Set completo."
            self._set_status(f"UE5 Texture Set exportado: {export.folder.name}", SUCCESS)
            messagebox.showinfo(
                "UE5 Texture Set",
                f"Carpeta:\n{export.folder}\n\nArchivos:\n{files}\n\n{warning_text}",
            )
        except Exception as e:
            messagebox.showerror("Error al exportar UE5", str(e))

    def _save_output(self):
        if not self.output_image:
            return

        default = (self.input_path.stem + "_enhanced") if self.input_path else "enhanced"
        path = filedialog.asksaveasfilename(
            title="Guardar resultado",
            defaultextension=".png",
            initialfile=default,
            filetypes=[
                ("PNG con transparencia", "*.png"),
                ("JPEG alta calidad",     "*.jpg"),
            ])
        if not path:
            return

        try:
            if path.lower().endswith((".jpg", ".jpeg")):
                # JPEG no soporta alfa → fondo blanco
                bg  = Image.new("RGB", self.output_image.size, (255, 255, 255))
                if self.output_image.mode == "RGBA":
                    bg.paste(self.output_image, mask=self.output_image.split()[3])
                else:
                    bg.paste(self.output_image.convert("RGB"))
                bg.save(path, format="JPEG", quality=96, optimize=True)
            else:
                self.output_image.save(path, format="PNG", optimize=True)

            self._set_status(f"Guardado: {Path(path).name}", SUCCESS)
            messagebox.showinfo("Guardado ✓", f"Imagen guardada en:\n{path}")

        except Exception as e:
            messagebox.showerror("Error al guardar", str(e))


class SegmentationComparisonWindow:
    """Vista separada para comparar u2net contra BiRefNet sin tocar el render final."""

    def __init__(self, parent, result: SegmentationComparisonResult, on_select):
        self.parent = parent
        self.result = result
        self.on_select = on_select
        self.win = tk.Toplevel(parent)
        self.win.title("Comparacion de segmentacion - u2net vs BiRefNet")
        self.win.configure(bg=BG)
        self.win.minsize(920, 620)
        self.win.transient(parent)

        self._build_ui()
        self._center_window(980, 650)
        self._render()

    def _build_ui(self):
        main = tk.Frame(self.win, bg=BG, padx=18, pady=18)
        main.pack(fill="both", expand=True)

        head = tk.Frame(main, bg=BG)
        head.pack(fill="x", pady=(0, 10))
        tk.Label(
            head,
            text="Comparacion rapida de segmentacion",
            font=(FONT_UI, 15, "bold"),
            fg=TEXT,
            bg=BG,
            anchor="w",
        ).pack(side="left", fill="x", expand=True)
        tk.Label(
            head,
            text="preview 25%",
            font=(FONT_UI, 8, "bold"),
            fg=CTA,
            bg=CARD_BG,
            padx=8,
            pady=4,
        ).pack(side="right")

        metrics = tk.Frame(main, bg=PANEL, padx=12, pady=10, highlightthickness=1, highlightbackground=BORDER)
        metrics.pack(fill="x", pady=(0, 10))
        for model_key in (FAST_SEGMENTATION_MODEL, PREMIUM_SEGMENTATION_MODEL):
            tk.Label(
                metrics,
                text=f"{model_key}: {self.result.metrics.get(model_key, 'sin metrica')}",
                font=(FONT_UI, 8, "bold"),
                fg=TEXT if model_key == FAST_SEGMENTATION_MODEL else CTA,
                bg=PANEL,
                anchor="w",
            ).pack(side="left", padx=(0, 18))

        stage = tk.Frame(main, bg=PANEL, padx=10, pady=10, highlightthickness=1, highlightbackground=BORDER)
        stage.pack(fill="both", expand=True)
        self.canvas = tk.Canvas(stage, bg="#0D0D10", highlightthickness=0)
        self.canvas.pack(fill="both", expand=True)
        self.canvas.bind("<Configure>", lambda _event: self._render())

        actions = tk.Frame(main, bg=BG)
        actions.pack(fill="x", pady=(12, 0))
        tk.Button(
            actions,
            text="Usar u2net rapido",
            command=lambda: self._choose(FAST_SEGMENTATION_MODEL),
            bg=ACTION_LOW,
            fg=TEXT,
            activebackground=PANEL2,
            activeforeground=TEXT,
            font=(FONT_UI, 9, "bold"),
            relief="flat",
            cursor="hand2",
            padx=12,
            pady=8,
        ).pack(side="left", padx=(0, 8))
        tk.Button(
            actions,
            text="Usar BiRefNet premium",
            command=lambda: self._choose(PREMIUM_SEGMENTATION_MODEL),
            bg=CTA,
            fg=CTA_TEXT,
            activebackground=CTA_HOVER,
            activeforeground=CTA_TEXT,
            font=(FONT_UI, 9, "bold"),
            relief="flat",
            cursor="hand2",
            padx=12,
            pady=8,
        ).pack(side="left", padx=(0, 8))
        tk.Button(
            actions,
            text="Guardar comparacion",
            command=self._save,
            bg=PANEL,
            fg=TEXT,
            activebackground=PANEL2,
            activeforeground=TEXT,
            font=(FONT_UI, 9, "bold"),
            relief="flat",
            cursor="hand2",
            padx=12,
            pady=8,
        ).pack(side="right")

    def _center_window(self, w, h):
        self.win.update_idletasks()
        sw = self.win.winfo_screenwidth()
        sh = self.win.winfo_screenheight()
        x = (sw - w) // 2
        y = (sh - h) // 2
        self.win.geometry(f"{w}x{h}+{x}+{y}")

    def _render(self):
        box = (max(1, self.canvas.winfo_width()), max(1, self.canvas.winfo_height()))
        if box[0] < 20 or box[1] < 20:
            box = (900, 460)
        preview = fit_into(self.result.image, box)
        board = make_checkerboard(box, tile=14)
        x = (box[0] - preview.width) // 2
        y = (box[1] - preview.height) // 2
        board.paste(preview, (x, y), preview)
        tk_img = ImageTk.PhotoImage(board)
        self.canvas._tk_img = tk_img
        self.canvas.delete("all")
        self.canvas.create_image(0, 0, anchor="nw", image=tk_img)

    def _choose(self, model_key: str):
        self.on_select(model_key)
        self.win.destroy()

    def _save(self):
        path = filedialog.asksaveasfilename(
            title="Guardar comparacion de segmentacion",
            defaultextension=".png",
            initialfile="segmentacion_u2net_vs_birefnet.png",
            filetypes=[("PNG", "*.png")],
        )
        if not path:
            return
        try:
            self.result.image.save(path, format="PNG", optimize=True)
            messagebox.showinfo("Guardado", f"Comparacion guardada en:\n{path}")
        except Exception as exc:
            messagebox.showerror("Error al guardar", str(exc))


class EdgeRefineWindow:
    """Editor manual de alfa para perfeccionar bordes despues del recorte IA."""

    def __init__(self, parent, image: Image.Image, restore_source: Image.Image | None, on_apply):
        self.parent = parent
        self.image = image.convert("RGBA").copy()
        self.original = self.image.copy()
        self.restore_source = resize_restore_source(restore_source, self.image.size) or self.original.copy()
        self.on_apply = on_apply
        self.mode = tk.StringVar(value="erase")
        self.brush_size = tk.IntVar(value=34)
        self.opacity = tk.DoubleVar(value=0.9)
        self.softness = tk.DoubleVar(value=0.7)
        self.undo_stack: list[Image.Image] = []
        self._mode_btns: dict[str, tk.Button] = {}
        self._offset = (0, 0)
        self._scale = 1.0
        self._stroke_active = False

        self.win = tk.Toplevel(parent)
        self.win.title("Refinar bordes - Image Enhancer")
        self.win.configure(bg=BG)
        self.win.minsize(1060, 690)
        self.win.transient(parent)

        self._build_ui()
        self._center_window(1120, 720)
        self._render()

    def _build_ui(self):
        main = tk.Frame(self.win, bg=BG)
        main.pack(fill="both", expand=True, padx=18, pady=18)

        tools = tk.Frame(main, bg=PANEL, padx=16, pady=16, width=250)
        tools.pack(side="left", fill="y", padx=(0, 12))
        tools.pack_propagate(False)

        tk.Label(
            tools, text="REFINAR BORDES",
            font=("Consolas", 10, "bold"), fg=ACCENT, bg=PANEL
        ).pack(anchor="w")
        tk.Frame(tools, bg=BORDER, height=1).pack(fill="x", pady=(6, 12))

        self._tool_label(tools, "PINCEL")
        for key, label in (("erase", "Borrar restos"), ("restore", "Recuperar borde")):
            btn = tk.Button(
                tools, text=label,
                command=lambda v=key: self._set_mode(v),
                bg=ACCENT if key == "erase" else PANEL2,
                fg="white" if key == "erase" else TEXT,
                font=("Consolas", 9, "bold"), relief="flat",
                cursor="hand2", padx=9, pady=7)
            btn.pack(fill="x", pady=(0, 6))
            self._mode_btns[key] = btn

        tk.Label(tools, text="Tamano", font=("Consolas", 7), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        tk.Scale(
            tools, from_=4, to=180, resolution=2,
            orient="horizontal", variable=self.brush_size,
            bg=PANEL, fg=TEXT, troughcolor=BORDER,
            highlightthickness=0, font=("Consolas", 7),
            length=210).pack(fill="x")

        tk.Label(tools, text="Fuerza", font=("Consolas", 7), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        tk.Scale(
            tools, from_=0.1, to=1.0, resolution=0.05,
            orient="horizontal", variable=self.opacity,
            bg=PANEL, fg=TEXT, troughcolor=BORDER,
            highlightthickness=0, font=("Consolas", 7),
            length=210).pack(fill="x")

        tk.Label(tools, text="Suavidad", font=("Consolas", 7), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        tk.Scale(
            tools, from_=0.0, to=0.95, resolution=0.05,
            orient="horizontal", variable=self.softness,
            bg=PANEL, fg=TEXT, troughcolor=BORDER,
            highlightthickness=0, font=("Consolas", 7),
            length=210).pack(fill="x", pady=(0, 10))

        self._tool_label(tools, "ACCIONES DE BORDE")
        for label, action in (
            ("Suavizar borde", "smooth"),
            ("Expandir 1 px", "expand"),
            ("Contraer 1 px", "contract"),
            ("Definir borde", "crisp"),
            ("Limpiar islas", "cleanup"),
        ):
            tk.Button(
                tools, text=label,
                command=lambda v=action: self._apply_edge_action(v),
                bg=PANEL2, fg=TEXT,
                font=("Consolas", 8), relief="flat",
                cursor="hand2", padx=9, pady=6).pack(fill="x", pady=(0, 5))

        tk.Frame(tools, bg=PANEL).pack(expand=True, fill="y")

        tk.Button(
            tools, text="Deshacer",
            command=self._undo,
            bg=PANEL2, fg=TEXT,
            font=("Consolas", 8), relief="flat",
            cursor="hand2", padx=9, pady=6).pack(fill="x", pady=(0, 5))
        tk.Button(
            tools, text="Restaurar entrada",
            command=self._reset,
            bg=PANEL2, fg=TEXT,
            font=("Consolas", 8), relief="flat",
            cursor="hand2", padx=9, pady=6).pack(fill="x", pady=(0, 12))
        tk.Button(
            tools, text="Aplicar refinado",
            command=self._apply,
            bg=ACCENT, fg="white",
            font=("Consolas", 10, "bold"), relief="flat",
            cursor="hand2", padx=9, pady=9).pack(fill="x")

        stage = tk.Frame(main, bg=PANEL, padx=10, pady=10)
        stage.pack(side="left", fill="both", expand=True)
        tk.Label(
            stage, text="Pinta sobre el borde: borrar hace transparente, recuperar vuelve opaco usando la imagen original.",
            font=("Consolas", 8), fg=TEXT_DIM, bg=PANEL
        ).pack(anchor="w", pady=(0, 6))

        self.canvas = tk.Canvas(
            stage, width=EDGE_EDITOR_W, height=EDGE_EDITOR_H,
            bg="#0D0D10", highlightthickness=1,
            highlightbackground=BORDER, cursor="crosshair")
        self.canvas.pack(fill="both", expand=True)
        self.canvas.bind("<ButtonPress-1>", self._start_stroke)
        self.canvas.bind("<B1-Motion>", self._paint)
        self.canvas.bind("<ButtonRelease-1>", self._end_stroke)

        self.info = tk.Label(stage, text="", font=("Consolas", 7), fg=TEXT_DIM, bg=PANEL)
        self.info.pack(pady=(6, 0))

    def _tool_label(self, parent, text):
        tk.Label(parent, text=text, font=("Consolas", 8, "bold"), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        tk.Frame(parent, bg=BORDER, height=1).pack(fill="x", pady=(2, 8))

    def _center_window(self, w, h):
        self.win.update_idletasks()
        sw = self.win.winfo_screenwidth()
        sh = self.win.winfo_screenheight()
        x = (sw - w) // 2
        y = (sh - h) // 2
        self.win.geometry(f"{w}x{h}+{x}+{y}")

    def _push_undo(self):
        self.undo_stack.append(self.image.copy())
        if len(self.undo_stack) > 20:
            self.undo_stack.pop(0)

    def _set_mode(self, mode: str):
        self.mode.set(mode)
        for key, btn in self._mode_btns.items():
            btn.configure(
                bg=ACCENT if key == mode else PANEL2,
                fg="white" if key == mode else TEXT)

    def _image_point(self, event) -> tuple[int, int] | None:
        x = (event.x - self._offset[0]) / self._scale
        y = (event.y - self._offset[1]) / self._scale
        if x < 0 or y < 0 or x >= self.image.width or y >= self.image.height:
            return None
        return int(x), int(y)

    def _start_stroke(self, event):
        self._stroke_active = True
        self._push_undo()
        self._paint(event)

    def _paint(self, event):
        if not self._stroke_active:
            return
        point = self._image_point(event)
        if point is None:
            return
        x, y = point
        self.image = apply_alpha_brush(
            self.image,
            self.restore_source,
            x,
            y,
            self.brush_size.get(),
            self.mode.get(),
            self.opacity.get(),
            self.softness.get(),
        )
        self._render()

    def _end_stroke(self, _event):
        self._stroke_active = False

    def _apply_edge_action(self, action: str):
        self._push_undo()
        if action == "cleanup":
            self.image = clean_alpha_artifacts(self.image, min_area_ratio=0.0007, keep_largest=False)
        else:
            self.image = adjust_alpha_edge(self.image, action)
        self._render()

    def _undo(self):
        if not self.undo_stack:
            return
        self.image = self.undo_stack.pop()
        self._render()

    def _reset(self):
        self._push_undo()
        self.image = self.original.copy()
        self._render()

    def _apply(self):
        self.on_apply(self.image.copy())
        self.win.destroy()

    def _render(self):
        box = (max(1, self.canvas.winfo_width()), max(1, self.canvas.winfo_height()))
        if box[0] < 20 or box[1] < 20:
            box = (EDGE_EDITOR_W, EDGE_EDITOR_H)

        board = make_checkerboard(box, tile=14)
        thumb = self.image.copy()
        thumb.thumbnail(box, Image.LANCZOS)
        self._scale = thumb.width / self.image.width if self.image.width else 1.0
        self._offset = ((box[0] - thumb.width) // 2, (box[1] - thumb.height) // 2)
        board.paste(thumb, self._offset, thumb)

        tk_img = ImageTk.PhotoImage(board)
        self.canvas._tk_img = tk_img
        self.canvas.delete("all")
        self.canvas.create_image(0, 0, anchor="nw", image=tk_img)
        self.info.configure(
            text=(
                f"{self.image.width} x {self.image.height}  •  "
                f"Modo: {self.mode.get()}  •  Pincel: {self.brush_size.get()} px"
            )
        )


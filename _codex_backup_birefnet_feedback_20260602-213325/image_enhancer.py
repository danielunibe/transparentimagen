#!/usr/bin/env python3
"""
╔══════════════════════════════════════╗
║   IMAGE ENHANCER — Unova Games       ║
║   v1.0 · AI Background Removal       ║
║         + Quality Upscaling          ║
╚══════════════════════════════════════╝

Dependencias:
    pip install rembg Pillow

Uso:
    python image_enhancer.py
"""

import argparse
import sys
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageTk, ImageFilter, ImageEnhance, ImageDraw
import threading
import io
from pathlib import Path

# ── rembg (AI background removal) ──────────────────────────────────────────
try:
    from rembg import remove, new_session
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False

try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

# ── Paleta / Constantes ────────────────────────────────────────────────────
PREVIEW_W  = 355
PREVIEW_H  = 430
SINGLE_PREVIEW_W = 735
SINGLE_PREVIEW_H = 500
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

REMBG_MODELS = [
    ("bria-rmbg",             "bria-rmbg             <- IA especializada"),
    ("birefnet-general",      "birefnet-general      <- maxima precision"),
    ("birefnet-general-lite", "birefnet-general-lite <- rapido/preciso"),
    ("birefnet-hrsod",        "birefnet-hrsod        <- objeto destacado"),
    ("birefnet-dis",          "birefnet-dis          <- siluetas complejas"),
    ("birefnet-portrait",     "birefnet-portrait     <- retratos"),
    ("isnet-general-use",     "isnet-general-use     <- general estable"),
    ("isnet-anime",           "isnet-anime           <- ilustracion/anime"),
    ("u2net",                 "u2net                 <- equilibrado"),
    ("u2net_human_seg",       "u2net_human_seg       <- personas"),
    ("silueta",               "silueta               <- rapido/simple"),
]
MODEL_KEYS    = [k for k, _ in REMBG_MODELS]
MODEL_LABELS  = [v for _, v in REMBG_MODELS]
MODEL_BY_LABEL = {label: key for key, label in REMBG_MODELS}
DEFAULT_MODEL_KEY = "u2net"
DEFAULT_MODEL_INDEX = MODEL_KEYS.index(DEFAULT_MODEL_KEY)


# ── Helpers ────────────────────────────────────────────────────────────────

def make_checkerboard(size: tuple[int, int], tile: int = 12) -> Image.Image:
    """Tablero de ajedrez para visualizar transparencia."""
    w, h = size
    img  = Image.new("RGB", (w, h), (195, 195, 195))
    draw = ImageDraw.Draw(img)
    for y in range(0, h, tile * 2):
        for x in range(0, w, tile * 2):
            draw.rectangle([x + tile, y,        x + tile*2 - 1, y + tile - 1],    fill=(155, 155, 155))
            draw.rectangle([x,        y + tile,  x + tile - 1,  y + tile*2 - 1], fill=(155, 155, 155))
    return img.convert("RGBA")


def upscale_image(img: Image.Image, factor: int,
                  sharpness: float = 1.3,
                  contrast: float  = 1.05) -> Image.Image:
    """
    Pipeline de upscaling de calidad:
        1. Sharpen previo
        2. Resize LANCZOS (mejor kernel PIL)
        3. Unsharp Mask post-resize para recuperar detalle
        4. Leve boost de contraste
    Preserva canal alfa.
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    r, g, b, a = img.split()
    rgb = Image.merge("RGB", (r, g, b))

    # 1 · Pre-sharpen
    rgb = ImageEnhance.Sharpness(rgb).enhance(sharpness)

    # 2 · Upscale con LANCZOS
    nw, nh = rgb.width * factor, rgb.height * factor
    rgb = rgb.resize((nw, nh), Image.LANCZOS)
    a   = a.resize((nw, nh), Image.LANCZOS)

    # 3 · Unsharp Mask (recupera micro-detalle perdido en resize)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=1.5, percent=130, threshold=2))

    # 4 · Contraste
    rgb = ImageEnhance.Contrast(rgb).enhance(contrast)

    r2, g2, b2 = rgb.split()
    return Image.merge("RGBA", (r2, g2, b2, a))


def remove_background(
    img: Image.Image,
    session,
    alpha_matting: bool = True,
    post_process_mask: bool = True,
) -> Image.Image:
    """Remueve fondo usando rembg → devuelve RGBA con transparencia."""
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    result_bytes = remove(
        buf.read(),
        session=session,
        alpha_matting=alpha_matting,
        alpha_matting_foreground_threshold=240,
        alpha_matting_background_threshold=10,
        alpha_matting_erode_size=8,
        post_process_mask=post_process_mask,
    )
    return Image.open(io.BytesIO(result_bytes)).convert("RGBA")


def clean_alpha_artifacts(
    img: Image.Image,
    min_area_ratio: float = 0.0015,
    keep_largest: bool = False,
    alpha_threshold: int = 8,
) -> Image.Image:
    """Elimina islas pequeñas de alfa sin alterar los colores visibles."""
    if img.mode != "RGBA" or not CV2_AVAILABLE:
        return img

    arr = np.array(img)
    alpha = arr[:, :, 3]
    mask = (alpha > alpha_threshold).astype("uint8")
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
    if num_labels <= 1:
        return img

    if keep_largest:
        largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        keep = {largest}
    else:
        min_area = max(16, int(img.width * img.height * min_area_ratio))
        keep = {
            idx
            for idx in range(1, num_labels)
            if stats[idx, cv2.CC_STAT_AREA] >= min_area
        }
        if not keep:
            keep = {1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))}

    cleaned_mask = np.isin(labels, list(keep))
    arr[:, :, 3] = np.where(cleaned_mask, alpha, 0).astype("uint8")
    return Image.fromarray(arr, "RGBA")


def fit_into(img: Image.Image, box: tuple[int, int]) -> Image.Image:
    """Redimensiona manteniendo aspect ratio para caber en box."""
    thumb = img.copy()
    thumb.thumbnail(box, Image.LANCZOS)
    return thumb


def composite_on_checkerboard(img: Image.Image, box: tuple[int, int]) -> Image.Image:
    """Coloca la imagen sobre un tablero de ajedrez para la preview."""
    board = make_checkerboard(box)
    thumb = fit_into(img, box)
    if thumb.mode != "RGBA":
        thumb = thumb.convert("RGBA")
    x = (box[0] - thumb.width)  // 2
    y = (box[1] - thumb.height) // 2
    board.paste(thumb, (x, y), thumb)
    return board


def make_split_preview(before: Image.Image, after: Image.Image, box: tuple[int, int]) -> Image.Image:
    """Crea una comparacion vertical antes/despues dentro del mismo lienzo."""
    left = composite_on_checkerboard(before, box)
    right = composite_on_checkerboard(after, box)
    mid = box[0] // 2
    split = left.copy()
    split.paste(right.crop((mid, 0, box[0], box[1])), (mid, 0))
    draw = ImageDraw.Draw(split)
    draw.line((mid, 0, mid, box[1]), fill=(124, 106, 255, 255), width=3)
    draw.rectangle((mid - 22, 14, mid + 22, 40), fill=(17, 17, 19, 220), outline=(124, 106, 255, 255))
    draw.text((mid - 12, 20), "A/B", fill=(226, 226, 232, 255))
    return split


# ── App principal ──────────────────────────────────────────────────────────

class ImageEnhancerApp:

    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Image Enhancer — Unova")
        self.root.configure(bg=BG)
        self.root.resizable(True, True)

        # Estado
        self.input_image:  Image.Image | None = None
        self.output_image: Image.Image | None = None
        self.input_path:   Path | None        = None
        self._session      = None
        self._session_model: str = ""
        self._processing   = False
        self.view_mode     = tk.StringVar(value="compare")
        self._view_btns: dict[str, tk.Button] = {}

        self._build_ui()
        self.root.minsize(1060, 720)
        self._center_window(1160, 760)

    # ── Layout ────────────────────────────────────────────────────────────

    def _build_ui(self):
        # ─ Header ─────────────────────────────────────────────────────────
        hdr = tk.Frame(self.root, bg=BG, pady=10)
        hdr.pack(fill="x", padx=20)

        tk.Label(hdr, text="✦ IMAGE ENHANCER",
                 font=("Consolas", 13, "bold"), fg=ACCENT, bg=BG).pack(side="left")
        tk.Label(hdr, text=" — Unova Games Studio",
                 font=("Consolas", 9), fg=TEXT_DIM, bg=BG).pack(side="left")

        if not REMBG_AVAILABLE:
            tk.Label(hdr, text="⚠ rembg no instalado",
                     font=("Consolas", 8), fg=WARNING, bg=BG).pack(side="right")
        elif not CV2_AVAILABLE:
            tk.Label(hdr, text="cv2 no disponible: limpieza limitada",
                     font=("Consolas", 8), fg=WARNING, bg=BG).pack(side="right")

        # ─ Divider ────────────────────────────────────────────────────────
        tk.Frame(self.root, bg=BORDER, height=1).pack(fill="x", padx=20)

        # ─ Contenido principal ────────────────────────────────────────────
        main = tk.Frame(self.root, bg=BG)
        main.pack(fill="both", expand=True, padx=20, pady=12)

        # Panel izquierdo (controles)
        left = tk.Frame(main, bg=PANEL, bd=0, padx=18, pady=18)
        left.pack(side="left", fill="y", padx=(0, 12))
        left.configure(width=300)
        left.pack_propagate(False)

        self._build_left_panel(left)

        # Panel derecho (previews)
        right = tk.Frame(main, bg=BG)
        right.pack(side="left", fill="both", expand=True)

        self._build_preview_panel(right)

        # ─ Status bar ─────────────────────────────────────────────────────
        tk.Frame(self.root, bg=BORDER, height=1).pack(fill="x", padx=20)

        status_bar = tk.Frame(self.root, bg=PANEL, pady=7)
        status_bar.pack(fill="x", padx=20, pady=(0, 14))

        self.status_lbl = tk.Label(
            status_bar, text="● Listo para comenzar",
            font=("Consolas", 8), fg=TEXT_DIM, bg=PANEL)
        self.status_lbl.pack(side="left", padx=10)

        self.progress = ttk.Progressbar(status_bar, mode="indeterminate", length=140)
        self.progress.pack(side="right", padx=10)

    def _build_left_panel(self, parent):
        # ─ Sección: Cargar ────────────────────────────────────────────────
        self._section_label(parent, "IMAGEN")

        self.load_btn = tk.Button(
            parent, text="📁  Cargar imagen",
            command=self._load_image,
            bg=ACCENT, fg="white",
            font=("Consolas", 9, "bold"),
            relief="flat", cursor="hand2",
            padx=10, pady=8, anchor="w")
        self.load_btn.pack(fill="x", pady=(0, 4))

        self.file_lbl = tk.Label(
            parent, text="Sin archivo cargado",
            font=("Consolas", 7), fg=TEXT_DIM, bg=PANEL,
            anchor="w", wraplength=260, justify="left")
        self.file_lbl.pack(fill="x", pady=(0, 14))

        # ─ Sección: Operaciones ───────────────────────────────────────────
        self._section_label(parent, "OPERACIONES")

        # Remover fondo
        self.do_rembg = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Remover fondo (transparencia)",
            variable=self.do_rembg,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=("Consolas", 9),
            cursor="hand2").pack(anchor="w")

        mdl_row = tk.Frame(parent, bg=PANEL)
        mdl_row.pack(fill="x", pady=(3, 10))
        tk.Label(mdl_row, text="  Modelo :", font=("Consolas", 7), fg=TEXT_DIM, bg=PANEL).pack(side="left")
        self.model_var = tk.StringVar(value=MODEL_LABELS[DEFAULT_MODEL_INDEX])
        self.model_cb  = ttk.Combobox(mdl_row, textvariable=self.model_var,
                                       values=MODEL_LABELS, width=27,
                                       font=("Consolas", 7), state="readonly")
        self.model_cb.pack(side="left", padx=4)
        self.model_cb.current(DEFAULT_MODEL_INDEX)
        self.model_cb.bind("<<ComboboxSelected>>", self._on_model_change)

        self.do_alpha_matting = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Borde IA fino (alpha matting)",
            variable=self.do_alpha_matting,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=("Consolas", 8),
            cursor="hand2").pack(anchor="w")

        self.do_post_process = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Postprocesar mascara",
            variable=self.do_post_process,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=("Consolas", 8),
            cursor="hand2").pack(anchor="w")

        self.do_cleanup = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Limpiar objetos/restos sueltos",
            variable=self.do_cleanup,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=("Consolas", 8),
            cursor="hand2").pack(anchor="w")

        self.keep_main_object = tk.BooleanVar(value=False)
        tk.Checkbutton(
            parent, text="Mantener solo objeto principal",
            variable=self.keep_main_object,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=("Consolas", 8),
            cursor="hand2").pack(anchor="w", pady=(0, 4))

        tk.Label(parent, text="Limpieza minima de restos (%)",
                 font=("Consolas", 7), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.cleanup_var = tk.DoubleVar(value=0.15)
        tk.Scale(parent, from_=0.0, to=2.0, resolution=0.05,
                 orient="horizontal", variable=self.cleanup_var,
                 bg=PANEL, fg=TEXT, troughcolor=BORDER,
                 highlightthickness=0, font=("Consolas", 7),
                 length=260).pack(fill="x", pady=(0, 8))

        # Upscale
        self.do_upscale = tk.BooleanVar(value=True)
        tk.Checkbutton(
            parent, text="Mejorar calidad (upscale AI)",
            variable=self.do_upscale,
            bg=PANEL, fg=TEXT, activebackground=PANEL,
            selectcolor=PANEL2, font=("Consolas", 9),
            cursor="hand2").pack(anchor="w")

        factor_row = tk.Frame(parent, bg=PANEL)
        factor_row.pack(fill="x", pady=(3, 14))
        tk.Label(factor_row, text="  Factor :", font=("Consolas", 7), fg=TEXT_DIM, bg=PANEL).pack(side="left")

        self.factor_var  = tk.IntVar(value=2)
        self._factor_btns: dict[int, tk.Button] = {}
        for f in (2, 3, 4):
            btn = tk.Button(
                factor_row, text=f"{f}×",
                command=lambda v=f: self._set_factor(v),
                bg=ACCENT if f == 2 else PANEL2,
                fg="white" if f == 2 else TEXT_DIM,
                font=("Consolas", 8, "bold"), relief="flat",
                padx=9, pady=2, cursor="hand2", width=3)
            btn.pack(side="left", padx=2)
            self._factor_btns[f] = btn

        # ─ Sección: Ajustes ───────────────────────────────────────────────
        self._section_label(parent, "AJUSTES MANUALES")

        tk.Label(parent, text="Nitidez  (pre-upscale)",
                 font=("Consolas", 7), fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        self.sharp_var = tk.DoubleVar(value=1.3)
        tk.Scale(parent, from_=1.0, to=3.0, resolution=0.1,
                 orient="horizontal", variable=self.sharp_var,
                 bg=PANEL, fg=TEXT, troughcolor=BORDER,
                 highlightthickness=0, font=("Consolas", 7),
                 length=225).pack(fill="x")

        tk.Label(parent, text="Contraste  (post-upscale)",
                 font=("Consolas", 7), fg=TEXT_DIM, bg=PANEL).pack(anchor="w", pady=(6, 0))
        self.contrast_var = tk.DoubleVar(value=1.05)
        tk.Scale(parent, from_=1.0, to=1.8, resolution=0.05,
                 orient="horizontal", variable=self.contrast_var,
                 bg=PANEL, fg=TEXT, troughcolor=BORDER,
                 highlightthickness=0, font=("Consolas", 7),
                 length=225).pack(fill="x")

        # ─ Spacer + botón ─────────────────────────────────────────────────
        tk.Frame(parent, bg=PANEL).pack(expand=True, fill="y")

        self.process_btn = tk.Button(
            parent, text="▶  PROCESAR",
            command=self._start_processing,
            bg=PANEL2, fg=TEXT_DIM,
            font=("Consolas", 11, "bold"),
            relief="flat", cursor="hand2",
            padx=10, pady=10)
        self.process_btn.pack(fill="x", pady=(10, 0))

    def _build_preview_panel(self, parent):
        view_bar = tk.Frame(parent, bg=BG)
        view_bar.pack(fill="x", pady=(0, 8))

        tk.Label(view_bar, text="VISTA", font=("Consolas", 8, "bold"),
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
                bg=ACCENT if key == "compare" else PANEL,
                fg="white" if key == "compare" else TEXT_DIM,
                font=("Consolas", 8, "bold"), relief="flat",
                cursor="hand2", padx=11, pady=4)
            btn.pack(side="left", padx=(0, 5))
            self._view_btns[key] = btn

        self.compare_frame = tk.Frame(parent, bg=BG)
        self.compare_frame.pack(fill="both", expand=True)

        self.before_canvas, self.before_info = self._make_preview_block(
            self.compare_frame, "ORIGINAL", side="left", pad=(0, 6))

        self.after_canvas, self.after_info = self._make_preview_block(
            self.compare_frame, "RESULTADO", side="left", pad=(6, 0))

        self.single_frame = tk.Frame(parent, bg=PANEL, padx=10, pady=10)
        self.single_title = tk.Label(
            self.single_frame, text="PREVIEW",
            font=("Consolas", 8, "bold"), fg=TEXT_DIM, bg=PANEL)
        self.single_title.pack(anchor="w")
        tk.Frame(self.single_frame, bg=BORDER, height=1).pack(fill="x", pady=(2, 6))

        self.single_canvas = tk.Canvas(
            self.single_frame, width=SINGLE_PREVIEW_W, height=SINGLE_PREVIEW_H,
            bg="#0D0D10", highlightthickness=1,
            highlightbackground=BORDER)
        self.single_canvas.pack(fill="both", expand=True)

        self.single_info = tk.Label(
            self.single_frame, text="—",
            font=("Consolas", 7), fg=TEXT_DIM, bg=PANEL)
        self.single_info.pack(pady=(5, 0))

        # Guardar
        save_frame = tk.Frame(parent, bg=BG)
        save_frame.pack(fill="x", pady=(8, 0))

        self.save_btn = tk.Button(
            save_frame, text="💾  Guardar como PNG",
            command=self._save_output,
            bg=PANEL, fg=TEXT_DIM,
            font=("Consolas", 9), relief="flat",
            cursor="hand2", padx=10, pady=7,
            state="disabled")
        self.save_btn.pack(fill="x")

    def _make_preview_block(self, parent, title, side, pad):
        padx = pad
        frame = tk.Frame(parent, bg=PANEL, padx=10, pady=10)
        frame.pack(side=side, fill="both", expand=True, padx=padx)

        tk.Label(frame, text=title, font=("Consolas", 8, "bold"),
                 fg=TEXT_DIM, bg=PANEL).pack(anchor="w")
        tk.Frame(frame, bg=BORDER, height=1).pack(fill="x", pady=(2, 6))

        canvas = tk.Canvas(
            frame, width=PREVIEW_W, height=PREVIEW_H,
            bg="#0D0D10", highlightthickness=1,
            highlightbackground=BORDER)
        canvas.pack()

        info = tk.Label(frame, text="—",
                        font=("Consolas", 7), fg=TEXT_DIM, bg=PANEL)
        info.pack(pady=(5, 0))

        return canvas, info

    # ── Helpers UI ────────────────────────────────────────────────────────

    def _section_label(self, parent, text):
        tk.Label(parent, text=text, font=("Consolas", 8, "bold"),
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
                bg=ACCENT if f == value else PANEL2,
                fg="white" if f == value else TEXT_DIM)

    def _on_model_change(self, event):
        # Fuerza recrear sesión
        self._session = None
        self._session_model = ""

    def _selected_model_key(self) -> str:
        idx = self.model_cb.current()
        if 0 <= idx < len(MODEL_KEYS):
            return MODEL_KEYS[idx]
        return MODEL_BY_LABEL.get(self.model_var.get(), DEFAULT_MODEL_KEY)

    def _set_view_mode(self, mode: str):
        self.view_mode.set(mode)
        for key, btn in self._view_btns.items():
            btn.configure(
                bg=ACCENT if key == mode else PANEL,
                fg="white" if key == mode else TEXT_DIM)
        self._render_previews()

    def _set_status(self, msg: str, color: str = TEXT_DIM):
        self.status_lbl.configure(text=f"● {msg}", fg=color)

    def _show_in_canvas(self, canvas: tk.Canvas, img: Image.Image, box: tuple[int, int]):
        composed = composite_on_checkerboard(img, box)
        tk_img   = ImageTk.PhotoImage(composed)
        canvas._tk_img = tk_img           # evita garbage collection
        canvas.delete("all")
        canvas.create_image(0, 0, anchor="nw", image=tk_img)

    def _show_raw_preview(self, canvas: tk.Canvas, img: Image.Image, box: tuple[int, int]):
        tk_img = ImageTk.PhotoImage(img)
        canvas._tk_img = tk_img
        canvas.delete("all")
        canvas.create_image(0, 0, anchor="nw", image=tk_img)

    def _render_previews(self):
        if self.input_image:
            self._show_in_canvas(self.before_canvas, self.input_image, (PREVIEW_W, PREVIEW_H))
            self.before_info.configure(
                text=f"{self.input_image.width} × {self.input_image.height}  •  {self.input_image.mode}")
        else:
            self.before_canvas.delete("all")
            self.before_info.configure(text="—")

        if self.output_image:
            self._show_in_canvas(self.after_canvas, self.output_image, (PREVIEW_W, PREVIEW_H))
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

        box = (SINGLE_PREVIEW_W, SINGLE_PREVIEW_H)
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
            self._render_previews()

            # Activar botón procesar
            self.process_btn.configure(bg=ACCENT, fg="white")
            self._set_status("Imagen cargada — listo para procesar", SUCCESS)

        except Exception as e:
            messagebox.showerror("Error al cargar", str(e))

    def _start_processing(self):
        if not self.input_image:
            messagebox.showwarning("Sin imagen", "Carga una imagen primero.")
            return
        if self._processing:
            return
        if not self.do_rembg.get() and not self.do_upscale.get():
            messagebox.showwarning("Sin operación", "Activa al menos una operación.")
            return

        self._processing = True
        self.process_btn.configure(state="disabled", bg=BORDER, text="⏳  Procesando...")
        self.save_btn.configure(state="disabled", bg=PANEL, fg=TEXT_DIM)
        self.progress.start(12)

        threading.Thread(target=self._process_thread, daemon=True).start()

    def _process_thread(self):
        try:
            img = self.input_image.copy()
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGBA")

            # ─── Paso 1: Remove background ─────────────────────────────
            if self.do_rembg.get():
                if not REMBG_AVAILABLE:
                    self.root.after(0, lambda: messagebox.showerror(
                        "rembg no instalado",
                        "Ejecuta instalar.bat para instalar las dependencias locales.\n\n"
                        "La primera ejecucion descarga el modelo de IA en:\n"
                        "%USERPROFILE%\\.u2net"))
                    self.root.after(0, self._on_error)
                    return

                model_key = self._selected_model_key()
                self._update_status("Cargando modelo IA...", TEXT_DIM)

                # Crear/reutilizar sesión
                if self._session is None or self._session_model != model_key:
                    self._session       = new_session(model_key)
                    self._session_model = model_key

                self._update_status(f"Removiendo fondo con {model_key}...", TEXT_DIM)
                img = remove_background(
                    img,
                    self._session,
                    alpha_matting=self.do_alpha_matting.get(),
                    post_process_mask=self.do_post_process.get(),
                )
                if self.do_cleanup.get():
                    self._update_status("Limpiando restos sueltos...", TEXT_DIM)
                    img = clean_alpha_artifacts(
                        img,
                        min_area_ratio=self.cleanup_var.get() / 100,
                        keep_largest=self.keep_main_object.get(),
                    )
                self._update_status("Fondo removido ✓", SUCCESS)

            # ─── Paso 2: Upscale ───────────────────────────────────────
            if self.do_upscale.get():
                factor   = self.factor_var.get()
                sharpness = self.sharp_var.get()
                contrast  = self.contrast_var.get()
                self._update_status(f"Upscaling {factor}× con LANCZOS + sharpen...", TEXT_DIM)
                img = upscale_image(img, factor, sharpness, contrast)
                self._update_status(f"Calidad mejorada {factor}× ✓", SUCCESS)

            self.output_image = img
            self.root.after(0, self._on_done)

        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            self.root.after(0, lambda: messagebox.showerror(
                "Error en procesamiento",
                f"{e}\n\n"
                "Si el error ocurrio al cargar el modelo, verifica conexion a internet "
                "en la primera descarga y que exista espacio libre en %USERPROFILE%\\.u2net.\n\n"
                f"Detalle:\n{tb[:700]}"))
            self.root.after(0, self._on_error)

    def _on_done(self):
        self._processing = False
        self.progress.stop()
        self.process_btn.configure(state="normal", bg=ACCENT, fg="white", text="▶  PROCESAR")

        self._render_previews()

        self.save_btn.configure(state="normal", bg=ACCENT, fg="white")
        self._set_status("Proceso completado ✓", SUCCESS)

    def _on_error(self):
        self._processing = False
        self.progress.stop()
        self.process_btn.configure(state="normal", bg=ACCENT, fg="white", text="▶  PROCESAR")
        self._set_status("Error — revisa la consola", ERROR)

    def _update_status(self, msg: str, color: str = TEXT_DIM):
        self.root.after(0, lambda: self._set_status(msg, color))

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


def run_smoke() -> int:
    """Headless runtime validation for installs and packaged builds."""
    if not REMBG_AVAILABLE:
        print("FAIL: rembg is not installed", file=sys.stderr)
        return 1

    try:
        import onnxruntime  # noqa: F401
    except Exception as exc:
        print(f"FAIL: onnxruntime import failed: {exc}", file=sys.stderr)
        return 1

    try:
        img = Image.new("RGBA", (12, 8), (120, 80, 40, 180))
        up = upscale_image(img, 2, 1.3, 1.05)
        preview = composite_on_checkerboard(up, (64, 64))
        split = make_split_preview(img, up, (96, 64))
        cleaned = clean_alpha_artifacts(up, min_area_ratio=0.001, keep_largest=False)
        assert up.size == (24, 16)
        assert up.mode == "RGBA"
        assert preview.size == (64, 64)
        assert preview.mode == "RGBA"
        assert split.size == (96, 64)
        assert cleaned.mode == "RGBA"
    except Exception as exc:
        print(f"FAIL: image pipeline smoke failed: {exc}", file=sys.stderr)
        return 1

    print("OK: smoke validation passed")
    return 0


def run_rembg_smoke(model_key: str) -> int:
    """Validate a real rembg session and processing pass."""
    if model_key not in MODEL_KEYS:
        print(f"FAIL: unsupported model {model_key}", file=sys.stderr)
        return 1
    if not REMBG_AVAILABLE:
        print("FAIL: rembg is not installed", file=sys.stderr)
        return 1

    try:
        img = Image.new("RGB", (96, 96), "white")
        draw = ImageDraw.Draw(img)
        draw.rounded_rectangle([22, 18, 74, 78], radius=12, fill=(220, 45, 45))
        session = new_session(model_key)
        result = remove_background(img, session, alpha_matting=True, post_process_mask=True)
        result = clean_alpha_artifacts(result, min_area_ratio=0.0015, keep_largest=False)
        if result.mode != "RGBA":
            raise RuntimeError(f"expected RGBA output, got {result.mode}")
        print(f"OK: rembg smoke passed with {model_key} ({result.width}x{result.height})")
        return 0
    except Exception as exc:
        print(f"FAIL: rembg smoke failed with {model_key}: {exc}", file=sys.stderr)
        return 1


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Image Enhancer - Unova Games Studio")
    parser.add_argument("--smoke", action="store_true", help="Run headless runtime validation.")
    parser.add_argument(
        "--smoke-rembg",
        action="store_true",
        help="Run a real rembg model/session validation. May download the model on first use.",
    )
    parser.add_argument(
        "--model",
        choices=MODEL_KEYS,
        default="silueta",
        help="Model used by --smoke-rembg.",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.smoke:
        return run_smoke()
    if args.smoke_rembg:
        return run_rembg_smoke(args.model)

    root = tk.Tk()
    app  = ImageEnhancerApp(root)
    root.mainloop()
    return 0


# ── Entry point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    raise SystemExit(main())

# ✦ Image Enhancer — Unova Games Studio

Herramienta local para:
- **Remover fondo** con IA (U2Net / ISNet / BiRefNet) → PNG con transparencia real
- **Mejorar calidad** con upscaling inteligente (LANCZOS + Unsharp Mask)
- **Control de nitidez y contraste** manual

---

## Instalación rápida (Windows)

```
doble click → instalar.bat
```

O manualmente:
```bash
pip install rembg Pillow
python image_enhancer.py
```

---

## Uso

1. **Cargar imagen** — PNG, JPG, WEBP, BMP, TIFF
2. Activar/desactivar operaciones:
   - ☑ Remover fondo → PNG con canal alfa
   - ☑ Mejorar calidad → upscale 2×/3×/4×
3. Ajustar nitidez y contraste si se desea
4. **PROCESAR** → ver preview antes/después
5. **Guardar PNG** (con transparencia) o JPG

---

## Modelos de remoción de fondo

| Modelo              | Recomendado para         |
|---------------------|--------------------------|
| isnet-general-use   | ← Todo tipo de objetos   |
| u2net               | General, equilibrado     |
| u2net_human_seg     | Personas / retratos      |
| birefnet-general    | Alta precisión / cabello |
| silueta             | Siluetas simples         |

> La primera ejecución descarga el modelo seleccionado (~170 MB). Solo una vez.

---

## Pipeline de upscaling

```
Imagen original
   ↓ Sharpen previo (controla nitidez)
   ↓ Resize LANCZOS ×2/3/4
   ↓ Unsharp Mask (recupera micro-detalle)
   ↓ Boost contraste
Imagen mejorada (preserva canal alfa)
```

---

## Dependencias

- `rembg` — AI background removal
- `Pillow` — procesamiento de imágenes
- `tkinter` — UI (incluido en Python estándar)

---

*Unova Games Studio · Voyager 2026*

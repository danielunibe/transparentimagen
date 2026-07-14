# PIPELINE_ROADMAP.md

## 1. Proposito

Este documento define el pipeline maestro para convertir Image Enhancer en una herramienta local modular de IA para imagenes, assets y flujos UE5.

Regla central:

- Primero se estabiliza la base.
- Luego se integran modulos por familia.
- Cada modulo entra con fallback.
- Nada pesado se descarga o instala solo por estar en el roadmap.
- Cada fase debe quedar usable de forma independiente.

## 2. Estado actual

### Fase 0 - Base funcional inicial

- Estado: completada.
- Resultado: app Tkinter local para cargar imagen, quitar fondo, previsualizar, refinar bordes y guardar.
- Stack real: Python 3.10, Tkinter, Pillow, rembg, ONNX Runtime, PyInstaller.
- Protegido: flujo cargar -> procesar -> preview -> guardar.

### Fase 1 - GPU, Real-ESRGAN y ModelManager

- Estado: completada.
- Resultado: ONNX Runtime GPU/CPU fallback, Real-ESRGAN ONNX como motor principal, LANCZOS como fallback.
- Resultado: `ModelManager` evita recargar sesiones ONNX.
- Pendiente externo: instalar/verificar CUDA 12.x y cuDNN 9.x para activar CUDA real.
- Evidencia actual: RTX detectada, `CUDAExecutionProvider` instalado, pero faltan DLLs CUDA/cuDNN; CPU fallback funciona.

### Fase 2 - Modularizacion base

- Estado: completada.
- Resultado: split en `models.py`, `pipeline.py`, `ui.py`, `main.py`.
- Resultado: `image_enhancer.py` queda como CLI compatible.
- Resultado: `ProcessingOptions`, `ProcessingResult`, `CancellationToken`, `ModuleSpec` y `ModuleRegistry`.
- Resultado: preview rapido 25%, render final separado y worker cancelable.
- Resultado: panel `MODULOS IA` con estados visibles.

## 3. Pipeline operativo actual

```txt
Imagen de entrada
  -> Preview rapido 25% o render final
  -> Segmentacion base/rembg
  -> Limpieza de alfa
  -> Despill / feather
  -> Upscale Real-ESRGAN o LANCZOS fallback
  -> Face recovery externo opcional
  -> Resultado RGBA
  -> Refinado manual opcional
  -> Export PNG/JPG
```

## 4. Modulos registrados actualmente

| Modulo | Familia | Estado actual | Que hace hoy |
|---|---|---|---|
| `segmentation_birefnet` | Segmentacion | listo | activa `birefnet-general` dentro de rembg |
| `upscale_realesrgan` | Restauracion | fallback si CUDA incompleto | usa Real-ESRGAN ONNX; LANCZOS si falla |
| `portrait_codeformer` | Retratos | fallback si no hay script externo | prepara face recovery externo |
| `quality_pyiqa` | Calidad automatica | no instalado | registrado para scoring futuro |
| `ue5_depth` | UE5 Texture Tools | no instalado | registrado para Depth Anything v2 |
| `ue5_normal_map` | UE5 Texture Tools | no instalado | registrado para normal map IA |
| `color_zero_dce` | Luz + color | no instalado | registrado para correccion de luz |
| `creative_comfyui` | Creativa | no instalado | registrado para backend ComfyUI opcional |
| `production_batch` | Produccion | no instalado | registrado para batch/presets/export profiles |

## 5. Fases que faltan

### Fase 3 - Estabilizacion y CUDA real

- Objetivo: dejar el runtime GPU realmente activo o documentar fallback final.
- Cambios:
  - Validar CUDA 12.x y cuDNN 9.x en Windows.
  - Repetir smokes con `CUDAExecutionProvider` activo.
  - Mostrar provider real en UI de forma confiable.
  - No tocar modelos nuevos.
- Exito:
  - `Real-ESRGAN` y `rembg` reportan provider activo CUDA, o el fallback CPU queda aceptado/documentado como estado operativo.
- Prioridad: alta.

### Fase 4 - Segmentacion premium

- Objetivo: mejorar recortes complejos antes de construir IA creativa.
- Orden:
  - Consolidar `birefnet-general` como preset premium.
  - Agregar comparacion rapida `u2net` vs `birefnet-general`.
  - Preparar UI de seleccion por objeto para futuro SAM.
- No hacer todavia:
  - No instalar SAM ni Grounded-SAM.
  - No crear editor de cajas hasta que el flujo de BiRefNet quede estable.
- Exito:
  - El usuario puede elegir segmentacion rapida o premium desde `MODULOS IA`.
  - El flujo actual de refinado de bordes se conserva.
- Prioridad: alta.

### Fase 5 - UE5 Texture Tools v1

- Objetivo: crear la primera diferencia fuerte del producto: foto -> recursos tecnicos para Unreal Engine.
- Orden:
  - Implementar export profile `UE5 Texture Set`.
  - Agregar salida `albedo.png` desde la imagen procesada.
  - Integrar `ue5_depth` cuando se valide un modelo ONNX viable.
  - Generar `depth.png`.
  - Despues agregar `normal.png`.
- No hacer todavia:
  - No integrar Stable Zero123.
  - No meter modelos 3D pesados.
- Exito:
  - Exportar una carpeta con nombres estables para UE5.
  - La app sigue funcionando aunque falte el modelo depth.
- Prioridad: muy alta por diferenciacion.

### Fase 6 - Calidad automatica

- Objetivo: que la app mida si una imagen mejoro o empeoro.
- Orden:
  - Registrar metricas simples sin dependencia: tamano, alfa, modo, warnings.
  - Evaluar PyIQA como modulo opcional.
  - Mostrar `score` solo si esta disponible.
- No hacer todavia:
  - No autoajustar todo el pipeline hasta tener evidencia.
- Exito:
  - `ProcessingResult.metrics` incluye datos visibles y no rompe export.
- Prioridad: media-alta.

### Fase 7 - Retratos local avanzado

- Objetivo: mejorar caras sin convertir el EXE en un monstruo de dependencias.
- Orden:
  - Mantener CodeFormer externo.
  - Validar si existe ruta ONNX local confiable.
  - Evaluar GFPGAN solo si no exige PyTorch dentro del EXE.
  - Agregar detector facial solo si desbloquea recorte/mezcla real.
- No hacer todavia:
  - No meter PyTorch al runtime principal.
- Exito:
  - Retratos mejoran como capa opcional y con fallback.
- Prioridad: media.

### Fase 8 - Luz, color y restauracion

- Objetivo: mejorar fotos oscuras, planas o con ruido.
- Orden:
  - Zero-DCE o DeepWB primero, por impacto y UI simple.
  - Despues SwinIR/HAT/BSRGAN segun modelo ONNX viable.
  - NAFNet solo si el caso de ruido lo justifica.
- Exito:
  - Cada modulo se activa/desactiva y no bloquea el render final si falla.
- Prioridad: media.

### Fase 9 - Produccion

- Objetivo: convertir la herramienta en flujo de trabajo real.
- Orden:
  - Presets guardables.
  - Export profiles.
  - Batch por carpeta.
  - Historial de resultados.
- Exito:
  - Procesar varias imagenes sin repetir configuracion.
- Prioridad: media-alta.

### Fase 10 - Creativa y ComfyUI

- Objetivo: conectar capacidades creativas sin reimplementar todo.
- Orden:
  - ComfyUI API externo opcional.
  - IP-Adapter / img2img solo via backend externo.
  - ControlNet despues.
- No hacer todavia:
  - No hacer Stable Diffusion core dentro de la app base.
- Exito:
  - La app puede delegar a ComfyUI local si existe, sin depender de el para funcionar.
- Prioridad: futura.

### Fase 11 - Video

- Objetivo: procesamiento por frames sin romper el producto de imagenes.
- Orden:
  - Sprint separado.
  - Pipeline de frames.
  - Progreso largo y cancelacion fuerte.
  - Export de video.
- No hacer todavia:
  - No mezclar RIFE/BasicVSR++ con el pipeline de imagen actual.
- Prioridad: futura.

## 6. Siguiente fase recomendada

Recomendacion tecnica:

1. Fase 3: resolver o aceptar CUDA real.
2. Fase 4: segmentacion premium con BiRefNet.
3. Fase 5: UE5 Texture Tools v1.

Motivo:

- CUDA impacta rendimiento de todo.
- Segmentacion mejora el caso actual.
- UE5 Texture Tools diferencia el producto frente a herramientas genericas.

## 7. Reglas para integrar cualquier modulo nuevo

Todo modulo nuevo debe incluir:

- `ModuleSpec`.
- Estado visible en UI.
- Activar/desactivar.
- Validar.
- Smoke test.
- Fallback.
- Cache externa si descarga modelos.
- Documentacion en README y este roadmap.

Prohibido sin autorizacion:

- Instalar dependencias grandes por impulso.
- Empaquetar modelos en el EXE.
- Cambiar Tkinter.
- Meter PyTorch al runtime principal.
- Saltar directamente a video o Stable Diffusion antes de estabilizar segmentacion/UE5.

## 8. Comandos de control

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke
.venv\Scripts\python.exe image_enhancer.py --smoke-modules
.venv\Scripts\python.exe image_enhancer.py --smoke-module ue5_depth
.venv\Scripts\python.exe image_enhancer.py --smoke-realesrgan
.venv\Scripts\python.exe image_enhancer.py --smoke-rembg --model silueta
```

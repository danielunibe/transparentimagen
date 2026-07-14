# PIPELINE_ROADMAP.md

## 1. Proposito

Este documento define el pipeline maestro para convertir Image Enhancer en una herramienta local modular de IA para imagenes, assets y flujos UE5.

Checklist operativo:

- Ver `PIPELINE_CHECKLIST.md` para marcar pasos hechos y pendientes.

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
- Evidencia actual: RTX detectada, `CUDAExecutionProvider` preferido y fallback CPU protegido.

### Fase 2 - Modularizacion base

- Estado: completada.
- Resultado: split en `models.py`, `pipeline.py`, `ui.py`, `main.py`.
- Resultado: `image_enhancer.py` queda como CLI compatible.
- Resultado: `ProcessingOptions`, `ProcessingResult`, `CancellationToken`, `ModuleSpec` y `ModuleRegistry`.
- Resultado: preview rapido 25%, render final separado y worker cancelable.
- Resultado: panel `MODULOS IA` con estados visibles.

### Fase 3 - Estabilizacion y CUDA real

- Estado: completada.
- Resultado: runtime CUDA/cuDNN/cuBLAS/cuFFT local instalado en `.venv` via wheels NVIDIA.
- Resultado: `ModelManager` registra carpetas DLL NVIDIA en `PATH` y `os.add_dll_directory` antes de crear sesiones ONNX.
- Resultado: EXE reconstruido con `--collect-all nvidia` y smoke CUDA obligatorio.
- Evidencia: Python y EXE pasan `--smoke-cuda`, `--smoke-realesrgan` y `--smoke-rembg --model silueta` con `CUDAExecutionProvider` preferido.
- Protegido: CPU/LANCZOS fallback se mantiene para que la app no se bloquee si falta CUDA en otra maquina.

### Fase 4 - Segmentacion premium

- Estado: completada.
- Resultado: `segmentation_birefnet` queda como preset premium claro.
- Resultado: comparacion rapida `u2net` vs `birefnet-general` en preview 25%, con ventana separada y PNG guardable.
- Resultado: base visual para seleccion por objeto futura sin instalar SAM ni Grounded-SAM.
- Protegido: la comparacion no reemplaza `output_image`, no rompe `Refinar bordes` y no toca el render final.

### Fase 5 - UE5 Texture Tools v1

- Estado: completada v1 con mapas IA pendientes.
- Resultado: modulo `ue5_texture_set` implementado como export profile local.
- Resultado: boton `UE5 Set` crea una carpeta estable `*_UE5_Texture_Set`.
- Resultado: exporta `albedo.png` desde la imagen procesada y `texture_manifest.json`.
- Pendiente: `depth.png` y `normal.png` quedan omitidos con fallback hasta validar modelos ONNX viables.
- Protegido: no se instalan Depth Anything, modelos 3D ni Stable Zero123.

### Fase 6 - Calidad automatica

- Estado: completada en modo opcional.
- Resultado: `ProcessingResult.metrics` registra tamano, escala, alfa, modo, warnings, runtime y modulos activos.
- Resultado: la UI muestra metricas basicas en el inspector.
- Resultado: el manifest UE5 conserva las metricas del render.
- Resultado: `quality_pyiqa` queda como scorer opcional; usa `pyiqa` local si existe o `IMAGE_ENHANCER_PYIQA_PYTHON` para un entorno externo.
- Resultado: `score` solo aparece cuando `quality_pyiqa` esta activo y el backend responde.
- Protegido: no hay autoajustes del pipeline sin evidencia.

## 3. Pipeline operativo actual

```txt
Imagen de entrada
  -> Preview rapido 25% o render final
  -> Segmentacion base/rembg
  -> Limpieza de alfa
  -> Despill / feather
  -> Luz/color local opcional
  -> Upscale Real-ESRGAN o LANCZOS fallback
  -> Face recovery externo opcional con crop facial si esta activo
  -> Resultado RGBA
  -> Metricas simples de calidad
  -> Refinado manual opcional
  -> Export PNG/JPG o UE5 Texture Set
```

## 4. Modulos registrados actualmente

| Modulo | Familia | Estado actual | Que hace hoy |
|---|---|---|---|
| `segmentation_birefnet` | Segmentacion | listo | activa `birefnet-general` y compara contra `u2net` |
| `upscale_realesrgan` | Restauracion | listo con CUDA real | usa Real-ESRGAN ONNX; LANCZOS si falla |
| `portrait_codeformer` | Retratos | fallback si no hay script externo | prepara face recovery externo |
| `portrait_face_detector` | Retratos | listo | detecta rostro con OpenCV para aplicar CodeFormer en crop y mezclar |
| `portrait_codeformer_onnx` | Retratos | no instalado | ruta candidata por `IMAGE_ENHANCER_CODEFORMER_ONNX` |
| `portrait_gfpgan_external` | Retratos | opcional | backend externo por `IMAGE_ENHANCER_GFPGAN_SCRIPT` |
| `ue5_texture_set` | UE5 Texture Tools | listo | exporta `albedo.png` y manifest UE5 con fallback depth/normal |
| `quality_pyiqa` | Calidad automatica | opcional | score visible solo si el backend responde |
| `ue5_depth` | UE5 Texture Tools | no instalado | registrado para Depth Anything v2 |
| `ue5_normal_map` | UE5 Texture Tools | no instalado | registrado para normal map IA |
| `color_zero_dce` | Luz + color | no instalado | candidato ONNX con fallback `Luz/color local` |
| `color_deepwb` | Luz + color | no instalado | candidato ONNX con fallback `Luz/color local` |
| `color_local_restore` | Luz + color | listo | autocontraste, brillo/color y denoise suave con Pillow |
| `restoration_swinir` | Restauracion | no instalado | candidato ONNX SwinIR/HAT/BSRGAN segun ruta local viable |
| `restoration_nafnet` | Restauracion | no instalado | candidato ONNX para ruido/artefactos cuando haga falta |
| `creative_comfyui` | Creativa | no instalado | registrado para backend ComfyUI opcional |
| `production_batch` | Produccion | no instalado | registrado para batch/presets/export profiles |

## 5. Fases que faltan

### Fase 3 - Estabilizacion y CUDA real

- Estado: completada.
- Objetivo: dejar el runtime GPU realmente activo o documentar fallback final.
- Cambios:
  - Validar CUDA 12.x y cuDNN 9.x local en `.venv`.
  - Repetir smokes con `CUDAExecutionProvider` activo. Hecho.
  - Mostrar provider real por consola y mantener fallback visible. Hecho.
  - Empaquetar DLLs NVIDIA en EXE `onedir`. Hecho.
  - No tocar modelos nuevos.
- Exito:
  - `Real-ESRGAN` y `rembg` reportan provider activo CUDA; fallback CPU queda aceptado/documentado como estado operativo para otras maquinas.
- Prioridad: alta.

### Fase 4 - Segmentacion premium

- Objetivo: mejorar recortes complejos antes de construir IA creativa.
- Estado: completada.
- Orden:
  - Consolidar `birefnet-general` como preset premium. Hecho.
  - Agregar comparacion rapida `u2net` vs `birefnet-general`. Hecho.
  - Preparar UI de seleccion por objeto para futuro SAM. Hecho como base visual no interactiva.
- No hacer todavia:
  - No instalar SAM ni Grounded-SAM.
  - No crear editor de cajas hasta que el flujo de BiRefNet quede estable.
- Exito:
  - El usuario puede elegir segmentacion rapida o premium desde `MODULOS IA`.
  - El flujo actual de refinado de bordes se conserva.
- Prioridad: alta.

### Fase 5 - UE5 Texture Tools v1

- Objetivo: crear la primera diferencia fuerte del producto: foto -> recursos tecnicos para Unreal Engine.
- Estado: completada v1 con fallback.
- Orden:
  - Implementar export profile `UE5 Texture Set`. Hecho.
  - Agregar salida `albedo.png` desde la imagen procesada. Hecho.
  - Crear carpeta estable y manifest tecnico. Hecho.
  - Validar con `--smoke-ue5-texture-set`. Hecho.
  - Integrar `ue5_depth` cuando se valide un modelo ONNX viable. Pendiente; rutas opcionales preparadas por `IMAGE_ENHANCER_UE5_DEPTH_ONNX` y `--smoke-ue5-candidates`.
  - Generar `depth.png`. Pendiente.
  - Despues agregar `normal.png`. Pendiente; ruta opcional preparada por `IMAGE_ENHANCER_UE5_NORMAL_ONNX`.
- No hacer todavia:
  - No integrar Stable Zero123.
  - No meter modelos 3D pesados.
- Exito:
  - Exportar una carpeta con nombres estables para UE5. Hecho.
  - La app sigue funcionando aunque falte el modelo depth. Hecho.
- Prioridad: muy alta por diferenciacion.

### Fase 6 - Calidad automatica

- Objetivo: que la app mida si una imagen mejoro o empeoro.
- Estado: completada en modo opcional.
- Orden:
  - Registrar metricas simples sin dependencia: tamano, alfa, modo, warnings. Hecho.
  - Evaluar PyIQA como modulo opcional. Hecho sin volverlo dependencia obligatoria.
  - Mostrar `score` solo si esta disponible. Hecho.
- No hacer todavia:
  - No autoajustar todo el pipeline hasta tener evidencia.
- Exito:
  - `ProcessingResult.metrics` incluye datos visibles y no rompe export. Hecho.
- Prioridad: media-alta.

### Fase 7 - Retratos local avanzado

- Objetivo: mejorar caras sin convertir el EXE en un monstruo de dependencias.
- Estado: completada en modo externo opcional.
- Orden:
  - Mantener CodeFormer externo. Hecho.
  - Validar si existe ruta ONNX local confiable. Preparado por `IMAGE_ENHANCER_CODEFORMER_ONNX`, pendiente de modelo real.
  - Evaluar GFPGAN solo si no exige PyTorch dentro del EXE. Hecho como backend externo por `IMAGE_ENHANCER_GFPGAN_SCRIPT`.
  - Agregar detector facial solo si desbloquea recorte/mezcla real. Hecho con OpenCV Haar cascade para crop de CodeFormer o GFPGAN.
- No hacer todavia:
  - No meter PyTorch al runtime principal.
- Exito:
  - Retratos mejoran como capa opcional y con fallback; si CodeFormer o GFPGAN fallan/no estan configurados, el render final no se bloquea.
- Prioridad: media.

### Fase 8 - Luz, color y restauracion

- Objetivo: mejorar fotos oscuras, planas o con ruido.
- Estado: completada en modo opcional.
- Orden:
  - Zero-DCE o DeepWB primero, por impacto y UI simple. Registrados como candidatos ONNX por variable de entorno.
  - Primer modulo operativo: `color_local_restore` con Pillow, sin dependencia nueva.
  - Despues SwinIR/HAT/BSRGAN segun modelo ONNX viable. Registrado como candidato ONNX opcional.
  - NAFNet solo si el caso de ruido lo justifica. Registrado como candidato ONNX opcional.
- Exito:
  - Cada modulo se activa/desactiva y no bloquea el render final si falla. Hecho para `color_local_restore`; candidatos ONNX quedan en fallback validable.
- Prioridad: media.

### Fase 9 - Produccion

- Objetivo: convertir la herramienta en flujo de trabajo real.
- Estado: completada base.
- Orden:
  - Presets guardables. Hecho.
  - Export profiles. Hecho.
  - Batch por carpeta. Hecho.
  - Historial de resultados. Hecho.
  - Cancelacion fuerte para batch. Hecho como corte de cola y cancelacion cooperativa del item actual.
  - Reporte final por lote. Hecho.
- Exito:
  - Procesar varias imagenes sin repetir configuracion. Hecho.
- Prioridad: media-alta.

### Fase 10 - Creativa y ComfyUI

- Objetivo: conectar capacidades creativas sin reimplementar todo.
- Estado: completada en modo externo configurable; backend local sigue sin verificarse end-to-end porque ComfyUI no estaba levantado durante el smoke.
- Orden:
  - ComfyUI API externo opcional. Hecho.
  - Smoke para ComfyUI API. Hecho.
  - Enviar imagen a workflow externo. Hecho.
  - Recibir resultado sin bloquear UI. Hecho.
  - IP-Adapter / img2img solo via backend externo. Hecho con workflow JSON, reference image y plantilla dedicada.
  - ControlNet despues. Hecho como workflow externo configurable con control image y plantilla dedicada.
- No hacer todavia:
  - No hacer Stable Diffusion core dentro de la app base.
- Exito:
  - La app puede delegar a ComfyUI local si existe, sin depender de el para funcionar. Hecho a nivel de integracion y configuracion externa.
- Prioridad: futura.

### Fase 11 - Video

- Objetivo: procesamiento por frames sin romper el producto de imagenes.
- Estado: separado y documentado en `VIDEO_SPRINT.md`.
- Orden:
  - Sprint separado. Hecho.
  - Pipeline de frames. Definido en doc.
  - Progreso largo y cancelacion fuerte. Definidos en doc.
  - Export de video. Definido en doc.
- No hacer todavia:
  - No mezclar RIFE/BasicVSR++ con el pipeline de imagen actual.
- Prioridad: futura.

## 6. Siguiente fase recomendada

Recomendacion tecnica:

1. Fase 9: produccion con presets guardables, export profiles e historial.
2. Validar end-to-end un ComfyUI real con alguno de los workflows externos ya preparados.
3. Profundizar Fase 5: elegir modelos ONNX viables para `ue5_depth`/`ue5_normal_map`.
4. Profundizar Fase 8: validar Zero-DCE/DeepWB/SwinIR/NAFNet ONNX solo cuando haya modelo local viable.
5. Profundizar Fase 7: CodeFormer ONNX solo si hay ruta estable sin PyTorch en el EXE.

Motivo:

- Fase 9 ya deja flujo de produccion usable; el siguiente salto creativo real depende de workflows concretos de ComfyUI.
- UE5 Texture Tools ya diferencia el producto con `albedo.png`; los mapas depth/normal completan el set tecnico.
- Los candidatos ONNX solo deben entrar cuando haya modelo probado, smoke y fallback.

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
.venv\Scripts\python.exe image_enhancer.py --smoke-cuda
.venv\Scripts\python.exe image_enhancer.py --smoke-portrait
.venv\Scripts\python.exe image_enhancer.py --smoke-color-restore
.venv\Scripts\python.exe image_enhancer.py --smoke-ue5-texture-set
.venv\Scripts\python.exe image_enhancer.py --smoke-modules
.venv\Scripts\python.exe image_enhancer.py --smoke-module ue5_depth
.venv\Scripts\python.exe image_enhancer.py --smoke-realesrgan
.venv\Scripts\python.exe image_enhancer.py --smoke-rembg --model silueta
```

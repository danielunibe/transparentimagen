# PIPELINE_CHECKLIST.md

Checklist rapido del estado de Image Enhancer local modular.

Estados:

- `[x]` hecho.
- `[ ]` pendiente.
- `[~]` parcialmente hecho o bloqueado por condicion externa.

## 1. Ya hicimos

### Fase 0 - Base funcional inicial

- [x] App local en Python 3.10 + Tkinter.
- [x] Cargar imagen desde disco.
- [x] Procesar imagen con flujo principal.
- [x] Remover fondo con `rembg`.
- [x] Mantener transparencia real en PNG.
- [x] Guardar JPG con fondo blanco cuando el formato no soporta alfa.
- [x] Preview antes/despues.
- [x] Vista `Comparar`, `Antes`, `Despues` y `Split A/B`.
- [x] Refinado manual de bordes con pincel alfa.
- [x] Limpieza de restos/islas en alfa.
- [x] Despill para reducir halos de color.
- [x] Feather alfa para suavizar borde.
- [x] Preservar flujo protegido: cargar -> procesar -> preview -> guardar.

### Fase 1 - GPU, Real-ESRGAN y ModelManager

- [x] Instalar `onnxruntime-gpu==1.23.2`.
- [x] Detectar GPU NVIDIA con `nvidia-smi`.
- [x] Detectar providers ONNX disponibles.
- [x] Preferir `CUDAExecutionProvider` + `CPUExecutionProvider` cuando CUDA este operativo.
- [x] Mantener fallback automatico a `CPUExecutionProvider`.
- [x] Mostrar provider activo por consola.
- [x] Integrar Real-ESRGAN ONNX como motor principal.
- [x] Mantener LANCZOS como fallback universal.
- [x] Crear `ModelManager` singleton.
- [x] Cachear sesiones `rembg` por modelo.
- [x] Cachear sesion Real-ESRGAN.
- [x] CUDA real estabilizada en Fase 3 con DLLs NVIDIA locales del `.venv`.

### Fase 2 - Modularizacion base

- [x] Separar `models.py`.
- [x] Separar `pipeline.py`.
- [x] Separar `ui.py`.
- [x] Crear `main.py` como arranque minimo.
- [x] Mantener `image_enhancer.py` como CLI compatible.
- [x] Crear `ProcessingOptions`.
- [x] Crear `ProcessingResult`.
- [x] Crear `CancellationToken`.
- [x] Crear `ModuleSpec`.
- [x] Crear `ModuleRegistry`.
- [x] Agregar preview rapido al 25%.
- [x] Separar preview rapido de render final.
- [x] Procesar en thread separado.
- [x] Cancelar operacion actual si llega nueva solicitud.
- [x] Agregar panel `MODULOS IA`.
- [x] Agregar estados visibles: `No instalado`, `Listo`, `Activo`, `Fallback`, `Error`.
- [x] Agregar acciones por modulo: `Activar`, `Desactivar`, `Validar`.
- [x] Agregar smoke `--smoke-modules`.
- [x] Agregar smoke `--smoke-module <id>`.

### Documentacion y seguridad

- [x] Crear `PIPELINE_ROADMAP.md`.
- [x] Crear este `PIPELINE_CHECKLIST.md`.
- [x] Actualizar `ARCHITECTURE.md`.
- [x] Actualizar `TECH_STACK.md`.
- [x] Actualizar `CODEX_GUARDRAILS.md`.
- [x] Actualizar `DESIGN.md`.
- [x] Actualizar `README.md`.
- [x] Crear respaldos antes de cambios grandes.

## 2. Modulos ya registrados

- [x] `segmentation_birefnet`.
- [x] `upscale_realesrgan`.
- [x] `portrait_codeformer`.
- [x] `quality_pyiqa`.
- [x] `ue5_depth`.
- [x] `ue5_normal_map`.
- [x] `color_zero_dce`.
- [x] `creative_comfyui`.
- [x] `production_batch`.

## 3. Falta por hacer

### Fase 3 - Estabilizacion CUDA real

- [x] Verificar driver/GPU con `nvidia-smi`.
- [x] Instalar runtime CUDA 12/cuDNN 9 local via wheels NVIDIA en `.venv`.
- [x] Registrar directorios DLL NVIDIA en `PATH` y `os.add_dll_directory`.
- [x] Confirmar `cudart64_12.dll`, `cublas64_12.dll`, `cublasLt64_12.dll`, `cudnn64_9.dll` y `cufft64_11.dll`.
- [x] Confirmar sub-DLLs cuDNN como `cudnn_engines_tensor_ir64_9.dll`.
- [x] Repetir `--smoke-cuda` con `CUDAExecutionProvider` preferido.
- [x] Repetir `--smoke-realesrgan` sin fallback CPU por cuDNN.
- [x] Repetir `--smoke-rembg --model silueta` con `CUDAExecutionProvider` activo.
- [x] Mostrar en consola si el provider real es CUDA o CPU fallback.
- [x] Mantener CPU/LANCZOS fallback como modo operativo protegido.

### Fase 4 - Segmentacion premium

- [x] Convertir `segmentation_birefnet` en preset premium claro.
- [x] Agregar comparacion rapida `u2net` vs `birefnet-general`.
- [x] Guardar resultado de comparacion sin romper refinado manual.
- [x] Mejorar texto UI para explicar cuando usar BiRefNet.
- [x] Preparar base visual para seleccion por objeto futura.
- [x] No instalar SAM todavia.
- [x] No instalar Grounded-SAM todavia.

### Fase 5 - UE5 Texture Tools v1

- [ ] Crear export profile `UE5 Texture Set`.
- [ ] Exportar `albedo.png`.
- [ ] Crear estructura de carpeta de export UE5.
- [ ] Definir naming estable para assets UE5.
- [ ] Validar modelo ONNX viable para Depth Anything v2.
- [ ] Implementar `ue5_depth` cuando el modelo este elegido.
- [ ] Exportar `depth.png`.
- [ ] Validar modelo normal map viable.
- [ ] Implementar `ue5_normal_map`.
- [ ] Exportar `normal.png`.
- [ ] Mantener fallback si falta depth/normal.

### Fase 6 - Calidad automatica

- [ ] Agregar metricas simples en `ProcessingResult.metrics`.
- [ ] Mostrar metricas basicas en UI.
- [ ] Evaluar PyIQA como dependencia opcional.
- [ ] Implementar `quality_pyiqa` solo si no vuelve pesado el runtime.
- [ ] Mostrar score solo si esta disponible.
- [ ] Evitar autoajustes hasta tener evidencia.

### Fase 7 - Retratos local avanzado

- [ ] Mantener CodeFormer externo como opcion actual.
- [ ] Validar ruta ONNX local para CodeFormer.
- [ ] Evaluar GFPGAN sin meter PyTorch al EXE.
- [ ] Evaluar detector facial solo si aporta recorte/mezcla real.
- [ ] Agregar smoke especifico de retratos cuando exista modulo local.

### Fase 8 - Luz, color y restauracion

- [ ] Evaluar Zero-DCE ONNX.
- [ ] Evaluar DeepWB ONNX.
- [ ] Elegir primer modulo de luz/color.
- [ ] Evaluar SwinIR/HAT/BSRGAN por disponibilidad ONNX.
- [ ] Evaluar NAFNet solo si el caso de ruido lo justifica.
- [ ] Mantener fallback si falla el modulo.

### Fase 9 - Produccion

- [ ] Presets guardables.
- [ ] Export profiles.
- [ ] Batch por carpeta.
- [ ] Historial de resultados.
- [ ] Cancelacion fuerte para batch.
- [ ] Reporte final por lote.

### Fase 10 - Creativa y ComfyUI

- [ ] Validar ComfyUI local como backend externo opcional.
- [ ] Crear smoke para ComfyUI API.
- [ ] Enviar imagen a workflow externo.
- [ ] Recibir resultado sin bloquear UI.
- [ ] Evaluar IP-Adapter/img2img via ComfyUI.
- [ ] Evaluar ControlNet via ComfyUI.
- [ ] No meter Stable Diffusion core en la app base.

### Fase 11 - Video

- [ ] Crear sprint separado.
- [ ] Definir pipeline por frames.
- [ ] Definir export de video.
- [ ] Agregar progreso largo.
- [ ] Agregar cancelacion fuerte.
- [ ] Evaluar RIFE.
- [ ] Evaluar BasicVSR++.
- [ ] No mezclar video con pipeline actual hasta que imagen/UE5 esten estables.

## 4. Siguiente recomendado

Orden recomendado inmediato:

1. [x] Fase 3 - Estabilizacion CUDA real.
2. [x] Fase 4 - Segmentacion premium con BiRefNet.
3. [ ] Fase 5 - UE5 Texture Tools v1.

Motivo:

- CUDA acelera todo.
- BiRefNet mejora el uso actual.
- UE5 Texture Tools diferencia el producto.

## 5. Checklist obligatorio para cualquier modulo nuevo

- [ ] Crear o actualizar `ModuleSpec`.
- [ ] Estado visible en UI.
- [ ] Boton `Activar`.
- [ ] Boton `Desactivar`.
- [ ] Boton `Validar`.
- [ ] Smoke test.
- [ ] Fallback.
- [ ] Cache externa si descarga modelo.
- [ ] Documentar en README.
- [ ] Documentar en `PIPELINE_ROADMAP.md`.
- [ ] Marcar avance en este checklist.
- [ ] No instalar dependencia pesada sin autorizacion.
- [ ] No empaquetar modelo dentro del EXE sin autorizacion.

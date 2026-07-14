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
- [x] `portrait_face_detector`.
- [x] `portrait_codeformer_onnx`.
- [x] `portrait_gfpgan_external`.
- [x] `ue5_texture_set`.
- [x] `quality_pyiqa`.
- [x] `ue5_depth`.
- [x] `ue5_normal_map`.
- [x] `color_zero_dce`.
- [x] `color_deepwb`.
- [x] `color_local_restore`.
- [x] `restoration_swinir`.
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
- [x] Actualizar `construir_exe.bat` para recolectar `nvidia` y validar `--smoke-cuda`.
- [x] Reconstruir EXE y validar `--smoke-cuda`, `--smoke-realesrgan` y `--smoke-rembg --model silueta`.
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

- [x] Crear export profile `UE5 Texture Set`.
- [x] Exportar `albedo.png`.
- [x] Crear estructura de carpeta de export UE5.
- [x] Definir naming estable para assets UE5.
- [x] Crear `texture_manifest.json` con archivos, metricas y warnings.
- [x] Agregar boton `UE5 Set` habilitado solo despues de render final.
- [x] Agregar smoke `--smoke-ue5-texture-set`.
- [x] Validar modelo ONNX viable para Depth Anything v2: `onnx-community/depth-anything-v2-small-ONNX` en variante `model_q4f16.onnx`.
- [x] Implementar `ue5_depth` con cache externa en `%USERPROFILE%\.image_enhancer_models\depth_anything_v2_small_onnx\hf-q4f16` y override opcional `IMAGE_ENHANCER_UE5_DEPTH_ONNX`.
- [x] Exportar `depth.png` cuando `ue5_depth` esta activo.
- [~] Validar modelo normal map viable: ruta opcional preparada por `IMAGE_ENHANCER_UE5_NORMAL_ONNX`; no hay ONNX real instalado todavia.
- [x] Implementar `ue5_normal_map` con fallback procedural por luminancia, sin presentarlo como IA.
- [x] Exportar `normal.png` cuando `ue5_normal_map` esta activo.
- [x] Agregar smoke `--smoke-ue5-depth-normal`.
- [x] Mantener fallback si falta depth/normal.

### Fase 6 - Calidad automatica

- [x] Agregar metricas simples en `ProcessingResult.metrics`.
- [x] Mostrar metricas basicas en UI.
- [x] Evaluar PyIQA como dependencia opcional.
- [x] Implementar `quality_pyiqa` solo si no vuelve pesado el runtime.
- [x] Mostrar score solo si esta disponible.
- [x] Evitar autoajustes hasta tener evidencia.
- [x] Validar backend real de `quality_pyiqa` en runtime externo dedicado `.venv_pyiqa` con `pyiqa==0.1.15.post2` y metrica `niqe`.
- [x] Agregar smoke `--smoke-quality-pyiqa`.

### Fase 7 - Retratos local avanzado

- [x] Mantener CodeFormer externo como opcion actual.
- [x] Mantener CodeFormer ONNX como ruta candidata no obligatoria.
- [x] Evaluar GFPGAN sin meter PyTorch al EXE: backend externo opcional activo.
- [x] Evaluar detector facial solo si aporta recorte/mezcla real.
- [x] Agregar smoke especifico de retratos: `--smoke-portrait`.
- [x] Evitar que un fallo de CodeFormer bloquee el render final.

### Fase 8 - Luz, color y restauracion

- [~] Evaluar Zero-DCE ONNX: ruta opcional `IMAGE_ENHANCER_ZERO_DCE_ONNX` preparada; no instalado; fallback validado por smoke.
- [~] Evaluar DeepWB ONNX: ruta opcional `IMAGE_ENHANCER_DEEPWB_ONNX` preparada; no instalado; fallback validado por smoke.
- [x] Elegir primer modulo de luz/color: `color_local_restore`.
- [x] Evaluar SwinIR/HAT/BSRGAN por disponibilidad ONNX: ruta opcional `IMAGE_ENHANCER_SWINIR_ONNX` preparada.
- [x] Evaluar NAFNet solo si el caso de ruido lo justifica: ruta opcional `IMAGE_ENHANCER_NAFNET_ONNX` preparada.
- [x] Mantener fallback si falla el modulo.
- [x] Agregar smoke especifico de restauracion: `--smoke-color-restore`.

### Fase 9 - Produccion

- [x] Presets guardables.
- [x] Export profiles.
- [x] Batch por carpeta.
- [x] Historial de resultados.
- [x] Cancelacion fuerte para batch.
- [x] Reporte final por lote.

### Fase 10 - Creativa y ComfyUI

- [~] Validar ComfyUI local como backend externo opcional: integracion y plantillas JSON validas; `--smoke-comfyui` falla con `WinError 10061` porque no hay servidor ComfyUI real escuchando en `http://127.0.0.1:8188`.
- [x] Crear smoke para ComfyUI API.
- [x] Enviar imagen a workflow externo.
- [x] Recibir resultado sin bloquear UI.
- [x] Evaluar IP-Adapter/img2img via ComfyUI: soporte externo, reference image y plantilla listos.
- [x] Evaluar ControlNet via ComfyUI: soporte externo, control image y plantilla listos.
- [x] No meter Stable Diffusion core en la app base.

### Fase 11 - Video

- [x] Crear sprint separado.
- [x] Definir pipeline por frames.
- [x] Definir export de video.
- [x] Agregar progreso largo.
- [x] Agregar cancelacion fuerte.
- [x] Evaluar RIFE: candidato externo via `IMAGE_ENHANCER_RIFE_SCRIPT`.
- [x] Evaluar BasicVSR++: candidato externo via `IMAGE_ENHANCER_BASICVSR_SCRIPT`.
- [x] No mezclar video con pipeline actual hasta que imagen/UE5 esten estables.

## 4. Siguiente recomendado

Orden recomendado inmediato:

1. [~] Levantar ComfyUI real y validar un workflow concreto usando las plantillas externas ya preparadas; falta servidor ComfyUI activo en `127.0.0.1:8188`.
2. [x] Elegir modelo ONNX viable para `ue5_depth`.
3. [x] Implementar y exportar `depth.png`.
4. [x] Validar ruta de normal map y exportar `normal.png` con fallback procedural.
5. [x] Evaluar `quality_pyiqa` como scoring opcional sin dependencia obligatoria.
6. [x] Endurecer capa operativa de raiz: `README.md` + `.gitignore` + documentacion reconciliada.
7. [ ] Siguiente: validar un ONNX real para `IMAGE_ENHANCER_UE5_NORMAL_ONNX` si se quiere reemplazar el normal procedural.
8. [ ] Siguiente: instalar/levantar ComfyUI externo y apuntar un workflow real desde la UI.

Motivo:

- Fase 9 ya esta operativa; el salto creativo visible ahora depende de un servidor ComfyUI real, no del codigo base.
- UE5 v1 ya exporta `albedo.png`, `depth.png`, `normal.png` y manifest cuando los modulos estan activos.
- `depth.png` viene de Depth Anything v2 ONNX; `normal.png` queda como fallback procedural hasta validar un modelo normal map real.
- Calidad simple y score PyIQA quedan visibles; `pyiqa` vive en runtime externo dedicado para no inflar el runtime base.

## 5. Checklist obligatorio para cualquier modulo nuevo

- [x] Crear o actualizar `ModuleSpec`.
- [x] Estado visible en UI.
- [x] Boton `Activar`.
- [x] Boton `Desactivar`.
- [x] Boton `Validar`.
- [x] Smoke test.
- [x] Fallback cooperativo si el backend o modelo no esta disponible.
- [x] Cache externa si descarga modelo.
- [x] Documentar en README.
- [x] Documentar en `PIPELINE_ROADMAP.md`.
- [x] Marcar avance en este checklist.
- [x] No instalar dependencia pesada sin autorizacion.
- [x] No empaquetar modelo dentro del EXE sin autorizacion.

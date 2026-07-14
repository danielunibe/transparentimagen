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
- [ ] Validar modelo ONNX viable para Depth Anything v2.
- [~] Implementar `ue5_depth` cuando el modelo este elegido: ruta opcional preparada por `IMAGE_ENHANCER_UE5_DEPTH_ONNX`.
- [ ] Exportar `depth.png`.
- [~] Validar modelo normal map viable: ruta opcional preparada por `IMAGE_ENHANCER_UE5_NORMAL_ONNX`.
- [~] Implementar `ue5_normal_map`: pendiente de modelo real.
- [ ] Exportar `normal.png`.
- [x] Mantener fallback si falta depth/normal.

### Fase 6 - Calidad automatica

- [x] Agregar metricas simples en `ProcessingResult.metrics`.
- [x] Mostrar metricas basicas en UI.
- [x] Evaluar PyIQA como dependencia opcional.
- [x] Implementar `quality_pyiqa` solo si no vuelve pesado el runtime.
- [x] Mostrar score solo si esta disponible.
- [x] Evitar autoajustes hasta tener evidencia.

### Fase 7 - Retratos local avanzado

- [x] Mantener CodeFormer externo como opcion actual.
- [~] Validar ruta ONNX local para CodeFormer: variable `IMAGE_ENHANCER_CODEFORMER_ONNX` preparada; falta modelo real confiable.
- [~] Evaluar GFPGAN sin meter PyTorch al EXE: registrado como backend externo opcional; no instalado.
- [x] Evaluar detector facial solo si aporta recorte/mezcla real.
- [x] Agregar smoke especifico de retratos: `--smoke-portrait`.
- [x] Evitar que un fallo de CodeFormer bloquee el render final.

### Fase 8 - Luz, color y restauracion

- [~] Evaluar Zero-DCE ONNX: ruta opcional `IMAGE_ENHANCER_ZERO_DCE_ONNX` preparada; no instalado.
- [~] Evaluar DeepWB ONNX: ruta opcional `IMAGE_ENHANCER_DEEPWB_ONNX` preparada; no instalado.
- [x] Elegir primer modulo de luz/color: `color_local_restore`.
- [~] Evaluar SwinIR/HAT/BSRGAN por disponibilidad ONNX: registrado como candidato futuro.
- [ ] Evaluar NAFNet solo si el caso de ruido lo justifica.
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

- [x] Validar ComfyUI local como backend externo opcional.
- [x] Crear smoke para ComfyUI API.
- [x] Enviar imagen a workflow externo.
- [x] Recibir resultado sin bloquear UI.
- [~] Evaluar IP-Adapter/img2img via ComfyUI: plantillas base listas; falta validacion con servidor real.
- [~] Evaluar ControlNet via ComfyUI: falta workflow real validado.
- [x] No meter Stable Diffusion core en la app base.

### Fase 11 - Video

- [x] Crear sprint separado.
- [x] Definir pipeline por frames.
- [x] Definir export de video.
- [x] Agregar progreso largo.
- [x] Agregar cancelacion fuerte.
- [~] Evaluar RIFE.
- [~] Evaluar BasicVSR++.
- [x] No mezclar video con pipeline actual hasta que imagen/UE5 esten estables.

## 4. Siguiente recomendado

Orden recomendado inmediato:

1. [ ] Levantar ComfyUI real y validar un workflow concreto de img2img/IP-Adapter/ControlNet.
2. [ ] Elegir modelo ONNX viable para `ue5_depth`.
3. [ ] Implementar y exportar `depth.png`.
4. [ ] Validar ruta de normal map y exportar `normal.png`.
5. [x] Evaluar `quality_pyiqa` como scoring opcional sin dependencia obligatoria.

Motivo:

- Fase 9 ya esta operativa; el siguiente salto visible depende de un workflow real de ComfyUI y del set tecnico UE5 completo.
- UE5 v1 ya exporta `albedo.png`; depth/normal completan el set tecnico.
- Calidad simple ya esta visible; score opcional queda condicionado a que exista backend `pyiqa` local o externo.

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

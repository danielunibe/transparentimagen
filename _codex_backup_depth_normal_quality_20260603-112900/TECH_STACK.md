# TECH_STACK.md

## 1. Resumen tecnico

- Tipo de proyecto: aplicacion local de escritorio para Windows.
- Framework/UI: Python `tkinter`.
- Lenguaje: Python 3.10.
- Runtime verificado: Python 3.10.11 64-bit en Windows.
- Procesamiento de imagen: Pillow.
- Remocion de fondo: `rembg[gpu]==2.0.69` con fallback CPU.
- Limpieza de mascara: OpenCV (`cv2`) y NumPy, instalados como dependencias transitivas de `rembg`.
- Edicion manual de alfa: Pillow + Tkinter Canvas.
- Backend IA: `onnxruntime-gpu` con providers preferidos `CUDAExecutionProvider` + `CPUExecutionProvider`.
- Fallback IA: si CUDA no esta operativo, ONNX Runtime usa `CPUExecutionProvider` sin detener la app.
- Runtime CUDA local: wheels NVIDIA en `.venv` para CUDA Runtime, cuBLAS, cuDNN y cuFFT.
- Upscaling IA principal: Real-ESRGAN x4 ONNX descargado bajo demanda.
- Face recovery: integracion externa opcional con CodeFormer o GFPGAN via scripts oficiales, con detector facial local OpenCV para crop/mezcla si esta activo.
- Restauracion luz/color: fallback local con Pillow (`ImageOps`, `ImageEnhance`, `MedianFilter`) activable por modulo.
- Candidatos opcionales Fase 8: `IMAGE_ENHANCER_ZERO_DCE_ONNX`, `IMAGE_ENHANCER_DEEPWB_ONNX`, `IMAGE_ENHANCER_SWINIR_ONNX`, `IMAGE_ENHANCER_NAFNET_ONNX`.
- Candidatos opcionales Fase 11: `IMAGE_ENHANCER_RIFE_SCRIPT`, `IMAGE_ENHANCER_BASICVSR_SCRIPT`.
- Export tecnico: `UE5 Texture Set` local con `albedo.png` y `texture_manifest.json`.
- Calidad automatica base: metricas simples sin dependencia nueva en `ProcessingResult.metrics`.
- Produccion: presets guardables, export profiles, batch por carpeta, historial y reportes JSON en `%USERPROFILE%\.image_enhancer_unova`.
- Backend creativo opcional: ComfyUI local via HTTP + workflow JSON externo.
- Video sprint separado: `ffmpeg` + `ffprobe` externos, orquestados por `video_pipeline.py`.
- Empaquetado: PyInstaller `onedir` + `windowed`.
- Package manager: `pip` dentro de `.venv` local.
- Persistencia: modelos descargados por `rembg` en `%USERPROFILE%\.u2net`.
- Persistencia: modelo Real-ESRGAN descargado en `%USERPROFILE%\.image_enhancer_models\real_esrgan_x4plus\v0.46.1`.
- Testing: smoke scripts CLI dentro de `image_enhancer.py`, con app modular en `main.py`.
- Roadmap tecnico: `PIPELINE_ROADMAP.md`.

## 2. Comandos del proyecto

| Comando | Uso | Estado |
|---|---|---|
| `instalar.bat` | Crear `.venv` e instalar runtime | confirmado en plan |
| `iniciar.bat` | Ejecutar app con `.venv` si existe | confirmado en plan |
| `.venv\Scripts\python.exe image_enhancer.py --smoke` | Validacion runtime sin UI | confirmado |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-cuda` | Validacion de CUDA/cuDNN y provider preferido | confirmado |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-rembg --model silueta` | Validacion real de modelo IA | confirmado en plan |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-segmentation-compare` | Validacion real comparacion `u2net` vs `birefnet-general` | nuevo |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-ue5-texture-set` | Validacion export UE5 albedo + manifest | nuevo |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-ue5-candidates` | Validar rutas opcionales ONNX para `ue5_depth` y `ue5_normal_map` | nuevo |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-realesrgan` | Validacion real de Real-ESRGAN ONNX | confirmado |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-codeformer` | Verificar configuracion de CodeFormer externo | nuevo |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-portrait` | Validar Fase 7 con detector facial y rutas opcionales ONNX/GFPGAN | nuevo |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-color-restore` | Validar Fase 8 con restauracion local y rutas opcionales Zero-DCE/DeepWB | nuevo |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-production-batch` | Validar Fase 9 con presets/export/batch/historial/reportes sin UI | confirmado |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-comfyui` | Validar API local opcional de ComfyUI y workflow configurado | nuevo |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-video-sprint` | Validar sprint de video por frames de forma aislada | confirmado |
| `.venv\Scripts\python.exe image_enhancer.py --video-source in.mp4 --video-output out.mp4 --video-mode light_restore` | Ejecutar pipeline separado de video por frames | nuevo |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-modules` | Validar registro de modulos IA sin descargar todo | confirmado |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-module ue5_depth` | Validar un modulo registrado concreto | nuevo |
| `construir_exe.bat` | Generar EXE distribuible con `nvidia` y smoke CUDA | confirmado |

## 3. Dependencias principales

| Dependencia | Uso | Se puede tocar | Notas |
|---|---|---|---|
| `rembg[gpu]==2.0.69` | Quitar fondo con IA usando ONNX Runtime GPU/CPU | requiere permiso | Fijado por compatibilidad con Python 3.10 |
| `Pillow>=10,<13` | Abrir, convertir, escalar y guardar imagenes | requiere permiso | Mantener canal alfa |
| `numpy>=1.24,<3` | Despill, tiles Real-ESRGAN y mascara alfa | requiere permiso | Ahora es dependencia directa |
| `onnxruntime-gpu==1.23.2` | Ejecutar rembg y Real-ESRGAN ONNX con CUDA si el runtime local esta completo | requiere permiso | Mantiene fallback CPU |
| `nvidia-cuda-runtime-cu12==12.9.79` | DLLs runtime CUDA 12 locales para ONNX Runtime | requiere permiso | Instalado en `.venv`, no global |
| `nvidia-cublas-cu12==12.9.2.10` | DLLs cuBLAS usadas por CUDAExecutionProvider/cuDNN | requiere permiso | Incluye dependencia `nvidia-cuda-nvrtc-cu12` |
| `nvidia-cudnn-cu12==9.23.0.39` | DLLs cuDNN 9 para convoluciones de Real-ESRGAN/rembg | requiere permiso | Requiere registrar carpeta `nvidia\cudnn\bin` |
| `nvidia-cufft-cu12==11.4.1.4` | DLL `cufft64_11.dll` requerida por preload CUDA de ONNX Runtime | requiere permiso | Incluye dependencia `nvidia-nvjitlink-cu12` |
| `opencv-python-headless` | Limpiar componentes pequenos de la mascara alfa | transitiva | No instalar directo salvo necesidad |
| `pyinstaller==6.20.0` | Build del EXE | requiere permiso | Solo dependencia de build |

## 4. Restricciones tecnicas

- No migrar a Python 3.11 sin autorizacion.
- No asumir CUDA activo solo porque exista una RTX o porque `CUDAExecutionProvider` aparezca instalado.
- No cambiar a otro framework UI sin autorizacion.
- No convertir a instalador MSI/NSIS sin una fase separada.
- No empaquetar modelos IA dentro del EXE salvo decision explicita.
- No presentar LANCZOS como IA; es modo rapido de interpolacion.
- Real-ESRGAN queda como modo IA principal; LANCZOS queda como fallback si el modelo ONNX o CUDA no cargan.
- Para CUDA real en Windows se requieren DLLs de CUDA 12.x/cuDNN 9.x visibles para el proceso; `ModelManager` registra las carpetas NVIDIA del `.venv`.
- CodeFormer queda desacoplado del EXE en esta fase; se invoca como backend externo para no meter PyTorch al empaquetado actual sin una migracion dedicada.
- ComfyUI queda desacoplado del runtime base; se consume por API local y workflow JSON sin meter Stable Diffusion core dentro de la app.
- Video queda desacoplado del runtime base; usa `ffmpeg/ffprobe` externos y no comparte UI ni pipeline con imagen.
- `ue5_depth`, `ue5_normal_map` y `quality_pyiqa` siguen sin dependencia obligatoria; `quality_pyiqa` puede usar `pyiqa` local o `IMAGE_ENHANCER_PYIQA_PYTHON` sin inflar la app base.
- CodeFormer ONNX, GFPGAN externo, Zero-DCE ONNX y DeepWB ONNX son rutas candidatas por variable de entorno; no se instalan ni descargan automaticamente.
- Video queda fuera del runtime actual y se rige por `VIDEO_SPRINT.md`.

## 5. Decisiones tecnicas activas

### Decision #1

- Fecha: 2026-06-03
- Decision: activar `onnxruntime-gpu==1.23.2` con providers `CUDAExecutionProvider` y `CPUExecutionProvider`.
- Motivo: aprovechar NVIDIA RTX 3070 Ti cuando el runtime CUDA/cuDNN este completo.
- Impacto: `rembg` y Real-ESRGAN usan `ModelManager` singleton para cachear sesiones ONNX.
- Estado: confirmado para Fase 1 y estabilizado en Fase 3.
- No cambiar sin permiso: no quitar fallback CPU ni reemplazar Real-ESRGAN ONNX por dependencias pesadas.

### Decision #2

- Fecha: 2026-06-03
- Decision: separar la app en `models.py`, `pipeline.py`, `ui.py` y `main.py`, dejando `image_enhancer.py` como wrapper CLI compatible.
- Motivo: habilitar activacion progresiva de modulos IA sin seguir creciendo el monolito.
- Impacto: `ProcessingOptions`, `ProcessingResult`, `CancellationToken` y `ModuleSpec` son las interfaces base para futuros modelos.
- Estado: confirmado para Fase 2 base.
- No cambiar sin permiso: no agregar modelos pesados sin smoke test, fallback y cache externa.

### Decision #3

- Fecha: 2026-06-03
- Decision: usar `PIPELINE_ROADMAP.md` como fuente de verdad para el orden de integracion de modulos IA.
- Motivo: evitar meter modelos grandes sin fase, fallback o validacion.
- Impacto: Fase 3 CUDA real, Fase 4 segmentacion premium, Fase 5 UE5 Texture Set v1 y Fase 6 con metricas simples + scoring opcional ya quedaron completadas; depth/normal reales quedan como profundizacion.
- Estado: confirmado.
- No cambiar sin permiso: no saltar a video, Stable Diffusion o SAM completo antes de estabilizar las fases previas.

### Decision #4

- Fecha: 2026-06-03
- Decision: implementar Fase 4 sin dependencias nuevas usando `u2net` como segmentacion rapida y `birefnet-general` como preset premium.
- Motivo: mejorar recortes complejos y permitir comparacion directa antes de integrar SAM o Grounded-SAM.
- Impacto: `compare_segmentation_presets` genera una hoja comparativa guardable en preview 25%; el render final y el refinado manual no se alteran.
- Estado: confirmado para Fase 4.
- No cambiar sin permiso: no instalar SAM, Grounded-SAM ni editor de cajas hasta una fase futura dedicada.

### Decision #5

- Fecha: 2026-06-03
- Decision: estabilizar CUDA real sin instalar CUDA global, usando wheels NVIDIA locales y registro de DLLs en `ModelManager`.
- Motivo: ONNX Runtime podia ver `CUDAExecutionProvider`, pero Real-ESRGAN caia a CPU si cuDNN no encontraba sus engine DLLs.
- Impacto: `--smoke-realesrgan` procesa con `CUDAExecutionProvider` sin fallback CPU por cuDNN; `--smoke-rembg --model silueta` conserva CUDA activo; el EXE `onedir` incluye `nvidia`.
- Estado: confirmado para Fase 3.
- No cambiar sin permiso: no quitar fallback CPU/LANCZOS ni asumir que otra maquina tendra las mismas DLLs sin ejecutar `--smoke-cuda`.

### Decision #6

- Fecha: 2026-06-03
- Decision: implementar Fase 5/6 base sin dependencias nuevas: `UE5 Texture Set` exporta `albedo.png` + manifest, y `ProcessingResult.metrics` registra metricas simples.
- Motivo: diferenciar el producto para flujos Unreal sin instalar modelos depth/normal ni PyIQA antes de validarlos.
- Impacto: `ui.py` agrega boton `UE5 Set` y panel `CALIDAD`; `pipeline.py` agrega export y metricas puras; `models.py` registra `ue5_texture_set`.
- Estado: confirmado para Fase 5/6 base.
- No cambiar sin permiso: no generar mapas depth/normal falsos ni instalar `pyiqa`/Depth Anything sin sprint dedicado.

### Decision #7

- Fecha: 2026-06-03
- Decision: cerrar Fase 5 v1 como export UE5 albedo-only con manifest tecnico y fallback documentado para depth/normal.
- Motivo: entregar diferenciacion UE5 usable sin instalar modelos pesados ni elegir Depth Anything/normal map antes de validarlos.
- Impacto: `export_ue5_texture_set` genera `<asset>_UE5_Texture_Set/albedo.png` y `texture_manifest.json`; `--smoke-ue5-texture-set` valida el contrato.
- Estado: confirmado para Fase 5 v1.
- No cambiar sin permiso: no generar `depth.png` ni `normal.png` con placeholders falsos; solo agregarlos cuando exista modelo viable y smoke dedicado.

### Decision #8

- Fecha: 2026-06-03
- Decision: completar Fase 7/8 sin dependencias pesadas: detector facial local para crop de CodeFormer, CodeFormer/GFPGAN/ONNX solo como rutas opcionales, y `color_local_restore` como primer modulo operativo de luz/color.
- Motivo: avanzar retratos y restauracion sin meter PyTorch ni modelos grandes dentro del runtime principal.
- Impacto: `--smoke-portrait` y `--smoke-color-restore` validan fallback; `portrait_face_detector` y `color_local_restore` pueden activarse desde `MODULOS IA`, mientras Zero-DCE/DeepWB/SwinIR/NAFNet quedan como candidatos por ruta local.
- Estado: confirmado para Fase 7/8 base.
- No cambiar sin permiso: no instalar PyTorch, GFPGAN, Zero-DCE, DeepWB, SwinIR/HAT/BSRGAN ni empaquetar esos modelos en el EXE.

### Decision #9

- Fecha: 2026-06-03
- Decision: implementar Fase 9 de produccion con persistencia local liviana en `%USERPROFILE%\.image_enhancer_unova`.
- Motivo: soportar presets guardables, export profiles, batch por carpeta, historial y reporte final por lote sin agregar dependencias.
- Impacto: `storage.py` persiste presets/settings/history/reportes; `pipeline.py` agrega `run_batch_folder`; `ui.py` agrega panel de produccion.
- Estado: confirmado para Fase 9.
- No cambiar sin permiso: no mover historial/reportes al repo ni reemplazar JSON local por una base de datos sin una fase propia.

### Decision #10

- Fecha: 2026-06-03
- Decision: integrar Fase 10 solo como backend externo opcional mediante ComfyUI API + workflow JSON.
- Motivo: habilitar img2img/IP-Adapter/ControlNet por delegacion externa sin absorber Stable Diffusion dentro de la app base.
- Impacto: `comfyui_client.py` maneja upload de imagen principal + reference/control images, placeholders extensibles, cola, polling y cancelacion cooperativa; `--smoke-comfyui` valida la API local.
- Estado: confirmado para Fase 10.
- No cambiar sin permiso: no meter Stable Diffusion core, checkpoints ni dependencias pesadas en el runtime principal.

### Decision #11

- Fecha: 2026-06-03
- Decision: cerrar Fase 11 como sprint aislado de video por frames en `video_pipeline.py`, sin integrarlo a la UI principal.
- Motivo: habilitar progreso largo, cancelacion fuerte, export y reporte de video sin contaminar el pipeline estable de imagen.
- Impacto: `--smoke-video-sprint` valida extraccion, procesamiento de frames, ensamble y reporte; RIFE y BasicVSR++ quedan como candidatos externos por variable de entorno.
- Estado: confirmado para Fase 11.
- No cambiar sin permiso: no meter modelos de video al EXE base ni enchufar este sprint al flujo principal de imagen.

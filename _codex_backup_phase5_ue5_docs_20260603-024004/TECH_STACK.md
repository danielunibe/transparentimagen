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
- Face recovery: integracion externa opcional con CodeFormer oficial via `inference_codeformer.py`.
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
| `.venv\Scripts\python.exe image_enhancer.py --smoke` | Validacion runtime sin UI | confirmado en plan |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-cuda` | Validacion de CUDA/cuDNN y provider preferido | confirmado |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-rembg --model silueta` | Validacion real de modelo IA | confirmado en plan |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-segmentation-compare` | Validacion real comparacion `u2net` vs `birefnet-general` | nuevo |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-realesrgan` | Validacion real de Real-ESRGAN ONNX | confirmado |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-codeformer` | Verificar configuracion de CodeFormer externo | nuevo |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-modules` | Validar registro de modulos IA sin descargar todo | nuevo |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-module ue5_depth` | Validar un modulo registrado concreto | nuevo |
| `construir_exe.bat` | Generar EXE distribuible | confirmado en plan |

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
- Impacto: Fase 3 CUDA real y Fase 4 segmentacion premium ya quedaron completadas; el siguiente trabajo recomendado es Fase 5 UE5 Texture Tools.
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
- Impacto: `--smoke-realesrgan` procesa con `CUDAExecutionProvider` sin fallback CPU por cuDNN; `--smoke-rembg --model silueta` conserva CUDA activo.
- Estado: confirmado para Fase 3.
- No cambiar sin permiso: no quitar fallback CPU/LANCZOS ni asumir que otra maquina tendra las mismas DLLs sin ejecutar `--smoke-cuda`.

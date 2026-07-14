# Image Enhancer - Unova Games Studio

Herramienta local para Windows que permite:

- Remover fondo con IA mediante `rembg`.
- Usar ONNX Runtime GPU con fallback automatico a CPU.
- Elegir modelos especializados como `bria-rmbg` y variantes `birefnet`.
- Generar PNG con transparencia real.
- Mejorar calidad con Real-ESRGAN ONNX x4 como modo IA principal.
- Mantener LANCZOS rapido 2x/3x/4x como fallback.
- Aplicar presets tipo Lupa por contenido: `High Fidelity`, `Portrait`, `Game Asset`, `Producto`, `Creative`.
- Guardar presets propios, aplicar export profiles y ejecutar batch por carpeta.
- Integrar `CodeFormer` como face recovery opcional para retratos via backend externo.
- Integrar `ComfyUI` local como backend externo opcional via workflow JSON.
- Usar detector facial local para aplicar CodeFormer por crop cuando el modulo esta activo.
- Restaurar luz/color localmente con una capa segura sin modelos pesados.
- Descontaminar color de bordes (`despill`) y suavizar alfa fino tras quitar fondo.
- Ajustar nitidez y contraste antes de guardar.
- Previsualizar en modos `Comparar`, `Antes`, `Despues` y `Split A/B`.
- Refinar bordes con pincel manual para borrar restos o recuperar zonas del alfa.
- Activar modulos IA progresivos desde tarjetas locales sin descargar modelos futuros automaticamente.
- Generar preview rapido al 25% separado del render final.
- Comparar segmentacion rapida `u2net` vs premium `birefnet-general` sin alterar el render final.
- Exportar `UE5 Texture Set` con carpeta estable, `albedo.png`, `depth.png`, `normal.png` y `texture_manifest.json` segun modulos activos.
- Mantener historial local de resultados y reportes en `%USERPROFILE%\.image_enhancer_unova`.

## Requisitos

- Windows 10/11.
- Python 3.10.x instalado y disponible como `python`.
- NVIDIA RTX o GPU compatible opcional para CUDA.
- Para CUDA real: driver NVIDIA funcional; las DLLs CUDA 12/cuDNN 9/cuBLAS/cuFFT se instalan localmente en `.venv` desde `requirements.txt`.
- Internet en la primera ejecucion con remocion de fondo para descargar el modelo IA.
- Internet en la primera ejecucion de Real-ESRGAN para descargar el modelo ONNX.

Este proyecto fija `rembg[gpu]==2.0.69` y `onnxruntime-gpu==1.23.2` porque el entorno local usa Python 3.10.11 y las versiones nuevas de `rembg` requieren Python 3.11+.

Si CUDA no esta completo, la app sigue funcionando con `CPUExecutionProvider` y mantiene LANCZOS como fallback de upscale.

## Instalacion local

Ejecuta:

```bat
instalar.bat
```

El instalador crea `.venv` dentro de esta carpeta e instala las dependencias runtime desde `requirements.txt`.

## Ejecutar la app

```bat
iniciar.bat
```

Tambien se puede ejecutar manualmente:

```bat
.venv\Scripts\python.exe image_enhancer.py
```

La app ya esta separada en modulos:

```txt
main.py          arranque minimo de Tkinter
ui.py            interfaz, worker queue y tarjetas de modulos IA
pipeline.py      procesamiento, preview 25%, render final y smokes
models.py        ModelManager, providers ONNX y ModuleRegistry
storage.py       presets, history, reportes y settings locales
comfyui_client.py backend HTTP opcional para ComfyUI
image_enhancer.py wrapper CLI compatible
```

El orden de integracion por fases vive en:

```txt
..\..\PIPELINE_ROADMAP.md
```

## Crear el EXE

Ejecuta:

```bat
construir_exe.bat
```

El artefacto queda en:

```txt
dist\ImageEnhancer-Unova\ImageEnhancer-Unova.exe
```

El build usa PyInstaller en modo `onedir` y `windowed`. Los modelos IA no se empaquetan dentro del EXE; `rembg` los descarga la primera vez en:

```txt
%USERPROFILE%\.u2net
```

Real-ESRGAN tampoco se empaqueta dentro del EXE. La app descarga el modelo ONNX x4 la primera vez que se usa el motor `Real-ESRGAN IA x4` y lo conserva en:

```txt
%USERPROFILE%\.image_enhancer_models\real_esrgan_x4plus\v0.46.1
```

`CodeFormer` no se empaqueta en esta fase para no romper el build actual con dependencias PyTorch. La app lo puede invocar como backend externo oficial si defines:

```bat
set IMAGE_ENHANCER_CODEFORMER_SCRIPT=C:\ruta\CodeFormer\inference_codeformer.py
set IMAGE_ENHANCER_CODEFORMER_PYTHON=C:\ruta\CodeFormer\venv\Scripts\python.exe
```

`IMAGE_ENHANCER_CODEFORMER_PYTHON` es opcional; si no se define, se usa el `python` actual.

`GFPGAN` tambien puede usarse como backend externo opcional si defines:

```bat
set IMAGE_ENHANCER_GFPGAN_SCRIPT=C:\ruta\GFPGAN\inference_gfpgan.py
set IMAGE_ENHANCER_GFPGAN_PYTHON=C:\ruta\GFPGAN\venv\Scripts\python.exe
```

`IMAGE_ENHANCER_GFPGAN_PYTHON` es opcional; si no se define, se usa el `python` actual.

Fase 7/8 deja preparadas rutas opcionales, sin instalarlas ni volverlas obligatorias:

```bat
set IMAGE_ENHANCER_CODEFORMER_ONNX=C:\ruta\modelos\codeformer.onnx
set IMAGE_ENHANCER_GFPGAN_SCRIPT=C:\ruta\GFPGAN\inference_gfpgan.py
set IMAGE_ENHANCER_ZERO_DCE_ONNX=C:\ruta\modelos\zero_dce.onnx
set IMAGE_ENHANCER_DEEPWB_ONNX=C:\ruta\modelos\deepwb.onnx
set IMAGE_ENHANCER_SWINIR_ONNX=C:\ruta\modelos\swinir.onnx
set IMAGE_ENHANCER_NAFNET_ONNX=C:\ruta\modelos\nafnet.onnx
set IMAGE_ENHANCER_UE5_DEPTH_ONNX=C:\ruta\modelos\depth_anything_v2.onnx
set IMAGE_ENHANCER_UE5_NORMAL_ONNX=C:\ruta\modelos\normal_map.onnx
```

Si `IMAGE_ENHANCER_UE5_DEPTH_ONNX` no esta definido, la app puede descargar bajo demanda Depth Anything v2 Small ONNX `model_q4f16.onnx` en:

```txt
%USERPROFILE%\.image_enhancer_models\depth_anything_v2_small_onnx\hf-q4f16
```

`IMAGE_ENHANCER_UE5_NORMAL_ONNX` queda como ruta futura; hoy `normal.png` se genera con fallback procedural por luminancia.

`quality_pyiqa` no es dependencia base. Si existe `.venv_pyiqa\Scripts\python.exe` en esta carpeta, se autodetecta; tambien puedes forzarlo con:

```bat
set IMAGE_ENHANCER_PYIQA_PYTHON=C:\ruta\pyiqa_env\Scripts\python.exe
```

## Validaciones

Validacion rapida sin abrir ventana:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke
```

Validacion de CUDA/cuDNN y provider preferido:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-cuda
```

Validacion real de `rembg` con el modelo ligero:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-rembg --model silueta
```

Validacion real de comparacion `u2net` vs `birefnet-general`. Puede descargar modelos la primera vez:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-segmentation-compare
```

Validacion de export UE5 Texture Set:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-ue5-texture-set
```

Validacion de rutas candidatas para depth/normal UE5:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-ue5-candidates
```

Validacion real de `depth.png` + `normal.png` UE5:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-ue5-depth-normal
```

Validacion real de PyIQA opcional:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-quality-pyiqa
```

Validacion real de Real-ESRGAN ONNX. Puede descargar unos 60 MB la primera vez:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-realesrgan
```

Al iniciar o ejecutar los smoke tests, la consola imprime:

```txt
[ONNXRuntime] GPU NVIDIA: detectada/no detectada
[ONNXRuntime] Directorios DLL NVIDIA: ...
[ONNXRuntime] Preload CUDA/cuDNN: OK/no disponible
[ONNXRuntime] Providers disponibles: ...
[ONNXRuntime] Provider preferido al iniciar: ...
```

Si CUDA/cuDNN faltan, se reportan las DLLs faltantes y se usa CPU fallback.

Validacion de integracion externa de CodeFormer:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-codeformer
```

Validacion de Fase 7 sin exigir PyTorch ni modelos pesados:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-portrait
```

Validacion de Fase 8 con restauracion local y candidatos ONNX opcionales:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-color-restore
```

Validacion de Fase 9 con batch/presets/reportes sin abrir la UI:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-production-batch
```

Validacion opcional de ComfyUI local y workflow configurado:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-comfyui
```

Validacion del registro de modulos IA sin descargar todos los modelos:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-modules
```

Validacion de un modulo concreto:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-module ue5_texture_set
```

Despues de construir:

```bat
dist\ImageEnhancer-Unova\ImageEnhancer-Unova.exe --smoke
dist\ImageEnhancer-Unova\ImageEnhancer-Unova.exe --smoke-cuda
```

`construir_exe.bat` recolecta el paquete `nvidia` y falla el build si el EXE no pasa `--smoke-cuda`.

Para ejecutar los `.bat` desde una consola automatizada sin que se queden esperando `pause`:

```bat
set IMAGE_ENHANCER_NO_PAUSE=1
```

Estado local de presets/historial/reportes:

```txt
%USERPROFILE%\.image_enhancer_unova
```

Plantillas locales de workflow ComfyUI:

```txt
workflows\comfyui\
```

## Modelos disponibles

| Modelo | Uso recomendado |
|---|---|
| `u2net` | Mejor resultado confirmado hasta ahora; modelo por defecto |
| `birefnet-general` | Alternativa recomendada; tambien dio buen resultado |
| `birefnet-general-lite` | Equilibrio entre precision y velocidad |
| `bria-rmbg` | Recorte IA especializado de alta calidad |
| `birefnet-hrsod` | Objetos destacados / producto principal |
| `birefnet-dis` | Siluetas complejas |
| `birefnet-portrait` | Retratos |
| `isnet-general-use` | Uso general estable |
| `isnet-anime` | Ilustracion/anime |
| `u2net_human_seg` | Personas y retratos |
| `silueta` | Validacion rapida y siluetas simples |

## Flujo de uso

1. Cargar una imagen PNG, JPG, WEBP, BMP o TIFF.
2. Usa el panel derecho para activar o desactivar remocion de fondo.
3. Elegir modelo IA si se remueve fondo. Deja `u2net` como primera opcion; si el borde no queda bien, prueba `birefnet-general`.
4. Activar `Borde IA fino`, `Postprocesar mascara` y `Limpiar objetos/restos sueltos` segun el caso.
5. Usar `Mantener solo objeto principal` solo cuando quieras eliminar todo lo que no este conectado al sujeto dominante.
6. Dejar activo `Descontaminar borde (despill)` para reducir halos del fondo original.
7. Ajustar `Fuerza despill` y `Feather alfa` si el borde queda demasiado duro o demasiado blando.
8. Activar o desactivar mejora de calidad.
9. Elegir un `Modo` segun el contenido:
   - `High Fidelity`: foto general con maxima fidelidad.
   - `Portrait`: retratos; activa face recovery por defecto.
   - `Game Asset`: assets/ilustracion con borde mas firme.
   - `Producto`: recorte de producto con foco en sujeto principal.
   - `Creative`: preset rapido mas agresivo, sin difusion todavia.
10. Elegir motor de upscale:
   - `Real-ESRGAN IA x4`: motor principal; descarga modelo la primera vez y usa CUDA si esta disponible.
   - `LANCZOS rapido`: fallback para pruebas rapidas o cuando Real-ESRGAN/CUDA no cargan.
11. Ajustar factor, nitidez y contraste si necesitas salirte del preset.
12. Activar `Aplicar CodeFormer en retratos` cuando tengas el backend externo configurado.
13. Activar `Detector facial local` si quieres que CodeFormer trabaje por crop facial y mezcla.
14. Activar `Luz/color local` para fotos oscuras o planas; no descarga modelos.
15. En `MODULOS IA`, activa solo las capas que quieras usar. Los modulos futuros aparecen como `No instalado` o `Fallback` hasta su sprint propio.
16. En `BiRefNet premium`, pulsa `Comparar u2net / BiRefNet` para decidir entre segmentacion rapida o premium sin pisar el resultado final.
17. Pulsa `Preview 25%` para una prueba rapida sin upscale completo.
18. Pulsa `Generate` para render final con maxima calidad disponible.
19. Revisa `CALIDAD` para ver tamano, escala, alfa, warnings y runtime del resultado.
20. Usar `Refinar bordes` si necesitas perfeccionar el contorno.
21. Guardar como PNG con transparencia o JPG con fondo blanco.
22. Usa `UE5 Set` para exportar una carpeta `<asset>_UE5_Texture_Set` con `albedo.png`, `depth.png`, `normal.png` y `texture_manifest.json` cuando `ue5_depth`/`ue5_normal_map` estan activos. `depth.png` usa Depth Anything v2 ONNX; `normal.png` es fallback procedural por luminancia hasta validar un ONNX real.

## Modulos IA

Estados visibles:

- `No instalado`: registrado para roadmap, sin modelo/dependencia instalada.
- `Listo`: disponible para activarse.
- `Activo`: afecta el flujo actual.
- `Fallback`: existe una ruta segura alternativa sin romper la app.
- `Error`: modulo desconocido o con fallo de validacion.

Modulos base registrados:

| Modulo | Estado esperado | Comportamiento |
|---|---|---|
| `segmentation_birefnet` | `Listo` | Activa `birefnet-general` como segmentacion premium y permite comparar contra `u2net` |
| `upscale_realesrgan` | `Listo` o `Fallback` | Usa Real-ESRGAN si carga; LANCZOS como fallback |
| `portrait_codeformer` | `Listo` o `Fallback` | Usa CodeFormer externo si esta configurado |
| `portrait_face_detector` | `Listo` o `Fallback` | Detecta rostro localmente para crop/mezcla de CodeFormer |
| `portrait_codeformer_onnx` | `No instalado` | Ruta candidata para CodeFormer ONNX local |
| `portrait_gfpgan_external` | `Fallback` o `Listo` | Backend externo opcional GFPGAN sin PyTorch dentro del EXE |
| `ue5_texture_set` | `Listo` | Exporta carpeta UE5 con `albedo.png`, mapas activos y manifest |
| `ue5_depth` | `Listo` | Genera `depth.png` con Depth Anything v2 Small ONNX y cache externa |
| `ue5_normal_map` | `Listo` | Genera `normal.png` procedural; `IMAGE_ENHANCER_UE5_NORMAL_ONNX` queda como ruta futura |
| `quality_pyiqa` | `Listo` si existe `.venv_pyiqa` o backend configurado | Scoring opcional via `.venv_pyiqa`, `pyiqa` local o `IMAGE_ENHANCER_PYIQA_PYTHON` |
| `color_zero_dce` | `No instalado` | Candidato ONNX para baja luz con fallback local |
| `color_deepwb` | `No instalado` | Candidato ONNX para balance de blancos |
| `color_local_restore` | `Listo` | Restaura luz/color con Pillow sin descargar modelos |
| `restoration_swinir` | `No instalado` | Candidato ONNX opcional SwinIR/HAT/BSRGAN |
| `restoration_nafnet` | `No instalado` | Candidato ONNX opcional para ruido/artefactos |
| `creative_comfyui` | `Fallback` o `Listo` | Backend externo opcional via workflow JSON |
| `production_batch` | `Listo` | Batch, presets guardables, export profiles e historial |

## Fases recomendadas

Estado actual:

- Fase 0: base funcional inicial completada.
- Fase 1: ONNX Runtime GPU/CPU fallback, Real-ESRGAN y ModelManager completada.
- Fase 2: split modular, preview 25%, render final y worker cancelable completada.
- Fase 3: CUDA real estabilizada con DLLs NVIDIA locales y `--smoke-cuda` completada.
- Fase 4: segmentacion premium con BiRefNet y comparacion rapida completada.
- Fase 5 v1: UE5 Texture Set con `albedo.png`, `depth.png` ONNX, `normal.png` procedural y manifest completado.
- Fase 6: metricas simples en resultado/UI/export completadas; `quality_pyiqa` fue validado en runtime externo dedicado y `score` aparece solo si esta activo y el backend responde.
- Fase 7: detector facial local + CodeFormer/GFPGAN externos con fallback no bloqueante completado.
- Fase 8: `color_local_restore` completado; Zero-DCE/DeepWB/SwinIR/NAFNet quedan como candidatos ONNX opcionales.
- Fase 9: produccion completada y endurecida con presets guardables, export profiles, batch por carpeta, historial y reporte final por lote.
- Fase 10: ComfyUI externo opcional integrado con smoke API, workflow JSON, retorno no bloqueante y soporte para reference/control images.
- Fase 11: separado en `..\..\VIDEO_SPRINT.md`; no entra en el runtime actual.

Siguiente orden recomendado:

1. Levantar ComfyUI real y validar un workflow concreto desde `workflows\comfyui`.
2. Validar un ONNX real para `IMAGE_ENHANCER_UE5_NORMAL_ONNX` si se quiere reemplazar el normal procedural.
3. Profundizar Fase 7/8 solo con modelos externos/ONNX ya probados.

No saltar directamente a video, Stable Diffusion, SAM completo o modelos pesados sin fase propia.

## Produccion

- `PRODUCCION` en el panel derecho permite guardar presets, elegir export profile y lanzar batch por carpeta.
- El batch genera reporte JSON final por lote y actualiza el historial local.
- La cancelacion de batch corta la cola restante y deja el reporte marcado como `cancelled`.

## ComfyUI

- Configura endpoint y workflow JSON desde el panel `COMFYUI`.
- Placeholders soportados en el workflow:
  - `__PROMPT__`
  - `__NEGATIVE_PROMPT__`
  - `__COMFY_IMAGE__`
  - `__COMFY_REF_IMAGE__`
  - `__COMFY_CONTROL_IMAGE__`
  - `__OUTPUT_PREFIX__`
- La app puede subir la imagen principal, una `Reference image` y una `Control image`, encolar el workflow y esperar el resultado sin bloquear la UI.
- `Workflow params JSON` permite inyectar placeholders extra como `__STEPS__`, `__CFG__`, `__DENOISE__`, `__SEED__`, `__IPADAPTER_WEIGHT__` o `__CONTROL_STRENGTH__`.
- Hay plantillas base en `workflows\comfyui\basic_txt2img_template.json`, `basic_img2img_template.json`, `ip_adapter_img2img_template.json` y `controlnet_img2img_template.json`.
- IP-Adapter, img2img y ControlNet entran como workflows externos de ComfyUI, no como runtime propio de la app.
- En esta maquina no habia ComfyUI escuchando en `http://127.0.0.1:8188` durante la validacion; `--smoke-comfyui` falla con `WinError 10061` hasta levantar un servidor real y seleccionar workflow.

## Video

- Video vive en sprint separado. Ver `..\..\VIDEO_SPRINT.md`.
- No se mezcla con el pipeline actual hasta estabilizar imagen y UE5.
- Smoke del sprint aislado:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-video-sprint
```

- Ejecucion real por frames:

```bat
.venv\Scripts\python.exe image_enhancer.py --video-source C:\ruta\entrada.mp4 --video-output C:\ruta\salida.mp4 --video-mode light_restore
```

## Refinar bordes

Despues de procesar una imagen, pulsa `Refinar bordes`.

Herramientas disponibles:

- `Borrar restos`: pinta transparencia sobre manchas, halos o partes que sobran.
- `Recuperar borde`: vuelve opacas zonas que el modelo borro de mas, usando la imagen original como fuente de color.
- `Tamano`: controla el diametro del pincel.
- `Fuerza`: controla cuanto afecta cada pasada.
- `Suavidad`: controla si el pincel tiene borde duro o degradado.
- `Suavizar borde`: difumina y estabiliza el canal alfa.
- `Expandir 1 px`: recupera un poco de borde si quedo muy recortado.
- `Contraer 1 px`: limpia halos si el recorte quedo muy ancho.
- `Definir borde`: endurece un borde demasiado blando.
- `Limpiar islas`: elimina restos pequenos aislados.

Pulsa `Aplicar refinado` para volver a la pantalla principal y guardar el resultado.

## Problemas comunes

- Si falta `rembg`, ejecuta `instalar.bat`.
- Si falla la primera remocion de fondo, revisa internet y espacio libre en `%USERPROFILE%\.u2net`.
- Si el EXE no aparece, ejecuta `construir_exe.bat` desde esta carpeta y revisa el error exacto de PyInstaller.
- Si el JPG no conserva transparencia, es normal: JPG no soporta alfa y la app lo guarda con fondo blanco.
- Si una pieza importante desaparece, desactiva `Mantener solo objeto principal` o baja la limpieza minima de restos.
- Si quedan manchas pequenas alrededor del sujeto, sube `Limpieza minima de restos (%)`.
- Si `u2net` no resuelve una imagen concreta, prueba primero `birefnet-general`; despues `birefnet-general-lite` o `bria-rmbg`.
- Si el borde quedo casi bien pero necesita mano fina, usa `Refinar bordes` antes de guardar.
- Si quedan halos de color alrededor del sujeto, sube `Fuerza despill`.
- Si el borde queda dentado, sube un poco `Feather alfa`; si queda borroso, bajalo.
- Si Real-ESRGAN parece lento, revisa la consola: si el provider activo es `CPUExecutionProvider`, CUDA no esta cargando.
- Si aparecen DLLs faltantes como `cublasLt64_12.dll` o `cudnn64_9.dll`, ejecuta `instalar.bat` o reinstala `requirements.txt` para restaurar las ruedas NVIDIA locales.
- Si falla Real-ESRGAN en primera ejecucion, revisa internet y espacio libre en `%USERPROFILE%\.image_enhancer_models`.
- Si `Portrait` activa face recovery pero no tienes CodeFormer instalado aparte, configura `IMAGE_ENHANCER_CODEFORMER_SCRIPT` o desactiva ese toggle.
- Si un modulo futuro aparece como `No instalado`, es intencional: esta registrado sin descargar modelos pesados hasta que se implemente su sprint.

# Image Enhancer - Unova Games Studio

Herramienta local para Windows que permite:

- Remover fondo con IA mediante `rembg`.
- Usar ONNX Runtime GPU con fallback automatico a CPU.
- Elegir modelos especializados como `bria-rmbg` y variantes `birefnet`.
- Generar PNG con transparencia real.
- Mejorar calidad con Real-ESRGAN ONNX x4 como modo IA principal.
- Mantener LANCZOS rapido 2x/3x/4x como fallback.
- Aplicar presets tipo Lupa por contenido: `High Fidelity`, `Portrait`, `Game Asset`, `Producto`, `Creative`.
- Integrar `CodeFormer` como face recovery opcional para retratos via backend externo.
- Descontaminar color de bordes (`despill`) y suavizar alfa fino tras quitar fondo.
- Ajustar nitidez y contraste antes de guardar.
- Previsualizar en modos `Comparar`, `Antes`, `Despues` y `Split A/B`.
- Refinar bordes con pincel manual para borrar restos o recuperar zonas del alfa.
- Activar modulos IA progresivos desde tarjetas locales sin descargar modelos futuros automaticamente.
- Generar preview rapido al 25% separado del render final.
- Comparar segmentacion rapida `u2net` vs premium `birefnet-general` sin alterar el render final.

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

Validacion del registro de modulos IA sin descargar todos los modelos:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-modules
```

Validacion de un modulo concreto:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-module ue5_depth
```

Despues de construir:

```bat
dist\ImageEnhancer-Unova\ImageEnhancer-Unova.exe --smoke
```

Para ejecutar los `.bat` desde una consola automatizada sin que se queden esperando `pause`:

```bat
set IMAGE_ENHANCER_NO_PAUSE=1
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
13. En `MODULOS IA`, activa solo las capas que quieras usar. Los modulos futuros aparecen como `No instalado` o `Fallback` hasta su sprint propio.
14. En `BiRefNet premium`, pulsa `Comparar u2net / BiRefNet` para decidir entre segmentacion rapida o premium sin pisar el resultado final.
15. Pulsa `Preview 25%` para una prueba rapida sin upscale completo.
16. Pulsa `Generate` para render final con maxima calidad disponible.
17. Usar `Refinar bordes` si necesitas perfeccionar el contorno.
18. Guardar como PNG con transparencia o JPG con fondo blanco.

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
| `ue5_depth` | `No instalado` | Reservado para Depth Anything v2 |
| `ue5_normal_map` | `No instalado` | Reservado para normal map IA |
| `quality_pyiqa` | `No instalado` | Reservado para scoring de calidad |
| `color_zero_dce` | `No instalado` | Reservado para correccion de luz/color |
| `creative_comfyui` | `No instalado` | Reservado para ComfyUI local |
| `production_batch` | `No instalado` | Reservado para batch/presets/export profiles |

## Fases recomendadas

Estado actual:

- Fase 0: base funcional inicial completada.
- Fase 1: ONNX Runtime GPU/CPU fallback, Real-ESRGAN y ModelManager completada.
- Fase 2: split modular, preview 25%, render final y worker cancelable completada.
- Fase 3: CUDA real estabilizada con DLLs NVIDIA locales y `--smoke-cuda` completada.
- Fase 4: segmentacion premium con BiRefNet y comparacion rapida completada.

Siguiente orden recomendado:

1. Fase 5: UE5 Texture Tools v1 con export profile, albedo, depth y normal map progresivo.
2. Fase 6: metricas simples de calidad antes de sumar mas modelos.

No saltar directamente a video, Stable Diffusion, SAM completo o modelos pesados sin fase propia.

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

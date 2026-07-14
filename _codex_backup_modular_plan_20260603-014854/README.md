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

## Requisitos

- Windows 10/11.
- Python 3.10.x instalado y disponible como `python`.
- NVIDIA RTX o GPU compatible opcional para CUDA.
- Para CUDA real en Windows: CUDA 12.x y cuDNN 9.x disponibles en el sistema.
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

Validacion real de `rembg` con el modelo ligero:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-rembg --model silueta
```

Validacion real de Real-ESRGAN ONNX. Puede descargar unos 60 MB la primera vez:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-realesrgan
```

Al iniciar o ejecutar los smoke tests, la consola imprime:

```txt
[ONNXRuntime] GPU NVIDIA: detectada/no detectada
[ONNXRuntime] Providers disponibles: ...
[ONNXRuntime] Provider preferido al iniciar: ...
```

Si CUDA/cuDNN faltan, se reportan las DLLs faltantes y se usa CPU fallback.

Validacion de integracion externa de CodeFormer:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-codeformer
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
13. Pulsa `PROCESAR` en la barra inferior y revisa el workspace central con `Comparar`, `Antes`, `Despues` o `Split A/B`.
14. Usar `Refinar bordes` si necesitas perfeccionar el contorno.
15. Guardar como PNG con transparencia o JPG con fondo blanco.

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
- Si aparecen DLLs faltantes como `cublasLt64_12.dll`, instala/verifica CUDA 12.x y cuDNN 9.x para activar `CUDAExecutionProvider`.
- Si falla Real-ESRGAN en primera ejecucion, revisa internet y espacio libre en `%USERPROFILE%\.image_enhancer_models`.
- Si `Portrait` activa face recovery pero no tienes CodeFormer instalado aparte, configura `IMAGE_ENHANCER_CODEFORMER_SCRIPT` o desactiva ese toggle.

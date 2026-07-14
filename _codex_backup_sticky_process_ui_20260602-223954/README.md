# Image Enhancer - Unova Games Studio

Herramienta local para Windows que permite:

- Remover fondo con IA mediante `rembg`.
- Elegir modelos especializados como `bria-rmbg` y variantes `birefnet`.
- Generar PNG con transparencia real.
- Mejorar calidad con upscale LANCZOS rapido 2x/3x/4x.
- Mejorar calidad con Real-ESRGAN ONNX x4 como modo IA real.
- Descontaminar color de bordes (`despill`) y suavizar alfa fino tras quitar fondo.
- Ajustar nitidez y contraste antes de guardar.
- Previsualizar en modos `Comparar`, `Antes`, `Despues` y `Split A/B`.
- Refinar bordes con pincel manual para borrar restos o recuperar zonas del alfa.

## Requisitos

- Windows 10/11.
- Python 3.10.x instalado y disponible como `python`.
- Internet en la primera ejecucion con remocion de fondo para descargar el modelo IA.
- Internet en la primera ejecucion de Real-ESRGAN para descargar el modelo ONNX.

Este proyecto fija `rembg[cpu]==2.0.69` porque el entorno local usa Python 3.10.11 y las versiones nuevas de `rembg` requieren Python 3.11+.

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
2. Activar o desactivar remocion de fondo.
3. Elegir modelo IA si se remueve fondo. Deja `u2net` como primera opcion; si el borde no queda bien, prueba `birefnet-general`.
4. Activar `Borde IA fino`, `Postprocesar mascara` y `Limpiar objetos/restos sueltos` segun el caso.
5. Usar `Mantener solo objeto principal` solo cuando quieras eliminar todo lo que no este conectado al sujeto dominante.
6. Dejar activo `Descontaminar borde (despill)` para reducir halos del fondo original.
7. Ajustar `Fuerza despill` y `Feather alfa` si el borde queda demasiado duro o demasiado blando.
8. Activar o desactivar mejora de calidad.
9. Elegir motor de upscale:
   - `LANCZOS rapido`: recomendado para pruebas rapidas y equipos CPU.
   - `Real-ESRGAN IA x4`: recomendado para resultado final; descarga modelo la primera vez y puede tardar en CPU.
10. Ajustar factor, nitidez y contraste.
11. Procesar y revisar preview con `Comparar`, `Antes`, `Despues` o `Split A/B`.
12. Usar `Refinar bordes` si necesitas perfeccionar el contorno.
13. Guardar como PNG con transparencia o JPG con fondo blanco.

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
- Si Real-ESRGAN parece lento, es normal en CPU: usa `LANCZOS rapido` para iterar y Real-ESRGAN para export final.
- Si falla Real-ESRGAN en primera ejecucion, revisa internet y espacio libre en `%USERPROFILE%\.image_enhancer_models`.

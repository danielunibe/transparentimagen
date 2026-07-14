# Image Enhancer - Unova Games Studio

Herramienta local para Windows que permite:

- Remover fondo con IA mediante `rembg`.
- Elegir modelos especializados como `bria-rmbg` y variantes `birefnet`.
- Generar PNG con transparencia real.
- Mejorar calidad con upscale LANCZOS 2x/3x/4x.
- Ajustar nitidez y contraste antes de guardar.
- Previsualizar en modos `Comparar`, `Antes`, `Despues` y `Split A/B`.

## Requisitos

- Windows 10/11.
- Python 3.10.x instalado y disponible como `python`.
- Internet en la primera ejecucion con remocion de fondo para descargar el modelo IA.

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

## Validaciones

Validacion rapida sin abrir ventana:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke
```

Validacion real de `rembg` con el modelo ligero:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-rembg --model silueta
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
6. Activar o desactivar mejora de calidad.
7. Ajustar factor, nitidez y contraste.
8. Procesar y revisar preview con `Comparar`, `Antes`, `Despues` o `Split A/B`.
9. Guardar como PNG con transparencia o JPG con fondo blanco.

## Problemas comunes

- Si falta `rembg`, ejecuta `instalar.bat`.
- Si falla la primera remocion de fondo, revisa internet y espacio libre en `%USERPROFILE%\.u2net`.
- Si el EXE no aparece, ejecuta `construir_exe.bat` desde esta carpeta y revisa el error exacto de PyInstaller.
- Si el JPG no conserva transparencia, es normal: JPG no soporta alfa y la app lo guarda con fondo blanco.
- Si una pieza importante desaparece, desactiva `Mantener solo objeto principal` o baja la limpieza minima de restos.
- Si quedan manchas pequenas alrededor del sujeto, sube `Limpieza minima de restos (%)`.
- Si `u2net` no resuelve una imagen concreta, prueba primero `birefnet-general`; despues `birefnet-general-lite` o `bria-rmbg`.

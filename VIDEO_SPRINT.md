# VIDEO_SPRINT.md

## Proposito

Separar la futura fase de video del pipeline actual de imagenes para no contaminar el flujo estable de carga -> procesado -> preview -> guardado.

## Estado

- Sprint separado definido.
- Modulo aislado `video_pipeline.py` implementado.
- CLI separado desde `image_enhancer.py` para ejecutar el sprint sin abrir la UI principal.
- Imagen, UE5 y ComfyUI siguen siendo el producto activo.

## Pipeline propuesto por frames

```txt
Video fuente
  -> Extraccion de frames
  -> Cola de procesamiento largo
  -> Pipeline de imagen por frame o modulo dedicado
  -> Interpolacion / restauracion opcional
  -> Ensamble de video final
  -> Export de audio + contenedor final
```

## Requisitos del sprint

1. Progreso largo visible por etapas.
2. Cancelacion fuerte del lote de frames.
3. Export de video final desacoplado del flujo de imagen.
4. Reporte de lote/video terminado.
5. Carpeta temporal controlada y limpiable.

## Implementacion actual

- Analisis del video fuente con `ffprobe`.
- Extraccion de frames con `ffmpeg`.
- Procesamiento por frame en modo:
  - `copy`
  - `light_restore`
- Ensamble final con `ffmpeg` a `mp4`.
- Reuso opcional del audio del video fuente.
- Reporte JSON guardado en el estado local de la app.

## Comandos

Smoke aislado del sprint:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke-video-sprint
```

Ejecucion real del sprint de video:

```bat
.venv\Scripts\python.exe image_enhancer.py --video-source C:\ruta\entrada.mp4 --video-output C:\ruta\salida.mp4 --video-mode light_restore
```

## Evaluaciones pendientes

- `RIFE`: candidato externo para interpolacion de frames via `IMAGE_ENHANCER_RIFE_SCRIPT`.
- `BasicVSR++`: candidato externo para restauracion temporal via `IMAGE_ENHANCER_BASICVSR_SCRIPT`.

Estas rutas quedan evaluadas como integracion externa posible, no como modelos ya instalados o validados end-to-end.

## Regla dura

- No mezclar video con el pipeline actual hasta que imagen y UE5 esten estables.
- No meter modelos de video al EXE base en esta etapa.

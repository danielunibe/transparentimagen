# VIDEO_SPRINT.md

## Proposito

Separar la futura fase de video del pipeline actual de imagenes para no contaminar el flujo estable de carga -> procesado -> preview -> guardado.

## Estado

- Sprint separado definido.
- Sin codigo de video integrado al runtime principal.
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

## Evaluaciones pendientes

- `RIFE`: candidato para interpolacion de frames.
- `BasicVSR++`: candidato para restauracion temporal.

## Regla dura

- No mezclar video con el pipeline actual hasta que imagen y UE5 esten estables.
- No meter modelos de video al EXE base en esta etapa.

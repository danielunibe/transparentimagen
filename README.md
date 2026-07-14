# transparentimagen

Raiz operativa del proyecto consolidado para **Image Enhancer - Unova Games Studio**.

## Estructura canonica

El codigo activo de la app vive en:

```txt
image_enhancer\image_enhancer\
```

Archivos importantes de raiz:

- `AGENTS.md`: protocolo operativo para Codex.
- `TECH_STACK.md`: stack real y comandos.
- `ARCHITECTURE.md`: estructura canonica y limites.
- `CODEX_GUARDRAILS.md`: alcance, protecciones y correcciones.
- `DESIGN.md`: memoria visual.
- `PIPELINE_ROADMAP.md`: orden de integracion por fases.
- `PIPELINE_CHECKLIST.md`: estado actual y pendientes reales.
- `VIDEO_SPRINT.md`: sprint separado de video.

## Entrada rapida

Desde la carpeta canonica de la app:

```bat
cd image_enhancer\image_enhancer
instalar.bat
iniciar.bat
```

Smokes verificados localmente en esta base:

```bat
.venv\Scripts\python.exe image_enhancer.py --smoke
.venv\Scripts\python.exe image_enhancer.py --smoke-modules
.venv\Scripts\python.exe image_enhancer.py --smoke-svg-export
.venv\Scripts\python.exe image_enhancer.py --smoke-ue5-depth-normal
.venv\Scripts\python.exe image_enhancer.py --smoke-quality-pyiqa
.venv\Scripts\python.exe image_enhancer.py --smoke-production-batch
.venv\Scripts\python.exe image_enhancer.py --smoke-video-sprint
```

## Estado real resumido

- El flujo base de imagen esta operativo.
- Produccion local por presets/batch/historial esta operativa.
- El export SVG compatible esta disponible desde guardado y export profiles.
- El sprint de video aislado pasa smoke.
- El EXE reconstruido vive en `image_enhancer\image_enhancer\dist\ImageEnhancer-Unova\ImageEnhancer-Unova.exe`.
- `UE5 Texture Set` exporta `albedo.png`, `depth.png` con Depth Anything v2 ONNX, `normal.png` procedural y manifest cuando los modulos estan activos.
- `quality_pyiqa` esta validado como backend externo dedicado en `.venv_pyiqa`; no es dependencia base.
- `ComfyUI`, `CodeFormer`, `GFPGAN`, `RIFE` y `BasicVSR++` siguen como integraciones externas opcionales, no como runtime base cerrado.
- `ComfyUI` tiene plantillas JSON validas, pero la validacion end-to-end requiere un servidor ComfyUI real escuchando en `http://127.0.0.1:8188`.
- La utilidad principal de la app no depende de ComfyUI: el nucleo propio es recorte con alfa, refinado, Real-ESRGAN, UE5 Texture Set, metricas, presets y batch.

## Notas operativas

- Esta raiz contiene respaldos `_codex_backup_*` creados como rollback puntual.
- `build/`, `dist/`, `__pycache__/` y `.venv/` no son fuente canonica.
- `.venv_pyiqa`, `pyiqa`, `torch` y modelos cacheados no se empaquetan dentro del EXE.
- El proyecto aun no esta versionado con Git; `.gitignore` se deja preparado para cuando se inicialice el repo.

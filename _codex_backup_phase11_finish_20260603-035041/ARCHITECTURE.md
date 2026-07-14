# ARCHITECTURE.md

## 1. Proposito

Este documento registra la organizacion real del proyecto para evitar cambios de ubicacion innecesarios.

## 2. Estructura real

```txt
transparentimagen/
├─ AGENTS.md
├─ TECH_STACK.md
├─ ARCHITECTURE.md
├─ CODEX_GUARDRAILS.md
├─ DESIGN.md
├─ PIPELINE_ROADMAP.md
├─ VIDEO_SPRINT.md
└─ image_enhancer/
   └─ image_enhancer/
      ├─ image_enhancer.py
      ├─ main.py
      ├─ ui.py
      ├─ pipeline.py
      ├─ models.py
      ├─ storage.py
      ├─ comfyui_client.py
      ├─ requirements.txt
      ├─ requirements-build.txt
      ├─ instalar.bat
      ├─ iniciar.bat
      ├─ construir_exe.bat
      └─ README.md
```

## 3. Responsabilidades

| Zona | Responsabilidad | Que no debe contener |
|---|---|---|
| `image_enhancer.py` | CLI de compatibilidad y smoke tests | Logica de UI o procesamiento pesado |
| `main.py` | Entrada minima que importa y arranca la app Tkinter | CLI extendida o pipeline |
| `ui.py` | Tkinter, worker queue, preview/render, metricas visibles, export UE5 y tarjetas de modulos IA | Carga directa de modelos ONNX |
| `pipeline.py` | Procesamiento de imagen, preview 25%, render final, batch por carpeta, metricas simples, comparacion de segmentacion, export UE5, detector facial/crop CodeFormer, ComfyUI externo, restauracion luz-color local, cancelacion y smoke helpers | Widgets Tkinter |
| `models.py` | `ModelManager`, providers ONNX, cache de sesiones y registro `ModuleSpec` | Layout/UI |
| `storage.py` | Persistencia local de presets, historial, reportes y settings opcionales | UI o procesamiento pesado |
| `comfyui_client.py` | Cliente HTTP opcional para ComfyUI local, upload de imagen y polling de workflow | Widgets Tkinter o pipeline base |
| `PIPELINE_ROADMAP.md` | Fases de integracion, orden de modulos y criterios de entrada | Codigo fuente |
| `VIDEO_SPRINT.md` | Sprint separado para video por frames y sus limites | Codigo de runtime mezclado con imagen |
| `requirements.txt` | Dependencias runtime | Dependencias de build o experimentales |
| `requirements-build.txt` | Dependencias para empaquetar | Runtime obligatorio |
| `.bat` | Entrada Windows para instalar, iniciar y construir | Logica compleja de aplicacion |
| `dist/` | Artefactos generados por PyInstaller | Codigo fuente |
| `build/` | Archivos temporales de PyInstaller | Codigo fuente |
| `*_UE5_Texture_Set/` | Carpeta generada por export UE5 con `albedo.png` y manifest | Codigo fuente |
| `%USERPROFILE%\.image_enhancer_models` | Cache externo de Real-ESRGAN ONNX | Codigo fuente o artefactos del repo |
| Backend externo CodeFormer | Recuperacion facial opcional para retratos | Empaquetado PyTorch dentro del EXE en esta fase |

## 4. Reglas anti-monolito

- Fase 2 base completada: el monolito se separa en `ui.py`, `pipeline.py`, `models.py` y `main.py`.
- Real-ESRGAN y sesiones `rembg` se gestionan desde `ModelManager` en `models.py`.
- La comparacion `u2net` vs `birefnet-general` vive como worker separado y ventana guardable; no debe reemplazar `output_image` ni el refinado manual.
- El export UE5 vive como perfil puntual `UE5 Texture Set`; genera `albedo.png` y manifest, y no debe fabricar depth/normal sin modelo validado.
- Las metricas simples viven en `ProcessingResult.metrics`; scoring IA opcional debe entrar como modulo separado.
- CodeFormer se integra como proceso externo desacoplado y opcional; el detector facial local solo define crop/mezcla y no mete PyTorch al EXE.
- `color_local_restore` es el primer modulo operativo de Fase 8 y usa Pillow dentro del pipeline; Zero-DCE/DeepWB/SwinIR quedan como candidatos futuros por ONNX o backend externo.
- Produccion usa persistencia local liviana en `%USERPROFILE%\.image_enhancer_unova`; no debe ensuciar el repo con historial o reportes.
- ComfyUI vive como backend externo opcional con workflow JSON; no se mete Stable Diffusion core dentro de la app base.
- Video queda documentado en `VIDEO_SPRINT.md` y no debe entrar al pipeline actual hasta nueva autorizacion.
- Los modulos futuros se registran con fallback sin descargar modelos hasta que tengan sprint propio.
- El orden de integracion debe seguir `PIPELINE_ROADMAP.md`.

## 5. Modulos protegidos

| Modulo | Motivo | Nivel |
|---|---|---|
| Flujo cargar/procesar/guardar | Es el flujo principal del producto | alto |
| Conversion PNG/JPG | Preserva transparencia o fondo blanco segun formato | alto |
| Stack Python 3.10 + ONNX Runtime GPU/CPU fallback | Decision de compatibilidad local | medio |
| Cache externo de modelos IA | Evita inflar el EXE y mantiene build reproducible | medio |
| `ModelManager` singleton | Evita recargar modelos ONNX entre operaciones | alto |
| `ModuleRegistry` / `ModuleSpec` | Permite activar capas IA sin instalar todo de golpe | alto |
| Worker queue cancelable | Mantiene Tkinter responsivo durante preview/render | alto |
| Comparacion de segmentacion premium | Permite elegir rapido/premium sin pisar el resultado final | medio |
| Metricas simples de calidad | Permiten auditar resultado sin autoajustar el pipeline | medio |
| Export `UE5 Texture Set` | Diferenciador tecnico con naming estable y fallback depth/normal | medio |
| Detector facial local para retratos | Debe mejorar el crop de CodeFormer sin tocar el render base si falla | medio |
| Restauracion luz/color local | Primer fallback operativo de Fase 8 sin dependencias nuevas | medio |
| Presets/historial/reportes de produccion | Soportan continuidad de lote y no deben romperse por limpieza casual | medio |
| Frontera `VIDEO_SPRINT.md` | Impide mezclar video con el pipeline estable de imagen | alto |

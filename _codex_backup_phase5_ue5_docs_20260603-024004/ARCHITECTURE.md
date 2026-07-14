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
└─ image_enhancer/
   └─ image_enhancer/
      ├─ image_enhancer.py
      ├─ main.py
      ├─ ui.py
      ├─ pipeline.py
      ├─ models.py
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
| `ui.py` | Tkinter, worker queue, preview/render y tarjetas de modulos IA | Carga directa de modelos ONNX |
| `pipeline.py` | Procesamiento de imagen, preview 25%, render final, comparacion de segmentacion, cancelacion y smoke helpers | Widgets Tkinter |
| `models.py` | `ModelManager`, providers ONNX, cache de sesiones y registro `ModuleSpec` | Layout/UI |
| `PIPELINE_ROADMAP.md` | Fases de integracion, orden de modulos y criterios de entrada | Codigo fuente |
| `requirements.txt` | Dependencias runtime | Dependencias de build o experimentales |
| `requirements-build.txt` | Dependencias para empaquetar | Runtime obligatorio |
| `.bat` | Entrada Windows para instalar, iniciar y construir | Logica compleja de aplicacion |
| `dist/` | Artefactos generados por PyInstaller | Codigo fuente |
| `build/` | Archivos temporales de PyInstaller | Codigo fuente |
| `%USERPROFILE%\.image_enhancer_models` | Cache externo de Real-ESRGAN ONNX | Codigo fuente o artefactos del repo |
| Backend externo CodeFormer | Recuperacion facial opcional para retratos | Empaquetado PyTorch dentro del EXE en esta fase |

## 4. Reglas anti-monolito

- Fase 2 base completada: el monolito se separa en `ui.py`, `pipeline.py`, `models.py` y `main.py`.
- No mezclar nuevas funciones de batch masivo en la UI actual sin plan previo.
- Real-ESRGAN y sesiones `rembg` se gestionan desde `ModelManager` en `models.py`.
- La comparacion `u2net` vs `birefnet-general` vive como worker separado y ventana guardable; no debe reemplazar `output_image` ni el refinado manual.
- CodeFormer se integra como proceso externo desacoplado y opcional para no mezclar el build ligero actual con dependencias pesadas de PyTorch.
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

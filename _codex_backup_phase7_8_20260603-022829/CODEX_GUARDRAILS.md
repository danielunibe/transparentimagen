# CODEX_GUARDRAILS.md

## 1. Proposito

Registrar limites operativos para que Codex mantenga el proyecto funcional sin modificar areas no solicitadas.

## 2. Regla principal

Modificar solo lo necesario para dejar Image Enhancer funcional y empaquetado como EXE.

## 3. Solicitud activa

### Solicitud #1

- Fecha: 2026-06-02
- Peticion del usuario: implementar el plan para dejar Image Enhancer funcional y empaquetado como `.exe`.
- Objetivo real: app local Windows con instalacion reproducible, smoke tests y build PyInstaller.
- Archivos permitidos: `image_enhancer.py`, scripts `.bat`, requirements, README y documentacion viva.
- Archivos prohibidos: no aplica en esta fase, pero no mover estructura.
- Cambios permitidos: fijar dependencias, corregir selector de modelo, agregar smoke modes, construir EXE.
- Cambios no permitidos: migrar framework, cambiar Python, activar GPU, reordenar carpetas, empaquetar modelos IA.
- Estado: completo.

### Solicitud #2

- Fecha: 2026-06-03
- Peticion del usuario: completar Fase 1 con ONNXRuntime-GPU, Real-ESRGAN ONNX como upscaler principal y `ModelManager` singleton.
- Objetivo real: aprovechar RTX 3070 Ti cuando CUDA este operativo, mantener fallback CPU/LANCZOS y no dividir archivos todavia.
- Archivos permitidos: `image_enhancer.py`, `requirements.txt`, README y documentacion viva.
- Archivos prohibidos: no hacer split de Fase 2 todavia, no migrar UI, no agregar Tauri/PySide6, no meter dependencias pesadas de Real-ESRGAN por pip.
- Cambios permitidos: activar `onnxruntime-gpu`, providers CUDA/CPU, cache singleton de sesiones ONNX, Real-ESRGAN como default, LANCZOS fallback.
- Cambios no permitidos: arquitectura de 6 capas, reescritura del monolito funcional, eliminar flujo cargar/procesar/preview/guardar.
- Estado: completo.

### Solicitud #3

- Fecha: 2026-06-03
- Peticion del usuario: implementar el plan maestro modular con activacion progresiva de modulos IA.
- Objetivo real: completar la base modular, worker queue, preview rapido, render final y registro de modulos sin instalar modelos pesados futuros.
- Archivos permitidos: `image_enhancer.py`, `main.py`, `ui.py`, `pipeline.py`, `models.py`, README y documentacion viva.
- Archivos prohibidos: no instalar SAM, LaMa, Stable Diffusion, Depth Anything, PyIQA, ComfyUI ni modelos de video en esta pasada.
- Cambios permitidos: split de Fase 2 base, `ModuleSpec`, `ModuleRegistry`, tarjetas de modulos, smokes nuevos y cancelacion cooperativa.
- Cambios no permitidos: migrar UI, agregar arquitectura de 6 capas, empaquetar modelos dentro del EXE o cambiar Python.
- Estado: completo.

### Solicitud #4

- Fecha: 2026-06-03
- Peticion del usuario: definir el pipeline por fases, aclarar que ya se hizo, que falta y que debe seguir.
- Objetivo real: crear una fuente de verdad para el roadmap modular.
- Archivos permitidos: `PIPELINE_ROADMAP.md`, README y documentacion viva.
- Archivos prohibidos: codigo de modelos pesados, nuevas dependencias y cambios de UI.
- Cambios permitidos: documentar fases, prioridades, criterios de entrada y orden recomendado.
- Cambios no permitidos: implementar modulos futuros sin sprint propio.
- Estado: completo.

## 4. Cosas que NO se pidieron

| Fecha | No tocar | Motivo | Riesgo si se modifica | Estado |
|---|---|---|---|---|
| 2026-06-02 | Reordenar carpetas | Se eligio endurecer sin mover | Romper rutas de `.bat` y README | protegido |
| 2026-06-02 | Migrar a Python 3.11 | La maquina tiene Python 3.10.11 | Convertir la tarea en migracion | protegido |
| 2026-06-03 | Usar GPU sin fallback CPU | La GPU queda autorizada solo con fallback automatico | Fallos por CUDA/cuDNN pueden bloquear la app | protegido |
| 2026-06-02 | Incluir modelos dentro del EXE | Los modelos son pesados y `rembg` los gestiona | Build enorme y fragil | protegido |
| 2026-06-02 | Presentar LANCZOS como IA | Es interpolacion, no red neuronal | Confundir expectativas de calidad | protegido |
| 2026-06-03 | Instalar modelos futuros por estar registrados | El registro solo prepara activacion progresiva | Inflar entorno, romper build o descargar GBs sin permiso | protegido |
| 2026-06-03 | Saltar el orden de `PIPELINE_ROADMAP.md` sin autorizacion | El roadmap protege fases y prioridades | Mezclar CUDA, UE5, video y creativa en un cambio inmanejable | protegido |

## 5. Zonas protegidas

| Zona | Motivo | Nivel |
|---|---|---|
| Guardado PNG con alfa | Funcion principal | alto |
| Guardado JPG con fondo blanco | Compatibilidad de formato | alto |
| Lista de modelos actual | Aprobada en el plan | medio |
| Scripts Windows | Entrada principal del usuario | medio |
| Motor LANCZOS rapido | Necesario para iterar sin esperas | medio |
| Motor Real-ESRGAN ONNX | Modo IA real de maxima calidad | medio |
| Fallback CPU/LANCZOS | Garantiza que la app funcione aunque falten DLLs CUDA/cuDNN | alto |
| `ModelManager` singleton | Evita recargar modelos ONNX y reduce latencia en operaciones repetidas | alto |
| `ModuleRegistry` / tarjetas de modulos | Base para activacion progresiva segura | alto |
| `CancellationToken` / worker queue | Evita bloquear Tkinter y permite cancelar solicitudes nuevas | alto |
| `PIPELINE_ROADMAP.md` | Fuente de verdad para fases siguientes | alto |
| Despill y feather automaticos | Limpieza visible de halos y bordes | medio |
| Barra inferior con `PROCESAR` | Accion principal confirmada por el usuario | alto |
| Nuevo layout topbar/sidebar/workspace/inspector | Diseno de interfaz adaptado por solicitud del usuario | alto |

## 6. Rollback

- Esta carpeta no tenia Git al iniciar.
- Antes de modificar se creo una carpeta `_codex_backup_YYYYMMDD-HHMMSS` con los archivos originales.

## 7. Historial de cambios autorizados

| Fecha | Cambio | Autorizado por | Riesgo | Rollback |
|---|---|---|---|---|
| 2026-06-02 | App corregida, `.venv`, smoke modes y build EXE | Usuario | medio | restaurar archivos desde `_codex_backup_20260602-204414` |
| 2026-06-02 | UI ampliada, modos de preview, modelos IA especializados y limpieza de restos | Usuario | medio | restaurar archivos desde `_codex_backup_ui_ai_20260602-211337` |
| 2026-06-02 | `u2net` fijado como modelo por defecto | Usuario | bajo | restaurar archivos desde `_codex_backup_u2net_default_20260602-212735` |
| 2026-06-02 | `birefnet-general` marcado como alternativa recomendada | Usuario | bajo | restaurar archivos desde `_codex_backup_birefnet_feedback_20260602-213325` |
| 2026-06-02 | Herramienta manual `Refinar bordes` con pincel alfa | Usuario | medio | restaurar archivos desde `_codex_backup_edge_refiner_20260602-214039` |
| 2026-06-02 | Real-ESRGAN ONNX, despill automatico y feather alfa | Usuario | medio | restaurar archivos desde `_codex_backup_realesrgan_despill_20260602-215450` |
| 2026-06-02 | Barra inferior adaptada del diseño pegado con boton `PROCESAR` visible | Usuario | bajo | restaurar archivos desde `_codex_backup_sticky_process_ui_20260602-223954` |
| 2026-06-02 | Rediseño completo a topbar, sidebar, workspace central e inspector derecho | Usuario | medio | restaurar archivos desde `_codex_backup_new_interface_20260602-225354` |
| 2026-06-02 | Presets tipo Lupa y CodeFormer externo sin meter PyTorch al EXE | Usuario | medio | restaurar archivos desde `_codex_backup_lupa_phase1_20260602` |
| 2026-06-02 | Readaptacion visual basada en el HTML pegado de Olupa | Usuario | medio | restaurar archivos desde `_codex_backup_ui_readapt_20260602` |
| 2026-06-02 | Nueva pasada visual inspirada en LupaAI web para imagenes | Usuario | medio | restaurar archivos desde `_codex_backup_ui_readapt_20260602` |
| 2026-06-02 | Ajuste nativo Windows y acomodo responsivo del layout Tkinter | Usuario | medio | restaurar archivos desde `_codex_backup_ui_readapt_20260602` |
| 2026-06-03 | Fase 1 GPU/Real-ESRGAN/ModelManager con fallback automatico | Usuario | medio | restaurar archivos desde `_codex_backup_phase1_gpu_20260603-005951` |
| 2026-06-03 | Fase 2 base modular con UI de modulos, preview 25% y worker cancelable | Usuario | medio | restaurar archivos desde `_codex_backup_modular_plan_20260603-014854` |
| 2026-06-03 | Roadmap maestro de pipeline por fases | Usuario | bajo | restaurar docs desde `_codex_backup_pipeline_roadmap_20260603-021751` |

## 8. Correcciones del usuario

### Correccion #1

- Fecha: 2026-06-02
- Que aclaro el usuario: `u2net` es el modelo que mejor ha funcionado hasta ahora.
- Regla nueva derivada: no cambiar el modelo por defecto sin nueva confirmacion del usuario.
- Como evitar repetir el error: mantener otros modelos como alternativas, pero iniciar siempre en `u2net`.

### Correccion #2

- Fecha: 2026-06-02
- Que aclaro el usuario: `birefnet` tambien hizo bien el recorte.
- Regla nueva derivada: mantener `birefnet-general` visible como alternativa recomendada de precision.
- Como evitar repetir el error: no ocultar ni bajar demasiado `birefnet-general`; sugerirlo cuando `u2net` no resuelva una imagen.

### Correccion #3

- Fecha: 2026-06-02
- Que pidio el usuario: implementar un metodo para pintar y mejorar considerablemente los bordes.
- Regla nueva derivada: conservar un flujo de refinado manual de alfa posterior al modelo IA.
- Como evitar repetir el error: no depender solo del modelo automatico cuando el usuario necesita perfeccionar contornos.

### Correccion #4

- Fecha: 2026-06-02
- Que aclaro el usuario: LANCZOS no es IA y el salto real de calidad debe venir de Real-ESRGAN.
- Regla nueva derivada: separar claramente motor rapido por interpolacion y motor IA real.
- Como evitar repetir el error: no etiquetar LANCZOS como IA; usar `Real-ESRGAN IA x4` para calidad neural.

### Correccion #5

- Fecha: 2026-06-02
- Que pidio el usuario: corregir contaminacion de bordes y halos despues de `rembg`.
- Regla nueva derivada: mantener `despill` y feather automatico como postproceso del recorte antes del upscale.
- Como evitar repetir el error: no depender solo del matte crudo de `rembg` para resultados finales.

### Correccion #6

- Fecha: 2026-06-02
- Que pidio el usuario: que exista un boton claro para procesar usando el diseño de interfaz pegado como referencia.
- Regla nueva derivada: mantener `PROCESAR` como CTA visible en barra inferior fija; no esconderlo dentro del panel de controles.
- Como evitar repetir el error: si se agregan mas controles, conservar scroll en el inspector derecho y la barra inferior siempre visible.

### Correccion #7

- Fecha: 2026-06-02
- Que pidio el usuario: adaptar el programa para usar un diseño de interfaz nuevo.
- Regla nueva derivada: mantener el layout de topbar, barra lateral de flujo, workspace central, inspector derecho y action bar inferior.
- Como evitar repetir el error: no volver a una distribucion donde los controles compitan con el preview o escondan `PROCESAR`.

### Correccion #8

- Fecha: 2026-06-02
- Que aclaro el usuario: el salto fuerte frente a LANCZOS debe venir de pipelines reales tipo Lupa con Real-ESRGAN y face recovery.
- Regla nueva derivada: no presentar interpolacion clasica como equivalente al pipeline de produccion; separar presets y face recovery de forma explicita.
- Como evitar repetir el error: mantener `LANCZOS` como modo rapido y dejar `Real-ESRGAN` / `CodeFormer` claramente identificados.

### Correccion #9

- Fecha: 2026-06-03
- Que pidio el usuario: empezar por Fase 1 completa antes de Fase 2.
- Regla nueva derivada: no dividir archivos ni introducir worker queue/preview 25% hasta confirmacion explicita de Fase 2.
- Como evitar repetir el error: mantener la implementacion de GPU, Real-ESRGAN y ModelManager dentro del monolito actual hasta la siguiente autorizacion.

### Correccion #10

- Fecha: 2026-06-03
- Que pidio el usuario: Codex debe definir como ir metiendo los modulos y permitir activarlos desde el programa.
- Regla nueva derivada: registrar modulos futuros como `No instalado`/`Fallback` sin descargar ni instalar dependencias hasta que cada modulo tenga sprint propio.
- Como evitar repetir el error: toda familia nueva debe entrar con `ModuleSpec`, smoke test, fallback y cache externa antes de tocar pipeline pesado.

### Correccion #11

- Fecha: 2026-06-03
- Que pidio el usuario: que Codex vaya diciendo las fases, que ya se hizo, que falta y que deberia seguir.
- Regla nueva derivada: mantener `PIPELINE_ROADMAP.md` actualizado cada vez que una fase avance.
- Como evitar repetir el error: no cerrar una fase sin registrar estado, validacion, pendiente externo y siguiente recomendacion.

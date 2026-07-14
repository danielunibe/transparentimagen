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

## 4. Cosas que NO se pidieron

| Fecha | No tocar | Motivo | Riesgo si se modifica | Estado |
|---|---|---|---|---|
| 2026-06-02 | Reordenar carpetas | Se eligio endurecer sin mover | Romper rutas de `.bat` y README | protegido |
| 2026-06-02 | Migrar a Python 3.11 | La maquina tiene Python 3.10.11 | Convertir la tarea en migracion | protegido |
| 2026-06-02 | Usar GPU | La entrega acordada es CPU | Fallos por CUDA/cuDNN | protegido |
| 2026-06-02 | Incluir modelos dentro del EXE | Los modelos son pesados y `rembg` los gestiona | Build enorme y fragil | protegido |
| 2026-06-02 | Presentar LANCZOS como IA | Es interpolacion, no red neuronal | Confundir expectativas de calidad | protegido |

## 5. Zonas protegidas

| Zona | Motivo | Nivel |
|---|---|---|
| Guardado PNG con alfa | Funcion principal | alto |
| Guardado JPG con fondo blanco | Compatibilidad de formato | alto |
| Lista de modelos actual | Aprobada en el plan | medio |
| Scripts Windows | Entrada principal del usuario | medio |
| Motor LANCZOS rapido | Necesario para iterar sin esperas | medio |
| Motor Real-ESRGAN ONNX | Modo IA real de maxima calidad | medio |
| Despill y feather automaticos | Limpieza visible de halos y bordes | medio |
| Barra inferior con `PROCESAR` | Accion principal confirmada por el usuario | alto |

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
- Como evitar repetir el error: si se agregan mas controles, conservar scroll en el panel izquierdo y la barra inferior siempre visible.

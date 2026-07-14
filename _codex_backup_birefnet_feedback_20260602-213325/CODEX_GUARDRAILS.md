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

## 5. Zonas protegidas

| Zona | Motivo | Nivel |
|---|---|---|
| Guardado PNG con alfa | Funcion principal | alto |
| Guardado JPG con fondo blanco | Compatibilidad de formato | alto |
| Lista de modelos actual | Aprobada en el plan | medio |
| Scripts Windows | Entrada principal del usuario | medio |

## 6. Rollback

- Esta carpeta no tenia Git al iniciar.
- Antes de modificar se creo una carpeta `_codex_backup_YYYYMMDD-HHMMSS` con los archivos originales.

## 7. Historial de cambios autorizados

| Fecha | Cambio | Autorizado por | Riesgo | Rollback |
|---|---|---|---|---|
| 2026-06-02 | App corregida, `.venv`, smoke modes y build EXE | Usuario | medio | restaurar archivos desde `_codex_backup_20260602-204414` |
| 2026-06-02 | UI ampliada, modos de preview, modelos IA especializados y limpieza de restos | Usuario | medio | restaurar archivos desde `_codex_backup_ui_ai_20260602-211337` |
| 2026-06-02 | `u2net` fijado como modelo por defecto | Usuario | bajo | restaurar archivos desde `_codex_backup_u2net_default_20260602-212735` |

## 8. Correcciones del usuario

### Correccion #1

- Fecha: 2026-06-02
- Que aclaro el usuario: `u2net` es el modelo que mejor ha funcionado hasta ahora.
- Regla nueva derivada: no cambiar el modelo por defecto sin nueva confirmacion del usuario.
- Como evitar repetir el error: mantener otros modelos como alternativas, pero iniciar siempre en `u2net`.

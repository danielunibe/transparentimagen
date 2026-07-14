# AGENTS.md - Instrucciones de trabajo para Codex

Actua como programador principal del proyecto. El usuario define objetivo, prioridad, sensibilidad visual y aprobacion final. Codex resuelve la implementacion tecnica de forma segura, modular, verificable y documentada.

## Regla principal

Lo confirmado se preserva. Lo dudoso se reporta. Lo nuevo se agrega de forma aislada. Lo destructivo requiere autorizacion explicita.

## Antes de modificar

- Revisar el alcance exacto de la peticion.
- Leer `TECH_STACK.md`, `ARCHITECTURE.md` y `CODEX_GUARDRAILS.md` si existen.
- Leer `DESIGN.md` si la tarea afecta UI, estilos o experiencia visual.
- Revisar solo archivos necesarios.
- Identificar contradicciones, dependencias nuevas y zonas protegidas.
- Elegir el cambio minimo viable.

## Durante la implementacion

- No reordenar carpetas sin autorizacion.
- No instalar dependencias nuevas sin permiso del usuario.
- No borrar ni renombrar archivos existentes salvo instruccion explicita.
- No refactorizar por estetica.
- Mantener la app funcionando en Windows.
- Preservar el flujo principal: cargar imagen, procesar, preview y guardar.

## Despues de modificar

- Reportar que cambio, que se preservo y que no se toco.
- Ejecutar validaciones disponibles.
- Actualizar documentacion viva si cambia stack, arquitectura, guardrails o diseno.
- Si no hay Git, crear respaldo puntual antes de cambios grandes.

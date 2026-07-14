# Asteria Execution Roadmap - Next 10 Phases

Fecha: 2026-06-06

Este roadmap parte del estado real posterior a la Fase 39. No autoriza implementar las diez fases en una sola pasada. Cada fase debe cerrar sus validaciones antes de iniciar la siguiente.

## Phase 40 - Validation Truth Reconciliation

- Estado: `done` el 2026-06-06.
- Objetivo: confirmar el gate actual y eliminar contradicciones entre build, risk register, tech debt y native QA.
- Archivos probables: `docs/VALIDATION_GATE.md`, `docs/RISK_REGISTER.md`, `docs/TECH_DEBT_REGISTER.md`, `docs/ASTERIA_ROADMAP_CURRENT.md`.
- Riesgos: declarar resuelto un gate sin volver a ejecutarlo.
- No hacer: no tocar features ni arquitectura.
- Validaciones: build, typecheck, lint, cargo check, sidecar health/capabilities.
- Criterio de aceptacion: todos los registros describen el mismo estado verificado.

## Phase 41 - Native Window Visual QA Closure

- Objetivo: observar la ventana Tauri real y capturar evidencia de Browser Mode vs Desktop Mode, bridge, sidecar y layout.
- Archivos probables: `docs/NATIVE_WINDOW_QA.md`; codigo solo si se demuestra un bug.
- Riesgos: confundir proceso iniciado con UI validada.
- No hacer: no refactorizar runtime ni cambiar permisos.
- Validaciones: Tauri dev window, QA humana, visual QA, sidecar desde UI.
- Criterio de aceptacion: screenshot o evidencia visual equivalente y checklist nativo completo.

## Phase 42 - Desktop Build and Packaging Preflight

- Objetivo: ejecutar el primer `tauri build` controlado y registrar bloqueos concretos.
- Archivos probables: `src-tauri/tauri.conf.json`, metadata de bundle y docs de packaging.
- Riesgos: sidecar no empaquetado, rutas relativas, identidad placeholder.
- No hacer: no distribuir el artefacto como release final.
- Validaciones: build, Tauri build, apertura del artefacto.
- Criterio de aceptacion: artefacto abre o queda bloqueado con causa reproducible.

## Phase 43 - Sidecar Packaging and Path Contract

- Objetivo: definir como se localizan Python, script, modelos y outputs en desarrollo y app empaquetada.
- Archivos probables: `src-tauri/src/lib.rs`, `src-tauri/tauri.conf.json`, `sidecars/python-ai/*`, docs.
- Riesgos: dependencia accidental del `cwd`, Python global o rutas editables.
- No hacer: no descargar modelos ni incluir runtimes pesados sin autorizacion.
- Validaciones: cargo check, Tauri build, sidecar health/capabilities desde artefacto.
- Criterio de aceptacion: el sidecar funciona sin depender de la carpeta fuente.

## Phase 44 - Tauri Permission and Native Diagnostics Hardening

- Objetivo: inventariar comandos, scopes y errores; exponer System Status sin ampliar filesystem innecesariamente.
- Archivos probables: `src-tauri/capabilities/default.json`, `services/capabilityStatusService.ts`, nueva superficie pequena de status.
- Riesgos: permisos demasiado amplios o claims optimistas.
- No hacer: no habilitar move/copy/delete real.
- Validaciones: build, typecheck, cargo check, Tauri dev window.
- Criterio de aceptacion: permisos minimos y status nativo verificable.

## Phase 45 - UI Hygiene and Status Consistency

- Objetivo: resolver warnings de imagen y unificar empty/loading/error/unsupported/partial badges y microcopy.
- Archivos probables: `features/library/*`, status components compartidos y docs visuales.
- Riesgos: refactor visual demasiado amplio.
- No hacer: no redisenar layout ni cambiar navegacion confirmada.
- Validaciones: build, typecheck, lint, visual QA pequena/grande.
- Criterio de aceptacion: cero warnings historicos objetivo y estados consistentes.

## Phase 46 - PBR Preview Controls and Stability QA

- Objetivo: cerrar cleanup, AO guard, fallbacks, reset, iluminacion/fondo minimos y QA visual.
- Archivos probables: `features/materials/Material3DPreview.tsx`, `services/materialPreviewBindingService.ts`, docs PBR.
- Riesgos: leaks WebGL, binding de mapas sin runtime URL, scope 3D creciente.
- No hacer: no instalar wrappers 3D ni shaders.
- Validaciones: build, typecheck, visual QA, memoria/devtools.
- Criterio de aceptacion: preview estable al cambiar material/geometria y al desmontar.

## Phase 47 - Large Gallery Rendering Foundation

- Objetivo: seleccionar e implementar la estrategia minima de virtualizacion o chunked rendering.
- Archivos probables: `features/library/GalleryGrid.tsx`, `features/library/LibraryView.tsx`, `services/performanceService.ts`.
- Riesgos: selection/keyboard/scroll regressions.
- No hacer: no instalar dependencia sin autorizacion.
- Validaciones: build, typecheck, benchmark 500/1000/2000, visual QA.
- Criterio de aceptacion: trabajo DOM acotado y flujo de seleccion preservado.

## Phase 48 - Thumbnail Scheduler and Object URL Closure

- Objetivo: priorizar viewport, cancelar trabajo fuera de vista, centralizar URLs y definir invalidacion.
- Archivos probables: `hooks/useThumbnailCache.ts`, `services/thumbnailService.ts`, `services/objectUrlRegistry.ts`, `GalleryGrid.tsx`.
- Riesgos: thumbnails en blanco, URLs revocadas antes de tiempo, loops de cola.
- No hacer: no persistir object URLs ni File handles.
- Validaciones: build, typecheck, benchmark, inspeccion de memoria.
- Criterio de aceptacion: cola acotada, visible-first, cancelable y sin crecimiento sostenido de URLs.

## Phase 49 - Canonical Search, Saved Views, Jobs and Safe Ops Contracts

- Objetivo: cerrar QA canonica y contratos antes de las siguientes implementaciones de producto.
- Archivos probables: `services/criteriaService.ts`, `services/searchService.ts`, `services/smartCollectionService.ts`, jobs/report services, file-operation docs.
- Riesgos: mezclar cuatro features grandes en una reescritura.
- No hacer: no implementar operaciones reales; dividir la fase en subentregas si el diff supera el alcance seguro.
- Validaciones: typecheck, fixtures de search, persistence QA, report JSON QA.
- Criterio de aceptacion: criterios explicables/versionables, lifecycle unico documentado y contrato de operaciones seguras aprobado.

## Gate entre fases

Cada fase debe reportar:

- archivos modificados;
- comportamiento preservado;
- riesgos;
- validaciones ejecutadas;
- resultado real;
- rollback;
- siguiente fase autorizable.

Si `npm run build` o `npm run typecheck` falla, no se avanza.

Siguiente fase ejecutable: Phase 41 - Native Window Visual QA Closure.

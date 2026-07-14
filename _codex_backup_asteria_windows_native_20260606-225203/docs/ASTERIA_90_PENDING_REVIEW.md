# Asteria 90 Pending Review

Fecha de auditoria: 2026-06-06

## 1. Resumen ejecutivo

Esta revision contrasta los 90 pendientes con el codigo y la documentacion real de:

`C:\Desarrollos DEV daniel\transparentimagen\asteria`

La fase es exclusivamente de auditoria, clasificacion y roadmap. No implementa features nuevas, no descarga modelos y no ejecuta operaciones destructivas.

Estado resumido:

| Estado | Cantidad |
| --- | ---: |
| `done` | 16 |
| `partially_done` | 45 |
| `pending` | 26 |
| `blocked` | 3 |
| Total | 90 |

Hallazgos principales:

- El runtime Tauri de desarrollo y el bridge ya tienen evidencia visual directa. El sidecar funcionaba por CLI y ahora el contrato de ruta de desarrollo quedó corregido en Rust; la validacion visual nativa de esta sesion quedo truncada por timeout.
- El build frontend fue recuperado y el gate actual debe volver a verificarse en esta fase. Algunos registros todavia describian la regresion anterior como activa.
- Material Vault ya tiene binding PBR basico, AO, candidatos de height/opacity/emissive, diagnostics y cleanup de recursos. Ahora hay fixtures PBR temporales fuera del repo para completar QA visual.
- La galeria tiene guardrails, memoizacion, carga acotada de thumbnails y registro parcial de object URLs, pero no tiene virtualizacion, paging ni scheduler por viewport.
- Search y Smart Collections tienen una base canonica amplia, pero faltan explicabilidad, edicion robusta de Saved Views y pruebas de contrato.
- Jobs y Processing Reports existen de forma parcial. Falta un dashboard realmente unificado, retry, filtros, agrupacion de errores y archivo consistente.
- Safe File Operation Plans y dry-run ya existen como preview-only. La ejecucion real, permisos y auditoria local siguen bloqueados por el contrato de seguridad.

## 2. Estado actual confirmado por el repo

- Stack: Next.js 15, React 19, TypeScript, Tailwind 4, Tauri 2, Rust y Python sidecar.
- Runtime oficial: Asteria bajo `asteria`; el proyecto Python/Tkinter permanece legacy/referencia.
- Tauri: bridge cerrado con comandos de runtime, sidecar e imagen.
- Sidecar: comandos `health`, `capabilities`, `models`, `validate-models`, resize, convert, remove-bg, enhance y upscale.
- Sidecar dev: el script y la carpeta de modelos ya se resuelven desde la raiz del repo en Rust, no desde `src-tauri`.
- Persistencia: metadata-first; object URLs y archivos se mantienen como datos de sesion.
- Material Vault: deteccion PBR, diagnostics, overrides, target engine, package metadata y preview Three.js directo.
- Performance: warnings por tamano, search diferido, thumbnail budget, concurrencia acotada y cache IndexedDB.
- File operations: planes preview-only; la ejecucion real esta deshabilitada.
- Real-ESRGAN: no disponible sin modelo ONNX local aprobado.

## 3. Criterio de estados

- `done`: existe implementacion y evidencia suficiente para el alcance exacto del pendiente.
- `partially_done`: existe una base real, pero falta cierre funcional, visual, de seguridad o QA.
- `pending`: no existe implementacion suficiente.
- `blocked`: depende de una decision o prerrequisito que no debe improvisarse.
- `not_recommended_yet`: reservado para expansiones que deben esperar estabilidad. Ningun punto se elimina; se ordena por dependencias.

## 4. Revision de los 90 pendientes

### Grupo 1 - Desktop Runtime / Tauri / Packaging

| # | Pendiente | Estado | Tipo | Prioridad | Dependencias | Riesgo | Validacion |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 1 | QA real de ventana nativa Tauri | `done` | QA, packaging | P0 | build verde, Tauri dev | medio | captura nativa 802 x 632, QA visual |
| 2 | Crear/actualizar `NATIVE_WINDOW_QA.md` | `done` | docs, QA | P1 | 1 | bajo | revision documental |
| 3 | Deteccion Browser Mode vs Desktop Mode | `done` | frontend, architecture | P0 | runtime bridge | bajo | build, typecheck, Tauri dev window |
| 4 | Validacion visual del Tauri bridge en UI | `done` | frontend, QA | P0 | 1, 3 | medio | `Tauri Runtime` visible e invocacion nativa confirmada |
| 5 | Validacion del Python sidecar desde UI | `partially_done` | python-sidecar, frontend, QA | P0 | 1, 3 | medio | sidecar health, capabilities, Tauri dev window |
| 6 | Manejo visual de errores de sidecar | `partially_done` | frontend, python-sidecar | P1 | 5, error contract | medio | Tauri dev window, QA humana |
| 7 | Build desktop real con Tauri | `partially_done` | packaging, backend/tauri | P0 | frontend gate, 1 | alto | Tauri build, apertura del artefacto |
| 8 | Packaging readiness Windows | `pending` | packaging | P0 | 7, 9, 11-14 | alto | Tauri build, QA humana |
| 9 | Verificacion WebView2/dependencias Windows | `partially_done` | packaging, QA | P1 | 7 | medio | Tauri build, apertura en Windows limpio |
| 10 | Modo diagnostico nativo | `partially_done` | frontend, backend/tauri | P1 | runtime truth layer | medio | Tauri dev window, sidecar checks |
| 11 | Bundling correcto del sidecar Python | `blocked` | packaging, python-sidecar, architecture | P0 | estrategia de runtime Python aprobada | alto | Tauri build, sidecar health empaquetado |
| 12 | Rutas seguras en app empaquetada | `blocked` | backend/tauri, security, packaging | P0 | 11, path resolver | alto | Tauri build, sidecar checks empaquetados |
| 13 | Permisos Tauri revisados | `partially_done` | security, backend/tauri | P0 | inventario de comandos | alto | cargo check, Tauri dev window |
| 14 | Iconos/metadata del instalador | `partially_done` | packaging | P2 | identidad/version final | bajo | Tauri build, inspeccion instalador |
| 15 | Prueba de apertura post-build | `pending` | QA, packaging | P0 | 7, 8 | alto | apertura real, QA humana |

### Grupo 2 - UI Hygiene / Visual Consistency / Build Cleanliness

| # | Pendiente | Estado | Tipo | Prioridad | Dependencias | Riesgo | Validacion |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 16 | Resolver warnings historicos de `img` | `pending` | frontend | P1 | build verde | bajo | build, lint, visual QA |
| 17 | Estados vacios consistentes | `partially_done` | frontend | P2 | inventario de pantallas | bajo | visual QA |
| 18 | Estados de carga globales | `partially_done` | frontend | P1 | job/runtime vocabulary | medio | visual QA, QA humana |
| 19 | Sistema visual comun de errores | `partially_done` | frontend, architecture | P1 | error contract | medio | build, visual QA |
| 20 | Consistencia de badges | `partially_done` | frontend | P2 | tokens visuales | bajo | visual QA |
| 21 | Responsive del Inspector | `partially_done` | frontend, QA | P1 | native size QA | medio | ventana pequena/grande |
| 22 | Pulido de navegacion principal | `partially_done` | frontend | P2 | flujo de producto confirmado | bajo | visual QA |
| 23 | Validacion de tema visual completo | `partially_done` | frontend, QA | P2 | 17-22 | medio | visual QA |
| 24 | Reducir duplicacion entre cards/panels | `pending` | frontend, architecture | P2 | auditoria de componentes | medio | build, typecheck, visual QA |
| 25 | Pantalla About/System Status | `pending` | frontend, runtime | P1 | 10, runtime truth | bajo | build, Tauri dev window |
| 26 | Estados unsupported/blocked/partial unificados | `partially_done` | frontend, architecture | P1 | capability/job vocabulary | medio | build, typecheck, QA humana |
| 27 | Microcopy tecnico mas claro | `partially_done` | frontend, docs | P2 | 26 | bajo | QA humana |
| 28 | Layout QA en ventana pequena | `pending` | QA, frontend | P1 | 21 | medio | Tauri dev window, visual QA |
| 29 | Layout QA en ventana grande | `pending` | QA, frontend | P2 | 21 | bajo | Tauri dev window, visual QA |
| 30 | Documentar design constraints basicos | `pending` | docs, frontend | P1 | 23 | bajo | revision documental |

### Grupo 3 - Material Vault / PBR / 3D Preview

| # | Pendiente | Estado | Tipo | Prioridad | Dependencias | Riesgo | Validacion |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 31 | `materialPreviewBindingService.ts` | `done` | material-vault, architecture | P0 | metadata consolidada | bajo | build, typecheck |
| 32 | Binding PBR mas completo | `partially_done` | material-vault, frontend | P1 | 31 | medio | visual QA, build |
| 33 | Fallbacks mas claros del preview 3D | `partially_done` | material-vault, frontend | P1 | runtime truth | bajo | visual QA |
| 34 | Cleanup avanzado de Three.js | `partially_done` | performance, material-vault | P0 | 31, lifecycle review | alto | visual QA, memoria/devtools |
| 35 | Controles minimos del preview 3D | `partially_done` | frontend, material-vault | P1 | renderer estable | medio | visual QA |
| 36 | Selector de iluminacion basica | `pending` | frontend, material-vault | P2 | 35 | medio | visual QA |
| 37 | Selector de fondo del preview | `pending` | frontend, material-vault | P2 | 35 | bajo | visual QA |
| 38 | QA visual del preview 3D | `pending` | QA, material-vault | P0 | 32-37 | medio | Tauri dev window, visual QA |
| 39 | Soporte seguro de AO map | `partially_done` | material-vault | P1 | UV guard | medio | visual QA |
| 40 | Preparar height/displacement como futuro | `done` | material-vault, architecture | P3 | 31 | bajo | typecheck |
| 41 | Preparar opacity/alpha como futuro | `done` | material-vault, architecture | P3 | 31 | bajo | typecheck |
| 42 | Preparar emissive como futuro | `partially_done` | material-vault | P2 | 31, runtime URL | medio | visual QA |
| 43 | Material diagnostics mas visual | `partially_done` | material-vault, frontend | P1 | diagnostics service | bajo | visual QA |
| 44 | Editor de metadata material robusto | `partially_done` | material-vault, frontend | P1 | validation rules | medio | build, QA humana |
| 45 | Historial de cambios de metadata | `pending` | material-vault, storage | P2 | schema/versioning | medio | typecheck, persistence QA |
| 46 | Manual override UX mas clara | `partially_done` | material-vault, frontend | P1 | 44 | medio | visual QA |
| 47 | Target engine readiness explicita | `partially_done` | material-vault | P1 | diagnostics canonical | bajo | visual QA |
| 48 | Comparar detectados vs overrides | `partially_done` | material-vault | P1 | override metadata | medio | visual QA |
| 49 | Material preview performance guard | `partially_done` | performance, material-vault | P1 | 34 | medio | performance QA |
| 50 | Documentar limitaciones PBR reales | `done` | docs, material-vault | P1 | 31-49 | bajo | revision documental |

### Grupo 4 - Performance / Library / Thumbnails

| # | Pendiente | Estado | Tipo | Prioridad | Dependencias | Riesgo | Validacion |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 51 | Virtualizacion real de galeria | `pending` | performance, frontend | P0 | estrategia sin dependencia nueva | alto | benchmark, visual QA |
| 52 | Paginacion/carga incremental | `pending` | performance, frontend | P1 | 51 o alternativa aprobada | medio | benchmark, QA humana |
| 53 | Thumbnail queue real | `partially_done` | performance, frontend | P0 | scheduler y cancelacion | medio | benchmark |
| 54 | Object URL registry completo | `partially_done` | performance, architecture | P0 | inventario de creadores | alto | memoria/devtools, build |
| 55 | Worker para filtros/search | `pending` | performance, frontend | P1 | serializable criteria | medio | benchmark, typecheck |
| 56 | Memoizacion avanzada de filtros | `partially_done` | performance, frontend | P1 | criterios estables | medio | benchmark |
| 57 | Cache invalidation clara | `partially_done` | performance, storage | P1 | cache keys/version | medio | cache QA |
| 58 | Indicador de coleccion grande | `done` | frontend, performance | P2 | tiers | bajo | visual QA |
| 59 | Preload inteligente de thumbnails | `partially_done` | performance | P1 | 53 | medio | benchmark |
| 60 | Medicion basica de performance | `pending` | performance, QA | P1 | escenarios repetibles | bajo | benchmark |
| 61 | Cancelar thumbnails fuera de viewport | `pending` | performance | P1 | viewport observer, 53 | medio | benchmark |
| 62 | Priorizar thumbnails visibles | `pending` | performance | P0 | 53, 61 | medio | benchmark |
| 63 | Evitar recomputacion Smart Collections | `partially_done` | performance, frontend | P1 | criteria cache | medio | benchmark |
| 64 | Benchmark 500/1000/2000 assets | `pending` | performance, QA | P0 | 51-63 o baseline | bajo | benchmark documentado |
| 65 | Documentar limites de rendimiento | `done` | docs, performance | P1 | tiers actuales | bajo | revision documental |

### Grupo 5 - Search / Smart Collections / Organization

| # | Pendiente | Estado | Tipo | Prioridad | Dependencias | Riesgo | Validacion |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 66 | Smart Collections profundas para materiales | `partially_done` | frontend, material-vault | P1 | canonical criteria | medio | canonical search QA |
| 67 | Search avanzado por metadata | `done` | frontend, architecture | P1 | metadata normalizada | bajo | typecheck, canonical search QA |
| 68 | Saved Views mas robustas | `partially_done` | frontend, storage | P1 | schema/versioning | medio | persistence QA |
| 69 | Smart folders mas explicables | `partially_done` | frontend, architecture | P1 | 71 | medio | QA humana |
| 70 | Sugerencias de organizacion | `done` | frontend, architecture | P2 | metadata local | bajo | QA humana |
| 71 | Explain why matched | `pending` | frontend, architecture | P1 | evaluator con razones | medio | canonical search QA |
| 72 | Tokens fecha/dimension/engine/score | `done` | frontend, architecture | P1 | canonical parser | bajo | canonical search QA |
| 73 | UI para editar Saved Views | `pending` | frontend | P2 | 68 | medio | visual QA |
| 74 | Exportar/importar criterios metadata-only | `pending` | frontend, storage | P2 | 68, schema version | medio | import/export QA |
| 75 | QA de busquedas canonicas | `pending` | QA, frontend | P0 | 67, 72 | medio | tests/fixtures |

### Grupo 6 - Export / Batch / Jobs / Reports

| # | Pendiente | Estado | Tipo | Prioridad | Dependencias | Riesgo | Validacion |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 76 | Package Export para materiales | `partially_done` | frontend, material-vault | P1 | manifest estable | medio | build, export QA |
| 77 | Processing Reports UI | `partially_done` | frontend | P1 | reports metadata-only | bajo | visual QA |
| 78 | Jobs dashboard unificado | `partially_done` | frontend, architecture | P0 | lifecycle canonical | alto | build, QA humana |
| 79 | Historial de jobs | `partially_done` | storage, frontend | P1 | unified schema | medio | persistence QA |
| 80 | Reintento seguro de jobs fallidos | `pending` | frontend, architecture | P1 | 78, idempotencia | alto | failure QA |
| 81 | Filtros por estado de job | `pending` | frontend | P2 | 78 | bajo | visual QA |
| 82 | Metricas de duracion de jobs | `partially_done` | architecture, frontend | P2 | timestamps comunes | bajo | report QA |
| 83 | Reportes descargables metadata-only | `done` | frontend, storage | P1 | sanitizacion | bajo | export JSON QA |
| 84 | Errores agrupados por causa | `partially_done` | frontend, architecture | P1 | errorCode canonical | medio | failure QA |
| 85 | Limpieza/archivado de jobs antiguos | `partially_done` | storage | P2 | retention policy | medio | persistence QA |

### Grupo 7 - Safe File Operations / Local Security

| # | Pendiente | Estado | Tipo | Prioridad | Dependencias | Riesgo | Validacion |
| ---: | --- | --- | --- | --- | --- | --- | --- |
| 86 | Safe File Operation Plans | `done` | security, architecture | P0 | metadata local | bajo | typecheck, dry-run QA |
| 87 | Confirmacion segura de operaciones reales | `pending` | security, frontend | P0 | 86, conflict policy, rollback | alto | QA humana, Tauri dev |
| 88 | Permisos Tauri para file operations | `blocked` | security, backend/tauri | P0 | 87, scopes/allowlists aprobados | alto | cargo check, Tauri dev |
| 89 | Dry-run de organizacion | `done` | security, frontend | P0 | 86 | bajo | visual QA |
| 90 | Registro/auditoria de operaciones locales | `partially_done` | security, storage | P1 | 87, immutable event schema | alto | persistence QA |

## 5. Clasificacion por prioridad

- P0: build/desktop readiness, native visual QA, sidecar packaging/path resolution, Tauri permissions, Three.js cleanup, virtualization/thumbnail scheduling, canonical search QA, jobs unificados y file-operation safety.
- P1: error/status consistency, responsive QA, PBR polish, cache discipline, Saved Views, material export y observabilidad.
- P2: visual polish, About/System Status, lighting/background controls, metadata history, job filters y retention.
- P3: placeholders futuros que ya estan modelados pero no deben convertirse en feature sin necesidad.

## 6. Dependencias maestras

1. El gate frontend debe pasar antes de cualquier `tauri build`.
2. La ventana nativa debe observarse realmente antes de declarar desktop-ready.
3. El bundling del sidecar y la resolucion de rutas deben definirse antes del packaging final.
4. Los permisos Tauri no deben ampliarse antes de tener confirmacion, allowlists, conflictos, rollback y auditoria.
5. La virtualizacion/paging debe decidirse antes de profundizar features que aumenten el costo del grid.
6. Jobs/reports deben converger antes de agregar retry y archivo.
7. Saved Views necesitan schema/versioning antes de import/export.
8. PBR opcional necesita runtime URLs seguros y cleanup confirmado antes de height/opacity reales.

## 7. Riesgos criticos

- Divergencia entre browser y runtime nativo.
- Packaging sin sidecar reproducible.
- Rutas relativas que funcionan en desarrollo pero fallan empaquetadas.
- Permisos de filesystem demasiado amplios.
- Leaks de texturas, renderer y object URLs.
- Grid completo sin virtualizacion para 2k+ assets.
- Estado duplicado entre AI jobs, batch, export y reports.
- Documentacion que conserva bloqueos ya resueltos o presenta parciales como completos.

## 8. Que no debe hacerse todavia

- No ejecutar move/copy/delete reales.
- No ampliar permisos Tauri por conveniencia.
- No descargar ni activar Real-ESRGAN sin modelo aprobado.
- No agregar wrappers 3D, shaders o controles pesados.
- No instalar una dependencia de virtualizacion sin demostrar que la solucion actual no basta.
- No hacer packaging final antes de resolver sidecar, rutas y apertura post-build.
- No convertir placeholders de PBR en claims de soporte real.

## 9. Requiere autorizacion explicita

- Nueva dependencia de virtualizacion o 3D.
- Estrategia de distribucion del runtime Python.
- Inclusión de Python/modelos dentro del bundle.
- Ampliacion de scopes Tauri para filesystem.
- Activacion de operaciones reales move/copy/delete.
- Instalacion o descarga de modelos.

## 10. Requiere QA humana o ventana Tauri real

- 1, 4, 5, 6, 7, 9, 10, 15.
- 21, 23, 28, 29.
- 33, 35-39, 42-49.
- 73, 77, 78, 81.
- 87-90.

## 11. Requiere packaging

- 7-15.
- Verificacion del sidecar desde el artefacto instalado.
- Apertura post-build y comprobacion de WebView2.

## 12. Requiere modelo local

- Ningun pendiente de esta revision debe descargar modelos.
- Real-ESRGAN permanece fuera del cierre hasta que exista un ONNX aprobado y validado.

## 13. Orden recomendado

El orden operativo se define en:

`docs/ASTERIA_EXECUTION_ROADMAP_NEXT_10_PHASES.md`

La evidencia visual nativa quedo capturada en Phase 41. La primera fase siguiente recomendada es Phase 41B - Native Sidecar Path and PBR Fixture QA. Esa fase quedo `partially_done` en esta corrida porque el fix del sidecar se aplico, pero la verificacion visual nativa quedo truncada por timeout.

## 14. Criterios globales de aceptacion

- Cada fase mantiene build, typecheck y lint verdes.
- Los cambios Tauri mantienen `cargo check` verde.
- Los cambios del sidecar mantienen `health` y `capabilities` verdes.
- No se persisten `Blob`, `File` ni `objectUrl`.
- No se habilita una capability que el runtime no confirme.
- No se ejecutan operaciones destructivas sin plan, confirmacion, conflicto, rollback y log.
- No se declara desktop-ready sin ventana observada y artefacto abierto.
- Cada parcial conserva un estado honesto en UI y documentacion.

## 15. Validacion ejecutada

Resultado del 2026-06-06:

| Validacion | Resultado |
| --- | --- |
| `npm run build` | pasa; `/` y `/_not-found` prerenderizan |
| `npm run typecheck` | pasa |
| `npm run lint` | pasa con 0 errores y 3 warnings historicos `no-img-element` |
| `cargo check --manifest-path src-tauri\Cargo.toml` | pasa |
| `python sidecars/python-ai/asteria_sidecar.py health` | pasa; sidecar `0.3.0` |
| `python sidecars/python-ai/asteria_sidecar.py capabilities` | pasa; Pillow/rembg/onnxruntime disponibles |

Capability pendiente confirmada:

- Real-ESRGAN sigue en `model_missing`.
- No se descargo ningun modelo.
- El build Tauri de release y la apertura post-build no se ejecutaron en esta fase documental.
- La ventana Tauri real fue capturada a 802 x 632.
- Browser Mode mostro el model manager como `unsupported`; Desktop Mode activo el bridge.
- Desktop Mode fallo al buscar `sidecars/python-ai/asteria_sidecar.py` bajo `src-tauri`.
- Material Vault cargo en ambos modos, pero no habia materiales PBR para cerrar el pendiente 38.

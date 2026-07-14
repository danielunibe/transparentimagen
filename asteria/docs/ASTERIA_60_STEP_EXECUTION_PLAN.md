# Asteria 60 Step Execution Plan

## Summary

This roadmap converts the 60 pending items into a phased execution plan. The ordering is intentionally conservative: desktop/runtime truth first, UI hygiene next, then 3D preview polish, performance, type cleanup, Material Vault depth, safe file ops, local AI activation, observability, and finally packaging/doc truth hardening.

## Phase States

- `pending`: not started.
- `in_progress`: currently being executed.
- `blocked`: depends on an unresolved technical or authorization blocker.
- `partially_done`: some parts are in place, but the phase is not fully complete.
- `done`: implemented and validated.

## Recommended Execution Order

1. Desktop runtime QA.
2. Desktop build readiness.
3. UI hygiene.
4. Material 3D preview polish.
5. Large library performance.
6. Type architecture cleanup.
7. Material Vault intelligence.
8. Jobs / reports / observability.
9. Safe file operations.
10. Local AI activation.
11. Packaging readiness.
12. Documentation truth-layer hardening.

## Block A - Desktop Runtime & Native QA

### 1. QA real de ventana nativa Tauri
- Status: done
- Depends on: Tauri dev runtime, desktop bridge, visual access
- Acceptance: native window opens, UI loads, runtime distinguishes desktop

### 2. Documento `NATIVE_WINDOW_QA.md`
- Status: done
- Depends on: task 1 results
- Acceptance: command, result, differences, screenshots note, blockers captured

### 3. Build desktop real
- Status: partially_done
- Depends on: frontend build green and stable prerender
- Acceptance: `tauri build` runs or is blocked with concrete reason

### 30. Packaging readiness final
- Status: pending
- Depends on: tasks 1, 3, and stable release gates
- Acceptance: packaging checklist complete and repeatable

## Block B - UI Hygiene & Build Cleanliness

### 4. Resolver warnings históricos de `<img>`
- Status: pending
- Depends on: no hard dependency
- Acceptance: lint clean or justified exceptions documented

## Block C - Material 3D Preview Polish

### 5. Pulido del binding PBR
- Status: partially_done
- Depends on: current preview renderer and binding helper
- Acceptance: core PBR maps bind safely and explicitly

### 6. Servicio `materialPreviewBindingService.ts`
- Status: done
- Depends on: material metadata model
- Acceptance: pure helper exists and is used by preview

### 7. Fallbacks más claros del preview 3D
- Status: partially_done
- Depends on: preview renderer, runtime truth, diagnostics
- Acceptance: missing WebGL, missing dependency, missing maps, overrides are explained clearly

### 8. Cleanup avanzado de Three.js
- Status: partially_done
- Depends on: renderer lifecycle
- Acceptance: geometry, material, textures, renderer, RAF, observers cleaned up

### 9. Controles mínimos del preview 3D
- Status: pending
- Depends on: stable preview renderer
- Acceptance: small local controls only, no heavy editor behavior

### 10. Selector de iluminación básica
- Status: pending
- Depends on: stable preview renderer
- Acceptance: minimal, safe lighting presets only

### 11. QA visual del preview 3D
- Status: pending
- Depends on: tasks 5-10
- Acceptance: visual pass on sphere/cube/plane and material states

## Block D - Large Library Performance

### 12. Virtualización real de galería
- Status: pending
- Depends on: gallery behavior and scroll model
- Acceptance: large lists render with bounded work

### 13. Paginación o carga incremental
- Status: pending
- Depends on: gallery performance plan
- Acceptance: incremental loading works safely

### 14. Thumbnail queue real
- Status: pending
- Depends on: thumbnail lifecycle
- Acceptance: bounded thumbnail work queue

### 15. Object URL registry completo
- Status: partially_done
- Depends on: runtime-only preview and image pipeline
- Acceptance: creation and revocation are centralized

### 16. Worker para filtros/search
- Status: pending
- Depends on: search hot paths and dataset size
- Acceptance: heavy filters are off main thread or deferred

## Block E - Type Architecture Cleanup

### 17. Unificación final de tipos por dominio
- Status: partially_done
- Depends on: domain splits already started
- Acceptance: domain types are separated and consistent

### 18. Eliminar barrel legacy gradualmente
- Status: pending
- Depends on: domain type splits
- Acceptance: legacy barrel reliance reduced safely

## Block F - Material Vault Intelligence

### 19. Smart Collections más profundas para materiales
- Status: partially_done
- Depends on: canonical material metadata
- Acceptance: deeper material collections stay aligned with diagnostics

### 20. Editor de metadata material más robusto
- Status: partially_done
- Depends on: metadata model and diagnostics
- Acceptance: edits are safe, visible, and metadata-only

### 21. Historial de cambios de metadata
- Status: pending
- Depends on: material metadata edit flow
- Acceptance: changes are traceable

### 22. Package Export para materiales
- Status: partially_done
- Depends on: manifest shape and material metadata
- Acceptance: metadata-only export remains honest

## Block G - Safe File Operations

### 23. Safe File Operation Plans
- Status: pending
- Depends on: file mutation workflows
- Acceptance: planned operations are explicit and reviewable
- Special authorization: yes, for destructive execution

### 24. Confirmación segura de operaciones reales
- Status: pending
- Depends on: safe operation plans
- Acceptance: confirmations and rollback intent are visible
- Special authorization: yes, for real file changes

## Block H - Local AI Model Activation

### 25. Real-ESRGAN ONNX activation
- Status: blocked
- Depends on: local model availability and explicit approval
- Acceptance: model present, validated, and truthfully reported
- Special authorization: yes

### 26. Model Manager UI más completa
- Status: pending
- Depends on: model truth and activation workflow
- Acceptance: model presence and validation are clearly surfaced

## Block I - Jobs / Reports / Observability

### 27. Processing Reports UI
- Status: pending
- Depends on: report data availability
- Acceptance: processing reports are readable and actionable

### 28. Jobs dashboard unificado
- Status: partially_done
- Depends on: unified job lifecycle already in place
- Acceptance: one dashboard reflects current job truth

## Block J - Documentation Truth Layer

### 29. Documentation truth-level hardening
- Status: partially_done
- Depends on: all current phases and runtime truth
- Acceptance: docs say what is real, partial, blocked, or planned

## Additional 60-Point Expansion Items

### 31. Lock desktop runtime truth labels
- Status: pending
- Goal: keep browser vs desktop claims precise in UI and docs.

### 32. Stabilize Tauri dev startup logs
- Status: pending
- Goal: make native dev start failures easy to diagnose.

### 33. Add explicit desktop readiness checklist
- Status: pending
- Goal: require visual/native proof before packaging readiness.

### 34. Replace historical `<img>` usages in library tiles
- Status: pending
- Goal: remove noisy warnings without changing UX semantics.

### 35. Add geometry lighting presets to preview
- Status: pending
- Goal: keep preview local-only while making material review easier.

### 36. Add preview reset action
- Status: pending
- Goal: let the user restore preview state safely.

### 37. Add preview map-load failure surface
- Status: pending
- Goal: show when a specific map could not load instead of failing silently.

### 38. Add AO / uv2 safety guard
- Status: pending
- Goal: only enable AO when geometry/UV setup is safe.

### 39. Desktop native QA closure
- Status: done
- Goal: confirm Tauri runtime path and document the result.

### 40. Investigate and fix the root build regression path
- Status: partially_done
- Goal: keep prerender stable across phases.

### 41. Add gallery virtualization strategy selection
- Status: pending
- Goal: choose between windowing, paging, or hybrid loading.

### 42. Introduce thumbnail concurrency limits
- Status: pending
- Goal: bound thumbnail work under large collections.

### 43. Add searchable material collection slices
- Status: pending
- Goal: make search/smart collections faster and more navigable.

### 44. Move heavy filtering off the main thread
- Status: pending
- Goal: keep large collection search responsive.

### 45. Split remaining domain types
- Status: pending
- Goal: finish breaking up shared type surface.

### 46. Remove remaining legacy barrel imports
- Status: pending
- Goal: reduce coupling and import ambiguity.

### 47. Expand material metadata editor validation
- Status: pending
- Goal: make edits safer and clearer.

### 48. Track material metadata change history
- Status: pending
- Goal: make metadata changes auditable.

### 49. Deepen material package export metadata
- Status: pending
- Goal: include all relevant material truth without file mutation.

### 50. Create safe file operation planning layer
- Status: pending
- Goal: preview destructive file actions before execution.

### 51. Require explicit confirmation for real file ops
- Status: pending
- Goal: gate real mutations behind a review step.

### 52. Prepare Real-ESRGAN activation path
- Status: blocked
- Goal: only proceed when a model is locally present and validated.

### 53. Expand Model Manager UI state reporting
- Status: pending
- Goal: surface installed/missing/invalid model states clearly.

### 54. Improve processing report readability
- Status: pending
- Goal: make report outputs easy to inspect and download.

### 55. Unify jobs dashboard views
- Status: partially_done
- Goal: one job truth surface for batch/export/AI tasks.

### 56. Strengthen documentation truth labels
- Status: partially_done
- Goal: document real vs partial vs blocked states consistently.

### 57. Final packaging checklist
- Status: pending
- Goal: confirm icons, config, runtime bridge, and installer inputs.

### 58. Packaging build attempt
- Status: pending
- Goal: run desktop packaging when gates are green.

### 59. Release candidate smoke test
- Status: pending
- Goal: verify the packaged app or build artifacts in a repeatable way.

### 60. Final documentation lock
- Status: pending
- Goal: freeze the roadmap truth and mark confirmed items as locked.

## Assumptions

- The 60-step roadmap is treated as a superset of the already executed 30-step plan.
- Items already completed or partially done inherit their current state instead of being restarted.
- No dependency installation happens unless a specific phase explicitly requests it and the user approves.
- No task advances past a validation gate if build/typecheck/runtime QA is broken.

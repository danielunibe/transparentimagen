# Asteria 30 Step Execution Plan

## Purpose

Convert the remaining Asteria backlog into small, safe, validated phases.

## Phase States

- `pending`: not started.
- `in_progress`: currently being executed.
- `blocked`: depends on an unresolved technical or authorization blocker.
- `partially_done`: some parts are in place, but the phase is not fully complete.
- `done`: implemented and validated.

## Recommended Order

1. Native Window QA.
2. Build desktop readiness.
3. PBR preview polish.
4. Large library performance.
5. Type architecture cleanup.
6. Material Vault intelligence.
7. Jobs / reports / observability.
8. Safe file operations.
9. Local AI activation.
10. Packaging readiness.
11. Truth-level documentation hardening.

## Block A - Desktop Runtime & Native QA

### 1. QA real de ventana nativa Tauri
- Status: done
- Depends on: Tauri dev runtime, desktop bridge, visual access
- Risk: browser mode can look healthy while desktop mode diverges
- Acceptance: native window opens, UI loads, runtime distinguishes desktop
- Special authorization: no

### 2. Documento `NATIVE_WINDOW_QA.md`
- Status: done
- Depends on: task 1 results
- Risk: doc drift if it claims more than was observed
- Acceptance: command, result, differences, screenshots note, blockers captured
- Special authorization: no

### 3. Build desktop real
- Status: partially_done
- Depends on: frontend build green and stable prerender
- Risk: packaging attempts can waste time if app build still fails
- Acceptance: `tauri build` runs or is blocked with concrete reason
- Special authorization: no

### 30. Packaging readiness final
- Status: pending
- Depends on: tasks 1, 3, and stable release gates
- Risk: installer claims can outrun runtime truth
- Acceptance: packaging checklist complete and repeatable
- Special authorization: no

## Block B - UI Hygiene & Build Cleanliness

### 4. Resolver warnings históricos de `<img>`
- Status: pending
- Depends on: no hard dependency, but should be done before broader UI QA
- Risk: warnings remain noisy and hide new issues
- Acceptance: lint clean or justified exceptions documented
- Special authorization: no

## Block C - Material 3D Preview Polish

### 5. Pulido del binding PBR
- Status: partially_done
- Depends on: current preview renderer and binding helper
- Risk: incomplete map application can mislead preview accuracy
- Acceptance: core PBR maps bind safely and explicitly
- Special authorization: no

### 6. Servicio `materialPreviewBindingService.ts`
- Status: done
- Depends on: material metadata model
- Risk: binding logic drifts back into component code
- Acceptance: pure helper exists and is used by preview
- Special authorization: no

### 7. Fallbacks más claros del preview 3D
- Status: partially_done
- Depends on: preview renderer, runtime truth, diagnostics
- Risk: fallback can overstate readiness
- Acceptance: missing WebGL, missing dependency, missing maps, overrides are explained clearly
- Special authorization: no

### 8. Cleanup avanzado de Three.js
- Status: partially_done
- Depends on: renderer lifecycle
- Risk: resource leaks in repeated navigation
- Acceptance: geometry, material, textures, renderer, RAF, observers cleaned up
- Special authorization: no

### 9. Controles mínimos del preview 3D
- Status: pending
- Depends on: stable preview renderer
- Risk: controls can complicate cleanup and UI scope
- Acceptance: small local controls only, no heavy editor behavior
- Special authorization: no

### 10. Selector de iluminación básica
- Status: pending
- Depends on: stable preview renderer
- Risk: lighting options can over-expand scope
- Acceptance: minimal, safe lighting presets only
- Special authorization: no

### 11. QA visual del preview 3D
- Status: pending
- Depends on: tasks 5-10
- Risk: unverified visuals can regress silently
- Acceptance: visual pass on sphere/cube/plane and material states
- Special authorization: no

## Block D - Large Library Performance

### 12. Virtualización real de galería
- Status: pending
- Depends on: gallery behavior and scroll model
- Risk: large datasets lag without it
- Acceptance: large lists render with bounded work
- Special authorization: no

### 13. Paginación o carga incremental
- Status: pending
- Depends on: gallery performance plan
- Risk: eager rendering on large collections
- Acceptance: incremental loading works safely
- Special authorization: no

### 14. Thumbnail queue real
- Status: pending
- Depends on: thumbnail lifecycle
- Risk: too much concurrent work
- Acceptance: bounded thumbnail work queue
- Special authorization: no

### 15. Object URL registry completo
- Status: partially_done
- Depends on: runtime-only preview and image pipeline
- Risk: leaks if URLs are not tracked and revoked
- Acceptance: creation and revocation are centralized
- Special authorization: no

### 16. Worker para filtros/search
- Status: pending
- Depends on: search hot paths and dataset size
- Risk: main-thread filtering stalls UI
- Acceptance: heavy filters are off main thread or deferred
- Special authorization: no

## Block E - Type Architecture Cleanup

### 17. Unificación final de tipos por dominio
- Status: partially_done
- Depends on: domain splits already started
- Risk: shared barrel keeps coupling alive
- Acceptance: domain types are separated and consistent
- Special authorization: no

### 18. Eliminar barrel legacy gradualmente
- Status: pending
- Depends on: domain type splits
- Risk: premature removal can break imports
- Acceptance: legacy barrel reliance reduced safely
- Special authorization: no

## Block F - Material Vault Intelligence

### 19. Smart Collections más profundas para materiales
- Status: partially_done
- Depends on: canonical material metadata
- Risk: taxonomy drift
- Acceptance: deeper material collections stay aligned with diagnostics
- Special authorization: no

### 20. Editor de metadata material más robusto
- Status: partially_done
- Depends on: metadata model and diagnostics
- Risk: UI can misrepresent mutable vs canonical metadata
- Acceptance: edits are safe, visible, and metadata-only
- Special authorization: no

### 21. Historial de cambios de metadata
- Status: pending
- Depends on: material metadata edit flow
- Risk: lack of audit trail
- Acceptance: changes are traceable
- Special authorization: no

### 22. Package Export para materiales
- Status: partially_done
- Depends on: manifest shape and material metadata
- Risk: export claims can drift from actual material state
- Acceptance: metadata-only export remains honest
- Special authorization: no

## Block G - Safe File Operations

### 23. Safe File Operation Plans
- Status: pending
- Depends on: file mutation workflows
- Risk: destructive actions without preview/planning
- Acceptance: planned operations are explicit and reviewable
- Special authorization: yes, for destructive execution

### 24. Confirmación segura de operaciones reales
- Status: pending
- Depends on: safe operation plans
- Risk: accidental mutation of real files
- Acceptance: confirmations and rollback intent are visible
- Special authorization: yes, for real file changes

## Block H - Local AI Model Activation

### 25. Real-ESRGAN ONNX activation
- Status: blocked
- Depends on: local model availability and explicit approval
- Risk: false availability claims
- Acceptance: model present, validated, and truthfully reported
- Special authorization: yes

### 26. Model Manager UI más completa
- Status: pending
- Depends on: model truth and activation workflow
- Risk: UI can overstate model readiness
- Acceptance: model presence and validation are clearly surfaced
- Special authorization: no

## Block I - Jobs / Reports / Observability

### 27. Processing Reports UI
- Status: pending
- Depends on: report data availability
- Risk: report UX can lag behind job lifecycle truth
- Acceptance: processing reports are readable and actionable
- Special authorization: no

### 28. Jobs dashboard unificado
- Status: partially_done
- Depends on: unified job lifecycle already in place
- Risk: duplicated status views can confuse operators
- Acceptance: one dashboard reflects current job truth
- Special authorization: no

## Block J - Documentation Truth Layer

### 29. Documentation truth-level hardening
- Status: partially_done
- Depends on: all current phases and runtime truth
- Risk: docs can drift ahead of implementation
- Acceptance: docs say what is real, partial, blocked, or planned
- Special authorization: no

## Notes

- Phase 39 completed the native runtime QA path and restored the frontend build gate.
- Do not start Block G before safe file operation plans exist.
- Do not activate Real-ESRGAN before model truth and approval are in place.
- Do not treat desktop readiness as done until native window QA and build gate both pass.
- Use this plan as the phase gate before any large implementation block.

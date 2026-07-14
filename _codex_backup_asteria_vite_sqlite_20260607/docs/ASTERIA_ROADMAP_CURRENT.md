# Asteria Roadmap Current

## Confirmed phases

- Active master review: `docs/ASTERIA_90_PENDING_REVIEW.md`
- Active execution roadmap: `docs/ASTERIA_EXECUTION_ROADMAP_NEXT_10_PHASES.md`
- Historical expansion plan: `docs/ASTERIA_60_STEP_EXECUTION_PLAN.md`

- 37.3 Build Gate Stabilization + Runtime Boundary Hardening
- 37.4 Type Surface Split parcial
- 37.5 Canonical Criteria Layer
- 37.6 Unified Job Lifecycle
- 37.7 Runtime Capability Truth Layer
- 37.8 Performance Guardrails for Large Collections
- 37.8B Build Regression Recovery
- 37.9 Material Vault Consolidation Pass
- 38 3D Material Preview Foundation (implemented minimally)
- 38C PBR Map Binding & Preview Stability Polish (implemented minimally)
- 38D Native Desktop Window Preview / Tauri Runtime QA (in progress)
- 39 Native Desktop Window QA / Roadmap Execution Plan (done)
- 40 Validation Truth Reconciliation / 90 Pending Review (done)
- 41 Native Window Visual QA Closure (partially done)
- 41B Native Sidecar Path and PBR Fixture QA (partially done)
- 41C UI Shell Native Visual Cleanup (partially done)
- 41E Frameless Native Shell Integration (partially done)
- 41F Frameless Visual QA Closure (partially done)
- 39B Build Gate Recovery + Native QA Completion (done)

## Current truth

- Native dev runtime: launched and directly captured at 802 x 632 on 2026-06-06.
- Native bridge: visually active; browser and desktop labels diverge honestly.
- Native sidecar UI: development path contract corrected in Rust; visual verification in Tauri still pending in this session.
- Material Vault: PBR fixtures now exist locally outside the repo; visual QA in native window remains pending because this session timed out before a conclusive capture.
- UI shell cleanup: internal chrome hidden in Tauri, main shell de-carded, background darkened.
- Frameless shell: decorations disabled in Tauri and titlebar controls integrated in the shell; final screenshot QA still pending.
- Frameless visual QA: native window appears, but the capture in this session still shows a black/vacant shell instead of a fully rendered integrated UI.
- Frontend build regression: historically recovered; build and typecheck pass on 2026-06-06.
- Lint: 0 errors, 3 historical `no-img-element` warnings.
- Tauri release build: not yet validated.
- Python sidecar in packaged app: blocked pending bundling/path contract.
- Real file operations: preview-only; execution remains disabled.
- Real-ESRGAN: blocked by missing approved local model.

## Next phases

1. Phase 41B - Native Sidecar Path and PBR Fixture QA.
2. Phase 42 - Desktop Build and Packaging Preflight.
3. Phase 43 - Sidecar Packaging and Path Contract.
4. Phase 44 - Tauri Permission and Native Diagnostics Hardening.
5. Phase 45 - UI Hygiene and Status Consistency.
6. Phase 46 - PBR Preview Controls and Stability QA.
7. Phase 47 - Large Gallery Rendering Foundation.
8. Phase 48 - Thumbnail Scheduler and Object URL Closure.
9. Phase 49 - Canonical Search, Saved Views, Jobs and Safe Ops Contracts.

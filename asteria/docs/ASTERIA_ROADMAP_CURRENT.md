# Asteria Roadmap Current

## Native Windows base closure - 2026-06-07

- Vite + Tauri v2 quedan como unico runtime soportado.
- SQLite es la unica fuente de verdad para preferencias, jobs, vistas, metadatos, variantes, thumbnails y fuentes de carpeta.
- `localStorage` e IndexedDB sobreviven solo como origen no destructivo de una migracion one-shot.
- Las fuentes de carpeta usan rutas Windows, Tauri Dialog y comandos Rust de lectura acotados.
- `tauri-plugin-window-state` restaura geometria y maximizado.
- `npm run tauri:build` genero MSI y NSIS.
- El sidecar Python se incluye como recurso; una instalacion limpia todavia necesita Python y dependencias locales.

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

1. Notificaciones y asociaciones de archivo Windows.
2. Watch folders implementados en Rust.
3. Spike de ONNX Runtime + DirectML.
4. Presets de flujos completos.
5. CLIP.
6. SAM 2.

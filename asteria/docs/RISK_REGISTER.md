# Risk Register

| ID | Risk | Severity | Probability | Mitigation | Dueño sugerido |
| --- | --- | --- | --- | --- | --- |
| R-001 | Historical production prerender regression can return | High | Medium | Keep `npm run build` as a mandatory phase gate; current validation passes | Frontend lead |
| R-002 | Type checks could become unreliable if validation bypasses `tsconfig.check.json` | High | Medium | Keep `npm run typecheck` as the canonical command; current validation passes | Frontend lead |
| R-003 | Large shared types file causes drift and accidental coupling | High | High | Split `types/asteria.ts` by domain | Partially mitigated |
| R-004 | Search, smart collections, and material filters diverge over time | Medium-High | High | Centralize canonical criteria and token normalization | Partially mitigated |
| R-005 | Export/batch/report state becomes inconsistent | High | High | Use one job lifecycle model and one canonical status vocabulary | Partially mitigated |
| R-006 | Large collections cause UI lag | Medium-High | Medium | Add virtualization, deferred filtering, thumbnail throttling, and cache discipline | Partially mitigated |
| R-007 | Sidecar capability claims drift from runtime reality | High | Medium | Derive UI claims from `capabilities` and `models` responses only | Partially mitigated |
| R-008 | Real-ESRGAN is advertised before a model is present | Medium | High | Keep the UI explicit about missing models and unsupported status | Partially mitigated |
| R-009 | Future file operations become security-sensitive | High | Medium | Use strict path validation, allowlists, and confirmation gates | Tauri/Rust lead |
| R-010 | Object URLs and thumbnails leak memory if cleanup is incomplete | Medium | Medium | Centralize lifecycle management, tracked object URLs, and cleanup | Partially mitigated |
| R-011 | Documentation drifts ahead of implementation | Medium | High | Tag docs by truth level and date, and treat runtime as source of truth | Product/tech lead |
| R-012 | 3D preview or heavier AI arrives before the metadata model is stable | High | Medium | Delay expansion until the core library/material model is consolidated; keep the preview local, minimal, and metadata-driven | Partially mitigated |
| R-013 | Native runtime diverges from browser runtime | Medium-High | Medium | Native visual QA now exists; keep browser/desktop capability labels and UI checks in the phase gate | Partially mitigated |
| R-014 | Desktop packaging depends on an undefined Python sidecar bundling strategy | High | High | Define the packaged Python/script/model path contract before release packaging | Tauri/Python lead |
| R-015 | Three.js resources or runtime texture URLs leak during preview rebinding | Medium-High | Medium | Keep disposal centralized and add memory-focused QA whenever preview binding changes | Frontend lead |
| R-016 | Real file operations are enabled before confirmation, conflict, rollback, permissions, and audit contracts exist | Critical | Medium | Keep execution disabled until the Safe File Operations gate is approved end to end | Tauri/Rust lead |
| R-017 | Native sidecar commands depend on the Tauri working directory | High | High | Development path now resolves from the repo root in Rust; define the packaged resource contract separately in Phase 43 | Tauri/Rust lead |
| R-018 | Native shell can drift into a boxed-in look if chrome surfaces or main wrappers come back | Medium | Medium | Keep the shell surface minimal in Tauri and verify the desktop frame after visual cleanup passes | Frontend lead |
| R-019 | Frameless native shells can break drag, maximize, or close behavior if decorations are disabled incorrectly | High | Medium | Keep a single integrated titlebar contract and verify controls in Tauri before advancing | Frontend/Tauri lead |
| R-020 | Frameless visual QA can still misreport success if the native window renders as a black or empty shell | Medium | Medium | Treat a blank native capture as a blocker and separate shell presence from content render proof | Frontend/Tauri lead |

## Build regression note

- After Fase 37.8, `npm run build` briefly regressed during prerender of `/` with `TypeError: a[d] is not a function`.
- Root cause: a fragile module ordering pattern in memoized tile components (`FolderTile.tsx`, `MediaTile.tsx`, `MaterialCard.tsx`) was normalized and the build recovered.
- Fix applied: moved `memo` imports to the top of the files and kept the library grid guard minimal.
- Validation result: `npm run build`, `npm run typecheck`, `npm run lint`, `cargo check`, and sidecar `health` / `capabilities` passed after the fix.

## Material Vault note

- Fase 37.9 consolidates PBR detection, diagnostics, category metadata, target engine metadata, and map override awareness before any 3D preview work.
- This lowers the risk that 3D or heavier AI will sit on top of an inconsistent metadata model.

## 3D preview note

- Fase 38 now has a minimal local preview renderer foundation.
- The preview is honest about missing WebGL or missing 3D dependencies.
- No textures, materials, or files are modified by the foundation.

## 90 pending review

- Canonical review: `docs/ASTERIA_90_PENDING_REVIEW.md`.
- Next execution order: `docs/ASTERIA_EXECUTION_ROADMAP_NEXT_10_PHASES.md`.
- Existing risks R-006, R-010, R-011, and R-013 remain active and are now mapped to explicit phases.
- Current gate on 2026-06-06: build, typecheck, cargo check, sidecar health and capabilities pass; lint has 0 errors and 3 historical image warnings.
- Phase 41 captured the real native window and confirmed Browser Mode vs Desktop Mode.
- The native model manager development path was corrected in Rust; packaged resource resolution remains a Phase 43 concern.
- Material Vault now has temporary PBR fixtures outside the repo, but native visual verification in this session was not completed before timeout.
- The shell cleanup reduced the double-titlebar risk by hiding internal chrome in Tauri and flattening the main surface; native visual confirmation still needs one clean pass.
- The frameless shell contract now disables decorations and integrates controls in the shell, but visual screenshot QA is still pending.
- Phase 41F showed the native window shell, but the captured content still rendered black/vacant, so visual closure remains blocked.

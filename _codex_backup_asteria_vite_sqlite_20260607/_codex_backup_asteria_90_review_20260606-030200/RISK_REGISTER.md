# Risk Register

| ID | Risk | Severity | Probability | Mitigation | Dueño sugerido |
| --- | --- | --- | --- | --- | --- |
| R-001 | Production build fails on prerender | High | Medium | Fix the root page/runtime boundary before shipping | Frontend lead |
| R-002 | Type checks become unreliable because generated `.next/types` are missing when validated | High | Medium | Make build/typecheck ordering deterministic and document the correct gate | Frontend lead |
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
| R-013 | Native runtime diverges from browser runtime and is not visually validated | Medium-High | Medium | Require native window QA in Tauri and document differences before claiming desktop readiness | Product/tech lead |

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

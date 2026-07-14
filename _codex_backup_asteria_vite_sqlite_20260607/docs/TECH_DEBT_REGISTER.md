# Tech Debt Register

| ID | Area | Problem | Severity | Impact | Solution proposed | Fase sugerida |
| --- | --- | --- | --- | --- | --- | --- |
| TD-001 | Build / Next.js | Historical `/` prerender regression | High | Could block production build if it returns | Keep `npm run build` as the first gate and reopen only on reproduced failure | Mitigated; verify every phase |
| TD-002 | Type validation | Historical dependency on generated `.next/types` entries | High | Could make type-only checks unreliable | Keep the dedicated `tsconfig.check.json` command and validate after build | Mitigated; verify every phase |
| TD-003 | Shared types | `types/asteria.ts` is too large and too broad | High | Increases coupling and drift | Split by domain; `types/domains/core.ts` created and barrel compatibility kept | In progress |
| TD-004 | Hooks | `useBatchProcessing` is too large | High | Hard to test and maintain | Split orchestration from derived-state helpers and job lifecycle logic | Phase 2 |
| TD-005 | Hooks | `usePackageExport` is too large | High | Export behavior is hard to reason about | Extract queue coordination, manifest generation, and format selection helpers | Phase 2 |
| TD-006 | Hooks | `useFolderWorkspace` is too large | Medium-High | Workspace logic risks becoming monolithic | Separate source selection, workspace state, and side effects | Phase 2 |
| TD-007 | Library UI | `SelectionActionBar.tsx` is very large | Medium-High | Review and regression risk | Split by action groups or move logic into a dedicated controller hook | Phase 2 |
| TD-008 | Search / collections | Search and smart-collection criteria likely overlap | Medium-High | Duplicate logic and token drift | Canonical criteria layer introduced; continue migration gradually | In progress |
| TD-009 | Export / batch | Queue, batch processing, and reports are partially duplicated | High | Status drift and lifecycle bugs | Canonical job lifecycle layer introduced; continue converging adapters and payload shapes | In progress |
| TD-010 | Materials | Material vault can become a second library taxonomy | Medium | Confusing UX and duplicate metadata rules | Reuse library metadata semantics and keep material-specific extensions narrow | Phase 3 |
| TD-011 | Performance | Large collection rendering likely needs virtualization | Medium-High | Jank with 2k+ items | Add virtualization or paging before feature growth increases further; keep deferred filtering and thumbnail throttling in place | Phase 4 |
| TD-012 | Storage | Object URL lifecycle must stay disciplined | Medium | Memory growth and stale previews | Centralize creation/revocation, add explicit cleanup paths, and keep tracked runtime-only URLs | Phase 1 |
| TD-013 | Bridge | File operations may become too permissive if expanded casually | High | Local security risk | Keep strict allowlists, normalization, and confirmation gates for mutations | Phase 3 |
| TD-014 | Python runtime | Real-ESRGAN models are missing | Medium | Feature is scaffolded but unavailable | Keep status honest and support model installation only as a deliberate step later | Phase 1 |
| TD-015 | Documentation | Docs are more narrative/roadmap than source-of-truth | Medium | Can confuse status vs aspiration | Label docs by truth level and keep code/runtime as the final arbiter | Phase 1 |
| TD-016 | Runtime capabilities | Capability claims drift from actual sidecar/model/browser state | High | UI can promise unavailable features | Introduce a canonical runtime capability snapshot and derive labels from it | In progress |
| TD-017 | Performance | Large collection rendering still depends on full-list rendering | Medium-High | Can lag on very large folders | Add deferred filtering, thumbnail throttling, runtime warnings, and future virtualization | Partially mitigated |

| TD-018 | Materials | Material Vault metadata, diagnostics, and override semantics were fragmented | Medium-High | Confusing readiness labels and duplicated logic | Consolidate PBR detection, diagnostics, category persistence, target engine persistence, and override awareness | In progress |
| TD-019 | 3D preview | Foundation renderer exists but remains intentionally minimal | Medium | Preview is basic and still lacks richer controls, fuller PBR binding, and future material polish | Extend the local renderer carefully, without adding shader-heavy or destructive behavior | In progress |
| TD-020 | 3D preview | PBR map binding is still partial for runtime-only maps | Medium | Some candidate maps remain metadata-only and are not yet visualized | Add explicit runtime-safe bindings for optional opacity, emissive, and displacement candidates only if they have usable URLs | In progress |
| TD-021 | 3D preview | Manual preview controls are still limited to geometry selection | Low-Medium | Visual QA of the material preview is still mostly passive | Add small, local-only controls for lighting or reset states when needed | Planned |
| TD-022 | 3D preview | Cleanup of WebGL resources still needs periodic audit | Medium | Future binding changes could reintroduce leaks if cleanup drifts | Keep cleanup centralized and review texture/geometry/material disposal whenever the preview changes | Partially mitigated |
| TD-023 | Desktop QA | Direct native visual capture was missing | Medium | Desktop readiness could not be assessed visually | Native window captured and browser/desktop differences documented in Phase 41 | Resolved |
| TD-024 | Build | Root prerender regression on `/` was recovered during 39B | High | Frontend build gate is green again, but packaging still needs explicit tauri build validation | Keep `app/not-found.tsx` and the build gate under regression watch | Resolved |
| TD-025 | Packaging | Python sidecar bundling and packaged path resolution are undefined | High | Dev runtime can pass while installed runtime fails | Define a packaged sidecar/runtime contract before final Tauri packaging | Blocked |
| TD-026 | Tauri security | Filesystem plugins exist but safe mutation scopes and confirmation contracts are incomplete | High | Future file operations could be over-permissive | Keep execution preview-only until allowlists, confirmation, conflict, rollback, and audit are complete | Blocked |
| TD-027 | Search / Saved Views | Canonical search is broad but lacks fixtures, explainability, edit, import, and export contracts | Medium-High | Regressions and opaque collection matches | Add canonical fixtures and a versioned metadata-only criteria schema | Planned |
| TD-028 | Jobs / reports | AI, batch, export, and report surfaces still expose partially separate histories | High | Retry, filtering, retention, and error grouping can drift | Converge on one dashboard/read model before adding retry | In progress |
| TD-029 | Native sidecar | Script and model paths previously depended on the Tauri process working directory | High | Packaged UI can still diverge if the resource contract is not defined | Development path resolver applied in Phase 41B; keep packaged resource resolution for Phase 43 | In progress |
| TD-030 | Native shell | UI chrome duplication and oversized main surface caused the native window to feel boxed-in | Medium | Visual polish can regress if shell surfaces or titlebar visibility drift again | Keep the Tauri/native chrome contract narrow and verify desktop rendering after shell changes | Partially mitigated |
| TD-031 | Frameless shell | Frameless native shells need drag-region and control-hitarea QA on small sizes and maximize states | Medium | Controls can become hard to use or overlap content if not tuned | Verify snap behavior, resize hit areas, and accessibility of the integrated titlebar | Planned |
| TD-032 | Frameless visual QA | Native shell capture can still come back black or empty even when the window exists | Medium | Visual closure can be claimed too early if render proof is not explicit | Capture a clean rendered state from the native window before marking the frameless shell done | Planned |

## Build regression note

- A prerender regression surfaced after the performance pass even though typecheck and lint stayed green.
- The fix was not a feature change; it was a module-order cleanup in memoized tile components plus a bounded thumbnail prefetch guard.
- Keep `npm run build` as the mandatory gate after any phase, even when the other checks pass.

## Material Vault note

- Material metadata is now better aligned between `pbrDetectionService`, `materialDiagnosticsService`, `materialLibraryService`, and the canonical search layer.
- Remaining work is to keep the metadata surface lean while avoiding a future 3D coupling spike.

## 3D preview note

- The 3D preview foundation now has a minimal renderer path.
- The remaining work is feature depth, not dependency approval.
- Keep object URLs and texture data runtime-only if future map binding is added.
- Optional runtime bindings should stay explicit, safe, and disposable.
- Native QA should capture the actual Tauri window before desktop-ready status is claimed.
- The `/` prerender regression was recovered during 39B and should remain under watch.

## 90 pending review

- Full classification: `docs/ASTERIA_90_PENDING_REVIEW.md`.
- Next phased execution: `docs/ASTERIA_EXECUTION_ROADMAP_NEXT_10_PHASES.md`.
- Current validation: build/typecheck/cargo/sidecar pass; lint remains at 3 historical `no-img-element` warnings.
- Phase 41 resolved the missing native capture debt, and Phase 41B resolved the development-side path contract for the Python sidecar.
- Material Vault now has temporary PBR fixtures outside the repo; native preview verification was started but not completed visually in this session.
- Phase 41C removed the extra shell card and hid the internal chrome in Tauri, but native visual confirmation still needs a clean runtime pass.
- Phase 41E now disables native decorations and integrates titlebar controls; final screenshot QA and edge-size tuning remain pending.
- Phase 41F confirmed the native window exists, but the captured content was still black/vacant, so the visual QA closure remains open.

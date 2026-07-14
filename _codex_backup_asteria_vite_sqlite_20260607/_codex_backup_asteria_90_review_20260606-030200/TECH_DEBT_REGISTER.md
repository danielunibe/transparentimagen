# Tech Debt Register

| ID | Area | Problem | Severity | Impact | Solution proposed | Fase sugerida |
| --- | --- | --- | --- | --- | --- | --- |
| TD-001 | Build / Next.js | `/` prerender fails during `npm run build` | High | Blocks clean production build | Inspect the root rendering path and the server-side module boundary causing the runtime error | Phase 1 |
| TD-002 | Type validation | `npx tsc --noEmit` depends on missing `.next/types` entries | High | Prevents reliable type-only checks | Align `tsconfig.json` includes with generated artifacts or make the check order deterministic | Phase 1 |
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
| TD-023 | Desktop QA | Tauri native window was launched, but direct visual capture was not available in this session | Medium | Desktop readiness cannot be fully claimed without a verified screenshot or direct window observation | Repeat native window QA with visual capture or a desktop automation path | In progress |
| TD-024 | Build | `npm run build` still hits prerender regression on `/` during this QA pass | High | Desktop packaging readiness remains blocked | Reopen the Next prerender regression and stabilize `/` before attempting `tauri build` | Blocked |

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

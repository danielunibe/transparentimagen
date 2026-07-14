# Deep Technical Audit - Asteria

## 1. Resumen ejecutivo

Asteria is a coherent local-first desktop workspace built on Next.js + React + TypeScript + Tauri + Rust bridge + Python sidecar.

The stack choice is defensible for a hybrid desktop app that needs:

- a rich UI surface;
- local file orchestration;
- native desktop packaging;
- a separate Python processing runtime for image operations;
- metadata-heavy workflows with IndexedDB and local caches.

The project is not architecturally broken, but it is not yet fully stabilized. The biggest issues are:

- very large feature files and hooks;
- a large shared type surface in `types/asteria.ts`;
- some duplication between search, smart collections, materials, organizer, and export metadata;
- a broken `next build` prerender path on `/`;
- `tsc --noEmit` depending on generated `.next/types` files that are not present at the time of the check;
- Real-ESRGAN support being scaffolded but not currently available because the models are missing.

Verdict: keep the current stack for now, but stabilize the architecture before adding large new features like 3D preview, broader file mutation, or heavier AI/model flows.

## 2. Veredicto general

- Project health: medium-good, with real debt.
- Architecture coherence: good at the macro level, stressed at the module level.
- Stack fitness: good for now.
- Recommended action: stabilize and consolidate, not migrate yet.

## 3. Estado real del proyecto

Confirmed by code and runtime:

- Next.js app router entry is minimal: `app/page.tsx` renders `AsteriaShell`.
- Tauri bridge exists and exposes closed commands to Python sidecar and local file interactions.
- Python sidecar exists and answers `health`, `capabilities`, `models`, and `validate-models`.
- Pillow, rembg, and onnxruntime are available in the current Python runtime.
- Real-ESRGAN is not active because the model files are missing.
- Rust validation passes with `cargo fmt --check` and `cargo check`.

Not healthy yet:

- `npm run build` fails during prerender of `/`.
- `npx tsc --noEmit` fails because `.next/types` entries referenced by `tsconfig.json` are absent when the check runs.
- `npm run lint` is clean in the sense of zero errors, but it has three Next.js image warnings.

## 4. Estructura general

| Área | Estado | Archivos clave | Riesgo | Observación |
| --- | --- | --- | --- | --- |
| App shell | Good | `app/page.tsx`, `features/asteria/AsteriaShell.tsx` | Medium | `page.tsx` is thin, which is good. |
| Library workspace | Large | `features/library/*`, `hooks/useExplorerControls.ts`, `hooks/useThumbnailCache.ts` | Medium-High | A lot of logic is concentrated here. |
| Editor | Large | `features/editor/*`, `hooks/useCutoutPreview.ts`, `hooks/useImageAdjustments.ts` | Medium-High | Strong feature surface, but several panels are big. |
| Materials | Medium | `features/materials/*`, `services/material*`, `services/pbrDetectionService.ts` | Medium | Looks modular, but is starting to parallel the main library model. |
| Organizer | Medium | `features/organizer/*`, `services/mediaOrganizationService.ts` | Medium | Domain is separate enough, but likely duplicates classification logic. |
| Smart folders | Medium | `features/smart-folders/*`, `services/smartFolder*`, `services/smartCollectionService.ts` | Medium | Good separation, but query/criteria duplication risk is real. |
| Export/batch | Large | `features/export/*`, `features/batch/*`, `hooks/useExportQueue.ts`, `hooks/useBatchProcessing.ts`, `services/export*`, `services/batchProcessingService.ts` | High | Multiple queue/report abstractions need consolidation. |
| Bridge/runtime | Good | `services/tauriBridge.ts`, `src-tauri/src/lib.rs`, `sidecars/python-ai/asteria_sidecar.py` | Medium | Closed command surface is the right shape. |
| Types | Overgrown | `types/asteria.ts` | High | This is the clearest structural debt hotspot. |
| Docs | Good but narrative-heavy | `docs/*.md`, `README.md`, root decision docs | Low-Medium | Several docs look like roadmap/history rather than source-of-truth. |

## 5. Architecture audit

### UI / React components

The UI is broadly well split by feature, but some files are too large:

- `features/library/SelectionActionBar.tsx`
- `features/library/LibraryView.tsx`
- `features/asteria/AsteriaShell.tsx`
- `features/editor/EditorView.tsx`
- `features/batch/BatchPanel.tsx`
- `features/materials/MaterialVaultView.tsx`

Risk:

- too much orchestration in single files;
- hard-to-review prop chains;
- duplicated guards and derived state.

### Hooks

The largest hooks are the main risk signal:

- `hooks/useBatchProcessing.ts`
- `hooks/usePackageExport.ts`
- `hooks/useFolderWorkspace.ts`
- `hooks/useAiProcessing.ts`

Likely issue:

- hooks are mixing orchestration, data shaping, status derivation, and side effects.

### Services

Services are generally the correct abstraction, but there is overlap:

- search criteria and smart-collection logic may be too close;
- material metadata and material diagnostics likely overlap with library metadata;
- export queue and batch processing should probably share a stronger core contract;
- native bridge, sidecar adapter, and action services need a stricter boundary.

### Types

`types/asteria.ts` is too broad.

It currently acts as:

- domain model registry;
- export schema registry;
- material schema registry;
- AI/runtime capability schema;
- smart-collection schema;
- file organization schema.

This is the strongest candidate for future split-up.

### Duplicate / coupled logic

Confirmed or strongly suggested areas of duplication:

- Search vs smart collections vs material vault filters.
- Export queue vs batch processing vs processing reports.
- Organizer classification vs smart-folder detection.
- Library metadata vs materials metadata vs variant metadata.

### Magically repeated strings / assumptions

There are many repeated domain constants and status strings in the shared type surface and the service layer. This is not broken today, but it increases drift risk.

### Cycles / suspicious imports

No hard cycle was proven in this audit pass, but the shape of the code suggests a risk:

- large feature files import many services and hooks;
- services import shared types from the giant type file;
- bridge logic fans out through several adapter layers.

## 6. Stack audit

### Current stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Tauri
- Rust bridge
- Python sidecar
- IndexedDB
- browser canvas / local image operations
- future Three.js / WebGL
- future ONNX Runtime / local AI

### Pros

1. Strong UI ergonomics for a dense product.
2. Fast iteration for desktop-web hybrid interfaces.
3. Tauri keeps the native shell lightweight.
4. Python sidecar is the right place for image-processing breadth.
5. Rust bridge gives a safer control point than an open shell.
6. IndexedDB is a good fit for metadata-first persistence.

### Cons

1. Next.js can be overkill if the app is strictly desktop-local.
2. The stack has multiple boundaries to keep aligned.
3. Python-side feature availability depends on environment and models.
4. Large feature files can turn into maintenance drag quickly.
5. The app is vulnerable to “documentation optimism” if docs outpace runtime.

### Recommendation by alternative

| Stack | Ventajas | Desventajas | Riesgo de migración | Recomendación |
| --- | --- | --- | --- | --- |
| Keep Next.js + React + Tauri + Python sidecar | Best current fit for feature breadth, desktop shell, and local processing | More moving parts than Vite-only | Low | Recommended now |
| Vite + React + Tauri | Simpler runtime, less SSR baggage | Requires migration and may not solve debt hot spots | Medium | Consider only if Next.js becomes a real bottleneck |
| Electron + React + Node | Huge ecosystem, simple Node integration | Heavier app, more runtime weight | High | Not recommended |
| Python desktop (PySide6/Qt) | Strong native Python integration | UI rebuild cost, weaker web-style composition | High | Not recommended for this checkout |
| Flutter desktop | Strong desktop UI, single-stack feel | Full rewrite | Very high | Not recommended |
| Rust full desktop (egui/iced/slint) | Very fast, native feel | Large rewrite, harder UI productivity | Very high | Not recommended |
| Web-only app | Simplifies deployment | Loses desktop file and local processing strengths | Medium-High | Not recommended for current goals |

### Stack conclusion

- Maintain the current stack now.
- Keep Python sidecar.
- Keep Tauri.
- Revisit Next.js only if it becomes a measurable burden, not just because it exists.

## 7. Next.js audit

Next.js is not providing obvious SSR value in the current app shell.

What it does provide:

- a familiar React application structure;
- a production build pipeline;
- route/file organization;
- compatibility with the current app shell.

What it likely does not provide here:

- meaningful SSR value for a desktop-local tool;
- a clear advantage over Vite for this specific use case.

Verdict:

- Keep Next.js for now because the app already uses it and the shell is thin.
- Do not migrate just for aesthetics.
- Reconsider if build/runtime complexity keeps growing while the app remains fully client-side.

## 8. Tauri audit

Tauri is correctly chosen for this product.

Why it fits:

- smaller and safer than Electron for this local workspace;
- command-based bridge is more controllable than an open shell;
- it is suitable for packaging and file-oriented desktop workflows.

Risks:

- `show_item_in_folder` / `open_path` are path-sensitive and should stay tightly validated;
- `write_file` is very permissive if exposed too broadly;
- Python invocation should remain command-scoped and input-validated.

What to reinforce:

- path validation and normalization;
- allowlist-based command surface;
- explicit separation between read-only preview actions and file mutation actions;
- better error payload structure.

## 9. Python sidecar audit

The Python sidecar is the right abstraction for local image processing.

Confirmed current state:

- `health` works.
- `capabilities` works.
- `models` and `validate-models` work.
- Pillow, rembg, and onnxruntime are present.
- Real-ESRGAN models are absent.

Good design points:

- fixed subcommands;
- local-only processing;
- capability reporting from the runtime itself;
- model discovery rather than silent downloading.

Risks:

- global Python dependency drift;
- model availability mismatch;
- capability optimism if UI assumes `realEsrgan` just because the command exists.

Recommendation:

- keep the sidecar as a formal Python package boundary;
- keep explicit health/capabilities/model validation commands;
- avoid automatic downloads unless explicitly approved later.

## 10. Storage audit

Storage model appears aligned with a metadata-first desktop app.

Likely strengths:

- IndexedDB for local metadata, cached thumbnails, and saved views;
- no evidence in this pass of Blob persistence being the default pattern;
- metadata-only persistence fits the app's design.

Risk areas:

- object URL lifecycle must be carefully revoked;
- thumbnail caches need clear limits;
- IndexedDB migrations should be conservative;
- file-path metadata may become sensitive if over-retained.

Recommendation:

- add or preserve a workspace reset / cache reset path if not already present in the UI;
- keep blobs out of primary persistence;
- keep versioning explicit.

## 11. Performance audit

The app is likely fine for moderate collections, but the first pain points will be:

- gallery rendering;
- thumbnail generation and cache churn;
- search/filter recomputation;
- selection actions on large sets;
- batch/export status churn.

Likely scale guidance:

- 500 images: probably manageable with current architecture if thumbnailing is efficient.
- 2,000 images: risk increases sharply without virtualization and/or paging.

What to optimize before 3D or heavier AI:

- list/grid virtualization;
- deferred filtering/search;
- cache invalidation discipline;
- reduced re-render fan-out in large panels.

## 12. Material Vault / PBR audit

The PBR/material domain is promising, but it is not yet a fully independent product surface.

Current risk:

- material vault and library can drift into parallel taxonomies;
- PBR metadata can become a second “library” if the criteria are not centralized.

Recommendation:

- keep material classification logic thin and reuse the library metadata model where possible;
- do not introduce preview 3D until the metadata model is stable;
- keep false-positive detection explicit and visible.

## 13. Batch / export audit

Batch/export is conceptually strong but structurally at risk of duplication.

Areas likely to overlap:

- export queue;
- batch processing;
- processing reports;
- package export;
- queue status persistence.

Recommendation:

- use one canonical job model for queue/reporting;
- separate “job intent” from “job execution” from “package packaging”;
- keep cancellation semantics explicit and safe.

## 14. Search / Smart Collections audit

Search and Smart Collections are very likely sharing enough conceptual space to require a formal shared criteria model.

Risk:

- duplicated tokens and filter semantics;
- subtle differences between query language and collection rules;
- undefined/null handling problems in metadata-first objects.

Recommendation:

- centralize the shared search/collection criteria schema;
- keep the UI wrappers separate, but not the domain criteria logic.

## 15. UI/UX audit

The app currently reads as a multi-module desktop workspace, which is appropriate.

However, the following can drift into “modules attached together”:

- Library;
- Organizer;
- Materials;
- Smart Folders;
- Export;
- Batch;
- Editor.

Recommendation:

- keep library as the primary navigation root;
- treat materials and smart folders as specialized secondary surfaces;
- keep panel states honest when features are placeholders;
- avoid too many floating panels competing for attention.

## 16. Security / local-first audit

No external-cloud risk is implied by the current codebase design, which is good.

Main risks:

- path traversal or overbroad path handling in desktop commands;
- overly permissive file mutation commands;
- exposing local paths in persisted metadata too broadly;
- unsafe future rename/move/delete operations.

Recommendation:

- future destructive file operations should use strict allowlists, path normalization, and confirmation flows;
- keep bridge commands closed and typed.

## 17. Documentation audit

There is a lot of documentation, but not all of it should be treated as equal truth.

Observed docs include:

- `docs/desktop-runtime.md`
- `docs/integration-report.md`
- `docs/local-model-policy.md`
- `docs/material-diagnostics.md`
- `docs/material-vault-architecture.md`
- `docs/organizer-architecture.md`
- `docs/pbr-smart-folders.md`
- `docs/photo-organization-roadmap.md`
- `docs/smart-folders-architecture.md`
- `docs/tauri-next-steps.md`

Risk:

- roadmap and architecture language may outrun implementation;
- some docs can describe future phases that are not yet real.

Recommendation:

- use code plus runtime checks as the source of truth;
- keep the most recent architecture/status docs clearly labeled if they are aspirational.

## 18. Roadmap recomendado

### Phase 1: Stabilize

- fix the `/` prerender failure;
- stabilize TS build validation;
- split or at least annotate the largest hooks and feature files;
- centralize shared criteria models.

### Phase 2: Consolidate

- split `types/asteria.ts`;
- unify queue/batch/export job models;
- unify search/smart-folder/material criteria where appropriate.

### Phase 3: Harden

- formalize file-operation boundaries;
- tighten Tauri command contracts;
- improve error schemas and capability negotiation.

### Phase 4: Scale

- add virtualization/pagination where necessary;
- optimize thumbnail and search recomputation paths.

### Phase 5: Expand

- only after stability, consider 3D preview, broader automation, or heavier AI flows.

## 19. Próximas 5 fases sugeridas

1. Fix build and TS validation blockers.
2. Split shared domain types.
3. Deduplicate search / smart collection / material criteria.
4. Consolidate export / batch / report job models.
5. Add performance guards for large collections.

## 20. Qué no hacer todavía

- Do not migrate away from Next.js yet.
- Do not move to Electron.
- Do not rewrite the UI in Python/Qt.
- Do not add 3D preview.
- Do not add automatic model downloads.
- Do not add destructive file mutation commands without a hardened bridge.

## 21. Checklist de validación

- [x] `npm run lint`
- [ ] `npm run build` - fails on prerender of `/`
- [ ] `npx tsc --noEmit` - fails due to missing `.next/types`
- [x] `cargo fmt --check --manifest-path src-tauri\\Cargo.toml`
- [x] `cargo check --manifest-path src-tauri\\Cargo.toml`
- [x] `python sidecars/python-ai/asteria_sidecar.py health`
- [x] `python sidecars/python-ai/asteria_sidecar.py capabilities`
- [x] `python sidecars/python-ai/asteria_sidecar.py models`
- [x] `python sidecars/python-ai/asteria_sidecar.py validate-models`

## 22. Final recommendation

Keep the current stack. Stabilize the build and the shared domain surface first. Reconsider Vite-only or a stack migration only if the app remains desktop-local while Next.js adds measurable friction that cannot be solved with module cleanup.

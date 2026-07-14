# Performance Guardrails

## 1. Problem this solves

Asteria keeps multiple large, metadata-heavy surfaces in memory at once: the library grid, folder previews, thumbnail generation, search/filtering, batch actions, and report surfaces. Without guardrails, large collections can trigger jank, recomputation churn, and object URL leaks.

## 2. Risks mitigated

- UI lag on large folders and libraries.
- Excessive thumbnail generation and duplicate work.
- Unbounded object URL retention in session memory.
- Repeated full-list filtering work when search or sort changes.
- Overstated performance expectations for huge collections.

## 3. Collection tiers

| Tier | Count | Notes |
| --- | --- | --- |
| small | 0-250 | Normal rendering path. |
| medium | 251-750 | Keep search deferred and thumbnails bounded. |
| large | 751-2000 | Show a warning, throttle thumbnails, and avoid extra recomputation. |
| huge | 2001+ | Treat as performance-sensitive by default. |

## 4. What is deferred

- Search input evaluation is deferred in `hooks/useExplorerControls.ts`.
- Large collection warnings are shown instead of silently pretending the grid is cheap.
- Future virtualization is intentionally left for a later phase.

## 5. What is limited

- Thumbnail preloading is bounded by collection tier.
- Thumbnail concurrency is tier-aware.
- Visible list work should stay bounded through future paging or virtualization if the collection grows further.

## 6. What is cached

- Thumbnails are cached in IndexedDB through `services/thumbnailService.ts`.
- Session thumbnails are tracked in memory only while the view is active.
- Object URLs created for runtime previews are tracked separately from persisted metadata.

## 7. Object URL lifecycle rules

- `Blob`, `File`, and `objectUrl` values are runtime-only unless a specific domain explicitly stores metadata without the binary payload.
- Create object URLs only when needed for preview or processing.
- Revoke object URLs when the owning view, job, or cache entry is cleared.
- Prefer tracked cleanup helpers over ad-hoc revocation when a feature creates repeated runtime previews.

## 8. What is not persisted

- Object URLs.
- Blob payloads in long-term metadata stores.
- File handles in IndexedDB.
- Temporary thumbnail runtime URLs.

## 9. What remains pending

- Real virtualization for the library grid.
- Pagination or chunked list rendering.
- Workerized filtering for very large collections.
- Background thumbnail queueing with stronger scheduling.

## 10. Operational notes

- Keep large-collection warnings discreet.
- Do not introduce a second search engine.
- Do not add external virtualization dependencies unless the current approach becomes a proven bottleneck.
- Keep the runtime truth layer aligned with actual performance behavior.

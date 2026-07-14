# Validation Gate

## 1. Orden oficial de validación

1. `npm run build`
2. `npm run typecheck`
3. `npm run lint`
4. `cargo fmt --check --manifest-path src-tauri\\Cargo.toml`
5. `cargo check --manifest-path src-tauri\\Cargo.toml`
6. `python sidecars/python-ai/asteria_sidecar.py health`
7. `python sidecars/python-ai/asteria_sidecar.py capabilities`

## 2. Qué valida cada comando

| Command | Validates |
| --- | --- |
| `npm run build` | Next.js production build and prerender stability |
| `npm run typecheck` | TypeScript correctness without depending on generated `.next/types` |
| `npm run lint` | Static lint rules and code hygiene |
| `cargo fmt --check` | Rust formatting consistency |
| `cargo check` | Rust bridge compilation |
| `python ... health` | Sidecar runtime availability |
| `python ... capabilities` | Sidecar feature flags and runtime model status |

## 3. Why order matters

`build` and `typecheck` can fail for different reasons:

- `build` exercises Next.js prerender and server/client boundaries.
- `typecheck` should be a stable standalone check and must not depend on generated `.next/types` artifacts being present.

If `typecheck` is run against `.next/types` before those files exist, the check becomes unstable and misleading.

## 4. What to use before delivery

- Use `npm run validate` for frontend delivery when the environment supports it.
- Use `npm run validate:frontend` when you need a narrower build/typecheck gate.

## 5. What to use in Google AI Studio

- Prefer `npm run build` and `npm run typecheck` first.
- Use `npm run lint` after the build/typecheck path is known to be stable.
- If Tauri or Python is unavailable in the environment, document that explicitly instead of assuming failure.

## 6. What to use on local Windows host

- `npm run validate`
- `cargo fmt --check --manifest-path src-tauri\\Cargo.toml`
- `cargo check --manifest-path src-tauri\\Cargo.toml`
- Python sidecar health/capabilities if the local Python runtime is installed

## 7. If `.next/types` is missing

- Do not rely on the root `tsconfig.json` for standalone `tsc --noEmit`.
- Use `tsconfig.check.json` for stable validation.
- Keep `tsconfig.json` aligned with Next.js build expectations.

## 8. Required validations

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `cargo check` when Tauri is present
- sidecar `health` and `capabilities` when Python is available

## 9. Build gate reminder

- `npm run build` is mandatory after every phase, even when `typecheck` passes.
- Do not treat a green typecheck as evidence that prerender is safe.
- If `build` fails, reopen the regression before advancing to the next phase.

## 10. Desktop readiness gate

- Native window QA is required before a phase can be considered desktop-ready.
- Desktop-ready means the app has been opened in the Tauri runtime and visually checked outside the browser.
- If the native window cannot be observed directly in the current tool session, document the limitation and do not claim desktop-ready status.

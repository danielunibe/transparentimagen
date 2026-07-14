# Validation Gate

## 1. Orden oficial de validacion

1. `npm run build`
2. `npm run typecheck`
3. `npm run lint`
4. `cargo fmt --check --manifest-path src-tauri\\Cargo.toml`
5. `cargo check --manifest-path src-tauri\\Cargo.toml`
6. `cargo test --manifest-path src-tauri\\Cargo.toml`
7. `npm run preflight:windows`
8. `npm run tauri:dev`
9. `python sidecars/python-ai/asteria_sidecar.py health`
10. `python sidecars/python-ai/asteria_sidecar.py capabilities`
11. `npm run tauri:build` para entregas Windows

## 2. Que valida cada comando

| Command | Validates |
| --- | --- |
| `npm run build` | Vite production build and frontend bundle |
| `npm run typecheck` | TypeScript correctness without `.next/types` |
| `npm run lint` | Static lint rules and code hygiene |
| `cargo fmt --check` | Rust formatting consistency |
| `cargo check` | Rust bridge and Tauri plugin compilation |
| `cargo test` | Native path validation, bounded media reads and missing-directory behavior |
| `npm run preflight:windows` | Sidecar resources, Python prerequisite, frontend and Rust |
| `npm run tauri:build` | Release executable and MSI/NSIS installers |
| `npm run tauri:dev` | Native Windows runtime against Vite dev server |
| `python ... health` | Sidecar runtime availability |
| `python ... capabilities` | Sidecar feature flags and runtime model status |

## 3. Puertos

- Asteria dev server: `127.0.0.1:5174`.
- `5173` queda reservado/no usado por Asteria en esta maquina porque fue detectado ocupado por Julia.
- Si `5174` esta ocupado, no matar procesos ajenos; identificar propietario antes de cambiar o cerrar algo.

## 4. Required validations

- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `cargo check`
- `npm run tauri:dev` cuando se necesite declarar runtime nativo

## 5. Desktop readiness gate

- Desktop-ready requiere que `target\\debug\\app.exe` se lance desde `npm run tauri:dev`.
- Si solo hay HTTP 200 de Vite, reportar eso como browser/dev-server QA, no como verificacion nativa.
- Si no hay screenshot o inspeccion visual directa disponible, decir "window launched" separado de "visually verified".

## 6. Known warnings

- Vite puede advertir chunk principal mayor a 500 kB por `three` y modulos importados estaticamente.
- Esos warnings no bloquean la migracion base, pero deben tratarse como deuda de performance futura.

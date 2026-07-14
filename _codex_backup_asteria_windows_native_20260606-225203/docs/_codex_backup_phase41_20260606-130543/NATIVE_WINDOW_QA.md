# Native Window QA

## 1. Command used

- `npm run tauri:dev`

## 2. Result

- The Tauri dev flow launched the Next dev server on `http://localhost:3000`.
- The Rust/Tauri side also started and began compiling the native window runtime.
- I could confirm the dev runtime started, but this tool session does not provide a direct screenshot of the native window itself.
- After the prerender fix, `npm run build` completed successfully.

## 3. Browser Mode vs Desktop Mode

- Browser mode is still available through `npm run dev`.
- Desktop mode is the Tauri runtime started by `npm run tauri:dev`.
- `services/runtimeService.ts` reports `tauri` when the native bridge is available.

## 4. Runtime Capability Truth Layer

- `webgl` is modeled.
- `material_3d_preview` is modeled.
- In desktop mode, the truth layer remains honest about `available`, `missing_dependency`, or `unsupported` based on the runtime state.

## 5. Tauri bridge

- `services/tauriBridge.ts` uses the native bridge only when Tauri internals exist.
- Native commands are still available for sidecar health, capabilities, model listing, and image operations.

## 6. Python sidecar

- `health` passed.
- `capabilities` passed.
- `realEsrgan` remains `false`.
- `realEsrganStatus` remains `model_missing`.

## 7. Material Vault

- Material Vault opens in the app shell and continues to use the consolidated metadata model.
- The 3D preview foundation remains local, non-destructive, and runtime-only.

## 8. Preview 3D

- The preview renders a minimal local Three.js scene.
- Binding is helper-driven and respects overrides.
- Fallbacks remain honest when WebGL or runtime support is missing.

## 9. Errors found

- `npm run build` initially failed on prerender of `/` with `TypeError: a[d] is not a function`.
- The issue was resolved by adding a minimal `app/not-found.tsx`, which allowed Next to complete prerender cleanly.

## 10. Screenshots

- No screenshot was captured in this session.

## 11. Desktop build

- `npm run tauri build` was not attempted in this session.
- The frontend build gate was revalidated on 2026-06-06 and is green.
- Desktop packaging readiness is still pending because native packaging was not executed here.

## 12. Next steps

- Capture direct visual evidence of the native window before claiming desktop-ready status.
- Run a controlled `tauri build` packaging preflight.
- Define the packaged Python sidecar and path contract before release readiness.

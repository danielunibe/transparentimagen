# Stack Decision Record

## 1. Decisión recomendada

Keep `Next.js + React + TypeScript + Tauri + Rust bridge + Python sidecar` for the current Asteria checkout.

## 2. Opciones evaluadas

| Option | Summary | Decision |
| --- | --- | --- |
| Keep current stack | Best match for current codebase and product direction | Recommended |
| Vite + React + Tauri | Simpler desktop React shell | Reconsider later if Next.js becomes friction |
| Electron + React + Node | Easier Node integration, heavier runtime | Not recommended |
| Python desktop (PySide6/Qt) | Strong Python-native story | Not recommended |
| Flutter desktop | Unified UI stack, full rewrite | Not recommended |
| Rust-only desktop (egui/iced/slint) | Native and fast, rewrite-heavy | Not recommended |
| Web-only app | Simplifies stack, loses desktop-local strengths | Not recommended |

## 3. Pros / cons of the current stack

### Pros

- Good fit for a UI-heavy desktop workspace.
- Tauri keeps the shell lighter than Electron.
- Python sidecar is a sensible place for local image processing.
- Rust gives a safer bridge layer for native commands.
- IndexedDB fits metadata-first local persistence.

### Cons

- More boundaries to keep consistent.
- Next.js is not obviously adding SSR value here.
- Build/runtime complexity can grow if modules keep expanding without consolidation.

## 4. Why keep Next.js

- The app already uses it successfully as a thin shell.
- The app is largely client-side in practice.
- There is no clear proof yet that Next.js is blocking the product.
- The current issue is module/validation debt, not framework unsuitability.

## 5. Why keep Tauri

- Better fit than Electron for a local-first desktop utility.
- Smaller surface area for native shell work.
- Encourages a command-based bridge instead of a loose shell model.

## 6. Why keep Python sidecar

- It isolates image-processing code from the UI runtime.
- It supports Pillow/rembg/ONNX-style growth without contaminating the frontend.
- It is the right place for model management and local processing smoke tests.

## 7. Cuándo reconsiderar la decisión

Revisit the stack if several of these become true:

- Next.js continues to complicate a mostly client-side desktop app.
- Build/runtime friction becomes a repeated blocker.
- The app’s feature growth becomes dominated by local file/runtime behavior rather than UI composition.
- A measurable migration benefit appears that outweighs rewrite cost.

## 8. Señales para migrar

- Repeated build/prerender issues that are structural, not incidental.
- No meaningful use of Next.js route/server features.
- Pressure to simplify to a Vite-style client shell.
- Module complexity is no longer the main problem and framework overhead is.

## 9. Señales para quedarse

- The current app continues to behave like a React desktop shell.
- Tauri and Python sidecar remain stable.
- Architecture debt can be solved by module cleanup and type splitting.
- No framework-level blocker is demonstrated.

## 10. Decision rationale

The safest choice is to keep the current stack and pay down debt first. A migration would be expensive and does not yet have a clear payoff compared with stabilizing the current codebase.


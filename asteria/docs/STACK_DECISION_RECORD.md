# Stack Decision Record

## 1. Decision activa

Migrar y mantener Asteria sobre `Vite + React + TypeScript + Tauri v2 + Rust bridge + Python sidecar`.

Esta decision reemplaza la recomendacion anterior de conservar Next.js. La migracion fue autorizada para reducir friccion de escritorio, eliminar prerender/App Router de una app local y preparar persistencia SQLite nativa.

## 2. Estado implementado

| Capa | Decision | Estado |
| --- | --- | --- |
| Frontend | Vite + React + TypeScript | Implementado |
| Desktop | Tauri v2 | Mantener |
| Native bridge | Rust commands + Tauri plugins | Mantener y expandir |
| Persistencia | SQLite via `tauri-plugin-sql` como unica fuente de verdad | Implementado |
| Carpetas | Rutas Windows + Tauri Dialog + comandos Rust restringidos | Implementado |
| Estado de ventana | `tauri-plugin-window-state` | Implementado |
| AI local | Python sidecar | Mantener |

## 3. Decisiones concretas

- Next.js, App Router, `next/font`, `next/image` y `eslint-config-next` quedan retirados del runtime activo.
- La entrada oficial es `index.html` + `src/main.tsx`, renderizando `AsteriaShell`.
- `app/globals.css` se conserva como CSS global reutilizado por Vite.
- El puerto dev real queda en `127.0.0.1:5174` porque `5173` estaba ocupado por Julia durante la migracion.
- SQLite crea `schema_version`, `kv_store`, `thumbnail_cache`, `folder_sources` y `migration_log`.
- La UI consume repositorios por dominio y no accede directamente a SQLite ni almacenamiento web.
- `localStorage` e IndexedDB quedan aislados al importador `web-storage-to-native-sqlite-v2`.
- El runtime web no esta soportado; Vite solo sirve y empaqueta la WebView de Tauri.
- El identificador distribuible es `com.daniel.asteria`, con copia de compatibilidad desde `com.tauri.dev`.

## 4. Limites

- No se autorizo implementar Windows Shell integrations, DirectML, CLIP, SAM 2 ni watch folders en esta fase.
- No modificar `image_enhancer\image_enhancer`; sigue como legado/referencia.
- No se soportan `FileSystemDirectoryHandle`, IndexedDB ni `localStorage` durante la operacion normal.
- Los datos web antiguos no se borran despues de importarlos.
- El sidecar se incluye en el bundle, pero Python sigue siendo un prerrequisito externo.

## 5. Gates obligatorios

- `npm run build`
- `npm run typecheck`
- `npm run lint`
- `cargo check` en `src-tauri`
- `npm run tauri:dev` para runtime Windows cuando sea posible

# TECH_STACK.md

## 1. Resumen tecnico

- Tipo de proyecto: aplicacion local de escritorio para Windows.
- Frontend: Vite + React 19 + TypeScript.
- Desktop: Tauri v2.
- Bridge nativo: Rust commands + Tauri plugins.
- Procesamiento IA local: Python sidecar en `sidecars/python-ai`.
- Estilos: Tailwind CSS v4 via PostCSS.
- Iconos/UI: `lucide-react`, componentes propios.
- Persistencia desktop: SQLite via `tauri-plugin-sql`.
- Persistencia oficial: SQLite como unica fuente de verdad.
- Compatibilidad antigua: `localStorage` e IndexedDB solo se leen desde la migracion one-shot; no forman parte del runtime normal.
- Carpetas: rutas nativas Windows persistidas en SQLite y escaneadas mediante comandos Rust de solo lectura.
- Package manager: npm.

## 2. Comandos del proyecto

| Comando | Uso | Estado |
| --- | --- | --- |
| `npm run dev` | Vite dev server en `127.0.0.1:5174` | confirmado |
| `npm run build` | Build Vite de produccion | confirmado |
| `npm run preview` | Preview Vite en `127.0.0.1:4173` | configurado |
| `npm run typecheck` | TypeScript con `tsconfig.check.json` | confirmado |
| `npm run lint` | ESLint plano para TS/TSX | confirmado |
| `npm run validate` | Build + typecheck + lint | configurado |
| `npm run tauri:dev` | Ventana Tauri contra Vite | confirmado proceso |
| `npm run tauri:build` | Build release + instaladores MSI/NSIS | confirmado |
| `npm run preflight:windows` | Sidecar, frontend y Rust antes de empaquetar | confirmado |
| `cargo check` en `src-tauri` | Compilacion Rust bridge | confirmado |
| `cargo test` en `src-tauri` | Contratos de rutas y escaneo nativo | confirmado |

## 3. Puertos

- Asteria usa `127.0.0.1:5174` durante desarrollo.
- `5173` no se usa para Asteria porque en esta maquina estaba ocupado por Julia.
- Tauri `devUrl` esta alineado a `http://localhost:5174`.

## 4. Dependencias principales

| Dependencia | Uso | Se puede tocar | Notas |
| --- | --- | --- | --- |
| `vite` | Build/dev frontend | requiere permiso | Sustituye Next.js |
| `@vitejs/plugin-react` | React en Vite | requiere permiso | Dev dependency |
| `@tauri-apps/plugin-sql` / `tauri-plugin-sql` | SQLite local | requiere permiso | Usa feature Rust `sqlite` |
| `@tauri-apps/plugin-fs` | FS desktop | requiere permiso | Mantener permisos acotados |
| `@tauri-apps/plugin-dialog` | Dialogos nativos | requiere permiso | Mantener |
| `@tauri-apps/plugin-shell` | Shell Tauri | requiere permiso | Mantener |
| `@tauri-apps/plugin-window-state` / `tauri-plugin-window-state` | Restaurar posicion, tamano y maximizado | requiere permiso | Activo |
| `typescript-eslint` | Parser ESLint para TS/TSX sin Next | requiere permiso | Reemplaza `eslint-config-next` |

## 5. Restricciones tecnicas

- No reintroducir Next.js sin decision nueva.
- No mover Asteria de Vite a otro framework sin autorizacion.
- No tocar `image_enhancer\image_enhancer` salvo peticion explicita.
- No persistir blobs/object URLs/files pesados en KV; solo thumbnails permitidos en `thumbnail_cache`.
- No reintroducir modo web ni persistencia browser.
- El sidecar Python se empaqueta como recurso, pero la version actual requiere Python y dependencias locales en la maquina.
- Identificador Windows/Tauri: `com.daniel.asteria`.

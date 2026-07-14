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
- Persistencia compat temporal: `localStorage` para lecturas sincronicas existentes e IndexedDB solo como fallback browser/handle legacy.
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
| `cargo check` en `src-tauri` | Compilacion Rust bridge | confirmado |

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
| `typescript-eslint` | Parser ESLint para TS/TSX sin Next | requiere permiso | Reemplaza `eslint-config-next` |

## 5. Restricciones tecnicas

- No reintroducir Next.js sin decision nueva.
- No mover Asteria de Vite a otro framework sin autorizacion.
- No tocar `image_enhancer\image_enhancer` salvo peticion explicita.
- No persistir blobs/object URLs/files pesados en KV; solo thumbnails permitidos en `thumbnail_cache`.
- No reclamar soporte completo SQLite para todos los datos hasta retirar la compatibilidad sincronica de `localStorage`.

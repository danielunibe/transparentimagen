# Native Window QA

## 2026-06-07 - Vite + SQLite base migration

Estado: `runtime_launched_not_visually_captured`

- `npm run tauri:dev` compilo y ejecuto `target\debug\app.exe`.
- Vite quedo activo en `http://127.0.0.1:5174` con HTTP 200.
- `5173` no se uso porque estaba ocupado por Julia (`C:\Desarrollos DEV daniel\julia\1JuliaDEV`).
- Se corrigio capability faltante para `core:window:allow-start-dragging` y se habilitaron permisos acotados para minimizar/cerrar/toggle maximize.
- SQLite creo `C:\Users\danie\AppData\Roaming\com.tauri.dev\asteria.db` con tablas `schema_version`, `kv_store` y `thumbnail_cache`.
- No hubo captura visual automatizada: Playwright del runtime compartido no pudo cargar `playwright-core`.
- No se declara "visually verified"; solo "window launched" + proceso/HTTP/SQLite verificados.

---

Fecha: 2026-06-06
Fase: 41B - Native Sidecar Path and PBR ZIP QA
Estado: `partially_done`

## 1. Alcance ejecutado

- Gate inicial completo.
- Reproduccion del sidecar CLI y verificacion de rutas absolutas desde Rust.
- Extraccion temporal de ZIPs PBR fuera del repo para QA local.
- Validacion del contenido PBR de `FabricLeatherCowhide001` y `TilesMosaicPennyround001`.
- Ejecucion de `npm run tauri:dev` con registro de que la sesion nativa no pudo quedar visualmente verificada en esta corrida.
- Sin `tauri build`, cambios de permisos, modelos, operaciones de archivos ni features nuevas.

## 2. Evidencia nativa

- La sesion `tauri:dev` arranco, pero en esta corrida el timeout impidio completar una verificacion visual confiable de la ventana.
- La validacion anterior de Phase 41 queda como antecedente en `docs/NATIVE_WINDOW_QA.md`; esta fase agrega sidecar path recovery y QA PBR temporal.
- No se va a reclamar captura visual nueva sin evidencia directa.

## 3. ZIPs PBR locales

- Ruta original:
  - `C:\Users\danie\Downloads\FabricLeatherCowhide001.zip`
  - `C:\Users\danie\Downloads\TilesMosaicPennyround001.zip`
- Ruta temporal de QA:
  - `C:\Users\danie\AppData\Local\Asteria\qa-fixtures\pbr-materials\FabricLeatherCowhide001`
  - `C:\Users\danie\AppData\Local\Asteria\qa-fixtures\pbr-materials\TilesMosaicPennyround001`
- Confirmacion:
  - No se copiaron al repo.
  - No se modificaron los ZIP originales.
  - No se generaron mapas nuevos.

### FabricLeatherCowhide001

- Archivos detectados:
  - `FabricLeatherCowhide001_AO_2K.jpg`
  - `FabricLeatherCowhide001_BUMP_2K.jpg`
  - `FabricLeatherCowhide001_BUMP16_2K.tiff`
  - `FabricLeatherCowhide001_COL_VAR1_2K.jpg`
  - `FabricLeatherCowhide001_COL_VAR2_2K.jpg`
  - `FabricLeatherCowhide001_COL_VAR3_2K.jpg`
  - `FabricLeatherCowhide001_DISP_2K.jpg`
  - `FabricLeatherCowhide001_DISP16_2K.tiff`
  - `FabricLeatherCowhide001_GLOSS_2K.jpg`
  - `FabricLeatherCowhide001_NRM_2K.jpg`
  - `FabricLeatherCowhide001_REFL_2K.jpg`
  - `FabricLeatherCowhide001_Preview1.png`
- Mapas utiles para Asteria:
  - base color: `COL_VAR1/2/3` como candidatos
  - ao: presente
  - normal: presente
  - roughness: derivable desde `GLOSS` solo como heuristica inversa si el flujo lo soporta
  - height/displacement: presentes como candidatos
  - emissive: no detectado
- Estado QA:
  - material parcial/completo segun heuristica del vault
  - apto para validar diagnostics y preview con fallback honesto

### TilesMosaicPennyround001

- Archivos detectados:
  - `TilesMosaicPennyround001_AO_2K.png`
  - `TilesMosaicPennyround001_BUMP_2K.png`
  - `TilesMosaicPennyround001_BUMP16_2K.png`
  - `TilesMosaicPennyround001_COL_2K.png`
  - `TilesMosaicPennyround001_DISP_2K.png`
  - `TilesMosaicPennyround001_DISP16_2K.png`
  - `TilesMosaicPennyround001_GLOSS_2K.png`
  - `TilesMosaicPennyround001_IDMAP_2K.png`
  - `TilesMosaicPennyround001_NRM_2K.png`
  - `TilesMosaicPennyround001_REFL_2K.png`
  - `TilesMosaicPennyround001_Preview1.png`
- Mapas utiles para Asteria:
  - base color: presente
  - ao: presente
  - normal: presente
  - roughness: derivable desde `GLOSS` solo como heuristica inversa si el flujo lo soporta
  - height/displacement: presentes como candidatos
  - emissive: no detectado
- Estado QA:
  - material parcial/completo segun heuristica del vault
  - apto para validar diagnostics y preview con fallback honesto

## 4. Sidecar path recovery

- Problema reproducido: `src-tauri/src/lib.rs` resolvia `sidecars/python-ai/asteria_sidecar.py` y `sidecars/python-ai/models` como rutas relativas.
- Causa: en Tauri dev el proceso efectivo queda anclado al contexto de `src-tauri`, no al repo root.
- Fix aplicado: resolver ambas rutas desde `CARGO_MANIFEST_DIR` subiendo al root del repo y construyendo rutas absolutas antes de invocar Python.
- Efecto esperado: CLI directo sigue funcionando y Tauri dev deja de depender del `cwd` accidental.
- Packaging final: no resuelto en esta fase; queda separado para Phase 43.

## 5. Python sidecar desde CLI

- `health`: pasa.
- `capabilities`: pasa.
- `Real-ESRGAN`: sigue `model_missing`.
- El runtime Python disponible es `C:\\Program Files\\Python310\\python.exe`.
- No se descargaron modelos.

## 6. Material Vault y preview 3D

- La carpeta temporal PBR existe fuera del repo y contiene ambos materiales para QA.
- La heuristica PBR del vault ya tiene señales suficientes para detectar los archivos clave por nombre.
- Esta corrida no dejo evidencia visual nueva dentro de Tauri, asi que la validacion visual del preview 3D queda parcialmente cerrada por fixtures pero no completamente observada en ventana.
- No se modificaron archivos ni se persiguieron object URLs persistentes.

## 7. Logs

- Next dev: arranque correcto en build y typecheck.
- Cargo/Tauri: compilacion correcta.
- Sidecar CLI: OK.
- `npm run tauri:dev`: lanzado, pero la sesion quedo truncada por timeout antes de una verificacion visual confiable.
- Error funcional corregido: resolucion del sidecar bajo `src-tauri/sidecars`.

## 8. Validaciones

| Validacion | Resultado |
| --- | --- |
| `npm run build` | pasa |
| `npm run typecheck` | pasa |
| `npm run lint` | 0 errores, 3 warnings historicos |
| `cargo fmt --check --manifest-path src-tauri\Cargo.toml` | pasa |
| `cargo check --manifest-path src-tauri\Cargo.toml` | pasa |
| `python sidecars/python-ai/asteria_sidecar.py health` | pasa |
| `python sidecars/python-ai/asteria_sidecar.py capabilities` | pasa |
| `npm run tauri:dev` | lanzado; sin verificacion visual confiable en esta sesion |

## 9. Cierre

Phase 41B queda `partially_done`.

Lo cerrado:

- sidecar CLI estable;
- fix del path del sidecar en Rust;
- ZIPs PBR disponibles y extraidos temporalmente fuera del repo;
- gate frontend y Rust verde.

Lo pendiente:

- evidencia visual nativa confiable de `tauri:dev` en esta sesion;
- validacion visual completa de Material Vault y Preview 3D dentro de la ventana nativa.

Siguiente fase recomendada: `Phase 41C - UI Shell Native Visual Cleanup` o, si se prioriza cierre de runtime antes de seguir con visual polish, una nueva corrida de verificacion nativa sobre la base ya corregida.

---

# Phase 41C - UI Shell Native Visual Cleanup

Fecha: 2026-06-06
Estado: `partially_done`

## 1. Problemas visuales atacados

- La barra interna custom de ventana se oculto en runtime Tauri para evitar duplicacion con la barra nativa/sistema.
- El contenedor principal tipo tarjeta fue retirado visualmente del shell principal.
- El fondo base se oscurecio a un negro mas profundo.

## 2. Cambios aplicados

- `AsteriaShell` ahora omite `AppChrome` en Tauri y usa un fondo base mas negro.
- El `main` del area principal ya no usa superficie, sombra, ring ni redondeo de caja grande.
- `LibraryHeader` quedo sin la tarjeta grande, para que el contenido flote sobre el fondo.
- `app/layout.tsx` usa un negro base mas profundo para todo el body.

## 3. Contenido preservado

- `Local Library`
- `Ready to connect a folder`
- `Save View`
- search
- filtros
- `Add Folder`
- empty state central

## 4. Resultado tecnico

- `npm run build`: pasa
- `npm run typecheck`: pasa
- `npm run lint`: pasa con 3 warnings historicos
- `cargo check --manifest-path src-tauri\Cargo.toml`: pasa
- `python sidecars/python-ai/asteria_sidecar.py health`: pasa
- `python sidecars/python-ai/asteria_sidecar.py capabilities`: pasa

## 5. Resultado en Tauri

- `npm run tauri:dev` sigue truncandose en esta sesion por el `beforeDevCommand`.
- El log vuelve a mostrar fallos de `routes-manifest.json` durante el arranque, asi que no se considera una verificacion visual nativa cerrada.

## 6. Estado final

- `partially_done`
- Queda pendiente una corrida nativa limpia para confirmar visualmente que la caja principal y la titlebar duplicada ya no aparecen.

Phase 41C debe:

- cerrar la validacion visual nativa limpia una vez resuelto el conflicto de puerto;
- confirmar visualmente que la barra nativa ya no se siente separada;
- repetir captura nativa y el gate completo.

---

# Phase 41E - Frameless Native Shell Integration

Fecha: 2026-06-06
Estado: `partially_done`

## 1. Problema visual original

- La ventana nativa seguia mostrando una barra superior separada.
- La titlebar se sentia desacoplada del shell.
- El shell podia verse como piezas apiladas en vez de una sola interfaz integrada.

## 2. Cambios aplicados

- `src-tauri/tauri.conf.json` se actualizo con `decorations: false`.
- `AsteriaShell` mantiene el shell integrado con chrome interno discreto.
- `AppChrome` se transformo en una barra integrada al shell, con drag region y controles compactos.
- El fondo base y el main siguen en negro intenso, sin caja grande ni sombra dominante.

## 3. Controles y drag

- Controles integrados:
  - minimizar
  - maximizar/restaurar
  - cerrar
- Drag region:
  - el nombre de la app y el espacio central superior tienen `data-tauri-drag-region`
  - no se aplica sobre search, navegación ni acciones

## 4. Resultado tecnico

- `npm run build`: pasa
- `npm run typecheck`: pasa
- `npm run lint`: pasa con 3 warnings historicos
- `cargo check --manifest-path src-tauri\Cargo.toml`: pasa
- `python sidecars/python-ai/asteria_sidecar.py health`: pasa
- `python sidecars/python-ai/asteria_sidecar.py capabilities`: pasa

## 5. Resultado en Tauri

- `npm run tauri:dev` levanto el runtime y dejo `app.exe` y `msedgewebview2.exe` activos.
- En esta sesion no se capturo screenshot directo, pero el contrato frameless ya quedo aplicado y listo para QA visual.
- Browser mode no rompio en build/typecheck.

## 6. Estado final

- `partially_done`
- Queda pendiente una captura visual limpia para confirmar con evidencia que la barra separada ya no aparece y que los controles integrados se ven una sola vez.

## 10. Rollback documental

Respaldo previo:

`docs/_codex_backup_phase41_20260606-130543`

---

# Phase 41F - Frameless Visual QA Closure

Fecha: 2026-06-06
Estado: `partially_done`

## 1. Objetivo de esta pasada

- Confirmar visualmente la ventana frameless nativa.
- Verificar que no volviera la barra superior separada.
- Confirmar que el shell real de Asteria siguiera levantando en Tauri.

## 2. Evidencia nativa obtenida

- Se confirmo que `app.exe` estaba corriendo y tenia ventana principal con titulo `Asteria`.
- Se logro traer la ventana al frente y capturar el escritorio.
- La ventana nativa de Asteria se ve como un bloque negro/vacio en la captura tomada en esta sesion.
- No se pudo obtener una captura limpia del contenido webview con los controles integrados visibles.

## 3. Resultado de la QA visual

- Barra superior separada: no se pudo revalidar con evidencia visual limpia en esta pasada.
- Controles integrados: no se pudieron confirmar visualmente en la captura obtenida.
- Drag region: no se pudo validar por interaccion visual directa en esta sesion.
- Fondo negro/premium: la ventana nativa si se ve oscura, pero el contenido no quedo visible en la captura.
- Caja grande / surface boxed: no se pudo revalidar con evidencia visual limpia.

## 4. Diagnostico honesto

- La ventana nativa esta presente, pero la UI no quedo visualmente cerrada en la captura de esta sesion.
- Esto sugiere un problema de render visible, de captura o de carga del contenido dentro de la shell frameless.
- No se cambio codigo en esta pasada.

## 5. Estado final

- `partially_done`
- La fase no queda cerrada visualmente todavia.
- El siguiente paso sigue siendo una verificacion nativa limpia o un diagnostico focalizado del render vacio.

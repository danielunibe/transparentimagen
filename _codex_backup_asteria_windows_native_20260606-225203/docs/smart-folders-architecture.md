# Smart Folders Architecture

Asteria ahora interpreta carpetas locales como `Smart Folders` sin mover, renombrar ni modificar archivos reales.

Tipos iniciales:
- `photo_folder`
- `video_folder`
- `screenshot_folder`
- `cutout_folder`
- `upscale_folder`
- `export_folder`
- `pbr_material_folder`
- `texture_set_folder`
- `project_folder`
- `unknown_folder`

Reglas de esta fase:
- solo metadata ligera;
- sin persistir `Blob`, `File` u `objectUrl`;
- sin preview 3D real;
- sin mover carpetas;
- sin renombrado real de assets.

Material Vault can now attach diagnostics without mutating original folders.

## Stability notes after Phase 35

- Smart Folder metadata stays lightweight and folder-scoped.
- Weak PBR signals should fall back to `texture_set_folder`, `needs_review`, or `unknown_folder`.
- Browser mode must never depend on native file mutation.
- `Blob`, `File`, and `objectUrl` are forbidden in persisted Smart Folder metadata.

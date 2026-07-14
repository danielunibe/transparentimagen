# Material Vault Architecture

`Material Vault` es la primera experiencia especializada montada sobre Smart Folders.

Detecta carpetas PBR por nombres de archivo y clasifica:
- `complete`
- `partial`
- `texture_set`
- `unknown`

Mapas detectados:
- base color / albedo / diffuse
- normal
- roughness
- metallic
- ambient occlusion
- height / displacement
- opacity / alpha
- emissive
- specular
- gloss

Persistencia permitida:
- nombre manual;
- categoría;
- target engine;
- notas;
- favorito.
- overrides manuales de map type.

Persistencia prohibida:
- bytes de imagen;
- archivos reales;
- blobs temporales;
- `objectUrl`.

Diagnóstico añadido en Fase 36:
- completeness score
- required vs optional maps
- resolution mismatch
- mixed formats
- duplicate map-type detection
- low-confidence filename detection

Fase 36B consolida el MVP de diagnostics:
- score visible en `MaterialCard`
- estado visible `Ready / Partial / Needs Review`
- panel de diagnostics con requeridos/opcionales presentes y faltantes
- descarga de manifest y diagnostic report JSON metadata-only
- Smart Collections y Search alineados con score, warnings, errors y missing required maps

## Stability notes after Phase 35

- Material detection should not mark a folder as PBR complete from a single filename hit.
- Overrides only change Asteria interpretation, never the source file.
- Cards and inspectors must tolerate empty `maps`, `missingMaps`, and partial diagnostics.
- Export manifests remain metadata-only and must not embed session payloads.

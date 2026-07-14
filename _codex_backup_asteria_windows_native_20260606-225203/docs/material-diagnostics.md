# Material Diagnostics

Asteria computes a metadata-only diagnostics layer for Material Vault.

## Completeness score

The MVP score uses lightweight filename-based map detection:

- base color: `+35`
- normal: `+30`
- roughness: `+25`
- ambient occlusion: `+5`
- metallic: `+5`

Maximum score: `100`

## Required maps

- `base_color` or equivalent `albedo` / `diffuse`
- `normal`
- `roughness`

## Optional maps

- `ambient_occlusion`
- `metallic`
- `height`
- `displacement`
- `opacity`
- `alpha`
- `emissive`
- `specular`
- `gloss`

## Readiness labels

- `Ready`: score high enough and no required maps missing
- `Needs Review`: incomplete, ambiguous, warning-heavy, or error-heavy material
- `Partial`: coherent texture set but still missing required data

## Current limits

- detection is still based on filename hints
- there is no deep visual analysis yet
- no missing maps are generated
- no original files are modified, moved, copied, renamed, or deleted
- preview 3D remains deferred to a later phase

## Manual overrides

- overrides only change Asteria interpretation
- no file rename
- no file modification
- no byte rewrite

## Persistence

Persisted:
- manual material name
- category
- target engine
- notes
- favorite
- map-type overrides
- lightweight diagnostics metadata

Not persisted:
- `Blob`
- `File`
- `objectUrl`
- image bytes
- destructive file operations

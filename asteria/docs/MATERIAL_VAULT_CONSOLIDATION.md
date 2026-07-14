# Material Vault Consolidation

## 1. Problem this solves

Material Vault previously depended on several nearby helpers for PBR detection, storage, diagnostics, and search alignment. That made category, target engine, map overrides, and readiness labels easy to drift apart.

This pass consolidates the metadata model and keeps the surface metadata-only.

## 2. How PBR is detected

- Filename-based detection stays in `services/pbrDetectionService.ts`.
- Detection is conservative and requires a primary signal plus supporting evidence before treating a folder as a material.
- Common aliases are normalized to canonical map types.
- Filename detection and material-folder detection remain separate steps.

## 3. Map types

Supported map types include:

- `base_color`
- `albedo`
- `diffuse`
- `normal`
- `roughness`
- `metallic`
- `ambient_occlusion`
- `height`
- `displacement`
- `opacity`
- `alpha`
- `emissive`
- `specular`
- `gloss`
- `unknown`

## 4. Diagnostics

- Diagnostics are built in `services/materialDiagnosticsService.ts`.
- Completeness, missing maps, resolution mismatch, duplicate map types, mixed formats, and readiness labels are centralized there.
- Manual overrides are respected because overridden map entries are marked in the stored metadata and used by the diagnostics layer.

## 5. Overrides

- Map overrides are persisted as lightweight metadata only.
- Resetting an override restores the stored map type state.
- Diagnostics and manifests read the overridden map type, not a hidden duplicate pipeline.

## 6. Categories

- Categories remain lightweight metadata.
- Supported categories include the common material families plus `other` and `unknown`.
- The UI exposes a narrow set of category controls to avoid taxonomy drift.

## 7. Target engines

- Allowed target engines are `generic`, `blender`, `unreal`, and `unity`.
- Readiness is evaluated against the selected target engine.
- The current target engine is stored as metadata only.

## 8. Search tokens

Material Vault now aligns with the canonical search layer for:

- `material:true`
- `material:complete`
- `material:partial`
- `material:needs_review`
- `material:ready`
- `material:incomplete`
- `map:normal`
- `map:roughness`
- `map:basecolor`
- `missing:normal`
- `missing:roughness`
- `category:wood`
- `category:metal`
- `target:blender`
- `target:unreal`
- `target:unity`
- `overrides:true`
- `manual:true`
- `score:80`

## 9. Smart Collections alignment

- Smart Collections keep using the canonical criteria layer.
- Material-related search and status checks now use the same normalized vocabulary.
- No second search engine was introduced.

## 10. Exported metadata

Package and report surfaces may include:

- material status
- category
- target engine
- map overrides
- completeness score
- missing maps
- diagnostics summary

## 11. What is not persisted

- `Blob`
- `File`
- `objectUrl`
- raw bytes
- 3D preview data

## 12. Pending for Fase 38

- Real 3D preview
- Three.js or shader-based rendering
- richer preview controls
- deeper material scene presentation


# 3D Material Preview Foundation

## 1. Objective

This phase prepares Asteria for a local 3D-style preview of PBR materials without exporting files, generating maps, or modifying source textures.

## 2. What was implemented

- A minimal local preview renderer was added for Material Vault.
- Geometry selection exists for `sphere`, `cube`, and `plane`.
- The preview stays local and metadata-driven.
- The UI still shows a clear fallback when WebGL or the renderer is unavailable.
- PBR map binding is now resolved through a pure helper before it reaches the renderer.
- The renderer binds `base_color`/`albedo`/`diffuse`, `normal`, `roughness`, `metallic`, and `ambient_occlusion` when a usable runtime URL or session file exists.
- Manual overrides are respected in the binding summary and preview readiness state.
- Runtime-only textures are cleaned up on rebind and on unmount.

## 3. What is still a placeholder

- The preview is intentionally basic.
- There is no orbit control, shader stack, displacement, opacity, or advanced material mapping yet.
- The UI still explains the next step honestly when runtime support is missing.

## 4. WebGL dependency

- WebGL is modeled in runtime capability truth.
- If WebGL is unavailable, the preview should report that it is unsupported.
- If WebGL is available but the 3D renderer dependency is missing, the preview should report `missing_dependency`.

## 5. 3D dependency

- `three` is installed and used directly.
- No higher-level React 3D wrapper is installed.
- The next step would require explicit approval before adding any additional 3D library.

## 6. Supported geometries

- sphere
- cube
- plane

## 7. Initial map binding

- Base color: `base_color`, `albedo`, `diffuse`
- Normal: `normal`
- Roughness: `roughness`
- Metallic: `metallic`, `metalness`
- AO: `ambient_occlusion`
- Height / displacement: future placeholder
- Opacity / alpha: future placeholder
- Emissive: future placeholder

## 8. Object URL lifecycle

- The foundation does not persist object URLs.
- No `Blob` or `File` data is stored for the preview.
- If a future renderer needs runtime object URLs, they must be revoked on unmount and kept runtime-only.
- Runtime-generated texture URLs are revoked when textures are re-bound or when the preview unmounts.

## 9. What this phase does not do

- No Blender export
- No Unreal export
- No Unity export
- No map generation
- No shader-heavy rendering
- No textural modification
- No persistence of preview binaries

## 10. Pending work

- Add richer material map binding only if it stays local-only and non-destructive.
- Add optional opacity/emissive/displacement handling only if it remains safe and explicit.
- Extend lighting and material controls only after the foundation is confirmed stable.
- Consider future controls only if they do not change the minimal product contract.

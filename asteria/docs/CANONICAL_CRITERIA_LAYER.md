# Canonical Criteria Layer

## 1. Purpose

This layer centralizes the shared search and filtering vocabulary used by Search, Smart Collections, Smart Folders, and Material filtering.

## 2. Shared tokens

- `type:png`
- `format:jpg`
- `variant:adjustment`
- `edited:true`
- `exported:true`
- `ai:true`
- `metadata:true`
- `session:true`
- `width>1000`
- `height>1000`
- `smart:true`
- `folder:pbr`
- `folder:texture`
- `material:true`
- `material:complete`
- `material:partial`
- `material:texture_set`
- `map:normal`
- `map:roughness`
- `missing:normal`
- `missing:roughness`
- `score:80`

## 3. Shared modules

- `data/searchTokens.ts`
- `data/canonicalCriteria.ts`
- `services/criteriaService.ts`

## 4. Rules

- Prefer the canonical token definitions over ad-hoc string parsing.
- Normalize boolean, folder, and PBR map values through shared helpers.
- Keep `undefined` / `null` guards explicit.
- Preserve legacy behavior through compatibility wrappers when needed.

## 5. Current status

This layer is partially introduced and should be extended incrementally, not in one refactor sweep.

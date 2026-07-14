# Type Surface Split

## 1. Por qué se divide `types/asteria.ts`

`types/asteria.ts` había acumulado demasiados dominios distintos en un solo archivo. Eso aumentaba el acoplamiento y hacía más difícil estabilizar cambios incrementales.

## 2. Dominios creados

- `types/domains/core.ts`

## 3. Qué contiene cada archivo

- `types/domains/core.ts`: tipos compartidos base, export metadata, smart collections, thumbnails, AI/runtime-adjacent helpers y gallery primitives.
- `types/asteria.ts`: barrel de compatibilidad temporal y superficie restante mientras se migra el resto por fases.

## 4. Import recomendado para código nuevo

Usar el archivo de dominio más específico posible cuando el tipo ya viva allí.

Para lo que ya está en la base compartida, importar desde `@/types/domains/core`.

## 5. Import legacy permitido temporalmente

`@/types/asteria` sigue permitido durante la transición para no romper imports existentes.

## 6. Reglas a evitar

- No meter todo en `types/asteria.ts`.
- No importar servicios desde types.
- No importar UI desde types.
- No crear dependencias circulares.
- Usar `import type` cuando corresponda.

## 7. Plan de migración gradual

1. Mantener compatibilidad con el barrel.
2. Seguir extrayendo dominios por bloques seguros.
3. Migrar imports de forma opportunista y solo cuando sea trivial.
4. Reducir gradualmente la dependencia del barrel legacy.

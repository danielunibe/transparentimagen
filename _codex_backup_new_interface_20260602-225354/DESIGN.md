# DESIGN.md

## 1. Identidad visual del proyecto

- Nombre: Image Enhancer - Unova Games Studio.
- Proposito visual: herramienta local oscura, compacta y tecnica para procesamiento de imagenes.
- Sensacion buscada: utilitaria, clara, de estudio creativo.
- Nivel de acabado esperado: funcional premium liviano, con foco en inspeccion visual del recorte.

## 2. Principios de diseno

- Mantener interfaz compacta de escritorio, pero sin recortar previews.
- Preservar panel izquierdo de controles y panel derecho de preview con modos de vista.
- Usar tablero de transparencia para que el usuario vea alfa real.
- No aplanar ni cambiar la identidad oscura sin autorizacion.

## 3. Tokens actuales

| Token | Valor | Uso | Estado |
|---|---|---|---|
| `ACCENT` | `#7C6AFF` | Acciones principales | confirmado |
| `ACCENT2` | `#5B4FCC` | Variante acento | confirmado |
| `BG` | `#111113` | Fondo app | confirmado |
| `PANEL` | `#1C1C20` | Paneles | confirmado |
| `PANEL2` | `#232328` | Controles secundarios | confirmado |
| `BORDER` | `#2E2E35` | Separadores/bordes | confirmado |
| `TEXT` | `#E2E2E8` | Texto principal | confirmado |
| `TEXT_DIM` | `#5A5A6A` | Texto secundario | confirmado |

## 4. Pantalla registrada

### Ventana principal

- Proposito: cargar una imagen, procesarla y guardar resultado.
- Jerarquia principal: header, controles IA, visor de preview por modos y barra de estado.
- Componente dominante: visor con modos `Comparar`, `Antes`, `Despues` y `Split A/B`.
- Accion principal: `PROCESAR`.
- Acciones secundarias: `Refinar bordes` y `Guardar como PNG`.
- Decisiones confirmadas: tema oscuro compacto, controles en panel izquierdo, preview con tablero de transparencia, visor ancho para evitar recorte.
- Decision operativa confirmada: `u2net` es el modelo por defecto porque es el que mejor ha funcionado hasta ahora en las pruebas del usuario.
- Decision operativa confirmada: `birefnet-general` tambien funciono bien y queda como alternativa recomendada de precision.
- Decision operativa confirmada: `LANCZOS rapido` es el motor por defecto para iterar sin esperas; `Real-ESRGAN IA x4` queda como modo de maxima calidad.
- Decision visual/UX: `Descontaminar borde (despill)` y `Suavizar alfa fino` viven antes del upscale porque refinan el recorte automatico antes de ampliar.
- Decision visual/UX: la accion `PROCESAR` debe vivir en una barra inferior fija tipo action/prompt bar, inspirada en el diseño de referencia, con CTA amarillo siempre visible.
- Decision visual/UX: el panel izquierdo de configuracion debe tener scroll para que los controles no oculten la accion principal.

### Ventana Refinar bordes

- Proposito: corregir manualmente el canal alfa despues del recorte IA.
- Jerarquia principal: herramientas de pincel a la izquierda, lienzo grande a la derecha.
- Modos: borrar restos y recuperar borde.
- Acciones globales: suavizar, expandir, contraer, definir borde y limpiar islas.
- Decision confirmada: debe servir para perfeccionar bordes antes de guardar, no para reemplazar el modelo IA.

## 5. Elementos protegidos

| Elemento | Motivo | Estado |
|---|---|---|
| Preview antes/despues | Esencial para validar resultado | protegido |
| Modos de vista | Necesarios para inspeccionar antes/despues sin recorte | protegido |
| Refinar bordes | Permite perfeccionar el alfa manualmente | protegido |
| Bordes automaticos | Limpia halos y suaviza alfa antes del refinado manual | protegido |
| Selector de motor upscale | Distingue LANCZOS rapido de Real-ESRGAN IA real | protegido |
| Barra inferior de accion | Mantiene `PROCESAR`, guardar y refinado visibles | protegido |
| CTA amarillo de procesar | Accion principal adaptada del diseño de referencia | protegido |
| Tablero de transparencia | Comunica alfa real | protegido |
| Paleta oscura actual | Identidad visual inicial | protegido |

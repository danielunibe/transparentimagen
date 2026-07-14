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
- Accion secundaria: `Guardar como PNG`.
- Decisiones confirmadas: tema oscuro compacto, controles en panel izquierdo, preview con tablero de transparencia, visor ancho para evitar recorte.
- Decision operativa confirmada: `u2net` es el modelo por defecto porque es el que mejor ha funcionado hasta ahora en las pruebas del usuario.
- Decision operativa confirmada: `birefnet-general` tambien funciono bien y queda como alternativa recomendada de precision.

## 5. Elementos protegidos

| Elemento | Motivo | Estado |
|---|---|---|
| Preview antes/despues | Esencial para validar resultado | protegido |
| Modos de vista | Necesarios para inspeccionar antes/despues sin recorte | protegido |
| Tablero de transparencia | Comunica alfa real | protegido |
| Paleta oscura actual | Identidad visual inicial | protegido |

# DESIGN.md

## 1. Identidad visual del proyecto

- Nombre: Image Enhancer - Unova Games Studio.
- Proposito visual: herramienta local oscura, compacta y tecnica para procesamiento de imagenes.
- Sensacion buscada: utilitaria, clara, de estudio creativo.
- Nivel de acabado esperado: funcional premium liviano, con foco en inspeccion visual del recorte.

## 2. Principios de diseno

- Mantener interfaz de escritorio tipo estudio, sin recortar previews.
- Preservar una barra lateral de flujo, visor central y panel derecho de ajustes.
- Usar tablero de transparencia para que el usuario vea alfa real.
- No aplanar ni cambiar la identidad oscura sin autorizacion.

## 3. Tokens actuales

| Token | Valor | Uso | Estado |
|---|---|---|---|
| `ACCENT` | `#7C6AFF` | Acciones principales | confirmado |
| `ACCENT2` | `#5B4FCC` | Variante acento | confirmado |
| `CTA` | `#FDE400` | Accion principal y seleccion activa | confirmado |
| `CTA_TEXT` | `#201C00` | Texto sobre CTA amarillo | confirmado |
| `BG` | `#111113` | Fondo app | confirmado |
| `SIDEBAR_BG` | `#0E0E0E` | Barra lateral de flujo | confirmado |
| `TOPBAR_BG` | `#151515` | Barra superior | confirmado |
| `PANEL` | `#1C1C20` | Paneles | confirmado |
| `PANEL2` | `#232328` | Controles secundarios | confirmado |
| `BORDER` | `#2E2E35` | Separadores/bordes | confirmado |
| `TEXT` | `#E2E2E8` | Texto principal | confirmado |
| `TEXT_DIM` | `#5A5A6A` | Texto secundario | confirmado |

## 4. Pantalla registrada

### Ventana principal

- Proposito: cargar una imagen, procesarla y guardar resultado.
- Jerarquia principal: top app bar, barra lateral de flujo, visor central, inspector derecho, barra inferior de accion y barra de estado.
- Componente dominante: visor con modos `Comparar`, `Antes`, `Despues` y `Split A/B`.
- Accion principal: `Generate` / render final.
- Acciones secundarias: `Preview 25%`, `Refine Edge` y `Save PNG`.
- Decisiones confirmadas: tema oscuro tipo estudio, preview central con tablero de transparencia, inspector derecho de ajustes, barra lateral de flujo y visor ancho para evitar recorte.
- Decision operativa confirmada: `u2net` es el modelo por defecto porque es el que mejor ha funcionado hasta ahora en las pruebas del usuario.
- Decision operativa confirmada: `birefnet-general` tambien funciono bien y queda como alternativa recomendada de precision.
- Decision operativa confirmada: `LANCZOS rapido` es el motor por defecto para iterar sin esperas; `Real-ESRGAN IA x4` queda como modo de maxima calidad.
- Decision operativa confirmada: existen presets tipo Lupa (`High Fidelity`, `Portrait`, `Game Asset`, `Producto`, `Creative`) para aplicar configuraciones coherentes sin obligar al usuario a ajustar cada control manualmente.
- Decision operativa confirmada: `Portrait` puede activar `CodeFormer` como segundo pase de face recovery cuando el backend externo este disponible.
- Decision visual/UX: `Descontaminar borde (despill)` y `Suavizar alfa fino` viven antes del upscale porque refinan el recorte automatico antes de ampliar.
- Decision visual/UX: la accion `PROCESAR` debe vivir en una barra inferior fija tipo action/prompt bar, inspirada en el diseño de referencia, con CTA amarillo siempre visible.
- Decision visual/UX: el panel derecho de configuracion debe tener scroll para que los controles no oculten la accion principal.
- Decision visual/UX: el layout nuevo adapta el diseño de referencia a Tkinter con top bar, sidebar, workspace central, inspector y action bar inferior.
- Decision visual/UX: la composicion actual se readapta al HTML pegado de Olupa con top bar editorial, sidebar de workspace, action bar superior de libreria y prompt bar flotante inferior.
- Decision visual/UX: la direccion actual debe sentirse inspirada en LupaAI web para generacion/mejora de imagenes: hero central, prompt bar dominante, chips de modo visibles y panel tecnico secundario.
- Decision visual/UX: la implementacion debe sentirse nativa en Windows: tipografia `Segoe UI`, controles `ttk` compatibles con tema Windows y previews que se adapten al resize real del canvas.
- Decision visual/UX: el inspector derecho incorpora tarjetas `MODULOS IA` con estados visibles (`No instalado`, `Listo`, `Activo`, `Fallback`, `Error`) para activar capacidades progresivamente sin saturar el flujo principal.
- Decision visual/UX: `Preview 25%` vive en la barra inferior junto a `Generate` para separar iteracion rapida de render final.
- Decision visual/UX: la tarjeta `BiRefNet premium` incorpora comparacion `u2net / BiRefNet`, texto de uso y base visual para seleccion por objeto futura sin abrir todavia editor de cajas.
- Decision visual/UX: la comparacion de segmentacion se muestra en ventana separada y guardable para no contaminar el preview final ni el refinado manual.

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
| Selector de modo Lupa | Condensa presets de procesamiento por tipo de imagen | protegido |
| Barra inferior de accion | Mantiene `PROCESAR`, guardar y refinado visibles | protegido |
| CTA amarillo de procesar | Accion principal adaptada del diseño de referencia | protegido |
| Boton `Preview 25%` | Permite iterar sin ejecutar upscale completo | protegido |
| Tarjetas `MODULOS IA` | Base visual para activacion progresiva por familia | protegido |
| Comparacion `u2net / BiRefNet` | Decide segmentacion rapida o premium sin pisar el resultado final | protegido |
| Barra lateral de flujo | Ordena el proceso sin agregar navegacion falsa | protegido |
| Composicion estilo Olupa | Define la lectura visual principal del producto | protegido |
| Inspector derecho de ajustes | Agrupa controles sin quitar espacio al visor central | protegido |
| Tablero de transparencia | Comunica alfa real | protegido |
| Paleta oscura actual | Identidad visual inicial | protegido |

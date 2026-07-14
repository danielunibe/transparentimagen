# Plantillas ComfyUI

Estas plantillas sirven como punto de partida para la integracion externa de Image Enhancer con ComfyUI.

## Placeholders soportados

- `__COMFY_IMAGE__`
- `__COMFY_REF_IMAGE__`
- `__COMFY_CONTROL_IMAGE__`
- `__OUTPUT_PREFIX__`
- `__PROMPT__`
- `__NEGATIVE_PROMPT__`
- `__WIDTH__`
- `__HEIGHT__`

Y cualquier clave definida en `Workflow params JSON` del panel `COMFYUI`, por ejemplo:

- `steps` -> `__STEPS__`
- `cfg` -> `__CFG__`
- `denoise` -> `__DENOISE__`
- `seed` -> `__SEED__`
- `ipadapter_weight` -> `__IPADAPTER_WEIGHT__`
- `control_strength` -> `__CONTROL_STRENGTH__`

## Regla importante

Estas plantillas no meten Stable Diffusion dentro de la app. Solo describen workflows JSON para un ComfyUI local ya instalado por fuera.

## Siguiente uso recomendado

1. Abre esta carpeta.
2. Copia una plantilla.
3. Ajusta nombres de checkpoint/nodos segun tu instalacion real de ComfyUI.
4. Si el workflow usa IP-Adapter, carga una `Reference image` desde la app.
5. Si el workflow usa ControlNet, carga una `Control image` desde la app.
6. Ajusta `Workflow params JSON` segun las claves que espere tu grafo.
7. Selecciona el JSON resultante desde el panel `COMFYUI` de la app.
8. Ejecuta `--smoke-comfyui` o el boton `ComfyUI`.

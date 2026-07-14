# PBR Smart Folders

Una carpeta PBR se detecta localmente por señal de nombres de mapas.

Criterio actual:
- `complete`: base color + normal + roughness
- `partial`: al menos dos mapas reconocidos pero faltan básicos
- `texture_set`: texturas relacionadas con señal incompleta
- `unknown`: señal insuficiente

Limitaciones actuales:
- no hay shader PBR;
- no hay render 3D;
- no hay export directo a Unreal, Unity o Blender;
- no hay renombrado real de mapas;
- no hay generación de mapas faltantes.

Diagnóstico actual:
- scoring por target
- faltantes requeridos y opcionales
- mismatch de resolución si hay dimensiones disponibles
- recomendaciones honestas para Blender, Unreal y Unity

MVP operativo en Material Vault:
- score basado en `base color`, `normal`, `roughness`, `ao` y `metallic`
- warnings por duplicados y baja confianza
- errors honestos cuando falta `base color`
- reportes JSON metadata-only sin adjuntar bytes ni archivos

## Stability notes after Phase 35

- filename detection is helpful but not authoritative;
- two or more coherent map signals are required before treating a folder as PBR material;
- ambiguous folders should not disappear silently from Smart Folders review flows;
- no destructive normalization is performed in this phase.

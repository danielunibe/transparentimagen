# ARCHITECTURE.md

## 1. Proposito

Este documento registra la organizacion real del proyecto para evitar cambios de ubicacion innecesarios.

## 2. Estructura real

```txt
transparentimagen/
├─ AGENTS.md
├─ TECH_STACK.md
├─ ARCHITECTURE.md
├─ CODEX_GUARDRAILS.md
├─ DESIGN.md
└─ image_enhancer/
   └─ image_enhancer/
      ├─ image_enhancer.py
      ├─ requirements.txt
      ├─ requirements-build.txt
      ├─ instalar.bat
      ├─ iniciar.bat
      ├─ construir_exe.bat
      └─ README.md
```

## 3. Responsabilidades

| Zona | Responsabilidad | Que no debe contener |
|---|---|---|
| `image_enhancer.py` | App Tkinter, pipeline de imagen y smoke CLI | Reescrituras amplias no solicitadas |
| `requirements.txt` | Dependencias runtime | Dependencias de build o experimentales |
| `requirements-build.txt` | Dependencias para empaquetar | Runtime obligatorio |
| `.bat` | Entrada Windows para instalar, iniciar y construir | Logica compleja de aplicacion |
| `dist/` | Artefactos generados por PyInstaller | Codigo fuente |
| `build/` | Archivos temporales de PyInstaller | Codigo fuente |
| `%USERPROFILE%\.image_enhancer_models` | Cache externo de Real-ESRGAN ONNX | Codigo fuente o artefactos del repo |

## 4. Reglas anti-monolito

- El archivo principal ya supera 250 lineas; no modularizar en esta fase porque el usuario pidio no mover estructura.
- Si crece otra fase, separar primero helpers de imagen, UI y CLI.
- No mezclar nuevas funciones de batch masivo en la UI actual sin plan previo.
- Real-ESRGAN se integra como helper aislado dentro de `image_enhancer.py` por restriccion de no mover estructura.

## 5. Modulos protegidos

| Modulo | Motivo | Nivel |
|---|---|---|
| Flujo cargar/procesar/guardar | Es el flujo principal del producto | alto |
| Conversion PNG/JPG | Preserva transparencia o fondo blanco segun formato | alto |
| Stack Python 3.10 + CPU | Decision de compatibilidad local | medio |
| Cache externo de modelos IA | Evita inflar el EXE y mantiene build reproducible | medio |

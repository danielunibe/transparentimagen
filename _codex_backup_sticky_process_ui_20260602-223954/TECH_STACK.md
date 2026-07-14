# TECH_STACK.md

## 1. Resumen tecnico

- Tipo de proyecto: aplicacion local de escritorio para Windows.
- Framework/UI: Python `tkinter`.
- Lenguaje: Python 3.10.
- Runtime verificado: Python 3.10.11 64-bit en Windows.
- Procesamiento de imagen: Pillow.
- Remocion de fondo: `rembg[cpu]==2.0.69`.
- Limpieza de mascara: OpenCV (`cv2`) y NumPy, instalados como dependencias transitivas de `rembg`.
- Edicion manual de alfa: Pillow + Tkinter Canvas.
- Backend IA: `onnxruntime` CPU.
- Upscaling IA: Real-ESRGAN x4 ONNX descargado bajo demanda.
- Empaquetado: PyInstaller `onedir` + `windowed`.
- Package manager: `pip` dentro de `.venv` local.
- Persistencia: modelos descargados por `rembg` en `%USERPROFILE%\.u2net`.
- Persistencia: modelo Real-ESRGAN descargado en `%USERPROFILE%\.image_enhancer_models\real_esrgan_x4plus\v0.46.1`.
- Testing: smoke scripts CLI dentro de `image_enhancer.py`.

## 2. Comandos del proyecto

| Comando | Uso | Estado |
|---|---|---|
| `instalar.bat` | Crear `.venv` e instalar runtime | confirmado en plan |
| `iniciar.bat` | Ejecutar app con `.venv` si existe | confirmado en plan |
| `.venv\Scripts\python.exe image_enhancer.py --smoke` | Validacion runtime sin UI | confirmado en plan |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-rembg --model silueta` | Validacion real de modelo IA | confirmado en plan |
| `.venv\Scripts\python.exe image_enhancer.py --smoke-realesrgan` | Validacion real de Real-ESRGAN ONNX | confirmado |
| `construir_exe.bat` | Generar EXE distribuible | confirmado en plan |

## 3. Dependencias principales

| Dependencia | Uso | Se puede tocar | Notas |
|---|---|---|---|
| `rembg[cpu]==2.0.69` | Quitar fondo con IA | requiere permiso | Fijado por compatibilidad con Python 3.10 |
| `Pillow>=10,<13` | Abrir, convertir, escalar y guardar imagenes | requiere permiso | Mantener canal alfa |
| `numpy>=1.24,<3` | Despill, tiles Real-ESRGAN y mascara alfa | requiere permiso | Ahora es dependencia directa |
| `onnxruntime>=1.17,<2` | Ejecutar rembg y Real-ESRGAN ONNX | requiere permiso | Backend CPU confirmado |
| `opencv-python-headless` | Limpiar componentes pequenos de la mascara alfa | transitiva | No instalar directo salvo necesidad |
| `pyinstaller==6.20.0` | Build del EXE | requiere permiso | Solo dependencia de build |

## 4. Restricciones tecnicas

- No migrar a Python 3.11 sin autorizacion.
- No activar GPU en esta fase.
- No cambiar a otro framework UI sin autorizacion.
- No convertir a instalador MSI/NSIS sin una fase separada.
- No empaquetar modelos IA dentro del EXE salvo decision explicita.
- No presentar LANCZOS como IA; es modo rapido de interpolacion.
- Real-ESRGAN queda como modo IA real pero CPU puede ser lento en imagenes grandes.

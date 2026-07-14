@echo off
setlocal
cd /d "%~dp0"

if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" "image_enhancer.py"
) else (
    python "image_enhancer.py"
)

if errorlevel 1 (
    echo.
    echo  Error al iniciar. Ejecuta instalar.bat primero.
    if not defined IMAGE_ENHANCER_NO_PAUSE pause
)

@echo off
:: Lanza Image Enhancer
python "%~dp0image_enhancer.py"
if errorlevel 1 (
    echo.
    echo  Error al iniciar. Ejecuta instalar.bat primero.
    pause
)

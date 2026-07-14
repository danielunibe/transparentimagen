@echo off
:: ═══════════════════════════════════════════════════════
::   Image Enhancer — Setup Windows
::   Unova Games Studio
:: ═══════════════════════════════════════════════════════

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   IMAGE ENHANCER — Setup                 ║
echo  ║   Unova Games Studio                     ║
echo  ╚══════════════════════════════════════════╝
echo.

:: Verificar Python
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python no encontrado.
    echo  Descarga Python 3.10+ desde: https://python.org
    pause
    exit /b 1
)

echo  [1/3] Python encontrado...
python --version

echo.
echo  [2/3] Instalando dependencias...
pip install rembg Pillow

echo.
echo  [3/3] Instalacion completa.
echo.
echo  Para ejecutar el programa:
echo      python image_enhancer.py
echo.
echo  NOTA: La primera vez que uses "Remover fondo",
echo        el programa descargara el modelo de IA (~170 MB).
echo        Solo ocurre una vez.
echo.
pause

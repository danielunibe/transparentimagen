@echo off
setlocal
cd /d "%~dp0"

echo.
echo  ==========================================
echo    IMAGE ENHANCER - Build EXE
echo    Unova Games Studio
echo  ==========================================
echo.

if not exist ".venv\Scripts\python.exe" (
    echo  [INFO] No existe .venv. Ejecutando instalador runtime...
    call instalar.bat
    if errorlevel 1 exit /b 1
)

echo.
echo  [1/4] Instalando dependencias de build...
".venv\Scripts\python.exe" -m pip install -r requirements-build.txt
if errorlevel 1 (
    echo  [ERROR] No se pudieron instalar dependencias de build.
    if not defined IMAGE_ENHANCER_NO_PAUSE pause
    exit /b 1
)

echo.
echo  [2/4] Validando smoke runtime...
".venv\Scripts\python.exe" image_enhancer.py --smoke
if errorlevel 1 (
    echo  [ERROR] Smoke runtime fallo.
    if not defined IMAGE_ENHANCER_NO_PAUSE pause
    exit /b 1
)

echo.
echo  [3/4] Construyendo EXE onedir/windowed...
".venv\Scripts\python.exe" -m PyInstaller ^
    --noconfirm ^
    --clean ^
    --onedir ^
    --windowed ^
    --name "ImageEnhancer-Unova" ^
    --collect-all rembg ^
    --collect-all onnxruntime ^
    --collect-all pymatting ^
    --collect-all skimage ^
    --collect-all cv2 ^
    --hidden-import PIL._tkinter_finder ^
    image_enhancer.py
if errorlevel 1 (
    echo  [ERROR] PyInstaller fallo.
    if not defined IMAGE_ENHANCER_NO_PAUSE pause
    exit /b 1
)

echo.
echo  [4/4] Validando artefacto...
if not exist "dist\ImageEnhancer-Unova\ImageEnhancer-Unova.exe" (
    echo  [ERROR] No se encontro dist\ImageEnhancer-Unova\ImageEnhancer-Unova.exe
    if not defined IMAGE_ENHANCER_NO_PAUSE pause
    exit /b 1
)

"dist\ImageEnhancer-Unova\ImageEnhancer-Unova.exe" --smoke
if errorlevel 1 (
    echo  [ERROR] Smoke del EXE fallo.
    if not defined IMAGE_ENHANCER_NO_PAUSE pause
    exit /b 1
)

echo.
echo  Build completado:
echo      dist\ImageEnhancer-Unova\ImageEnhancer-Unova.exe
echo.
if not defined IMAGE_ENHANCER_NO_PAUSE pause

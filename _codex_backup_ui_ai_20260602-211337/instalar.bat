@echo off
setlocal
cd /d "%~dp0"

echo.
echo  ==========================================
echo    IMAGE ENHANCER - Setup Windows
echo    Unova Games Studio
echo  ==========================================
echo.

:: Verificar Python
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python no encontrado.
    echo  Descarga Python 3.10+ desde: https://python.org
    if not defined IMAGE_ENHANCER_NO_PAUSE pause
    exit /b 1
)

echo  [1/3] Python encontrado...
python --version

echo.
echo  [2/3] Creando entorno virtual local...
if not exist ".venv\Scripts\python.exe" (
    python -m venv .venv
    if errorlevel 1 (
        echo  [ERROR] No se pudo crear .venv.
        if not defined IMAGE_ENHANCER_NO_PAUSE pause
        exit /b 1
    )
)

echo.
echo  [3/3] Instalando dependencias runtime...
".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 (
    echo  [ERROR] No se pudo actualizar pip.
    if not defined IMAGE_ENHANCER_NO_PAUSE pause
    exit /b 1
)

".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 (
    echo  [ERROR] No se pudieron instalar dependencias.
    if not defined IMAGE_ENHANCER_NO_PAUSE pause
    exit /b 1
)

echo.
echo  Instalacion completa.
echo.
echo  Para ejecutar el programa:
echo      iniciar.bat
echo.
echo  NOTA: La primera vez que uses "Remover fondo",
echo        el programa descargara el modelo de IA en %%USERPROFILE%%\.u2net.
echo        Solo ocurre una vez.
echo.
if not defined IMAGE_ENHANCER_NO_PAUSE pause

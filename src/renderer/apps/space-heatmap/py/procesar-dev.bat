@echo off
chcp 65001 >nul
echo ========================================
echo Procesando StowMap Data - MODO DEV
echo ========================================
echo.
echo Este script cambia temporalmente MODO_DEV a True
echo para usar archivos de ejemplo.
echo.

cd /d "%~dp0"

REM Verificar si Python está disponible
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python no encontrado. Por favor instala Python.
    pause
    exit /b 1
)

REM Crear una copia temporal del script con MODO_DEV = True
powershell -Command "(Get-Content 'Procesar_StowMap.py') -replace 'MODO_DEV = False', 'MODO_DEV = True' -replace 'MODO_DEV = True', 'MODO_DEV = True' | Set-Content 'Procesar_StowMap_temp.py'"

echo Ejecutando en modo DEV...
echo.

python Procesar_StowMap_temp.py

REM Eliminar archivo temporal
if exist Procesar_StowMap_temp.py del Procesar_StowMap_temp.py

if errorlevel 1 (
    echo.
    echo [ERROR] El procesamiento falló. Revisa los errores arriba.
) else (
    echo.
    echo [EXITO] Procesamiento completado correctamente.
)

echo.
echo ========================================
pause


@echo off
chcp 65001 >nul
echo ========================================
echo Procesando StowMap Data
echo ========================================
echo.

cd /d "%~dp0"

REM Verificar si Python está disponible
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python no encontrado. Por favor instala Python.
    pause
    exit /b 1
)

echo Ejecutando Procesar_StowMap.py...
echo.

python Procesar_StowMap.py

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

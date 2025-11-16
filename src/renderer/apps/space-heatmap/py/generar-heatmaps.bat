@echo off
REM Script para generar heatmaps SVG desde el CSV procesado
REM Ejecuta Generar_Heatmaps.py con la configuración correcta

echo ========================================
echo Generador de Heatmaps SVG
echo ========================================
echo.

REM Cambiar al directorio del script
cd /d "%~dp0"

REM Verificar que Python esté disponible
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python no encontrado. Asegurate de tener Python instalado.
    pause
    exit /b 1
)

echo Ejecutando Generar_Heatmaps.py...
echo.

REM Ejecutar el script Python
python Generar_Heatmaps.py

REM Verificar el resultado
if errorlevel 1 (
    echo.
    echo ERROR: El script falló. Revisa los mensajes de error arriba.
    pause
    exit /b 1
) else (
    echo.
    echo ========================================
    echo Heatmaps generados exitosamente!
    echo ========================================
    echo.
    echo Los archivos SVG se encuentran en:
    echo Ejemplos\data\space-heatmap\heatmaps\
    echo.
)

pause


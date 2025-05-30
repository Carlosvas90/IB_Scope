@echo off
echo ==========================================
echo VERIFICADOR DE LOGS DE ACTUALIZACION
echo ==========================================
echo.

set "LOG_DIR=%TEMP%\app-updates"

echo Buscando logs en: %LOG_DIR%
echo.

if not exist "%LOG_DIR%" (
    echo ERROR: No existe el directorio de logs
    echo Creando directorio...
    mkdir "%LOG_DIR%"
    pause
    exit /b 1
)

echo Archivos encontrados:
echo ---------------------
dir /B "%LOG_DIR%\*.log" 2>nul

if errorlevel 1 (
    echo.
    echo No se encontraron archivos de log
    echo.
) else (
    echo.
    echo ---------------------
    echo.
    
    :: Buscar el log más reciente
    for /f "tokens=*" %%i in ('dir /B /O-D "%LOG_DIR%\update_*.log" 2^>nul') do (
        set "LATEST_LOG=%LOG_DIR%\%%i"
        goto found
    )
)

:found
if defined LATEST_LOG (
    echo Log mas reciente: %LATEST_LOG%
    echo.
    echo Contenido del log:
    echo ==========================================
    type "%LATEST_LOG%"
    echo ==========================================
) else (
    echo No se encontro ningun log de actualizacion
)

echo.
echo Presiona cualquier tecla para abrir la carpeta de logs...
pause > nul

explorer "%LOG_DIR%" 
@echo off
echo ==========================================
echo DIAGNOSTICO DEL SISTEMA DE ACTUALIZACION
echo ==========================================
echo.

set "TEMP_DIR=%TEMP%\app-updates"
set "DESKTOP=%USERPROFILE%\Desktop"

echo 1. Verificando directorio temporal...
echo    Directorio: %TEMP_DIR%
echo.

if exist "%TEMP_DIR%" (
    echo    [OK] El directorio existe
    echo.
    echo    Contenido del directorio:
    echo    ------------------------
    dir /B "%TEMP_DIR%"
    echo    ------------------------
) else (
    echo    [X] El directorio NO existe
)

echo.
echo 2. Buscando archivos de actualizacion...
echo.

echo    Scripts batch (.bat):
dir /B "%TEMP_DIR%\*.bat" 2>nul || echo    - No se encontraron

echo.
echo    Scripts VBS (.vbs):  
dir /B "%TEMP_DIR%\*.vbs" 2>nul || echo    - No se encontraron

echo.
echo    Scripts PowerShell (.ps1):
dir /B "%TEMP_DIR%\*.ps1" 2>nul || echo    - No se encontraron

echo.
echo    Logs (.log):
dir /B "%TEMP_DIR%\*.log" 2>nul || echo    - No se encontraron

echo.
echo    Ejecutables (.exe):
dir /B "%TEMP_DIR%\*.exe" 2>nul || echo    - No se encontraron

echo.
echo 3. Verificando archivo en el escritorio...
if exist "%DESKTOP%\actualizar-inbound-scope.bat" (
    echo    [OK] Se encontro script en el escritorio
    echo    Ubicacion: %DESKTOP%\actualizar-inbound-scope.bat
) else (
    echo    [X] No se encontro script en el escritorio
)

echo.
echo 4. Mostrar el script mas reciente (si existe)...
echo.

:: Buscar el .bat más reciente
for /f "tokens=*" %%i in ('dir /B /O-D "%TEMP_DIR%\update_*.bat" 2^>nul') do (
    set "LATEST_BAT=%TEMP_DIR%\%%i"
    goto show_script
)

echo    No se encontraron scripts de actualizacion
goto end

:show_script
echo    Script encontrado: %LATEST_BAT%
echo    ----------------------------------------
echo    CONTENIDO:
echo    ----------------------------------------
type "%LATEST_BAT%"
echo    ----------------------------------------

:end
echo.
echo Presiona cualquier tecla para abrir la carpeta temporal...
pause > nul

if exist "%TEMP_DIR%" (
    explorer "%TEMP_DIR%"
) else (
    echo Creando directorio...
    mkdir "%TEMP_DIR%"
    explorer "%TEMP_DIR%"
) 
@echo off
echo ==========================================
echo PRUEBA MANUAL DE ACTUALIZACION
echo ==========================================
echo.

set "OLD_EXE=C:\Users\carlo\Downloads\Inbound Scope.exe"
set "NEW_EXE=%TEMP%\app-updates\Inbound Scope.exe"

echo IMPORTANTE: Edita este archivo y cambia OLD_EXE a la ruta real de tu aplicacion
echo.
echo Ruta actual configurada:
echo OLD_EXE = %OLD_EXE%
echo NEW_EXE = %NEW_EXE%
echo.

pause

if not exist "%NEW_EXE%" (
    echo ERROR: No se encuentra el nuevo ejecutable en %NEW_EXE%
    pause
    exit /b 1
)

echo.
echo Paso 1: Esperando 5 segundos...
timeout /t 5

echo.
echo Paso 2: Renombrando ejecutable actual...
move /Y "%OLD_EXE%" "%OLD_EXE%.old"

if exist "%OLD_EXE%" (
    echo ERROR: No se pudo renombrar el ejecutable
    pause
    exit /b 1
)

echo.
echo Paso 3: Copiando nuevo ejecutable...
copy /Y "%NEW_EXE%" "%OLD_EXE%"

if not exist "%OLD_EXE%" (
    echo ERROR: No se pudo copiar el nuevo ejecutable
    echo Restaurando version anterior...
    move /Y "%OLD_EXE%.old" "%OLD_EXE%"
    pause
    exit /b 1
)

echo.
echo Paso 4: Eliminando backup...
del /F /Q "%OLD_EXE%.old"

echo.
echo Paso 5: Iniciando aplicacion...
start "" "%OLD_EXE%"

echo.
echo ==========================================
echo ACTUALIZACION COMPLETADA
echo ==========================================
echo.

pause 
@echo off
echo.
echo ==== PRUEBA DE ACTUALIZACION MANUAL ====
echo.

set "OLD_EXE=C:\ruta\a\tu\Inbound Scope.exe"
set "NEW_EXE=%TEMP%\app-updates\Inbound Scope.exe"

echo Debes editar este archivo y cambiar OLD_EXE a la ruta de tu aplicacion
echo.
echo Paths configurados:
echo Ejecutable actual: %OLD_EXE%
echo Nuevo ejecutable: %NEW_EXE%
echo.

pause

echo.
echo Esperando 5 segundos para asegurar que la app esta cerrada...
timeout /t 5

echo.
echo Renombrando ejecutable actual...
move /Y "%OLD_EXE%" "%OLD_EXE%.old"

echo.
echo Copiando nuevo ejecutable...
copy /Y "%NEW_EXE%" "%OLD_EXE%"

echo.
echo Iniciando aplicacion actualizada...
start "" "%OLD_EXE%"

echo.
echo Proceso completado!
pause 
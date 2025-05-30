@echo off
:: Script de prueba para verificar el sistema de logs

set "TEST_LOG=%TEMP%\app-updates\test-update.log"

:: Crear directorio si no existe
if not exist "%TEMP%\app-updates" mkdir "%TEMP%\app-updates"

echo ========================================= > "%TEST_LOG%"
echo PRUEBA DE LOG - %date% %time% >> "%TEST_LOG%"
echo ========================================= >> "%TEST_LOG%"
echo. >> "%TEST_LOG%"

echo Este es un log de prueba >> "%TEST_LOG%"
echo Si puedes ver este archivo, el sistema de logs funciona >> "%TEST_LOG%"
echo. >> "%TEST_LOG%"

echo Ubicacion del log: %TEST_LOG% >> "%TEST_LOG%"
echo. >> "%TEST_LOG%"

echo ========================================= >> "%TEST_LOG%"
echo FIN DE PRUEBA - %date% %time% >> "%TEST_LOG%"
echo ========================================= >> "%TEST_LOG%"

echo.
echo Log de prueba creado en:
echo %TEST_LOG%
echo.
echo Presiona cualquier tecla para abrir la carpeta de logs...
pause > nul

explorer "%TEMP%\app-updates" 
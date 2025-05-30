@echo off
chcp 65001 > nul
color 0A
title Actualización Manual de Inbound Scope

echo ╔══════════════════════════════════════════════════════════════╗
echo ║           ACTUALIZACION MANUAL DE INBOUND SCOPE              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Configurar rutas
set "REAL_EXE=C:\Users\carlo\Downloads\Inbound Scope.exe"
set "NEW_EXE=C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\updates\Inbound Scope.exe"
set "BACKUP_EXE=%REAL_EXE%.backup"
set "LOG_FILE=%TEMP%\app-updates\manual_update_%date:~6,4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%.log"

:: Crear directorio de logs
if not exist "%TEMP%\app-updates" mkdir "%TEMP%\app-updates"

echo INFORMACION DE LA ACTUALIZACION:
echo ════════════════════════════════════════
echo Ejecutable actual:  %REAL_EXE%
echo Nueva version:      %NEW_EXE%
echo Archivo backup:     %BACKUP_EXE%
echo Log:               %LOG_FILE%
echo ════════════════════════════════════════
echo.

:: Verificar archivos
echo VERIFICANDO ARCHIVOS...
echo.

if not exist "%REAL_EXE%" (
    color 0C
    echo [ERROR] No se encontró el ejecutable actual en:
    echo         %REAL_EXE%
    echo.
    echo         Verifique la ruta e intente de nuevo.
    goto error
)
echo [✓] Ejecutable actual encontrado

if not exist "%NEW_EXE%" (
    color 0C
    echo [ERROR] No se encontró la nueva versión en:
    echo         %NEW_EXE%
    echo.
    echo         Verifique que el archivo de actualización existe.
    goto error
)
echo [✓] Nueva versión encontrada
echo.

:: Verificar si la app está ejecutándose
echo VERIFICANDO PROCESOS...
tasklist /FI "IMAGENAME eq Inbound Scope.exe" 2>NUL | find /I /N "Inbound Scope.exe" >NUL
if "%ERRORLEVEL%"=="0" (
    echo [!] Inbound Scope está ejecutándose
    echo.
    echo Por favor, cierre la aplicación y presione cualquier tecla para continuar...
    pause > nul
    
    :: Verificar de nuevo
    tasklist /FI "IMAGENAME eq Inbound Scope.exe" 2>NUL | find /I /N "Inbound Scope.exe" >NUL
    if "%ERRORLEVEL%"=="0" (
        echo.
        echo [!] La aplicación sigue ejecutándose. ¿Desea cerrarla automáticamente? (S/N)
        choice /C SN /N
        if errorlevel 2 goto cancel
        echo Cerrando Inbound Scope...
        taskkill /F /IM "Inbound Scope.exe" > nul 2>&1
        timeout /t 2 /nobreak > nul
    )
) else (
    echo [✓] Inbound Scope no está ejecutándose
)
echo.

:: Confirmar actualización
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    ¿CONFIRMAR ACTUALIZACION?                 ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║  Se actualizará Inbound Scope a la versión 1.0.7           ║
echo ║  Se creará un backup de la versión actual                   ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Presione S para continuar o N para cancelar...
choice /C SN /N
if errorlevel 2 goto cancel

:: Iniciar log
echo ========================================== > "%LOG_FILE%"
echo ACTUALIZACION MANUAL INICIADA >> "%LOG_FILE%"
echo Fecha: %date% %time% >> "%LOG_FILE%"
echo ========================================== >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

:: Proceso de actualización
echo.
echo INICIANDO ACTUALIZACION...
echo ════════════════════════════════════════

:: Paso 1: Crear backup
echo.
echo [1/4] Creando backup del ejecutable actual...
echo [1/4] Creando backup... >> "%LOG_FILE%"
if exist "%BACKUP_EXE%" del /F /Q "%BACKUP_EXE%" > nul 2>&1
copy /Y "%REAL_EXE%" "%BACKUP_EXE%" > nul 2>&1
if exist "%BACKUP_EXE%" (
    echo       [✓] Backup creado exitosamente
    echo       Backup creado: %BACKUP_EXE% >> "%LOG_FILE%"
) else (
    echo       [X] Error al crear backup
    echo       ERROR: No se pudo crear backup >> "%LOG_FILE%"
    goto restore
)

:: Paso 2: Eliminar ejecutable actual
echo.
echo [2/4] Eliminando versión anterior...
echo [2/4] Eliminando version anterior... >> "%LOG_FILE%"
del /F /Q "%REAL_EXE%" > nul 2>&1
if exist "%REAL_EXE%" (
    echo       [X] Error al eliminar versión anterior
    echo       ERROR: No se pudo eliminar version anterior >> "%LOG_FILE%"
    timeout /t 3 /nobreak > nul
    :: Intentar de nuevo
    del /F /Q "%REAL_EXE%" > nul 2>&1
    if exist "%REAL_EXE%" goto restore
)
echo       [✓] Versión anterior eliminada
echo       Version anterior eliminada >> "%LOG_FILE%"

:: Paso 3: Copiar nueva versión
echo.
echo [3/4] Instalando nueva versión...
echo [3/4] Instalando nueva version... >> "%LOG_FILE%"
copy /Y "%NEW_EXE%" "%REAL_EXE%" > nul 2>&1
if exist "%REAL_EXE%" (
    echo       [✓] Nueva versión instalada exitosamente
    echo       Nueva version instalada: %REAL_EXE% >> "%LOG_FILE%"
) else (
    echo       [X] Error al instalar nueva versión
    echo       ERROR: No se pudo instalar nueva version >> "%LOG_FILE%"
    goto restore
)

:: Paso 4: Limpiar
echo.
echo [4/4] Limpiando archivos temporales...
echo [4/4] Limpiando archivos temporales... >> "%LOG_FILE%"
if exist "%BACKUP_EXE%" (
    del /F /Q "%BACKUP_EXE%" > nul 2>&1
    echo       [✓] Archivos temporales eliminados
)

:: Actualización completada
echo.
echo. >> "%LOG_FILE%"
echo ========================================== >> "%LOG_FILE%"
echo ACTUALIZACION COMPLETADA EXITOSAMENTE >> "%LOG_FILE%"
echo Fecha: %date% %time% >> "%LOG_FILE%"
echo ========================================== >> "%LOG_FILE%"

color 0A
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║              ¡ACTUALIZACION COMPLETADA CON EXITO!            ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo ¿Desea iniciar Inbound Scope ahora? (S/N)
choice /C SN /N
if errorlevel 2 goto end

echo.
echo Iniciando Inbound Scope v1.0.7...
start "" "%REAL_EXE%"
goto end

:restore
color 0E
echo.
echo RESTAURANDO VERSION ANTERIOR...
echo RESTAURANDO VERSION ANTERIOR... >> "%LOG_FILE%"
if exist "%BACKUP_EXE%" (
    copy /Y "%BACKUP_EXE%" "%REAL_EXE%" > nul 2>&1
    del /F /Q "%BACKUP_EXE%" > nul 2>&1
    echo [✓] Version anterior restaurada
    echo Version anterior restaurada >> "%LOG_FILE%"
) else (
    echo [X] No se pudo restaurar la version anterior
    echo ERROR: No se pudo restaurar >> "%LOG_FILE%"
)
goto error

:cancel
color 0E
echo.
echo Actualización cancelada por el usuario.
goto end

:error
echo. >> "%LOG_FILE%"
echo ========================================== >> "%LOG_FILE%"
echo ERROR EN LA ACTUALIZACION >> "%LOG_FILE%"
echo Fecha: %date% %time% >> "%LOG_FILE%"
echo ========================================== >> "%LOG_FILE%"
color 0C
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    ERROR EN LA ACTUALIZACION                 ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo Ver log en: %LOG_FILE%

:end
echo.
echo Presione cualquier tecla para salir...
pause > nul
exit 
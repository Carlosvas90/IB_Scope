@echo off
chcp 65001 > nul
echo ==========================================
echo DIAGNOSTICO DE UBICACION DE INBOUND SCOPE
echo ==========================================
echo.

echo 1. Buscando ejecutable en ubicaciones comunes...
echo.

:: Escritorio
set "DESKTOP=%USERPROFILE%\Desktop"
if exist "%DESKTOP%\Inbound Scope.exe" (
    echo    [✓] ENCONTRADO en Escritorio:
    echo        %DESKTOP%\Inbound Scope.exe
    for %%F in ("%DESKTOP%\Inbound Scope.exe") do echo        Tamaño: %%~zF bytes
    for %%F in ("%DESKTOP%\Inbound Scope.exe") do echo        Fecha: %%~tF
) else (
    echo    [X] No encontrado en Escritorio
)

echo.

:: Descargas
set "DOWNLOADS=%USERPROFILE%\Downloads"
if exist "%DOWNLOADS%\Inbound Scope.exe" (
    echo    [✓] ENCONTRADO en Descargas:
    echo        %DOWNLOADS%\Inbound Scope.exe
    for %%F in ("%DOWNLOADS%\Inbound Scope.exe") do echo        Tamaño: %%~zF bytes
    for %%F in ("%DOWNLOADS%\Inbound Scope.exe") do echo        Fecha: %%~tF
) else (
    echo    [X] No encontrado en Descargas
)

echo.

:: Carpeta de proyecto
set "PROJECT=C:\Users\carlo\Downloads\Inbound-Scope"
if exist "%PROJECT%\Inbound Scope.exe" (
    echo    [✓] ENCONTRADO en Carpeta de Proyecto:
    echo        %PROJECT%\Inbound Scope.exe
    for %%F in ("%PROJECT%\Inbound Scope.exe") do echo        Tamaño: %%~zF bytes
    for %%F in ("%PROJECT%\Inbound Scope.exe") do echo        Fecha: %%~tF
) else (
    echo    [X] No encontrado en Carpeta de Proyecto
)

echo.

:: Program Files
if exist "C:\Program Files\Inbound Scope\Inbound Scope.exe" (
    echo    [✓] ENCONTRADO en Program Files:
    echo        C:\Program Files\Inbound Scope\Inbound Scope.exe
    for %%F in ("C:\Program Files\Inbound Scope\Inbound Scope.exe") do echo        Tamaño: %%~zF bytes
    for %%F in ("C:\Program Files\Inbound Scope\Inbound Scope.exe") do echo        Fecha: %%~tF
) else (
    echo    [X] No encontrado en Program Files
)

echo.
echo 2. Buscando otros archivos de Inbound Scope...
echo.

:: Buscar en todo el directorio de Downloads
echo    Buscando en Downloads...
dir /B /S "%DOWNLOADS%\*Inbound*Scope*.exe" 2>nul
if %ERRORLEVEL% NEQ 0 echo    - No se encontraron archivos

echo.
echo 3. Verificando procesos en ejecución...
echo.

tasklist /FI "IMAGENAME eq Inbound Scope.exe" /FO LIST 2>nul | find "Nombre de imagen:"
if %ERRORLEVEL% NEQ 0 (
    echo    [X] Inbound Scope NO está ejecutándose
) else (
    echo    [✓] Inbound Scope ESTÁ ejecutándose
    echo.
    echo    Información del proceso:
    wmic process where "name='Inbound Scope.exe'" get ProcessId,ExecutablePath,CommandLine /format:list 2>nul
)

echo.
echo 4. Ubicaciones temporales...
echo.

set "TEMP_DIR=%TEMP%"
echo    Buscando en carpetas temporales...
dir /B /S "%TEMP_DIR%\*\Inbound Scope.exe" 2>nul | head -5
if %ERRORLEVEL% NEQ 0 echo    - No se encontraron en carpetas temporales

echo.
echo ==========================================
echo RECOMENDACION:
echo ==========================================
echo.
echo Para que las actualizaciones funcionen correctamente,
echo ejecuta siempre la aplicación desde una ubicación fija como:
echo - Escritorio
echo - Carpeta de Descargas
echo - Carpeta de instalación en Program Files
echo.
echo NO ejecutes desde archivos ZIP o carpetas temporales.
echo.
pause 
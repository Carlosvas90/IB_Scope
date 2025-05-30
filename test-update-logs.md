# 📋 Guía de Revisión de Logs - Sistema de Actualización

## 🔍 Dónde Encontrar los Logs

### 1. **Carpeta de logs de actualización**

```
%TEMP%\app-updates\
```

Busca archivos con el patrón: `update_[timestamp].log`

Ejemplo: `update_1748615593629.log`

## 📝 Qué Debería Contener un Log Exitoso

```
=========================================
INICIANDO ACTUALIZACION - [fecha] [hora]
=========================================

Ejecutable actual: "C:\...\Inbound Scope.exe"
Nuevo ejecutable: "C:\...\app-updates\Inbound Scope.exe"

Esperando que se cierre Inbound Scope.exe...
La aplicacion sigue abierta, esperando...
Aplicacion cerrada.

Esperando que se liberen los archivos...
Renombrando ejecutable actual...
Copiando nuevo ejecutable...
Actualizacion completada exitosamente

Reiniciando aplicacion...

Limpiando archivos temporales...

=========================================
PROCESO FINALIZADO - [fecha] [hora]
=========================================
```

## ❌ Problemas Comunes y Soluciones

### **1. No se genera el archivo .log**

**Posibles causas:**

- El script no se está ejecutando
- No hay permisos de escritura en %TEMP%

**Solución:**

1. Ejecutar la app como administrador
2. Verificar que la carpeta `%TEMP%\app-updates\` existe y tiene permisos de escritura

### **2. El log muestra "ERROR: No se pudo renombrar el ejecutable actual"**

**Causa:** El archivo está bloqueado por Windows o antivirus

**Solución:**

1. Desactivar temporalmente el antivirus
2. Ejecutar como administrador
3. Cerrar todas las instancias de la aplicación desde el Task Manager

### **3. La aplicación no se reinicia**

**Posibles causas:**

- El comando `start` no funcionó
- El path tiene caracteres especiales

**Solución:**
Reiniciar manualmente desde la ubicación original

## 🛠️ Script de Verificación Manual

Si necesitas probar el proceso manualmente, crea este archivo `test-update.cmd`:

```batch
@echo off
set "OLD_EXE=C:\Path\To\Inbound Scope.exe"
set "NEW_EXE=C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\updates\Inbound Scope.exe"

echo Probando actualización...
echo.

:: Verificar que el nuevo archivo existe
if not exist "%NEW_EXE%" (
    echo ERROR: No se encuentra el nuevo ejecutable
    pause
    exit /b 1
)

:: Intentar renombrar
echo Renombrando %OLD_EXE%...
move /Y "%OLD_EXE%" "%OLD_EXE%.old"

if exist "%OLD_EXE%" (
    echo ERROR: No se pudo renombrar
    pause
    exit /b 1
)

:: Copiar nuevo
echo Copiando nuevo ejecutable...
copy /Y "%NEW_EXE%" "%OLD_EXE%"

if exist "%OLD_EXE%" (
    echo EXITO: Actualización completada
    del /F /Q "%OLD_EXE%.old"
) else (
    echo ERROR: No se pudo copiar
    move /Y "%OLD_EXE%.old" "%OLD_EXE%"
)

pause
```

## 📊 Checklist de Depuración

- [ ] Verificar que existe `%TEMP%\app-updates\update_*.cmd`
- [ ] Verificar que existe `%TEMP%\app-updates\update_*.log`
- [ ] Leer el contenido del .log para ver dónde falló
- [ ] Verificar permisos en la carpeta de instalación
- [ ] Verificar que el antivirus no está bloqueando
- [ ] Ejecutar el .cmd manualmente para ver errores

## 💡 Comando para Ver los Logs

En PowerShell:

```powershell
# Ver el último log de actualización
Get-Content (Get-ChildItem "$env:TEMP\app-updates\update_*.log" | Sort-Object LastWriteTime -Descending | Select-Object -First 1).FullName
```

En CMD:

```batch
# Abrir la carpeta de logs
explorer %TEMP%\app-updates\
```

## 🔧 Si Todo Falla

1. **Actualización Manual:**

   - Cerrar la aplicación
   - Renombrar manualmente `Inbound Scope.exe` a `Inbound Scope.exe.old`
   - Copiar el nuevo `Inbound Scope.exe` desde la carpeta de updates
   - Ejecutar la nueva versión

2. **Limpiar y Reintentar:**

   ```batch
   :: Limpiar archivos temporales
   del /F /Q "%TEMP%\app-updates\*.*"

   :: Eliminar lock file si existe
   del /F /Q "%TEMP%\app-updates\update-in-progress.lock"
   ```

3. **Verificar la versión actual:**
   - Click derecho en `Inbound Scope.exe`
   - Propiedades > Detalles
   - Ver "Versión del archivo"

# 🚀 Guía de Prueba del Sistema de Actualización Real

## 📋 Configuración Actual

Tu archivo `config/update-config.json` tiene configuradas estas rutas:

```json
{
  "updatePaths": [
    "\\\\ant\\dept-eu\\VLC1\\Public\\Apps_Tools\\chuecc\\IB_Scope\\updates\\",
    "C:\\Users\\carlo\\Downloads\\0-Proyecto_IB_Scope\\Analisis\\updates\\"
  ],
  "currentVersion": "1.0.6",
  "autoCheck": true,
  "updateTimeout": 10000
}
```

## 🔧 Preparación para Prueba Real

### 1. **Preparar la carpeta de actualizaciones**

En la carpeta: `C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\updates\`

Crear el archivo `version.json`:

```json
{
  "version": "1.0.7",
  "filename": "Inbound Scope.exe",
  "changelog": "✨ Nueva versión 1.0.7:\n• Sistema de actualización mejorado\n• Corrección de bugs en los botones\n• Mejor manejo de errores\n• Progreso de descarga real"
}
```

### 2. **Colocar el ejecutable**

Copiar el archivo `Inbound Scope.exe` (versión 1.0.7) a la misma carpeta de updates.

### 3. **Ejecutar la aplicación**

```bash
# Si estás en desarrollo
npm start

# Si estás probando el ejecutable compilado
"Inbound Scope.exe"
```

## ✅ Checklist de Verificación

### **Fase 1: Detección**

- [x] La aplicación detecta automáticamente la actualización al iniciar
- [x] Aparece la notificación de actualización
- [x] Se muestra la versión correcta (1.0.7)
- [x] Se muestra el changelog

### **Fase 2: Interacción**

- [x] El botón "Más tarde" cierra la notificación
- [x] El botón "Actualizar ahora" está habilitado
- [x] El botón "X" cierra la notificación (si no es obligatoria)

### **Fase 3: Descarga**

- [x] Al hacer click en "Actualizar ahora" se deshabilita el botón
- [x] Aparece la barra de progreso
- [x] El progreso muestra porcentaje real de descarga
- [x] Se muestra el mensaje de información sobre el reinicio

### **Fase 4: Instalación**

- [x] Al completar la descarga aparece "Instalando actualización..."
- [x] Aparece el mensaje "NO CIERRE LA APLICACIÓN"
- [x] La aplicación se cierra automáticamente
- [ ] La aplicación se reinicia con la nueva versión

### **Fase 5: Verificación**

- [ ] Al reiniciar muestra versión 1.0.7
- [ ] No aparece más la notificación de actualización
- [ ] Los cambios persisten al cerrar y abrir de nuevo

## 🐛 Troubleshooting

### **Si no detecta la actualización:**

1. Verificar que existe el archivo:

   - `C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\updates\version.json`
   - `C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\updates\Inbound Scope.exe`

2. Verificar el contenido de `version.json`

3. Revisar la consola para errores de acceso a la carpeta

### **Si los botones no funcionan:**

1. Abrir la consola (F12)
2. Buscar errores JavaScript
3. Verificar que se vean los logs:
   ```
   [UpdateManager] Click en botón actualizar
   ```

### **Si falla la descarga:**

1. Verificar permisos de lectura en la carpeta de updates
2. Verificar que el archivo existe y es accesible
3. Revisar logs en `%TEMP%\app-updates\`

## 💡 Tips

- **Para forzar la detección**: En la consola ejecutar:

  ```javascript
  window.api.checkForUpdates().then(console.log);
  ```

- **Para simular sin cerrar la app**: Descomentar el script de prueba en Sidebar.html

- **Para ver el estado actual**:
  ```javascript
  window.api.getUpdateConfig().then(console.log);
  ```

## 📝 Logs Importantes

Durante el proceso deberías ver en consola:

```
[UpdateService] Verificando updates en rutas: [...]
[UpdateService] Probando ruta: C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\updates\
[UpdateService] Versión remota encontrada: 1.0.7
[UpdateService] Versión actual: 1.0.6
[UpdateService] ¡Update disponible!
[UpdateManager] Update disponible: {...}
[UpdateManager] Click en botón actualizar
[UpdateHandler] Descargando update...
[UpdateService] Copiando update desde: C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\updates\Inbound Scope.exe
[UpdateService] Update copiado exitosamente
[UpdateService] Instalando update...
[UpdateService] Proceso de actualización iniciado. Cerrando aplicación...
```

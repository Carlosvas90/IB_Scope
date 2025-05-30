# 🧪 Guía de Prueba del Sistema de Actualización Mejorado

## 📋 Preparación

### 1. Compilar dos versiones de la aplicación

#### Versión Actual (1.0.6)

```bash
npm run build
# Renombrar el archivo generado a: Inbound Scope v1.0.6.exe
```

#### Versión Nueva (1.0.7)

1. Editar `package.json` y cambiar version a `"1.0.7"`
2. Editar `config/update-config.json` y cambiar currentVersion a `"1.0.7"`
3. Compilar:

```bash
npm run build
# Renombrar el archivo generado a: Inbound Scope v1.0.7.exe
```

### 2. Preparar carpeta de actualizaciones

Crear estructura:

```
C:\Users\carlo\Downloads\0-Proyecto_IB_Scope\Analisis\updates\
├── version.json
└── Inbound Scope v1.0.7.exe
```

Contenido de `version.json`:

```json
{
  "version": "1.0.7",
  "filename": "Inbound Scope v1.0.7.exe",
  "changelog": "✨ Nueva versión con sistema de actualización mejorado:\n• Mejor manejo de errores\n• Progreso de descarga real\n• Proceso más robusto\n• Mensajes claros al usuario"
}
```

## 🔄 Proceso de Prueba

### 1. Ejecutar versión 1.0.6

- Abrir `Inbound Scope v1.0.6.exe`
- Debería aparecer la notificación de actualización

### 2. Verificar UI de actualización

- ✅ Debe mostrar "Nueva versión disponible"
- ✅ Debe mostrar versión 1.0.7
- ✅ Debe mostrar el changelog
- ✅ Botones "Más tarde" y "Actualizar ahora"

### 3. Iniciar actualización

- Click en "Actualizar ahora"
- Verificar que aparece:
  - ✅ Información importante sobre el reinicio
  - ✅ Barra de progreso con porcentaje real
  - ✅ Mensaje "NO CIERRE LA APLICACIÓN"

### 4. Proceso de instalación

- La app debe cerrarse automáticamente
- Esperar unos segundos
- La app debe reiniciarse sola con v1.0.7

### 5. Verificar actualización exitosa

- Cerrar y volver a abrir la app
- Verificar que sigue en v1.0.7
- No debe aparecer notificación de actualización

## 🐛 Troubleshooting

### Si la actualización no persiste:

1. **Verificar permisos de escritura**

   - Ejecutar como administrador
   - Verificar que la carpeta no esté en solo lectura

2. **Revisar logs**

   - Buscar en: `%TEMP%\app-updates\update_*.log`
   - Verificar mensajes de error

3. **Limpiar archivos temporales**
   - Eliminar contenido de `%TEMP%\app-updates\`
   - Volver a intentar

### Si la app no se reinicia:

1. **Verificar proceso**

   - Abrir Task Manager
   - Buscar "Inbound Scope.exe"
   - Si está colgado, terminarlo manualmente

2. **Ejecutar manualmente**
   - Ir a la carpeta de instalación
   - Ejecutar el .exe manualmente

## ✅ Checklist de Validación

- [x] La notificación aparece al detectar nueva versión
- [ ] El progreso de descarga muestra porcentaje real
- [ ] La información de reinicio es clara
- [ ] La app se cierra automáticamente
- [ ] La app se reinicia con la nueva versión
- [ ] La actualización persiste al cerrar y reabrir
- [ ] No aparecen más notificaciones después de actualizar
- [ ] Los archivos temporales se limpian correctamente

## 📊 Logs a Revisar

1. **Consola de la app** (F12 si está en modo dev)
2. **Archivos de log en** `%TEMP%\app-updates\`
3. **Event Viewer de Windows** si hay errores críticos

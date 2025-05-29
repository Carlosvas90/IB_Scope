# Sistema de Actualizaciones - Feedback Tracker

## 📋 Resumen

Sistema de actualizaciones automáticas que utiliza una carpeta compartida de red empresarial para distribuir nuevas versiones de la aplicación.

## 🏗️ Arquitectura

```
Red Empresarial
├── \\servidor-empresa\updates\
│   ├── version.json          # Información de la versión actual
│   └── app-v1.0.1.exe       # Archivo ejecutable de la nueva versión
│
App Local
├── config/update-config.json # Configuración del cliente
└── temp/app-updates/         # Archivos temporales de descarga
```

## ⚙️ Configuración

### 1. Para Administradores de Red

#### Crear carpeta compartida:

```
Crear: \\servidor-empresa\updates\
Permisos: Lectura para todos los usuarios
```

#### Estructura de archivos:

```
\\servidor-empresa\updates\
├── version.json              # OBLIGATORIO
└── app-v1.0.1.exe          # Archivo de la nueva versión
```

#### Contenido de `version.json`:

```json
{
  "version": "1.0.1",
  "filename": "app-v1.0.1.exe",
  "changelog": "Descripción de los cambios realizados"
}
```

### 2. Para la Aplicación

#### Configurar ruta de updates:

Editar `config/update-config.json`:

```json
{
  "updatePaths": ["\\\\servidor-empresa\\updates\\", "C:\\backup\\updates\\"],
  "currentVersion": "1.0.0",
  "autoCheck": true,
  "updateTimeout": 10000
}
```

**Nota:** El sistema soporta múltiples rutas y las probará en orden hasta encontrar una accesible. Esto es útil para tener un servidor principal y uno de respaldo, o para pruebas locales.

## 🔄 Proceso de Actualización

### 1. Verificación (Al iniciar la app)

- La app lee `\\servidor-empresa\updates\version.json`
- Compara la versión remota con la local
- Si hay una versión más nueva, notifica al usuario

### 2. Descarga

- Copia el archivo `.exe` desde la red al directorio temporal local
- Verifica la integridad del archivo

### 3. Instalación

- Ejecuta el nuevo instalador
- Cierra la aplicación actual
- El nuevo instalador se encarga del resto

## 📝 Flujo para Actualizaciones

### Para el Administrador:

1. **Compilar nueva versión** de la app
2. **Copiar** el `.exe` a `\\servidor-empresa\updates\`
3. **Actualizar** `version.json` con la nueva versión
4. **¡Listo!** - Al día siguiente todos tendrán el update

### Para el Usuario:

1. **Iniciar** la aplicación normalmente
2. **Recibir notificación** si hay update disponible
3. **Aceptar** la actualización
4. **Esperar** que se descargue e instale automáticamente

## 🛠️ API de Updates

### Handlers IPC Disponibles:

```javascript
// Verificar updates manualmente
window.electronAPI.invoke("update:check");

// Descargar update
window.electronAPI.invoke("update:download", updateInfo);

// Instalar update
window.electronAPI.invoke("update:install", localPath);

// Obtener configuración
window.electronAPI.invoke("update:get-config");
```

### Eventos del Renderer:

```javascript
// Escuchar notificación de update disponible
window.electronAPI.on("update:available", (updateInfo) => {
  console.log("Update disponible:", updateInfo);
});
```

## 🔧 Configuración Avanzada

### Múltiples rutas de updates:

```json
{
  "updatePaths": [
    "\\\\servidor-principal\\updates\\", // Ruta principal
    "\\\\servidor-backup\\updates\\", // Servidor de respaldo
    "Z:\\updates\\", // Unidad mapeada
    "C:\\local-updates\\" // Carpeta local para pruebas
  ]
}
```

### Configuración empresarial + desarrollo:

```json
{
  "updatePaths": [
    "\\\\ant\\dept-eu\\VLC1\\Public\\Apps_Tools\\chuecc\\IB_Scope\\updates\\",
    "C:\\Users\\developer\\test-updates\\"
  ]
}
```

### Cambiar ruta de updates (configuración legacy):

```json
{
  "updatePath": "Z:\\updates\\", // Unidad mapeada
  "updatePath": "\\\\192.168.1.100\\updates\\", // IP específica
  "updatePath": "\\\\server-name\\updates\\" // Nombre del servidor
}
```

**Nota:** El sistema es compatible con la configuración anterior (`updatePath` único) y la nueva (`updatePaths` múltiples).

### Desactivar verificación automática:

```json
{
  "autoCheck": false
}
```

## 🚨 Solución de Problemas

### Problema: No encuentra la carpeta de updates

**Solución:**

- Verificar que `\\servidor-empresa\updates\` sea accesible
- Comprobar permisos de red
- Verificar conectividad con el servidor

### Problema: Update no se instala

**Solución:**

- Verificar permisos de escritura en directorio temporal
- Comprobar que el archivo `.exe` no esté corrupto
- Revisar logs en la consola de la aplicación

### Problema: Versión no se actualiza

**Solución:**

- Verificar que `version.json` esté bien formateado
- Comprobar que la comparación de versiones sea correcta

## 📊 Logs del Sistema

Los logs del sistema de updates se muestran en la consola con el prefijo:

- `[UpdateService]` - Lógica del servicio
- `[UpdateHandler]` - Manejadores IPC
- `[Main]` - Proceso principal

## 🔒 Seguridad

- ✅ Sin conexión a internet requerida
- ✅ Solo carpetas de red corporativa
- ✅ Verificación de integridad de archivos
- ✅ Control total sobre las actualizaciones

## 🚀 Próximas Mejoras

1. **Updates Incrementales** - Solo descargar archivos modificados
2. **Hot Updates** - Actualizar UI sin reiniciar
3. **Rollback** - Volver a versión anterior
4. **Canales** - Stable, Beta, Dev
5. **Checksums** - Verificación SHA256 de archivos

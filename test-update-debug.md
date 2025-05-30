# 🐛 Guía de Depuración - Sistema de Actualización

## 📋 Problemas Detectados y Soluciones

### ❌ **Problema:** Los botones no funcionan al hacer click

**Causa:** Los eventos `onclick` inline no funcionan correctamente con módulos ES6 y el contexto de `window.updateManager`.

**Solución implementada:**

1. ✅ Cambiar de `onclick` inline a `addEventListener`
2. ✅ Agregar IDs únicos a cada botón
3. ✅ Crear método `attachEventListeners()` que se ejecuta después de insertar el HTML

### 🔧 **Cambios Realizados**

#### 1. **update-manager.js**

- Eliminados eventos `onclick` inline
- Agregado método `attachEventListeners()`
- Agregados logs de depuración
- Comentada la llamada a `checkForUpdates()` que no existe

#### 2. **test-update.js** (archivo de prueba)

- Script que simula una notificación de actualización
- Se ejecuta 2 segundos después de cargar la página
- Útil para probar sin necesidad de tener una actualización real

#### 3. **Sidebar.html**

- Incluido script de prueba temporal

## 🧪 **Pasos para Probar**

### 1. **Abrir la consola del desarrollador (F12)**

### 2. **Ejecutar la aplicación en modo dev**

```bash
npm start -- --dev
```

### 3. **Verificar logs en la consola**

Deberías ver:

```
[UpdateManager] Cargando módulo update-manager.js
[UpdateManager] Creando instancia de UpdateManager
[UpdateManager] Inicializando sistema de actualizaciones...
[UpdateManager] Creando instancia global window.updateManager
[TestUpdate] Script de prueba cargado
[TestUpdate] Simulando notificación de actualización...
[TestUpdate] UpdateManager encontrado, mostrando notificación
```

### 4. **Probar los botones**

- Click en "Más tarde": Debe cerrar la notificación
- Click en "Actualizar ahora": Debe iniciar el proceso
- Click en "X": Debe cerrar la notificación

### 5. **Verificar eventos en consola**

Al hacer click deberías ver:

```
[UpdateManager] Click en botón más tarde
[UpdateManager] Click en botón actualizar
[UpdateManager] Click en botón cerrar
```

## 🔍 **Comandos de Depuración en Consola**

```javascript
// Verificar que UpdateManager existe
console.log(window.updateManager);

// Mostrar notificación manualmente
window.updateManager.showUpdateNotification({
  version: "1.0.8",
  changelog: "Prueba manual",
  filename: "test.exe",
  downloadPath: "C:\\test\\test.exe",
});

// Verificar botones
document.getElementById("updateButton");
document.getElementById("laterUpdateBtn");
document.getElementById("closeUpdateBtn");
```

## 🚀 **Siguiente Paso**

Una vez confirmado que los botones funcionan:

1. **Eliminar el script de prueba**

   - Quitar `<script src="../js/test-update.js" type="module"></script>` de Sidebar.html
   - Eliminar el archivo `test-update.js`

2. **Probar con actualización real**
   - Seguir los pasos en `test-update-system.md`

## ⚠️ **Nota Importante**

Si los botones siguen sin funcionar, verificar:

1. **Errores en consola** - Buscar mensajes de error JavaScript
2. **Conflictos de CSS** - Verificar que no haya elementos superpuestos
3. **Timing** - Asegurar que el DOM esté completamente cargado

## 📊 **Checklist de Verificación**

- [ ] Se muestran los logs en consola
- [ ] Aparece la notificación de prueba
- [ ] El botón "Más tarde" funciona
- [ ] El botón "Actualizar ahora" funciona
- [ ] El botón "X" funciona
- [ ] Se ven los logs de click en consola

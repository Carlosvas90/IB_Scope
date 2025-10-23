# Guía de Case-Sensitivity para Builds

## 🚨 Problema Identificado

El sistema de archivos de Windows es **case-insensitive**, pero cuando se hace el build de la aplicación, el sistema de rutas puede ser **case-sensitive**, causando errores como:

```
Error: Cannot find module '../apps/feedback-tracker/estadisticas/views/estadisticas.html'
```

## ✅ Solución Implementada

### 1. **Estandarización de Nombres de Archivos**

**Archivos principales:**

- ✅ `Estadisticas.html` (con E mayúscula)
- ✅ `estadisticas.css` (todo minúsculas)
- ✅ `estadisticas.js` (todo minúsculas)

### 2. **Rutas Corregidas**

**En `src/renderer/js/router.js`:**

```javascript
// ❌ ANTES (causaba error en build)
path: "../apps/feedback-tracker/estadisticas/views/estadisticas.html";

// ✅ DESPUÉS (funciona correctamente)
path: "../apps/feedback-tracker/estadisticas/views/Estadisticas.html";
```

### 3. **Script de Verificación**

Se creó `fix-case-sensitivity.js` para verificar y corregir automáticamente problemas de case-sensitivity.

**Ejecutar:**

```bash
npm run fix-case
```

## 🔧 Cómo Prevenir Futuros Problemas

### 1. **Convención de Nombres**

**Archivos HTML:** PascalCase

- ✅ `Estadisticas.html`
- ✅ `UserActivity.html`
- ✅ `AdminPanel.html`

**Archivos CSS/JS:** camelCase

- ✅ `estadisticas.css`
- ✅ `userActivity.js`
- ✅ `adminPanel.js`

### 2. **Verificación Antes del Build**

Siempre ejecutar antes de hacer build:

```bash
npm run fix-case
npm run build
```

### 3. **Archivos a Verificar**

El script verifica automáticamente:

- `src/renderer/js/router.js`
- `src/renderer/js/app-loader.js`
- `src/renderer/views/Sidebar.html`
- `src/renderer/apps/feedback-tracker/estadisticas/README.md`
- `src/renderer/README-CONTEXTS-AND-PATHS.md`

## 🎯 Resultado

- ✅ Build exitoso sin errores de case-sensitivity
- ✅ Rutas estandarizadas y consistentes
- ✅ Script automático para verificación
- ✅ Documentación para prevenir futuros problemas

## 📝 Notas Importantes

1. **Windows vs Linux/Mac:** Windows es case-insensitive, pero el build puede ser case-sensitive
2. **Electron Builder:** Puede ser más estricto con las rutas que el sistema de archivos local
3. **Git:** En sistemas case-sensitive, Git puede detectar cambios de case como archivos diferentes
4. **Prevención:** Usar el script `npm run fix-case` antes de cada build

## 🚀 Comandos Útiles

```bash
# Verificar problemas de case-sensitivity
npm run fix-case

# Hacer build después de verificar
npm run fix-case && npm run build

# Solo hacer build (si ya verificaste)
npm run build
```

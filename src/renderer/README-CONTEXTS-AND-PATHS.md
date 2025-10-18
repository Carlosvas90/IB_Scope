# 📍 Guía de Contextos y Rutas - Inbound Scope

## 🎯 Problema Común

Al trabajar con módulos ES6 e imports dinámicos, las rutas relativas cambian según el **contexto de ejecución**. Esta guía explica cómo manejar rutas correctamente en la aplicación.

---

## 🏗️ Arquitectura de Contextos

### **Estructura de Directorios:**

```
src/renderer/
├── views/
│   ├── Sidebar.html          ← CONTEXTO PRINCIPAL (shell de la app)
│   ├── titlebar.html
│   └── splash.html
├── apps/
│   ├── dashboard/
│   │   └── views/
│   │       └── Home.html     ← Cargado en iframe
│   ├── feedback-tracker/
│   │   ├── views/
│   │   │   └── index.html    ← Cargado en iframe
│   │   └── estadisticas/
│   │       ├── views/
│   │       │   └── Estadisticas.html  ← Cargado en iframe anidado
│   │       └── js/
│   │           └── services/
│   │               └── CacheManager.js
│   └── activity-scope/
│       └── views/
│           └── activity-scope.html    ← Cargado en iframe
├── assets/
│   ├── svg/
│   ├── animations/
│   └── icons/
├── core/
│   └── utils/
│       └── svgLoader.js
└── css/
    └── themes/
        └── variables.css
```

---

## 📊 Tabla de Contextos de Ejecución

| Contexto            | Ubicación                                                    | Profundidad | Base URL                                              |
| ------------------- | ------------------------------------------------------------ | ----------- | ----------------------------------------------------- |
| **Shell Principal** | `views/Sidebar.html`                                         | 0           | `/renderer/views/`                                    |
| **Dashboard**       | `apps/dashboard/views/Home.html`                             | 2           | `/renderer/apps/dashboard/views/`                     |
| **Feedback Main**   | `apps/feedback-tracker/views/index.html`                     | 2           | `/renderer/apps/feedback-tracker/views/`              |
| **Estadísticas**    | `apps/feedback-tracker/estadisticas/views/Estadisticas.html` | 3           | `/renderer/apps/feedback-tracker/estadisticas/views/` |
| **Activity**        | `apps/activity-scope/views/activity-scope.html`              | 2           | `/renderer/apps/activity-scope/views/`                |

---

## 🎨 Rutas para Assets (SVG, Imágenes, CSS)

### **Desde Sidebar.html (Contexto Principal):**

```html
<!-- CSS -->
<link rel="stylesheet" href="../css/themes/variables.css" />

<!-- SVG -->
<img src="../assets/svg/icon.svg" />

<!-- JavaScript -->
<script type="module" src="../js/app.js"></script>
```

```javascript
// Import dinámico
const module = await import(
  "../apps/feedback-tracker/estadisticas/js/services/CacheManager.js"
);
```

---

### **Desde Estadisticas.html (Profundidad 3):**

```html
<!-- CSS -->
<link rel="stylesheet" href="../../../../css/themes/variables.css" />
<link rel="stylesheet" href="../css/estadisticas.css" />

<!-- SVG -->
<img src="../../../../assets/svg/estadisticas-icon.svg" />

<!-- JavaScript del mismo nivel -->
<script type="module" src="../js/init-estadisticas.js"></script>
```

```javascript
// Import desde estadisticas hacia un servicio del mismo nivel
import { CacheManager } from "./services/CacheManager.js";

// Import hacia assets globales
const response = await fetch("../../../../assets/svg/icon.svg");

// Import hacia core utils
import { loadSvg } from "../../../../core/utils/svgLoader.js";
```

---

### **Desde index.html de Feedback (Profundidad 2):**

```html
<!-- CSS global -->
<link rel="stylesheet" href="../../../css/themes/variables.css" />

<!-- CSS local -->
<link rel="stylesheet" href="../css/feedback-tracker.css" />

<!-- SVG global -->
<img src="../../../assets/svg/feedback-icon.svg" />
```

```javascript
// Import hacia estadísticas (módulo hermano)
import { EstadisticasDataService } from "../estadisticas/js/services/EstadisticasDataService.js";

// Import hacia core
import { svgLoader } from "../../../core/utils/svgLoader.js";
```

---

## 🧭 Fórmula de Rutas Relativas

### **Cálculo de `../` necesarios:**

```javascript
/**
 * Profundidad 0 (Sidebar.html): renderer/views/
 * Para llegar a assets: ../ (1 nivel arriba)
 *
 * Profundidad 1 (apps/dashboard/): renderer/apps/dashboard/
 * Para llegar a assets: ../../ (2 niveles arriba)
 *
 * Profundidad 2 (apps/feedback/views/): renderer/apps/feedback/views/
 * Para llegar a assets: ../../../ (3 niveles arriba)
 *
 * Profundidad 3 (apps/feedback/estadisticas/views/): renderer/apps/feedback/estadisticas/views/
 * Para llegar a assets: ../../../../ (4 niveles arriba)
 */
```

### **Regla General:**

```
Niveles arriba = Profundidad del contexto + 1
```

---

## 💻 Detectar Contexto en Runtime

### **Método 1: Basado en URL:**

```javascript
function detectContext() {
  const path = window.location.pathname;

  if (path.includes("/estadisticas/views/")) {
    return { name: "estadisticas", depth: 3, base: "../../../../" };
  }
  if (path.includes("/apps/") && path.includes("/views/")) {
    return { name: "app-module", depth: 2, base: "../../../" };
  }
  if (path.includes("/views/")) {
    return { name: "shell", depth: 0, base: "../" };
  }

  return { name: "unknown", depth: 0, base: "../" };
}

// Uso
const context = detectContext();
console.log("Contexto actual:", context.name);
const assetPath = `${context.base}assets/svg/icon.svg`;
```

---

### **Método 2: Variable Global:**

```javascript
// En cada HTML, definir su contexto
// Estadisticas.html:
window.APP_CONTEXT = {
  module: "estadisticas",
  depth: 3,
  baseToRoot: "../../../../",
};

// index.html (feedback):
window.APP_CONTEXT = {
  module: "feedback",
  depth: 2,
  baseToRoot: "../../../",
};

// Uso universal:
const svgPath = `${window.APP_CONTEXT.baseToRoot}assets/svg/icon.svg`;
```

---

## 🛠️ Helper Utility (Recomendado)

### **Crear: `src/renderer/core/utils/pathResolver.js`**

```javascript
/**
 * PathResolver - Resuelve rutas dinámicamente según contexto
 */
export class PathResolver {
  static contexts = {
    shell: { depth: 0, pattern: /\/views\/[^/]+\.html/ },
    appModule: { depth: 2, pattern: /\/apps\/[^/]+\/views\// },
    estadisticas: { depth: 3, pattern: /\/estadisticas\/views\// },
  };

  /**
   * Detecta el contexto actual
   */
  static detectContext() {
    const path = window.location.pathname;

    for (const [name, config] of Object.entries(this.contexts)) {
      if (config.pattern.test(path)) {
        return { name, depth: config.depth };
      }
    }

    return { name: "unknown", depth: 0 };
  }

  /**
   * Construye ruta a assets
   */
  static toAsset(relativePath) {
    const { depth } = this.detectContext();
    const levels = "../".repeat(depth + 1);
    return `${levels}assets/${relativePath}`;
  }

  /**
   * Construye ruta a core utils
   */
  static toCore(relativePath) {
    const { depth } = this.detectContext();
    const levels = "../".repeat(depth + 1);
    return `${levels}core/${relativePath}`;
  }

  /**
   * Construye ruta a CSS global
   */
  static toCSS(relativePath) {
    const { depth } = this.detectContext();
    const levels = "../".repeat(depth + 1);
    return `${levels}css/${relativePath}`;
  }

  /**
   * Log de debug
   */
  static debug() {
    const context = this.detectContext();
    console.log("📍 Contexto actual:", context);
    console.log("📂 Ruta actual:", window.location.pathname);
    console.log("🎨 Ejemplo asset:", this.toAsset("svg/icon.svg"));
    console.log("🔧 Ejemplo core:", this.toCore("utils/svgLoader.js"));
    console.log("💅 Ejemplo CSS:", this.toCSS("themes/variables.css"));
  }
}

// Hacer disponible globalmente
if (typeof window !== "undefined") {
  window.PathResolver = PathResolver;
}
```

---

## 📝 Uso del PathResolver

### **En HTML:**

```html
<head>
  <!-- Cargar primero el resolver -->
  <script type="module">
    import { PathResolver } from "./core/utils/pathResolver.js"; // ajustar según contexto
    window.PathResolver = PathResolver;
  </script>

  <!-- Usar dinámicamente -->
  <script type="module">
    const cssPath = PathResolver.toCSS("themes/variables.css");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssPath;
    document.head.appendChild(link);
  </script>
</head>
```

### **En JavaScript:**

```javascript
import { PathResolver } from "../../../../core/utils/pathResolver.js";

// Cargar SVG
const svgPath = PathResolver.toAsset("svg/estadisticas-icon.svg");
const response = await fetch(svgPath);

// Importar módulo
const modulePath = PathResolver.toCore("utils/svgLoader.js");
const { loadSvg } = await import(modulePath);

// Debug
PathResolver.debug();
```

---

## 🎯 Casos de Uso Comunes

### **1. Cargar SVG desde cualquier contexto:**

```javascript
async function loadIconUniversal(iconName) {
  const context = detectContext();
  const svgPath = `${context.base}assets/svg/${iconName}.svg`;
  const response = await fetch(svgPath);
  return await response.text();
}
```

### **2. Import dinámico desde consola (DevTools):**

```javascript
// Siempre desde Sidebar.html context
const module = await import(
  "../apps/feedback-tracker/estadisticas/js/services/CacheManager.js"
);
const cm = new module.CacheManager();
```

### **3. Cargar CSS temático:**

```javascript
function loadThemeCSS() {
  const context = detectContext();
  const cssPath = `${context.base}css/themes/variables.css`;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = cssPath;
  document.head.appendChild(link);
}
```

---

## ⚠️ Errores Comunes y Soluciones

### **Error: `net::ERR_FILE_NOT_FOUND`**

**Causa:** Ruta relativa incorrecta según contexto.

**Solución:**

1. Verificar contexto actual: `console.log(window.location.pathname)`
2. Contar niveles de profundidad
3. Ajustar `../` según profundidad

### **Error: `Failed to fetch dynamically imported module`**

**Causa:** Import desde contexto incorrecto.

**Solución:**

- En DevTools console: Usar ruta desde Sidebar context
- En scripts de módulo: Usar ruta relativa al archivo actual

### **SVG/Asset no carga:**

**Solución:**

```javascript
// Debug paso a paso
console.log("Contexto:", window.location.href);
console.log("Path actual:", window.location.pathname);
const testPath = "../assets/svg/icon.svg"; // Ajustar ../
console.log("Intentando:", new URL(testPath, window.location.href).href);
```

---

## 📚 Resumen de Best Practices

1. ✅ **Siempre usar rutas relativas** (no absolutas)
2. ✅ **Definir `APP_CONTEXT`** en cada HTML para claridad
3. ✅ **Usar PathResolver** para rutas dinámicas
4. ✅ **Documentar profundidad** en comentarios del archivo
5. ✅ **Probar desde DevTools** con contexto Sidebar
6. ✅ **Imports de módulos hermanos**: `./` o `../`
7. ✅ **Imports hacia arriba**: Contar niveles correctamente
8. ❌ **NO usar rutas absolutas** tipo `/assets/...`
9. ❌ **NO asumir contexto** sin verificar `location`

---

## 🔍 Debugging Quick Reference

```javascript
// 1. ¿Dónde estoy?
console.log("📍 URL:", window.location.href);
console.log("📂 Path:", window.location.pathname);

// 2. ¿Qué contexto?
const depth = (window.location.pathname.match(/\//g) || []).length - 2;
console.log("🔢 Profundidad estimada:", depth);

// 3. ¿Qué base necesito?
const base = "../".repeat(depth + 1);
console.log("🎯 Base para assets:", base);

// 4. Test de ruta
const testAsset = `${base}assets/svg/test.svg`;
console.log("🧪 Test path:", new URL(testAsset, window.location.href).href);
```

---

## 🎓 Ejemplos Prácticos del Proyecto

### **CacheManager desde DevTools:**

```javascript
// ✅ CORRECTO (desde Sidebar context)
const { CacheManager } = await import(
  "../apps/feedback-tracker/estadisticas/js/services/CacheManager.js"
);
```

### **svgLoader desde Estadisticas.html:**

```javascript
// ✅ CORRECTO (desde estadisticas hacia core)
import { loadSvg } from "../../../../core/utils/svgLoader.js";
```

### **Variables CSS en Estadisticas.html:**

```html
<!-- ✅ CORRECTO -->
<link rel="stylesheet" href="../../../../css/themes/variables.css" />
```

---

**Documento creado:** 2025-01-12  
**Autor:** AI Assistant  
**Versión:** 1.0  
**Estado:** 📚 Referencia permanente

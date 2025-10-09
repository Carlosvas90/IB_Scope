# 🎨 Header Component - Componente Reutilizable

## 📋 Descripción

Componente de header elegante con línea superior de gradiente, inspirado en el diseño de los KPI cards. Diseñado para ser **reutilizable en todas las aplicaciones** de IB Scope.

## ✨ Características

- ✅ **Línea de gradiente superior** (4px) - Elemento distintivo
- ✅ **Efecto hover** con elevación y sombra
- ✅ **Animación del icono** al hacer hover
- ✅ **5 variantes de color** para diferentes módulos
- ✅ **Responsive** - Se adapta a móviles
- ✅ **Variables del sistema** - Consistencia total

## 🎯 Variantes de Color

### Primary (Azul - Default)

```html
<header class="app-header-card primary"></header>
```

**Gradiente:** Azul → Azul claro  
**Uso:** Páginas principales, dashboards

### Success (Verde)

```html
<header class="app-header-card success"></header>
```

**Gradiente:** Verde → Azul  
**Uso:** Páginas de resultados positivos, completados

### Warning (Naranja)

```html
<header class="app-header-card warning"></header>
```

**Gradiente:** Naranja → Rojo  
**Uso:** Páginas de advertencias, pendientes

### Danger (Rojo)

```html
<header class="app-header-card danger"></header>
```

**Gradiente:** Rojo → Naranja  
**Uso:** Páginas de errores críticos

### Info (Info)

```html
<header class="app-header-card info"></header>
```

**Gradiente:** Azul claro → Verde  
**Uso:** Páginas informativas, ayuda

## 📝 Uso Básico

### Ejemplo Completo:

```html
<!-- 1. Importar el CSS en tu archivo HTML o CSS -->
<link rel="stylesheet" href="../../../../css/header-component.css" />

<!-- 2. Usar el componente -->
<header class="app-header-card primary">
  <h1>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
    >
      <!-- Tu icono SVG aquí -->
    </svg>
    Título de tu Página
  </h1>
  <div class="app-header-controls">
    <button class="btn-refresh">Actualizar</button>
    <button class="btn-export">Exportar</button>
  </div>
</header>
```

## 🔧 Personalización

### Cambiar altura de la línea superior:

```css
.mi-header-custom::before {
  height: 6px; /* Default es 4px */
}
```

### Cambiar el gradiente:

```css
.mi-header-custom::before {
  background: linear-gradient(90deg, #custom-color-1, #custom-color-2);
}
```

### Cambiar el efecto hover:

```css
.mi-header-custom:hover {
  transform: translateY(-4px); /* Default es -2px */
  box-shadow: var(--shadow-xl); /* Sombra más grande */
}
```

## 📊 Aplicaciones que lo usan

- ✅ **Estadísticas** (@estadisticas/) - Con variante `primary`
- 🔜 **Feedback Tracker** - Por implementar
- 🔜 **Activity Scope** - Por implementar
- 🔜 **Dashboard** - Por implementar

## 🎨 Elementos del Diseño

### Línea Superior (::before)

- **Altura:** 4px
- **Posición:** Absoluta (top: 0)
- **Gradiente:** De izquierda a derecha
- **Borde radius:** Heredado del contenedor

### Efecto Hover

- **Elevación:** translateY(-2px)
- **Sombra:** Aumenta de md a lg
- **Icono:** scale(1.1)
- **Transición:** Suave y fluida

### Responsive

- **Desktop:** Horizontal (flex-direction: row)
- **Tablet/Mobile:** Vertical (flex-direction: column)
- **Botones:** Wrap automático

## 🚀 Migración de Headers Existentes

### Antes:

```html
<header class="mi-header-viejo">
  <h1>Título</h1>
  <div class="botones">...</div>
</header>
```

### Después:

```html
<header class="app-header-card primary">
  <h1>
    <svg>...</svg>
    Título
  </h1>
  <div class="app-header-controls">...</div>
</header>
```

## 📋 Checklist de Implementación

Para agregar este header a una nueva página:

- [ ] Importar `header-component.css` en tu CSS
- [ ] Usar la clase `app-header-card`
- [ ] Elegir variante de color (`primary`, `success`, etc.)
- [ ] Agregar SVG icon dentro del `<h1>`
- [ ] Usar `app-header-controls` para los botones
- [ ] Probar responsive (resize la ventana)
- [ ] Verificar efecto hover

---

**Archivo:** `src/renderer/css/header-component.css`  
**Versión:** 1.0.0  
**Fecha:** Enero 2025  
**Autor:** Equipo IB Scope

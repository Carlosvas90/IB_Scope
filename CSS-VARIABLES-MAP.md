# Mapeo de Variables CSS

Este documento sirve como guía para la migración de variables CSS en la aplicación.

## Variables Base Actuales

### Tema Claro

```css
--light-white
--light-gray-50
--light-gray-100
--light-gray-200
--light-gray-300
--light-gray-400
--light-gray-500
--light-gray-600
--light-gray-700
--light-gray-800
--light-gray-900
--light-blue-primary
--light-blue-secondary
--light-blue-light
--light-pink
--light-success
--light-success-light
--light-warning
--light-warning-light
--light-error
--light-error-light
--light-info
--light-info-light
```

### Tema Oscuro

```css
--dark-blue-bg
--dark-blue-bg-light
--dark-blue-card
--dark-blue-hover
--dark-blue-border
--dark-white
--dark-gray-100
--dark-gray-200
--dark-gray-300
--dark-gray-400
--dark-gray-500
--dark-gray-600
--dark-gray-700
--dark-gray-800
--dark-gray-900
--dark-blue-primary
--dark-blue-secondary
--dark-pink
--dark-success
--dark-success-light
--dark-warning
--dark-warning-light
--dark-error
--dark-error-light
--dark-info
--dark-info-light
```

## Propuesta de Nuevas Variables

### Colores Base

```css
--color-white
--color-gray-50
--color-gray-100
--color-gray-200
--color-gray-300
--color-gray-400
--color-gray-500
--color-gray-600
--color-gray-700
--color-gray-800
--color-gray-900
--color-blue-primary
--color-blue-secondary
--color-blue-light
--color-blue-dark
--color-blue-dark-light
--color-blue-card
--color-blue-hover
--color-blue-border
--color-pink
--color-success
--color-success-light
--color-warning
--color-warning-light
--color-error
--color-error-light
--color-info
--color-info-light
```

## Plan de Migración

### Fase 1: Preparación

1. Crear copia de seguridad de variables.css
2. Documentar todas las referencias actuales
3. Crear pruebas para validar cambios

### Fase 2: Migración por Componentes

1. Componentes Base

   - layout.css
   - components.css
   - navigation.css
   - sidebar.css
   - titlebar.css
   - responsive.css

2. Aplicaciones
   - dashboard
   - feedback-tracker
   - activity-scope
   - idle-time
   - space-heatmap

### Fase 3: Validación

1. Probar cada componente después de la migración
2. Validar que los temas funcionan correctamente
3. Asegurar que no hay regresiones visuales

## Mapeo de Referencias

### Componentes Base

```css
/* Antes */
color: var(--light-text-primary);
background: var(--light-bg-main);

/* Después */
color: var(--text-primary);
background: var(--bg-main);
```

### Aplicaciones

```css
/* Antes */
color: var(--dark-text-secondary);
background: var(--dark-card-bg);

/* Después */
color: var(--text-secondary);
background: var(--card-bg);
```

## Notas Importantes

1. Mantener la compatibilidad con el sistema de temas actual
2. No romper la funcionalidad existente
3. Documentar todos los cambios
4. Probar exhaustivamente cada cambio

# Referencias de Variables CSS

Este documento registra todas las referencias a variables CSS en la aplicación.

## Referencias en variables.css

### Variables Semánticas - Tema Claro

```css
--light-bg-main: var(--light-white)
--light-sidebar-bg: var(--light-gray-50)
--light-text-primary: var(--light-gray-900)
--light-text-secondary: var(--light-gray-700)
--light-element-secondary: var(--light-gray-300)
--light-accent-blue: var(--light-blue-primary)
--light-accent-blue-light: var(--light-blue-secondary)
--light-accent-pink: var(--light-pink)
--light-card-bg: var(--light-gray-50)
--light-border-color: var(--light-gray-200)
--light-hover-bg: var(--light-gray-100)
--light-status-pending: var(--light-warning-light)
--light-status-done: var(--light-success-light)
--light-status-pending-text: var(--light-warning)
--light-status-done-text: var(--light-success)
```

### Variables Semánticas - Tema Oscuro

```css
--dark-bg-main: var(--dark-blue-bg)
--dark-sidebar-bg: var(--dark-blue-bg-light)
--dark-text-primary: var(--dark-white)
--dark-text-secondary: var(--dark-gray-700)
--dark-element-secondary: var(--dark-gray-900)
--dark-accent-blue: var(--dark-blue-primary)
--dark-accent-blue-light: var(--dark-blue-secondary)
--dark-accent-pink: var(--dark-pink)
--dark-card-bg: var(--dark-blue-card)
--dark-border-color: var(--dark-blue-border)
--dark-hover-bg: var(--dark-blue-hover)
--dark-status-pending: var(--dark-warning-light)
--dark-status-done: var(--dark-success-light)
--dark-status-pending-text: var(--dark-warning)
--dark-status-done-text: var(--dark-success)
```

### Variables Globales - Tema Claro (por defecto)

```css
--bg-main: var(--light-bg-main)
--sidebar-bg: var(--light-sidebar-bg)
--text-primary: var(--light-text-primary)
--text-secondary: var(--light-text-secondary)
--element-secondary: var(--light-element-secondary)
--accent-blue: var(--light-accent-blue)
--accent-blue-light: var(--light-accent-blue-light)
--accent-pink: var(--light-accent-pink)
--card-bg: var(--light-card-bg)
--border-color: var(--light-border-color)
--hover-bg: var(--light-hover-bg)
--status-pending: var(--light-status-pending)
--status-done: var(--light-status-done)
--status-pending-text: var(--light-status-pending-text)
--status-done-text: var(--light-status-done-text)
```

### Variables Globales - Tema Oscuro (.dark-theme)

```css
--bg-main: var(--dark-bg-main)
--sidebar-bg: var(--dark-sidebar-bg)
--text-primary: var(--dark-text-primary)
--text-secondary: var(--dark-text-secondary)
--element-secondary: var(--dark-element-secondary)
--accent-blue: var(--dark-accent-blue)
--accent-blue-light: var(--dark-accent-blue-light)
--accent-pink: var(--dark-accent-pink)
--card-bg: var(--dark-card-bg)
--border-color: var(--dark-border-color)
--hover-bg: var(--dark-hover-bg)
--status-pending: var(--dark-status-pending)
--status-done: var(--dark-status-done)
--status-pending-text: var(--dark-status-pending-text)
--status-done-text: var(--dark-status-done-text)
```

## Plan de Pruebas

### 1. Pruebas de Variables Base

- [ ] Verificar que todos los colores base se muestran correctamente
- [ ] Comprobar que los valores hexadecimales son correctos
- [ ] Validar que no hay colores duplicados

### 2. Pruebas de Variables Semánticas

- [ ] Verificar que las referencias a variables base son correctas
- [ ] Comprobar que los mapeos son consistentes
- [ ] Validar que no hay referencias rotas

### 3. Pruebas de Variables Globales

- [ ] Verificar que las variables globales funcionan en tema claro
- [ ] Comprobar que las variables globales funcionan en tema oscuro
- [ ] Validar que el cambio de tema funciona correctamente

### 4. Pruebas de Componentes

- [ ] Verificar que los componentes usan las variables correctas
- [ ] Comprobar que los estilos se aplican correctamente
- [ ] Validar que no hay regresiones visuales

## Notas de Implementación

1. Mantener la compatibilidad con el sistema de temas actual
2. Asegurar que las variables globales funcionan en ambos temas
3. Documentar cualquier cambio en el comportamiento
4. Probar exhaustivamente cada componente después de los cambios

## Uso en Componentes

### Componentes Base

1. **titlebar.css**

   - `--bg-main`: Color de fondo principal
   - `--border-color`: Borde inferior
   - `--text-primary`: Color de texto
   - `--hover-bg`: Color de hover en botones

2. **sidebar.css**

   - `--border-color`: Borde derecho
   - `--accent-blue`: Color de acento para iconos
   - `--text-secondary`: Color de texto secundario
   - `--border-radius-md`: Radio de borde
   - `--hover-bg`: Color de hover

3. **navigation.css**

   - `--border-radius-md`: Radio de borde
   - `--text-primary`: Color de texto principal
   - `--hover-bg`: Color de hover
   - `--accent-blue`: Color de acento
   - `--border-color`: Borde inferior
   - `--text-secondary`: Color de texto secundario

4. **components.css**
   - `--border-radius-md`: Radio de borde
   - `--accent-blue`: Color de acento
   - `--accent-blue-light`: Color de acento claro
   - `--text-primary`: Color de texto
   - `--hover-bg`: Color de hover
   - `--card-bg`: Color de fondo de tarjetas
   - `--status-done-text`: Color de texto para estado completado

### Aplicaciones

1. **feedback-tracker/table.css**

   - `--border-radius-md`: Radio de borde
   - `--border-color`: Color de borde
   - `--text-primary`: Color de texto
   - `--hover-bg`: Color de hover
   - `--status-pending`: Color de estado pendiente
   - `--status-done`: Color de estado completado
   - `--status-pending-text`: Color de texto para estado pendiente
   - `--status-done-text`: Color de texto para estado completado
   - `--card-bg`: Color de fondo de tarjetas

2. **feedback-tracker/feedback-tracker.css**

   - `--bg-main`: Color de fondo principal
   - `--text-primary`: Color de texto principal
   - `--border-radius-md`: Radio de borde
   - `--accent-blue`: Color de acento
   - `--accent-blue-light`: Color de acento claro
   - `--hover-bg`: Color de hover
   - `--text-secondary`: Color de texto secundario
   - `--card-bg`: Color de fondo de tarjetas
   - `--border-color`: Color de borde

3. **feedback-tracker/feedback-modal.css**
   - `--card-bg`: Color de fondo de tarjetas

## Impacto de Cambios

### Componentes Críticos

1. **Sistema de Temas**

   - Cambios en variables base afectarán ambos temas
   - Necesario mantener compatibilidad con `.dark-theme`

2. **Componentes de UI**

   - La mayoría de componentes usan variables globales
   - Cambios en variables semánticas afectarán múltiples componentes

3. **Aplicaciones**
   - Feedback Tracker es el componente más dependiente
   - Requiere pruebas exhaustivas después de cambios

### Plan de Migración por Componente

1. **Fase 1: Componentes Base**

   - titlebar.css
   - sidebar.css
   - navigation.css
   - components.css

2. **Fase 2: Aplicaciones**

   - feedback-tracker (prioridad alta)
   - Otras aplicaciones

3. **Fase 3: Validación**
   - Pruebas de tema claro/oscuro
   - Verificación de consistencia visual
   - Validación de accesibilidad

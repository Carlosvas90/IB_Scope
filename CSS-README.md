# Documentación de CSS - IB_Scope

Este documento proporciona una descripción detallada de todos los archivos CSS utilizados en la aplicación IB_Scope.

## Estilos Globales

Los estilos globales se encuentran en el directorio `src/renderer/css/`:

### Archivos Base

- `reset.css` - Reseteo de estilos base
- `variables.css` - Variables CSS globales (colores, tamaños, etc.)
- `layout.css` - Estilos de layout principales
- `components.css` - Estilos de componentes compartidos
- `responsive.css` - Media queries y estilos responsivos

### Componentes de UI

- `navigation.css` - Estilos de navegación
- `sidebar.css` - Estilos de la barra lateral
- `titlebar.css` - Estilos de la barra de título

## Estilos por Aplicación

### Dashboard

- `src/renderer/apps/dashboard/css/dashboard.css`

### Feedback Tracker

- `src/renderer/apps/feedback-tracker/css/feedback-tracker.css`
- `src/renderer/apps/feedback-tracker/css/table.css`
- `src/renderer/apps/feedback-tracker/css/feedback-modal.css`

### Space Heatmap

- `src/renderer/apps/space-heatmap/css/space-heatmap.css`

### Idle Time

- `src/renderer/apps/idle-time/css/idle-time.css`

### Activity Scope

- `src/renderer/apps/activity-scope/css/activity-scope.css`

## Sistema de Temas

El sistema de temas se maneja a través de:

- `src/renderer/css/themes/variables.css` - Contiene todas las variables CSS utilizadas en la aplicación

## Optimización CSS

La aplicación implementa un sistema de optimización de CSS que:

1. Precarga los estilos necesarios
2. Inyecta CSS crítico al inicio
3. Carga el resto de estilos de manera asíncrona
4. Proporciona fallbacks para carga tradicional

## Convenciones de Nombrado

- Los archivos CSS siguen el patrón `nombre-componente.css`
- Las variables CSS usan el prefijo `--ib-`
- Los selectores de clase usan kebab-case

## Importación de Estilos

Para importar estilos en un nuevo componente:

```css
@import url("../../../css/themes/variables.css");
```

## Mejores Prácticas

1. Siempre importar `variables.css` al inicio de cada archivo CSS
2. Usar variables CSS para colores, tamaños y otros valores reutilizables
3. Mantener la especificidad de selectores al mínimo
4. Seguir el principio de responsabilidad única por archivo CSS

## Plan de Optimización CSS para Electron

### 1. Optimización de Variables CSS

- [ ] Consolidar variables duplicadas
- [ ] Crear un sistema de tokens de diseño específico para escritorio
- [ ] Implementar un sistema de temas claro/oscuro que respete las preferencias del sistema operativo
- [ ] Documentar todas las variables con ejemplos de uso en contexto de escritorio

### 2. Optimización de Rendimiento

- [ ] Optimizar el renderizado para el motor Chromium de Electron
- [ ] Implementar lazy loading de estilos para ventanas secundarias
- [ ] Optimizar selectores para el contexto de aplicación de escritorio
- [ ] Reducir el impacto en la memoria RAM

### 3. Optimización de Estructura

- [ ] Reorganizar los archivos CSS siguiendo la metodología BEM
- [ ] Crear un sistema de utilidades CSS específicas para UI de escritorio
- [ ] Implementar un sistema de layout optimizado para ventanas de escritorio
- [ ] Estandarizar el manejo de diferentes tamaños de ventana

### 4. Optimización de Mantenimiento

- [ ] Implementar un sistema de documentación automática para CSS
- [ ] Crear un sistema de pruebas visuales para diferentes tamaños de ventana
- [ ] Estandarizar el proceso de revisión de CSS
- [ ] Implementar linting y formateo automático

### 5. Optimización de Carga

- [ ] Implementar carga eficiente de estilos para ventanas principales y secundarias
- [ ] Optimizar el orden de carga de los estilos en el contexto de Electron
- [ ] Implementar cacheo eficiente de CSS en el sistema de archivos local
- [ ] Reducir el número de solicitudes de recursos

### 6. Optimización de Accesibilidad

- [ ] Asegurar contraste de colores adecuado para pantallas de escritorio
- [ ] Implementar soporte para modo de alto contraste del sistema operativo
- [ ] Mejorar el soporte para lectores de pantalla en el contexto de escritorio
- [ ] Optimizar el tamaño de fuente y espaciado para pantallas de escritorio

### 7. Optimización de Compatibilidad

- [ ] Asegurar compatibilidad con diferentes versiones de Electron
- [ ] Optimizar para diferentes resoluciones de pantalla de escritorio
- [ ] Mejorar el soporte para diferentes sistemas operativos (Windows, macOS, Linux)
- [ ] Implementar fallbacks para diferentes versiones de Chromium

### 8. Herramientas y Automatización

- [ ] Implementar PostCSS para procesamiento
- [ ] Configurar PurgeCSS para eliminar CSS no utilizado
- [ ] Implementar CSS Modules para evitar conflictos
- [ ] Configurar herramientas de análisis de rendimiento específicas para Electron

### 9. Monitoreo y Métricas

- [ ] Implementar tracking de tamaño de CSS
- [ ] Monitorear tiempos de carga de ventanas
- [ ] Analizar impacto en rendimiento de la aplicación
- [ ] Establecer métricas de calidad específicas para aplicaciones de escritorio

### 10. Documentación y Guías

- [ ] Crear guías de estilo específicas para UI de escritorio
- [ ] Documentar patrones de diseño para aplicaciones Electron
- [ ] Crear ejemplos de uso en contexto de escritorio
- [ ] Mantener un registro de cambios y decisiones

### 11. Optimizaciones Específicas de Electron

- [ ] Implementar estilos optimizados para el proceso de renderizado
- [ ] Optimizar el manejo de estilos en ventanas secundarias
- [ ] Implementar estilos específicos para la barra de título personalizada
- [ ] Optimizar el rendimiento de animaciones en el contexto de Electron

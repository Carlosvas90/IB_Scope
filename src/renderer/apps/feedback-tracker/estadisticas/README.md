# Dashboard de Estadísticas - Feedback Tracker

Este módulo proporciona un dashboard completo de estadísticas y análisis para el sistema de seguimiento de errores del Feedback Tracker.

## 🚀 Características

### KPIs Principales

- **Total de Errores**: Contador total de errores en el período seleccionado
- **Errores Pendientes**: Errores que aún requieren atención
- **Errores Resueltos**: Errores que han sido completados exitosamente
- **Tasa de Resolución**: Porcentaje de errores resueltos vs. total
- **Tiempo Promedio**: Tiempo promedio de resolución de errores
- **Promedio Diario**: Promedio de errores por día en el período

### Gráficos Interactivos

- **Tendencias Temporales**: Visualización de errores a lo largo del tiempo
- **Distribución por Estado**: Gráfico de pastel/dona mostrando distribución de estados
- **Errores por Hora**: Análisis de patrones horarios de errores
- **Top Productos**: Ranking de productos (ASINs) con más errores

### Tablas Analíticas

- **Ranking de Usuarios**: Análisis del rendimiento por usuario
- **Análisis de Productos**: Detalles de errores por ASIN con frecuencia y estado

### Funcionalidades Avanzadas

- **Filtros Temporales**: 7, 30, 90, 365 días o personalizado
- **Exportación**: Posibilidad de exportar reportes en JSON
- **Insights Automáticos**: Análisis automático con recomendaciones
- **Actualización en Tiempo Real**: Datos que se actualizan automáticamente
- **Responsive Design**: Compatible con diferentes tamaños de pantalla
- **Modo Oscuro**: Soporte completo para temas claros y oscuros

## 🏗️ Arquitectura

### Estructura de Archivos

```
estadisticas/
├── views/
│   └── Estadisticas.html          # Dashboard principal
├── css/
│   └── estadisticas.css           # Estilos del dashboard
└── js/
    ├── estadisticas.js            # Controlador principal
    ├── test-integration.js        # Script de pruebas
    └── components/
        ├── KPICard.js            # Componente de tarjetas KPI
        ├── ChartManager.js       # Gestor de gráficos ECharts
        └── StatisticsAPI.js      # Servicio de datos
```

### Componentes Principales

#### EstadisticasController

- **Ubicación**: `js/estadisticas.js`
- **Función**: Controlador principal que coordina todos los componentes
- **Responsabilidades**:
  - Inicialización del dashboard
  - Manejo de eventos de navegación
  - Coordinación entre componentes
  - Gestión de filtros temporales

#### KPICard

- **Ubicación**: `js/components/KPICard.js`
- **Función**: Manejo de tarjetas de indicadores clave
- **Características**:
  - Animaciones de conteo
  - Indicadores de tendencia
  - Formateo automático de valores

#### ChartManager

- **Ubicación**: `js/components/ChartManager.js`
- **Función**: Gestión completa de gráficos usando Apache ECharts
- **Capacidades**:
  - Múltiples tipos de gráficos (línea, barra, pastel, área, etc.)
  - Cambio dinámico de tipos
  - Exportación de gráficos
  - Responsividad automática
  - Temas personalizables

#### StatisticsAPI

- **Ubicación**: `js/components/StatisticsAPI.js`
- **Función**: Servicio de datos y API simulada
- **Características**:
  - Datos simulados realistas
  - Sistema de caché
  - Generación de tendencias
  - Filtrado por períodos

## 🎨 Sistema de Temas

El dashboard utiliza el sistema de variables CSS centralizado de la aplicación:

### Variables Principales

```css
--stats-primary-color: var(--Palette-Blue-4)
--stats-bg-primary: var(--body-bg)
--stats-text-primary: var(--text-color-two)
--stats-shadow-sm: var(--shadow-sm)
```

### Integración con Tema Global

- Importación automática de `../../../../css/themes/variables.css`
- Compatibilidad total con modo oscuro/claro
- Consistencia visual con el resto de la aplicación

## 📊 Tecnologías Utilizadas

### Frontend

- **Apache ECharts 5.x**: Biblioteca de gráficos moderna y potente
- **Vanilla JavaScript ES6+**: Sin dependencias adicionales
- **CSS Grid/Flexbox**: Layout responsive moderno
- **CSS Custom Properties**: Sistema de variables para temas

### Características Técnicas

- **Arquitectura Modular**: Separación clara de responsabilidades
- **Event-Driven**: Sistema basado en eventos para comunicación entre componentes
- **Performance Optimized**: Lazy loading y gestión eficiente de memoria
- **Memory Management**: Destrucción apropiada de recursos

## 🔧 Integración con Feedback Tracker

### Sistema de Navegación

El dashboard se integra perfectamente con el sistema de navegación existente:

1. **Sidebar**: Enlace "Estadísticas" en el submenú de Feedback Tracker
2. **Router**: Configuración automática de rutas (`data-view="stats"`)
3. **Vista**: Carga mediante iframe para aislamiento completo
4. **Estilos**: CSS específico para la vista integrada

### Configuración del Router

```javascript
"feedback-tracker": {
  path: "../apps/feedback-tracker/views/index.html",
  views: {
    errors: "#errors-view",
    stats: "#stats-view",        // ← Vista de estadísticas
    settings: "#settings-view",
  },
  defaultView: "errors",
  hasSubmenu: true,
}
```

### Vista HTML Integrada

```html
<section id="stats-view" class="view">
  <iframe
    src="../../../apps/feedback-tracker/estadisticas/views/Estadisticas.html"
    frameborder="0"
    width="100%"
    height="100%"
    style="border: none; display: block;"
    title="Dashboard de Estadísticas de Errores"
  >
  </iframe>
</section>
```

## 🧪 Testing y Validación

### Script de Pruebas

- **Archivo**: `js/test-integration.js`
- **Función**: Validación automática de la integración
- **Verificaciones**:
  - Disponibilidad de ECharts
  - Existencia de elementos DOM críticos
  - Funcionalidad de controladores
  - Notificación visual de estado

### Cómo Ejecutar Pruebas

1. Abrir DevTools (F12)
2. Ir a la pestaña Console
3. Ejecutar manualmente: `verifyStatsIntegration()`

## 📱 Responsive Design

### Breakpoints

- **Desktop**: > 1200px (Grid completo)
- **Tablet**: 768px - 1200px (Grid adaptativo)
- **Mobile**: < 768px (Stack vertical)
- **Small Mobile**: < 480px (Diseño compacto)

### Características Responsive

- Gráficos que se redimensionan automáticamente
- Navegación adaptativa
- Tablas con scroll horizontal
- KPIs que se apilan verticalmente
- Controles que se reorganizan

## 🚀 Uso

### Acceso al Dashboard

1. Abrir la aplicación Inbound Scope
2. Navegar a "Feedback Tracker" en el sidebar
3. Hacer clic en "Estadísticas" en el submenú
4. El dashboard se cargará automáticamente

### Funcionalidades Interactivas

- **Filtros de Período**: Selector en la parte superior derecha
- **Botón Actualizar**: Recarga los datos más recientes
- **Botón Exportar**: Descarga reporte en formato JSON
- **Toggles de Gráficos**: Cambiar entre tipos de visualización
- **Expansión de Tablas**: Ver todas las filas disponibles

## 🔮 Roadmap Futuro

### Próximas Características

- [ ] Conexión con datos reales del Feedback Tracker
- [ ] Filtros avanzados por usuario, ASIN, tipo de error
- [ ] Alertas automáticas por umbrales
- [ ] Exportación en múltiples formatos (PDF, Excel)
- [ ] Dashboard personalizable (drag & drop)
- [ ] Métricas de tendencias históricas
- [ ] Integración con sistema de notificaciones

### Mejoras Técnicas

- [ ] Service Worker para datos offline
- [ ] Web Workers para cálculos pesados
- [ ] Compresión de datos para mejor performance
- [ ] Tests automatizados (Jest/Cypress)
- [ ] Documentación automática (JSDoc)

## 🤝 Contribución

Para contribuir al desarrollo del dashboard de estadísticas:

1. Seguir la estructura modular existente
2. Mantener compatibilidad con el sistema de temas
3. Agregar tests para nuevas funcionalidades
4. Documentar cambios en este README
5. Asegurar responsive design en todas las nuevas características

---

**Dashboard de Estadísticas v1.0**  
_Integrado perfectamente con Inbound Scope Feedback Tracker_

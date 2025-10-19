# Activity Scope - Aplicación de Análisis de Actividad

## 📋 Descripción

Activity Scope es una aplicación modular que proporciona análisis detallados de la actividad de usuarios en el almacén. La aplicación está estructurada como un contenedor que maneja múltiples vistas especializadas.

## 🏗️ Estructura

```
activity-scope/
├── views/
│   ├── activity-scope.html      # Contenedor principal (punto de entrada)
│   ├── user-activity.html       # Vista de actividad en tiempo real
│   ├── user-history.html        # Vista de historial de usuarios
│   └── carts-data.html          # Vista de análisis de carritos
├── js/
│   ├── activity-scope.js        # Controlador principal de navegación
│   ├── user-activity.js         # Controlador de actividad de usuarios
│   ├── user-history.js          # Controlador de historial
│   └── carts-data.js            # Controlador de datos de carritos
└── css/
    └── activity-scope.css       # Estilos específicos de la aplicación
```

## 🚀 Funcionalidades

### 1. User Activity (`user-activity.html`)

- **Monitoreo en tiempo real** de actividad de usuarios
- **Métricas principales**: usuarios activos, stows totales, promedio por hora, eficiencia
- **Filtros**: por usuario, fecha, turno
- **Gráficos**: actividad por hora, top performers
- **Tabla detallada** con información de usuarios

### 2. User History (`user-history.html`)

- **Historial detallado** de actividad de usuarios
- **Filtros avanzados**: rango de fechas, usuario, turno
- **Resumen del período** seleccionado
- **Gráficos de tendencias**: rendimiento, actividad diaria, distribución de eficiencia
- **Paginación** para manejar grandes volúmenes de datos
- **Modal de detalles** para información específica del usuario

### 3. Carts Data (`carts-data.html`)

- **Análisis de carritos** y distribución de peso
- **Métricas de carritos**: total, peso promedio, items, eficiencia de carga
- **Filtros**: por usuario, fecha, rango de peso
- **Gráficos especializados**: distribución de peso, carritos por hora, top usuarios
- **Análisis de tendencias** con recomendaciones automáticas
- **Vistas alternativas**: por peso o por eficiencia

## 🔧 Navegación

La aplicación utiliza un sistema de navegación basado en parámetros URL:

- `?view=user-activity` - Vista de actividad en tiempo real (por defecto)
- `?view=user-history` - Vista de historial de usuarios
- `?view=carts-data` - Vista de datos de carritos

## 📊 Fuentes de Datos

La aplicación está diseñada para conectarse a las siguientes bases de datos:

1. **Roster_VLC1.db** - Información de empleados
2. **Stow_Rates.db** - Tasas de stow y rendimiento
3. **Analisis_Cart_User.db** - Análisis de carritos y peso

## 🎨 Diseño

- **Tema consistente** con el resto de la aplicación IB Scope
- **Responsive design** para diferentes tamaños de pantalla
- **Modo oscuro** compatible
- **Componentes reutilizables** (métricas, gráficos, tablas)
- **Animaciones suaves** y transiciones

## 🔌 Integración

La aplicación se integra con:

- **Sistema de navegación** del sidebar principal
- **Sistema de temas** global
- **APIs de Electron** para acceso a bases de datos
- **Sistema de notificaciones** para feedback del usuario

## 📝 Uso

1. **Acceso**: A través del sidebar → Activity Scope
2. **Navegación**: Los submenús permiten acceder a cada vista específica
3. **Filtros**: Utilizar los controles de filtro para personalizar la vista
4. **Exportación**: Botones de exportación disponibles en cada vista
5. **Detalles**: Hacer clic en elementos de tabla para ver información detallada

## 🚧 Estado de Desarrollo

- ✅ **Estructura base** implementada
- ✅ **Navegación** entre vistas funcional
- ✅ **Interfaces de usuario** completas
- ✅ **Controladores JavaScript** básicos
- 🔄 **Integración con bases de datos** (pendiente)
- 🔄 **Gráficos interactivos** (pendiente - ECharts)
- 🔄 **Optimización de rendimiento** (pendiente)

## 🔮 Próximas Mejoras

- Implementación de gráficos interactivos con ECharts
- Conexión real con las bases de datos
- Sistema de caché para mejorar rendimiento
- Notificaciones en tiempo real
- Exportación a diferentes formatos (PDF, Excel)
- Dashboard personalizable

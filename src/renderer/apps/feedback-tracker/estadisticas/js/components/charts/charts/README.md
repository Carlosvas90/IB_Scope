# Gráficos Modulares - Sistema de Estadísticas

Este directorio contiene todos los gráficos individuales del sistema de estadísticas, organizados de forma modular para facilitar el mantenimiento y desarrollo.

## 🏗️ Estructura

Cada gráfico tiene su propio archivo JavaScript independiente:

```
charts/
├── index.js              # Exportaciones y factory functions
├── TrendChart.js         # Gráficos de tendencias temporales
├── StatusChart.js        # Gráficos de distribución por estado
├── HourlyChart.js        # Gráficos de errores por hora
├── TopChart.js           # Gráficos de rankings y elementos top
└── README.md            # Esta documentación
```

## 📊 Tipos de Gráficos

### 1. TrendChart

**Archivo**: `TrendChart.js`
**Propósito**: Mostrar tendencias temporales de errores
**Tipos soportados**: `line`, `bar`, `area`

```javascript
import { TrendChart } from "./charts/TrendChart.js";

const chart = new TrendChart("trend-container", {
  title: "Tendencias de Errores",
  chartType: "line",
});

await chart.render({
  dates: ["2024-01-01", "2024-01-02", "2024-01-03"],
  series: [
    { name: "Total", data: [10, 15, 8] },
    { name: "Críticos", data: [2, 5, 1] },
  ],
});
```

### 2. StatusChart

**Archivo**: `StatusChart.js`
**Propósito**: Mostrar distribución por estado/categoría
**Tipos soportados**: `doughnut`, `pie`, `bar`

```javascript
import { StatusChart } from "./charts/StatusChart.js";

const chart = new StatusChart("status-container", {
  title: "Distribución por Estado",
  chartType: "doughnut",
});

await chart.render([
  { name: "Resueltos", value: 45 },
  { name: "Pendientes", value: 30 },
  { name: "En Progreso", value: 25 },
]);
```

### 3. HourlyChart

**Archivo**: `HourlyChart.js`
**Propósito**: Mostrar distribución de errores por hora del día
**Tipos soportados**: `bar`, `line`, `area`

```javascript
import { HourlyChart } from "./charts/HourlyChart.js";

const chart = new HourlyChart("hourly-container", {
  title: "Errores por Hora",
  chartType: "bar",
  showAverage: true,
});

// Array de 24 elementos (una por cada hora)
await chart.render([
  5, 3, 2, 1, 0, 1, 8, 15, 22, 25, 18, 12, 16, 20, 14, 10, 8, 6, 4, 3, 2, 1, 1,
  2,
]);
```

### 4. TopChart

**Archivo**: `TopChart.js`
**Propósito**: Mostrar rankings y elementos top
**Tipos soportados**: `bar`, `horizontalBar`, `pie`

```javascript
import { TopChart } from "./charts/TopChart.js";

const chart = new TopChart("top-container", {
  title: "Top Usuarios",
  chartType: "horizontalBar",
  maxItems: 10,
});

await chart.render([
  { name: "Usuario A", value: 45 },
  { name: "Usuario B", value: 32 },
  { name: "Usuario C", value: 28 },
]);
```

## 🔧 Uso con Factory Function

Para simplificar el uso, puedes utilizar la función factory:

```javascript
import { createChart, CHART_TYPES } from "./charts/index.js";

// Crear diferentes tipos de gráficos
const trendChart = createChart(CHART_TYPES.TREND, "container1");
const statusChart = createChart(CHART_TYPES.STATUS, "container2");
const hourlyChart = createChart(CHART_TYPES.HOURLY, "container3");
const topChart = createChart(CHART_TYPES.TOP, "container4");
```

## ⚡ Características

### Todas las clases incluyen:

- **Validación de datos**: Verificación automática de formato
- **Responsive**: Se adaptan automáticamente al tamaño del contenedor
- **Temas**: Soporte para temas claro y oscuro
- **Eventos**: Eventos personalizados para interacciones
- **Exportación**: Capacidad de exportar como imagen
- **Cambio dinámico**: Cambiar tipo de gráfico sin recrear
- **Estadísticas**: Cálculo automático de métricas

### Métodos comunes:

```javascript
// Renderizar gráfico
await chart.render(data);

// Actualizar datos
await chart.update(newData);

// Cambiar tipo de gráfico
await chart.changeChartType("bar");

// Obtener estadísticas
const stats = chart.getStatistics();

// Cambiar tema
chart.setTheme("dark");

// Exportar como imagen
await chart.export("png");

// Destruir gráfico
chart.destroy();
```

### Eventos disponibles:

```javascript
// Escuchar eventos
chart.on("click", (data) => console.log("Clicked:", data));
chart.on("hover", (data) => console.log("Hovered:", data));
chart.on("rendered", () => console.log("Chart rendered"));
chart.on("error", (error) => console.log("Error:", error));
```

## 🔄 Compatibilidad

Para mantener compatibilidad con código existente, se proporcionan alias:

```javascript
// Nuevos nombres (recomendado)
import {
  TrendChart,
  StatusChart,
  HourlyChart,
  TopChart,
} from "./charts/index.js";

// Nombres antiguos (compatibilidad)
import {
  StatusDistributionChart,
  HourlyErrorsChart,
  TopProductsChart,
  UserRankingChart,
} from "./charts/index.js";
```

## 🛠️ Extensión

Para crear un nuevo tipo de gráfico:

1. **Crear archivo**: `MiNuevoChart.js`
2. **Extender BaseChart**: `class MiNuevoChart extends BaseChart`
3. **Implementar métodos requeridos**:
   - `generateChartOptions(data)`
   - `validateData(data)`
4. **Registrar en index.js**
5. **Actualizar ChartRegistry.js**

```javascript
// MiNuevoChart.js
import { BaseChart } from "../BaseChart.js";

export class MiNuevoChart extends BaseChart {
  constructor(containerId, options = {}) {
    super(containerId, "miNuevo", {
      title: "Mi Nuevo Gráfico",
      // opciones por defecto
      ...options,
    });
  }

  generateChartOptions(data) {
    // Implementar lógica específica del gráfico
    return {
      // configuración de ECharts
    };
  }

  validateData(data) {
    // Validar formato de datos
    return { valid: true };
  }
}
```

## 📋 Ventajas de la Estructura Modular

1. **Mantenimiento**: Cada gráfico es independiente y fácil de modificar
2. **Reutilización**: Los gráficos se pueden usar en diferentes contextos
3. **Testing**: Más fácil probar cada tipo por separado
4. **Performance**: Carga bajo demanda (lazy loading)
5. **Escalabilidad**: Fácil agregar nuevos tipos sin afectar existentes
6. **Debugging**: Errores aislados por tipo de gráfico

## 🚀 Migración desde ChartService

Si tienes código usando el antiguo `ChartService`, aquí está la equivalencia:

```javascript
// Antes (ChartService)
chartService.initTrendChart("container", data);
chartService.initStatusChart("container", data);
chartService.initHourlyChart("container", data);

// Ahora (Modular)
const trendChart = new TrendChart("container");
await trendChart.render(data);

const statusChart = new StatusChart("container");
await statusChart.render(data);

const hourlyChart = new HourlyChart("container");
await hourlyChart.render(data);
```

La nueva estructura ofrece mayor control, mejor performance y código más limpio y mantenible.

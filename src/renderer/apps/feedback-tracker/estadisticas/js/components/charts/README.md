# Sistema Modular de Gráficos

Este directorio contiene el nuevo sistema modular de gráficos para el dashboard de estadísticas. Cada gráfico es un archivo independiente que se puede agregar, modificar o eliminar fácilmente.

## 🏗️ Estructura

```
charts/
├── README.md                    # Este archivo
├── ChartRegistry.js            # Registro central de gráficos
├── BaseChart.js                # Clase base para todos los gráficos
├── charts/                     # Gráficos individuales
│   ├── TrendChart.js          # Gráfico de tendencias temporales
│   ├── StatusDistributionChart.js  # Distribución por estado
│   ├── HourlyErrorsChart.js   # Errores por hora
│   ├── TopProductsChart.js    # Top productos con errores
│   ├── UserRankingChart.js    # Ranking de usuarios
│   └── ProductAnalysisChart.js # Análisis de productos
└── utils/
    ├── ChartThemes.js         # Temas y colores
    ├── ChartHelpers.js        # Funciones auxiliares
    └── ChartValidators.js     # Validadores de datos
```

## 🎯 Características del Sistema

### 1. **Modularidad Total**

- Cada gráfico es completamente independiente
- Se puede agregar/quitar sin afectar otros gráficos
- Configuración individual por gráfico

### 2. **Registro Automático**

- Los gráficos se registran automáticamente
- Sistema de descubrimiento dinámico
- Carga bajo demanda (lazy loading)

### 3. **Configuración Flexible**

- Cada gráfico tiene su propia configuración
- Opciones personalizables por instancia
- Temas aplicables individualmente

### 4. **Fácil Mantenimiento**

- Un archivo = un gráfico
- Debugging simplificado
- Testing individual

## 🚀 Cómo Agregar un Nuevo Gráfico

### Paso 1: Crear el archivo del gráfico

```javascript
// charts/MiNuevoGrafico.js
import { BaseChart } from "../BaseChart.js";

export class MiNuevoGrafico extends BaseChart {
  constructor(container, options = {}) {
    super(container, "mi-nuevo-grafico", options);
  }

  getDefaultConfig() {
    return {
      title: "Mi Nuevo Gráfico",
      type: "line", // line, bar, pie, area, etc.
      refreshInterval: 30000, // 30 segundos
      exportable: true,
      responsive: true,
    };
  }

  async fetchData() {
    // Lógica para obtener datos
    return {
      labels: ["Ene", "Feb", "Mar"],
      datasets: [
        {
          label: "Serie 1",
          data: [10, 20, 30],
        },
      ],
    };
  }

  processData(rawData) {
    // Procesar datos si es necesario
    return rawData;
  }

  getChartOptions() {
    return {
      // Opciones específicas de ECharts
      title: {
        text: this.config.title,
      },
    };
  }
}
```

### Paso 2: Registrar el gráfico

El gráfico se registra automáticamente al importarlo en el `ChartRegistry.js`.

### Paso 3: Usar el gráfico

```javascript
import { ChartRegistry } from "./ChartRegistry.js";

// Crear instancia
const miGrafico = ChartRegistry.create("mi-nuevo-grafico", containerElement, {
  title: "Título Personalizado",
});

// Renderizar
await miGrafico.render();
```

## 🎨 Sistema de Temas

Cada gráfico puede usar temas predefinidos o personalizados:

```javascript
// Aplicar tema
miGrafico.applyTheme("dark");

// Tema personalizado
miGrafico.applyTheme({
  backgroundColor: "#1a1a1a",
  textColor: "#ffffff",
  primaryColor: "#4381b3",
});
```

## 🔧 Configuración Avanzada

### Opciones Globales

```javascript
// ChartRegistry configuración global
ChartRegistry.setGlobalConfig({
  defaultTheme: "light",
  autoRefresh: true,
  refreshInterval: 60000,
  errorHandling: "graceful",
});
```

### Opciones por Gráfico

```javascript
const grafico = ChartRegistry.create("trend-chart", container, {
  refreshInterval: 10000, // Actualizar cada 10 segundos
  showLegend: false, // Ocultar leyenda
  exportFormats: ["png", "svg"], // Formatos de exportación
  responsive: true, // Responsive automático
  lazyLoad: true, // Carga bajo demanda
});
```

## 📊 Gráficos Disponibles

### 1. TrendChart

- **Archivo**: `charts/TrendChart.js`
- **Tipo**: Línea temporal
- **Datos**: Errores a lo largo del tiempo
- **Configuración**: Período, granularidad, múltiples series

### 2. StatusDistributionChart

- **Archivo**: `charts/StatusDistributionChart.js`
- **Tipo**: Dona/Pastel
- **Datos**: Distribución de estados de errores
- **Configuración**: Tipo (dona/pastel), colores personalizados

### 3. HourlyErrorsChart

- **Archivo**: `charts/HourlyErrorsChart.js`
- **Tipo**: Barras
- **Datos**: Errores por hora del día
- **Configuración**: Formato 12/24h, agrupación

### 4. TopProductsChart

- **Archivo**: `charts/TopProductsChart.js`
- **Tipo**: Barras horizontales
- **Datos**: Productos con más errores
- **Configuración**: Límite de productos, ordenamiento

### 5. UserRankingChart

- **Archivo**: `charts/UserRankingChart.js`
- **Tipo**: Tabla interactiva
- **Datos**: Ranking de usuarios por rendimiento
- **Configuración**: Métricas, ordenamiento, paginación

### 6. ProductAnalysisChart

- **Archivo**: `charts/ProductAnalysisChart.js`
- **Tipo**: Tabla con gráficos embebidos
- **Datos**: Análisis detallado por producto
- **Configuración**: Columnas visibles, filtros

## 🧪 Testing

Cada gráfico incluye sus propios tests:

```javascript
// charts/TrendChart.test.js
import { TrendChart } from "./TrendChart.js";

describe("TrendChart", () => {
  test("debe renderizar correctamente", async () => {
    const container = document.createElement("div");
    const chart = new TrendChart(container);
    await chart.render();
    expect(chart.isRendered()).toBe(true);
  });
});
```

## 🔄 Migración desde ChartManager

Para migrar desde el sistema anterior:

1. **Identificar gráficos existentes** en `ChartManager.js`
2. **Crear archivos individuales** para cada gráfico
3. **Actualizar referencias** en el controlador principal
4. **Probar funcionamiento** individual

## 📈 Beneficios del Sistema Modular

### ✅ Ventajas

- **Mantenimiento**: Cada gráfico es independiente
- **Escalabilidad**: Fácil agregar nuevos gráficos
- **Testing**: Tests específicos por gráfico
- **Performance**: Carga bajo demanda
- **Colaboración**: Múltiples desarrolladores pueden trabajar simultáneamente
- **Reutilización**: Gráficos reutilizables en otros proyectos

### 🎯 Casos de Uso

- **Desarrollo**: Trabajar en un gráfico específico sin afectar otros
- **Debugging**: Aislar problemas a un gráfico particular
- **Customización**: Personalizar gráficos para clientes específicos
- **A/B Testing**: Probar diferentes versiones de gráficos
- **Performance**: Cargar solo los gráficos necesarios

## 🚀 Roadmap

### Fase 1: Migración Base

- [ ] Crear estructura de archivos
- [ ] Implementar BaseChart y ChartRegistry
- [ ] Migrar gráfico de tendencias
- [ ] Migrar distribución de estados

### Fase 2: Gráficos Avanzados

- [ ] Migrar todos los gráficos existentes
- [ ] Implementar sistema de temas
- [ ] Agregar validadores de datos
- [ ] Implementar carga bajo demanda

### Fase 3: Características Avanzadas

- [ ] Sistema de plugins
- [ ] Gráficos personalizables por usuario
- [ ] Exportación avanzada
- [ ] Integración con sistema de alertas

---

**Sistema Modular de Gráficos v1.0**  
_Flexibilidad y mantenibilidad para el dashboard de estadísticas_

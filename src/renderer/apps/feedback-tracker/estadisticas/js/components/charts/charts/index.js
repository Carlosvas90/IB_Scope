/**
 * index.js
 * Archivo índice que exporta todos los gráficos modulares
 * Facilita las importaciones y mantiene compatibilidad
 */

// Gráficos principales modernos
export { TrendChart } from "./TrendChart.js";
export { StatusChart } from "./StatusChart.js";
export { HourlyChart } from "./HourlyChart.js";
export { TopChart } from "./TopChart.js";

// Alias para compatibilidad con nombres anteriores
export { StatusChart as StatusDistributionChart } from "./StatusChart.js";
export { HourlyChart as HourlyErrorsChart } from "./HourlyChart.js";
export { TopChart as TopProductsChart } from "./TopChart.js";
export { TopChart as UserRankingChart } from "./TopChart.js";
export { TopChart as ProductAnalysisChart } from "./TopChart.js";

// Factory function para crear gráficos por tipo
export function createChart(type, containerId, options = {}) {
  const chartTypes = {
    trend: TrendChart,
    status: StatusChart,
    hourly: HourlyChart,
    top: TopChart,
    // Alias
    statusdistribution: StatusChart,
    hourlyerrors: HourlyChart,
    topproducts: TopChart,
    userranking: TopChart,
    productanalysis: TopChart,
  };

  const ChartClass = chartTypes[type.toLowerCase()];
  if (!ChartClass) {
    throw new Error(`Tipo de gráfico '${type}' no reconocido`);
  }

  return new ChartClass(containerId, options);
}

// Lista de todos los tipos disponibles
export const CHART_TYPES = {
  TREND: "trend",
  STATUS: "status",
  HOURLY: "hourly",
  TOP: "top",
};

// Configuraciones por defecto para cada tipo
export const DEFAULT_CONFIGS = {
  [CHART_TYPES.TREND]: {
    title: "Tendencias de Errores",
    chartType: "line",
    supportedTypes: ["line", "bar", "area"],
  },
  [CHART_TYPES.STATUS]: {
    title: "Distribución por Estado",
    chartType: "doughnut",
    supportedTypes: ["doughnut", "pie", "bar"],
  },
  [CHART_TYPES.HOURLY]: {
    title: "Errores por Hora del Día",
    chartType: "bar",
    supportedTypes: ["bar", "line", "area"],
  },
  [CHART_TYPES.TOP]: {
    title: "Top Elementos",
    chartType: "horizontalBar",
    supportedTypes: ["bar", "horizontalBar", "pie"],
  },
};

console.log(
  "📊 Módulo de gráficos cargado - Tipos disponibles:",
  Object.keys(CHART_TYPES)
);

/**
 * HourlyErrorsChart.js
 * Gráfico especializado para mostrar errores por hora
 * Alias para HourlyChart para compatibilidad
 */

import { HourlyChart } from "./HourlyChart.js";

export class HourlyErrorsChart extends HourlyChart {
  constructor(containerId, options = {}) {
    super(containerId, {
      title: "Errores por Hora",
      ...options,
    });
    console.log(
      `⏰ HourlyErrorsChart inicializado para container: ${containerId}`
    );
  }
}

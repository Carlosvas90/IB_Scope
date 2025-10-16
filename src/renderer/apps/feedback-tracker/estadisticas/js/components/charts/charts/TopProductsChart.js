/**
 * TopProductsChart.js
 * Gráfico especializado para mostrar top productos
 * Alias para TopChart para compatibilidad
 */

import { TopChart } from "./TopChart.js";

export class TopProductsChart extends TopChart {
  constructor(containerId, options = {}) {
    super(containerId, {
      title: "Top Productos",
      ...options,
    });
    console.log(
      `📦 TopProductsChart inicializado para container: ${containerId}`
    );
  }
}

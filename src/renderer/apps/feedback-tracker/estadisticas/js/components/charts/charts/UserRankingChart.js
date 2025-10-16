/**
 * UserRankingChart.js
 * Gráfico especializado para mostrar ranking de usuarios
 * Alias para TopChart para compatibilidad
 */

import { TopChart } from "./TopChart.js";

export class UserRankingChart extends TopChart {
  constructor(containerId, options = {}) {
    super(containerId, {
      title: "Ranking de Usuarios",
      ...options,
    });
    console.log(
      `👥 UserRankingChart inicializado para container: ${containerId}`
    );
  }
}

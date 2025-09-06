/**
 * KPIManager.js
 * Gestor centralizado para todos los componentes KPI
 */

import { TotalErrorsKPI } from "./TotalErrorsKPI.js";
import { PendingErrorsKPI } from "./PendingErrorsKPI.js";
import { ResolvedErrorsKPI } from "./ResolvedErrorsKPI.js";

export class KPIManager {
  constructor() {
    // Inicializar componentes KPI
    this.totalErrorsKPI = new TotalErrorsKPI();
    this.pendingErrorsKPI = new PendingErrorsKPI();
    this.resolvedErrorsKPI = new ResolvedErrorsKPI();

    console.log("📊 KPIManager inicializado con todos los componentes KPI");
  }

  /**
   * Actualiza todos los KPIs con los datos proporcionados
   * @param {Object} data - Datos procesados para los KPIs
   * @param {number} data.totalErrors - Total de errores
   * @param {number} data.pendingErrors - Errores pendientes
   * @param {number} data.resolvedErrors - Errores resueltos
   * @param {number} data.resolutionRate - Tasa de resolución
   * @param {number} data.dailyAverage - Promedio diario
   */
  updateAll(data) {
    if (!data) {
      console.warn("❌ No hay datos para actualizar los KPIs");
      return;
    }

    console.log("🔄 Actualizando todos los KPIs con datos:", data);

    // Actualizar KPI de Total de Errores (incluye promedio diario)
    this.totalErrorsKPI.update({
      totalErrors: data.totalErrors,
      dailyAverage: data.dailyAverage,
    });

    // Actualizar KPI de Errores Pendientes (incluye tasa de resolución)
    this.pendingErrorsKPI.update({
      pendingErrors: data.pendingErrors,
      resolutionRate: data.resolutionRate,
    });

    // Actualizar KPI de Errores Resueltos
    this.resolvedErrorsKPI.update({
      resolvedErrors: data.resolvedErrors,
    });

    console.log("✅ Todos los KPIs actualizados correctamente");
  }

  /**
   * Establece el estado de carga para todos los KPIs
   * @param {boolean} isLoading - Si está cargando o no
   */
  setLoading(isLoading) {
    this.totalErrorsKPI.setLoading(isLoading);
    this.pendingErrorsKPI.setLoading(isLoading);
    this.resolvedErrorsKPI.setLoading(isLoading);

    console.log(
      `${isLoading ? "⏳" : "✅"} Estado de carga de KPIs: ${
        isLoading ? "Cargando" : "Completado"
      }`
    );
  }
}

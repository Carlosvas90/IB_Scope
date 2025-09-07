/**
 * KPIManager.js
 * Gestor centralizado para todos los componentes KPI
 */

import { TotalErrorsKPI } from "./TotalErrorsKPI.js";
import { PendingErrorsKPI } from "./PendingErrorsKPI.js";
import { ResolvedErrorsKPI } from "./ResolvedErrorsKPI.js";
import { DPMOKPI } from "./DPMOKPI.js";

export class KPIManager {
  constructor() {
    // Inicializar componentes KPI
    this.totalErrorsKPI = new TotalErrorsKPI();
    this.pendingErrorsKPI = new PendingErrorsKPI();
    this.resolvedErrorsKPI = new ResolvedErrorsKPI();
    this.dpmoKPI = new DPMOKPI();

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
   * @param {Object} data.dpmo - Datos de DPMO
   * @param {number} data.dpmo.dpmo - Valor DPMO
   * @param {number} data.dpmo.totalMovimientos - Total de movimientos
   * @param {number} data.dpmo.totalErrores - Total de errores DPMO
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

    // Actualizar KPI de DPMO
    if (data.dpmo) {
      this.dpmoKPI.update({
        dpmo: data.dpmo.dpmo,
        totalMovimientos: data.dpmo.totalMovimientos,
        totalErrores: data.dpmo.totalErrores,
      });
    } else {
      // Si no hay datos DPMO, mostrar mensaje claro
      this.dpmoKPI.updateNoData();
    }

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
    this.dpmoKPI.setLoading(isLoading);

    console.log(
      `${isLoading ? "⏳" : "✅"} Estado de carga de KPIs: ${
        isLoading ? "Cargando" : "Completado"
      }`
    );
  }
}

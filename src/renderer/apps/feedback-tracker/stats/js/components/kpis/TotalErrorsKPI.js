/**
 * TotalErrorsKPI.js
 * Componente KPI para mostrar el total de errores con promedio diario como KPI secundario
 */

export class TotalErrorsKPI {
  constructor() {
    this.kpiElement = document.getElementById("total-errors-kpi");
    this.trendElement = document.getElementById("total-errors-trend");
    this.dailyAvgElement = document.getElementById("daily-avg-kpi");
    this.dailyAvgTrendElement = document.getElementById("daily-avg-trend");

    // Verificar que los elementos existan
    if (!this.kpiElement || !this.trendElement) {
      console.warn("❌ Elementos del KPI Total Errores no encontrados");
    }

    if (!this.dailyAvgElement || !this.dailyAvgTrendElement) {
      console.warn("❌ Elementos del KPI Promedio Diario no encontrados");
    }

    console.log("📊 TotalErrorsKPI inicializado");
  }

  /**
   * Actualiza el KPI con los datos proporcionados
   * @param {Object} data - Datos para actualizar el KPI
   * @param {number} data.totalErrors - Total de errores
   * @param {number} data.dailyAverage - Promedio diario de errores
   * @param {number} data.currentDateRange - Rango de días seleccionado
   */
  update(data) {
    if (!data) return;

    // Actualizar KPI principal: Total de errores
    if (this.kpiElement) {
      this.kpiElement.textContent = data.totalErrors.toLocaleString();
    }

    if (this.trendElement) {
      this.trendElement.className = "kpi-trend neutral";
      this.trendElement.textContent = "Total de errores en el período";
    }

    // Actualizar KPI secundario: Promedio diario
    if (this.dailyAvgElement) {
      this.dailyAvgElement.textContent = data.dailyAverage.toFixed(1);
    }

    if (this.dailyAvgTrendElement) {
      this.dailyAvgTrendElement.className = "kpi-trend neutral";
      this.dailyAvgTrendElement.textContent = "Errores promedio por día";
    }

    console.log("✅ KPI Total Errores actualizado:", {
      total: data.totalErrors,
      dailyAvg: data.dailyAverage,
    });
  }

  /**
   * Establece el estado de carga
   * @param {boolean} isLoading - Si está cargando o no
   */
  setLoading(isLoading) {
    if (isLoading) {
      if (this.kpiElement) this.kpiElement.textContent = "...";
      if (this.trendElement) {
        this.trendElement.className = "kpi-trend neutral loading";
        this.trendElement.textContent = "Cargando...";
      }

      if (this.dailyAvgElement) this.dailyAvgElement.textContent = "...";
      if (this.dailyAvgTrendElement) {
        this.dailyAvgTrendElement.className = "kpi-trend neutral loading";
        this.dailyAvgTrendElement.textContent = "Cargando...";
      }
    } else {
      if (this.trendElement) this.trendElement.classList.remove("loading");
      if (this.dailyAvgTrendElement)
        this.dailyAvgTrendElement.classList.remove("loading");
    }
  }
}

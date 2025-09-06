/**
 * PendingErrorsKPI.js
 * Componente KPI para mostrar los errores pendientes con tasa de resolución como KPI secundario
 */

export class PendingErrorsKPI {
  constructor() {
    this.kpiElement = document.getElementById("pending-errors-kpi");
    this.trendElement = document.getElementById("pending-errors-trend");
    this.resolutionRateElement = document.getElementById("resolution-rate-kpi");
    this.resolutionRateTrendElement = document.getElementById(
      "resolution-rate-trend"
    );

    // Verificar que los elementos existan
    if (!this.kpiElement || !this.trendElement) {
      console.warn("❌ Elementos del KPI Errores Pendientes no encontrados");
    }

    if (!this.resolutionRateElement || !this.resolutionRateTrendElement) {
      console.warn("❌ Elementos del KPI Tasa de Resolución no encontrados");
    }

    console.log("📊 PendingErrorsKPI inicializado");
  }

  /**
   * Actualiza el KPI con los datos proporcionados
   * @param {Object} data - Datos para actualizar el KPI
   * @param {number} data.pendingErrors - Errores pendientes
   * @param {number} data.resolutionRate - Tasa de resolución (porcentaje)
   */
  update(data) {
    if (!data) return;

    // Actualizar KPI principal: Errores pendientes
    if (this.kpiElement) {
      this.kpiElement.textContent = data.pendingErrors.toLocaleString();
    }

    if (this.trendElement) {
      this.trendElement.className = "kpi-trend negative";
      this.trendElement.textContent = "Errores sin resolver";
    }

    // Actualizar KPI secundario: Tasa de resolución
    if (this.resolutionRateElement) {
      this.resolutionRateElement.textContent = `${data.resolutionRate.toFixed(
        1
      )}%`;
    }

    if (this.resolutionRateTrendElement) {
      // Determinar tendencia según el valor
      const resolutionTrend =
        data.resolutionRate > 80
          ? "positive"
          : data.resolutionRate > 60
          ? "neutral"
          : "negative";

      this.resolutionRateTrendElement.className = `kpi-trend ${resolutionTrend}`;
      this.resolutionRateTrendElement.textContent = "Tasa de resolución";
    }

    console.log("✅ KPI Errores Pendientes actualizado:", {
      pending: data.pendingErrors,
      resolutionRate: data.resolutionRate,
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

      if (this.resolutionRateElement)
        this.resolutionRateElement.textContent = "...";
      if (this.resolutionRateTrendElement) {
        this.resolutionRateTrendElement.className = "kpi-trend neutral loading";
        this.resolutionRateTrendElement.textContent = "Cargando...";
      }
    } else {
      if (this.trendElement) this.trendElement.classList.remove("loading");
      if (this.resolutionRateTrendElement)
        this.resolutionRateTrendElement.classList.remove("loading");
    }
  }
}

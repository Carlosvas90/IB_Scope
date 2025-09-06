/**
 * ResolvedErrorsKPI.js
 * Componente KPI para mostrar los errores resueltos
 */

export class ResolvedErrorsKPI {
  constructor() {
    this.kpiElement = document.getElementById("resolved-errors-kpi");
    this.trendElement = document.getElementById("resolved-errors-trend");

    // Verificar que los elementos existan
    if (!this.kpiElement || !this.trendElement) {
      console.warn("❌ Elementos del KPI Errores Resueltos no encontrados");
    }

    console.log("📊 ResolvedErrorsKPI inicializado");
  }

  /**
   * Actualiza el KPI con los datos proporcionados
   * @param {Object} data - Datos para actualizar el KPI
   * @param {number} data.resolvedErrors - Errores resueltos
   */
  update(data) {
    if (!data) return;

    // Actualizar KPI: Errores resueltos
    if (this.kpiElement) {
      this.kpiElement.textContent = data.resolvedErrors.toLocaleString();
    }

    if (this.trendElement) {
      this.trendElement.className = "kpi-trend positive";
      this.trendElement.textContent = "Errores resueltos";
    }

    console.log("✅ KPI Errores Resueltos actualizado:", {
      resolved: data.resolvedErrors,
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
    } else {
      if (this.trendElement) this.trendElement.classList.remove("loading");
    }
  }
}

/**
 * DailyAverageKPI - KPI independiente para mostrar el promedio diario de errores
 */

class DailyAverageKPI {
  constructor() {
    this.containerId = "kpi-daily-average";
    this.valueElementId = "daily-average-value";
    this.statusElement = null;
    this.currentValue = 0;
    this.isInitialized = false;
  }

  /**
   * Inicializa el KPI
   */
  init() {
    try {
      // Ahora el elemento está dentro del KPI de Total Errores como elemento secundario
      const valueElement = document.getElementById(this.valueElementId);

      if (!valueElement) {
        console.error("DailyAverageKPI: Elemento DOM no encontrado");
        return false;
      }

      // Ya no necesitamos el status element para el KPI secundario
      this.statusElement = null;
      this.isInitialized = true;

      // Inicializar con valor vacío
      if (valueElement) {
        valueElement.textContent = "--";
      }

      console.log("DailyAverageKPI: Inicializado correctamente");
      return true;
    } catch (error) {
      console.error("DailyAverageKPI: Error en inicialización:", error);
      return false;
    }
  }

  /**
   * Actualiza el KPI con nuevos datos
   * @param {Array} errors Array de errores
   */
  update(errors) {
    if (!this.isInitialized) {
      console.warn("DailyAverageKPI: KPI no inicializado");
      return;
    }

    try {
      const dailyAverage = this.calculateDailyAverage(errors);
      this.currentValue = dailyAverage;

      // Actualizar valor
      const valueElement = document.getElementById(this.valueElementId);
      if (valueElement) {
        valueElement.textContent = this.formatValue(dailyAverage);
      }

      // Actualizar status
      this.setSuccess(dailyAverage);

      console.log(
        `DailyAverageKPI: Actualizado con ${dailyAverage} errores promedio`
      );
    } catch (error) {
      console.error("DailyAverageKPI: Error al actualizar:", error);
      this.setError("Error al calcular");
    }
  }

  /**
   * Calcula el promedio diario de errores
   * @param {Array} errors Array de errores
   * @returns {number} Promedio diario
   */
  calculateDailyAverage(errors) {
    if (!Array.isArray(errors) || errors.length === 0) {
      return 0;
    }

    // Por ahora solo tenemos datos de hoy, así que el promedio es el total de hoy
    // En el futuro cuando tengamos datos históricos, calcularemos el promedio real
    const totalToday = errors.reduce((total, error) => {
      const quantity = parseInt(error.quantity) || 1;
      return total + quantity;
    }, 0);

    // Simular un promedio basado en datos históricos (placeholder)
    // En producción esto se calculará con datos reales de múltiples días
    return this.estimateAverage(totalToday);
  }

  /**
   * Estima el promedio diario basado en el total de hoy
   * @param {number} todayTotal Total de errores de hoy
   * @returns {number} Promedio estimado
   */
  estimateAverage(todayTotal) {
    // Esta es una estimación temporal
    // En el futuro se reemplazará con cálculos reales usando la BD

    if (todayTotal === 0) return 0;

    // Simular un patrón: el promedio tiende a ser ligeramente menor que los picos
    const estimatedAverage = Math.round(todayTotal * 0.85);
    return estimatedAverage;
  }

  /**
   * Formatea el valor para mostrar
   * @param {number} value Valor a formatear
   * @returns {string} Valor formateado
   */
  formatValue(value) {
    if (value === 0) return "0";
    if (value < 1000) return value.toString();
    if (value < 1000000) return (value / 1000).toFixed(1) + "K";
    return (value / 1000000).toFixed(1) + "M";
  }

  /**
   * Establece estado de carga
   */
  setLoading() {
    const valueElement = document.getElementById(this.valueElementId);
    if (valueElement) {
      valueElement.textContent = "--";
    }

    if (this.statusElement) {
      this.statusElement.textContent = "Cargando...";
      this.statusElement.className = "kpi-status loading";
    }
  }

  /**
   * Establece estado de éxito
   * @param {number} average Promedio calculado
   */
  setSuccess(average) {
    // Como ahora es un KPI secundario, no necesitamos mostrar el estado
    // El valor ya se actualizó en el método update
  }

  /**
   * Establece estado de error
   * @param {string} message Mensaje de error
   */
  setError(message = "Error") {
    const valueElement = document.getElementById(this.valueElementId);
    if (valueElement) {
      valueElement.textContent = "--";
    }

    if (this.statusElement) {
      this.statusElement.textContent = message;
      this.statusElement.className = "kpi-status error";
    }
  }

  /**
   * Obtiene el valor actual
   * @returns {number} Valor actual
   */
  getCurrentValue() {
    return this.currentValue;
  }

  /**
   * Resetea el KPI
   */
  reset() {
    this.currentValue = 0;
    this.setLoading();
  }
}

// Exportar la clase
export { DailyAverageKPI };

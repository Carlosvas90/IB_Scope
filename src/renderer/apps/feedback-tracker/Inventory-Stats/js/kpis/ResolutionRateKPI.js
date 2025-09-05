/**
 * ResolutionRateKPI - KPI independiente para mostrar la tasa de resolución
 */

class ResolutionRateKPI {
  constructor() {
    this.containerId = "kpi-resolution-rate";
    this.valueElementId = "resolution-rate-value";
    this.statusElement = null;
    this.currentValue = 0;
    this.isInitialized = false;
  }

  /**
   * Inicializa el KPI
   */
  init() {
    try {
      const container = document.getElementById(this.containerId);
      const valueElement = document.getElementById(this.valueElementId);

      if (!container || !valueElement) {
        console.error("ResolutionRateKPI: Elementos DOM no encontrados");
        return false;
      }

      this.statusElement = container.querySelector(".kpi-status");
      this.isInitialized = true;
      this.setLoading();

      console.log("ResolutionRateKPI: Inicializado correctamente");
      return true;
    } catch (error) {
      console.error("ResolutionRateKPI: Error en inicialización:", error);
      return false;
    }
  }

  /**
   * Actualiza el KPI con nuevos datos
   * @param {Array} errors Array de errores
   */
  update(errors) {
    if (!this.isInitialized) {
      console.warn("ResolutionRateKPI: KPI no inicializado");
      return;
    }

    try {
      const resolutionRate = this.calculateResolutionRate(errors);
      this.currentValue = resolutionRate;

      // Actualizar valor
      const valueElement = document.getElementById(this.valueElementId);
      if (valueElement) {
        valueElement.textContent = this.formatValue(resolutionRate);
      }

      // Actualizar status
      this.setSuccess(resolutionRate, errors.length);

      console.log(
        `ResolutionRateKPI: Actualizado con ${resolutionRate}% de tasa de resolución`
      );
    } catch (error) {
      console.error("ResolutionRateKPI: Error al actualizar:", error);
      this.setError("Error al calcular");
    }
  }

  /**
   * Calcula la tasa de resolución
   * @param {Array} errors Array de errores
   * @returns {number} Tasa de resolución en porcentaje
   */
  calculateResolutionRate(errors) {
    if (!Array.isArray(errors) || errors.length === 0) {
      return 0;
    }

    // Calcular totales considerando quantities
    let totalErrors = 0;
    let resolvedErrors = 0;

    errors.forEach((error) => {
      const quantity = parseInt(error.quantity) || 1;
      totalErrors += quantity;

      if (error.status === "done") {
        resolvedErrors += quantity;
      }
    });

    if (totalErrors === 0) return 0;

    return Math.round((resolvedErrors / totalErrors) * 100);
  }

  /**
   * Formatea el valor para mostrar
   * @param {number} value Valor a formatear (porcentaje)
   * @returns {string} Valor formateado
   */
  formatValue(value) {
    if (value === 0) return "0%";
    return `${value}%`;
  }

  /**
   * Establece estado de carga
   */
  setLoading() {
    const valueElement = document.getElementById(this.valueElementId);
    if (valueElement) {
      valueElement.textContent = "--%";
    }

    if (this.statusElement) {
      this.statusElement.textContent = "Cargando...";
      this.statusElement.className = "kpi-status loading";
    }
  }

  /**
   * Establece estado de éxito
   * @param {number} rate Tasa de resolución
   * @param {number} totalErrors Total de errores
   */
  setSuccess(rate, totalErrors = 0) {
    if (this.statusElement) {
      if (totalErrors === 0) {
        this.statusElement.textContent = "Sin datos";
        this.statusElement.className = "kpi-status success";
      } else if (rate >= 90) {
        this.statusElement.textContent = "Excelente";
        this.statusElement.className = "kpi-status success";
      } else if (rate >= 70) {
        this.statusElement.textContent = "Bueno";
        this.statusElement.className = "kpi-status success";
      } else if (rate >= 50) {
        this.statusElement.textContent = "Regular";
        this.statusElement.className = "kpi-status warning";
      } else if (rate >= 30) {
        this.statusElement.textContent = "Bajo";
        this.statusElement.className = "kpi-status warning";
      } else {
        this.statusElement.textContent = "Crítico";
        this.statusElement.className = "kpi-status error";
      }
    }
  }

  /**
   * Establece estado de error
   * @param {string} message Mensaje de error
   */
  setError(message = "Error") {
    const valueElement = document.getElementById(this.valueElementId);
    if (valueElement) {
      valueElement.textContent = "--%";
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
export { ResolutionRateKPI };

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
      // Ahora el elemento está dentro del KPI de Errores Pendientes como elemento secundario
      const valueElement = document.getElementById(this.valueElementId);

      if (!valueElement) {
        console.error("ResolutionRateKPI: Elemento DOM no encontrado");
        return false;
      }

      // Ya no necesitamos el status element para el KPI secundario
      this.statusElement = null;
      this.isInitialized = true;

      // Inicializar con valor vacío
      if (valueElement) {
        valueElement.textContent = "--%";
      }

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

      // Usar la misma lógica ampliada que en ResolvedErrorsKPI
      if (
        // Propiedad principal del sistema
        error.feedback_status === "done" ||
        error.feedback_status === "completed" ||
        // Status alternativos por compatibilidad
        error.status === "done" ||
        error.status === "completed" ||
        error.status === 1 ||
        error.status === "1" ||
        // Propiedades adicionales
        error.resolved === true ||
        error.resolved === "true" ||
        error.resolved === 1 ||
        error.resolved === "1" ||
        error.is_resolved === true ||
        error.is_resolved === "true" ||
        error.is_resolved === 1 ||
        error.is_resolved === "1" ||
        // Fechas de resolución (incluyendo feedback_date)
        (error.feedback_date && error.feedback_date !== "") ||
        (error.done_date && error.done_date !== "") ||
        (error.resolved_date && error.resolved_date !== "")
      ) {
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

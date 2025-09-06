/**
 * PendingErrorsKPI - KPI independiente para mostrar errores pendientes
 */

class PendingErrorsKPI {
  constructor() {
    this.containerId = "kpi-pending-errors";
    this.valueElementId = "pending-errors-value";
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
        console.error("PendingErrorsKPI: Elementos DOM no encontrados");
        return false;
      }

      this.statusElement = container.querySelector(".kpi-status");
      this.isInitialized = true;
      this.setLoading();

      console.log("PendingErrorsKPI: Inicializado correctamente");
      return true;
    } catch (error) {
      console.error("PendingErrorsKPI: Error en inicialización:", error);
      return false;
    }
  }

  /**
   * Actualiza el KPI con nuevos datos
   * @param {Array} errors Array de errores
   */
  update(errors) {
    if (!this.isInitialized) {
      console.warn("PendingErrorsKPI: KPI no inicializado");
      return;
    }

    try {
      const pendingErrors = this.calculatePending(errors);
      this.currentValue = pendingErrors;

      // Actualizar valor
      const valueElement = document.getElementById(this.valueElementId);
      if (valueElement) {
        valueElement.textContent = this.formatValue(pendingErrors);
      }

      // Actualizar status
      this.setSuccess(pendingErrors);

      console.log(
        `PendingErrorsKPI: Actualizado con ${pendingErrors} errores pendientes`
      );
    } catch (error) {
      console.error("PendingErrorsKPI: Error al actualizar:", error);
      this.setError("Error al calcular");
    }
  }

  /**
   * Calcula los errores pendientes
   * @param {Array} errors Array de errores
   * @returns {number} Total de errores pendientes
   */
  calculatePending(errors) {
    if (!Array.isArray(errors)) {
      return 0;
    }

    return errors.reduce((total, error) => {
      // Verificar si el error NO está resuelto (inverso de la lógica en ResolvedErrorsKPI)
      if (
        // No tiene status conocido de resuelto
        error.status !== "done" &&
        error.status !== "completed" &&
        error.status !== 1 &&
        error.status !== "1" &&
        // No tiene propiedades alternativas de resuelto
        error.resolved !== true &&
        error.resolved !== "true" &&
        error.resolved !== 1 &&
        error.resolved !== "1" &&
        error.is_resolved !== true &&
        error.is_resolved !== "true" &&
        error.is_resolved !== 1 &&
        error.is_resolved !== "1" &&
        // No tiene fechas de resolución
        !(error.done_date && error.done_date !== "") &&
        !(error.resolved_date && error.resolved_date !== "")
      ) {
        const quantity = parseInt(error.quantity) || 1;
        return total + quantity;
      }
      return total;
    }, 0);
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
   * @param {number} value Valor calculado
   */
  setSuccess(value) {
    if (this.statusElement) {
      if (value === 0) {
        this.statusElement.textContent = "Todos resueltos";
        this.statusElement.className = "kpi-status success";
      } else if (value > 50) {
        this.statusElement.textContent = "Requiere atención";
        this.statusElement.className = "kpi-status warning";
      } else {
        this.statusElement.textContent = "En proceso";
        this.statusElement.className = "kpi-status warning";
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
export { PendingErrorsKPI };

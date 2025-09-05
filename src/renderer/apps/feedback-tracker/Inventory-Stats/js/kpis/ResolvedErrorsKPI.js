/**
 * ResolvedErrorsKPI - KPI independiente para mostrar errores resueltos
 */

class ResolvedErrorsKPI {
  constructor() {
    this.containerId = "kpi-resolved-errors";
    this.valueElementId = "resolved-errors-value";
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
        console.error("ResolvedErrorsKPI: Elementos DOM no encontrados");
        return false;
      }

      this.statusElement = container.querySelector(".kpi-status");
      this.isInitialized = true;
      this.setLoading();

      console.log("ResolvedErrorsKPI: Inicializado correctamente");
      return true;
    } catch (error) {
      console.error("ResolvedErrorsKPI: Error en inicialización:", error);
      return false;
    }
  }

  /**
   * Actualiza el KPI con nuevos datos
   * @param {Array} errors Array de errores
   */
  update(errors) {
    if (!this.isInitialized) {
      console.warn("ResolvedErrorsKPI: KPI no inicializado");
      return;
    }

    try {
      const resolvedErrors = this.calculateResolved(errors);
      this.currentValue = resolvedErrors;

      // Actualizar valor
      const valueElement = document.getElementById(this.valueElementId);
      if (valueElement) {
        valueElement.textContent = this.formatValue(resolvedErrors);
      }

      // Actualizar status
      this.setSuccess(resolvedErrors, errors.length);

      console.log(
        `ResolvedErrorsKPI: Actualizado con ${resolvedErrors} errores resueltos`
      );
    } catch (error) {
      console.error("ResolvedErrorsKPI: Error al actualizar:", error);
      this.setError("Error al calcular");
    }
  }

  /**
   * Calcula los errores resueltos
   * @param {Array} errors Array de errores
   * @returns {number} Total de errores resueltos
   */
  calculateResolved(errors) {
    if (!Array.isArray(errors)) {
      return 0;
    }

    return errors.reduce((total, error) => {
      // Solo contar errores marcados como 'done'
      if (error.status === "done") {
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
   * @param {number} resolvedValue Errores resueltos
   * @param {number} totalErrors Total de errores
   */
  setSuccess(resolvedValue, totalErrors = 0) {
    if (this.statusElement) {
      if (totalErrors === 0) {
        this.statusElement.textContent = "Sin datos";
        this.statusElement.className = "kpi-status success";
      } else if (resolvedValue === 0) {
        this.statusElement.textContent = "Ninguno resuelto";
        this.statusElement.className = "kpi-status warning";
      } else {
        const percentage = Math.round((resolvedValue / totalErrors) * 100);
        this.statusElement.textContent = `${percentage}% del total`;

        if (percentage >= 80) {
          this.statusElement.className = "kpi-status success";
        } else if (percentage >= 50) {
          this.statusElement.className = "kpi-status warning";
        } else {
          this.statusElement.className = "kpi-status error";
        }
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
export { ResolvedErrorsKPI };

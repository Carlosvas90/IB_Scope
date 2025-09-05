/**
 * TotalErrorsKPI - KPI independiente para mostrar el total de errores
 */

class TotalErrorsKPI {
  constructor() {
    this.containerId = "kpi-total-errors";
    this.valueElementId = "total-errors-value";
    this.statusElementId = null; // Buscaremos el elemento de status
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
        console.error("TotalErrorsKPI: Elementos DOM no encontrados");
        return false;
      }

      // Buscar elemento de status dentro del contenedor
      this.statusElement = container.querySelector(".kpi-status");

      this.isInitialized = true;
      this.setLoading();

      console.log("TotalErrorsKPI: Inicializado correctamente");
      return true;
    } catch (error) {
      console.error("TotalErrorsKPI: Error en inicialización:", error);
      return false;
    }
  }

  /**
   * Actualiza el KPI con nuevos datos
   * @param {Array} errors Array de errores
   */
  update(errors) {
    if (!this.isInitialized) {
      console.warn("TotalErrorsKPI: KPI no inicializado");
      return;
    }

    try {
      const totalErrors = this.calculateTotal(errors);
      this.currentValue = totalErrors;

      // Actualizar valor
      const valueElement = document.getElementById(this.valueElementId);
      if (valueElement) {
        valueElement.textContent = this.formatValue(totalErrors);
      }

      // Actualizar status
      this.setSuccess(totalErrors);

      console.log(`TotalErrorsKPI: Actualizado con ${totalErrors} errores`);
    } catch (error) {
      console.error("TotalErrorsKPI: Error al actualizar:", error);
      this.setError("Error al calcular");
    }
  }

  /**
   * Calcula el total de errores
   * @param {Array} errors Array de errores
   * @returns {number} Total de errores
   */
  calculateTotal(errors) {
    if (!Array.isArray(errors)) {
      return 0;
    }

    // Suma tanto la cantidad de registros como las cantidades individuales
    return errors.reduce((total, error) => {
      const quantity = parseInt(error.quantity) || 1;
      return total + quantity;
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
        this.statusElement.textContent = "Sin errores hoy";
        this.statusElement.className = "kpi-status success";
      } else {
        this.statusElement.textContent = "Actualizado";
        this.statusElement.className = "kpi-status success";
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
export { TotalErrorsKPI };

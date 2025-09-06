/**
 * DPMOKPI - KPI independiente para mostrar el DPMO (Defectos Por Millón de Oportunidades)
 */

class DPMOKPI {
  constructor() {
    this.containerId = "kpi-dpmo";
    this.valueElementId = "dpmo-value";
    this.totalMovimientosElementId = "total-movimientos-value";
    this.totalErroresElementId = "total-errores-dpmo-value";
    this.statusElement = null;
    this.currentValue = 0;
    this.isInitialized = false;
    this.dpmoData = null;
  }

  /**
   * Inicializa el KPI
   */
  init() {
    try {
      const container = document.getElementById(this.containerId);
      const valueElement = document.getElementById(this.valueElementId);
      const totalMovimientosElement = document.getElementById(
        this.totalMovimientosElementId
      );
      const totalErroresElement = document.getElementById(
        this.totalErroresElementId
      );

      if (
        !container ||
        !valueElement ||
        !totalMovimientosElement ||
        !totalErroresElement
      ) {
        console.error("DPMOKPI: Elementos DOM no encontrados");
        return false;
      }

      this.statusElement = container.querySelector(".kpi-status");
      this.isInitialized = true;
      this.setLoading();

      console.log("DPMOKPI: Inicializado correctamente");
      return true;
    } catch (error) {
      console.error("DPMOKPI: Error en inicialización:", error);
      return false;
    }
  }

  /**
   * Actualiza el KPI con nuevos datos
   * @param {Object} dpmoData Datos de DPMO
   */
  update(dpmoData) {
    if (!this.isInitialized) {
      console.warn("DPMOKPI: KPI no inicializado");
      return;
    }

    try {
      if (!dpmoData) {
        this.setError("No hay datos disponibles");
        return;
      }

      this.dpmoData = dpmoData;

      // Extraer valores
      const dpmo = dpmoData.dpmo || 0;
      const totalMovimientos = dpmoData.total_movimientos || 0;
      const totalErrores = dpmoData.total_errores || 0;

      this.currentValue = dpmo;

      // Actualizar valores
      const valueElement = document.getElementById(this.valueElementId);
      const totalMovimientosElement = document.getElementById(
        this.totalMovimientosElementId
      );
      const totalErroresElement = document.getElementById(
        this.totalErroresElementId
      );

      if (valueElement) {
        valueElement.textContent = this.formatValue(dpmo);
      }

      if (totalMovimientosElement) {
        totalMovimientosElement.textContent =
          this.formatLargeNumber(totalMovimientos);
      }

      if (totalErroresElement) {
        totalErroresElement.textContent = this.formatLargeNumber(totalErrores);
      }

      // Actualizar status
      this.setSuccess(dpmo);

      console.log(
        `DPMOKPI: Actualizado con DPMO=${dpmo}, Movimientos=${totalMovimientos}, Errores=${totalErrores}`
      );
    } catch (error) {
      console.error("DPMOKPI: Error al actualizar:", error);
      this.setError("Error al calcular");
    }
  }

  /**
   * Formatea el valor DPMO para mostrar (sin decimales)
   * @param {number} value Valor a formatear
   * @returns {string} Valor formateado
   */
  formatValue(value) {
    if (value === 0) return "0";
    // Redondear a entero y formatear con separadores de miles
    return Math.round(value).toLocaleString("es-ES");
  }

  /**
   * Formatea números para mostrar siempre el valor completo sin abreviar
   * @param {number} value Valor a formatear
   * @returns {string} Valor formateado
   */
  formatLargeNumber(value) {
    if (value === 0) return "0";
    // Mostrar siempre el número completo con separadores de miles
    return value.toLocaleString("es-ES");
  }

  /**
   * Establece estado de carga
   */
  setLoading() {
    const valueElement = document.getElementById(this.valueElementId);
    const totalMovimientosElement = document.getElementById(
      this.totalMovimientosElementId
    );
    const totalErroresElement = document.getElementById(
      this.totalErroresElementId
    );

    if (valueElement) {
      valueElement.textContent = "--";
    }

    if (totalMovimientosElement) {
      totalMovimientosElement.textContent = "--";
    }

    if (totalErroresElement) {
      totalErroresElement.textContent = "--";
    }

    if (this.statusElement) {
      this.statusElement.textContent = "Cargando...";
      this.statusElement.className = "kpi-status loading";
    }
  }

  /**
   * Establece estado de éxito
   * @param {number} dpmo Valor DPMO
   */
  setSuccess(dpmo) {
    if (this.statusElement) {
      if (dpmo === 0) {
        this.statusElement.textContent = "Perfecto";
        this.statusElement.className = "kpi-status success";
      } else if (dpmo <= 3400) {
        this.statusElement.textContent = "Excelente";
        this.statusElement.className = "kpi-status success";
      } else if (dpmo <= 10000) {
        this.statusElement.textContent = "Bueno";
        this.statusElement.className = "kpi-status success";
      } else if (dpmo <= 30000) {
        this.statusElement.textContent = "Regular";
        this.statusElement.className = "kpi-status warning";
      } else if (dpmo <= 66800) {
        this.statusElement.textContent = "Deficiente";
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
    const totalMovimientosElement = document.getElementById(
      this.totalMovimientosElementId
    );
    const totalErroresElement = document.getElementById(
      this.totalErroresElementId
    );

    if (valueElement) {
      valueElement.textContent = "--";
    }

    if (totalMovimientosElement) {
      totalMovimientosElement.textContent = "--";
    }

    if (totalErroresElement) {
      totalErroresElement.textContent = "--";
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
    this.dpmoData = null;
    this.setLoading();
  }
}

// Exportar la clase
export { DPMOKPI };

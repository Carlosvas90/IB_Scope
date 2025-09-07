/**
 * DPMOKPI.js
 * Componente para mostrar el KPI de DPMO con subcategorías
 */

export class DPMOKPI {
  constructor(containerId = "dpmo-kpi") {
    this.containerId = containerId;
    this.isLoading = false;
    console.log(`🔧 DPMO KPI inicializado con ID: ${this.containerId}`);
  }

  /**
   * Actualiza el KPI con los datos proporcionados
   * @param {Object} data - Datos para el KPI
   * @param {number} data.dpmo - Valor DPMO
   * @param {number} data.totalMovimientos - Total de movimientos
   * @param {number} data.totalErrores - Total de errores
   */
  update(data) {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(
        `❌ No se encontró el contenedor con ID: ${this.containerId}`
      );
      return;
    }

    // Actualizar valor principal (DPMO)
    const mainValue = container.querySelector(".kpi-value");
    if (mainValue) {
      // Mostrar DPMO como número entero sin decimales
      const dpmoValue = data.dpmo
        ? Math.round(data.dpmo).toLocaleString()
        : "0";
      mainValue.textContent = dpmoValue;
    }

    // Actualizar Total Movimientos usando el método que funciona (buscar por texto del encabezado)
    this._actualizarValorSecundario(
      container,
      "Total Movimientos",
      data.totalMovimientos
    );

    // Actualizar Total Errores usando el método que funciona (buscar por texto del encabezado)
    this._actualizarValorSecundario(
      container,
      "Total Errores",
      data.totalErrores
    );

    console.log(
      `✅ KPI DPMO actualizado: ${JSON.stringify({
        dpmo: data.dpmo,
        totalMovimientos: data.totalMovimientos,
        totalErrores: data.totalErrores,
      })}`
    );
  }

  /**
   * Actualiza un valor secundario buscando por el texto del encabezado
   * @param {HTMLElement} container - El contenedor del KPI
   * @param {string} textoEncabezado - Texto del encabezado a buscar
   * @param {number} valor - Valor a mostrar
   * @private
   */
  _actualizarValorSecundario(container, textoEncabezado, valor) {
    // Buscar el encabezado con el texto especificado
    const headers = container.querySelectorAll("h4");
    let valorElement = null;

    // Buscar por texto del encabezado
    for (const header of headers) {
      if (header.textContent.includes(textoEncabezado)) {
        valorElement = header.nextElementSibling;
        break;
      }
    }

    // Actualizar el valor si se encontró el elemento
    if (valorElement) {
      valorElement.textContent = valor ? valor.toLocaleString() : "0";
    } else {
      // Buscar el contenedor secundario por texto
      const kpiSecondaries = container.querySelectorAll(".kpi-secondary");
      let kpiSecondary = null;

      for (const secondary of kpiSecondaries) {
        if (secondary.textContent.includes(textoEncabezado)) {
          kpiSecondary = secondary;
          break;
        }
      }

      // Último recurso: crear el elemento si no existe
      if (kpiSecondary) {
        const newValue = document.createElement("div");
        newValue.className = "kpi-value secondary";
        newValue.textContent = valor ? valor.toLocaleString() : "0";
        kpiSecondary.appendChild(newValue);
      }
    }

    // Limpiar el trend (no necesario mostrar "Datos cargados")
    const trend = container.querySelector(".kpi-trend");
    if (trend) {
      trend.textContent = "";
      trend.className = "kpi-trend neutral";
    }

    // Asegurar que el estado de carga se desactive
    this.setLoading(false);

    // No es necesario imprimir nada aquí, ya se muestra en el método update
  }

  /**
   * Establece el estado de carga del KPI
   * @param {boolean} loading - Si está cargando o no
   */
  setLoading(loading) {
    this.isLoading = loading;
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const mainValue = container.querySelector(".kpi-value");
    const secondaryValues = container.querySelectorAll(
      ".kpi-secondary .kpi-value.secondary"
    );
    const trend = container.querySelector(".kpi-trend");

    if (loading) {
      // Mostrar indicador de carga
      if (mainValue) mainValue.textContent = "...";
      secondaryValues.forEach((value) => {
        value.textContent = "...";
      });
      if (trend) {
        trend.textContent = "Cargando...";
        trend.className = "kpi-trend neutral";
      }
      console.log("⏳ DPMO KPI en estado de carga");
    } else {
      // Limpiar el estado de carga
      if (trend && trend.textContent === "Cargando...") {
        trend.textContent = "";
        trend.className = "kpi-trend neutral";
      }
      console.log("✅ DPMO KPI fuera del estado de carga");
    }
  }

  /**
   * Actualiza el KPI cuando no hay datos
   */
  updateNoData() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const mainValue = container.querySelector(".kpi-value");
    if (mainValue) mainValue.textContent = "Sin datos";

    const secondaryValues = container.querySelectorAll(
      ".kpi-secondary .kpi-value.secondary"
    );
    secondaryValues.forEach((value) => {
      value.textContent = "Sin datos";
    });

    // Actualizar el trend para mostrar estado
    const trend = container.querySelector(".kpi-trend");
    if (trend) {
      trend.textContent = "Archivo DPMO no encontrado";
      trend.className = "kpi-trend neutral";
    }

    console.log("⚠️ KPI DPMO actualizado sin datos - archivo no encontrado");
  }
}

/**
 * KPICard.js
 * Componente para manejar las tarjetas de KPI
 * Responsable de actualizar valores y tendencias
 */

export class KPICard {
  constructor() {
    this.kpiElements = new Map();
    this.animationDuration = 300;
    console.log("📈 KPICard inicializado");
  }

  /**
   * Actualiza un KPI específico
   * @param {string} elementId - ID del elemento del valor del KPI
   * @param {string|number} value - Nuevo valor
   * @param {string} trend - Tendencia: 'positive', 'negative', 'neutral'
   */
  updateKPI(elementId, value, trend) {
    const valueElement = document.getElementById(elementId);
    if (!valueElement) {
      console.warn(`❌ Elemento KPI no encontrado: ${elementId}`);
      return;
    }

    // Animar el cambio de valor
    this.animateValueChange(valueElement, value);

    // Actualizar tendencia si existe
    const trendElementId = elementId.replace("-kpi", "-trend");
    const trendElement = document.getElementById(trendElementId);
    if (trendElement) {
      this.updateTrend(trendElement, trend);
    }
  }

  /**
   * Anima el cambio de valor con efecto de conteo
   * @param {HTMLElement} element - Elemento del valor
   * @param {string|number} newValue - Nuevo valor
   */
  animateValueChange(element, newValue) {
    const oldValue = element.textContent;

    // Si el valor no ha cambiado, no animar
    if (oldValue === String(newValue)) {
      return;
    }

    // Extraer números del valor para animación
    const oldNumber = this.extractNumber(oldValue);
    const newNumber = this.extractNumber(newValue);

    // Si ambos son números, animar el conteo
    if (!isNaN(oldNumber) && !isNaN(newNumber)) {
      this.animateNumberCount(element, oldNumber, newNumber, newValue);
    } else {
      // Si no son números, cambio directo con fade
      this.animateFadeChange(element, newValue);
    }
  }

  /**
   * Extrae el número de un string
   * @param {string} value - Valor del que extraer el número
   * @returns {number} - Número extraído o NaN
   */
  extractNumber(value) {
    if (typeof value === "number") return value;
    const match = String(value).match(/[\d.]+/);
    return match ? parseFloat(match[0]) : NaN;
  }

  /**
   * Anima el conteo de números
   * @param {HTMLElement} element - Elemento a animar
   * @param {number} start - Valor inicial
   * @param {number} end - Valor final
   * @param {string} finalValue - Valor final completo (con unidades)
   */
  animateNumberCount(element, start, end, finalValue) {
    const startTime = performance.now();
    const difference = end - start;

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.animationDuration, 1);

      // Función de easing (ease-out)
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const currentValue = start + difference * easeProgress;

      // Mantener decimales según el valor final
      const decimals = this.getDecimalPlaces(finalValue);
      const displayValue = currentValue.toFixed(decimals);

      // Mantener el formato original (unidades, %, etc.)
      element.textContent = String(finalValue).replace(/[\d.]+/, displayValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Asegurar valor final exacto
        element.textContent = finalValue;
        this.addUpdateAnimation(element);
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Obtiene el número de decimales de un valor
   * @param {string} value - Valor a analizar
   * @returns {number} - Número de decimales
   */
  getDecimalPlaces(value) {
    const match = String(value).match(/\.(\d+)/);
    return match ? match[1].length : 0;
  }

  /**
   * Anima un cambio con efecto fade
   * @param {HTMLElement} element - Elemento a animar
   * @param {string} newValue - Nuevo valor
   */
  animateFadeChange(element, newValue) {
    element.style.transition = `opacity ${this.animationDuration / 2}ms ease`;
    element.style.opacity = "0.5";

    setTimeout(() => {
      element.textContent = newValue;
      element.style.opacity = "1";
      this.addUpdateAnimation(element);

      // Limpiar transición
      setTimeout(() => {
        element.style.transition = "";
      }, this.animationDuration / 2);
    }, this.animationDuration / 2);
  }

  /**
   * Añade animación visual para indicar actualización
   * @param {HTMLElement} element - Elemento a animar
   */
  addUpdateAnimation(element) {
    element.classList.add("fade-in");

    // Remover clase después de la animación
    setTimeout(() => {
      element.classList.remove("fade-in");
    }, this.animationDuration);
  }

  /**
   * Actualiza el indicador de tendencia
   * @param {HTMLElement} trendElement - Elemento de tendencia
   * @param {string} trend - Tipo de tendencia
   */
  updateTrend(trendElement, trend) {
    // Remover clases de tendencia anteriores
    trendElement.classList.remove("positive", "negative", "neutral");

    // Añadir nueva clase de tendencia
    trendElement.classList.add(trend);

    // Actualizar texto según la tendencia
    const trendText = this.getTrendText(trend);
    trendElement.textContent = trendText;

    // Añadir animación de actualización
    this.addUpdateAnimation(trendElement);
  }

  /**
   * Obtiene el texto para mostrar según la tendencia
   * @param {string} trend - Tipo de tendencia
   * @returns {string} - Texto de la tendencia
   */
  getTrendText(trend) {
    switch (trend) {
      case "positive":
        return "↗️ Aumentando";
      case "negative":
        return "↘️ Disminuyendo";
      case "neutral":
      default:
        return "➡️ Estable";
    }
  }

  /**
   * Actualiza múltiples KPIs de una vez
   * @param {Object} kpis - Objeto con múltiples KPIs {id: {value, trend}}
   */
  updateMultipleKPIs(kpis) {
    Object.entries(kpis).forEach(([id, data]) => {
      this.updateKPI(id, data.value, data.trend);
    });
  }

  /**
   * Resalta un KPI específico (útil para llamar atención)
   * @param {string} elementId - ID del elemento del KPI
   * @param {number} duration - Duración del resaltado en ms
   */
  highlightKPI(elementId, duration = 2000) {
    const valueElement = document.getElementById(elementId);
    if (!valueElement) return;

    const kpiCard = valueElement.closest(".kpi-card");
    if (!kpiCard) return;

    // Añadir clase de resaltado
    kpiCard.classList.add("highlight");

    // Remover después del tiempo especificado
    setTimeout(() => {
      kpiCard.classList.remove("highlight");
    }, duration);
  }

  /**
   * Obtiene el valor actual de un KPI
   * @param {string} elementId - ID del elemento del KPI
   * @returns {string|null} - Valor actual o null si no existe
   */
  getCurrentKPIValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.textContent : null;
  }

  /**
   * Reinicia todos los KPIs a un estado de carga
   */
  resetToLoading() {
    const kpiValues = document.querySelectorAll(".kpi-value");
    const kpiTrends = document.querySelectorAll(".kpi-trend");

    kpiValues.forEach((element) => {
      element.textContent = "...";
      element.classList.add("loading");
    });

    kpiTrends.forEach((element) => {
      element.textContent = "Cargando...";
      element.className = "kpi-trend neutral loading";
    });
  }

  /**
   * Remueve el estado de carga de todos los KPIs
   */
  removeLoadingState() {
    const loadingElements = document.querySelectorAll(
      ".kpi-value.loading, .kpi-trend.loading"
    );

    loadingElements.forEach((element) => {
      element.classList.remove("loading");
    });
  }
}

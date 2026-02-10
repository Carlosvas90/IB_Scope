/**
 * BaseChart.js
 * Clase base para todos los gráficos del sistema modular
 * Proporciona funcionalidad común y estructura estándar
 */

import { getChartThemeService } from "./ChartThemeService.js";

export class BaseChart {
  constructor(container, chartId, options = {}) {
    this.container = container;
    this.chartId = chartId;
    this.options = options;
    this.chart = null;
    this.data = null;
    this.isInitialized = false;
    this.isRendered = false;
    this.refreshTimer = null;

    // Configuración combinada (default + opciones)
    this.config = this.mergeConfig(this.getDefaultConfig(), options);

    // Eventos
    this.events = new Map();

    // Servicio de temas
    this.themeService = getChartThemeService();

    console.log(`📊 ${this.constructor.name} inicializado con ID: ${chartId}`);
  }

  /**
   * Configuración por defecto del gráfico
   * Debe ser sobrescrito por cada gráfico específico
   */
  getDefaultConfig() {
    return {
      title: "Gráfico Base",
      type: "line",
      refreshInterval: 60000, // 1 minuto
      exportable: true,
      responsive: true,
      showLegend: true,
      showTooltip: true,
      theme: "light",
      autoRefresh: false,
      lazyLoad: false,
      errorHandling: "graceful", // 'graceful' | 'strict'
    };
  }

  /**
   * Obtiene los datos del gráfico
   * Debe ser implementado por cada gráfico específico
   */
  async fetchData() {
    throw new Error(
      `fetchData() debe ser implementado en ${this.constructor.name}`
    );
  }

  /**
   * Procesa los datos antes de renderizar
   * Puede ser sobrescrito para transformaciones específicas
   */
  processData(rawData) {
    return rawData;
  }

  /**
   * Obtiene las opciones específicas de ECharts
   * Debe ser implementado por cada gráfico específico
   */
  getChartOptions() {
    throw new Error(
      `getChartOptions() debe ser implementado en ${this.constructor.name}`
    );
  }

  /**
   * Obtiene la configuración de temas
   */
  getThemeConfig() {
    return this.themeService.getCurrentThemeConfig();
  }

  /**
   * Obtiene color del tema actual
   */
  getThemeColor(colorKey) {
    const themeConfig = this.getThemeConfig();
    return themeConfig[colorKey] || themeConfig.textColor;
  }

  /**
   * Obtiene color de la paleta según índice (paleta desde tokens CSS cuando hay).
   */
  getColorFromPalette(index) {
    const themeConfig = this.getThemeConfig();
    const palette = themeConfig.palette || [];
    return palette[index % palette.length] || themeConfig.primaryColor;
  }

  /**
   * Resuelve un color desde variable CSS (tokens IB_Scope). Delegado al ChartThemeService.
   */
  getCssColor(varName, fallback = "") {
    return this.themeService.getCssColor
      ? this.themeService.getCssColor(varName, fallback)
      : fallback;
  }

  /**
   * Detecta el tema actual del sistema
   */
  getCurrentTheme() {
    // Verificar si hay un tema forzado en la configuración local
    if (this.config.theme && this.config.theme !== "auto") {
      return this.config.theme;
    }

    // Usar el tema del servicio global
    return this.themeService.getCurrentTheme();
  }

  /**
   * Inicializa el gráfico
   */
  async initialize() {
    if (this.isInitialized) {
      console.warn(`⚠️ ${this.constructor.name} ya está inicializado`);
      return;
    }

    try {
      // Validar ECharts
      await this.validateECharts();

      // Preparar contenedor
      this.prepareContainer();

      // Registrar en el servicio de temas
      this.themeService.registerChart(this);

      // Marcar como inicializado
      this.isInitialized = true;

      console.log(`✅ ${this.constructor.name} inicializado correctamente`);
      this.emit("initialized");
    } catch (error) {
      console.error(`❌ Error inicializando ${this.constructor.name}:`, error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Renderiza el gráfico
   */
  async render() {
    try {
      // Inicializar si no está inicializado
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Mostrar loading
      this.showLoading();

      // Obtener y procesar datos
      const rawData = await this.fetchData();
      this.data = this.processData(rawData);

      // Validar datos
      this.validateData(this.data);

      // Crear gráfico ECharts
      await this.createChart();

      // Configurar auto-refresh si está habilitado
      this.setupAutoRefresh();

      // Configurar responsive si está habilitado
      this.setupResponsive();

      // Ocultar loading
      this.hideLoading();

      // Marcar como renderizado
      this.isRendered = true;

      console.log(`🎨 ${this.constructor.name} renderizado correctamente`);
      this.emit("rendered", this.data);
    } catch (error) {
      this.hideLoading();
      console.error(`❌ Error renderizando ${this.constructor.name}:`, error);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Crea el gráfico ECharts
   */
  async createChart() {
    if (!this.data) {
      throw new Error("No hay datos para renderizar");
    }

    // Destruir gráfico existente si existe
    if (this.chart) {
      this.chart.dispose();
    }

    // Pequeño delay para asegurar que el DOM esté listo
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verificar que el contenedor siga siendo válido
    if (!this.container || !this.container.offsetParent) {
      console.warn(
        `⚠️ Contenedor no visible para ${this.constructor.name}, esperando...`
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Crear nueva instancia
    this.chart = echarts.init(this.container);

    // Obtener opciones del gráfico
    const chartOptions = this.getChartOptions();

    // Aplicar opciones base
    const finalOptions = this.mergeChartOptions(chartOptions);

    // Configurar gráfico
    this.chart.setOption(finalOptions);

    // Configurar eventos
    this.setupChartEvents();

    // Forzar redimensionamiento después de un pequeño delay
    setTimeout(() => {
      if (this.chart) {
        this.chart.resize();
      }
    }, 100);
  }

  /**
   * Actualiza los datos del gráfico
   */
  async refresh() {
    try {
      console.log(`🔄 Actualizando ${this.constructor.name}...`);

      // Obtener nuevos datos
      const rawData = await this.fetchData();
      const newData = this.processData(rawData);

      // Validar nuevos datos
      this.validateData(newData);

      // Actualizar datos internos
      this.data = newData;

      // Actualizar gráfico si está renderizado
      if (this.chart && this.isRendered) {
        const chartOptions = this.getChartOptions();
        const finalOptions = this.mergeChartOptions(chartOptions);

        this.chart.setOption(finalOptions, true); // true = merge
      }

      console.log(`✅ ${this.constructor.name} actualizado correctamente`);
      this.emit("refreshed", this.data);
    } catch (error) {
      console.error(`❌ Error actualizando ${this.constructor.name}:`, error);
      this.handleError(error);
    }
  }

  /**
   * Aplica un tema al gráfico
   */
  applyTheme(theme) {
    const oldTheme = this.getCurrentTheme();

    if (typeof theme === "string") {
      this.config.theme = theme;
    } else if (typeof theme === "object") {
      this.config.customTheme = theme;
      this.config.theme = "custom";
    }

    const newTheme = this.getCurrentTheme();
    console.log(`🎨 Aplicando tema ${newTheme} a ${this.constructor.name}`);

    // Actualizar gráfico si está renderizado y el tema cambió
    if (this.isRendered && this.chart && oldTheme !== newTheme) {
      try {
        const chartOptions = this.getChartOptions();
        const finalOptions = this.mergeChartOptions(chartOptions);
        this.chart.setOption(finalOptions, true); // true = notMerge para forzar actualización
        console.log(
          `✅ Tema aplicado correctamente a ${this.constructor.name}`
        );
      } catch (error) {
        console.error(
          `❌ Error aplicando tema a ${this.constructor.name}:`,
          error
        );
      }
    }

    this.emit("themeChanged", { oldTheme, newTheme, theme });
  }

  /**
   * Configura el listener para cambios automáticos de tema
   */
  setupThemeListener() {
    // Escuchar cambios en el atributo data-theme del documento
    if (typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (
            mutation.type === "attributes" &&
            (mutation.attributeName === "data-theme" ||
              mutation.attributeName === "class")
          ) {
            const currentTheme = this.getCurrentTheme();
            if (this.lastDetectedTheme !== currentTheme) {
              this.lastDetectedTheme = currentTheme;
              this.applyTheme("auto"); // Usar tema automático
            }
          }
        });
      });

      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme", "class"],
      });

      // Guardar referencia para limpieza
      this.themeObserver = observer;
    }

    // Escuchar cambios en las preferencias del sistema
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleSystemThemeChange = (e) => {
        if (this.config.theme === "auto") {
          this.applyTheme("auto");
        }
      };

      mediaQuery.addListener(handleSystemThemeChange);

      // Guardar referencia para limpieza
      this.systemThemeListener = {
        mediaQuery,
        handler: handleSystemThemeChange,
      };
    }

    // Establecer tema inicial
    this.lastDetectedTheme = this.getCurrentTheme();
  }

  /**
   * Exporta el gráfico
   */
  export(format = "png", filename = null) {
    if (!this.chart || !this.config.exportable) {
      console.warn(`⚠️ ${this.constructor.name} no se puede exportar`);
      return null;
    }

    const finalFilename = filename || `${this.chartId}-${Date.now()}`;

    try {
      const dataURL = this.chart.getDataURL({
        type: format,
        pixelRatio: 2,
        backgroundColor: "#fff",
      });

      // Crear enlace de descarga
      const link = document.createElement("a");
      link.download = `${finalFilename}.${format}`;
      link.href = dataURL;
      link.click();

      console.log(
        `📥 ${this.constructor.name} exportado como ${finalFilename}.${format}`
      );
      this.emit("exported", { format, filename: finalFilename });

      return dataURL;
    } catch (error) {
      console.error(`❌ Error exportando ${this.constructor.name}:`, error);
      this.handleError(error);
      return null;
    }
  }

  /**
   * Redimensiona el gráfico
   */
  resize() {
    if (this.chart) {
      this.chart.resize();
      this.emit("resized");
    }
  }

  /**
   * Destruye el gráfico y limpia recursos
   */
  destroy() {
    try {
      // Limpiar timer de auto-refresh
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
        this.refreshTimer = null;
      }

      // Desregistrar del servicio de temas
      if (this.themeService) {
        this.themeService.unregisterChart(this);
      }

      // Destruir gráfico ECharts
      if (this.chart) {
        this.chart.dispose();
        this.chart = null;
      }

      // Limpiar eventos
      this.events.clear();

      // Limpiar contenedor
      if (this.container) {
        this.container.innerHTML = "";
      }

      // Reset flags
      this.isInitialized = false;
      this.isRendered = false;
      this.data = null;

      console.log(`🗑️ ${this.constructor.name} destruido correctamente`);
      this.emit("destroyed");
    } catch (error) {
      console.error(`❌ Error destruyendo ${this.constructor.name}:`, error);
    }
  }

  /**
   * Valida que ECharts esté disponible
   */
  async validateECharts() {
    if (typeof echarts === "undefined") {
      throw new Error(
        "ECharts no está disponible. Asegúrate de que esté cargado."
      );
    }
    return true;
  }

  /**
   * Prepara el contenedor para el gráfico
   */
  prepareContainer() {
    if (!this.container) {
      throw new Error("Contenedor no válido");
    }

    // Agregar clases CSS
    this.container.classList.add("base-chart", `chart-${this.chartId}`);

    // Configurar estilos básicos
    if (!this.container.style.width) {
      this.container.style.width = "100%";
    }
    if (!this.container.style.height) {
      this.container.style.height = "400px";
    }
  }

  /**
   * Muestra indicador de carga
   */
  showLoading() {
    const loadingEl = document.createElement("div");
    loadingEl.className = "chart-loading";
    loadingEl.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text">Cargando ${this.config.title}...</div>
    `;

    this.container.appendChild(loadingEl);
  }

  /**
   * Oculta indicador de carga
   */
  hideLoading() {
    const loadingEl = this.container.querySelector(".chart-loading");
    if (loadingEl) {
      loadingEl.remove();
    }
  }

  /**
   * Configura auto-refresh
   */
  setupAutoRefresh() {
    if (!this.config.autoRefresh || !this.config.refreshInterval) {
      return;
    }

    // Limpiar timer existente
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Configurar nuevo timer
    this.refreshTimer = setInterval(() => {
      this.refresh();
    }, this.config.refreshInterval);

    console.log(
      `⏰ Auto-refresh configurado para ${this.constructor.name} cada ${this.config.refreshInterval}ms`
    );
  }

  /**
   * Configura responsive
   */
  setupResponsive() {
    if (!this.config.responsive) {
      return;
    }

    // Observador de redimensionamiento
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        this.resize();
      });
      resizeObserver.observe(this.container);
    } else {
      // Fallback para navegadores sin ResizeObserver
      window.addEventListener("resize", () => {
        this.resize();
      });
    }
  }

  /**
   * Configura eventos del gráfico
   */
  setupChartEvents() {
    if (!this.chart) return;

    // Evento de clic
    this.chart.on("click", (params) => {
      this.emit("click", params);
    });

    // Evento de hover
    this.chart.on("mouseover", (params) => {
      this.emit("mouseover", params);
    });

    // Evento de mouse out
    this.chart.on("mouseout", (params) => {
      this.emit("mouseout", params);
    });
  }

  /**
   * Valida los datos del gráfico
   */
  validateData(data) {
    if (!data) {
      throw new Error("Los datos no pueden estar vacíos");
    }

    if (!data.labels || !Array.isArray(data.labels)) {
      throw new Error("Los datos deben incluir un array de labels");
    }

    if (!data.datasets || !Array.isArray(data.datasets)) {
      throw new Error("Los datos deben incluir un array de datasets");
    }

    return true;
  }

  /**
   * Combina opciones de configuración
   */
  mergeConfig(defaultConfig, userConfig) {
    return this.deepMerge(defaultConfig, userConfig);
  }

  /**
   * Combina opciones de ECharts
   */
  mergeChartOptions(chartOptions) {
    const baseOptions = {
      animation: true,
      animationDuration: 1000,
      backgroundColor: "transparent",
      textStyle: {
        fontFamily: "var(--stats-font-family)",
        color: "var(--stats-text-secondary)",
      },
    };

    return this.deepMerge(baseOptions, chartOptions);
  }

  /**
   * Merge profundo de objetos
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Manejo de errores
   */
  handleError(error) {
    if (this.config.errorHandling === "graceful") {
      // Mostrar error en el contenedor
      this.showError(error.message);
    } else {
      // Re-lanzar error
      throw error;
    }
  }

  /**
   * Muestra error en el contenedor
   */
  showError(message) {
    this.container.innerHTML = `
      <div class="chart-error">
        <div class="error-icon">⚠️</div>
        <div class="error-title">Error en ${this.config.title}</div>
        <div class="error-message">${message}</div>
        <button class="error-retry" onclick="this.parentElement.parentElement.__chart__.render()">
          Reintentar
        </button>
      </div>
    `;

    // Guardar referencia para el botón de retry
    this.container.__chart__ = this;
  }

  /**
   * Sistema de eventos
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
  }

  off(event, callback) {
    if (this.events.has(event)) {
      const callbacks = this.events.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data = null) {
    if (this.events.has(event)) {
      this.events.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error en callback del evento ${event}:`, error);
        }
      });
    }
  }

  /**
   * Getters útiles
   */
  isInitialized() {
    return this.isInitialized;
  }

  isRendered() {
    return this.isRendered;
  }

  getData() {
    return this.data;
  }

  getConfig() {
    return this.config;
  }

  getChart() {
    return this.chart;
  }
}

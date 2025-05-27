/**
 * ChartRegistry.js
 * Registro central para el sistema modular de gráficos
 * Maneja la creación, registro y gestión de todos los gráficos
 */

export class ChartRegistry {
  constructor() {
    this.charts = new Map(); // Instancias de gráficos activos
    this.chartClasses = new Map(); // Clases de gráficos registradas
    this.globalConfig = this.getDefaultGlobalConfig();
    this.initialized = false;

    console.log("📋 ChartRegistry inicializado");
  }

  /**
   * Configuración global por defecto
   */
  getDefaultGlobalConfig() {
    return {
      defaultTheme: "light",
      autoRefresh: false,
      refreshInterval: 60000,
      errorHandling: "graceful",
      lazyLoad: true,
      responsive: true,
      exportable: true,
    };
  }

  /**
   * Inicializa el registro y carga los gráficos disponibles
   */
  async initialize() {
    if (this.initialized) {
      console.warn("⚠️ ChartRegistry ya está inicializado");
      return;
    }

    try {
      console.log("🔄 Inicializando ChartRegistry...");

      // Cargar gráficos disponibles
      await this.loadAvailableCharts();

      this.initialized = true;
      console.log("✅ ChartRegistry inicializado correctamente");
    } catch (error) {
      console.error("❌ Error inicializando ChartRegistry:", error);
      throw error;
    }
  }

  /**
   * Carga automáticamente todos los gráficos disponibles
   */
  async loadAvailableCharts() {
    const chartModules = [
      "TrendChart",
      "StatusDistributionChart",
      "HourlyErrorsChart",
      "TopProductsChart",
      "UserRankingChart",
      "ProductAnalysisChart",
    ];

    for (const moduleName of chartModules) {
      try {
        await this.loadChartModule(moduleName);
      } catch (error) {
        console.warn(
          `⚠️ No se pudo cargar el módulo ${moduleName}:`,
          error.message
        );
      }
    }
  }

  /**
   * Carga un módulo de gráfico específico
   */
  async loadChartModule(moduleName) {
    try {
      const module = await import(`./charts/${moduleName}.js`);
      const ChartClass = module[moduleName];

      if (ChartClass) {
        this.registerChart(
          moduleName.toLowerCase().replace("chart", ""),
          ChartClass
        );
        console.log(`📊 Módulo ${moduleName} cargado correctamente`);
      } else {
        throw new Error(`Clase ${moduleName} no encontrada en el módulo`);
      }
    } catch (error) {
      // Si el archivo no existe, no es un error crítico
      if (error.message.includes("Failed to resolve module")) {
        console.log(
          `ℹ️ Módulo ${moduleName} no disponible (archivo no existe)`
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * Registra una clase de gráfico
   */
  registerChart(chartType, ChartClass) {
    if (this.chartClasses.has(chartType)) {
      console.warn(
        `⚠️ Gráfico ${chartType} ya está registrado, sobrescribiendo...`
      );
    }

    this.chartClasses.set(chartType, ChartClass);
    console.log(`✅ Gráfico ${chartType} registrado correctamente`);
  }

  /**
   * Crea una nueva instancia de gráfico
   */
  create(chartType, container, options = {}) {
    if (!this.chartClasses.has(chartType)) {
      throw new Error(`Tipo de gráfico '${chartType}' no está registrado`);
    }

    const ChartClass = this.chartClasses.get(chartType);
    const chartId = this.generateChartId(chartType);

    // Combinar configuración global con opciones específicas
    const finalOptions = this.mergeWithGlobalConfig(options);

    // Crear instancia
    const chartInstance = new ChartClass(container, finalOptions);
    chartInstance.chartId = chartId;
    chartInstance.chartType = chartType;

    // Registrar instancia
    this.charts.set(chartId, chartInstance);

    console.log(`🎨 Gráfico ${chartType} creado con ID: ${chartId}`);
    return chartInstance;
  }

  /**
   * Obtiene una instancia de gráfico por ID
   */
  get(chartId) {
    return this.charts.get(chartId);
  }

  /**
   * Obtiene todas las instancias de un tipo específico
   */
  getByType(chartType) {
    return Array.from(this.charts.values()).filter(
      (chart) => chart.chartType === chartType
    );
  }

  /**
   * Obtiene todas las instancias activas
   */
  getAll() {
    return Array.from(this.charts.values());
  }

  /**
   * Destruye una instancia específica
   */
  destroy(chartId) {
    const chart = this.charts.get(chartId);
    if (chart) {
      chart.destroy();
      this.charts.delete(chartId);
      console.log(`🗑️ Gráfico ${chartId} destruido`);
      return true;
    }
    return false;
  }

  /**
   * Destruye todas las instancias de un tipo
   */
  destroyByType(chartType) {
    const charts = this.getByType(chartType);
    charts.forEach((chart) => {
      this.destroy(chart.chartId);
    });
    console.log(`🗑️ Todos los gráficos de tipo ${chartType} destruidos`);
  }

  /**
   * Destruye todas las instancias
   */
  destroyAll() {
    const chartIds = Array.from(this.charts.keys());
    chartIds.forEach((chartId) => {
      this.destroy(chartId);
    });
    console.log("🗑️ Todos los gráficos destruidos");
  }

  /**
   * Actualiza todos los gráficos
   */
  async refreshAll() {
    console.log("🔄 Actualizando todos los gráficos...");

    const refreshPromises = Array.from(this.charts.values()).map((chart) => {
      return chart.refresh().catch((error) => {
        console.error(`❌ Error actualizando gráfico ${chart.chartId}:`, error);
      });
    });

    await Promise.all(refreshPromises);
    console.log("✅ Actualización de gráficos completada");
  }

  /**
   * Actualiza gráficos de un tipo específico
   */
  async refreshByType(chartType) {
    console.log(`🔄 Actualizando gráficos de tipo ${chartType}...`);

    const charts = this.getByType(chartType);
    const refreshPromises = charts.map((chart) => {
      return chart.refresh().catch((error) => {
        console.error(`❌ Error actualizando gráfico ${chart.chartId}:`, error);
      });
    });

    await Promise.all(refreshPromises);
    console.log(`✅ Gráficos de tipo ${chartType} actualizados`);
  }

  /**
   * Aplica un tema a todos los gráficos
   */
  applyThemeToAll(theme) {
    console.log(`🎨 Aplicando tema ${theme} a todos los gráficos...`);

    this.globalConfig.defaultTheme = theme;

    Array.from(this.charts.values()).forEach((chart) => {
      chart.applyTheme(theme);
    });

    console.log(`✅ Tema ${theme} aplicado a todos los gráficos`);
  }

  /**
   * Redimensiona todos los gráficos
   */
  resizeAll() {
    Array.from(this.charts.values()).forEach((chart) => {
      chart.resize();
    });
    console.log("📐 Todos los gráficos redimensionados");
  }

  /**
   * Exporta todos los gráficos
   */
  exportAll(format = "png") {
    console.log(`📥 Exportando todos los gráficos en formato ${format}...`);

    const exports = [];
    Array.from(this.charts.values()).forEach((chart) => {
      if (chart.config.exportable) {
        const dataURL = chart.export(format);
        if (dataURL) {
          exports.push({
            chartId: chart.chartId,
            chartType: chart.chartType,
            dataURL: dataURL,
          });
        }
      }
    });

    console.log(`✅ ${exports.length} gráficos exportados`);
    return exports;
  }

  /**
   * Obtiene estadísticas del registro
   */
  getStats() {
    const stats = {
      totalRegistered: this.chartClasses.size,
      totalActive: this.charts.size,
      byType: {},
      registeredTypes: Array.from(this.chartClasses.keys()),
      activeCharts: Array.from(this.charts.keys()),
    };

    // Contar por tipo
    Array.from(this.charts.values()).forEach((chart) => {
      const type = chart.chartType;
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });

    return stats;
  }

  /**
   * Valida si un tipo de gráfico está disponible
   */
  isChartTypeAvailable(chartType) {
    return this.chartClasses.has(chartType);
  }

  /**
   * Obtiene los tipos de gráficos disponibles
   */
  getAvailableChartTypes() {
    return Array.from(this.chartClasses.keys());
  }

  /**
   * Configura opciones globales
   */
  setGlobalConfig(config) {
    this.globalConfig = { ...this.globalConfig, ...config };
    console.log("⚙️ Configuración global actualizada:", this.globalConfig);
  }

  /**
   * Obtiene la configuración global
   */
  getGlobalConfig() {
    return { ...this.globalConfig };
  }

  /**
   * Combina configuración global con opciones específicas
   */
  mergeWithGlobalConfig(options) {
    return {
      ...this.globalConfig,
      ...options,
    };
  }

  /**
   * Genera un ID único para el gráfico
   */
  generateChartId(chartType) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${chartType}-${timestamp}-${random}`;
  }

  /**
   * Busca gráficos por criterios
   */
  find(criteria) {
    return Array.from(this.charts.values()).filter((chart) => {
      return Object.keys(criteria).every((key) => {
        if (key === "config") {
          return Object.keys(criteria[key]).every((configKey) => {
            return chart.config[configKey] === criteria[key][configKey];
          });
        }
        return chart[key] === criteria[key];
      });
    });
  }

  /**
   * Crea múltiples gráficos de una vez
   */
  createBatch(chartConfigs) {
    const createdCharts = [];

    chartConfigs.forEach((config) => {
      try {
        const chart = this.create(
          config.type,
          config.container,
          config.options
        );
        createdCharts.push(chart);
      } catch (error) {
        console.error(`❌ Error creando gráfico ${config.type}:`, error);
      }
    });

    console.log(`📊 Lote de ${createdCharts.length} gráficos creado`);
    return createdCharts;
  }

  /**
   * Renderiza múltiples gráficos en paralelo
   */
  async renderBatch(chartIds) {
    const charts = chartIds.map((id) => this.get(id)).filter(Boolean);

    console.log(`🎨 Renderizando lote de ${charts.length} gráficos...`);

    const renderPromises = charts.map((chart) => {
      return chart.render().catch((error) => {
        console.error(`❌ Error renderizando gráfico ${chart.chartId}:`, error);
      });
    });

    await Promise.all(renderPromises);
    console.log(`✅ Lote de gráficos renderizado`);
  }

  /**
   * Configura auto-refresh global
   */
  setupGlobalAutoRefresh(interval = 60000) {
    if (this.globalRefreshTimer) {
      clearInterval(this.globalRefreshTimer);
    }

    this.globalRefreshTimer = setInterval(() => {
      this.refreshAll();
    }, interval);

    console.log(`⏰ Auto-refresh global configurado cada ${interval}ms`);
  }

  /**
   * Detiene auto-refresh global
   */
  stopGlobalAutoRefresh() {
    if (this.globalRefreshTimer) {
      clearInterval(this.globalRefreshTimer);
      this.globalRefreshTimer = null;
      console.log("⏹️ Auto-refresh global detenido");
    }
  }

  /**
   * Limpia el registro completamente
   */
  cleanup() {
    this.stopGlobalAutoRefresh();
    this.destroyAll();
    this.chartClasses.clear();
    this.initialized = false;
    console.log("🧹 ChartRegistry limpiado completamente");
  }
}

// Instancia singleton
const chartRegistry = new ChartRegistry();

// Exportar la instancia singleton como default
export default chartRegistry;

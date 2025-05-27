/**
 * ModularChartsExample.js
 * Ejemplo de uso del sistema modular de gráficos
 * Demuestra cómo crear, configurar y gestionar gráficos individuales
 */

import chartRegistry from "../ChartRegistry.js";

export class ModularChartsExample {
  constructor() {
    this.charts = new Map();
    this.initialized = false;
  }

  /**
   * Inicializa el ejemplo
   */
  async initialize() {
    if (this.initialized) return;

    try {
      console.log("🚀 Inicializando ejemplo de gráficos modulares...");

      // Inicializar el registro de gráficos
      await chartRegistry.initialize();

      // Configurar opciones globales
      chartRegistry.setGlobalConfig({
        defaultTheme: "light",
        autoRefresh: true,
        refreshInterval: 30000, // 30 segundos
        responsive: true,
      });

      this.initialized = true;
      console.log("✅ Ejemplo inicializado correctamente");
    } catch (error) {
      console.error("❌ Error inicializando ejemplo:", error);
      throw error;
    }
  }

  /**
   * Ejemplo 1: Crear un gráfico de tendencias básico
   */
  async createBasicTrendChart() {
    console.log("📊 Creando gráfico de tendencias básico...");

    // Obtener contenedor
    const container =
      document.getElementById("trend-chart-container") ||
      this.createContainer("trend-chart-container", "Gráfico de Tendencias");

    try {
      // Crear gráfico con configuración básica
      const trendChart = chartRegistry.create("trend", container, {
        title: "Tendencias de Errores - Últimos 30 días",
        period: "30d",
        granularity: "day",
        showArea: true,
        multiSeries: true,
      });

      // Renderizar
      await trendChart.render();

      // Guardar referencia
      this.charts.set("basic-trend", trendChart);

      console.log("✅ Gráfico de tendencias creado");
      return trendChart;
    } catch (error) {
      console.error("❌ Error creando gráfico de tendencias:", error);
      throw error;
    }
  }

  /**
   * Ejemplo 2: Crear un gráfico de distribución personalizado
   */
  async createCustomDistributionChart() {
    console.log("🍰 Creando gráfico de distribución personalizado...");

    const container =
      document.getElementById("distribution-chart-container") ||
      this.createContainer(
        "distribution-chart-container",
        "Distribución de Estados"
      );

    try {
      // Crear gráfico con configuración personalizada
      const distributionChart = chartRegistry.create(
        "statusdistribution",
        container,
        {
          title: "Estados de Errores - Vista Detallada",
          type: "doughnut",
          showPercentages: true,
          showValues: true,
          labelPosition: "outside",
          colors: {
            pending: "#ff6b35",
            resolved: "#2ecc71",
            critical: "#e74c3c",
            in_progress: "#3498db",
            cancelled: "#95a5a6",
            reopened: "#f39c12",
          },
        }
      );

      // Renderizar
      await distributionChart.render();

      // Configurar eventos personalizados
      distributionChart.on("click", (params) => {
        console.log("🖱️ Clic en segmento:", params.name, params.value);
        this.showSegmentDetails(params);
      });

      // Guardar referencia
      this.charts.set("custom-distribution", distributionChart);

      console.log("✅ Gráfico de distribución creado");
      return distributionChart;
    } catch (error) {
      console.error("❌ Error creando gráfico de distribución:", error);
      throw error;
    }
  }

  /**
   * Ejemplo 3: Crear múltiples gráficos en lote
   */
  async createChartBatch() {
    console.log("📊 Creando lote de gráficos...");

    const chartConfigs = [
      {
        type: "trend",
        container: this.createContainer("batch-trend", "Tendencias (Lote)"),
        options: {
          title: "Tendencias - 7 días",
          period: "7d",
          granularity: "day",
          showArea: false,
          multiSeries: false,
        },
      },
      {
        type: "statusdistribution",
        container: this.createContainer(
          "batch-distribution",
          "Distribución (Lote)"
        ),
        options: {
          title: "Estados - Resumen",
          type: "pie",
          showLabels: false,
        },
      },
    ];

    try {
      // Crear gráficos en lote
      const batchCharts = chartRegistry.createBatch(chartConfigs);

      // Renderizar en paralelo
      const chartIds = batchCharts.map((chart) => chart.chartId);
      await chartRegistry.renderBatch(chartIds);

      // Guardar referencias
      batchCharts.forEach((chart, index) => {
        this.charts.set(`batch-${index}`, chart);
      });

      console.log(`✅ Lote de ${batchCharts.length} gráficos creado`);
      return batchCharts;
    } catch (error) {
      console.error("❌ Error creando lote de gráficos:", error);
      throw error;
    }
  }

  /**
   * Ejemplo 4: Configuración avanzada con eventos
   */
  async createAdvancedChart() {
    console.log("⚙️ Creando gráfico con configuración avanzada...");

    const container = this.createContainer(
      "advanced-chart",
      "Gráfico Avanzado"
    );

    try {
      // Crear gráfico con todas las características
      const advancedChart = chartRegistry.create("trend", container, {
        title: "Análisis Avanzado de Tendencias",
        period: "90d",
        granularity: "week",
        showArea: true,
        showPoints: true,
        smoothCurve: true,
        autoRefresh: true,
        refreshInterval: 15000, // 15 segundos
        exportable: true,
      });

      // Configurar eventos completos
      this.setupAdvancedEvents(advancedChart);

      // Renderizar
      await advancedChart.render();

      // Configurar controles interactivos
      this.createChartControls(advancedChart, container);

      this.charts.set("advanced", advancedChart);

      console.log("✅ Gráfico avanzado creado");
      return advancedChart;
    } catch (error) {
      console.error("❌ Error creando gráfico avanzado:", error);
      throw error;
    }
  }

  /**
   * Ejemplo 5: Gestión de temas
   */
  async demonstrateThemes() {
    console.log("🎨 Demostrando gestión de temas...");

    // Aplicar tema oscuro a todos los gráficos
    chartRegistry.applyThemeToAll("dark");

    // Esperar un momento
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Volver al tema claro
    chartRegistry.applyThemeToAll("light");

    // Aplicar tema personalizado a un gráfico específico
    const customChart = this.charts.get("advanced");
    if (customChart) {
      customChart.applyTheme({
        backgroundColor: "#f8f9fa",
        textColor: "#2c3e50",
        primaryColor: "#3498db",
        secondaryColor: "#e74c3c",
      });
    }

    console.log("✅ Demostración de temas completada");
  }

  /**
   * Ejemplo 6: Exportación y estadísticas
   */
  async demonstrateExportAndStats() {
    console.log("📊 Demostrando exportación y estadísticas...");

    // Obtener estadísticas del registro
    const registryStats = chartRegistry.getStats();
    console.log("📈 Estadísticas del registro:", registryStats);

    // Exportar todos los gráficos
    const exports = chartRegistry.exportAll("png");
    console.log(`📥 ${exports.length} gráficos exportados`);

    // Obtener estadísticas de un gráfico específico
    const trendChart = this.charts.get("basic-trend");
    if (trendChart) {
      const chartStats = trendChart.getStats();
      console.log("📊 Estadísticas del gráfico de tendencias:", chartStats);

      // Exportar datos del gráfico
      const exportData = trendChart.exportData("json");
      console.log("💾 Datos exportados:", exportData);
    }

    // Generar insights automáticos
    const distributionChart = this.charts.get("custom-distribution");
    if (distributionChart && distributionChart.generateInsights) {
      const insights = distributionChart.generateInsights();
      console.log("💡 Insights automáticos:", insights);
      this.displayInsights(insights);
    }

    console.log("✅ Demostración de exportación completada");
  }

  /**
   * Configura eventos avanzados para un gráfico
   */
  setupAdvancedEvents(chart) {
    chart.on("initialized", () => {
      console.log(`🎯 Gráfico ${chart.chartId} inicializado`);
    });

    chart.on("rendered", (data) => {
      console.log(
        `🎨 Gráfico ${chart.chartId} renderizado con ${data.labels.length} puntos`
      );
    });

    chart.on("refreshed", (data) => {
      console.log(`🔄 Gráfico ${chart.chartId} actualizado`);
      this.showRefreshNotification(chart);
    });

    chart.on("exported", (info) => {
      console.log(
        `📥 Gráfico ${chart.chartId} exportado como ${info.filename}.${info.format}`
      );
    });

    chart.on("click", (params) => {
      console.log(`🖱️ Clic en gráfico ${chart.chartId}:`, params);
    });

    chart.on("themeChanged", (theme) => {
      console.log(`🎨 Tema cambiado en ${chart.chartId}:`, theme);
    });
  }

  /**
   * Crea controles interactivos para un gráfico
   */
  createChartControls(chart, container) {
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "chart-controls";
    controlsDiv.innerHTML = `
      <div class="controls-header">Controles del Gráfico</div>
      <div class="controls-grid">
        <button onclick="window.chartExample.refreshChart('${chart.chartId}')">🔄 Actualizar</button>
        <button onclick="window.chartExample.exportChart('${chart.chartId}')">📥 Exportar</button>
        <button onclick="window.chartExample.toggleArea('${chart.chartId}')">📊 Toggle Área</button>
        <button onclick="window.chartExample.changePeriod('${chart.chartId}', '7d')">📅 7 días</button>
        <button onclick="window.chartExample.changePeriod('${chart.chartId}', '30d')">📅 30 días</button>
        <button onclick="window.chartExample.changePeriod('${chart.chartId}', '90d')">📅 90 días</button>
      </div>
    `;

    container.appendChild(controlsDiv);

    // Hacer disponible globalmente para los botones
    window.chartExample = this;
  }

  /**
   * Métodos para los controles interactivos
   */
  refreshChart(chartId) {
    const chart = chartRegistry.get(chartId);
    if (chart) {
      chart.refresh();
    }
  }

  exportChart(chartId) {
    const chart = chartRegistry.get(chartId);
    if (chart) {
      chart.export("png");
    }
  }

  toggleArea(chartId) {
    const chart = chartRegistry.get(chartId);
    if (chart && chart.toggleArea) {
      chart.toggleArea();
    }
  }

  changePeriod(chartId, period) {
    const chart = chartRegistry.get(chartId);
    if (chart && chart.setPeriod) {
      chart.setPeriod(period);
    }
  }

  /**
   * Utilidades auxiliares
   */
  createContainer(id, title) {
    const container = document.createElement("div");
    container.id = id;
    container.className = "chart-example-container";
    container.innerHTML = `
      <h3>${title}</h3>
      <div class="chart-wrapper" style="width: 100%; height: 400px;"></div>
    `;

    document.body.appendChild(container);
    return container.querySelector(".chart-wrapper");
  }

  showSegmentDetails(params) {
    console.log(
      `📋 Detalles del segmento: ${params.name} = ${params.value} (${params.percent}%)`
    );
  }

  showRefreshNotification(chart) {
    console.log(`🔔 Gráfico ${chart.chartId} actualizado automáticamente`);
  }

  displayInsights(insights) {
    insights.forEach((insight) => {
      console.log(
        `💡 ${insight.type.toUpperCase()}: ${insight.title} - ${
          insight.message
        }`
      );
    });
  }

  /**
   * Ejecuta todos los ejemplos
   */
  async runAllExamples() {
    try {
      await this.initialize();

      console.log("🚀 Ejecutando todos los ejemplos...");

      await this.createBasicTrendChart();
      await this.createCustomDistributionChart();
      await this.createChartBatch();
      await this.createAdvancedChart();

      // Esperar un momento antes de las demostraciones
      await new Promise((resolve) => setTimeout(resolve, 2000));

      await this.demonstrateThemes();
      await this.demonstrateExportAndStats();

      console.log("✅ Todos los ejemplos ejecutados correctamente");
    } catch (error) {
      console.error("❌ Error ejecutando ejemplos:", error);
    }
  }

  /**
   * Limpia todos los ejemplos
   */
  cleanup() {
    console.log("🧹 Limpiando ejemplos...");

    // Destruir gráficos individuales
    this.charts.forEach((chart, key) => {
      chart.destroy();
    });
    this.charts.clear();

    // Limpiar registro
    chartRegistry.cleanup();

    // Limpiar contenedores del DOM
    const containers = document.querySelectorAll(".chart-example-container");
    containers.forEach((container) => container.remove());

    this.initialized = false;
    console.log("✅ Limpieza completada");
  }
}

// Crear instancia global para fácil acceso
window.ModularChartsExample = ModularChartsExample;

// Ejemplo de uso:
// const example = new ModularChartsExample();
// example.runAllExamples();

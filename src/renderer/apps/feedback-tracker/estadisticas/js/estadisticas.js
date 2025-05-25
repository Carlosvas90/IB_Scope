/**
 * estadisticas.js
 * Controlador principal para el dashboard de estadísticas
 * Integra EstadisticasDataService, AnalyticsProcessor y ChartService
 */

import { EstadisticasDataService } from "./services/EstadisticasDataService.js";
import { AnalyticsProcessor } from "./services/AnalyticsProcessor.js";
import { ChartService } from "./services/ChartService.js";

class EstadisticasController {
  constructor() {
    this.dataService = new EstadisticasDataService();
    this.analyticsProcessor = new AnalyticsProcessor();
    this.chartService = new ChartService();

    this.currentDateRange = 30; // días por defecto
    this.isLoading = false;
    this.errors = [];

    console.log("📊 EstadisticasController inicializado");
  }

  /**
   * Inicializa el controlador
   */
  async init() {
    console.log("🚀 Inicializando dashboard de estadísticas...");

    try {
      this.showLoading(true);

      // Verificar que ECharts esté disponible
      await this.waitForECharts();

      // Inicializar servicios
      await this.dataService.init();

      // Configurar eventos
      this.setupEventListeners();

      // Cargar datos iniciales
      await this.loadData();

      // Configurar auto-refresh
      this.setupAutoRefresh();

      console.log("✅ Dashboard de estadísticas inicializado correctamente");
    } catch (error) {
      console.error("❌ Error inicializando dashboard:", error);
      this.showError("Error al cargar el dashboard de estadísticas");
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Espera a que ECharts esté disponible
   */
  async waitForECharts() {
    console.log("⏳ Verificando disponibilidad de ECharts...");

    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50; // 5 segundos máximo

      const checkECharts = () => {
        attempts++;

        if (typeof echarts !== "undefined") {
          console.log("✅ ECharts está disponible:", echarts.version);
          resolve();
        } else if (attempts >= maxAttempts) {
          console.error("❌ Timeout esperando ECharts");
          reject(new Error("ECharts no se cargó en el tiempo esperado"));
        } else {
          console.log(
            `⏳ Esperando ECharts... intento ${attempts}/${maxAttempts}`
          );
          setTimeout(checkECharts, 100);
        }
      };

      checkECharts();
    });
  }

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    // Selector de período
    const dateRangeSelector = document.getElementById("date-range");
    if (dateRangeSelector) {
      dateRangeSelector.addEventListener("change", (e) => {
        this.changeDateRange(parseInt(e.target.value));
      });
    }

    // Botón de refresh
    const refreshBtn = document.getElementById("refresh-stats");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this.refreshData();
      });
    }

    // Botón de exportar
    const exportBtn = document.getElementById("export-report");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        this.exportReport();
      });
    }

    // Botones de toggle de gráficos
    document.querySelectorAll(".chart-toggle").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.toggleChartType(e.target);
      });
    });

    // Configurar redimensionado de ventana
    window.addEventListener("resize", () => {
      this.chartService.resizeAll();
    });

    console.log("✅ Event listeners configurados");
  }

  /**
   * Carga los datos
   */
  async loadData() {
    try {
      console.log("📥 Cargando datos...");

      const success = await this.dataService.loadData();
      if (success) {
        this.errors = this.dataService.errors;
        console.log(`✅ Datos cargados: ${this.errors.length} registros`);

        // Actualizar todos los componentes
        this.updateAllComponents();
      } else {
        throw new Error("No se pudieron cargar los datos");
      }
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
      this.showError("Error al cargar los datos");
    }
  }

  /**
   * Actualiza todos los componentes del dashboard
   */
  updateAllComponents() {
    console.log("🔄 Actualizando componentes del dashboard...");

    // Actualizar KPIs
    this.updateKPIs();

    // Actualizar gráficos
    this.updateCharts();

    // Actualizar tablas
    this.updateTables();

    // Actualizar resumen e insights
    this.updateSummary();

    console.log("✅ Componentes actualizados");
  }

  /**
   * Actualiza los KPIs
   */
  updateKPIs() {
    const kpis = this.analyticsProcessor.processKPIs(
      this.errors,
      this.currentDateRange
    );

    // Total de errores
    this.updateKPI("total-errors-kpi", kpis.totalErrors.toLocaleString());
    this.updateKPITrend(
      "total-errors-trend",
      "neutral",
      "Total de errores en el período"
    );

    // Errores pendientes
    this.updateKPI("pending-errors-kpi", kpis.pendingErrors.toLocaleString());
    this.updateKPITrend(
      "pending-errors-trend",
      "negative",
      "Errores sin resolver"
    );

    // Errores resueltos
    this.updateKPI("resolved-errors-kpi", kpis.resolvedErrors.toLocaleString());
    this.updateKPITrend(
      "resolved-errors-trend",
      "positive",
      "Errores resueltos"
    );

    // Tasa de resolución
    this.updateKPI("resolution-rate-kpi", `${kpis.resolutionRate.toFixed(1)}%`);
    const resolutionTrend =
      kpis.resolutionRate > 80
        ? "positive"
        : kpis.resolutionRate > 60
        ? "neutral"
        : "negative";
    this.updateKPITrend(
      "resolution-rate-trend",
      resolutionTrend,
      `Tasa de resolución`
    );

    // Tiempo promedio de resolución
    this.updateKPI(
      "avg-resolution-time-kpi",
      `${kpis.avgResolutionTime.toFixed(1)} días`
    );
    const timeTrend =
      kpis.avgResolutionTime <= 1
        ? "positive"
        : kpis.avgResolutionTime <= 3
        ? "neutral"
        : "negative";
    this.updateKPITrend(
      "avg-resolution-time-trend",
      timeTrend,
      "Tiempo promedio de resolución"
    );

    // Promedio diario
    this.updateKPI("daily-avg-kpi", kpis.dailyAverage.toFixed(1));
    this.updateKPITrend(
      "daily-avg-trend",
      "neutral",
      "Errores promedio por día"
    );

    console.log("📊 KPIs actualizados");
  }

  /**
   * Actualiza un KPI específico
   */
  updateKPI(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  }

  /**
   * Actualiza la tendencia de un KPI
   */
  updateKPITrend(elementId, trend, text) {
    const element = document.getElementById(elementId);
    if (element) {
      element.className = `kpi-trend ${trend}`;
      element.textContent = text;
    }
  }

  /**
   * Actualiza todos los gráficos
   */
  updateCharts() {
    console.log("📈 Actualizando gráficos...");
    console.log("📊 Datos disponibles:", this.errors.length, "errores");
    console.log("📅 Rango de fechas actual:", this.currentDateRange, "días");

    // Gráfico de tendencias
    console.log("🔄 Procesando datos de tendencias...");
    const trendData = this.analyticsProcessor.processTrendData(
      this.errors,
      this.currentDateRange
    );
    console.log("📈 Datos de tendencias procesados:", trendData);

    const trendChart = this.chartService.initTrendChart(
      "errors-trend-chart",
      trendData
    );
    console.log(
      "📈 Resultado gráfico de tendencias:",
      trendChart ? "✅ Creado" : "❌ Error"
    );

    // Gráfico de distribución por estado
    console.log("🔄 Procesando datos de estado...");
    const statusData = this.analyticsProcessor.processStatusDistribution(
      this.errors,
      this.currentDateRange
    );
    console.log("🥧 Datos de estado procesados:", statusData);

    const statusChart = this.chartService.initStatusChart(
      "status-distribution-chart",
      statusData
    );
    console.log(
      "🥧 Resultado gráfico de estado:",
      statusChart ? "✅ Creado" : "❌ Error"
    );

    // Gráfico de errores por hora
    console.log("🔄 Procesando datos por hora...");
    const hourlyData = this.analyticsProcessor.processHourlyData(
      this.errors,
      this.currentDateRange
    );
    console.log("⏰ Datos por hora procesados:", hourlyData);

    const hourlyChart = this.chartService.initHourlyChart(
      "hourly-errors-chart",
      hourlyData
    );
    console.log(
      "⏰ Resultado gráfico por hora:",
      hourlyChart ? "✅ Creado" : "❌ Error"
    );

    // Gráfico de top productos
    console.log("🔄 Procesando top ASINs...");
    const topASINs = this.analyticsProcessor.processTopASINs(
      this.errors,
      this.currentDateRange,
      10
    );
    console.log("📦 Top ASINs procesados:", topASINs);

    const topProductsData = topASINs.map((item) => ({
      name: item.asin,
      total: item.total,
    }));
    console.log("📦 Datos de top productos:", topProductsData);

    const topChart = this.chartService.initTopChart(
      "top-products-chart",
      topProductsData,
      "Top Productos con Errores"
    );
    console.log(
      "📦 Resultado gráfico top productos:",
      topChart ? "✅ Creado" : "❌ Error"
    );

    console.log("📈 Gráficos actualizados");
  }

  /**
   * Actualiza las tablas
   */
  updateTables() {
    this.updateUsersRankingTable();
    this.updateProductsAnalysisTable();
  }

  /**
   * Actualiza la tabla de ranking de usuarios
   */
  updateUsersRankingTable() {
    const tbody = document.getElementById("users-ranking-body");
    if (!tbody) return;

    const topUsers = this.analyticsProcessor.processTopUsers(
      this.errors,
      this.currentDateRange,
      10
    );

    if (topUsers.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="loading">No hay datos disponibles</td></tr>';
      return;
    }

    tbody.innerHTML = topUsers
      .map(
        (user, index) => `
      <tr>
        <td><strong>${index + 1}</strong></td>
        <td>${user.userId}</td>
        <td>${user.total}</td>
        <td>${user.resolved}</td>
        <td class="${
          user.resolutionRate >= 80
            ? "text-success"
            : user.resolutionRate >= 60
            ? "text-warning"
            : "text-danger"
        }">
          ${user.resolutionRate.toFixed(1)}%
        </td>
        <td>${user.avgResolutionTime.toFixed(1)} días</td>
      </tr>
    `
      )
      .join("");

    console.log("👥 Tabla de usuarios actualizada");
  }

  /**
   * Actualiza la tabla de análisis de productos
   */
  updateProductsAnalysisTable() {
    const tbody = document.getElementById("products-analysis-body");
    if (!tbody) return;

    const topASINs = this.analyticsProcessor.processTopASINs(
      this.errors,
      this.currentDateRange,
      10
    );

    if (topASINs.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="loading">No hay datos disponibles</td></tr>';
      return;
    }

    tbody.innerHTML = topASINs
      .map(
        (asin, index) => `
      <tr>
        <td><strong>${index + 1}</strong></td>
        <td>${asin.asin}</td>
        <td>${asin.total}</td>
        <td>${asin.uniqueErrors}</td>
        <td>${asin.frequency.toFixed(1)}</td>
        <td><span class="status-badge pending">Activo</span></td>
      </tr>
    `
      )
      .join("");

    console.log("📦 Tabla de productos actualizada");
  }

  /**
   * Actualiza el resumen e insights
   */
  updateSummary() {
    // Resumen del período
    const kpis = this.analyticsProcessor.processKPIs(
      this.errors,
      this.currentDateRange
    );
    const periodSummary = document.getElementById("period-summary");
    if (periodSummary) {
      const periodText =
        this.currentDateRange === 0
          ? "hoy"
          : this.currentDateRange === 1
          ? "ayer"
          : `últimos ${this.currentDateRange} días`;

      periodSummary.innerHTML = `
        <p><strong>Período analizado:</strong> ${periodText}</p>
        <p><strong>Total de errores:</strong> ${kpis.totalErrors} errores (${
        kpis.totalLines
      } registros)</p>
        <p><strong>Tasa de resolución:</strong> ${kpis.resolutionRate.toFixed(
          1
        )}%</p>
        <p><strong>Promedio diario:</strong> ${kpis.dailyAverage.toFixed(
          1
        )} errores por día</p>
        <p><strong>Tiempo promedio de resolución:</strong> ${kpis.avgResolutionTime.toFixed(
          1
        )} días</p>
      `;
    }

    // Insights automáticos
    const insights = this.analyticsProcessor.generateInsights(
      this.errors,
      this.currentDateRange
    );
    const insightsContent = document.getElementById("insights-content");
    if (insightsContent) {
      insightsContent.innerHTML = insights
        .map((insight) => `<p>${insight}</p>`)
        .join("");
    }

    console.log("📝 Resumen e insights actualizados");
  }

  /**
   * Cambia el rango de fechas
   */
  async changeDateRange(newRange) {
    if (newRange === this.currentDateRange) return;

    console.log(`📅 Cambiando rango de fechas a: ${newRange} días`);
    this.currentDateRange = newRange;

    // Actualizar todos los componentes con el nuevo rango
    this.updateAllComponents();
  }

  /**
   * Refresca los datos
   */
  async refreshData() {
    console.log("🔄 Refrescando datos...");
    this.showLoading(true);

    try {
      const success = await this.dataService.refresh();
      if (success) {
        this.errors = this.dataService.errors;
        this.updateAllComponents();
        this.showToast("Datos actualizados correctamente", "success");
      } else {
        throw new Error("Error al refrescar datos");
      }
    } catch (error) {
      console.error("❌ Error refrescando datos:", error);
      this.showToast("Error al actualizar datos", "error");
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Exporta el reporte
   */
  exportReport() {
    console.log("📄 Exportando reporte...");
    // TODO: Implementar exportación de reporte
    this.showToast("Función de exportación en desarrollo", "info");
  }

  /**
   * Cambia el tipo de un gráfico
   */
  toggleChartType(button) {
    const chartId = button.getAttribute("data-chart");
    const chartType = button.getAttribute("data-type");

    // Remover clase active de otros botones del mismo grupo
    const group = button.parentElement;
    group
      .querySelectorAll(".chart-toggle")
      .forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    // Obtener datos según el tipo de gráfico
    let data;
    switch (chartId) {
      case "errors-trend":
        data = this.analyticsProcessor.processTrendData(
          this.errors,
          this.currentDateRange
        );
        this.chartService.initTrendChart("errors-trend-chart", data, chartType);
        break;
      case "status-distribution":
        data = this.analyticsProcessor.processStatusDistribution(
          this.errors,
          this.currentDateRange
        );
        this.chartService.initStatusChart(
          "status-distribution-chart",
          data,
          chartType
        );
        break;
      case "hourly-errors":
        data = this.analyticsProcessor.processHourlyData(
          this.errors,
          this.currentDateRange
        );
        this.chartService.initHourlyChart(
          "hourly-errors-chart",
          data,
          chartType
        );
        break;
      case "top-products":
        const topASINs = this.analyticsProcessor.processTopASINs(
          this.errors,
          this.currentDateRange,
          10
        );
        data = topASINs.map((item) => ({ name: item.asin, total: item.total }));
        this.chartService.initTopChart(
          "top-products-chart",
          data,
          "Top Productos con Errores",
          chartType
        );
        break;
    }

    console.log(`🔄 Gráfico ${chartId} cambiado a tipo ${chartType}`);
  }

  /**
   * Configura auto-refresh
   */
  setupAutoRefresh() {
    // Auto-refresh cada 5 minutos
    setInterval(() => {
      if (!this.isLoading) {
        this.refreshData();
      }
    }, 5 * 60 * 1000);

    console.log("⏰ Auto-refresh configurado (5 minutos)");
  }

  /**
   * Muestra/oculta el overlay de carga
   */
  showLoading(show) {
    const overlay = document.getElementById("loading-overlay");
    if (overlay) {
      if (show) {
        overlay.style.display = "flex";
        overlay.classList.add("active");
      } else {
        overlay.style.display = "none";
        overlay.classList.remove("active");
      }
    }
    this.isLoading = show;
  }

  /**
   * Muestra un mensaje de error
   */
  showError(message) {
    console.error("❌ Error:", message);
    this.showToast(message, "error");
  }

  /**
   * Muestra un toast (si está disponible)
   */
  showToast(message, type = "info") {
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }
}

// Variable global para el controlador
let estadisticasController = null;

// Función global de inicialización que será llamada por el app-loader
window.initEstadisticas = async function (view) {
  console.log("🎯 Inicializando módulo de estadísticas...", view);

  try {
    // Crear nueva instancia del controlador
    estadisticasController = new EstadisticasController();

    // Inicializar el controlador
    await estadisticasController.init();

    // Hacer el controlador accesible globalmente para debugging
    window.estadisticasController = estadisticasController;

    console.log("✅ Módulo de estadísticas inicializado correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error inicializando módulo de estadísticas:", error);
    return false;
  }
};

// Inicializar cuando el DOM esté listo (fallback para carga directa)
document.addEventListener("DOMContentLoaded", async () => {
  // Solo inicializar automáticamente si no se ha inicializado ya por el app-loader
  if (!estadisticasController) {
    console.log(
      "🎯 DOM cargado, inicializando EstadisticasController automáticamente..."
    );
    await window.initEstadisticas();
  }
});

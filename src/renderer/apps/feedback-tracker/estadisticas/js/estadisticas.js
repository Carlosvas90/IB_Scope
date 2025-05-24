/**
 * EstadisticasController.js
 * Controlador principal para el dashboard de estadísticas
 * Maneja KPIs, gráficos, tablas y análisis de datos
 */

import { KPICard } from "./components/KPICard.js";
import { ChartManager } from "./components/ChartManager.js";
import { StatisticsAPI } from "./components/StatisticsAPI.js";

export class EstadisticasController {
  constructor() {
    this.currentPeriod = 30; // días por defecto
    this.isLoading = false;
    this.data = null;
    this.charts = new Map();

    // Inicializar servicios
    this.kpiManager = new KPICard();
    this.chartManager = new ChartManager();
    this.apiService = new StatisticsAPI();

    // Elementos DOM
    this.loadingOverlay = null;
    this.dateRangeSelector = null;

    console.log("📊 EstadisticasController inicializado");
  }

  /**
   * Inicializa el controlador
   */
  async init() {
    console.log("🚀 Inicializando dashboard de estadísticas...");

    try {
      // Inicializar elementos DOM
      this.initializeDOMElements();

      // Configurar eventos
      this.setupEventListeners();

      // Cargar datos iniciales
      await this.loadInitialData();

      console.log("✅ Dashboard de estadísticas inicializado correctamente");
    } catch (error) {
      console.error("❌ Error inicializando dashboard:", error);
      this.showError("Error al cargar el dashboard de estadísticas");
    }
  }

  /**
   * Inicializa elementos DOM
   */
  initializeDOMElements() {
    this.loadingOverlay = document.getElementById("loading-overlay");
    this.dateRangeSelector = document.getElementById("date-range");

    if (!this.loadingOverlay || !this.dateRangeSelector) {
      throw new Error("Elementos DOM críticos no encontrados");
    }
  }

  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // Selector de período
    this.dateRangeSelector.addEventListener("change", (e) => {
      this.changePeriod(parseInt(e.target.value));
    });

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

    // Botones de toggle de tablas
    document.querySelectorAll(".btn-toggle-table").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.toggleTableExpansion(e.target);
      });
    });
  }

  /**
   * Carga los datos iniciales
   */
  async loadInitialData() {
    this.showLoading(true);

    try {
      // Obtener datos de la API
      this.data = await this.apiService.getStatisticsData(this.currentPeriod);

      // Actualizar todos los componentes
      await this.updateAllComponents();
    } catch (error) {
      console.error("Error cargando datos:", error);
      throw error;
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Actualiza todos los componentes del dashboard
   */
  async updateAllComponents() {
    if (!this.data) return;

    console.log("🔄 Actualizando componentes del dashboard...");

    // Actualizar KPIs
    this.updateKPIs();

    // Actualizar gráficos
    await this.updateCharts();

    // Actualizar tablas
    this.updateTables();

    // Actualizar resumen
    this.updateSummary();

    console.log("✅ Componentes actualizados");
  }

  /**
   * Actualiza las tarjetas de KPI
   */
  updateKPIs() {
    const kpis = this.calculateKPIs();

    // Total errores
    this.kpiManager.updateKPI(
      "total-errors-kpi",
      kpis.totalErrors.value,
      kpis.totalErrors.trend
    );

    // Errores pendientes
    this.kpiManager.updateKPI(
      "pending-errors-kpi",
      kpis.pendingErrors.value,
      kpis.pendingErrors.trend
    );

    // Errores resueltos
    this.kpiManager.updateKPI(
      "resolved-errors-kpi",
      kpis.resolvedErrors.value,
      kpis.resolvedErrors.trend
    );

    // Tasa de resolución
    this.kpiManager.updateKPI(
      "resolution-rate-kpi",
      kpis.resolutionRate.value + "%",
      kpis.resolutionRate.trend
    );

    // Tiempo promedio de resolución
    this.kpiManager.updateKPI(
      "avg-resolution-time-kpi",
      kpis.avgResolutionTime.value,
      kpis.avgResolutionTime.trend
    );

    // Promedio diario
    this.kpiManager.updateKPI(
      "daily-avg-kpi",
      kpis.dailyAverage.value,
      kpis.dailyAverage.trend
    );
  }

  /**
   * Calcula todos los KPIs basados en los datos
   */
  calculateKPIs() {
    const current = this.data.current;
    const previous = this.data.previous;

    return {
      totalErrors: {
        value: current.totalErrors || 0,
        trend: this.calculateTrend(current.totalErrors, previous.totalErrors),
      },
      pendingErrors: {
        value: current.pendingErrors || 0,
        trend: this.calculateTrend(
          current.pendingErrors,
          previous.pendingErrors
        ),
      },
      resolvedErrors: {
        value: current.resolvedErrors || 0,
        trend: this.calculateTrend(
          current.resolvedErrors,
          previous.resolvedErrors
        ),
      },
      resolutionRate: {
        value:
          current.totalErrors > 0
            ? Math.round((current.resolvedErrors / current.totalErrors) * 100)
            : 0,
        trend: this.calculateTrend(
          current.totalErrors > 0
            ? (current.resolvedErrors / current.totalErrors) * 100
            : 0,
          previous.totalErrors > 0
            ? (previous.resolvedErrors / previous.totalErrors) * 100
            : 0
        ),
      },
      avgResolutionTime: {
        value: this.formatTime(current.avgResolutionTime || 0),
        trend: this.calculateTrend(
          current.avgResolutionTime,
          previous.avgResolutionTime
        ),
      },
      dailyAverage: {
        value:
          Math.round(((current.totalErrors || 0) / this.currentPeriod) * 10) /
          10,
        trend: this.calculateTrend(
          (current.totalErrors || 0) / this.currentPeriod,
          (previous.totalErrors || 0) / this.currentPeriod
        ),
      },
    };
  }

  /**
   * Calcula tendencia entre dos valores
   */
  calculateTrend(current, previous) {
    if (!previous || previous === 0) return "neutral";

    const percentChange = ((current - previous) / previous) * 100;

    if (percentChange > 5) return "positive";
    if (percentChange < -5) return "negative";
    return "neutral";
  }

  /**
   * Formatea tiempo en horas/minutos
   */
  formatTime(minutes) {
    if (minutes < 60) {
      return `${Math.round(minutes)}min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);

    if (hours < 24) {
      return remainingMinutes > 0
        ? `${hours}h ${remainingMinutes}min`
        : `${hours}h`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }

  /**
   * Actualiza todos los gráficos
   */
  async updateCharts() {
    try {
      // Gráfico de tendencias
      await this.updateTrendChart();

      // Gráfico de distribución por estado
      await this.updateStatusDistributionChart();

      // Gráfico de errores por hora
      await this.updateHourlyErrorsChart();

      // Gráfico de top productos
      await this.updateTopProductsChart();
    } catch (error) {
      console.error("Error actualizando gráficos:", error);
    }
  }

  /**
   * Actualiza el gráfico de tendencias
   */
  async updateTrendChart() {
    const chartId = "errors-trend-chart";
    const container = document.getElementById(chartId);
    if (!container) return;

    // Destruir gráfico existente
    if (this.charts.has(chartId)) {
      this.chartManager.destroyChart(this.charts.get(chartId));
    }

    const chartData = this.data.trendData || [];

    const chart = this.chartManager.createLineChart(container, {
      labels: chartData.map((item) => item.date),
      datasets: [
        {
          label: "Total Errores",
          data: chartData.map((item) => item.total),
          borderColor: "#4381b3",
          backgroundColor: "rgba(67, 129, 179, 0.1)",
        },
        {
          label: "Pendientes",
          data: chartData.map((item) => item.pending),
          borderColor: "#ff9800",
          backgroundColor: "rgba(255, 152, 0, 0.1)",
        },
        {
          label: "Resueltos",
          data: chartData.map((item) => item.resolved),
          borderColor: "#4caf50",
          backgroundColor: "rgba(76, 175, 80, 0.1)",
        },
      ],
    });

    this.charts.set(chartId, chart);
  }

  /**
   * Actualiza el gráfico de distribución por estado
   */
  async updateStatusDistributionChart() {
    const chartId = "status-distribution-chart";
    const container = document.getElementById(chartId);
    if (!container) return;

    if (this.charts.has(chartId)) {
      this.chartManager.destroyChart(this.charts.get(chartId));
    }

    const current = this.data.current;

    const chart = this.chartManager.createDoughnutChart(container, {
      labels: ["Pendientes", "Resueltos"],
      datasets: [
        {
          data: [current.pendingErrors || 0, current.resolvedErrors || 0],
          backgroundColor: ["#ff9800", "#4caf50"],
        },
      ],
    });

    this.charts.set(chartId, chart);
  }

  /**
   * Actualiza el gráfico de errores por hora
   */
  async updateHourlyErrorsChart() {
    const chartId = "hourly-errors-chart";
    const container = document.getElementById(chartId);
    if (!container) return;

    if (this.charts.has(chartId)) {
      this.chartManager.destroyChart(this.charts.get(chartId));
    }

    const hourlyData = this.data.hourlyData || [];

    const chart = this.chartManager.createBarChart(container, {
      labels: hourlyData.map((item) => `${item.hour}:00`),
      datasets: [
        {
          label: "Errores por Hora",
          data: hourlyData.map((item) => item.count),
          backgroundColor: "#74d7fb",
        },
      ],
    });

    this.charts.set(chartId, chart);
  }

  /**
   * Actualiza el gráfico de top productos
   */
  async updateTopProductsChart() {
    const chartId = "top-products-chart";
    const container = document.getElementById(chartId);
    if (!container) return;

    if (this.charts.has(chartId)) {
      this.chartManager.destroyChart(this.charts.get(chartId));
    }

    const productData = this.data.topProducts || [];

    const chart = this.chartManager.createHorizontalBarChart(container, {
      labels: productData.map((item) => item.asin),
      datasets: [
        {
          label: "Errores",
          data: productData.map((item) => item.count),
          backgroundColor: "#8b5cf6",
        },
      ],
    });

    this.charts.set(chartId, chart);
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

    const usersData = this.data.usersRanking || [];

    if (usersData.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="loading">No hay datos disponibles</td></tr>';
      return;
    }

    tbody.innerHTML = usersData
      .map(
        (user, index) => `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td>${user.username}</td>
                <td>${user.totalErrors}</td>
                <td>${user.resolvedErrors}</td>
                <td class="${
                  user.resolutionRate >= 80
                    ? "text-success"
                    : user.resolutionRate >= 60
                    ? "text-warning"
                    : "text-danger"
                }">
                    ${user.resolutionRate}%
                </td>
                <td>${this.formatTime(user.avgResolutionTime)}</td>
            </tr>
        `
      )
      .join("");
  }

  /**
   * Actualiza la tabla de análisis de productos
   */
  updateProductsAnalysisTable() {
    const tbody = document.getElementById("products-analysis-body");
    if (!tbody) return;

    const productsData = this.data.productsAnalysis || [];

    if (productsData.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="loading">No hay datos disponibles</td></tr>';
      return;
    }

    tbody.innerHTML = productsData
      .map(
        (product, index) => `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td><code>${product.asin}</code></td>
                <td>${product.totalErrors}</td>
                <td>${product.uniqueErrors}</td>
                <td>
                    <div class="frequency-bar">
                        <div class="frequency-fill" style="width: ${
                          (product.frequency / productsData[0].frequency) * 100
                        }%"></div>
                        <span>${product.frequency}</span>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${
                      product.status === "critical"
                        ? "bg-danger"
                        : product.status === "warning"
                        ? "bg-warning"
                        : "bg-success"
                    }">
                        ${
                          product.status === "critical"
                            ? "Crítico"
                            : product.status === "warning"
                            ? "Advertencia"
                            : "Normal"
                        }
                    </span>
                </td>
            </tr>
        `
      )
      .join("");
  }

  /**
   * Actualiza el resumen del período
   */
  updateSummary() {
    const summaryElement = document.getElementById("period-summary");
    const insightsElement = document.getElementById("insights-content");

    if (summaryElement) {
      summaryElement.innerHTML = this.generatePeriodSummary();
    }

    if (insightsElement) {
      insightsElement.innerHTML = this.generateInsights();
    }
  }

  /**
   * Genera el resumen del período
   */
  generatePeriodSummary() {
    const current = this.data.current;
    const resolutionRate =
      current.totalErrors > 0
        ? Math.round((current.resolvedErrors / current.totalErrors) * 100)
        : 0;

    return `
            <ul>
                <li><strong>Total de errores:</strong> ${
                  current.totalErrors || 0
                }</li>
                <li><strong>Errores resueltos:</strong> ${
                  current.resolvedErrors || 0
                }</li>
                <li><strong>Tasa de resolución:</strong> ${resolutionRate}%</li>
                <li><strong>Tiempo promedio de resolución:</strong> ${this.formatTime(
                  current.avgResolutionTime || 0
                )}</li>
                <li><strong>Promedio diario:</strong> ${
                  Math.round(
                    ((current.totalErrors || 0) / this.currentPeriod) * 10
                  ) / 10
                } errores/día</li>
            </ul>
        `;
  }

  /**
   * Genera insights automáticos
   */
  generateInsights() {
    const insights = [];
    const current = this.data.current;
    const previous = this.data.previous;

    // Análisis de tendencia
    const errorTrend = this.calculateTrend(
      current.totalErrors,
      previous.totalErrors
    );
    if (errorTrend === "positive") {
      insights.push(
        "📈 El número de errores ha aumentado comparado con el período anterior."
      );
    } else if (errorTrend === "negative") {
      insights.push(
        "📉 El número de errores ha disminuido comparado con el período anterior."
      );
    }

    // Análisis de resolución
    const resolutionRate =
      current.totalErrors > 0
        ? (current.resolvedErrors / current.totalErrors) * 100
        : 0;

    if (resolutionRate >= 90) {
      insights.push(
        "✅ Excelente tasa de resolución (>90%). El equipo está manejando muy bien los errores."
      );
    } else if (resolutionRate >= 70) {
      insights.push(
        "👍 Buena tasa de resolución (70-90%). Hay oportunidades de mejora."
      );
    } else {
      insights.push(
        "⚠️ La tasa de resolución es baja (<70%). Se recomienda revisar los procesos."
      );
    }

    // Análisis de tiempo
    if (current.avgResolutionTime > 24 * 60) {
      // más de 24 horas
      insights.push(
        "🕐 El tiempo promedio de resolución es alto. Considerar optimizar el flujo de trabajo."
      );
    }

    // Análisis de productos
    if (this.data.topProducts && this.data.topProducts.length > 0) {
      const topProduct = this.data.topProducts[0];
      insights.push(
        `🏆 El producto con más errores es ${topProduct.asin} con ${topProduct.count} errores.`
      );
    }

    if (insights.length === 0) {
      insights.push(
        "📊 Los datos se están analizando. Los insights aparecerán aquí automáticamente."
      );
    }

    return (
      "<ul>" +
      insights.map((insight) => `<li>${insight}</li>`).join("") +
      "</ul>"
    );
  }

  /**
   * Cambia el período de análisis
   */
  async changePeriod(newPeriod) {
    if (this.isLoading || newPeriod === this.currentPeriod) return;

    this.currentPeriod = newPeriod;
    console.log(`📅 Cambiando período a ${newPeriod} días`);

    await this.loadInitialData();
  }

  /**
   * Refresca todos los datos
   */
  async refreshData() {
    if (this.isLoading) return;

    console.log("🔄 Refrescando datos...");
    await this.loadInitialData();
  }

  /**
   * Exporta el reporte actual
   */
  exportReport() {
    console.log("📊 Exportando reporte...");

    // Generar datos del reporte
    const reportData = {
      period: this.currentPeriod,
      generatedAt: new Date().toISOString(),
      kpis: this.calculateKPIs(),
      data: this.data,
    };

    // Crear y descargar archivo JSON
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `estadisticas-errores-${
      new Date().toISOString().split("T")[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log("✅ Reporte exportado");
  }

  /**
   * Cambia el tipo de gráfico
   */
  toggleChartType(button) {
    const chartId = button.dataset.chart;
    const chartType = button.dataset.type;

    // Actualizar botones activos
    document.querySelectorAll(`[data-chart="${chartId}"]`).forEach((btn) => {
      btn.classList.remove("active");
    });
    button.classList.add("active");

    // Obtener datos originales según el gráfico
    let chartData;
    let containerId;

    switch (chartId) {
      case "errors-trend":
        containerId = "errors-trend-chart";
        const trendData = this.data.trendData || [];
        chartData = {
          labels: trendData.map((item) => item.date),
          datasets: [
            {
              label: "Total Errores",
              data: trendData.map((item) => item.total),
              borderColor: "#4381b3",
              backgroundColor: "rgba(67, 129, 179, 0.1)",
            },
            {
              label: "Pendientes",
              data: trendData.map((item) => item.pending),
              borderColor: "#ff9800",
              backgroundColor: "rgba(255, 152, 0, 0.1)",
            },
            {
              label: "Resueltos",
              data: trendData.map((item) => item.resolved),
              borderColor: "#4caf50",
              backgroundColor: "rgba(76, 175, 80, 0.1)",
            },
          ],
        };
        break;

      case "status-distribution":
        containerId = "status-distribution-chart";
        const current = this.data.current;
        chartData = {
          labels: ["Pendientes", "Resueltos"],
          datasets: [
            {
              data: [current.pendingErrors || 0, current.resolvedErrors || 0],
              backgroundColor: ["#ff9800", "#4caf50"],
            },
          ],
        };
        break;

      case "hourly-errors":
        containerId = "hourly-errors-chart";
        const hourlyData = this.data.hourlyData || [];
        chartData = {
          labels: hourlyData.map((item) => `${item.hour}:00`),
          datasets: [
            {
              label: "Errores por Hora",
              data: hourlyData.map((item) => item.count),
              backgroundColor: "#74d7fb",
            },
          ],
        };
        break;

      case "top-products":
        containerId = "top-products-chart";
        const productData = this.data.topProducts || [];
        chartData = {
          labels: productData.map((item) => item.asin),
          datasets: [
            {
              label: "Errores",
              data: productData.map((item) => item.count),
              backgroundColor: "#8b5cf6",
            },
          ],
        };
        break;

      default:
        console.warn(`Gráfico no reconocido: ${chartId}`);
        return;
    }

    // Obtener contenedor y gráfico existente
    const container = document.getElementById(containerId);
    if (!container) return;

    const existingChart = this.charts.get(containerId);
    if (existingChart) {
      this.chartManager.destroyChart(existingChart);
    }

    // Crear nuevo gráfico según el tipo
    let newChart;
    switch (chartType) {
      case "line":
        newChart = this.chartManager.createLineChart(container, chartData);
        break;
      case "area":
        newChart = this.chartManager.createAreaChart(container, chartData);
        break;
      case "bar":
        newChart = this.chartManager.createBarChart(container, chartData);
        break;
      case "horizontal-bar":
        newChart = this.chartManager.createHorizontalBarChart(
          container,
          chartData
        );
        break;
      case "pie":
        newChart = this.chartManager.createPieChart(container, chartData);
        break;
      case "doughnut":
        newChart = this.chartManager.createDoughnutChart(container, chartData);
        break;
      default:
        console.warn(`Tipo de gráfico no soportado: ${chartType}`);
        newChart = this.chartManager.createLineChart(container, chartData);
    }

    // Registrar el nuevo gráfico
    if (newChart) {
      this.charts.set(containerId, newChart);
    }

    console.log(`✅ Gráfico ${chartId} cambiado a tipo ${chartType}`);
  }

  /**
   * Expande/contrae tablas
   */
  toggleTableExpansion(button) {
    const tableWrapper = button
      .closest(".table-container")
      .querySelector(".table-wrapper");
    const isExpanded = tableWrapper.style.maxHeight === "none";

    if (isExpanded) {
      tableWrapper.style.maxHeight = "400px";
      button.textContent = "📋 Ver Todo";
    } else {
      tableWrapper.style.maxHeight = "none";
      button.textContent = "📋 Contraer";
    }
  }

  /**
   * Muestra/oculta overlay de carga
   */
  showLoading(show) {
    this.isLoading = show;
    if (this.loadingOverlay) {
      if (show) {
        this.loadingOverlay.classList.add("active");
      } else {
        this.loadingOverlay.classList.remove("active");
      }
    }
  }

  /**
   * Muestra mensaje de error
   */
  showError(message) {
    console.error("❌", message);
    // Implementar toast o modal de error según diseño
    alert(message); // Temporal
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  const controller = new EstadisticasController();
  controller.init();

  // Exportar para debug
  window.estadisticasController = controller;
});

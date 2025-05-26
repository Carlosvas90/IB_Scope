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

    // Sistema de preferencias de usuario para tipos de gráficos
    this.userPreferences = this.loadUserPreferences();

    console.log("📊 EstadisticasController inicializado");
  }

  /**
   * Carga las preferencias del usuario desde localStorage
   */
  loadUserPreferences() {
    try {
      const saved = localStorage.getItem("estadisticas_chart_preferences");
      return saved
        ? JSON.parse(saved)
        : {
            "hourly-errors": "line",
            "error-distribution": "bar",
            "reason-distribution": "bar",
          };
    } catch (error) {
      console.warn("Error cargando preferencias:", error);
      return {
        "hourly-errors": "line",
        "error-distribution": "bar",
        "reason-distribution": "bar",
      };
    }
  }

  /**
   * Guarda las preferencias del usuario en localStorage
   */
  saveUserPreferences() {
    try {
      localStorage.setItem(
        "estadisticas_chart_preferences",
        JSON.stringify(this.userPreferences)
      );
    } catch (error) {
      console.warn("Error guardando preferencias:", error);
    }
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

    // Aplicar preferencias de usuario a los botones
    this.applyUserPreferencesToButtons();

    console.log("✅ Event listeners configurados");
  }

  /**
   * Aplica las preferencias de usuario a los botones de control
   */
  applyUserPreferencesToButtons() {
    Object.entries(this.userPreferences).forEach(([chartId, preferredType]) => {
      const buttons = document.querySelectorAll(`[data-chart="${chartId}"]`);
      buttons.forEach((btn) => {
        const btnType = btn.getAttribute("data-type");
        if (btnType === preferredType) {
          // Remover active de otros botones del mismo grupo
          const group = btn.parentElement;
          group
            .querySelectorAll(".chart-toggle")
            .forEach((b) => b.classList.remove("active"));
          // Activar el botón preferido
          btn.classList.add("active");
        }
      });
    });

    console.log("✅ Preferencias de usuario aplicadas a botones");
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
   * Actualiza los KPIs (sin tiempo promedio de resolución)
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

    // Gráfico de tendencias (solo líneas para un día, líneas/área para más días)
    console.log("🔄 Procesando datos de tendencias...");
    const trendData = this.analyticsProcessor.processTrendData(
      this.errors,
      this.currentDateRange
    );
    console.log("📈 Datos de tendencias procesados:", trendData);

    // Para un solo día, forzar tipo línea
    const trendType = this.currentDateRange === 0 ? "line" : "line";
    const trendChart = this.chartService.initTrendChart(
      "errors-trend-chart",
      trendData,
      trendType
    );
    console.log(
      "📈 Resultado gráfico de tendencias:",
      trendChart ? "✅ Creado" : "❌ Error"
    );

    // Gráfico de distribución por estado (siempre dona)
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

    const hourlyType = this.userPreferences["hourly-errors"] || "line";
    const hourlyChart = this.chartService.initHourlyChart(
      "hourly-errors-chart",
      hourlyData,
      hourlyType
    );
    console.log(
      "⏰ Resultado gráfico por hora:",
      hourlyChart ? "✅ Creado" : "❌ Error"
    );

    // Gráfico de top productos (siempre barras verticales)
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

    // NUEVO: Gráfico de distribución de errores (violations)
    console.log("🔄 Procesando distribución de errores...");
    const errorDistribution = this.analyticsProcessor.processErrorDistribution(
      this.errors,
      this.currentDateRange
    );
    console.log("📊 Distribución de errores procesada:", errorDistribution);

    const errorDistType = this.userPreferences["error-distribution"] || "bar";
    const errorDistChart = this.chartService.initDistributionChart(
      "error-distribution-chart",
      errorDistribution,
      "Distribución de Errores",
      errorDistType
    );
    console.log(
      "📊 Resultado gráfico distribución errores:",
      errorDistChart ? "✅ Creado" : "❌ Error"
    );

    // NUEVO: Gráfico de distribución de motivos (feedback_comment)
    console.log("🔄 Procesando distribución de motivos...");
    const reasonDistribution =
      this.analyticsProcessor.processReasonDistribution(
        this.errors,
        this.currentDateRange
      );
    console.log("📋 Distribución de motivos procesada:", reasonDistribution);

    const reasonDistType = this.userPreferences["reason-distribution"] || "bar";
    const reasonDistChart = this.chartService.initDistributionChart(
      "reason-distribution-chart",
      reasonDistribution,
      "Distribución de Motivos",
      reasonDistType
    );
    console.log(
      "📋 Resultado gráfico distribución motivos:",
      reasonDistChart ? "✅ Creado" : "❌ Error"
    );

    console.log("📈 Todos los gráficos actualizados");
  }

  /**
   * Actualiza las tablas
   */
  updateTables() {
    this.updateUsersRankingTable();
    this.updateProductsAnalysisTable();
  }

  /**
   * Actualiza la tabla de ranking de usuarios (Top Offenders)
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
        '<tr><td colspan="5" class="loading">No hay datos disponibles</td></tr>';
      return;
    }

    tbody.innerHTML = topUsers
      .map(
        (user, index) => `
      <tr>
        <td><strong>${index + 1}</strong></td>
        <td class="user-login" data-user="${user.userId}">${user.userId}</td>
        <td>${user.total}</td>
        <td>${user.mostCommonViolation}</td>
        <td>${user.mostCommonReason}</td>
      </tr>
    `
      )
      .join("");

    // Agregar eventos para mostrar foto al pasar el mouse
    this.setupUserHoverEvents();

    console.log("👥 Tabla de usuarios actualizada");
  }

  /**
   * Actualiza la tabla de análisis de productos (ASINs Top Offenders)
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
        <td class="asin-link" data-asin="${asin.asin}">${asin.asin}</td>
        <td>${asin.total}</td>
        <td>${asin.mostCommonViolation}</td>
        <td>${asin.mostCommonReason}</td>
        <td>${asin.frequency.toFixed(1)}</td>
      </tr>
    `
      )
      .join("");

    // Agregar eventos para hacer click en ASIN
    this.setupASINClickEvents();

    console.log("📦 Tabla de productos actualizada");
  }

  /**
   * Configura eventos para mostrar foto de usuario al pasar el mouse
   */
  setupUserHoverEvents() {
    const userElements = document.querySelectorAll(".user-login");
    userElements.forEach((element) => {
      element.addEventListener("mouseenter", (e) => {
        const userId = e.target.getAttribute("data-user");
        this.showUserTooltip(e.target, userId);
      });

      element.addEventListener("mouseleave", () => {
        this.hideUserTooltip();
      });
    });
  }

  /**
   * Configura eventos para hacer click en ASIN
   */
  setupASINClickEvents() {
    const asinElements = document.querySelectorAll(".asin-link");
    asinElements.forEach((element) => {
      element.style.cursor = "pointer";
      element.style.color = "var(--stats-primary-color)";
      element.style.textDecoration = "underline";

      element.addEventListener("click", (e) => {
        const asin = e.target.getAttribute("data-asin");
        this.openASINLink(asin);
      });
    });
  }

  /**
   * Muestra tooltip con foto de usuario
   */
  showUserTooltip(element, userId) {
    // Implementar lógica similar al feedback tracker
    // Por ahora, mostrar un tooltip simple
    const tooltip = document.createElement("div");
    tooltip.className = "user-tooltip";
    tooltip.innerHTML = `
      <div class="user-info">
        <img src="https://via.placeholder.com/40x40?text=${userId
          .charAt(0)
          .toUpperCase()}" alt="${userId}" />
        <span>${userId}</span>
      </div>
    `;

    tooltip.style.position = "absolute";
    tooltip.style.background = "var(--stats-bg-primary)";
    tooltip.style.border = "1px solid var(--stats-border-color)";
    tooltip.style.borderRadius = "var(--stats-radius-md)";
    tooltip.style.padding = "var(--stats-spacing-sm)";
    tooltip.style.zIndex = "1000";
    tooltip.style.boxShadow = "var(--stats-shadow-md)";

    const rect = element.getBoundingClientRect();
    tooltip.style.left = rect.left + "px";
    tooltip.style.top = rect.bottom + 5 + "px";

    document.body.appendChild(tooltip);
    this.currentTooltip = tooltip;
  }

  /**
   * Oculta tooltip de usuario
   */
  hideUserTooltip() {
    if (this.currentTooltip) {
      document.body.removeChild(this.currentTooltip);
      this.currentTooltip = null;
    }
  }

  /**
   * Abre enlace de Amazon para el ASIN
   */
  openASINLink(asin) {
    const amazonUrl = `https://www.amazon.com/dp/${asin}`;
    window.open(amazonUrl, "_blank");
  }

  /**
   * Actualiza el resumen e insights (sin tiempo promedio de resolución)
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
   * Cambia el tipo de un gráfico específico
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

    // Guardar preferencia del usuario
    this.userPreferences[chartId] = chartType;
    this.saveUserPreferences();

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
      case "error-distribution":
        data = this.analyticsProcessor.processErrorDistribution(
          this.errors,
          this.currentDateRange
        );
        this.chartService.initDistributionChart(
          "error-distribution-chart",
          data,
          "Distribución de Errores",
          chartType
        );
        break;
      case "reason-distribution":
        data = this.analyticsProcessor.processReasonDistribution(
          this.errors,
          this.currentDateRange
        );
        this.chartService.initDistributionChart(
          "reason-distribution-chart",
          data,
          "Distribución de Motivos",
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

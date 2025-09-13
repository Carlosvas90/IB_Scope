/**
 * estadisticas-controller.js
 * Controlador principal para el dashboard de estadísticas
 * Integra EstadisticasDataService, AnalyticsProcessor y ChartService
 * NUEVO: Integración con sistema modular de gráficos
 */

import { EstadisticasDataService } from "./services/EstadisticasDataService.js";
import { AnalyticsProcessor } from "./services/AnalyticsProcessor.js";
import { ChartService } from "./services/ChartService.js";

export class EstadisticasController {
  constructor() {
    this.dataService = new EstadisticasDataService();
    this.analyticsProcessor = new AnalyticsProcessor();
    this.chartService = new ChartService();

    // Sistema modular de gráficos
    this.modularCharts = new Map();
    this.useModularCharts = false; // Empezar con sistema tradicional por defecto
    this.chartRegistry = null;

    this.currentDateRange = 0; // 0 = Hoy (por defecto)
    this.isLoading = false;
    this.errors = [];

    // Sistema de preferencias de usuario para tipos de gráficos
    this.userPreferences = this.loadUserPreferences();

    console.log("📊 EstadisticasController inicializado");
    console.log(
      "🔧 Sistema modular:",
      this.useModularCharts ? "ACTIVADO" : "DESACTIVADO"
    );
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

      // Intentar inicializar sistema modular (opcional)
      await this.tryInitModularCharts();

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
   * Intenta inicializar el sistema modular (sin fallar si no está disponible)
   */
  async tryInitModularCharts() {
    try {
      console.log("🔧 Intentando inicializar sistema modular...");

      // Importar dinámicamente el registro de gráficos
      const chartRegistryModule = await import(
        "./components/charts/ChartRegistry.js"
      );
      this.chartRegistry = chartRegistryModule.default;

      // Inicializar el registro
      await this.chartRegistry.initialize();

      // Configurar opciones globales
      this.chartRegistry.setGlobalConfig({
        defaultTheme: "light",
        autoRefresh: false, // Lo manejamos nosotros
        refreshInterval: 60000,
        responsive: true,
        exportable: true,
        errorHandling: "graceful",
      });

      this.useModularCharts = true;
      console.log("✅ Sistema modular inicializado");
      console.log(
        "📊 Gráficos disponibles:",
        this.chartRegistry.getAvailableChartTypes()
      );
    } catch (error) {
      console.warn(
        "⚠️ Sistema modular no disponible, usando tradicional:",
        error.message
      );
      this.useModularCharts = false;
      this.chartRegistry = null;
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
      // Asegurar que el valor seleccionado coincida con el valor predeterminado (0 = Hoy)
      dateRangeSelector.value = this.currentDateRange.toString();

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

    // Botón para alternar sistema de gráficos (solo si modular está disponible)
    const toggleSystemBtn = document.getElementById("toggle-chart-system");
    if (toggleSystemBtn && this.chartRegistry) {
      toggleSystemBtn.addEventListener("click", () => {
        this.toggleChartSystem();
      });
    } else if (toggleSystemBtn) {
      // Ocultar botón si sistema modular no está disponible
      toggleSystemBtn.style.display = "none";
    }

    // Botones de toggle de gráficos
    document.querySelectorAll(".chart-toggle").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.toggleChartType(e.target);
      });
    });

    // Configurar redimensionado de ventana
    window.addEventListener("resize", () => {
      if (this.useModularCharts && this.chartRegistry) {
        this.chartRegistry.resizeAll();
      } else {
        this.chartService.resizeAll();
      }
    });

    // Configurar observer para detectar cuando los contenedores se vuelven visibles
    this.setupVisibilityObserver();

    // Aplicar preferencias de usuario a los botones
    this.applyUserPreferencesToButtons();

    console.log("✅ Event listeners configurados");
  }

  /**
   * Alterna entre sistema modular y tradicional
   */
  async toggleChartSystem() {
    if (!this.chartRegistry) {
      console.warn("⚠️ Sistema modular no disponible");
      return;
    }

    console.log("🔄 Alternando sistema de gráficos...");

    // Limpiar gráficos actuales
    if (this.useModularCharts) {
      this.chartRegistry.destroyAll();
      this.modularCharts.clear();
    }

    // Alternar sistema
    this.useModularCharts = !this.useModularCharts;

    console.log(
      "🔧 Sistema actual:",
      this.useModularCharts ? "MODULAR" : "TRADICIONAL"
    );

    // Actualizar botón si existe
    const toggleBtn = document.getElementById("toggle-chart-system");
    if (toggleBtn) {
      toggleBtn.textContent = this.useModularCharts
        ? "Usar Sistema Tradicional"
        : "Usar Sistema Modular";
      toggleBtn.className = `btn ${
        this.useModularCharts ? "btn-warning" : "btn-success"
      }`;
    }

    // Actualizar gráficos
    this.updateCharts();

    this.showToast(
      `Sistema ${this.useModularCharts ? "modular" : "tradicional"} activado`,
      "info"
    );
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
    console.log(
      "🔧 Sistema:",
      this.useModularCharts ? "MODULAR" : "TRADICIONAL"
    );

    if (this.useModularCharts && this.chartRegistry) {
      this.updateModularCharts();
    } else {
      this.updateTraditionalCharts();
    }

    console.log("📈 Todos los gráficos actualizados");
  }

  /**
   * Actualiza gráficos usando el sistema modular
   */
  async updateModularCharts() {
    try {
      console.log("🔧 Actualizando gráficos con sistema modular...");

      // Solo crear gráficos que están disponibles
      const availableTypes = this.chartRegistry.getAvailableChartTypes();

      // Crear gráficos modulares con un pequeño delay entre cada uno
      if (availableTypes.includes("trend")) {
        await this.createModularTrendChart();
        await new Promise((resolve) => setTimeout(resolve, 100)); // Delay entre gráficos
      }

      if (availableTypes.includes("statusdistribution")) {
        await this.createModularStatusChart();
        await new Promise((resolve) => setTimeout(resolve, 100)); // Delay entre gráficos
      }

      // Para gráficos no disponibles, usar sistema tradicional
      this.updateRemainingChartsTraditional();

      console.log("✅ Gráficos modulares actualizados");
    } catch (error) {
      console.error("❌ Error actualizando gráficos modulares:", error);
      // Fallback al sistema tradicional
      this.useModularCharts = false;
      this.updateTraditionalCharts();
    }
  }

  /**
   * Actualiza gráficos restantes con sistema tradicional
   */
  updateRemainingChartsTraditional() {
    console.log(
      "🔄 Actualizando gráficos restantes con sistema tradicional..."
    );

    // Gráfico de errores por hora (combinado barras y líneas)
    const hourlyData = this.analyticsProcessor.processHourlyData(
      this.errors,
      this.currentDateRange
    );
    // Ya no usamos tipo de gráfico porque ahora es combinado
    this.chartService.initHourlyChart("hourly-errors-chart", hourlyData);

    // Top productos
    const topASINs = this.analyticsProcessor.processTopASINs(
      this.errors,
      this.currentDateRange,
      10
    );
    const topProductsData = topASINs.map((item) => ({
      name: item.asin,
      total: item.total,
    }));
    this.chartService.initTopChart(
      "top-products-chart",
      topProductsData,
      "Top Productos con Errores"
    );

    // Distribución de errores (siempre barras)
    const errorDistribution = this.analyticsProcessor.processErrorDistribution(
      this.errors,
      this.currentDateRange
    );
    // Siempre usar tipo "bar"
    this.chartService.initDistributionChart(
      "error-distribution-chart",
      errorDistribution,
      "Distribución de Errores",
      "bar"
    );

    // Distribución de motivos (siempre barras)
    const reasonDistribution =
      this.analyticsProcessor.processReasonDistribution(
        this.errors,
        this.currentDateRange
      );
    // Siempre usar tipo "bar"
    this.chartService.initDistributionChart(
      "reason-distribution-chart",
      reasonDistribution,
      "Distribución de Motivos",
      "bar"
    );
  }

  /**
   * Crea gráfico de tendencias modular
   */
  async createModularTrendChart() {
    try {
      console.log("📈 Creando gráfico de tendencias modular...");

      const container = document.getElementById("errors-trend-chart");
      if (!container) {
        console.warn("⚠️ Contenedor errors-trend-chart no encontrado");
        return;
      }

      // Verificar que el contenedor esté visible
      if (!container.offsetParent) {
        console.warn(
          "⚠️ Contenedor errors-trend-chart no está visible, esperando..."
        );
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Limpiar gráfico anterior si existe
      const existingChart = this.modularCharts.get("trend");
      if (existingChart) {
        try {
          existingChart.destroy();
        } catch (e) {
          console.warn("⚠️ Error destruyendo gráfico anterior:", e);
        }
        this.modularCharts.delete("trend");
      }

      // Obtener datos reales del sistema
      const trendData = this.analyticsProcessor.processTrendData(
        this.errors,
        this.currentDateRange
      );
      console.log("📊 Datos de tendencias obtenidos:", trendData);

      // Verificar que hay datos
      if (!trendData || !trendData.dates || trendData.dates.length === 0) {
        console.warn("⚠️ No hay datos de tendencias para mostrar");
        return;
      }

      // Determinar período y granularidad
      const period =
        this.currentDateRange === 0
          ? "1d"
          : this.currentDateRange <= 7
          ? "7d"
          : this.currentDateRange <= 30
          ? "30d"
          : this.currentDateRange <= 90
          ? "90d"
          : "365d";

      const granularity = this.currentDateRange === 0 ? "hour" : "day";

      // Crear gráfico modular con datos reales
      const trendChart = this.chartRegistry.create("trend", container, {
        title: "Tendencias de Errores",
        period: period,
        granularity: granularity,
        showArea: true,
        multiSeries: true,
        smoothCurve: true,
        realData: trendData,
      });

      // Configurar eventos
      trendChart.on("click", (params) => {
        console.log("🖱️ Clic en tendencias:", params);
      });

      // Renderizar con retry
      let renderAttempts = 0;
      const maxAttempts = 3;

      while (renderAttempts < maxAttempts) {
        try {
          await trendChart.render();
          break; // Éxito, salir del loop
        } catch (renderError) {
          renderAttempts++;
          console.warn(
            `⚠️ Intento ${renderAttempts} de renderizado falló:`,
            renderError
          );
          if (renderAttempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          } else {
            throw renderError; // Re-lanzar después del último intento
          }
        }
      }

      // Guardar referencia
      this.modularCharts.set("trend", trendChart);

      console.log("✅ Gráfico de tendencias modular creado");
    } catch (error) {
      console.error("❌ Error creando gráfico de tendencias modular:", error);
      // Fallback al tradicional para este gráfico
      try {
        const trendData = this.analyticsProcessor.processTrendData(
          this.errors,
          this.currentDateRange
        );
        this.chartService.initTrendChart(
          "errors-trend-chart",
          trendData,
          "line"
        );
      } catch (fallbackError) {
        console.error("❌ Error en fallback de tendencias:", fallbackError);
      }
    }
  }

  /**
   * Crea gráfico de distribución de estado modular
   */
  async createModularStatusChart() {
    try {
      console.log("🥧 Creando gráfico de distribución modular...");

      const container = document.getElementById("status-distribution-chart");
      if (!container) {
        console.warn("⚠️ Contenedor status-distribution-chart no encontrado");
        return;
      }

      // Verificar que el contenedor esté visible
      if (!container.offsetParent) {
        console.warn(
          "⚠️ Contenedor status-distribution-chart no está visible, esperando..."
        );
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      // Limpiar gráfico anterior si existe
      const existingChart = this.modularCharts.get("status");
      if (existingChart) {
        try {
          existingChart.destroy();
        } catch (e) {
          console.warn("⚠️ Error destruyendo gráfico anterior:", e);
        }
        this.modularCharts.delete("status");
      }

      // Obtener datos reales del sistema
      const statusData = this.analyticsProcessor.processStatusDistribution(
        this.errors,
        this.currentDateRange
      );
      console.log("📊 Datos de distribución obtenidos:", statusData);

      // Verificar que hay datos
      if (!statusData || statusData.length === 0) {
        console.warn("⚠️ No hay datos de distribución para mostrar");
        return;
      }

      // Crear gráfico modular con datos reales
      const statusChart = this.chartRegistry.create(
        "statusdistribution",
        container,
        {
          title: "Distribución por Estado",
          type: "doughnut",
          showPercentages: true,
          showValues: true,
          labelPosition: "outside",
          realData: statusData,
        }
      );

      // Configurar eventos
      statusChart.on("click", (params) => {
        console.log("🖱️ Clic en distribución:", params);
      });

      // Renderizar con retry
      let renderAttempts = 0;
      const maxAttempts = 3;

      while (renderAttempts < maxAttempts) {
        try {
          await statusChart.render();
          break; // Éxito, salir del loop
        } catch (renderError) {
          renderAttempts++;
          console.warn(
            `⚠️ Intento ${renderAttempts} de renderizado falló:`,
            renderError
          );
          if (renderAttempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 200));
          } else {
            throw renderError; // Re-lanzar después del último intento
          }
        }
      }

      // Guardar referencia
      this.modularCharts.set("status", statusChart);

      console.log("✅ Gráfico de distribución modular creado");
    } catch (error) {
      console.error("❌ Error creando gráfico de distribución modular:", error);
      // Fallback al tradicional para este gráfico
      try {
        const statusData = this.analyticsProcessor.processStatusDistribution(
          this.errors,
          this.currentDateRange
        );
        this.chartService.initStatusChart(
          "status-distribution-chart",
          statusData
        );
      } catch (fallbackError) {
        console.error("❌ Error en fallback de distribución:", fallbackError);
      }
    }
  }

  /**
   * Actualiza gráficos usando el sistema tradicional
   */
  updateTraditionalCharts() {
    console.log("🔧 Actualizando gráficos con sistema tradicional...");

    // Gráfico de tendencias
    const trendData = this.analyticsProcessor.processTrendData(
      this.errors,
      this.currentDateRange
    );
    const trendType = this.currentDateRange === 0 ? "line" : "line";
    this.chartService.initTrendChart(
      "errors-trend-chart",
      trendData,
      trendType
    );

    // Gráfico de distribución por estado
    const statusData = this.analyticsProcessor.processStatusDistribution(
      this.errors,
      this.currentDateRange
    );
    this.chartService.initStatusChart("status-distribution-chart", statusData);

    // Resto de gráficos
    this.updateRemainingChartsTraditional();
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

    this.setupUserHoverEvents();
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
        <td class="asin-link" data-asin="${asin.asin}">${asin.asin}</td>
        <td>${asin.total}</td>
        <td>${asin.mostCommonViolation}</td>
        <td>${asin.mostCommonReason}</td>
        <td>${asin.frequency.toFixed(1)}</td>
      </tr>
    `
      )
      .join("");

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
   * Configura observer para detectar visibilidad de contenedores
   */
  setupVisibilityObserver() {
    if (!window.IntersectionObserver) {
      console.warn("⚠️ IntersectionObserver no disponible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && this.useModularCharts) {
            const containerId = entry.target.id;
            console.log(`👁️ Contenedor ${containerId} ahora es visible`);

            // Verificar si necesita reparación después de un pequeño delay
            setTimeout(() => {
              this.verifyAndFixModularCharts();
            }, 100);
          }
        });
      },
      {
        threshold: 0.1, // Trigger cuando al menos 10% es visible
        rootMargin: "50px", // Trigger un poco antes de que sea completamente visible
      }
    );

    // Observar contenedores de gráficos modulares
    const trendContainer = document.getElementById("errors-trend-chart");
    const statusContainer = document.getElementById(
      "status-distribution-chart"
    );

    if (trendContainer) observer.observe(trendContainer);
    if (statusContainer) observer.observe(statusContainer);

    // Guardar referencia para limpieza posterior
    this.visibilityObserver = observer;
  }

  /**
   * Verifica y corrige gráficos modulares que puedan haber desaparecido
   */
  async verifyAndFixModularCharts() {
    if (!this.useModularCharts || !this.chartRegistry) {
      return;
    }

    console.log("🔍 Verificando estado de gráficos modulares...");

    // Verificar gráfico de tendencias
    const trendContainer = document.getElementById("errors-trend-chart");
    const trendChart = this.modularCharts.get("trend");

    if (trendContainer && (!trendChart || !trendChart.chart)) {
      console.log("🔧 Gráfico de tendencias necesita reparación");
      await this.createModularTrendChart();
    }

    // Verificar gráfico de distribución
    const statusContainer = document.getElementById(
      "status-distribution-chart"
    );
    const statusChart = this.modularCharts.get("status");

    if (statusContainer && (!statusChart || !statusChart.chart)) {
      console.log("🔧 Gráfico de distribución necesita reparación");
      await this.createModularStatusChart();
    }
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

    // Verificar y corregir gráficos modulares después de un pequeño delay
    setTimeout(() => {
      this.verifyAndFixModularCharts();
    }, 500);
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

        // Verificar y corregir gráficos modulares después de actualizar
        setTimeout(() => {
          this.verifyAndFixModularCharts();
        }, 300);

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
        // No cambiamos el tipo porque ahora es un gráfico combinado
        console.log(
          "⚠️ El gráfico de errores por hora ahora es combinado (barras + líneas)"
        );
        break;
      case "error-distribution":
        // Siempre usar tipo "bar" para distribución de errores
        console.log(
          "⚠️ El gráfico de distribución de errores ahora es siempre de barras"
        );
        break;
      case "reason-distribution":
        // Siempre usar tipo "bar" para distribución de motivos
        console.log(
          "⚠️ El gráfico de distribución de motivos ahora es siempre de barras"
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
   * Muestra un toast
   */
  showToast(message, type = "info") {
    if (window.showToast) {
      window.showToast(message, type);
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }
}

/**
 * estadisticas.js
 * Controlador principal para el dashboard de estadísticas
 * Integra EstadisticasDataService, AnalyticsProcessor y ChartService
 * NUEVO: Integración con sistema modular de gráficos
 * OPTIMIZADO: Opción de usar OptimizedDataService (Fase 2)
 */

// FASE 2: Importar OptimizedDataService para caché inteligente
import { OptimizedDataService } from "./services/OptimizedDataService.js";
import { EstadisticasDataService } from "./services/EstadisticasDataService.js";
import { AnalyticsProcessor } from "./services/AnalyticsProcessor.js";
import { ChartService } from "./services/ChartService.js";
// NUEVO: Importar sistema modular
import chartRegistry from "./components/charts/ChartRegistry.js";
// Importar gestor de KPIs
import { KPIManager } from "./components/kpis/KPIManager.js";

class EstadisticasController {
  constructor() {
    // FASE 2: Opción de usar OptimizedDataService
    // Cambiar a true para activar caché inteligente con IndexedDB
    this.useOptimizedService = true;

    // Inicializar servicio de datos según configuración
    if (this.useOptimizedService) {
      console.log("🚀 Usando OptimizedDataService (Caché IndexedDB)");
      this.dataService = new OptimizedDataService();
    } else {
      console.log("📊 Usando EstadisticasDataService (Modo tradicional)");
      this.dataService = new EstadisticasDataService();
    }
    this.analyticsProcessor = new AnalyticsProcessor();
    this.chartService = new ChartService();

    // Gestor de KPIs
    this.kpiManager = new KPIManager();

    // NUEVO: Sistema modular de gráficos
    this.modularCharts = new Map();
    this.useModularCharts = true; // Flag para alternar entre sistemas

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

      // NUEVO: Inicializar sistema modular si está activado
      if (this.useModularCharts) {
        await this.initModularCharts();
      }

      // Inicializar servicios
      await this.dataService.init();

      // FASE 3: Habilitar sincronización automática si está usando OptimizedDataService
      // TEMPORALMENTE DESHABILITADO para evitar bucle infinito
      if (false && this.useOptimizedService && this.dataService.enableSync) {
        console.log("🔄 Habilitando sincronización automática...");
        this.dataService.enableSync({
          pollingInterval: 30000, // 30 segundos
          autoRefresh: true,
          notifyUsers: true,
        });
        console.log("✅ Sincronización automática habilitada");
      }

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
   * NUEVO: Inicializa el sistema modular de gráficos
   */
  async initModularCharts() {
    try {
      console.log("🔧 Inicializando sistema modular de gráficos...");

      // Inicializar el registro
      await chartRegistry.initialize();

      // Configurar opciones globales
      chartRegistry.setGlobalConfig({
        defaultTheme: "light",
        autoRefresh: false, // Lo manejamos nosotros
        refreshInterval: 60000,
        responsive: true,
        exportable: true,
        errorHandling: "graceful",
      });

      console.log("✅ Sistema modular inicializado");
      console.log(
        "📊 Gráficos disponibles:",
        chartRegistry.getAvailableChartTypes()
      );
    } catch (error) {
      console.error("❌ Error inicializando sistema modular:", error);
      // Fallback al sistema tradicional
      this.useModularCharts = false;
      console.log("🔄 Fallback al sistema tradicional de gráficos");
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

    // NUEVO: Botón para alternar sistema de gráficos (para testing)
    const toggleSystemBtn = document.getElementById("toggle-chart-system");
    if (toggleSystemBtn) {
      toggleSystemBtn.addEventListener("click", () => {
        this.toggleChartSystem();
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
      if (this.useModularCharts) {
        chartRegistry.resizeAll();
      } else {
        this.chartService.resizeAll();
      }
    });

    // Aplicar preferencias de usuario a los botones
    this.applyUserPreferencesToButtons();

    console.log("✅ Event listeners configurados");
  }

  /**
   * NUEVO: Alterna entre sistema modular y tradicional
   */
  async toggleChartSystem() {
    console.log("🔄 Alternando sistema de gráficos...");

    // Limpiar gráficos actuales
    if (this.useModularCharts) {
      chartRegistry.destroyAll();
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

    // Re-inicializar sistema modular si es necesario
    if (this.useModularCharts) {
      await this.initModularCharts();
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
        // NUEVO: Ya no usamos this.errors, los datos vienen pre-procesados
        const allData = this.dataService.getAllData();
        const totalRecords = allData?.metadata?.total_records || 0;
        const totalIncidents = allData?.kpis?.total_incidents || 0;

        console.log(
          `✅ Datos cargados: ${totalRecords} registros, ${totalIncidents} incidentes`
        );

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

    // DEBUG: Ver estructura completa de datos
    console.log("=".repeat(80));
    console.log("🔍 DEBUG: Estructura completa de datos del servicio");
    const allData = this.dataService.getAllData();

    if (allData) {
      console.log("📊 KPIs completos:", this.dataService.getKPIs());
      console.log("📈 Trends completos:", this.dataService.getTrends());
      console.log(
        "📊 Distribution completa:",
        this.dataService.getDistribution()
      );
      console.log("🏆 Top ASINs completos:", this.dataService.getTopASINs());
      console.log(
        "🏆 Top Violations completos:",
        this.dataService.getTopViolations()
      );
      console.log(
        "🏆 Top Motives completos:",
        this.dataService.getTopMotives()
      );
      console.log(
        "👥 Top Offenders completos:",
        this.dataService.getTopOffenders()
      );
      console.log("💡 Insights completos:", this.dataService.getInsights());
      console.log("📋 Metadata completa:", this.dataService.getMetadata());
    } else {
      console.error("❌ getAllData() retornó null o undefined!");
    }
    console.log("=".repeat(80));

    // Actualizar KPIs
    this.updateKPIs();

    // Actualizar gráficos
    this.updateCharts();

    // Actualizar tablas
    this.updateTables();

    // Actualizar resumen e insights
    this.updateSummary();

    // NUEVO: Actualizar información del rango de fechas (removido - no hay elemento en HTML)
    // this.updateDateRangeInfo();

    console.log("✅ Componentes actualizados");
  }

  /**
   * Actualiza los KPIs usando el KPIManager
   */
  updateKPIs() {
    // NUEVO: Obtener KPIs directamente del servicio (ya procesados)
    const kpis = this.dataService.getKPIs();

    console.log("🔍 DEBUG updateKPIs - KPIs del servicio:", kpis);

    // Convertir a formato esperado por KPIManager
    const kpisForManager = {
      totalErrors: kpis.total_incidents || 0,
      pendingErrors: kpis.pending || 0,
      resolvedErrors: kpis.resolved || 0,
      resolutionRate: kpis.resolution_rate || 0,
      avgResolutionTime: 0, // No disponible en nuevos datos
      dailyAverage: kpis.daily_average || 0,
    };

    console.log("🔍 DEBUG updateKPIs - KPIs para manager:", kpisForManager);

    // Usar el gestor de KPIs para actualizar todos los componentes
    this.kpiManager.updateAll(kpisForManager);

    console.log("📊 KPIs actualizados a través del KPIManager");
  }

  /**
   * Actualiza todos los gráficos
   */
  updateCharts() {
    console.log("📈 Actualizando gráficos...");

    // NUEVO: Obtener datos del servicio
    const allData = this.dataService.getAllData();
    const totalRecords = allData?.metadata?.total_records || 0;

    console.log("📊 Datos disponibles:", totalRecords, "registros");
    console.log("📅 Rango de fechas actual:", this.currentDateRange, "días");
    console.log(
      "🔧 Sistema:",
      this.useModularCharts ? "MODULAR" : "TRADICIONAL"
    );

    if (this.useModularCharts) {
      this.updateModularCharts();
    } else {
      this.updateTraditionalCharts();
    }

    console.log("📈 Todos los gráficos actualizados");
  }

  /**
   * NUEVO: Actualiza gráficos usando el sistema modular
   */
  async updateModularCharts() {
    try {
      console.log("🔧 Actualizando gráficos con sistema modular...");

      // 1. Gráfico de tendencias
      await this.createModularTrendChart();

      // 2. Gráfico de distribución por estado
      await this.createModularStatusChart();

      // 3. Gráfico de errores por hora (pendiente - usar sistema tradicional por ahora)
      console.log(
        "⏰ Gráfico por hora - usando sistema tradicional temporalmente"
      );
      const hourlyData = this.analyticsProcessor.processHourlyData(
        this.errors,
        this.currentDateRange
      );
      const hourlyType = this.userPreferences["hourly-errors"] || "line";
      this.chartService.initHourlyChart(
        "hourly-errors-chart",
        hourlyData,
        hourlyType
      );

      // 4. Top productos (pendiente - usar sistema tradicional por ahora)
      console.log(
        "📦 Top productos - usando sistema tradicional temporalmente"
      );
      const topASINs = this.analyticsProcessor.processTopASINs(
        this.errors,
        this.currentDateRange,
        10
      );
      const topProductsData = topASINs.map((item) => ({
        name: item.asin || item.name,
        total: item.count || item.total || item.total_errors || 0,
      }));
      this.chartService.initTopChart(
        "top-products-chart",
        topProductsData,
        "Top Productos con Errores"
      );

      // 5. Distribución de errores (pendiente - usar sistema tradicional por ahora)
      console.log(
        "📊 Distribución errores - usando sistema tradicional temporalmente"
      );
      const errorDistribution =
        this.analyticsProcessor.processErrorDistribution(
          this.errors,
          this.currentDateRange
        );
      const errorDistType = this.userPreferences["error-distribution"] || "bar";
      this.chartService.initDistributionChart(
        "error-distribution-chart",
        errorDistribution,
        "Distribución de Errores",
        errorDistType
      );

      // 6. Distribución de motivos (pendiente - usar sistema tradicional por ahora)
      console.log(
        "📋 Distribución motivos - usando sistema tradicional temporalmente"
      );
      const reasonDistribution =
        this.analyticsProcessor.processReasonDistribution(
          this.errors,
          this.currentDateRange
        );
      const reasonDistType =
        this.userPreferences["reason-distribution"] || "bar";
      this.chartService.initDistributionChart(
        "reason-distribution-chart",
        reasonDistribution,
        "Distribución de Motivos",
        reasonDistType
      );

      console.log("✅ Gráficos modulares actualizados");
    } catch (error) {
      console.error("❌ Error actualizando gráficos modulares:", error);
      // Fallback al sistema tradicional
      this.useModularCharts = false;
      this.updateTraditionalCharts();
    }
  }

  /**
   * NUEVO: Crea gráfico de tendencias modular
   */
  async createModularTrendChart() {
    try {
      console.log("📈 Creando gráfico de tendencias modular...");

      const container = document.getElementById("errors-trend-chart");
      if (!container) {
        console.warn("⚠️ Contenedor errors-trend-chart no encontrado");
        return;
      }

      // Limpiar gráfico anterior si existe
      const existingChart = this.modularCharts.get("trend");
      if (existingChart) {
        existingChart.destroy();
      }

      // Obtener datos reales del sistema
      const trendData = this.analyticsProcessor.processTrendData(
        this.errors,
        this.currentDateRange
      );
      console.log("📊 Datos de tendencias obtenidos:", trendData);

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
      const trendChart = chartRegistry.create("trend", container, {
        title: "Tendencias de Errores",
        period: period,
        granularity: granularity,
        showArea: true,
        multiSeries: true,
        smoothCurve: true,
        realData: trendData, // NUEVO: Pasar datos reales
      });

      // Configurar eventos
      trendChart.on("click", (params) => {
        console.log("🖱️ Clic en tendencias:", params);
      });

      // Renderizar
      await trendChart.render();

      // Guardar referencia
      this.modularCharts.set("trend", trendChart);

      console.log("✅ Gráfico de tendencias modular creado");
    } catch (error) {
      console.error("❌ Error creando gráfico de tendencias modular:", error);
      throw error;
    }
  }

  /**
   * NUEVO: Crea gráfico de distribución de estado modular
   */
  async createModularStatusChart() {
    try {
      console.log("🥧 Creando gráfico de distribución modular...");

      const container = document.getElementById("status-distribution-chart");
      if (!container) {
        console.warn("⚠️ Contenedor status-distribution-chart no encontrado");
        return;
      }

      // Limpiar gráfico anterior si existe
      const existingChart = this.modularCharts.get("status");
      if (existingChart) {
        existingChart.destroy();
      }

      // Obtener datos reales del sistema
      const statusData = this.analyticsProcessor.processStatusDistribution(
        this.errors,
        this.currentDateRange
      );
      console.log("📊 Datos de distribución obtenidos:", statusData);

      // Crear gráfico modular con datos reales
      const statusChart = chartRegistry.create(
        "statusdistribution",
        container,
        {
          title: "Distribución por Estado",
          type: "doughnut",
          showPercentages: true,
          showValues: true,
          labelPosition: "outside",
          realData: statusData, // NUEVO: Pasar datos reales
        }
      );

      // Configurar eventos
      statusChart.on("click", (params) => {
        console.log("🖱️ Clic en distribución:", params);
      });

      // Renderizar
      await statusChart.render();

      // Guardar referencia
      this.modularCharts.set("status", statusChart);

      console.log("✅ Gráfico de distribución modular creado");
    } catch (error) {
      console.error("❌ Error creando gráfico de distribución modular:", error);
      throw error;
    }
  }

  /**
   * Actualiza gráficos usando el sistema tradicional
   */
  updateTraditionalCharts() {
    console.log("🔧 Actualizando gráficos con sistema tradicional...");

    // NUEVO: Obtener datos del servicio (ya procesados)
    const trends = this.dataService.getTrends();
    const distribution = this.dataService.getDistribution();
    const topASINs = this.dataService.getTopASINs();
    const topViolations = this.dataService.getTopViolations();
    const topMotives = this.dataService.getTopMotives();

    console.log("🔍 DEBUG updateTraditionalCharts - Datos obtenidos:");
    console.log("  - trends:", trends);
    console.log("  - distribution:", distribution);
    console.log("  - topASINs:", topASINs);
    console.log("  - topViolations:", topViolations);
    console.log("  - topMotives:", topMotives);

    // Gráfico de tendencias
    console.log("🔄 Procesando datos de tendencias...");
    const trendData = {
      dates: trends.by_day.map((d) => d.date),
      series: [
        {
          name: "Total",
          data: trends.by_day.map((d) => d.total || 0),
        },
        {
          name: "Pendientes",
          data: trends.by_day.map((d) => d.pending || 0),
        },
        {
          name: "Resueltos",
          data: trends.by_day.map((d) => d.resolved || 0),
        },
      ],
    };
    console.log("📈 Datos de tendencias procesados:", trendData);
    const trendType = this.currentDateRange === 0 ? "line" : "line";
    this.chartService.initTrendChart(
      "errors-trend-chart",
      trendData,
      trendType
    );
    console.log("📈 Resultado gráfico de tendencias: ✅ Creado");

    // Gráfico de distribución por estado
    console.log("🔄 Procesando datos de estado...");
    console.log("🔍 DEBUG - distribution completo:", distribution);
    console.log("🔍 DEBUG - distribution.by_status:", distribution?.by_status);

    let statusData = distribution.by_status || [];

    // Asegurar que tiene el formato correcto {name, value}
    if (statusData.length > 0 && !statusData[0].name) {
      console.log("⚠️ statusData no tiene formato correcto, transformando...");
      // Si tiene status/count en lugar de name/value, transformar
      statusData = statusData.map((item) => ({
        name: item.status || item.name || "Sin estado",
        value: item.count || item.value || 0,
      }));
      console.log("🔍 DEBUG - statusData transformado:", statusData);
    }

    console.log("🥧 Datos de estado procesados:", statusData);
    console.log("🔍 DEBUG - statusData es array?:", Array.isArray(statusData));
    console.log("🔍 DEBUG - statusData length:", statusData?.length);
    if (statusData && statusData.length > 0) {
      console.log("🔍 DEBUG - Primer elemento statusData:", statusData[0]);
    }

    this.chartService.initStatusChart("status-distribution-chart", statusData);
    console.log("🥧 Resultado gráfico de estado: ✅ Creado");

    // Gráfico de errores por hora
    console.log("🔄 Procesando datos por hora...");
    const hourlyData = {
      hours: trends.by_hour.map((h) => h.hour),
      data: trends.by_hour.map((h) => h.count || 0),
    };
    console.log("⏰ Datos por hora procesados:", hourlyData);
    this.chartService.initHourlyChart("hourly-errors-chart", hourlyData);
    console.log("⏰ Resultado gráfico por hora: ✅ Creado");

    // Top productos
    console.log("🔄 Procesando top ASINs...");
    console.log("📦 Top ASINs procesados:", topASINs);
    const topProductsData = topASINs.map((item) => ({
      name: item.asin || item.name,
      total: item.count || item.total || item.total_errors || 0,
    }));
    console.log("📦 Datos de top productos:", topProductsData);
    this.chartService.initTopChart(
      "top-products-chart",
      topProductsData,
      "Top Productos con Errores"
    );
    console.log("📦 Resultado gráfico top productos: ✅ Creado");

    // Distribución de violaciones
    console.log("🔄 Procesando distribución de errores...");
    const errorDistribution = topViolations.map((item) => ({
      name: item.violation || item.name,
      value: item.count || item.value || 0,
    }));
    console.log("📊 Distribución de errores procesada:", errorDistribution);
    const errorDistType = this.userPreferences["error-distribution"] || "bar";
    this.chartService.initDistributionChart(
      "error-distribution-chart",
      errorDistribution,
      "Distribución de Errores",
      errorDistType
    );
    console.log("📊 Resultado gráfico distribución errores: ✅ Creado");

    // Distribución de motivos
    console.log("🔄 Procesando distribución de motivos...");
    const reasonDistribution = topMotives.map((item) => ({
      name: item.motive || item.name,
      value: item.count || item.value || 0,
    }));
    console.log("📋 Distribución de motivos procesada:", reasonDistribution);
    const reasonDistType = this.userPreferences["reason-distribution"] || "bar";
    this.chartService.initDistributionChart(
      "reason-distribution-chart",
      reasonDistribution,
      "Distribución de Motivos",
      reasonDistType
    );
    console.log("📋 Resultado gráfico distribución motivos: ✅ Creado");
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

    // NUEVO: Obtener top offenders del servicio
    const topUsers = this.dataService.getTopOffenders();

    console.log("🔍 DEBUG updateUsersRankingTable - Top users:", topUsers);
    console.log(
      "🔍 DEBUG updateUsersRankingTable - Cantidad:",
      topUsers.length
    );
    if (topUsers.length > 0) {
      console.log(
        "🔍 DEBUG updateUsersRankingTable - Primer usuario:",
        topUsers[0]
      );
    }

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
        <td class="user-login" data-user="${
          user.user_id || user.userId || user.login
        }">${user.user_id || user.userId || user.login}</td>
        <td>${user.count || user.total || user.total_errors || 0}</td>
        <td>${
          user.most_common_violation ||
          user.mostCommonViolation ||
          user.most_common_error ||
          "N/A"
        }</td>
        <td>${
          user.most_common_motive || user.mostCommonReason || "Sin motivo"
        }</td>
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

    // NUEVO: Obtener top ASINs del servicio
    const topASINs = this.dataService.getTopASINs();

    console.log("🔍 DEBUG updateProductsAnalysisTable - Top ASINs:", topASINs);
    console.log(
      "🔍 DEBUG updateProductsAnalysisTable - Cantidad:",
      topASINs.length
    );
    if (topASINs.length > 0) {
      console.log(
        "🔍 DEBUG updateProductsAnalysisTable - Primer ASIN:",
        topASINs[0]
      );
    }

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
        <td class="asin-link" data-asin="${asin.asin || asin.name}">${
          asin.asin || asin.name
        }</td>
        <td>${asin.count || asin.total || asin.total_errors || 0}</td>
        <td>${
          asin.most_common_violation ||
          asin.mostCommonViolation ||
          asin.most_common_error ||
          "N/A"
        }</td>
        <td>${
          asin.most_common_motive || asin.mostCommonReason || "Sin motivo"
        }</td>
        <td>${
          asin.percentage?.toFixed(1) || asin.frequency?.toFixed(1) || "0.0"
        }</td>
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
    // NUEVO: Obtener datos directamente del servicio (ya procesados)
    const kpis = this.dataService.getKPIs();
    const metadata = this.dataService.getMetadata();
    const insights = this.dataService.getInsights();

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
        <p><strong>Total de errores:</strong> ${
          kpis.total_incidents
        } errores (${metadata.total_records} registros)</p>
        <p><strong>Tasa de resolución:</strong> ${kpis.resolution_rate.toFixed(
          1
        )}%</p>
        <p><strong>Promedio diario:</strong> ${kpis.daily_average.toFixed(
          1
        )} errores por día</p>
      `;
    }

    // Insights automáticos (pre-procesados en el JSON)
    const insightsContent = document.getElementById("insights-content");
    if (insightsContent && insights) {
      const insightsList = [
        insights.peak_hour
          ? `🔥 ${insights.peak_hour.description || "Pico de actividad"}`
          : null,
        insights.worst_day
          ? `📉 ${insights.worst_day.description || "Peor día"}`
          : null,
        insights.best_day
          ? `📈 ${insights.best_day.description || "Mejor día"}`
          : null,
        insights.trend_description ? `📊 ${insights.trend_description}` : null,
      ].filter(Boolean);

      if (insights.suggestions && insights.suggestions.length > 0) {
        insightsList.push(...insights.suggestions.map((s) => `💡 ${s}`));
      }

      insightsContent.innerHTML = insightsList
        .map((insight) => `<p>${insight}</p>`)
        .join("");
    }

    console.log("📝 Resumen e insights actualizados");
  }

  /**
   * NUEVO: Actualiza la información del rango de fechas seleccionado
   */
  updateDateRangeInfo() {
    const dateRangeInfo = document.getElementById("date-range-info");
    if (!dateRangeInfo) return;

    const periodText =
      this.currentDateRange === 0
        ? "hoy"
        : this.currentDateRange === 1
        ? "ayer"
        : `últimos ${this.currentDateRange} días`;

    const dataSource =
      this.currentDateRange === 0
        ? "datos actuales"
        : "datos históricos + actuales";

    dateRangeInfo.innerHTML = `
      <div class="date-range-info">
        <span class="period-text">📅 ${periodText}</span>
        <span class="data-source">📊 ${dataSource}</span>
        <span class="record-count">📈 ${this.errors.length} registros</span>
      </div>
    `;

    console.log(
      `📅 Información de rango actualizada: ${periodText} (${dataSource})`
    );
  }

  /**
   * Cambia el rango de fechas
   */
  async changeDateRange(newRange) {
    if (newRange === this.currentDateRange) return;

    console.log(`📅 Cambiando rango de fechas a: ${newRange} días`);
    this.currentDateRange = newRange;

    try {
      this.showLoading(true);

      // Usar el nuevo método del dataService para cambiar rango de fechas
      const success = await this.dataService.changeDateRange(newRange);

      if (success) {
        // NUEVO: Ya no usamos this.errors, los datos vienen pre-procesados del servicio
        const allData = this.dataService.getAllData();
        const totalRecords = allData?.metadata?.total_records || 0;
        const totalIncidents = allData?.kpis?.total_incidents || 0;

        console.log(
          `✅ Rango de fechas cambiado: ${totalRecords} registros, ${totalIncidents} incidentes`
        );

        // Actualizar todos los componentes con el nuevo rango
        this.updateAllComponents();
      } else {
        throw new Error("Error al cambiar rango de fechas");
      }
    } catch (error) {
      console.error("❌ Error cambiando rango de fechas:", error);
      this.showError("Error al cambiar el rango de fechas");
    } finally {
      this.showLoading(false);
    }
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
        // NUEVO: Ya no usamos this.errors, los datos vienen pre-procesados
        const allData = this.dataService.getAllData();
        const totalRecords = allData?.metadata?.total_records || 0;
        const totalIncidents = allData?.kpis?.total_incidents || 0;

        console.log(
          `✅ Datos refrescados: ${totalRecords} registros, ${totalIncidents} incidentes`
        );

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

    // Actualizar estado de carga en los KPIs
    this.kpiManager.setLoading(show);
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

// Función global para forzar redimensionamiento de gráficos
window.resizeEstadisticasCharts = function () {
  console.log("📐 Redimensionando gráficos de estadísticas...");
  
  if (estadisticasController && estadisticasController.useModularCharts) {
    try {
      chartRegistry.resizeAll();
      console.log("✅ Gráficos redimensionados correctamente");
    } catch (error) {
      console.warn("⚠️ Error al redimensionar gráficos:", error);
    }
  } else if (estadisticasController) {
    // Fallback: redimensionar gráficos tradicionales
    try {
      Object.values(estadisticasController.charts || {}).forEach(chart => {
        if (chart && typeof chart.resize === 'function') {
          chart.resize();
        }
      });
      console.log("✅ Gráficos tradicionales redimensionados");
    } catch (error) {
      console.warn("⚠️ Error al redimensionar gráficos tradicionales:", error);
    }
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

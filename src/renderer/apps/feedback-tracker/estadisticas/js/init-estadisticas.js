/**
 * init-estadisticas.js
 * Inicializador robusto para el módulo de estadísticas
 * Maneja la carga del sistema modular y fallback al tradicional
 */

// Función de inicialización principal
async function initEstadisticas(view) {
  console.log("🎯 Inicializando módulo de estadísticas...", view);

  try {
    // Verificar que ECharts esté disponible
    if (typeof echarts === "undefined") {
      console.warn("⚠️ ECharts no está disponible, esperando...");
      await waitForECharts();
    }

    // Importar dinámicamente el controlador principal
    const { EstadisticasController } = await import(
      "./estadisticas-controller.js"
    );

    // Crear nueva instancia del controlador
    const estadisticasController = new EstadisticasController();

    // Inicializar el controlador
    await estadisticasController.init();

    // Hacer el controlador accesible globalmente para debugging
    window.estadisticasController = estadisticasController;

    console.log("✅ Módulo de estadísticas inicializado correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error inicializando módulo de estadísticas:", error);

    // Intentar fallback al sistema tradicional
    try {
      console.log("🔄 Intentando fallback al sistema tradicional...");
      await initTraditionalSystem();
      return true;
    } catch (fallbackError) {
      console.error("❌ Error en fallback:", fallbackError);
      return false;
    }
  }
}

/**
 * Espera a que ECharts esté disponible
 */
async function waitForECharts() {
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
 * Inicializa el sistema tradicional como fallback
 */
async function initTraditionalSystem() {
  console.log("🔧 Inicializando sistema tradicional...");

  // Importar solo las dependencias necesarias para el sistema tradicional
  const { EstadisticasDataService } = await import(
    "./services/EstadisticasDataService.js"
  );
  const { AnalyticsProcessor } = await import(
    "./services/AnalyticsProcessor.js"
  );
  const { ChartService } = await import("./services/ChartService.js");

  // Crear controlador simplificado
  const controller = {
    dataService: new EstadisticasDataService(),
    analyticsProcessor: new AnalyticsProcessor(),
    chartService: new ChartService(),
    useModularCharts: false,
    errors: [],
    currentDateRange: 30,
    isLoading: false,
    userPreferences: loadUserPreferences(),

    async init() {
      console.log("🚀 Inicializando sistema tradicional...");

      try {
        // Inicializar servicios
        await this.dataService.init();

        // Configurar eventos básicos
        this.setupBasicEventListeners();

        // Cargar datos
        await this.loadData();

        console.log("✅ Sistema tradicional inicializado");
      } catch (error) {
        console.error("❌ Error en sistema tradicional:", error);
        throw error;
      }
    },

    setupBasicEventListeners() {
      // Solo eventos esenciales
      const refreshBtn = document.getElementById("refresh-stats");
      if (refreshBtn) {
        refreshBtn.addEventListener("click", () => {
          this.refreshData();
        });
      }

      const dateRangeSelector = document.getElementById("date-range");
      if (dateRangeSelector) {
        dateRangeSelector.addEventListener("change", (e) => {
          this.changeDateRange(parseInt(e.target.value));
        });
      }
    },

    async loadData() {
      try {
        const success = await this.dataService.loadData();
        if (success) {
          this.errors = this.dataService.errors;
          this.updateBasicComponents();
        }
      } catch (error) {
        console.error("❌ Error cargando datos:", error);
      }
    },

    updateBasicComponents() {
      // Actualizar solo KPIs básicos
      const kpis = this.analyticsProcessor.processKPIs(
        this.errors,
        this.currentDateRange
      );

      this.updateKPI("total-errors-kpi", kpis.totalErrors.toLocaleString());
      this.updateKPI("pending-errors-kpi", kpis.pendingErrors.toLocaleString());
      this.updateKPI(
        "resolved-errors-kpi",
        kpis.resolvedErrors.toLocaleString()
      );
      this.updateKPI(
        "resolution-rate-kpi",
        `${kpis.resolutionRate.toFixed(1)}%`
      );
      this.updateKPI("daily-avg-kpi", kpis.dailyAverage.toFixed(1));
    },

    updateKPI(elementId, value) {
      const element = document.getElementById(elementId);
      if (element) {
        element.textContent = value;
      }
    },

    async changeDateRange(newRange) {
      this.currentDateRange = newRange;
      this.updateBasicComponents();
    },

    async refreshData() {
      await this.loadData();
    },
  };

  await controller.init();
  window.estadisticasController = controller;

  console.log("✅ Sistema tradicional funcionando");
}

/**
 * Carga preferencias del usuario
 */
function loadUserPreferences() {
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

// Exportar función principal
window.initEstadisticas = initEstadisticas;

// Auto-inicialización si el DOM ya está listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", async () => {
    if (!window.estadisticasController) {
      console.log("🎯 DOM cargado, auto-inicializando...");
      await initEstadisticas();
    }
  });
} else {
  // DOM ya está listo
  if (!window.estadisticasController) {
    console.log("🎯 Inicializando inmediatamente...");
    setTimeout(() => initEstadisticas(), 100);
  }
}

console.log("📋 Inicializador de estadísticas cargado");

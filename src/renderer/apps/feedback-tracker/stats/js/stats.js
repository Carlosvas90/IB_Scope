/**
 * stats.js
 * Controlador principal para la aplicación de Stats
 * Versión simplificada de estadísticas enfocada en los 3 KPIs principales
 */

import { StatsDataService } from "./services/StatsDataService.js";
import { KPIManager } from "./components/kpis/KPIManager.js";

class StatsController {
  constructor() {
    this.dataService = new StatsDataService();
    this.kpiManager = new KPIManager();

    this.currentDateRange = 30; // días por defecto
    this.isLoading = false;
    this.errors = [];

    console.log("📊 StatsController inicializado");
  }

  /**
   * Inicializa el controlador
   */
  async init() {
    console.log("🚀 Inicializando Stats Dashboard...");

    try {
      this.showLoading(true);

      // Inicializar servicio de datos
      await this.dataService.init();

      // Configurar event listeners
      this.setupEventListeners();

      // Configurar sincronización con feedback-tracker
      this.setupDataSync();

      // Cargar datos iniciales
      await this.loadData();

      console.log("✅ Stats Dashboard inicializado correctamente");
    } catch (error) {
      console.error("❌ Error inicializando Stats Dashboard:", error);
      this.showError("Error al cargar el dashboard de stats");
    } finally {
      this.showLoading(false);
    }
  }

  /**
   * Configura la sincronización automática con feedback-tracker
   */
  setupDataSync() {
    console.log("🔄 Configurando sincronización con feedback-tracker...");

    // Verificar si el servicio de feedback-tracker está disponible
    if (window.feedbackTrackerDataService) {
      console.log(
        "✅ Servicio de feedback-tracker encontrado, configurando callback"
      );

      // Si el servicio tiene un método onRefresh, usarlo
      if (typeof window.feedbackTrackerDataService.onRefresh === "function") {
        window.feedbackTrackerDataService.onRefresh((data) => {
          console.log(
            "📡 Datos actualizados en feedback-tracker, actualizando Stats..."
          );
          this.refreshFromFeedbackTracker();
        });
      }
    }

    // Configurar verificación periódica (fallback)
    this.setupPeriodicSync();
  }

  /**
   * Configura verificación periódica de datos
   */
  setupPeriodicSync() {
    // Verificar cada 5 segundos si hay datos nuevos disponibles
    setInterval(() => {
      if (
        window.feedbackTrackerDataService &&
        window.feedbackTrackerDataService.errors &&
        window.feedbackTrackerDataService.errors.length > 0 &&
        (!this.errors || this.errors.length === 0)
      ) {
        console.log(
          "🔄 Detectados datos nuevos en feedback-tracker, sincronizando..."
        );
        this.refreshFromFeedbackTracker();
      }
    }, 5000);
  }

  /**
   * Actualiza los datos desde feedback-tracker
   */
  async refreshFromFeedbackTracker() {
    try {
      const success = await this.dataService.loadData();
      if (success) {
        this.errors = this.dataService.errors;
        this.updateKPIs();
        console.log(
          "✅ Stats sincronizado con feedback-tracker:",
          this.errors.length,
          "registros"
        );
      }
    } catch (error) {
      console.error("❌ Error sincronizando con feedback-tracker:", error);
    }
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

        // Actualizar KPIs
        this.updateKPIs();
      } else {
        throw new Error("No se pudieron cargar los datos");
      }
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
      this.showError("Error al cargar los datos");
    }
  }

  /**
   * Actualiza los KPIs usando el KPIManager
   */
  updateKPIs() {
    console.log("🔄 Actualizando KPIs...");

    // Obtener estadísticas básicas
    const stats = this.dataService.getBasicStats(this.currentDateRange);

    console.log("📊 Estadísticas calculadas:", stats);

    // Actualizar KPIs usando el manager
    this.kpiManager.updateAll(stats);

    console.log("✅ KPIs actualizados correctamente");
  }

  /**
   * Cambia el rango de fechas
   */
  async changeDateRange(newRange) {
    if (newRange === this.currentDateRange) return;

    console.log(`📅 Cambiando rango de fechas a: ${newRange} días`);
    this.currentDateRange = newRange;

    // Actualizar KPIs con el nuevo rango
    this.updateKPIs();
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
        this.updateKPIs();
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
let statsController = null;

// Función global de inicialización que será llamada por el app-loader
window.initStats = async function (view) {
  console.log("🎯 Inicializando módulo de stats...");

  try {
    // Crear nueva instancia del controlador
    statsController = new StatsController();

    // Inicializar el controlador
    await statsController.init();

    // Hacer el controlador accesible globalmente para debugging
    window.statsController = statsController;

    console.log("✅ Módulo de stats inicializado correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error inicializando módulo de stats:", error);
    return false;
  }
};

// Inicializar cuando el DOM esté listo (fallback para carga directa)
document.addEventListener("DOMContentLoaded", async () => {
  // Solo inicializar automáticamente si no se ha inicializado ya por el app-loader
  if (!statsController) {
    console.log(
      "🎯 DOM cargado, inicializando StatsController automáticamente..."
    );
    await window.initStats();
  }
});

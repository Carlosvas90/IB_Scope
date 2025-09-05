/**
 * inventory-stats-controller.js
 * Controlador principal para la aplicación Inventory Stats
 */

// Importar dependencias
import { InventoryDataService } from "./services/DataService.js";
import { TotalErrorsKPI } from "./kpis/TotalErrorsKPI.js";
import { PendingErrorsKPI } from "./kpis/PendingErrorsKPI.js";
import { ResolvedErrorsKPI } from "./kpis/ResolvedErrorsKPI.js";
import { ResolutionRateKPI } from "./kpis/ResolutionRateKPI.js";
import { DailyAverageKPI } from "./kpis/DailyAverageKPI.js";

export class InventoryStatsController {
  constructor() {
    this.dataService = null;
    this.kpis = {};
    this.isInitialized = false;
    this.errors = [];
  }

  /**
   * Inicializa la aplicación
   */
  async init() {
    try {
      console.log("InventoryStatsController: Iniciando inicialización...");

      // Limpiar contenedor
      this.cleanup();

      // Mostrar loading
      this.showLoading();

      // Inicializar servicios
      await this.initializeServices();

      // Inicializar KPIs
      this.initializeKPIs();

      // Configurar eventos
      this.setupEventListeners();

      // Cargar datos iniciales
      await this.loadInitialData();

      // Marcar como inicializado
      this.isInitialized = true;

      console.log("InventoryStatsController: Inicialización completada");
    } catch (error) {
      console.error(
        "InventoryStatsController: Error en inicialización:",
        error
      );
      this.showError("Error al inicializar la aplicación");
      throw error;
    }
  }

  /**
   * Inicializa los servicios
   */
  async initializeServices() {
    console.log("InventoryStatsController: Inicializando servicios...");

    this.dataService = new InventoryDataService();

    // Inicializar el servicio de datos
    const initSuccess = this.dataService.init();
    if (!initSuccess) {
      throw new Error("No se pudo conectar al DataService compartido");
    }

    console.log("InventoryStatsController: Servicios inicializados");
  }

  /**
   * Inicializa todos los KPIs
   */
  initializeKPIs() {
    console.log("InventoryStatsController: Inicializando KPIs...");

    try {
      this.kpis = {
        totalErrors: new TotalErrorsKPI(),
        pendingErrors: new PendingErrorsKPI(),
        resolvedErrors: new ResolvedErrorsKPI(),
        resolutionRate: new ResolutionRateKPI(),
        dailyAverage: new DailyAverageKPI(),
      };

      // Inicializar cada KPI
      Object.values(this.kpis).forEach((kpi) => {
        kpi.init();
      });

      console.log("InventoryStatsController: KPIs inicializados correctamente");
    } catch (error) {
      console.error(
        "InventoryStatsController: Error inicializando KPIs:",
        error
      );
      throw new Error("Error al inicializar KPIs: " + error.message);
    }
  }

  /**
   * Configura los event listeners
   */
  setupEventListeners() {
    // Event listener para reload button (si existe)
    const reloadBtn = document.getElementById("reload-data");
    if (reloadBtn) {
      reloadBtn.addEventListener("click", () => this.reloadData());
    }
  }

  /**
   * Carga los datos iniciales
   */
  async loadInitialData() {
    console.log("InventoryStatsController: Cargando datos iniciales...");

    try {
      const result = await this.dataService.loadTodayData();

      if (result.success) {
        this.errors = result.data || [];
        this.updateAllKPIs();
        this.showMainContent();

        console.log(
          `InventoryStatsController: Datos cargados. ${this.errors.length} errores encontrados`
        );
      } else {
        // No hay errores, mostrar estado vacío
        this.errors = [];
        this.updateAllKPIs();
        this.showMainContent();

        console.log("InventoryStatsController: No hay errores para mostrar");
      }
    } catch (error) {
      console.error("InventoryStatsController: Error cargando datos:", error);
      this.showError("Error al cargar los datos");
    }
  }

  /**
   * Actualiza todos los KPIs con los datos actuales
   */
  updateAllKPIs() {
    if (!this.kpis || Object.keys(this.kpis).length === 0) {
      console.warn("InventoryStatsController: KPIs no están inicializados");
      return;
    }

    try {
      console.log("InventoryStatsController: Actualizando KPIs...");

      // Actualizar cada KPI de forma independiente
      Object.entries(this.kpis).forEach(([name, kpi]) => {
        try {
          kpi.update(this.errors);
        } catch (error) {
          console.error(`Error actualizando KPI ${name}:`, error);
          kpi.setError(`Error: ${error.message}`);
        }
      });

      console.log("InventoryStatsController: KPIs actualizados");
    } catch (error) {
      console.error(
        "InventoryStatsController: Error actualizando KPIs:",
        error
      );
    }
  }

  /**
   * Recarga los datos
   */
  async reloadData() {
    console.log("InventoryStatsController: Recargando datos...");

    this.showLoading();
    await this.loadInitialData();
  }

  /**
   * Muestra el loading
   */
  showLoading() {
    const loadingContainer = document.getElementById("loading-container");
    const errorContainer = document.getElementById("error-container");
    const mainContent = document.getElementById("main-content");

    if (loadingContainer) loadingContainer.style.display = "flex";
    if (errorContainer) errorContainer.style.display = "none";
    if (mainContent) mainContent.style.display = "none";
  }

  /**
   * Muestra error
   */
  showError(message) {
    const loadingContainer = document.getElementById("loading-container");
    const errorContainer = document.getElementById("error-container");
    const mainContent = document.getElementById("main-content");

    if (errorContainer) {
      errorContainer.style.display = "flex";
      const errorMessage = errorContainer.querySelector(".error-message");
      if (errorMessage) {
        errorMessage.textContent = message;
      }
    }

    if (loadingContainer) loadingContainer.style.display = "none";
    if (mainContent) mainContent.style.display = "none";
  }

  /**
   * Muestra el contenido principal
   */
  showMainContent() {
    const loadingContainer = document.getElementById("loading-container");
    const errorContainer = document.getElementById("error-container");
    const mainContent = document.getElementById("main-content");

    if (mainContent) mainContent.style.display = "block";
    if (loadingContainer) loadingContainer.style.display = "none";
    if (errorContainer) errorContainer.style.display = "none";
  }

  /**
   * Limpia el contenedor
   */
  cleanup() {
    console.log("InventoryStatsController: Limpiando aplicación...");

    // Reset KPIs si existen
    if (this.kpis) {
      Object.values(this.kpis).forEach((kpi) => {
        if (kpi && typeof kpi.reset === "function") {
          kpi.reset();
        }
      });
    }

    this.errors = [];
    this.isInitialized = false;
  }

  /**
   * Obtiene los datos actuales
   */
  getCurrentData() {
    return this.errors;
  }

  /**
   * Verifica si la aplicación está inicializada
   */
  isReady() {
    return this.isInitialized;
  }
}

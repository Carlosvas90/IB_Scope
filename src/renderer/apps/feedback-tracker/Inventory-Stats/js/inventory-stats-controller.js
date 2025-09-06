/**
 * inventory-stats-controller.js
 * Controlador principal para la aplicación Inventory Stats
 */

// Importar dependencias
import EventBus from "../../../../core/services/EventBus.js";
import DataSyncService from "../../../../core/services/DataSyncService.js";
import {
  INVENTORY_STATS_EVENTS,
  FEEDBACK_TRACKER_EVENTS,
  EVENT_PATTERNS,
} from "../../../../core/events/EventTypes.js";
import { InventoryDataService } from "./services/DataService.js";
import { TotalErrorsKPI } from "./kpis/TotalErrorsKPI.js";
import { PendingErrorsKPI } from "./kpis/PendingErrorsKPI.js";
import { ResolvedErrorsKPI } from "./kpis/ResolvedErrorsKPI.js";
import { ResolutionRateKPI } from "./kpis/ResolutionRateKPI.js";
import { DailyAverageKPI } from "./kpis/DailyAverageKPI.js";
import { DPMOKPI } from "./kpis/DPMOKPI.js";

export class InventoryStatsController {
  constructor() {
    this.dataService = null;
    this.kpis = {};
    this.isInitialized = false;
    this.errors = [];
    this.dpmoData = null;

    // Referencias para sincronización
    this.eventBus = EventBus;
    this.dataSyncService = DataSyncService;
    this.syncListeners = [];
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

      // Inicializar servicios de sincronización
      this.initializeSyncServices();

      // Configurar listeners de sincronización
      this.setupSyncListeners();

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
      // Inicializamos todos los KPIs, incluyendo el nuevo KPI DPMO
      this.kpis = {
        dpmo: new DPMOKPI(),
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
    const reloadBtn = document.getElementById("refresh-btn");
    if (reloadBtn) {
      // Modificar el botón para incluir opción de forzar recarga
      reloadBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
        Actualizar
      `;

      // Crear menú desplegable para opciones de recarga
      const refreshOptions = document.createElement("div");
      refreshOptions.className = "refresh-options";
      refreshOptions.innerHTML = `
        <button id="normal-refresh" class="refresh-option">Actualizar</button>
        <button id="force-refresh" class="refresh-option">Forzar recarga completa</button>
      `;

      // Posicionar el menú desplegable junto al botón de recarga
      reloadBtn.parentNode.style.position = "relative";
      reloadBtn.parentNode.appendChild(refreshOptions);

      // Mostrar/ocultar opciones al hacer clic en el botón de recarga
      reloadBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        refreshOptions.classList.toggle("show");
      });

      // Configurar eventos para las opciones
      document
        .getElementById("normal-refresh")
        .addEventListener("click", () => {
          refreshOptions.classList.remove("show");
          this.reloadData(false);
        });

      document.getElementById("force-refresh").addEventListener("click", () => {
        refreshOptions.classList.remove("show");
        this.reloadData(true);
      });

      // Ocultar menú al hacer clic fuera
      document.addEventListener("click", () => {
        refreshOptions.classList.remove("show");
      });
    } else {
      console.warn("InventoryStatsController: Botón de recarga no encontrado");
    }

    // Event listener para retry button (si existe)
    const retryBtn = document.getElementById("retry-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => this.reloadData(true)); // Forzar recarga al reintentar
    }
  }

  /**
   * Carga los datos iniciales
   */
  async loadInitialData() {
    console.log("InventoryStatsController: Cargando datos iniciales...");

    try {
      // Cargar datos de errores
      const errorResult = await this.dataService.loadTodayData();

      // Cargar datos DPMO (independientemente del resultado de errores)
      const dpmoResult = await this.dataService.loadDPMOData();

      if (dpmoResult.success) {
        this.dpmoData = dpmoResult.data;
        console.log(
          "InventoryStatsController: Datos DPMO cargados correctamente"
        );
      } else {
        this.dpmoData = null;
        console.warn(
          "InventoryStatsController: No se pudieron cargar los datos DPMO:",
          dpmoResult.error
        );
      }

      if (errorResult.success) {
        this.errors = errorResult.data || [];

        // Analizar los datos recibidos para depuración
        const uniqueStatuses = [...new Set(this.errors.map((e) => e.status))];
        console.log(
          "InventoryStatsController: Estados únicos encontrados:",
          uniqueStatuses
        );

        // Consideramos resueltos usando múltiples criterios
        const resolvedCount = this.errors.filter(
          (e) =>
            // Propiedad principal del sistema
            e.feedback_status === "done" ||
            e.feedback_status === "completed" ||
            // Status alternativos por compatibilidad
            e.status === "done" ||
            e.status === "completed" ||
            e.status === 1 ||
            e.status === "1" ||
            // Propiedades adicionales
            e.resolved === true ||
            e.resolved === "true" ||
            e.resolved === 1 ||
            e.resolved === "1" ||
            e.is_resolved === true ||
            e.is_resolved === "true" ||
            e.is_resolved === 1 ||
            e.is_resolved === "1" ||
            // Fechas de resolución (incluyendo feedback_date)
            (e.feedback_date && e.feedback_date !== "") ||
            (e.done_date && e.done_date !== "") ||
            (e.resolved_date && e.resolved_date !== "")
        ).length;
        const pendingCount = this.errors.length - resolvedCount;
        const totalQuantity = this.errors.reduce(
          (sum, e) => sum + (parseInt(e.quantity) || 1),
          0
        );

        console.log(
          `InventoryStatsController: Datos cargados. ${this.errors.length} errores encontrados (${pendingCount} pendientes, ${resolvedCount} resueltos, ${totalQuantity} cantidad total)`
        );

        // Verificar si hay errores resueltos
        if (resolvedCount === 0 && this.errors.length > 0) {
          console.warn(
            "InventoryStatsController: ¡ATENCIÓN! No se encontraron errores resueltos aunque hay errores en total"
          );
        }

        this.updateAllKPIs();
        this.showMainContent();
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
          // El KPI DPMO usa datos diferentes
          if (name === "dpmo") {
            kpi.update(this.dpmoData);
          } else {
            kpi.update(this.errors);
          }
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
   * @param {boolean} forceRefresh - Si es true, fuerza una recarga completa desde el archivo
   */
  async reloadData(forceRefresh = false) {
    console.log(
      `InventoryStatsController: Recargando datos (forceRefresh: ${forceRefresh})...`
    );

    this.showLoading();

    if (
      forceRefresh &&
      this.dataService &&
      this.dataService.sharedDataService
    ) {
      // Forzar una recarga completa desde el archivo
      console.log(
        "InventoryStatsController: Forzando recarga completa desde archivo..."
      );

      try {
        // Limpiar caché del DataService compartido
        if (
          typeof this.dataService.sharedDataService.invalidateCache ===
          "function"
        ) {
          this.dataService.sharedDataService.invalidateCache();
        }

        // Forzar recarga desde archivo
        await this.dataService.sharedDataService.refreshData(true);
        console.log("InventoryStatsController: Recarga forzada completada");
      } catch (error) {
        console.error(
          "InventoryStatsController: Error en recarga forzada:",
          error
        );
      }
    }

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
    this.dpmoData = null;
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

  /**
   * Inicializa los servicios de sincronización
   */
  initializeSyncServices() {
    console.log(
      "InventoryStatsController: Inicializando servicios de sincronización..."
    );

    // Inicializar el DataSyncService si no está inicializado
    if (!this.dataSyncService.isInitialized) {
      this.dataSyncService.init();
    }
  }

  /**
   * Configura los listeners para sincronización automática
   */
  setupSyncListeners() {
    console.log(
      "InventoryStatsController: Configurando listeners de sincronización..."
    );

    // Listener directo para cambios de datos
    const dataRefreshListener = this.eventBus.on(
      FEEDBACK_TRACKER_EVENTS.DATA_REFRESHED,
      this.handleDirectDataRefresh.bind(this)
    );
    this.syncListeners.push(dataRefreshListener);

    console.log(
      `InventoryStatsController: ${this.syncListeners.length} listeners de sincronización configurados`
    );
  }

  /**
   * Maneja refrescos directos de datos
   */
  async handleDirectDataRefresh(eventData) {
    const { data: event } = eventData;
    console.log(
      "🔄 InventoryStatsController: Refresco de datos recibido",
      event
    );

    try {
      await this.refreshDataFromSharedService();
    } catch (error) {
      console.error(
        "InventoryStatsController: Error en refresco directo:",
        error
      );
    }
  }

  /**
   * Refresca datos específicamente desde el servicio compartido
   */
  async refreshDataFromSharedService() {
    if (!this.dataService || !this.dataService.sharedDataService) {
      console.warn(
        "InventoryStatsController: DataService compartido no disponible"
      );
      return;
    }

    try {
      // Obtener datos actuales sin forzar recarga de archivo
      const errors = this.dataService.sharedDataService.errors || [];

      if (errors.length !== this.errors.length) {
        console.log(
          `🔄 InventoryStatsController: Datos cambiaron (${this.errors.length} → ${errors.length})`
        );
      }

      this.errors = errors;
      this.updateAllKPIs();

      console.log(
        "✅ InventoryStatsController: KPIs sincronizados automáticamente"
      );
    } catch (error) {
      console.error(
        "InventoryStatsController: Error refrescando datos:",
        error
      );
    }
  }
}

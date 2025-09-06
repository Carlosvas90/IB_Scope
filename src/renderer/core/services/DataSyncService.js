/**
 * DataSyncService.js
 * Servicio coordinador para sincronización de datos entre aplicaciones
 */

import EventBus from "./EventBus.js";
import {
  FEEDBACK_TRACKER_EVENTS,
  INVENTORY_STATS_EVENTS,
  DATA_CHANGE_TYPES,
} from "../events/EventTypes.js";

class DataSyncService {
  constructor() {
    this.isInitialized = false;
    this.syncEnabled = true;
    this.debugMode = false;

    // Estadísticas de sincronización
    this.stats = {
      syncEvents: 0,
      lastSync: null,
      errors: 0,
    };

    console.log("🔄 DataSyncService inicializado");
  }

  /**
   * Inicializa el servicio de sincronización
   */
  init() {
    if (this.isInitialized) {
      console.warn("🔄 DataSyncService: Ya está inicializado");
      return;
    }

    // Suscribirse a eventos de cambios de datos
    this._setupEventListeners();

    this.isInitialized = true;
    console.log("🔄 DataSyncService: Inicializado correctamente");
  }

  /**
   * Configura los listeners de eventos
   * @private
   */
  _setupEventListeners() {
    // Escuchar cambios en feedback-tracker
    EventBus.on(
      FEEDBACK_TRACKER_EVENTS.ERROR_UPDATED,
      this._handleErrorUpdate.bind(this)
    );
    EventBus.on(
      FEEDBACK_TRACKER_EVENTS.ERROR_STATUS_CHANGED,
      this._handleErrorStatusChange.bind(this)
    );
    EventBus.on(
      FEEDBACK_TRACKER_EVENTS.DATA_REFRESHED,
      this._handleDataRefresh.bind(this)
    );
    EventBus.on(
      FEEDBACK_TRACKER_EVENTS.DATA_LOADED,
      this._handleDataLoad.bind(this)
    );

    if (this.debugMode) {
      console.log("🔄 DataSyncService: Event listeners configurados");
    }
  }

  /**
   * Maneja actualizaciones de errores individuales
   * @private
   */
  _handleErrorUpdate(eventData) {
    if (!this.syncEnabled) return;

    try {
      this.stats.syncEvents++;
      this.stats.lastSync = Date.now();

      if (this.debugMode) {
        console.log(
          "🔄 DataSyncService: Procesando actualización de error",
          eventData
        );
      }

      // Emitir evento de sincronización para Inventory-Stats
      EventBus.emit(INVENTORY_STATS_EVENTS.SYNC_STARTED, {
        type: DATA_CHANGE_TYPES.UPDATE,
        source: "feedback-tracker",
        errorId: eventData.data?.errorId,
        changeType: "error_update",
      });

      // Procesar el cambio específico
      this._processErrorChange(eventData);
    } catch (error) {
      this.stats.errors++;
      console.error(
        "🔄 DataSyncService: Error procesando actualización:",
        error
      );

      EventBus.emit(INVENTORY_STATS_EVENTS.SYNC_ERROR, {
        error: error.message,
        eventData,
      });
    }
  }

  /**
   * Maneja cambios de estado de errores
   * @private
   */
  _handleErrorStatusChange(eventData) {
    if (!this.syncEnabled) return;

    try {
      const { data } = eventData;
      const { errorId, oldStatus, newStatus } = data;

      if (this.debugMode) {
        console.log(
          `🔄 DataSyncService: Estado cambiado ${errorId}: ${oldStatus} → ${newStatus}`
        );
      }

      // Si el error cambió a "done" o de "done" a otro estado, es crítico sincronizar
      const isCriticalChange =
        (oldStatus !== "done" && newStatus === "done") ||
        (oldStatus === "done" && newStatus !== "done");

      EventBus.emit(INVENTORY_STATS_EVENTS.SYNC_STARTED, {
        type: DATA_CHANGE_TYPES.UPDATE,
        source: "feedback-tracker",
        errorId,
        statusChange: { oldStatus, newStatus },
        critical: isCriticalChange,
      });

      this._processStatusChange(data);
    } catch (error) {
      this.stats.errors++;
      console.error(
        "🔄 DataSyncService: Error procesando cambio de estado:",
        error
      );
    }
  }

  /**
   * Maneja refrescos completos de datos
   * @private
   */
  _handleDataRefresh(eventData) {
    if (!this.syncEnabled) return;

    try {
      if (this.debugMode) {
        console.log(
          "🔄 DataSyncService: Procesando refresco de datos",
          eventData
        );
      }

      EventBus.emit(INVENTORY_STATS_EVENTS.SYNC_STARTED, {
        type: DATA_CHANGE_TYPES.REFRESH,
        source: "feedback-tracker",
        totalErrors: eventData.data?.count || 0,
      });

      this._processDataRefresh(eventData);
    } catch (error) {
      this.stats.errors++;
      console.error("🔄 DataSyncService: Error procesando refresco:", error);
    }
  }

  /**
   * Maneja cargas iniciales de datos
   * @private
   */
  _handleDataLoad(eventData) {
    if (!this.syncEnabled) return;

    try {
      if (this.debugMode) {
        console.log("🔄 DataSyncService: Procesando carga de datos", eventData);
      }

      EventBus.emit(INVENTORY_STATS_EVENTS.SYNC_STARTED, {
        type: DATA_CHANGE_TYPES.REFRESH,
        source: "feedback-tracker",
        initialLoad: true,
      });

      this._processDataLoad(eventData);
    } catch (error) {
      this.stats.errors++;
      console.error("🔄 DataSyncService: Error procesando carga:", error);
    }
  }

  /**
   * Procesa cambios individuales de errores
   * @private
   */
  _processErrorChange(eventData) {
    // Emitir evento específico para que Inventory-Stats actualice solo lo necesario
    EventBus.emit(INVENTORY_STATS_EVENTS.KPI_UPDATED, {
      updateType: "incremental",
      affectedKPIs: this._determineAffectedKPIs(eventData),
      data: eventData.data,
    });

    this._completeSyncProcess("error_change");
  }

  /**
   * Procesa cambios de estado
   * @private
   */
  _processStatusChange(data) {
    const { oldStatus, newStatus } = data;

    // Determinar qué KPIs necesitan actualización
    const affectedKPIs = [];

    if (oldStatus !== newStatus) {
      affectedKPIs.push("resolved-errors", "pending-errors", "resolution-rate");

      // Si cambió de/a "done", también afecta estadísticas temporales
      if (oldStatus === "done" || newStatus === "done") {
        affectedKPIs.push("daily-average");
      }
    }

    EventBus.emit(INVENTORY_STATS_EVENTS.KPI_UPDATED, {
      updateType: "status_change",
      affectedKPIs,
      statusChange: { oldStatus, newStatus },
      data,
    });

    this._completeSyncProcess("status_change");
  }

  /**
   * Procesa refrescos completos de datos
   * @private
   */
  _processDataRefresh(eventData) {
    // Para refrescos completos, todos los KPIs necesitan actualización
    EventBus.emit(INVENTORY_STATS_EVENTS.KPI_UPDATED, {
      updateType: "full_refresh",
      affectedKPIs: ["all"],
      data: eventData.data,
    });

    this._completeSyncProcess("data_refresh");
  }

  /**
   * Procesa cargas iniciales
   * @private
   */
  _processDataLoad(eventData) {
    EventBus.emit(INVENTORY_STATS_EVENTS.KPI_UPDATED, {
      updateType: "initial_load",
      affectedKPIs: ["all"],
      data: eventData.data,
    });

    this._completeSyncProcess("data_load");
  }

  /**
   * Determina qué KPIs se ven afectados por un cambio
   * @private
   */
  _determineAffectedKPIs(eventData) {
    const affectedKPIs = [];
    const { data } = eventData;

    // Siempre afecta el total de errores
    affectedKPIs.push("total-errors");

    // Si hay cambio de estado, afecta pending y resolved
    if (data?.statusChange) {
      affectedKPIs.push("pending-errors", "resolved-errors", "resolution-rate");
    }

    // Si hay cambio en quantity, afecta todos los KPIs numéricos
    if (data?.quantityChange) {
      affectedKPIs.push("daily-average");
    }

    return affectedKPIs;
  }

  /**
   * Completa el proceso de sincronización
   * @private
   */
  _completeSyncProcess(syncType) {
    this.stats.lastSync = Date.now();

    EventBus.emit(INVENTORY_STATS_EVENTS.SYNC_COMPLETED, {
      syncType,
      timestamp: this.stats.lastSync,
      stats: { ...this.stats },
    });

    if (this.debugMode) {
      console.log(
        `🔄 DataSyncService: Sincronización completada (${syncType})`
      );
    }
  }

  /**
   * Habilita/deshabilita la sincronización
   * @param {boolean} enabled - Si habilitar sincronización
   */
  setSyncEnabled(enabled) {
    this.syncEnabled = enabled;
    console.log(
      `🔄 DataSyncService: Sincronización ${
        enabled ? "habilitada" : "deshabilitada"
      }`
    );
  }

  /**
   * Habilita/deshabilita modo debug
   * @param {boolean} enabled - Si habilitar debug
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`🔄 DataSyncService: Debug mode ${enabled ? "ON" : "OFF"}`);
  }

  /**
   * Obtiene estadísticas de sincronización
   * @returns {Object} Estadísticas
   */
  getStats() {
    return {
      ...this.stats,
      isInitialized: this.isInitialized,
      syncEnabled: this.syncEnabled,
    };
  }

  /**
   * Reinicia las estadísticas
   */
  resetStats() {
    this.stats = {
      syncEvents: 0,
      lastSync: null,
      errors: 0,
    };
    console.log("🔄 DataSyncService: Estadísticas reiniciadas");
  }

  /**
   * Fuerza una sincronización completa
   */
  forceSyncAll() {
    console.log("🔄 DataSyncService: Forzando sincronización completa");

    EventBus.emit(FEEDBACK_TRACKER_EVENTS.DATA_REFRESHED, {
      forced: true,
      timestamp: Date.now(),
    });
  }
}

// Crear instancia global
const dataSyncService = new DataSyncService();

// Hacer disponible globalmente para debugging
if (typeof window !== "undefined") {
  window.DataSyncService = dataSyncService;
}

export default dataSyncService;

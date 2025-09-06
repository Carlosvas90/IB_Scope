/**
 * init-sync-system.js
 * Inicialización global del sistema de sincronización
 * Este archivo debe cargarse antes que las aplicaciones individuales
 */

import EventBus from "./services/EventBus.js";
import DataSyncService from "./services/DataSyncService.js";

/**
 * Inicializa el sistema de sincronización global
 */
function initSyncSystem() {
  console.log("🔄 Inicializando sistema de sincronización global...");

  try {
    // El EventBus ya está inicializado como singleton
    console.log("✅ EventBus disponible globalmente");

    // Inicializar el DataSyncService
    if (!DataSyncService.isInitialized) {
      DataSyncService.init();
      console.log("✅ DataSyncService inicializado");
    }

    // Hacer disponibles globalmente para debugging
    if (typeof window !== "undefined") {
      window.SyncSystem = {
        EventBus,
        DataSyncService,
        stats: () => ({
          eventBus: EventBus.getStats(),
          dataSync: DataSyncService.getStats(),
        }),
        debug: {
          enableEventBus: () => EventBus.setDebugMode(true),
          enableDataSync: () => DataSyncService.setDebugMode(true),
          disableEventBus: () => EventBus.setDebugMode(false),
          disableDataSync: () => DataSyncService.setDebugMode(false),
          listListeners: () => EventBus.listListeners(),
          forceSyncAll: () => DataSyncService.forceSyncAll(),
        },
      };

      console.log(
        "✅ Sistema de sincronización disponible en window.SyncSystem"
      );
    }

    console.log("🎉 Sistema de sincronización inicializado correctamente");
    return true;
  } catch (error) {
    console.error("❌ Error inicializando sistema de sincronización:", error);
    return false;
  }
}

// Auto-inicializar cuando se carga el módulo
initSyncSystem();

export default {
  EventBus,
  DataSyncService,
  init: initSyncSystem,
};

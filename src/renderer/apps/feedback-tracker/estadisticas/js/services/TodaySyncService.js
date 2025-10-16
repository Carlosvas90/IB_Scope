/**
 * TodaySyncService.js
 * Servicio de sincronización para datos del día actual (JSON)
 *
 * FUNCIONALIDADES:
 * - Polling periódico del JSON del día
 * - Detección de cambios vía hash
 * - Notificación a listeners
 * - Auto-refresh opcional
 */

export class TodaySyncService {
  constructor(dataService, pollingInterval = 30000) {
    // 30 segundos por defecto
    this.dataService = dataService;
    this.pollingInterval = pollingInterval;
    this.isPolling = false;
    this.pollingTimer = null;
    this.lastHash = null;
    this.lastCheckTime = null;
    this.changeListeners = [];

    // Configuración
    this.autoRefresh = true; // Auto-refrescar cuando hay cambios
    this.notifyUsers = true; // Mostrar notificación visual

    // Estadísticas
    this.stats = {
      checksCount: 0,
      changesDetected: 0,
      lastChange: null,
      errors: 0,
    };

    console.log("🔄 TodaySyncService inicializado");
    console.log(`⏱️  Intervalo de polling: ${pollingInterval / 1000}s`);
  }

  /**
   * Inicia el polling
   */
  start() {
    if (this.isPolling) {
      console.warn("⚠️ Polling ya está activo");
      return;
    }

    console.log("▶️  Iniciando sincronización automática...");
    this.isPolling = true;

    // Primer check inmediato
    this.checkForChanges();

    // Luego polling periódico
    this.pollingTimer = setInterval(() => {
      this.checkForChanges();
    }, this.pollingInterval);

    console.log("✅ Sincronización automática activada");
  }

  /**
   * Detiene el polling
   */
  stop() {
    if (!this.isPolling) {
      console.warn("⚠️ Polling no está activo");
      return;
    }

    console.log("⏸️  Deteniendo sincronización automática...");
    this.isPolling = false;

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    console.log("✅ Sincronización automática detenida");
  }

  /**
   * Verifica si hay cambios en el JSON
   */
  async checkForChanges() {
    try {
      this.stats.checksCount++;
      this.lastCheckTime = new Date();

      console.log(
        `🔍 [Sync] Check #${
          this.stats.checksCount
        } - ${this.lastCheckTime.toLocaleTimeString()}`
      );

      // Obtener datos actuales del día
      const currentData = await this.loadTodayDataDirect();

      if (!currentData || currentData.length === 0) {
        console.log("📭 [Sync] No hay datos del día actual");
        return;
      }

      // Calcular hash
      const currentHash = await this.calculateHash(currentData);

      // Comparar con hash anterior
      if (this.lastHash === null) {
        // Primera verificación
        this.lastHash = currentHash;
        console.log(
          `🔐 [Sync] Hash inicial: ${currentHash.substring(0, 8)}...`
        );
        return;
      }

      if (currentHash !== this.lastHash) {
        // ¡Cambios detectados!
        this.stats.changesDetected++;
        this.stats.lastChange = new Date();

        console.log("🔔 [Sync] ¡CAMBIOS DETECTADOS!");
        console.log(`   Hash anterior: ${this.lastHash.substring(0, 8)}...`);
        console.log(`   Hash nuevo:    ${currentHash.substring(0, 8)}...`);

        // Actualizar hash
        this.lastHash = currentHash;

        // Notificar a listeners
        this.notifyChangeListeners(currentData);

        // Auto-refresh si está habilitado
        if (this.autoRefresh) {
          await this.refreshData();
        }

        // Notificación visual si está habilitada
        if (this.notifyUsers) {
          this.showNotification();
        }
      } else {
        console.log("✅ [Sync] Sin cambios");
      }
    } catch (error) {
      this.stats.errors++;
      console.error("❌ [Sync] Error verificando cambios:", error);
    }
  }

  /**
   * Carga datos del día directamente (sin caché)
   */
  async loadTodayDataDirect() {
    try {
      // Obtener datos del servicio original
      if (this.dataService.estadisticasService) {
        // Es OptimizedDataService
        return await this.dataService.estadisticasService.loadTodayData();
      } else {
        // Es EstadisticasDataService directo
        await this.dataService.loadData();
        const today = new Date().toISOString().split("T")[0].replace(/-/g, "/");
        return this.dataService.errors.filter((error) => error.date === today);
      }
    } catch (error) {
      console.error("❌ Error cargando datos del día:", error);
      return [];
    }
  }

  /**
   * Calcula hash SHA-256 de los datos
   */
  async calculateHash(data) {
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  }

  /**
   * Refresca los datos en el dataService
   */
  async refreshData() {
    try {
      console.log("🔄 [Sync] Refrescando datos...");
      await this.dataService.refresh();
      console.log("✅ [Sync] Datos refrescados");
    } catch (error) {
      console.error("❌ [Sync] Error refrescando datos:", error);
    }
  }

  /**
   * Muestra notificación visual al usuario
   */
  showNotification() {
    // Crear notificación temporal en la UI
    const notification = document.createElement("div");
    notification.className = "sync-notification";
    notification.innerHTML = `
      <div class="sync-notification-content">
        <span class="sync-notification-icon">🔔</span>
        <span class="sync-notification-text">Datos actualizados</span>
      </div>
    `;

    // Estilos inline (o agregar a CSS global)
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: var(--Color-Green-3);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: var(--shadow-lg);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
      font-family: var(--font-primary);
      font-size: 14px;
    `;

    document.body.appendChild(notification);

    // Auto-remover después de 3 segundos
    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease-in";
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  /**
   * Registra un listener para cambios
   */
  onChange(callback) {
    if (typeof callback !== "function") {
      throw new Error("Callback debe ser una función");
    }

    this.changeListeners.push(callback);
    console.log(
      `✅ Listener registrado (total: ${this.changeListeners.length})`
    );

    // Retornar función para remover el listener
    return () => {
      const index = this.changeListeners.indexOf(callback);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
        console.log(
          `🗑️  Listener removido (total: ${this.changeListeners.length})`
        );
      }
    };
  }

  /**
   * Notifica a todos los listeners
   */
  notifyChangeListeners(newData) {
    console.log(
      `📢 [Sync] Notificando a ${this.changeListeners.length} listener(s)...`
    );

    this.changeListeners.forEach((callback, index) => {
      try {
        callback(newData);
      } catch (error) {
        console.error(`❌ Error en listener #${index}:`, error);
      }
    });
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getStats() {
    return {
      ...this.stats,
      isPolling: this.isPolling,
      pollingInterval: this.pollingInterval,
      lastCheckTime: this.lastCheckTime,
      listenersCount: this.changeListeners.length,
      autoRefresh: this.autoRefresh,
      notifyUsers: this.notifyUsers,
    };
  }

  /**
   * Imprime estadísticas en consola
   */
  printStats() {
    const stats = this.getStats();

    console.log("\n" + "═".repeat(50));
    console.log("📊 TODAY SYNC SERVICE - ESTADÍSTICAS");
    console.log("═".repeat(50));
    console.log(`🔄 Estado: ${stats.isPolling ? "▶️  ACTIVO" : "⏸️  PAUSADO"}`);
    console.log(`⏱️  Intervalo: ${stats.pollingInterval / 1000}s`);
    console.log(`🔍 Verificaciones: ${stats.checksCount}`);
    console.log(`🔔 Cambios detectados: ${stats.changesDetected}`);
    console.log(`❌ Errores: ${stats.errors}`);
    console.log(`📢 Listeners: ${stats.listenersCount}`);
    console.log(`⚙️  Auto-refresh: ${stats.autoRefresh ? "ON" : "OFF"}`);
    console.log(`🔔 Notificaciones: ${stats.notifyUsers ? "ON" : "OFF"}`);

    if (stats.lastCheckTime) {
      console.log(`🕐 Último check: ${stats.lastCheckTime.toLocaleString()}`);
    }

    if (stats.lastChange) {
      console.log(`📅 Último cambio: ${stats.lastChange.toLocaleString()}`);
    }

    console.log("═".repeat(50) + "\n");
  }

  /**
   * Configura opciones del servicio
   */
  configure(options = {}) {
    if (options.hasOwnProperty("autoRefresh")) {
      this.autoRefresh = options.autoRefresh;
      console.log(`⚙️  Auto-refresh: ${this.autoRefresh ? "ON" : "OFF"}`);
    }

    if (options.hasOwnProperty("notifyUsers")) {
      this.notifyUsers = options.notifyUsers;
      console.log(`🔔 Notificaciones: ${this.notifyUsers ? "ON" : "OFF"}`);
    }

    if (options.hasOwnProperty("pollingInterval")) {
      const oldInterval = this.pollingInterval;
      this.pollingInterval = options.pollingInterval;
      console.log(
        `⏱️  Intervalo: ${oldInterval / 1000}s → ${
          this.pollingInterval / 1000
        }s`
      );

      // Reiniciar polling si está activo
      if (this.isPolling) {
        this.stop();
        this.start();
      }
    }
  }

  /**
   * Fuerza una verificación manual
   */
  async forceCheck() {
    console.log("🔍 [Sync] Verificación manual forzada...");
    await this.checkForChanges();
  }

  /**
   * Resetea estadísticas
   */
  resetStats() {
    this.stats = {
      checksCount: 0,
      changesDetected: 0,
      lastChange: null,
      errors: 0,
    };
    console.log("🔄 Estadísticas reseteadas");
  }

  /**
   * Destruye el servicio y limpia recursos
   */
  destroy() {
    console.log("🔌 [Sync] Destruyendo TodaySyncService...");

    this.stop();
    this.changeListeners = [];
    this.lastHash = null;
    this.lastCheckTime = null;

    console.log("✅ [Sync] Servicio destruido");
  }
}

/**
 * Crea estilos CSS para las notificaciones si no existen
 */
export function injectNotificationStyles() {
  if (document.getElementById("today-sync-styles")) {
    return; // Ya existen
  }

  const style = document.createElement("style");
  style.id = "today-sync-styles";
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }

    .sync-notification {
      transition: all 0.3s ease;
    }

    .sync-notification-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .sync-notification-icon {
      font-size: 18px;
    }

    .sync-notification-text {
      font-weight: 500;
    }
  `;

  document.head.appendChild(style);
}

// Inyectar estilos automáticamente
if (typeof document !== "undefined") {
  injectNotificationStyles();
}

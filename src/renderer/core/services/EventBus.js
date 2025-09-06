/**
 * EventBus.js
 * Sistema centralizado de eventos para comunicación entre aplicaciones
 * Permite sincronización reactiva entre feedback-tracker e Inventory-Stats
 */

class EventBus {
  constructor() {
    this.listeners = new Map();
    this.debugMode = false;

    // Contador de eventos para debugging
    this.eventCount = 0;

    console.log("🚌 EventBus inicializado");
  }

  /**
   * Habilita/deshabilita el modo debug
   * @param {boolean} enabled - Si habilitar debug
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`🚌 EventBus debug mode: ${enabled ? "ON" : "OFF"}`);
  }

  /**
   * Suscribe un listener a un evento específico o patrón
   * @param {string} eventName - Nombre del evento o patrón (ej: 'feedback-tracker.error.*')
   * @param {Function} callback - Función a ejecutar cuando ocurra el evento
   * @param {Object} options - Opciones adicionales
   * @returns {string} ID del listener para poder desuscribirse
   */
  on(eventName, callback, options = {}) {
    if (typeof callback !== "function") {
      throw new Error("EventBus.on: callback debe ser una función");
    }

    const listenerId = `${eventName}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Map());
    }

    this.listeners.get(eventName).set(listenerId, {
      callback,
      options,
      createdAt: Date.now(),
    });

    if (this.debugMode) {
      console.log(
        `🚌 EventBus: Listener registrado - ${eventName} (${listenerId})`
      );
    }

    return listenerId;
  }

  /**
   * Suscribe un listener que se ejecuta solo una vez
   * @param {string} eventName - Nombre del evento
   * @param {Function} callback - Función a ejecutar
   * @returns {string} ID del listener
   */
  once(eventName, callback) {
    const listenerId = this.on(
      eventName,
      (...args) => {
        callback(...args);
        this.off(eventName, listenerId);
      },
      { once: true }
    );

    return listenerId;
  }

  /**
   * Desuscribe un listener específico
   * @param {string} eventName - Nombre del evento
   * @param {string} listenerId - ID del listener a desuscribir
   */
  off(eventName, listenerId) {
    const eventListeners = this.listeners.get(eventName);
    if (eventListeners && eventListeners.has(listenerId)) {
      eventListeners.delete(listenerId);

      // Si no quedan listeners para este evento, eliminar el evento
      if (eventListeners.size === 0) {
        this.listeners.delete(eventName);
      }

      if (this.debugMode) {
        console.log(
          `🚌 EventBus: Listener desregistrado - ${eventName} (${listenerId})`
        );
      }
    }
  }

  /**
   * Desuscribe todos los listeners de un evento
   * @param {string} eventName - Nombre del evento
   */
  offAll(eventName) {
    if (this.listeners.has(eventName)) {
      const count = this.listeners.get(eventName).size;
      this.listeners.delete(eventName);

      if (this.debugMode) {
        console.log(
          `🚌 EventBus: ${count} listeners desregistrados de ${eventName}`
        );
      }
    }
  }

  /**
   * Emite un evento a todos los listeners suscritos
   * @param {string} eventName - Nombre del evento
   * @param {*} data - Datos del evento
   * @param {Object} metadata - Metadatos adicionales
   */
  emit(eventName, data, metadata = {}) {
    this.eventCount++;

    const eventData = {
      eventName,
      data,
      timestamp: Date.now(),
      eventId: this.eventCount,
      ...metadata,
    };

    if (this.debugMode) {
      console.log(
        `🚌 EventBus: Emitiendo evento ${eventName} (#${this.eventCount})`,
        eventData
      );
    }

    // Buscar listeners exactos
    const exactListeners = this.listeners.get(eventName);
    if (exactListeners) {
      this._executeListeners(exactListeners, eventData, eventName);
    }

    // Buscar listeners con patrones (wildcards)
    this.listeners.forEach((listeners, pattern) => {
      if (pattern !== eventName && this._matchesPattern(eventName, pattern)) {
        this._executeListeners(listeners, eventData, pattern);
      }
    });
  }

  /**
   * Ejecuta los listeners de un evento
   * @private
   */
  _executeListeners(listeners, eventData, pattern) {
    listeners.forEach((listenerInfo, listenerId) => {
      try {
        listenerInfo.callback(eventData);

        if (this.debugMode) {
          console.log(
            `🚌 EventBus: Listener ejecutado - ${pattern} (${listenerId})`
          );
        }
      } catch (error) {
        console.error(
          `🚌 EventBus: Error en listener ${pattern} (${listenerId}):`,
          error
        );
      }
    });
  }

  /**
   * Verifica si un nombre de evento coincide con un patrón
   * @private
   */
  _matchesPattern(eventName, pattern) {
    // Convertir patrón de wildcard a regex
    // 'feedback-tracker.error.*' -> /^feedback-tracker\.error\..*$/
    const regexPattern = pattern
      .replace(/\./g, "\\.") // Escapar puntos
      .replace(/\*/g, ".*"); // Convertir * a .*

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(eventName);
  }

  /**
   * Obtiene estadísticas del EventBus
   * @returns {Object} Estadísticas
   */
  getStats() {
    const totalListeners = Array.from(this.listeners.values()).reduce(
      (sum, listeners) => sum + listeners.size,
      0
    );

    const eventTypes = Array.from(this.listeners.keys());

    return {
      totalEvents: this.eventCount,
      totalListeners,
      eventTypes,
      activeEventTypes: eventTypes.length,
    };
  }

  /**
   * Limpia todos los listeners (útil para testing)
   */
  clear() {
    const stats = this.getStats();
    this.listeners.clear();
    this.eventCount = 0;

    console.log(
      `🚌 EventBus: Limpiado - ${stats.totalListeners} listeners removidos`
    );
  }

  /**
   * Lista todos los listeners activos (para debugging)
   */
  listListeners() {
    const result = {};

    this.listeners.forEach((listeners, eventName) => {
      result[eventName] = Array.from(listeners.keys());
    });

    return result;
  }
}

// Crear instancia global del EventBus
const eventBus = new EventBus();

// Hacer disponible globalmente para debugging
if (typeof window !== "undefined") {
  window.EventBus = eventBus;

  // Habilitar debug en desarrollo
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    eventBus.setDebugMode(true);
  }
}

export default eventBus;

/**
 * EventBus - Sistema de Eventos Centralizado para Pizarra
 * 
 * Diseñado para facilitar la migración a WebSocket:
 * - Todos los eventos pasan por este bus
 * - Middleware para transformar eventos antes de enviar
 * - Sistema de suscripción/desuscripción
 * - Preparado para agregar transporte WebSocket
 */

import { PIZARRA_EVENTS } from "../constants/events.js";

class EventBus {
  constructor() {
    this.subscribers = new Map();
    this.middleware = [];
    this.transports = []; // Para WebSocket y otros transportes futuros
    this.eventHistory = []; // Historial de eventos (útil para debugging)
    this.maxHistorySize = 100;
    this.enabled = true;
  }

  /**
   * Suscribirse a un evento
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función callback
   * @param {object} options - Opciones adicionales
   * @returns {Function} Función para desuscribirse
   */
  subscribe(event, callback, options = {}) {
    if (typeof callback !== "function") {
      console.error(`[EventBus] Callback debe ser una función para evento: ${event}`);
      return () => {};
    }

    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, []);
    }

    const subscription = {
      callback,
      id: options.id || `${event}_${Date.now()}_${Math.random()}`,
      once: options.once || false,
      priority: options.priority || 0,
    };

    this.subscribers.get(event).push(subscription);
    
    // Ordenar por prioridad (mayor prioridad primero)
    this.subscribers.get(event).sort((a, b) => b.priority - a.priority);

    console.log(`[EventBus] Suscrito a: ${event} (ID: ${subscription.id})`);

    // Retornar función de desuscripción
    return () => this.unsubscribe(event, subscription.id);
  }

  /**
   * Desuscribirse de un evento
   * @param {string} event - Nombre del evento
   * @param {string|Function} identifier - ID de suscripción o callback
   */
  unsubscribe(event, identifier) {
    if (!this.subscribers.has(event)) {
      return;
    }

    const subscriptions = this.subscribers.get(event);
    const index = subscriptions.findIndex(
      (sub) => sub.id === identifier || sub.callback === identifier
    );

    if (index > -1) {
      subscriptions.splice(index, 1);
      console.log(`[EventBus] Desuscrito de: ${event}`);
      
      if (subscriptions.length === 0) {
        this.subscribers.delete(event);
      }
    }
  }

  /**
   * Emitir un evento
   * @param {string} event - Nombre del evento
   * @param {object} data - Datos del evento
   * @param {object} options - Opciones adicionales
   */
  emit(event, data = {}, options = {}) {
    if (!this.enabled) {
      console.warn(`[EventBus] EventBus deshabilitado, ignorando: ${event}`);
      return;
    }

    // Aplicar middleware antes de emitir
    let processedData = data;
    let processedEvent = event;

    for (const middleware of this.middleware) {
      try {
        const result = middleware(processedEvent, processedData, options);
        if (result === false) {
          // Middleware puede cancelar el evento
          console.log(`[EventBus] Evento cancelado por middleware: ${event}`);
          return;
        }
        if (result && typeof result === "object") {
          processedEvent = result.event || processedEvent;
          processedData = result.data || processedData;
        }
      } catch (error) {
        console.error(`[EventBus] Error en middleware para ${event}:`, error);
      }
    }

    // Agregar metadata al evento
    const eventData = {
      event: processedEvent,
      data: processedData,
      timestamp: new Date().toISOString(),
      source: options.source || "local",
      ...options.metadata,
    };

    // Guardar en historial
    this.addToHistory(eventData);

    // Notificar a suscriptores locales
    this.notifySubscribers(processedEvent, eventData);

    // Enviar a transportes externos (WebSocket, etc.)
    this.sendToTransports(eventData);

    return eventData;
  }

  /**
   * Notificar a suscriptores locales
   * @private
   */
  notifySubscribers(event, eventData) {
    if (!this.subscribers.has(event)) {
      return;
    }

    const subscriptions = [...this.subscribers.get(event)]; // Copia para evitar modificaciones durante iteración

    subscriptions.forEach((subscription) => {
      try {
        subscription.callback(eventData.data, eventData);
        
        // Si es "once", remover después de ejecutar
        if (subscription.once) {
          this.unsubscribe(event, subscription.id);
        }
      } catch (error) {
        console.error(
          `[EventBus] Error en callback para ${event} (${subscription.id}):`,
          error
        );
      }
    });
  }

  /**
   * Enviar evento a transportes externos (WebSocket, IPC, etc.)
   * @private
   */
  sendToTransports(eventData) {
    this.transports.forEach((transport) => {
      try {
        if (transport.enabled && transport.send) {
          transport.send(eventData);
        }
      } catch (error) {
        console.error(`[EventBus] Error enviando a transporte:`, error);
      }
    });
  }

  /**
   * Agregar middleware
   * @param {Function} middleware - Función middleware
   */
  use(middleware) {
    if (typeof middleware !== "function") {
      console.error("[EventBus] Middleware debe ser una función");
      return;
    }
    this.middleware.push(middleware);
  }

  /**
   * Agregar transporte (WebSocket, IPC, etc.)
   * @param {object} transport - Objeto transporte con métodos send/receive
   */
  addTransport(transport) {
    if (!transport || typeof transport.send !== "function") {
      console.error("[EventBus] Transporte debe tener método 'send'");
      return;
    }

    this.transports.push({
      ...transport,
      enabled: transport.enabled !== false,
    });

    // Si el transporte tiene método receive, configurar listener
    if (transport.receive && typeof transport.receive === "function") {
      transport.receive((eventData) => {
        // Re-emitir eventos recibidos desde transporte externo
        this.emit(eventData.event, eventData.data, {
          source: transport.name || "external",
          skipTransports: true, // No re-enviar a otros transportes
        });
      });
    }

    console.log(`[EventBus] Transporte agregado: ${transport.name || "unknown"}`);
  }

  /**
   * Remover transporte
   * @param {string} name - Nombre del transporte
   */
  removeTransport(name) {
    this.transports = this.transports.filter((t) => t.name !== name);
  }

  /**
   * Agregar evento al historial
   * @private
   */
  addToHistory(eventData) {
    this.eventHistory.push(eventData);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Obtener historial de eventos
   * @param {string} event - Filtrar por evento específico (opcional)
   * @returns {Array}
   */
  getHistory(event = null) {
    if (event) {
      return this.eventHistory.filter((e) => e.event === event);
    }
    return [...this.eventHistory];
  }

  /**
   * Limpiar historial
   */
  clearHistory() {
    this.eventHistory = [];
  }

  /**
   * Habilitar/deshabilitar EventBus
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`[EventBus] ${enabled ? "Habilitado" : "Deshabilitado"}`);
  }

  /**
   * Obtener estadísticas del EventBus
   * @returns {object}
   */
  getStats() {
    const stats = {
      totalSubscriptions: 0,
      events: {},
      transports: this.transports.length,
      historySize: this.eventHistory.length,
      enabled: this.enabled,
    };

    this.subscribers.forEach((subscriptions, event) => {
      stats.events[event] = subscriptions.length;
      stats.totalSubscriptions += subscriptions.length;
    });

    return stats;
  }

  /**
   * Limpiar todas las suscripciones
   */
  clear() {
    this.subscribers.clear();
    console.log("[EventBus] Todas las suscripciones limpiadas");
  }

  /**
   * Suscribirse a múltiples eventos
   * @param {Array} events - Array de nombres de eventos
   * @param {Function} callback - Función callback
   * @returns {Array} Array de funciones de desuscripción
   */
  subscribeMany(events, callback) {
    return events.map((event) => this.subscribe(event, callback));
  }

  /**
   * Emitir evento una sola vez (útil para eventos de inicialización)
   * @param {string} event - Nombre del evento
   * @param {object} data - Datos del evento
   */
  emitOnce(event, data = {}) {
    const hasBeenEmitted = this.eventHistory.some((e) => e.event === event);
    if (!hasBeenEmitted) {
      this.emit(event, data);
    }
  }
}

// Crear instancia única (Singleton)
export const eventBus = new EventBus();

// Exportar clase también para casos especiales
export { EventBus };


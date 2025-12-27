/**
 * WebSocketTransport - Transporte para EventBus usando WebSocket
 * 
 * Ejemplo de cómo integrar WebSocket en el futuro.
 * Este archivo muestra la estructura pero no está activo todavía.
 */

import { eventBus } from "./EventBus.js";
import { PIZARRA_EVENTS } from "../constants/events.js";

class WebSocketTransport {
  constructor(url, options = {}) {
    this.url = url;
    this.ws = null;
    this.reconnectInterval = options.reconnectInterval || 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.reconnectAttempts = 0;
    this.enabled = false;
    this.name = "websocket";
    this.eventQueue = []; // Cola de eventos mientras está desconectado
  }

  /**
   * Conectar al servidor WebSocket
   */
  connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("[WebSocketTransport] Conectado al servidor");
        this.reconnectAttempts = 0;
        this.enabled = true;
        
        // Enviar eventos en cola
        this.flushEventQueue();
        
        // Notificar al EventBus
        eventBus.emit("websocket:connected", { timestamp: new Date().toISOString() });
      };

      this.ws.onmessage = (event) => {
        try {
          const eventData = JSON.parse(event.data);
          this.receive(eventData);
        } catch (error) {
          console.error("[WebSocketTransport] Error parseando mensaje:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("[WebSocketTransport] Error:", error);
        eventBus.emit("websocket:error", { error: error.message });
      };

      this.ws.onclose = () => {
        console.log("[WebSocketTransport] Desconectado del servidor");
        this.enabled = false;
        this.attemptReconnect();
      };
    } catch (error) {
      console.error("[WebSocketTransport] Error al conectar:", error);
      this.attemptReconnect();
    }
  }

  /**
   * Intentar reconectar
   */
  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[WebSocketTransport] Máximo de intentos de reconexión alcanzado");
      eventBus.emit("websocket:max_reconnect_attempts", {});
      return;
    }

    this.reconnectAttempts++;
    console.log(`[WebSocketTransport] Intentando reconectar (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval);
  }

  /**
   * Enviar evento al servidor
   */
  send(eventData) {
    if (!this.enabled || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // Agregar a cola si está desconectado
      this.eventQueue.push(eventData);
      return;
    }

    try {
      // Filtrar eventos que no deben enviarse (opcional)
      if (eventData.skipTransports) {
        return;
      }

      // Transformar evento para el servidor
      const serverEvent = {
        type: eventData.event,
        payload: eventData.data,
        timestamp: eventData.timestamp,
        source: eventData.source,
      };

      this.ws.send(JSON.stringify(serverEvent));
    } catch (error) {
      console.error("[WebSocketTransport] Error enviando evento:", error);
      this.eventQueue.push(eventData); // Re-agregar a cola en caso de error
    }
  }

  /**
   * Recibir evento del servidor
   */
  receive(eventData) {
    // El EventBus se encargará de re-emitir el evento localmente
    // Esto se configura en EventBus.addTransport()
  }

  /**
   * Enviar eventos en cola
   */
  flushEventQueue() {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      this.send(event);
    }
  }

  /**
   * Desconectar
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.enabled = false;
    this.reconnectAttempts = 0;
  }
}

// Ejemplo de uso (comentado hasta que se implemente):
/*
// En pizarra.js, después de inicializar:
import { WebSocketTransport } from "./services/WebSocketTransport.js";

// Configurar transporte WebSocket
const wsTransport = new WebSocketTransport("ws://localhost:8080/pizarra", {
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
});

// Agregar al EventBus
eventBus.addTransport(wsTransport);

// Conectar
wsTransport.connect();
*/

export { WebSocketTransport };

